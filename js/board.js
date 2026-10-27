(function (G) {
  const HF = G.HF, T = HF.T, B = HF.B;
  const S3 = Math.sqrt(3);
  // Paleta curada: oliva/musgo, piedra y azul pizarra nórdico.
  const TCOL = ['#5C8247', '#776843', '#646A70', '#35647F', '#1E354B'];
  const TCOL2 = ['#3E5A31', '#51452C', '#40464D', '#254C62', '#142637'];
  const INK = '#F4EFEA', VOID = '#0A0F1D';
  // Vecino axial y arista del hexágono que comparte con él.
  const EDGES = [
    { dq: 1, dr: 0, e: 0 }, { dq: 1, dr: -1, e: 1 }, { dq: 0, dr: -1, e: 2 },
    { dq: -1, dr: 0, e: 3 }, { dq: -1, dr: 1, e: 4 }, { dq: 0, dr: 1, e: 5 }
  ];

  // Tablero hexagonal sobre canvas con zoom, pan y arrastre
  function Board(canvas, h) {
    this.cv = canvas; this.h = h; this.ctx = canvas.getContext('2d');
    this.cam = { x: 0, y: 0, z: 1 }; this.size = 24;
    this.R = 7; this.cells = null; this.fogMap = null; this.over = new Map(); this.sel = -1; this.drag = null;
    this.mode = 'play'; this.viewMode = 'normal';
    this.parts = null; this._raf = 0; this._animLast = 0; this._drawT = 0;
    this.fx = []; this.pulses = []; this._fxRaf = 0; this._shakeUntil = 0; this._shakeAmp = 0; this.hop = null;
    this.ptrs = new Map(); this._bind();
    this._zoomUI();
    this.dpr = Math.min(2, G.devicePixelRatio || 1);
    new ResizeObserver(() => { this.resize(); }).observe(canvas.parentElement);
    this.resize();
  }
  const P = Board.prototype;
  const ZMIN = .12, ZMAX = 3.5;
  // zoom manteniendo fijo el punto de pantalla (sx, sy)
  P.zoomAt = function (nz, sx, sy) {
    nz = Math.max(ZMIN, Math.min(ZMAX, nz));
    const [wx, wy] = this.fromScreen(sx, sy);
    this.cam.z = nz;
    this.cam.x = wx - (sx - this.W / 2) / nz; this.cam.y = wy - (sy - this.H / 2) / nz;
    this.draw();
  };
  P._zoomUI = function () {
    const wrap = this.cv.parentElement, me = this;
    if (!wrap || wrap.querySelector('.zoomctl')) return;
    const d = document.createElement('div'); d.className = 'zoomctl';
    d.innerHTML = '<button data-z="in" aria-label="Acercar">＋</button><button data-z="out" aria-label="Alejar">－</button><button data-z="fit" aria-label="Ver todo">⤢</button>';
    d.addEventListener('pointerdown', e => e.stopPropagation());
    d.querySelectorAll('button').forEach(b => b.onclick = () => {
      const k = b.dataset.z;
      if (k === 'fit') me.fit(); else me.zoomAt(me.cam.z * (k === 'in' ? 1.35 : 1 / 1.35), me.W / 2, me.H / 2);
    });
    wrap.appendChild(d);
  };
  P.resize = function () {
    const p = this.cv.parentElement, w = p.clientWidth, hh = p.clientHeight;
    this.cv.width = w * this.dpr; this.cv.height = hh * this.dpr; this.cv.style.width = w + 'px'; this.cv.style.height = hh + 'px';
    this.W = w; this.H = hh; this.parts = null; this.draw();
  };
  // --- ambiente del tablero (agua, nubes, partículas) ---
  P._initParts = function () {
    const n = Math.max(0, Math.min(40, (HF.CFG.ambience && HF.CFG.ambience.maxParticles) || 25));
    const winter = this.game && HF.season && HF.season(this.game) === 3;
    this._partsWinter = winter;
    const w = Math.max(1, this.W), h = Math.max(1, this.H);
    this.parts = [];
    for (let k = 0; k < n; k++) {
      const bird = !winter && k % 6 === 0;
      this.parts.push({
        x: Math.random() * w, y: Math.random() * h,
        vx: winter ? -6 - Math.random() * 10 : (bird ? 18 + Math.random() * 16 : 3 + Math.random() * 7),
        vy: winter ? 14 + Math.random() * 20 : (bird ? -2 + Math.random() * 4 : -2 + Math.random() * 4),
        s: bird ? 5 : (winter ? 1.4 : 1.1 + Math.random() * 1.4),
        bird
      });
    }
  };
  P._updateParts = function (dt) {
    if (!this.parts) return;
    const w = Math.max(1, this.W), h = Math.max(1, this.H);
    for (const p of this.parts) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < -20) p.x = w + 20; else if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20; else if (p.y > h + 20) p.y = -20;
    }
  };
  P.startAnim = function () {
    if (this._raf || !G.requestAnimationFrame) return;
    if (!this.parts) this._initParts();
    const me = this;
    const tick = t => {
      if (!me._raf) return;
      me._raf = G.requestAnimationFrame(tick);
      if (G.document && G.document.hidden) return;
      const fps = Math.max(6, Math.min(30, (HF.CFG.ambience && HF.CFG.ambience.fps) || 15));
      if (t - me._drawT < 1000 / fps) return;
      const dt = me._animLast ? Math.min(.12, (t - me._animLast) / 1000) : .016;
      me._animLast = t; me._drawT = t;
      const winterNow = me.game && HF.season && HF.season(me.game) === 3;
      if (!me.parts || me._partsWinter !== winterNow) me._initParts();
      me._updateParts(dt);
      me.draw();
    };
    this._raf = G.requestAnimationFrame(tick);
  };
  P.stopAnim = function () {
    if (this._raf && G.cancelAnimationFrame) G.cancelAnimationFrame(this._raf);
    if (this._fxRaf && G.cancelAnimationFrame) G.cancelAnimationFrame(this._fxRaf);
    this._raf = 0; this._fxRaf = 0;
  };
  P.setMap = function (R, cells) { this.R = R; this.cells = cells; this.cam.z = 1; this.parts = null; this.fit(); };
  P.fit = function () {
    const rw = (2 * this.R + 1) * this.size * S3, rh = (2 * this.R + 1) * this.size * 1.5;
    this.cam.z = Math.max(ZMIN, Math.min(2, Math.min(this.W / rw, this.H / rh) * 1.05));
    this.cam.x = 0; this.cam.y = 0; this.draw();
  };
  P.pos = function (c) { return [this.size * S3 * (c.q + c.r / 2), this.size * 1.5 * c.r]; };
  // Altura relativa del diorama. El agua es la base; el llano ya está
  // ligeramente elevado y las colinas/montañas escalonan el relieve.
  P._level = function (c) {
    return c.t === T.MONTANA ? 12 : c.t === T.COLINA ? 6 : (c.t === T.MAR || c.t === T.RIO) ? 0 : 2;
  };
  P._lift = function (c) { return this._level(c); };
  P.toScreen = function (x, y) { return [(x - this.cam.x) * this.cam.z + this.W / 2, (y - this.cam.y) * this.cam.z + this.H / 2]; };
  P.fromScreen = function (sx, sy) { return [(sx - this.W / 2) / this.cam.z + this.cam.x, (sy - this.H / 2) / this.cam.z + this.cam.y]; };
  P.hit = function (sx, sy) {
    const [x, y] = this.fromScreen(sx, sy), s = this.size;
    const qf = (S3 / 3 * x - y / 3) / s, rf = (2 / 3 * y) / s;
    let q = Math.round(qf), r = Math.round(rf), sg = Math.round(-qf - rf);
    const dq = Math.abs(q - qf), dr = Math.abs(r - rf), ds = Math.abs(sg - (-qf - rf));
    if (dq > dr && dq > ds) q = -r - sg; else if (dr > ds) r = -q - sg;
    if (Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) > this.R) return -1;
    return (q + this.R) * (2 * this.R + 1) + (r + this.R);
  };
  P.centerOn = function (i) { const c = this.cells[i]; const [x, y] = this.pos(c); this.cam.x = x; this.cam.y = y; this.draw(); };

  P._bind = function () {
    const cv = this.cv, me = this;
    cv.style.touchAction = 'none';
    cv.addEventListener('pointerdown', e => {
      cv.setPointerCapture(e.pointerId);
      me.ptrs.set(e.pointerId, { x: e.offsetX, y: e.offsetY, sx: e.offsetX, sy: e.offsetY });
      if (me.ptrs.size === 1) {
        const i = me.hit(e.offsetX, e.offsetY);
        me.st = { i, moved: false, mode: null, cx: me.cam.x, cy: me.cam.y };
      } else if (me.ptrs.size === 2) { me.st.mode = 'pinch'; me.drag = null; me.pd = me._pd(); me.pz = me.cam.z; me.pm = me._pm(); me.pc = { x: me.cam.x, y: me.cam.y }; }
    });
    cv.addEventListener('pointermove', e => {
      const p = me.ptrs.get(e.pointerId); if (!p) return;
      p.x = e.offsetX; p.y = e.offsetY;
      const st = me.st; if (!st) return;
      if (me.ptrs.size >= 2) {
        const m = me._pm(), nz = Math.max(ZMIN, Math.min(ZMAX, me.pz * me._pd() / me.pd));
        // el punto bajo el centro del pellizco sigue al dedo (zoom + desplazamiento)
        me.cam.z = me.pz; me.cam.x = me.pc.x; me.cam.y = me.pc.y;
        const [wx, wy] = me.fromScreen(me.pm.x, me.pm.y);
        me.cam.z = nz;
        me.cam.x = wx - (m.x - me.W / 2) / nz; me.cam.y = wy - (m.y - me.H / 2) / nz;
        me.draw(); return;
      }
      const dx = p.x - p.sx, dy = p.y - p.sy;
      if (!st.moved && Math.hypot(dx, dy) > 8) {
        st.moved = true;
        if (st.mode == null) {
          if (me.h.onDragStart && st.i >= 0 && me.h.onDragStart(st.i)) st.mode = 'drag'; else st.mode = me.mode === 'paint' ? 'paint' : 'pan';
        }
      }
      if (st.mode === 'pan') { me.cam.x = st.cx - dx / me.cam.z; me.cam.y = st.cy - dy / me.cam.z; me.draw(); }
      else if (st.mode === 'drag') { me.drag = { from: st.i, x: p.x, y: p.y, to: me.hit(p.x, p.y) }; me.draw(); }
      else if (st.mode === 'paint') { const i = me.hit(p.x, p.y); if (i >= 0 && me.h.onPaint) me.h.onPaint(i); }
    });
    const up = e => {
      const p = me.ptrs.get(e.pointerId); if (!p) return;
      me.ptrs.delete(e.pointerId);
      const st = me.st;
      if (st && me.ptrs.size === 0) {
        if (st.mode === 'drag') { const to = me.hit(p.x, p.y); me.drag = null; me.draw(); if (to >= 0 && to !== st.i && me.h.onDrop) me.h.onDrop(st.i, to); }
        else if (!st.moved && st.mode !== 'pinch' && e.type === 'pointerup') { if (st.i >= 0 && me.h.onTap) me.h.onTap(st.i); }
        me.st = null; me.drag = null; me.draw();
      }
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', e => {
      e.preventDefault();
      me.zoomAt(me.cam.z * (e.deltaY < 0 ? 1.12 : 1 / 1.12), e.offsetX, e.offsetY);
    }, { passive: false });
  };
  P._pm = function () { const a = [...this.ptrs.values()]; return { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 }; };
  P._pd = function () { const a = [...this.ptrs.values()]; return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1; };

  function hexPath(ctx, x, y, s) {
    ctx.beginPath();
    for (let k = 0; k < 6; k++) { const a = Math.PI / 180 * (60 * k - 30); const px = x + s * Math.cos(a), py = y + s * Math.sin(a); k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.closePath();
  }

  P._nbs = function (c) {
    if (!this.game || !c) return [];
    try { return HF.nbs(this.game, c.i) || []; } catch (e) { return []; }
  };
  P._coast = function (c) {
    if (!c || c.t === T.MAR) return false;
    const nbs = this._nbs(c);
    return nbs.length < 6 || nbs.some(j => { const n = this.game.cells[j]; return !n || n.t === T.MAR; });
  };
  P._shore = function (c) {
    if (!c || c.t !== T.MAR) return false;
    return this._nbs(c).some(j => { const n = this.game.cells[j]; return n && n.t !== T.MAR && n.t !== T.RIO; });
  };
  // Vecino exacto al otro lado de uno de los dos lados visibles.
  P._neighbor = function (c, dq, dr) {
    if (!c) return null;
    const cells = (this.game && this.game.cells) || this.cells || [];
    for (const j of this._nbs(c)) {
      const n = cells[j];
      if (n && n.q === c.q + dq && n.r === c.r + dr) return n;
    }
    return null;
  };
  // Vértice k del hexágono (k = 0..5). Se usa para las seis aristas.
  P._vert = function (x, fy, fs, k) {
    const a = Math.PI / 180 * (60 * k - 30);
    return [x + fs * Math.cos(a), fy + fs * Math.sin(a)];
  };
  P._sideWall = function (ctx, x, y0, fs, level, edge, depth, deep, t) {
    if (depth <= 0) return;
    const fy = y0 - level;
    const [x1, y1] = this._vert(x, fy, fs, edge.e);
    const [x2, y2] = this._vert(x, fy, fs, (edge.e + 1) % 6);
    const mx = (x1 + x2) / 2 - x, my = (y1 + y2) / 2 - fy;
    const ml = Math.hypot(mx, my) || 1;
    // Un pequeño bisel hacia fuera permite ver también las aristas que
    // miran al norte; el recorte posterior impide que invadan la cara.
    const bevel = Math.max(4, depth * .55);
    const nx = mx / ml * bevel, ny = my / ml * bevel;
    const bx1 = x1 + nx, by1 = y1 + ny + depth;
    const bx2 = x2 + nx, by2 = y2 + ny + depth;
    ctx.beginPath();
    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(bx2, by2); ctx.lineTo(bx1, by1); ctx.closePath();
    if (deep) {
      const grd = ctx.createLinearGradient(0, Math.min(y1, y2), 0, Math.max(by1, by2));
      grd.addColorStop(0, '#343A46'); grd.addColorStop(.55, '#1D2530'); grd.addColorStop(1, VOID);
      ctx.fillStyle = grd;
    } else {
      ctx.fillStyle = TCOL2[t] || '#3E5A31';
    }
    ctx.fill();
    ctx.fillStyle = nx > 1 ? 'rgba(244,239,234,.065)' : 'rgba(10,15,29,.16)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(244,239,234,.1)'; ctx.lineWidth = Math.max(1, fs * .028);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  };
  P._wallGroup = function (ctx, group) {
    const { x, y0, fs, lift, t, edges } = group;
    if (!edges.length) return;
    const fy = y0 - lift;
    // Se recorta el interior de la cara: los seis prismas quedan fuera y
    // ninguno pinta una banda oscura sobre el propio terreno.
    ctx.save();
    ctx.beginPath();
    ctx.rect(-20, -20, this.W + 40, this.H + 40);
    for (let k = 0; k < 6; k++) {
      const [vx, vy] = this._vert(x, fy, fs, k);
      k ? ctx.lineTo(vx, vy) : ctx.moveTo(vx, vy);
    }
    ctx.closePath(); ctx.clip('evenodd');
    for (const e of edges) this._sideWall(ctx, x, y0, fs, lift, e.edge, e.depth, e.deep, t);
    ctx.restore();
  };
  P._hasFx = function (now) {
    return this.fx.length > 0 || this.pulses.length > 0 || now < this._shakeUntil || !!this.hop;
  };
  P._startFx = function () {
    if (this._fxRaf || !G.requestAnimationFrame) return;
    const me = this;
    const tick = t => {
      if (!me._fxRaf) return;
      me.draw();
      if (me._hasFx(t)) me._fxRaf = G.requestAnimationFrame(tick);
      else me._fxRaf = 0;
    };
    this._fxRaf = G.requestAnimationFrame(tick);
  };
  P.burst = function (kind, i, n) {
    const c = this.cells && this.cells[i]; if (!c) return;
    const [x, y0] = this.toScreen(...this.pos(c));
    const y = y0 - this._lift(c);
    const wood = ['#8B5A2B', '#A97142', '#6B4423'];
    const stone = ['#A7ADB7', '#7D8590', '#5D6570'];
    const ember = ['#F5B942', '#D98432', '#B85C3A'];
    const cols = kind === 'wood' ? wood : kind === 'ember' ? ember : stone;
    const count = n || (kind === 'wood' ? 4 : 7);
    const now = (G.performance && G.performance.now) ? G.performance.now() : Date.now();
    for (let k = 0; k < count; k++) {
      this.fx.push({
        kind, x, y,
        vx: (Math.random() - .5) * 110,
        vy: -35 - Math.random() * 75,
        g: kind === 'ember' ? 80 : 260,
        size: kind === 'wood' ? 2 + Math.random() * 2 : 1.4 + Math.random() * 2.2,
        rot: Math.random() * 6.28, spin: (Math.random() - .5) * 10,
        life: .5 + Math.random() * .35, born: now,
        col: cols[Math.floor(Math.random() * cols.length)]
      });
    }
    this._startFx();
  };
  P.pulseCells = function (ids) {
    if (!ids || !ids.length) return;
    const now = (G.performance && G.performance.now) ? G.performance.now() : Date.now();
    for (const i of ids) this.pulses.push({ i, born: now });
    this._startFx();
  };
  P.shake = function (ms, amp) {
    const now = (G.performance && G.performance.now) ? G.performance.now() : Date.now();
    this._shakeUntil = Math.max(this._shakeUntil, now + (ms || 80));
    this._shakeAmp = amp || 2;
    this._startFx();
  };
  P.hopTo = function (from, to, u) {
    if (!u) return;
    const now = (G.performance && G.performance.now) ? G.performance.now() : Date.now();
    this.hop = { from, to, type: u.type, tier: u.tier, owner: u.owner, t0: now, dur: 340 };
    this._startFx();
  };
  P._roundRect = function (ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };
  P._drawHop = function (ctx, now, fs) {
    const h = this.hop; if (!h) return;
    const t = Math.min(1, (now - h.t0) / h.dur);
    if (t >= 1) { this.hop = null; return; }
    const a = this.cells[h.from], b = this.cells[h.to];
    if (!a || !b) { this.hop = null; return; }
    const [sx, sy0] = this.toScreen(...this.pos(a));
    const [tx, ty0] = this.toScreen(...this.pos(b));
    const sy = sy0 - this._lift(a), ty = ty0 - this._lift(b);
    const e = t * t * (3 - 2 * t);
    const x = sx + (tx - sx) * e;
    const y = sy + (ty - sy) * e - Math.sin(Math.PI * t) * fs * .95;
    const syScale = t < .18 ? 1.1 : t > .82 ? .9 : 1;
    const sxScale = 1 + (1 - syScale) * .65;
    ctx.save();
    ctx.translate(x, y); ctx.scale(sxScale, syScale);
    ctx.globalAlpha = .9;
    ctx.fillStyle = this.colors[h.owner] || '#F5B942';
    ctx.beginPath(); ctx.arc(0, fs * .05, fs * .55, 0, 7); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    if (!HF.art.draw(ctx, 'unit', h.type, 0, 0, fs * 1.25, fs * 1.25)) {
      ctx.fillStyle = INK; ctx.font = fs * .75 + 'px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(HF.UNITS[h.type].icon, 0, fs * .05);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  };
  P._drawFx = function (ctx, now) {
    if (!this.fx.length && !this.pulses.length) return;
    const fs = this.size * this.cam.z;
    for (const p of this.pulses) {
      const age = (now - p.born) / 1000;
      if (age > .8) continue;
      const c = this.cells[p.i]; if (!c) continue;
      const [x, y0] = this.toScreen(...this.pos(c));
      const y = y0 - this._lift(c);
      ctx.globalAlpha = Math.max(0, 1 - age / .8) * .8;
      ctx.strokeStyle = '#E05C5C'; ctx.lineWidth = Math.max(2, fs * .08);
      hexPath(ctx, x, y, fs * (.55 + age * 1.35)); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (const p of this.fx) {
      const age = (now - p.born) / 1000;
      if (age > p.life) continue;
      const x = p.x + p.vx * age, y = p.y + p.vy * age + .5 * p.g * age * age;
      ctx.globalAlpha = Math.max(0, 1 - age / p.life);
      ctx.fillStyle = p.col;
      ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot + p.spin * age);
      if (p.kind === 'wood') ctx.fillRect(-p.size, -p.size * .45, p.size * 2, p.size * .9);
      else { ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    this.fx = this.fx.filter(p => (now - p.born) / 1000 <= p.life);
    this.pulses = this.pulses.filter(p => (now - p.born) / 1000 <= .8);
    ctx.globalAlpha = 1;
  };
  P.draw = function () {
    const ctx = this.ctx; if (!ctx || !this.cells) return;
    const d = this.dpr, z = this.cam.z, s = this.size;
    const now = (G.performance && G.performance.now) ? G.performance.now() : Date.now();
    ctx.setTransform(d, 0, 0, d, 0, 0);
    const bg = ctx.createRadialGradient(this.W * .5, this.H * .42, 20, this.W * .5, this.H * .42, Math.max(this.W, this.H) * .82);
    bg.addColorStop(0, '#111A29'); bg.addColorStop(1, VOID);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, this.W, this.H);
    ctx.save();
    if (now < this._shakeUntil) {
      ctx.translate(Math.sin(now * .11) * this._shakeAmp, Math.cos(now * .13) * this._shakeAmp);
    }
    const g = this.game, fog = this.fogMap, grid = HF.settings().grid;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const fs = s * z;
    if (this.hop && now - this.hop.t0 > this.hop.dur) this.hop = null;
    const season = g && HF.season ? HF.season(g) : 0;
    const winter = season === 3;
    const view = this.viewMode || 'normal';
    const politic = view === 'politic', resource = view === 'resource', combat = view === 'combat';
    const fogPat = fog ? HF.art.fogPattern(ctx, this.cam, this.W, this.H, .6) : null;
    const items = [], walls = [];
    for (const c of this.cells) {
      if (!c) continue;
      const [wx, wy] = this.pos(c), [x, y0] = this.toScreen(wx, wy);
      if (x < -fs * 2 || y0 < -fs * 2 || x > this.W + fs * 2 || y0 > this.H + fs * 2) continue;
      const f = fog ? fog[c.i] : 2;
      // Relieve relativo: la cara solo se eleva respecto a lo que tiene al lado.
      const lift = f === 0 ? 0 : this._level(c);
      const y = y0 - lift;
      // El agua es la base del diorama: no proyecta faldón contra sí misma
      // ni contra el borde del mapa. Solo la tierra muestra el prisma.
      if (f > 0 && c.t !== T.MAR && c.t !== T.RIO) {
        const egs = [];
        for (const e of EDGES) {
          const n = this._neighbor(c, e.dq, e.dr);
          const depth = n ? lift - this._level(n) : lift + 20;
          if (depth > 0) egs.push({ edge: e, depth, deep: !n });
        }
        if (egs.length) walls.push({ x, y0, fs, lift, t: c.t, edges: egs });
      }
      hexPath(ctx, x, y, fs * 1.0);
      if (f === 0) {
        ctx.fillStyle = '#0D1624'; ctx.fill();
        if (fogPat) { ctx.globalAlpha = .55; ctx.fillStyle = fogPat; ctx.fill(); ctx.globalAlpha = 1; }
        continue;
      }
      ctx.globalAlpha = politic ? .2 : combat ? .4 : 1;
      const top = this._shore(c) ? '#35647F' : TCOL[c.t];
      ctx.fillStyle = top; ctx.fill();
      // brillo de agua procedural (se omite en las vistas analíticas)
      if (!politic && !combat && (c.t === T.MAR || c.t === T.RIO)) {
        const wave = (Math.sin(now * .002 + c.q * .9 + c.r * .5) + 1) * .5;
        ctx.globalAlpha = (winter ? .08 : .03) + wave * (winter ? .12 : .09);
        ctx.fillStyle = winter ? '#D8E4E8' : '#B9D2DD';
        hexPath(ctx, x, y, fs); ctx.fill(); ctx.globalAlpha = 1;
      }
      if (winter && !politic && !combat) {
        ctx.globalAlpha = .12; ctx.fillStyle = '#A9C6D3'; hexPath(ctx, x, y, fs); ctx.fill(); ctx.globalAlpha = 1;
        if (c.t === T.RIO) {
          ctx.globalAlpha = .34; ctx.fillStyle = '#E8F1F2'; hexPath(ctx, x, y, fs); ctx.fill(); ctx.globalAlpha = 1;
          ctx.strokeStyle = 'rgba(244,239,234,.72)'; ctx.lineWidth = Math.max(1, fs * .05);
          ctx.beginPath(); ctx.moveTo(x - fs * .42, y + fs * .08); ctx.lineTo(x - fs * .1, y - fs * .06); ctx.lineTo(x + fs * .18, y + fs * .1); ctx.stroke();
        }
      }
      if (c.t === T.COLINA || c.t === T.MONTANA) {
        ctx.fillStyle = TCOL2[c.t]; ctx.beginPath(); ctx.moveTo(x - fs * .5, y + fs * .35); ctx.lineTo(x, y - fs * (c.t === T.MONTANA ? .6 : .35)); ctx.lineTo(x + fs * .5, y + fs * .35); ctx.closePath(); ctx.fill();
        if (c.t === T.MONTANA && winter && !politic && !combat) {
          ctx.fillStyle = 'rgba(244,239,234,.52)';
          ctx.beginPath(); ctx.moveTo(x - fs * .18, y - fs * .2); ctx.lineTo(x, y - fs * .6); ctx.lineTo(x + fs * .18, y - fs * .2); ctx.closePath(); ctx.fill();
        }
      }
      if (c.t === T.RIO) { ctx.strokeStyle = winter ? '#E8F1F2' : '#A8CCD9'; ctx.lineWidth = fs * .25; ctx.beginPath(); ctx.moveTo(x - fs * .6, y - fs * .2); ctx.quadraticCurveTo(x, y + fs * .5, x + fs * .6, y - fs * .1); ctx.stroke(); }
      ctx.globalAlpha = 1;
      if (c.o >= 0) {
        const col = this.colors[c.o];
        // político: soberanía a máxima saturación; recursos: facción atenuada
        ctx.globalAlpha = resource ? .15 : politic ? .8 : combat ? .3 : (c.sup ? .38 : .2);
        ctx.fillStyle = col; hexPath(ctx, x, y, fs); ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.5, fs * (politic ? .2 : combat ? .14 : .12)); hexPath(ctx, x, y, fs * .92); ctx.stroke();
        if (!c.sup) { ctx.strokeStyle = 'rgba(10,15,29,.55)'; ctx.lineWidth = 1; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(x - fs * .5 + k * fs * .3, y - fs * .6); ctx.lineTo(x - fs * .9 + k * fs * .3, y + fs * .5); ctx.stroke(); } }
      }
      // AISLADO: pulso rojo para que el corte de suministro sea inequívoco.
      // También se marca el turno en que un campamento automático aún no ha
      // resuelto su colapso de recursos.
      if (g && c.o >= 0 && (!c.sup || c.iso === g.turn)) {
        const pulse = (Math.sin(now * .006) + 1) * .5;
        ctx.globalAlpha = .08 + pulse * .16; ctx.fillStyle = '#ef4444';
        hexPath(ctx, x, y, fs); ctx.fill();
        ctx.globalAlpha = .35 + pulse * .55; ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = Math.max(2, fs * .09); hexPath(ctx, x, y, fs * .9); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (politic && c.b >= B.CAMPAMENTO) {
        ctx.globalAlpha = .12; ctx.fillStyle = INK; hexPath(ctx, x, y, fs * .9); ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(244,239,234,.92)'; ctx.lineWidth = Math.max(2, fs * .1);
        hexPath(ctx, x, y, fs * .84); ctx.stroke();
      }
      if (resource && c.res) {
        const rc = ['', 'rgba(245,185,66,', 'rgba(74,222,128,', 'rgba(181,122,74,'][c.res] || 'rgba(245,185,66,';
        const grd = ctx.createRadialGradient(x, y, fs * .1, x, y, fs * .95);
        grd.addColorStop(0, rc + '.42)'); grd.addColorStop(1, rc + '0)');
        ctx.fillStyle = grd; hexPath(ctx, x, y, fs); ctx.fill();
        ctx.strokeStyle = rc + '.9)'; ctx.lineWidth = Math.max(1.5, fs * .08);
        hexPath(ctx, x, y, fs * .9); ctx.stroke();
      }
      // borde superior iluminado: grosor de ficha física
      ctx.strokeStyle = 'rgba(244,239,234,.12)'; ctx.lineWidth = 1;
      hexPath(ctx, x, y, fs * .97); ctx.stroke();
      if (c.fire > 0) { ctx.fillStyle = 'rgba(239,68,68,.32)'; hexPath(ctx, x, y, fs); ctx.fill(); }
      else if (c.burn > 0) { ctx.fillStyle = 'rgba(30,25,20,.42)'; hexPath(ctx, x, y, fs); ctx.fill(); }
      if (grid) { ctx.strokeStyle = 'rgba(244,239,234,.055)'; ctx.lineWidth = 1; hexPath(ctx, x, y, fs); ctx.stroke(); }
      items.push([c, x, y, f]);
    }
    // Los faldones se dibujan después de todas las caras. Antes, la cara
    // superior de un vecino posterior podía tapar el prisma del terreno alto.
    walls.sort((a, b) => a.y0 - b.y0);
    for (const w of walls) this._wallGroup(ctx, w);
    for (const [c, x, y, f] of items) {
      const em = Math.max(8, fs * .85);
      ctx.font = em + 'px sans-serif';
      if (c.res && !politic && !combat) {
        ctx.globalAlpha = resource ? 1 : .9;
        ctx.font = fs * (resource ? .7 : .5) + 'px sans-serif';
        ctx.fillText(['', '💰', '🌾', '🧱'][c.res], x - fs * .5, y + fs * .55);
        ctx.globalAlpha = 1; ctx.font = em + 'px sans-serif';
      }
      if (c.b) {
        const treeDim = (politic || combat) && c.b === B.ARBOL;
        if (treeDim) ctx.globalAlpha = politic ? .2 : .4;
        const bw = c.b === B.CAMINO ? fs * 1.5 : fs * 1.7;
        if (!HF.art.draw(ctx, 'build', c.b, x, y - (c.b === B.CAMINO ? 0 : fs * .08), bw, bw)) {
          if (c.b === B.CAMINO) { ctx.font = fs * .6 + 'px sans-serif'; ctx.globalAlpha = treeDim ? .4 : .8; }
          ctx.fillText(HF.BICON[c.b], x, y + (c.b === B.CAMINO ? fs * .35 : 0)); ctx.globalAlpha = 1; ctx.font = em + 'px sans-serif';
        }
        if (treeDim) ctx.globalAlpha = 1;
        if (c.cap) { ctx.font = fs * .5 + 'px sans-serif'; ctx.fillText('⭐', x + fs * .55, y - fs * .55); ctx.font = em + 'px sans-serif'; }
      }
      if (c.tomb) { ctx.globalAlpha = .6 + .1 * c.tomb; ctx.fillText('⚰️', x, y); ctx.globalAlpha = 1; }
      if (c.u && (f === 2 || c.u.owner === 0)) {
        const u = c.u, hide = this.drag && this.drag.from === c.i;
        const hopping = this.hop && this.hop.to === c.i;
        if (!hide && !hopping) {
          if (resource) ctx.globalAlpha = .15;
          ctx.fillStyle = this.colors[u.owner]; ctx.beginPath(); ctx.arc(x, y + fs * .05, fs * .55, 0, 7); ctx.fill();
          ctx.strokeStyle = HF.ready(u) && u.owner === 0 ? INK : 'rgba(10,15,29,.55)'; ctx.lineWidth = 2; ctx.stroke();
          if (!HF.art.draw(ctx, 'unit', u.type, x, y, fs * 1.25, fs * 1.25)) { ctx.fillStyle = INK; ctx.font = fs * .75 + 'px sans-serif'; ctx.fillText(HF.UNITS[u.type].icon, x, y + fs * .05); }
          if (combat) {
            // anillo de combate + nivel + defensa efectiva (incluye terreno, edificios, auras y deg.)
            ctx.strokeStyle = 'rgba(244,239,234,.65)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(x, y + fs * .05, fs * .63, 0, 7); ctx.stroke();
            const def = g ? HF.defenseAt(g, c.i) : 0;
            ctx.font = '700 ' + Math.max(8, fs * .4) + 'px "Plus Jakarta Sans", sans-serif';
            const tl = 'N' + u.tier, tw = ctx.measureText(tl).width;
            ctx.fillStyle = 'rgba(8,14,28,.86)';
            ctx.fillRect(x - fs * .95, y + fs * .58, tw + 5, fs * .44);
            ctx.fillStyle = '#ffd34d'; ctx.fillText(tl, x - fs * .95 + (tw + 5) / 2, y + fs * .8);
            const dl = '🛡' + def, dw = ctx.measureText(dl).width;
            ctx.fillStyle = 'rgba(8,14,28,.86)';
            ctx.fillRect(x + fs * .3, y + fs * .58, dw + 5, fs * .44);
            ctx.fillStyle = '#bae6fd'; ctx.fillText(dl, x + fs * .3 + (dw + 5) / 2, y + fs * .8);
            ctx.font = em + 'px sans-serif';
          } else if (this.mode === 'paint') {
            const tl = 'N' + u.tier;
            ctx.font = '700 ' + Math.max(8, fs * .42) + 'px "Plus Jakarta Sans", sans-serif';
            const tw2 = ctx.measureText(tl).width;
            ctx.fillStyle = 'rgba(8,14,28,.85)';
            ctx.fillRect(x - fs * .95, y + fs * .56, tw2 + 5, fs * .44);
            ctx.fillStyle = '#ffd34d'; ctx.fillText(tl, x - fs * .95 + (tw2 + 5) / 2, y + fs * .78);
            ctx.font = em + 'px sans-serif';
          } else if (u.tier > 1) {
            ctx.font = '700 ' + fs * .5 + 'px "Plus Jakarta Sans", sans-serif'; ctx.fillStyle = VOID; ctx.fillText(u.tier, x + fs * .55, y + fs * .55); ctx.fillStyle = '#ffd34d'; ctx.fillText(u.tier, x + fs * .53, y + fs * .53);
            ctx.font = em + 'px sans-serif';
          }
          if (u.cargo) {
            const kx = x + fs * .5, ky = y - fs * .5;
            ctx.fillStyle = this.colors[u.cargo.owner]; ctx.beginPath(); ctx.arc(kx, ky, fs * .3, 0, 7); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke();
            if (!HF.art.draw(ctx, 'unit', u.cargo.type, kx, ky, fs * .6, fs * .6)) { ctx.fillStyle = INK; ctx.font = fs * .4 + 'px sans-serif'; ctx.fillText(HF.UNITS[u.cargo.type].icon, kx, ky); }
          }
          if (u.owner === 0) {
            if (u.mv > 0 || (u.cargo && u.cargo.mv > 0)) { ctx.fillStyle = '#4ade80'; ctx.beginPath(); ctx.arc(x - fs * .6, y - fs * .5, fs * .13, 0, 7); ctx.fill(); }
            if (u.at > 0) { ctx.fillStyle = '#f87171'; ctx.beginPath(); ctx.arc(x - fs * .35, y - fs * .62, fs * .13, 0, 7); ctx.fill(); }
          }
          if (resource) ctx.globalAlpha = 1;
        }
      }
      if (c.deg) { ctx.font = fs * .5 + 'px sans-serif'; ctx.fillText('💔', x - fs * .5, y - fs * .5); }
      // estados de doctrina visibles en el tablero
      ctx.fillStyle = INK; ctx.font = fs * .45 + 'px sans-serif';
      if (c.wonder) { ctx.globalAlpha = .95; ctx.fillText('🏛', x, y - fs * .55); ctx.globalAlpha = 1; }
      if (c.fire > 0) ctx.fillText('🔥', x + fs * .55, y - fs * .5);
      else if (c.burn > 0) { ctx.globalAlpha = .8; ctx.fillText('🕳', x + fs * .55, y + fs * .5); ctx.globalAlpha = 1; }
      if (c.trap === 0 && f === 2) { ctx.globalAlpha = .8; ctx.fillText('🪤', x - fs * .55, y + fs * .5); ctx.globalAlpha = 1; }
      ctx.font = em + 'px sans-serif';
      if (f === 1) {
        hexPath(ctx, x, y, fs); ctx.fillStyle = 'rgba(8,14,28,.35)'; ctx.fill();
        if (fogPat) { ctx.globalAlpha = .5; ctx.fillStyle = fogPat; ctx.fill(); ctx.globalAlpha = 1; }
      }
    }
    if (this.hop) this._drawHop(ctx, now, fs);
    if (view === 'normal') {
    this._drawClouds(ctx, now);
    if (this.mode === 'play' && this.parts) this._drawParts(ctx, winter);
    if (this.mode === 'play' && this.game && this.game.f && this.game.f[0] && HF.tradeRoutes) {
      const routes = HF.tradeRoutes(this.game, this.game.f[0]);
      if (routes.length) {
        ctx.save(); ctx.strokeStyle = 'rgba(245,185,66,.38)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
        for (const r of routes) {
          const a = this.cells[r.a], b = this.cells[r.b];
          if (!a || !b) continue;
          const [ax, ay0] = this.toScreen(...this.pos(a)), [bx, by0] = this.toScreen(...this.pos(b));
          const ay = ay0 - this._lift(a, fs), by = by0 - this._lift(b, fs);
          ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 - fs * .8, bx, by); ctx.stroke();
        }
        ctx.setLineDash([]); ctx.restore();
      }
    }
    }
    // Niebla del vacío en los bordes: la isla no termina en un marco cuadrado.
    const vg = ctx.createRadialGradient(this.W * .5, this.H * .48, Math.min(this.W, this.H) * .28, this.W * .5, this.H * .48, Math.max(this.W, this.H) * .78);
    vg.addColorStop(0, 'rgba(10,15,29,0)'); vg.addColorStop(.7, 'rgba(10,15,29,.18)'); vg.addColorStop(1, 'rgba(10,15,29,.68)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, this.W, this.H);
    for (const [i, o] of this.over) {
      const c = this.cells[i]; if (!c) continue;
      const [x, y0] = this.toScreen(...this.pos(c));
      const y = y0 - this._lift(c, fs);
      hexPath(ctx, x, y, fs * .96); ctx.fillStyle = o.fill; ctx.fill();
      ctx.strokeStyle = o.stroke || o.fill; ctx.lineWidth = 2; ctx.stroke();
      if (o.label) { ctx.fillStyle = INK; ctx.font = '700 ' + Math.max(9, fs * .45) + 'px "Plus Jakarta Sans", sans-serif'; ctx.fillText(o.label, x, y - fs * .62); }
    }
    if (this.sel >= 0) {
      const c = this.cells[this.sel]; const [x, y0] = this.toScreen(...this.pos(c));
      const y = y0 - this._lift(c, fs);
      ctx.strokeStyle = INK; ctx.lineWidth = 3; hexPath(ctx, x, y, fs); ctx.stroke();
    }
    if (this.drag) {
      const u = this.cells[this.drag.from].u;
      if (u) { ctx.globalAlpha = .85; ctx.fillStyle = this.colors[u.owner]; ctx.beginPath(); ctx.arc(this.drag.x, this.drag.y - 20, fs * .6, 0, 7); ctx.fill(); if (!HF.art.draw(ctx, 'unit', u.type, this.drag.x, this.drag.y - 20, fs * 1.3, fs * 1.3)) { ctx.font = fs * .8 + 'px sans-serif'; ctx.fillStyle = INK; ctx.fillText(HF.UNITS[u.type].icon, this.drag.x, this.drag.y - 20); } ctx.globalAlpha = 1; }
    }
    if (this.bubbles) for (const b of this.bubbles) {
      const c = this.cells[b.i]; if (!c) continue;
      const [x, y0] = this.toScreen(...this.pos(c));
      const y = y0 - this._lift(c) - fs * 1.25;
      const born = b.born || (now - 80);
      const age = Math.max(0, (now - born) / 1000);
      const popT = Math.min(1, age / .22);
      const pop = popT < 1 ? 1 + 2.70158 * Math.pow(popT - 1, 3) + 1.70158 * Math.pow(popT - 1, 2) : 1;
      ctx.font = '700 12px "Plus Jakarta Sans", sans-serif';
      const w = ctx.measureText(b.txt).width + 16, h = 24;
      const fill = b.kind === 'bad' ? 'rgba(94,36,42,.94)' : b.kind === 'good' ? 'rgba(31,75,56,.94)' : 'rgba(22,34,54,.94)';
      ctx.save();
      ctx.globalAlpha = Math.min(1, Math.max(0, b.life / .45));
      ctx.translate(x, y); ctx.scale(pop, pop);
      ctx.shadowColor = 'rgba(10,15,29,.45)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
      this._roundRect(ctx, -w / 2, -h, w, h, 9); ctx.fillStyle = fill; ctx.fill();
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(244,239,234,.18)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.lineTo(0, 8); ctx.closePath();
      ctx.fillStyle = fill; ctx.fill();
      ctx.fillStyle = INK; ctx.fillText(b.txt, 0, -h / 2 + 1);
      ctx.restore();
    }
    this._drawFx(ctx, now);
    ctx.restore();
  };
  P._drawClouds = function (ctx, now) {
    const n = Math.max(0, Math.min(4, (HF.CFG.ambience && HF.CFG.ambience.clouds) || 3));
    if (!n) return;
    const seed = (this.game && this.game.seed) || 1;
    const cw = Math.max(160, this.W * .32), ch = cw * .28, span = this.W + cw * 2;
    ctx.save();
    for (let k = 0; k < n; k++) {
      const x = ((now * .006 * (1 + k * .25) + (seed % 997) * .7 + k * this.W * .36) % span) - cw;
      const y = this.H * (.2 + .27 * k) + Math.sin(now * .00025 + k * 1.7) * 18;
      const grd = ctx.createRadialGradient(x, y, 4, x, y, cw * .62);
      grd.addColorStop(0, 'rgba(10,15,29,.09)'); grd.addColorStop(1, 'rgba(10,15,29,0)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.ellipse(x, y, cw * .65, ch, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  };
  P._drawParts = function (ctx, winter) {
    if (!this.parts || !this.parts.length) return;
    ctx.save();
    for (const p of this.parts) {
      if (p.bird) {
        ctx.strokeStyle = 'rgba(240,245,255,.38)'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(p.x - 4, p.y); ctx.lineTo(p.x, p.y - 3); ctx.lineTo(p.x + 4, p.y); ctx.stroke();
      } else if (winter) {
        ctx.fillStyle = 'rgba(244,239,234,.58)'; ctx.fillRect(p.x, p.y, p.s, p.s);
      } else {
        ctx.fillStyle = 'rgba(245,220,140,.45)';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  };
  P.colors = HF.COLORS;
  HF.Board = Board;
  HF.art.onLoad(() => { const c = HF.cur && HF.cur(); if (c && c.board && c.board.W) { try { c.board.draw(); } catch (e) { } } });
  HF.art.preload();
})(window);
