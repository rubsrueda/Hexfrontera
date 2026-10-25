(function (G) {
  const HF = G.HF, T = HF.T, B = HF.B;
  const S3 = Math.sqrt(3);
  const TCOL = ['#7bbf5a', '#b59a52', '#7d7d86', '#5aa7d6', '#2c5f9e'];
  const TCOL2 = ['#5e9a43', '#907a3d', '#5b5b63', '#3f86b8', '#1f4676'];

  // Tablero hexagonal sobre canvas con zoom, pan y arrastre
  function Board(canvas, h) {
    this.cv = canvas; this.h = h; this.ctx = canvas.getContext('2d');
    this.cam = { x: 0, y: 0, z: 1 }; this.size = 24;
    this.R = 7; this.cells = null; this.fogMap = null; this.over = new Map(); this.sel = -1; this.drag = null;
    this.mode = 'play';
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
    this.W = w; this.H = hh; this.draw();
  };
  P.setMap = function (R, cells) { this.R = R; this.cells = cells; this.cam.z = 1; this.fit(); };
  P.fit = function () {
    const rw = (2 * this.R + 1) * this.size * S3, rh = (2 * this.R + 1) * this.size * 1.5;
    this.cam.z = Math.max(ZMIN, Math.min(2, Math.min(this.W / rw, this.H / rh) * 1.05));
    this.cam.x = 0; this.cam.y = 0; this.draw();
  };
  P.pos = function (c) { return [this.size * S3 * (c.q + c.r / 2), this.size * 1.5 * c.r]; };
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

  P.draw = function () {
    const ctx = this.ctx; if (!ctx || !this.cells) return;
    const d = this.dpr, z = this.cam.z, s = this.size;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.fillStyle = '#0b1424'; ctx.fillRect(0, 0, this.W, this.H);
    const g = this.game, fog = this.fogMap, grid = HF.settings().grid;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const fs = s * z;
    const fogPat = fog ? HF.art.fogPattern(ctx, this.cam, this.W, this.H, .6) : null;
    const items = [];
    for (const c of this.cells) {
      if (!c) continue;
      const [wx, wy] = this.pos(c), [x, y] = this.toScreen(wx, wy);
      if (x < -fs * 2 || y < -fs * 2 || x > this.W + fs * 2 || y > this.H + fs * 2) continue;
      const f = fog ? fog[c.i] : 2;
      hexPath(ctx, x, y, fs * 1.0);
      if (f === 0) {
        ctx.fillStyle = '#101a2c'; ctx.fill();
        if (fogPat) { ctx.globalAlpha = .55; ctx.fillStyle = fogPat; ctx.fill(); ctx.globalAlpha = 1; }
        continue;
      }
      ctx.fillStyle = TCOL[c.t]; ctx.fill();
      if (c.t === T.COLINA || c.t === T.MONTANA) {
        ctx.fillStyle = TCOL2[c.t]; ctx.beginPath(); ctx.moveTo(x - fs * .5, y + fs * .35); ctx.lineTo(x, y - fs * (c.t === T.MONTANA ? .6 : .35)); ctx.lineTo(x + fs * .5, y + fs * .35); ctx.closePath(); ctx.fill();
      }
      if (c.t === T.RIO) { ctx.strokeStyle = '#a5d8f5'; ctx.lineWidth = fs * .25; ctx.beginPath(); ctx.moveTo(x - fs * .6, y - fs * .2); ctx.quadraticCurveTo(x, y + fs * .5, x + fs * .6, y - fs * .1); ctx.stroke(); }
      if (c.o >= 0) {
        const col = this.colors[c.o];
        ctx.globalAlpha = c.sup ? .38 : .2; ctx.fillStyle = col; hexPath(ctx, x, y, fs); ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.5, fs * .12); hexPath(ctx, x, y, fs * .92); ctx.stroke();
        if (!c.sup) { ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(x - fs * .5 + k * fs * .3, y - fs * .6); ctx.lineTo(x - fs * .9 + k * fs * .3, y + fs * .5); ctx.stroke(); } }
      }
      if (grid) { ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = 1; hexPath(ctx, x, y, fs); ctx.stroke(); }
      items.push([c, x, y, f]);
    }
    for (const [c, x, y, f] of items) {
      const em = Math.max(8, fs * .85);
      ctx.font = em + 'px sans-serif';
      if (c.res) { ctx.globalAlpha = .9; ctx.font = fs * .5 + 'px sans-serif'; ctx.fillText(['', '💰', '🌾', '🧱'][c.res], x - fs * .5, y + fs * .55); ctx.globalAlpha = 1; ctx.font = em + 'px sans-serif'; }
      if (c.b) {
        const bw = c.b === B.CAMINO ? fs * 1.5 : fs * 1.7;
        if (!HF.art.draw(ctx, 'build', c.b, x, y - (c.b === B.CAMINO ? 0 : fs * .08), bw, bw)) {
          if (c.b === B.CAMINO) { ctx.font = fs * .6 + 'px sans-serif'; ctx.globalAlpha = .8; }
          ctx.fillText(HF.BICON[c.b], x, y + (c.b === B.CAMINO ? fs * .35 : 0)); ctx.globalAlpha = 1; ctx.font = em + 'px sans-serif';
        }
        if (c.cap) { ctx.font = fs * .5 + 'px sans-serif'; ctx.fillText('⭐', x + fs * .55, y - fs * .55); ctx.font = em + 'px sans-serif'; }
      }
      if (c.tomb) { ctx.globalAlpha = .6 + .1 * c.tomb; ctx.fillText('⚰️', x, y); ctx.globalAlpha = 1; }
      if (c.u && (f === 2 || c.u.owner === 0)) {
        const u = c.u, hide = this.drag && this.drag.from === c.i;
        if (!hide) {
          ctx.fillStyle = this.colors[u.owner]; ctx.beginPath(); ctx.arc(x, y + fs * .05, fs * .55, 0, 7); ctx.fill();
          ctx.strokeStyle = HF.ready(u) && u.owner === 0 ? '#fff' : '#0008'; ctx.lineWidth = 2; ctx.stroke();
          if (!HF.art.draw(ctx, 'unit', u.type, x, y, fs * 1.25, fs * 1.25)) { ctx.fillStyle = '#fff'; ctx.font = fs * .75 + 'px sans-serif'; ctx.fillText(HF.UNITS[u.type].icon, x, y + fs * .05); }
          if (u.tier > 1) { ctx.font = 'bold ' + fs * .5 + 'px monospace'; ctx.fillStyle = '#000'; ctx.fillText(u.tier, x + fs * .55, y + fs * .55); ctx.fillStyle = '#ffd34d'; ctx.fillText(u.tier, x + fs * .53, y + fs * .53); }
          if (u.cargo) {
            const kx = x + fs * .5, ky = y - fs * .5;
            ctx.fillStyle = this.colors[u.cargo.owner]; ctx.beginPath(); ctx.arc(kx, ky, fs * .3, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
            if (!HF.art.draw(ctx, 'unit', u.cargo.type, kx, ky, fs * .6, fs * .6)) { ctx.fillStyle = '#fff'; ctx.font = fs * .4 + 'px sans-serif'; ctx.fillText(HF.UNITS[u.cargo.type].icon, kx, ky); }
          }
          if (u.owner === 0) {
            if (u.mv > 0 || (u.cargo && u.cargo.mv > 0)) { ctx.fillStyle = '#4ade80'; ctx.beginPath(); ctx.arc(x - fs * .6, y - fs * .5, fs * .13, 0, 7); ctx.fill(); }
            if (u.at > 0) { ctx.fillStyle = '#f87171'; ctx.beginPath(); ctx.arc(x - fs * .35, y - fs * .62, fs * .13, 0, 7); ctx.fill(); }
          }
        }
      }
      if (c.deg) { ctx.font = fs * .5 + 'px sans-serif'; ctx.fillText('💔', x - fs * .5, y - fs * .5); }
      if (f === 1) {
        hexPath(ctx, x, y, fs); ctx.fillStyle = 'rgba(8,14,28,.35)'; ctx.fill();
        if (fogPat) { ctx.globalAlpha = .5; ctx.fillStyle = fogPat; ctx.fill(); ctx.globalAlpha = 1; }
      }
    }
    for (const [i, o] of this.over) {
      const c = this.cells[i]; if (!c) continue;
      const [x, y] = this.toScreen(...this.pos(c));
      hexPath(ctx, x, y, fs * .96); ctx.fillStyle = o.fill; ctx.fill();
      ctx.strokeStyle = o.stroke || o.fill; ctx.lineWidth = 2; ctx.stroke();
      if (o.label) { ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.max(9, fs * .45) + 'px monospace'; ctx.fillText(o.label, x, y - fs * .62); }
    }
    if (this.sel >= 0) { const c = this.cells[this.sel]; const [x, y] = this.toScreen(...this.pos(c)); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; hexPath(ctx, x, y, fs); ctx.stroke(); }
    if (this.drag) {
      const u = this.cells[this.drag.from].u;
      if (u) { ctx.globalAlpha = .85; ctx.fillStyle = this.colors[u.owner]; ctx.beginPath(); ctx.arc(this.drag.x, this.drag.y - 20, fs * .6, 0, 7); ctx.fill(); if (!HF.art.draw(ctx, 'unit', u.type, this.drag.x, this.drag.y - 20, fs * 1.3, fs * 1.3)) { ctx.font = fs * .8 + 'px sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(HF.UNITS[u.type].icon, this.drag.x, this.drag.y - 20); } ctx.globalAlpha = 1; }
    }
    if (this.bubbles) for (const b of this.bubbles) {
      const [x, y] = this.toScreen(...this.pos(this.cells[b.i]));
      ctx.globalAlpha = Math.min(1, b.life); ctx.font = 'bold 12px monospace';
      const w = ctx.measureText(b.txt).width + 12;
      ctx.fillStyle = b.kind === 'bad' ? '#7f1d1d' : b.kind === 'good' ? '#14532d' : '#1e293b';
      ctx.fillRect(x - w / 2, y - fs * 1.8, w, 20); ctx.fillStyle = '#fff'; ctx.fillText(b.txt, x, y - fs * 1.8 + 10); ctx.globalAlpha = 1;
    }
  };
  P.colors = HF.COLORS;
  HF.Board = Board;
  HF.art.onLoad(() => { const c = HF.cur && HF.cur(); if (c && c.board && c.board.W) { try { c.board.draw(); } catch (e) { } } });
  HF.art.preload();
})(window);
