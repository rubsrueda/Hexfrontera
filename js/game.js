(function (G) {
  const HF = G.HF, B = HF.B;
  let cur = null;

  const goalText = g => {
    const gl = g.goal || {};
    return { conquer: 'Conquista: elimina todas las ciudades rivales', survive: `Sobrevive hasta el turno ${gl.n}`, gold: `Reúne ${gl.n} de oro`, territory: `Controla ${gl.n} casillas`, city: `Ten ${gl.n} ciudades`, maxTurns: `Gana antes del turno ${gl.n}` }[gl.type] || 'Conquista';
  };

  HF.startGame = function (g) {
    HF.closeModal();
    if (HF.onLeave) { HF.onLeave(); HF.onLeave = null; }
    HF.lastGame = { mode: g.mode, meta: g.meta };
    const el = HF.$('#app');
    el.innerHTML = `<div class="screen game">
      <div class="hud-top"><button id="menu">☰</button><span id="turn"></span><div class="res" id="res"></div><button id="board">📊</button></div>
      <div class="boardwrap"><canvas id="cv"></canvas><div class="info" id="info"></div></div>
      <div class="drawer hidden" id="drawer"></div>
      <div class="hud-bot">
        <button id="bBuild">🏗<small>Construir</small></button><button id="bRec">💂<small>Reclutar</small></button>
        <button id="bUndo">↩<small>Deshacer</small></button><button id="bEnd" class="pri">⏭<small>Fin turno</small></button>
      </div></div>`;
    const q = s => el.querySelector(s);
    const st = { sel: -1, opts: new Map(), pending: null, drawer: null, busy: false, focus: -1, evPtr: g.events.length, bubbles: [] };
    cur = { g, st };
    const board = new HF.Board(q('#cv'), {});
    board.colors = g.f.map(f => f.color);
    board.bubbles = st.bubbles;
    board.game = g;
    board.mode = 'play';
    cur.board = board; HF.cur = () => cur;

    const sync = () => { board.cells = g.cells; board.R = g.R; board.fogMap = g.fog === 'NONE' ? null : g.fogMap; };
    const info = t => { q('#info').innerHTML = t; };
    const fmt = n => (n >= 0 ? '+' : '') + n;

    function hud() {
      const f = g.f[0], fc = st.focus >= 0 ? g.cells[st.focus] : null;
      const provs = HF.provinces(g, f);
      let prov = fc && (fc.o === 0 || (fc.u && fc.u.owner === 0)) && provs.length > 1 ? HF.provOf(g, f, fc) : null;
      if (prov != null && prov < 0) prov = null;
      const pv = HF.preview(g, f, prov), sk = HF.stockFor(g, f, prov);
      q('#turn').textContent = f.crest + ' T' + g.turn;
      q('#res').title = prov != null ? 'Provincia seleccionada' : '';
      q('#res').innerHTML = (prov != null ? '<span>📍</span>' : '') + `<span>💰${sk.gold}<i class="${pv.netGold >= 0 ? 'pos' : 'neg'}">${fmt(pv.netGold)}</i></span><span>🌾${sk.food}<i class="${pv.netFood >= 0 ? 'pos' : 'neg'}">${fmt(pv.netFood)}</i></span><span>🧱${sk.wood}${pv.inc.wood ? `<i class="pos">${fmt(pv.inc.wood)}</i>` : ''}</span>`;
      q('#bUndo').disabled = !HF.canUndo(g);
      q('#bEnd').disabled = st.busy || !!g.over;
    }
    function overlay() {
      board.over = new Map(); board.sel = st.sel;
      if (st.pending) for (const i of st.pending.cells) board.over.set(i, { fill: 'rgba(74,222,128,.35)', stroke: '#4ade80' });
      else if (st.sel >= 0) {
        for (const [i, o] of st.opts) {
          if (!HF.visible(g, i) && o.k !== 'move' && o.k !== 'chop' && o.k !== 'fuse') { }
          if (o.k === 'move') board.over.set(i, { fill: 'rgba(74,222,128,.3)', stroke: '#4ade80' });
          else if (o.k === 'chop') board.over.set(i, { fill: 'rgba(74,222,128,.35)', stroke: '#4ade80', label: '+🧱' });
          else if (o.k === 'fuse') board.over.set(i, { fill: 'rgba(59,130,246,.45)', stroke: '#60a5fa', label: '+FUSIÓN' });
          else if (o.k === 'board') board.over.set(i, { fill: 'rgba(56,189,248,.45)', stroke: '#38bdf8', label: '⚓' });
          else if (o.k === 'atk') board.over.set(i, o.lastStand ? { fill: 'rgba(59,130,246,.45)', stroke: '#60a5fa', label: `🛡${o.D}` } : o.ok ? { fill: 'rgba(250,204,21,.38)', stroke: '#facc15', label: `⚔${o.A}${o.A > o.D ? '>' : '≥'}${o.D}` } : { fill: 'rgba(127,29,29,.55)', stroke: '#b91c1c', label: `🔒${o.D}` });
          else if (o.k === 'shoot' || o.k === 'siege') board.over.set(i, { fill: 'rgba(249,115,22,.45)', stroke: '#fb923c', label: o.k === 'shoot' ? '🏹' : '💣' });
          else if (o.k === 'trap') board.over.set(i, { fill: 'rgba(168,85,247,.45)', stroke: '#c084fc', label: '🪤' });
          else if (o.k === 'fire') board.over.set(i, { fill: 'rgba(239,68,68,.5)', stroke: '#f87171', label: '🔥' });
          else if (o.k === 'takeover') board.over.set(i, { fill: 'rgba(234,179,8,.45)', stroke: '#fde047', label: '💰' });
          else if (o.k === 'pack_camp') board.over.set(i, { fill: 'rgba(34,197,94,.4)', stroke: '#4ade80', label: '⛺↩' });
          else if (o.k === 'wonder') board.over.set(i, { fill: 'rgba(234,179,8,.5)', stroke: '#fde047', label: '🏛' });
          if (o.alt && o.alt.length) {
            const icon = { trap: '🪤', fire: '🔥', takeover: '💰' };
            const cur = board.over.get(i);
            if (cur) cur.label = (cur.label || '') + o.alt.map(a => icon[a.k] || '+').join('');
          }
        }
      }
      board.draw();
    }
    function refresh() { sync(); hud(); overlay(); }
    function clearSel() { st.sel = -1; st.opts = new Map(); }
    function select(i) { st.sel = i; st.focus = i; st.opts = HF.options(g, i); st.pending = null; closeDrawer(); }

    function pumpEvents() {
      for (; st.evPtr < g.events.length; st.evPtr++) {
        const e = g.events[st.evPtr];
        if (e.i == null || !HF.visible(g, e.i)) { if (e.i == null) HF.toast(e.txt, 2800); continue; }
        st.bubbles.push({ i: e.i, txt: e.txt, kind: e.kind, life: 3 });
      }
      if (st.bubbles.length && !st.anim) {
        st.anim = true; let last = performance.now();
        const loop = t => {
          const dt = (t - last) / 1000; last = t;
          for (const b of st.bubbles) b.life -= dt;
          for (let k = st.bubbles.length - 1; k >= 0; k--) if (st.bubbles[k].life <= 0) st.bubbles.splice(k, 1);
          board.draw();
          if (st.bubbles.length && cur && cur.g === g) requestAnimationFrame(loop); else st.anim = false;
        };
        requestAnimationFrame(loop);
      }
    }

    function describe(i) {
      const c = g.cells[i];
      if (!HF.visible(g, i) && g.fogMap[i] === 0) return 'Territorio inexplorado';
      let t = `${HF.TNAME[c.t]}${c.b ? ' · ' + HF.BICON[c.b] + HF.BNAME[c.b] : ''}${c.res ? ' · ' + ['', 'Oro', 'Trigo', 'Madera'][c.res] : ''}`;
      t += c.o >= 0 ? ` · ${g.f[c.o].crest} ${HF.esc(g.f[c.o].name)}${c.sup ? '' : ' · AISLADO'}` : ' · Neutral';
      if (c.u && (c.u.owner === 0 || HF.visible(g, i))) t += ` · ${HF.UNITS[c.u.type].icon}${HF.UNITS[c.u.type].name} N${c.u.tier}`;
      if (c.u && c.u.owner === 0) t += ` · 👣${c.u.mv > 0 ? '✔' : '✖'} ⚔${c.u.at > 0 ? '✔' : '✖'}`;
      if (c.u && c.u.owner === 0) { const D = HF.UNITS[c.u.type], k = Math.min(c.u.tier, D.up.length) - 1; t += ` · paga 💰${D.upGold[k]} 🌾${D.up[k]}`; }
      if (c.u && c.u.cargo && (c.u.owner === 0 || HF.visible(g, i))) { const k = c.u.cargo; t += ` · ⚓ lleva ${HF.UNITS[k.type].icon}${HF.UNITS[k.type].name} N${k.tier}${c.u.owner === 0 ? ' 👣' + (k.mv > 0 ? '✔' : '✖') : ''}`; }
      if (c.wonder) t += ` · 🏛 Pirámide${c.o >= 0 ? ' ' + (g.f[c.o].wonderTurns || 0) + '/' + HF.CFG.doctrine.wonderStandTurns : ''}`;
      if (c.burn > 0) t += ` · 🕳 cenizas ${c.burn}`;
      if (c.fire > 0) t += ` · 🔥 arde ${c.fire}`;
      if (c.trap === 0) t += ' · 🪤 trampa propia';
      if (c.o !== 0 || HF.visible(g, i)) t += ` · 🛡${HF.defenseAt(g, i)}`;
      return t;
    }

    // acciones alternativas sobre la misma casilla (mover/atacar vs. trampa/incendiar/sobornar)
    function chooseAction(from, to, o) {
      const D = HF.CFG.doctrine;
      const lbl = {
        atk: '⚔ Atacar', move: '➡ Mover', chop: '🪓 Talar', fuse: '🔷 Fusionar', shoot: '🏹 Disparar', siege: '💣 Asediar', board: '⚓ Embarcar',
        trap: `🪤 Colocar trampa (${D.caltropCost.gold}💰)`, fire: '🔥 Incendiar bosque',
        takeover: `💰 Sobornar (${D.takeoverCost.gold}💰)`, pack_camp: '⛺ Empacar campamento', wonder: `🏛 Erigir pirámide (${D.wonderCost.gold}💰)`
      };
      const all = [o].concat(o.alt || []);
      HF.modal(`<h3>Elige acción</h3><div class="grid3" style="grid-template-columns:1fr">${all.map((x, k) => `<button data-k="${k}" class="pri" style="width:100%">${lbl[x.k] || x.k}</button>`).join('')}</div><br><button id="x" style="width:100%">Cancelar</button>`, m => {
        m.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { const x = all[+b.dataset.k]; HF.closeModal(); act(from, to, x.k); });
        m.querySelector('#x').onclick = HF.closeModal;
      });
    }

    function act(from, to, kind) {
      const r = HF.act(g, from, to, kind);
      if (!r.ok) { HF.sfx('error'); HF.vibrate(50); HF.toast(r.msg); return; }
      HF.sfx(r.kind === 'atk' ? 'good' : 'click');
      // el disparo parto no avanza: la unidad sigue en la casilla de origen y puede retirarse
      const u = g.cells[to].u || (r.shot ? g.cells[from].u : null);
      if (u && u.owner === 0 && HF.ready(u) && r.kind !== 'fuse') select(r.shot ? from : to); else clearSel();
      pumpEvents(); refresh(); afterAction();
    }
    function afterAction() { if (g.over) showEnd(); }

    function tap(i) {
      if (st.busy || g.over) return;
      const c = g.cells[i];
      if (st.pending) {
        if (st.pending.cells.has(i)) {
          const p = st.pending, r = p.kind === 'unit' ? HF.recruit(g, p.item, i) : HF.build(g, p.item, i);
          st.focus = i;
          if (!r.ok) { HF.sfx('error'); HF.vibrate(50); HF.toast(r.msg); } else { HF.sfx('good'); }
          if (p.kind === 'unit') p.cells = new Set(HF.recruitCells(g, p.item)); else p.cells = new Set(HF.buildCells(g, p.item));
          const cost = p.kind === 'unit' ? HF.unitCost(g, g.f[0], p.item) : HF.buildCost(g, g.f[0], p.item);
          if (!p.cells.size) { st.pending = null; closeDrawer(); }
          refresh(); drawerRender(); return;
        }
        HF.vibrate(50); HF.sfx('error'); st.pending = null; refresh(); return;
      }
      if (st.sel >= 0 && st.opts.has(i)) {
        const o = st.opts.get(i);
        if (o.alt && o.alt.length) { chooseAction(st.sel, i, o); return; }
        act(st.sel, i);
        return;
      }
      if (c.u && c.u.owner === 0 && HF.ready(c.u) && st.sel !== i) { select(i); info(describe(i) + ` · alcance ${st.opts.size} acciones`); refresh(); return; }
      if (st.sel >= 0 && !st.opts.has(i) && i !== st.sel) HF.vibrate(30);
      clearSel(); st.focus = i; info(describe(i)); refresh();
    }
    board.h.onTap = tap;
    board.h.onDragStart = i => {
      if (st.busy || g.over || st.pending) return false;
      const c = g.cells[i];
      if (c && c.u && c.u.owner === 0 && HF.ready(c.u)) { if (st.sel !== i) { select(i); refresh(); } return true; }
      return false;
    };
    board.h.onDrop = (from, to) => { if (st.sel === from && st.opts.has(to)) act(from, to); else { HF.vibrate(50); HF.sfx('error'); refresh(); } };

    // ----- cajones -----
    function closeDrawer() { st.drawer = null; q('#drawer').classList.add('hidden'); }
    function drawerRender() {
      const d = q('#drawer'), f = g.f[0];
      if (!st.drawer) { d.classList.add('hidden'); return; }
      d.classList.remove('hidden');
      const cs = c => Object.entries(c).map(([k, v]) => ({ gold: '💰', food: '🌾', wood: '🧱' }[k] + v)).join(' ');
      const afford = c => HF.affordAny(g, f, c);
      let items;
      if (st.drawer === 'build') {
        items = [B.CAMINO, B.CAMPAMENTO, B.PUEBLO, B.BASTION, B.CIUDAD];
        d.innerHTML = items.map(b => { const c = HF.buildCost(g, f, b); return `<button data-b="${b}" class="${st.pending && st.pending.item === b ? 'sel' : ''}" style="${afford(c) ? '' : 'opacity:.5'}">${HF.art.html('build', b, HF.BICON[b])} ${HF.BNAME[b]}<small>${cs(c)}</small></button>`; }).join('');
      } else {
        items = Object.keys(HF.UNITS);
        d.innerHTML = items.map(t => { const c = HF.unitCost(g, f, t); return `<button data-u="${t}" class="${st.pending && st.pending.item === t ? 'sel' : ''}" style="${afford(c) ? '' : 'opacity:.5'}">${HF.art.html('unit', t, HF.UNITS[t].icon)} ${HF.UNITS[t].name}<small>${cs(c)}</small></button>`; }).join('');
      }
      d.querySelectorAll('button').forEach(b => b.onclick = () => {
        const kind = b.dataset.b ? 'build' : 'unit', item = b.dataset.b ? +b.dataset.b : b.dataset.u;
        const cells = new Set(kind === 'build' ? HF.buildCells(g, item) : HF.recruitCells(g, item));
        const cost = kind === 'build' ? HF.buildCost(g, f, item) : HF.unitCost(g, f, item);
        if (!afford(cost)) { HF.sfx('error'); HF.vibrate(50); return HF.toast('Recursos insuficientes'); }
        if (!cells.size) { HF.sfx('error'); HF.vibrate(50); return HF.toast('Ninguna provincia con casillas válidas puede pagarlo'); }
        clearSel(); st.pending = { kind, item, cells }; HF.sfx('click');
        info('Toca una casilla verde'); drawerRender(); refresh();
      });
    }
    function toggleDrawer(k) {
      if (st.drawer === k) { closeDrawer(); st.pending = null; refresh(); return; }
      clearSel(); st.pending = null; st.drawer = k; drawerRender(); refresh();
    }
    q('#bBuild').onclick = () => toggleDrawer('build');
    q('#bRec').onclick = () => toggleDrawer('unit');
    q('#bUndo').onclick = () => { if (HF.undo(g)) { HF.sfx('click'); clearSel(); st.pending = null; refresh(); drawerRender(); } };

    // ----- turnos -----
    function save() { if (!g.over) HF.store.atomicSave('savegame_active', HF.serialize(g)); }
    q('#bEnd').onclick = () => {
      if (st.busy || g.over) return;
      st.busy = true; clearSel(); st.pending = null; closeDrawer(); refresh();
      HF.toast('⏳ Turno de los rivales…', 1500);
      setTimeout(() => {
        try { HF.endTurn(g, HF.aiPlay); } catch (e) { console.error(e); HF.toast('Error de IA: ' + e.message); }
        st.busy = false; pumpEvents();
        if (g.over) { refresh(); return showEnd(); }
        save(); refresh();
        const idle = g.cells.filter(c => c && c.u && c.u.owner === 0 && HF.ready(c.u)).length;
        info(`Turno ${g.turn} · ${idle} unidades listas · ${goalText(g)}`);
      }, 40);
    };
    const onHide = () => { if (document.visibilityState === 'hidden' && cur && cur.g === g) save(); };
    document.addEventListener('visibilitychange', onHide); G.addEventListener('pagehide', save);
    HF.onLeave = () => { document.removeEventListener('visibilitychange', onHide); G.removeEventListener('pagehide', save); cur = null; };

    // ----- menús -----
    function scoreboard() {
      HF.modal(`<h3>📊 Marcador · Turno ${g.turn}</h3><table><tr><th></th><th>Casillas</th><th>Ciudades</th><th>Unid.</th><th>💰</th></tr>${g.f.map(f => {
        const known = f.human || g.fog === 'NONE' || true;
        return `<tr style="${f.alive ? '' : 'opacity:.4'}"><td style="color:${f.color}">${f.crest} ${HF.esc(f.name)}</td><td>${HF.territory(g, f.id)}</td><td>${g.cells.filter(c => c && c.o === f.id && c.b === B.CIUDAD).length}</td><td>${g.cells.filter(c => c && c.u && c.u.owner === f.id).length}</td><td>${f.human ? f.gold : '?'}</td></tr>`;
      }).join('')}</table><div class="dim small">🎯 ${goalText(g)}</div><br><button id="x" class="pri">Cerrar</button>`, m => m.querySelector('#x').onclick = HF.closeModal);
    }
    q('#board').onclick = scoreboard;
    q('#menu').onclick = () => HF.modal(`<h3>Pausa</h3><div class="dim small">🎯 ${goalText(g)}</div><br>
      <div class="grid3" style="grid-template-columns:1fr"><button id="r" class="pri">▶ Continuar</button><button id="c">⌖ Centrar mapa</button><button id="s">💾 Guardar y salir</button><button id="a">🏳 Abandonar</button></div>`, m => {
      m.querySelector('#r').onclick = HF.closeModal;
      m.querySelector('#c').onclick = () => { board.fit(); HF.closeModal(); };
      m.querySelector('#s').onclick = () => { save(); HF.go('hub'); };
      m.querySelector('#a').onclick = () => { if (confirm('¿Abandonar la partida? Se perderá el progreso.')) { HF.store.del('savegame_active'); HF.go('hub'); } };
    });

    function showEnd() {
      HF.store.del('savegame_active');
      const res = HF.recordResult(g) || {};
      const won = g.over.won;
      HF.sfx(won ? 'win' : 'lose');
      const s = g.stat, m = g.meta || {};
      let extra = '';
      if (g.mode === 'campaign' && won) {
        extra = `<div class="stars" style="font-size:28px;text-align:center">${'★'.repeat(res.stars)}${'☆'.repeat(3 - res.stars)}</div>
        <div class="small">★ Victoria<br>${g.turn <= m.par ? '★' : '☆'} En ≤ ${m.par} turnos<br>${res.stars === 3 || (res.stars === 2 && g.turn > m.par) ? '★' : '☆'} ${HF.CHTXT[m.challenge]}</div>`;
      }
      if (g.mode === 'daily') extra = `<div style="text-align:center;font-size:20px">${res.official ? (won ? 'Resultado oficial ' + HF.medal(g.turn) : 'Intento oficial fallido') : 'Práctica (no cuenta)'}</div>`;
      HF.modal(`<h2 style="text-align:center">${won ? '🏆 ¡Victoria!' : '💀 Derrota'}</h2><div style="text-align:center" class="dim">${HF.esc(g.over.reason)} · Turno ${g.turn}</div>${extra}
        <canvas class="chart" id="ch"></canvas>
        <table><tr><td>Unidades eliminadas</td><td>${s.kills}</td></tr><tr><td>Unidades perdidas</td><td>${s.lost}</td></tr><tr><td>Casillas conquistadas</td><td>${s.captured}</td></tr><tr><td>Edificios construidos</td><td>${s.built}</td></tr><tr><td>Aislamientos provocados</td><td>${s.cuts}</td></tr><tr><td>Deserciones</td><td>${s.deserts}</td></tr></table><br>
        <div class="row"><button id="menu2" class="grow">Menú</button>${g.mode === 'campaign' && won && m.idx < 29 ? '<button id="nx" class="pri grow">Siguiente ▶</button>' : '<button id="again" class="pri grow">Repetir</button>'}</div>`, mm => {
        chart(mm.querySelector('#ch'));
        mm.querySelector('#menu2').onclick = () => HF.go(g.mode === 'campaign' ? 'campaign' : 'hub');
        const nx = mm.querySelector('#nx'), ag = mm.querySelector('#again');
        if (nx) nx.onclick = () => HF.startGame(HF.makeGame(HF.campaign[m.idx + 1], HF.loadTribe()));
        if (ag) ag.onclick = () => HF.go(g.mode === 'campaign' ? 'campaign' : g.mode === 'daily' ? 'daily' : 'newgame');
      });
    }
    function chart(cv) {
      const w = cv.clientWidth || 300, h = 150, d = 2; cv.width = w * d; cv.height = h * d;
      const x = cv.getContext('2d'); x.scale(d, d);
      const tl = g.timeline, mx = Math.max(1, ...tl.flatMap(t => t.terr));
      g.f.forEach((f, k) => {
        x.strokeStyle = f.color; x.lineWidth = 2; x.beginPath();
        tl.forEach((t, i) => { const px = 8 + (w - 16) * (tl.length > 1 ? i / (tl.length - 1) : 0), py = h - 10 - (h - 20) * t.terr[k] / mx; i ? x.lineTo(px, py) : x.moveTo(px, py); });
        x.stroke();
      });
      x.fillStyle = '#8aa0c8'; x.font = '10px monospace'; x.fillText('Territorio por turno', 8, 12);
    }

    refresh();
    board.fit();
    if (g.turn === 1 && g.mode !== 'skirmish' || g.mode === 'daily') {
      const m = g.meta || {};
      HF.modal(`<h3>${HF.esc(m.name || 'Desafío')}</h3><p>${goalText(g)}</p>${m.par ? `<div class="dim small">★ en ≤ ${m.par} turnos · ★ ${HF.CHTXT[m.challenge]}</div>` : ''}<br><button class="pri" id="x" style="width:100%">¡Vamos!</button>`, mm => mm.querySelector('#x').onclick = HF.closeModal);
    }
    const capi = g.cells.findIndex(c => c && c.o === 0 && c.cap);
    board.cam.z = Math.max(board.cam.z, 1.2);
    if (capi >= 0) board.centerOn(capi);
    info(`${goalText(g)}`);
    if (g.over) showEnd();
  };
})(window);
