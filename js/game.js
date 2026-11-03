(function (G) {
  const HF = G.HF, B = HF.B;
  let cur = null;
  // Iconos del HUD recortados de art2/oro, art2/trigo y art2/madera.
  const RES_ICO = { gold: 'assets/ui/gold.webp', food: 'assets/ui/wheat.webp', wood: 'assets/ui/wood.webp' };
  const resIco = k => `<img class="res-ico" src="${RES_ICO[k]}" alt="" draggable="false">`;
  const costIcon = k => `<img class="cost-ico" src="${RES_ICO[k]}" alt="" draggable="false">`;

  const goalText = g => {
    const gl = g.goal || {};
    return { conquer: 'Conquista: elimina todas las ciudades rivales', survive: `Sobrevive hasta el turno ${gl.n}`, gold: `Reúne ${gl.n} de oro`, territory: `Controla ${gl.n} casillas`, city: `Ten ${gl.n} ciudades`, maxTurns: `Gana antes del turno ${gl.n}` }[gl.type] || 'Conquista';
  };

  // Resumen de una facción para el marcador: reservas y neto por recurso,
  // ejército y su desglose, mantenimiento, territorio, estructuras y estado de
  // la capital. Se expone para poder probarlo sin navegador.
  HF.factionSummary = function (g, f) {
    const stock = HF.stockFor(g, f, null) || { gold: 0, food: 0, wood: 0 };
    const pv = HF.preview(g, f, null);
    const loan = pv.loan || 0;
    const netGold = pv.inc.gold - pv.upkeepGold - loan;
    const netFood = pv.inc.food - pv.upkeep;
    const netWood = pv.inc.wood;
    const byType = {};
    let units = 0;
    for (const c of g.cells) if (c && c.u && c.u.owner === f.id) { units++; byType[c.u.type] = (byType[c.u.type] || 0) + 1; }
    let cells = 0, roads = 0, camps = 0, towns = 0, bastions = 0, cities = 0;
    for (const c of g.cells) {
      if (!c || c.o !== f.id) continue;
      cells++;
      if (c.b === B.CAMINO) roads++;
      else if (c.b === B.CAMPAMENTO) camps++;
      else if (c.b === B.PUEBLO) towns++;
      else if (c.b === B.BASTION) bastions++;
      else if (c.b === B.CIUDAD) cities++;
    }
    const cap = g.cells.find(c => c && c.cap && c.o === f.id && c.b === B.CIUDAD) || null;
    const threat = cap ? g.cells.some(c => c && c.u && c.u.owner !== f.id && HF.hexDist(c, cap) <= 2) : false;
    const power = cells * 2 + cities * 14 + towns * 7 + bastions * 9 + camps * 4 + units * 3;
    return { f, stock, pv, loan, netGold, netFood, netWood, byType, units, cells, roads, camps, towns, bastions, cities, cap, threat, power, alive: f.alive !== false };
  };

  HF.startGame = function (g) {
    // Facción que controla este cliente (0 en local; asiento en multijugador).
    let P = g.mySeat || 0;
    if (typeof document !== 'undefined' && document.body && document.body.classList) document.body.classList.remove('hub-bg');
    HF.closeModal();
    if (HF.onLeave) { HF.onLeave(); HF.onLeave = null; }
    HF.lastGame = { mode: g.mode, meta: g.meta };
    const el = HF.$('#app');
    el.innerHTML = `<div class="screen game">
      <div class="hud-top"><button id="menu">☰</button><span id="turn"></span><span id="clock" class="small" style="color:var(--dim)"></span><div class="res" id="res"></div><button id="bView"><img class="view-ico" src="assets/ui/map.webp" alt="" draggable="false"><small>${HF.t('VIEW_NORMAL')}</small></button><button id="board" title="${HF.lang() === 'en' ? 'Scoreboard' : 'Marcador'}"><img class="board-ico" src="assets/ui/codex.webp" alt="" draggable="false"></button></div>
      <div class="boardwrap"><canvas id="cv"></canvas><div class="info" id="info"></div></div>
      <div class="drawer hidden" id="drawer"></div>
      <div class="hud-bot">
        <button id="bBuild" class="hud-art-btn"><img class="hud-art" src="assets/ui/build.webp" alt="" draggable="false"><small>${HF.t('GAME_BUILD')}</small></button><button id="bRec" class="hud-art-btn"><img class="hud-art" src="assets/ui/recruit.webp" alt="" draggable="false"><small>${HF.t('GAME_RECRUIT')}</small></button>
        <button id="bNext" title="${HF.lang() === 'en' ? 'Next idle unit' : 'Siguiente unidad libre'}"><img class="hud-art" src="assets/ui/history.webp" alt="" draggable="false"></button>
        <button id="bUndo">↩<small>${HF.t('GAME_UNDO')}</small></button><button id="bEnd" class="pri">⏭<small>${HF.t('GAME_END')}</small></button>
      </div>
      <div class="tip hidden" id="tip"></div></div>`;
    const q = s => el.querySelector(s);
    const st = { sel: -1, opts: new Map(), pending: null, drawer: null, busy: false, focus: -1, evPtr: g.events.length, bubbles: [] };
    cur = { g, st };
    const board = new HF.Board(q('#cv'), {});
    board.colors = g.f.map(f => f.color);
    board.bubbles = st.bubbles;
    board.game = g;
    board.mode = 'play';
    board.startAnim();
    if (HF.bgm) { HF.bgm.start(); HF.bgm.update(g); }
    cur.board = board; HF.cur = () => cur;
    if (HF.replays) HF.replays.init(g);
    if (HF.banter) HF.banter.init(g);

    function nextIdleUnit(g) {
      // Solo unidades con las DOS acciones intactas: mover y atacar.
      const list = g.cells.filter(c => c && c.u && c.u.owner === P && c.u.mv > 0 && c.u.at > 0);
      if (!list.length) {
        HF.toast(HF.lang() === 'en' ? 'No units with both actions' : 'No hay unidades con las dos acciones libres', 1800);
        return;
      }
      let idx = 0;
      if (st.sel >= 0) {
        const cur = list.findIndex(c => c.i === st.sel);
        if (cur >= 0 && cur < list.length - 1) idx = cur + 1;
      }
      const cell = list[idx];
      // Igual que el toque normal: seleccionar, describir y refrescar; antes
      // solo se movia la camara y la unidad nunca quedaba realmente activa.
      select(cell.i);
      renderInfo(cell.i, ` · alcance ${st.opts.size} acciones`);
      board.centerOn(cell.i);
      refresh();
      HF.sfx('click');
    }

    const sync = () => { board.cells = g.cells; board.R = g.R; board.fogMap = g.fog === 'NONE' ? null : g.fogMap; };
    const info = t => { q('#info').innerHTML = t; };
    const fmt = n => (n >= 0 ? '+' : '') + n;

    function hud() {
      const f = g.f[P], fc = st.focus >= 0 ? g.cells[st.focus] : null;
      const provs = HF.provinces(g, f);
      let prov = fc && (fc.o === P || (fc.u && fc.u.owner === P)) && provs.length > 1 ? HF.provOf(g, f, fc) : null;
      if (prov != null && prov < 0) prov = null;
      const pv = HF.preview(g, f, prov), sk = HF.stockFor(g, f, prov);
      const trs = HF.tradeRoutes(g, f);
      const trL = trs.filter(r => r.kind === 'land').length, trS = trs.filter(r => r.kind === 'sea').length;
      const season = HF.season(g), SICON = ['🌸', '☀️', '🍂', '❄️'];
      q('#turn').innerHTML = HF.crestHTML(f.crest, 18, 'hud-crest') + ' T' + g.turn + ' ' + (SICON[season] || '');
      q('#turn').title = HF.seasonName(season);
      q('#res').title = prov != null ? 'Provincia seleccionada' : '';
      const loan = pv.loan || 0;
      q('#res').innerHTML = (prov != null ? '<span>📍</span>' : '') +
        `<span title="Ingreso bruto +${pv.inc.gold} · mantenimiento −${pv.upkeepGold}${loan ? ` · préstamo −${loan}` : ''}">${resIco('gold')}${sk.gold}<i class="pos">+${pv.inc.gold}</i><small class="upk">−${pv.upkeepGold + loan}</small></span>` +
        `<span title="Ingreso bruto +${pv.inc.food} · mantenimiento −${pv.upkeep}">${resIco('food')}${sk.food}<i class="pos">+${pv.inc.food}</i><small class="upk">−${pv.upkeep}</small></span>` +
        `<span>${resIco('wood')}${sk.wood}${pv.inc.wood ? `<i class="pos">+${pv.inc.wood}</i>` : ''}</span>` +
        `${trL ? `<span title="Rutas terrestres activas">🛣${trL}</span>` : ''}` +
        `${trS ? `<span title="Rutas marítimas activas">⛵${trS}</span>` : ''}`;
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
          else if (o.k === 'raid') { const ic = o.res === 'food' ? '🌾' : o.res === 'wood' ? '🪵' : '💰'; board.over.set(i, { fill: 'rgba(234,179,8,.5)', stroke: '#fde047', label: `${ic}${o.loot || 0}` }); }
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
    function refresh() {
      if (g.online) g.cur = P;
      sync(); hud(); overlay();
      if (HF.replays) HF.replays.touch(g);
      if (HF.bgm) HF.bgm.update(g);
      // Pánico logístico al empezar un turno en déficit (una vez por turno).
      if (HF.banter && g.f[P] && g.f[P].deficit && g._banterPanicTurn !== g.turn) {
        g._banterPanicTurn = g.turn;
        HF.banter.triggerSupplyPanic(g);
      }
    }
    function clearSel() { st.sel = -1; st.opts = new Map(); }
    function select(i) { st.sel = i; st.focus = i; st.opts = HF.options(g, i); st.pending = null; closeDrawer(); }

    function startBubbles() {
      if (!st.bubbles.length || st.anim) return;
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
    // El motor de banter empuja burbujas por aquí (no conoce el estado interno).
    HF.bubbleAt = (gg, i, txt, kind, life) => {
      if (!cur || cur.g !== gg || gg.over) return;
      st.bubbles.push({ i, txt, kind: kind || 'ally', life: life || 3, born: performance.now() });
      if (st.bubbles.length > 12) st.bubbles.shift();
      startBubbles();
    };

    function pumpEvents() {
      for (; st.evPtr < g.events.length; st.evPtr++) {
        const e = g.events[st.evPtr];
        if (e.i == null || !HF.visible(g, e.i)) { if (e.i == null) HF.toast(e.txt, 2800); continue; }
        st.bubbles.push({ i: e.i, txt: e.txt, kind: e.kind, life: 3, born: performance.now() });
      }
      startBubbles();
    }

    function describe(i) {
      const c = g.cells[i];
      if (!HF.visible(g, i) && g.fogMap[i] === 0) return 'Territorio inexplorado';
      let t = `${HF.TNAME[c.t]}${c.b ? ' · ' + HF.BICON[c.b] + HF.BNAME[c.b] : ''}${c.res ? ' · ' + ['', 'Oro', 'Trigo', 'Madera'][c.res] : ''}`;
      t += c.o >= 0 ? ` · ${HF.crestHTML(g.f[c.o].crest, 16)} ${HF.esc(g.f[c.o].name)}${(c.sup && c.iso !== g.turn) ? '' : ' · AISLADO'}` : ' · Neutral';
      if (c.u && (c.u.owner === P || HF.visible(g, i))) t += ` · ${HF.UNITS[c.u.type].icon}${HF.UNITS[c.u.type].name} N${c.u.tier}`;
      if (c.u && c.u.owner === P) t += ` · 👣${c.u.mv > 0 ? '✔' : '✖'} ⚔${c.u.at > 0 ? '✔' : '✖'}`;
      if (c.u && c.u.owner === P && HF.unitRange) t += ` · alcance ${HF.unitRange(g, c.u, c)}`;
      if (c.u && c.u.owner === P) { const D = HF.UNITS[c.u.type], k = Math.min(c.u.tier, D.up.length) - 1; t += ` · paga ${costIcon('gold')}${D.upGold[k]} ${costIcon('food')}${D.up[k]}`; }
      if (c.u && c.u.cargo && (c.u.owner === P || HF.visible(g, i))) { const k = c.u.cargo; t += ` · ⚓ lleva ${HF.UNITS[k.type].icon}${HF.UNITS[k.type].name} N${k.tier}${c.u.owner === P ? ' 👣' + (k.mv > 0 ? '✔' : '✖') : ''}`; }
      if (c.wonder) t += ` · 🏛 Pirámide${c.o >= 0 ? ' ' + (g.f[c.o].wonderTurns || 0) + '/' + HF.CFG.doctrine.wonderStandTurns : ''}`;
      if (c.burn > 0) t += ` · 🕳 cenizas ${c.burn}`;
      if (c.fire > 0) t += ` · 🔥 arde ${c.fire}`;
      if (c.trap === 0) t += ' · 🪤 trampa propia';
      if (c.cap && c.b === B.CIUDAD && c.o === P && g.f[P].loan) t += ` · 💳 deuda ${g.f[P].loan.turns} turnos`;
      return t;
    }

    // Panel contextual: describe la casilla y ofrece el empréstito en la capital.
    function renderInfo(i, extra) {
      const c = g.cells[i], canLoan = !!(c && c.cap && c.b === B.CIUDAD && c.o === P && !g.f[P].loan);
      const unitVisible = c && c.u && (c.u.owner === P || HF.visible(g, i));
      const bd = c && (unitVisible || (c.b && HF.BDEF[c.b])) ? HF.defenseBreakdown(g, i) : null;
      const canCargo = !!(c && c.o === P && c.sup && (c.b === B.PUEBLO || c.b === B.CIUDAD) &&
        HF.isPort && HF.isPort(g, c) && HF.ports(g, g.f[P]).some(p => p.i !== i && HF.seaPath(g, g.f[P], i, p.i)));
      q('#info').innerHTML = describe(i) + (extra || '') +
        (bd && bd.parts.length ? `<div class="defbreak">🛡 <b>${bd.total}</b> · ${HF.esc(bd.detail)}</div>` : '') +
        (canLoan ? ` <button class="loanbtn" id="loanBtn">${costIcon('gold')} Solicitar empréstito</button>` : '') +
        (canCargo ? ` <button class="loanbtn" id="cargoBtn">⛵ Enviar carga</button>` : '');
      const cb = q('#info #cargoBtn');
      if (cb) cb.onclick = e => { e.stopPropagation(); cargoModal(i); };
      const b = q('#info #loanBtn');
      if (b) b.onclick = e => {
        e.stopPropagation();
        const r = HF.loan(g, i);
        if (!r.ok) { HF.sfx('error'); HF.vibrate(50); HF.toast(r.msg); return; }
        HF.sfx('good');
        HF.toast(`Empréstito: +${r.amount} oro · deuda ${r.perTurn}/turno`);
        refresh(); renderInfo(i, extra);
      };
    }

    // Envío manual de carga entre dos puertos propios conectados por mar.
    function cargoModal(fromIdx) {
      const f = g.f[P], c = g.cells[fromIdx];
      if (!f || !c || !HF.ports || !HF.seaPath) return;
      const dests = HF.ports(g, f).filter(p => p.i !== fromIdx && HF.seaPath(g, f, fromIdx, p.i));
      if (!dests.length) { HF.sfx('error'); return HF.toast(HF.lang() === 'en' ? 'No sea route to another port' : 'No hay otro puerto conectado por mar'); }
      const comp = c.comp != null ? c.comp : 0;
      const st = (f.stock && f.stock[comp]) || { gold: 0, food: 0, wood: 0 };
      const pn = p => `${HF.BNAME[p.b] || 'Puerto'} (${p.q},${p.r})`;
      HF.modal(`<h3>⛵ Enviar carga</h3>
        <p class="dim small">Origen (${c.q},${c.r}) · disponible: 💰${st.gold} 🌾${st.food} 🪵${st.wood}</p>
        <label>Puerto de destino</label>
        <select id="ckDst">${dests.map(p => `<option value="${p.i}">${pn(p)}</option>`).join('')}</select>
        <label>Recurso</label>
        <select id="ckRes">
          <option value="gold">💰 Oro (${st.gold})</option>
          <option value="food">🌾 Comida (${st.food})</option>
          <option value="wood">🪵 Madera (${st.wood})</option>
        </select>
        <label>Cantidad (máx. 50)</label>
        <input id="ckQty" type="number" min="1" max="50" value="50">
        <div class="row"><button id="ckGo" class="pri grow">Zarpar</button><button id="ckX">Cancelar</button></div>`, m => {
        m.querySelector('#ckX').onclick = HF.closeModal;
        m.querySelector('#ckGo').onclick = () => {
          const r = HF.sendCargo(g, fromIdx, +m.querySelector('#ckDst').value, m.querySelector('#ckRes').value, +m.querySelector('#ckQty').value);
          HF.closeModal();
          if (!r.ok) { HF.sfx('error'); return HF.toast(r.msg); }
          HF.sfx('good');
          HF.toast(`⛵ ${r.qty} en camino`);
          refresh(); renderInfo(fromIdx);
        };
      });
    }

    // Barks diegéticos: 40% al tocar una unidad propia.
    const BARK = {
      INF: ['¡Firmes!', 'Listos para el avance.', 'Por la civilización.'],
      ENG: ['Puente listo.', 'La montaña no nos detiene.', 'Abriendo camino.'],
      ARC: ['Ojo avizor.', 'Cuerda tensada.', 'Diviso la vanguardia.'],
      CAB: ['Al galope.', 'No podrán seguirnos.', 'La estepa nos llama.'],
      SIE: ['Pólvora seca.', 'Ajustando alzas.', 'Los muros caerán.'],
      BAR: ['Viento en popa.', 'Costas a la vista.', 'Profundidad segura.']
    };
    const pickBark = a => a[Math.floor(Math.random() * a.length)];
    function bark(c) {
      const u = c && c.u;
      if (!u || u.owner !== P || g.over) return;
      const now = performance.now();
      if (st.barkAt && now - st.barkAt < 2500) return;
      if (Math.random() > HF.CFG.barks.chance) return;
      let txt, kind = 'info';
      if (!c.sup || g.f[P].deficit) {
        txt = pickBark(['Las raciones se acaban...', '¡Líneas cortadas!', 'Necesitamos provisiones.']);
        kind = 'bad';
      } else if ((u.type === 'INF' || u.type === 'ENG') && HF.hasTag(g.f[P], 'TESTUDO_SHIELD') && Math.random() < .45) {
        txt = '¡Cierren filas!';
      } else {
        txt = pickBark(BARK[u.type] || BARK.INF);
      }
      st.barkAt = now;
      st.bubbles.push({ i: c.i, txt, kind, life: HF.CFG.barks.life, born: performance.now() });
      if (st.bubbles.length > 6) st.bubbles.shift();
      pumpEvents();
    }

    // acciones alternativas sobre la misma casilla (mover/atacar vs. trampa/incendiar/sobornar)
    function chooseAction(from, to, o) {
      const D = HF.CFG.doctrine;
      const lbl = {
        atk: '⚔ Atacar', move: '➡ Mover', chop: '🪓 Talar', fuse: '🔷 Fusionar', shoot: '🏹 Disparar', siege: '💣 Asediar', board: '⚓ Embarcar',
        raid: '💰 Asaltar caravana',
        trap: `🪤 Colocar trampa (${costIcon('gold')}${D.caltropCost.gold})`, fire: '🔥 Incendiar bosque',
        takeover: `Sobornar (${costIcon('gold')}${D.takeoverCost.gold})`, pack_camp: '⛺ Empacar campamento', wonder: `🏛 Erigir pirámide (${costIcon('gold')}${D.wonderCost.gold})`
      };
      const all = [o].concat(o.alt || []);
      HF.modal(`<h3>Elige acción</h3><div class="grid3" style="grid-template-columns:1fr">${all.map((x, k) => `<button data-k="${k}" class="pri" style="width:100%">${lbl[x.k] || x.k}</button>`).join('')}</div><br><button id="x" style="width:100%">Cancelar</button>`, m => {
        m.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { const x = all[+b.dataset.k]; HF.closeModal(); act(from, to, x.k); });
        m.querySelector('#x').onclick = HF.closeModal;
      });
    }

    function act(from, to, kind) {
      // En partida en red el invitado envía la acción al anfitrión; el estado
      // local se actualiza cuando llega el snapshot.
      if (g.online) {
        const room = HF.online.room && HF.online.room();
        if (room && room.game_phase === 'TURN_BASED' && room.active_player !== HF.online.playerId()) {
          HF.toast(HF.lang() === 'en' ? 'Not your turn' : 'No es tu turno'); return;
        }
        if (!g.online.host) {
          HF.online.submit({ k: 'act', from, to, kind: kind || undefined });
          HF.toast(HF.lang() === 'en' ? 'Action sent' : 'Acción enviada');
          clearSel(); refresh(); return;
        }
        g.cur = P;
      }
      const target = g.cells[to], uBefore = g.cells[from] && g.cells[from].u;
      const beforeSup = g.cells.map(c => !!(c && c.sup));
      const wasCap = !!(target && target.cap), wasBastion = !!(target && target.b === B.BASTION);
      const r = HF.act(g, from, to, kind);
      if (!r.ok) {
        if (wasBastion && (kind === 'atk' || kind === 'siege')) board.burst('stone', to, 7);
        HF.sfx('error'); HF.vibrate(50); HF.toast(r.msg); return;
      }
      if (g.online) HF.online.dirty(g);
      HF.sfx(r.kind === 'atk' ? 'good' : 'click');
      // salto parabólico del soldado al moverse, talar o conquistar
      if (uBefore && !r.shot && (r.kind === 'move' || r.kind === 'chop' || (r.kind === 'atk' && g.cells[to].u))) board.hopTo(from, to, uBefore);
      if (r.kind === 'chop') board.burst('wood', to, 4);
      if (wasBastion && (r.kind === 'atk' || r.kind === 'siege')) board.burst('stone', to, 7);
      if (r.kind === 'siege') { board.shake(80, 2); board.burst('stone', to, 8); }
      if (r.kind === 'atk' && (wasCap || wasBastion)) board.shake(80, 2);
      const newlyIsolated = [];
      g.cells.forEach((c, i) => { if (c && c.o >= 0 && !c.sup && beforeSup[i]) newlyIsolated.push(i); });
      if (newlyIsolated.length) board.pulseCells(newlyIsolated);
      // Banter: duelo/rencilla al quedar adyacente y pánico si se cortó el suministro.
      if (HF.banter) {
        const moved = g.cells[to] && g.cells[to].u;
        if (moved && (r.kind === 'move' || r.kind === 'atk' || r.kind === 'chop')) {
          for (const j of HF.nbs(g, to)) {
            const n = g.cells[j];
            if (n && n.u && HF.banter.triggerAdjacent(g, to, j)) break;
          }
        }
        if (newlyIsolated.length) HF.banter.triggerSupplyPanic(g, newlyIsolated[0]);
      }
      // el disparo parto no avanza: la unidad sigue en la casilla de origen y puede retirarse
      const u = g.cells[to].u || (r.shot ? g.cells[from].u : null);
      const at = r.shot ? from : to;
      if (u && u.owner === P && HF.ready(u) && r.kind !== 'fuse') { select(at); renderInfo(at); } else clearSel();
      pumpEvents(); refresh(); afterAction();
    }
    function afterAction() { if (g.over) showEnd(); }

    function tap(i) {
      hideTip();
      if (st.busy || g.over) return;
      if (HF.banter) { HF.banter.resetIdle(g); if (HF.banter.isTalking(i)) HF.banter.silence(i); }
      const c = g.cells[i];
      if (st.pending) {
        if (st.pending.cells.has(i)) {
          const p = st.pending, tier = p.tier || 1;
          if (g.online) {
            const room = HF.online.room && HF.online.room();
            if (room && room.game_phase === 'TURN_BASED' && room.active_player !== HF.online.playerId()) {
              HF.toast(HF.lang() === 'en' ? 'Not your turn' : 'No es tu turno'); return;
            }
            if (!g.online.host) {
              HF.online.submit(p.kind === 'unit' ? { k: 'recruit', type: p.item, i, tier } : { k: 'build', b: p.item, i });
              st.pending = null; closeDrawer(); HF.toast(HF.lang() === 'en' ? 'Action sent' : 'Acción enviada');
              refresh(); return;
            }
            g.cur = P;
          }
          const r = p.kind === 'unit' ? HF.recruit(g, p.item, i, undefined, tier) : HF.build(g, p.item, i);
          if (r.ok && g.online) HF.online.dirty(g);
          st.focus = i;
          if (!r.ok) { HF.sfx('error'); HF.vibrate(50); HF.toast(r.msg); } else { HF.sfx('good'); }
          if (p.kind === 'unit') p.cells = new Set(HF.recruitCells(g, p.item, tier)); else p.cells = new Set(HF.buildCells(g, p.item));
          if (!p.cells.size) { st.pending = null; closeDrawer(); }
          refresh(); drawerRender(); return;
        }
        HF.vibrate(50); HF.sfx('error'); st.pending = null; refresh(); return;
      }
      // Voz del edificio al tocarlo (una vez por turno y con probabilidad).
      if (HF.banter && c.b && c.b !== B.ARBOL) HF.banter.triggerBuildingBanter(g, i);
      if (st.sel >= 0 && st.opts.has(i)) {
        const o = st.opts.get(i);
        if (o.alt && o.alt.length) { chooseAction(st.sel, i, o); return; }
        act(st.sel, i);
        return;
      }
      if (c.u && c.u.owner === P && HF.ready(c.u) && st.sel !== i) {
        select(i); bark(c); renderInfo(i, ` · alcance ${st.opts.size} acciones`); refresh(); return;
      }
      if (st.sel >= 0 && !st.opts.has(i) && i !== st.sel) HF.vibrate(30);
      clearSel(); st.focus = i; renderInfo(i); refresh();
    }
    board.h.onTap = tap;
    board.h.onDragStart = i => {
      if (st.busy || g.over || st.pending) return false;
      if (HF.banter) { HF.banter.resetIdle(g); if (HF.banter.isTalking(i)) HF.banter.silence(i); }
      const c = g.cells[i];
      if (c && c.u && c.u.owner === P && HF.ready(c.u)) { if (st.sel !== i) { select(i); bark(c); renderInfo(i, ` · alcance ${st.opts.size} acciones`); refresh(); } return true; }
      return false;
    };
    board.h.onDrop = (from, to) => { if (st.sel === from && st.opts.has(to)) act(from, to); else { HF.vibrate(50); HF.sfx('error'); refresh(); } };
    // Cualquier toque, arrastre o zoom reinicia el temporizador de inactividad.
    const banterTouch = () => { if (HF.banter) HF.banter.resetIdle(g); };
    el.addEventListener('pointerdown', banterTouch);
    el.addEventListener('wheel', banterTouch, { passive: true });

    // ----- ficha emergente (hover/tap) de edificios y unidades -----
    const tip = q('#tip');
    let tipTimer = 0;
    const TIER_ROMAN = ['I', 'II', 'III', 'IV'];
    const costTxt = c => Object.keys(RES_ICO).filter(k => c[k]).map(k => costIcon(k) + c[k]).join(' ') || '—';
    function hideTip() { clearTimeout(tipTimer); tip.classList.add('hidden'); }
    function showTip(el, html) {
      if (!html) return hideTip();
      tip.innerHTML = html;
      tip.classList.remove('hidden');
      const r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
      const left = Math.max(8, Math.min(r.left + (r.width - w) / 2, innerWidth - w - 8));
      let top = r.top - h - 8;
      if (top < 8) top = Math.min(innerHeight - h - 8, r.bottom + 8);
      tip.style.left = left + 'px';
      tip.style.top = top + 'px';
    }
    function bindTip(el, html) {
      const fn = typeof html === 'function' ? html : () => html;
      el.addEventListener('mouseenter', () => showTip(el, fn()));
      el.addEventListener('mouseleave', hideTip);
      el.addEventListener('focus', () => showTip(el, fn()));
      el.addEventListener('blur', hideTip);
      el.addEventListener('touchstart', () => {
        showTip(el, fn());
        clearTimeout(tipTimer);
        tipTimer = setTimeout(hideTip, 5200);
      }, { passive: true });
    }
    function buildTip(b) {
      const s = HF.buildStats(b), rows = [];
      rows.push(`<b>${HF.BICON[b]} ${HF.BNAME[b]}</b>`);
      rows.push(`Coste: ${costTxt(s.cost)}`);
      const prod = [s.gold ? `${costIcon('gold')}+${s.gold}` : '', s.food ? `${costIcon('food')}+${s.food}` : ''].filter(Boolean).join(' · ');
      if (prod) rows.push(`Produce: ${prod} /turno`);
      if (s.resBonus) rows.push(`Si la casilla tiene recurso: +${s.resBonus} de ese recurso /turno`);
      if (s.def) rows.push(`Defensa de la casilla: 🛡 +${s.def}`);
      if (b === B.CAMINO) rows.push('Red vial: el paso entre construcciones cuesta 0,25 PA. No produce ni defiende.');
      else if (s.road) rows.push('Red vial: conecta la red de caminos (0,25 PA por paso).');
      if (b >= B.CAMPAMENTO) rows.push(`Nivel ${s.level}/5 de asentamiento`);
      return rows.join('<br>');
    }
    function unitTip(type, tier) {
      const D = HF.UNITS[type], t = tier || 1, s = HF.unitStats(g, type, t, 0);
      const k = Math.min(t, 3) - 1, cost = HF.recruitCost(g, g.f[P], type, t), rows = [];
      rows.push(`<b>${D.icon} ${D.name} ${TIER_ROMAN[t - 1] || 'N' + t}</b>`);
      rows.push(`⚔ Ataque <b>${s.atk}</b> · 🛡 Defensa <b>${s.def}</b> · 👣 Movimiento <b>${s.move}</b> PA`);
      rows.push(`🎯 Alcance ${s.atkRange}${s.shoot ? ` · 🏹 Disparo ${s.shoot}` : ''}`);
      rows.push(`Coste: ${costTxt(cost)} · Mantenimiento: ${costIcon('food')}${D.up[k]}${D.upGold[k] ? ` ${costIcon('gold')}${D.upGold[k]}` : ''}/turno`);
      rows.push(`Se recluta en: ${D.from.map(b => HF.BNAME[b]).join(', ')}`);
      if (type === 'INF' || type === 'ENG') rows.push('En colina +1 🛡; en montaña +2 🛡');
      if (type === 'ENG') rows.push('Cruza ríos y montañas sin camino');
      if (type === 'ARC') rows.push(`Desde colina el disparo sube a ${D.shootHill}`);
      if (type === 'CAB') rows.push(`Carga: +${HF.CFG.combat.chargeBonus} ⚔ en llano y en línea recta`);
      if (type === 'SIE') rows.push('Asedia edificios y degrada defensas a distancia');
      if (type === 'BAR') rows.push('Naval: transporta 1 unidad de tierra');
      rows.push('<span class="dim">1 PA = 1 casilla de campo o 4 casillas por red vial continua</span>');
      return rows.join('<br>');
    }

    // ----- cajones -----
    function closeDrawer() { hideTip(); st.drawer = null; q('#drawer').classList.add('hidden'); }
    function drawerRender() {
      const d = q('#drawer'), f = g.f[P];
      if (!st.drawer) { d.classList.add('hidden'); return; }
      d.classList.remove('hidden');
      const cs = c => Object.entries(c).map(([k, v]) => costIcon(k) + v).join(' ');
      const afford = c => HF.affordAny(g, f, c);
      if (st.drawer === 'build') {
        const bs = [B.CAMINO, B.CAMPAMENTO, B.PUEBLO, B.BASTION, B.CIUDAD];
        d.innerHTML = bs.map(b => { const c = HF.buildCost(g, f, b); return `<button data-b="${b}" class="${st.pending && st.pending.item === b ? 'sel' : ''}" style="${afford(c) ? '' : 'opacity:.5'}">${HF.art.html('build', b, HF.BICON[b])} ${HF.BNAME[b]}<small>${cs(c)}</small></button>`; }).join('');
        d.querySelectorAll('button[data-b]').forEach(b => {
          const item = +b.dataset.b;
          bindTip(b, () => buildTip(item));
          b.onclick = () => {
            // En red, las celdas se calculan con la facción local, no con g.cur.
            const keepCur = g.cur; if (g.online) g.cur = P;
            const cells = new Set(HF.buildCells(g, item)), cost = HF.buildCost(g, f, item);
            if (g.online) g.cur = keepCur;
            if (!afford(cost)) { HF.sfx('error'); HF.vibrate(50); return HF.toast('Recursos insuficientes'); }
            if (!cells.size) { HF.sfx('error'); HF.vibrate(50); return HF.toast('Ninguna provincia con casillas válidas puede pagarlo'); }
            clearSel(); st.pending = { kind: 'build', item, cells }; HF.sfx('click');
            info('Toca una casilla verde'); drawerRender(); refresh();
          };
        });
        return;
      }
      // Reclutamiento directo: I / II / III (1x, 2x, 3x coste)
      const pend = st.pending && st.pending.kind === 'unit' ? st.pending : null;
      d.innerHTML = Object.keys(HF.UNITS).map(t => {
        const U = HF.UNITS[t] || {};
        // Una tarjeta con problemas (icono, coste) no puede vaciar el cajón:
        // se pinta igualmente con el emoji y el nombre.
        try {
          const p = pend && pend.item === t ? pend : null, tier = p ? (p.tier || 1) : 1;
          const c = HF.recruitCost(g, f, t, tier);
          return `<div class="ucard"><button data-u="${t}" class="${p ? 'sel' : ''}" style="${afford(c) ? '' : 'opacity:.5'}">${HF.art.html('unit', t, U.icon)} ${U.name}<small>${cs(c)}</small></button>
          <div class="tierpill">${[1, 2, 3].map(k => `<button data-u="${t}" data-tier="${k}" class="${p && (p.tier || 1) === k ? 'sel' : ''}">${['I', 'II', 'III'][k - 1]}</button>`).join('')}</div></div>`;
        } catch (e) {
          console.error('[drawer] no se pudo pintar la unidad ' + t, e);
          return `<div class="ucard"><button data-u="${t}">${U.icon || '❔'} ${U.name || t}</button></div>`;
        }
      }).join('');
      d.querySelectorAll('button[data-u]').forEach(b => {
        const type = b.dataset.u, explicit = !!b.dataset.tier;
        bindTip(b, () => unitTip(type, explicit ? +b.dataset.tier : (pend && pend.item === type ? (pend.tier || 1) : 1)));
        b.onclick = () => {
          let tier = explicit ? +b.dataset.tier : 1;
          if (!explicit) {
            const now = performance.now();
            if (st.lastPick && st.lastPick.type === type && now - st.lastPick.t < 420) tier = Math.min(3, (st.lastPick.tier || 1) + 1);
            st.lastPick = { type, tier, t: now };
          } else st.lastPick = { type, tier, t: performance.now() };
          const cost = HF.recruitCost(g, f, type, tier);
          const keepCur = g.cur; if (g.online) g.cur = P;
          const cells = new Set(HF.recruitCells(g, type, tier));
          if (g.online) g.cur = keepCur;
          if (!afford(cost)) { HF.sfx('error'); HF.vibrate(50); return HF.toast('Recursos insuficientes'); }
          if (!cells.size) { HF.sfx('error'); HF.vibrate(50); return HF.toast('Ninguna provincia con casillas válidas puede pagarlo'); }
          clearSel(); st.pending = { kind: 'unit', item: type, tier, cells }; HF.sfx('click');
          info(`Toca una casilla verde · ${HF.UNITS[type].name} ${['I', 'II', 'III'][tier - 1]}`);
          drawerRender(); refresh();
        };
      });
    }
    function toggleDrawer(k) {
      if (st.drawer === k) { closeDrawer(); st.pending = null; refresh(); return; }
      hideTip(); clearSel(); st.pending = null; st.drawer = k; drawerRender(); refresh();
    }
    q('#bBuild').onclick = () => toggleDrawer('build');
    q('#bRec').onclick = () => toggleDrawer('unit');
    // Modos de vista del mapa: normal -> combate -> político -> recursos.
    // Las cuatro imágenes salen de art2/boton mapa, reclutar, campaña e Historial.
    const VIEWS = [
      { key: 'normal', icon: 'assets/ui/map.webp', name: HF.t('VIEW_NORMAL') },
      { key: 'combat', icon: 'assets/ui/recruit.webp', name: HF.t('VIEW_COMBAT') },
      { key: 'politic', icon: 'assets/ui/campaign.webp', name: HF.t('VIEW_POLITIC') },
      { key: 'resource', icon: 'assets/ui/history.webp', name: HF.t('VIEW_RESOURCE') }
    ];
    const viewHTML = v => `<img class="view-ico" src="${v.icon}" alt="" draggable="false">`;
    let viewIdx = 0;
    q('#bView').onclick = () => {
      viewIdx = (viewIdx + 1) % VIEWS.length;
      const v = VIEWS[viewIdx];
      board.viewMode = v.key;
      q('#bView').innerHTML = `${viewHTML(v)}<small>${v.name}</small>`;
      HF.sfx('click');
      HF.toast(v.key === 'combat' ? (HF.lang() === 'en' ? 'Combat view · tap a unit to see its defense' : 'Vista: Combate · toca una unidad para ver su defensa') : (HF.lang() === 'en' ? 'View: ' : 'Vista: ') + v.name, v.key === 'combat' ? 2600 : 1500);
      if (v.key === 'combat') {
        if (st.sel >= 0) renderInfo(st.sel);
        else info(HF.lang() === 'en' ? '⚔️ Combat · tap a unit to see tier and defense breakdown' : '⚔️ Combate · toca una unidad para ver nivel y desglose de defensa');
      } else if (st.sel < 0) info(goalText(g));
      board.draw();
    };
    q('#bUndo').onclick = () => { if (HF.undo(g)) { HF.sfx('click'); clearSel(); st.pending = null; refresh(); drawerRender(); } };
    q('#bNext').onclick = () => { nextIdleUnit(g); };

    // ----- turnos -----
    function save() {
      if (g.over) return;
      if (HF.replays) HF.replays.flush(g);
      HF.store.atomicSave('savegame_active', HF.serialize(g));
    }
    q('#bEnd').onclick = () => {
      if (st.busy || g.over) return;
      if (g.online) {
        // En red no se cierra el turno local: en simultáneo cada jugador marca
        // "listo"; en turnos individuales se entrega el turno.
        const room = HF.online.room && HF.online.room();
        if (room && room.game_phase === 'TURN_BASED') {
          if (room.active_player !== HF.online.playerId()) { HF.toast(HF.lang() === 'en' ? 'Wait for your turn' : 'Espera tu turno'); return; }
          HF.online.endTurn();
          HF.toast(HF.lang() === 'en' ? 'Turn ended' : 'Turno entregado', 1500);
        } else {
          HF.online.ready();
          HF.toast(HF.lang() === 'en' ? '✅ Ready — waiting for the others' : '✅ Listo — esperando a los demás', 1500);
        }
        return;
      }
      st.busy = true; clearSel(); st.pending = null; closeDrawer(); refresh();
      HF.toast('⏳ Turno de los rivales…', 1500);
      setTimeout(() => {
        try { HF.endTurn(g, HF.aiPlay); } catch (e) { console.error(e); HF.toast('Error de IA: ' + e.message); }
        st.busy = false; pumpEvents();
        if (g.over) { refresh(); return showEnd(); }
        save(); refresh();
        const idle = g.cells.filter(c => c && c.u && c.u.owner === P && HF.ready(c.u)).length;
        info(`Turno ${g.turn} · ${idle} unidades listas · ${goalText(g)}`);
      }, 40);
    };
    const onHide = () => { if (document.visibilityState === 'hidden' && cur && cur.g === g) save(); };
    document.addEventListener('visibilitychange', onHide); G.addEventListener('pagehide', save);
    HF.onLeave = () => {
      if (g._onlineStop) { try { g._onlineStop(); } catch (e) { } g._onlineStop = null; }
      if (g._clockStop) { try { g._clockStop(); } catch (e) { } g._clockStop = null; }
      if (HF.banter) HF.banter.stop();
      HF.bubbleAt = null;
      board.stopAnim(); if (HF.bgm) HF.bgm.stop(); document.removeEventListener('visibilitychange', onHide); G.removeEventListener('pagehide', save); cur = null;
    };
    // Partida en red: sincronización con la sala (anfitrión autoritativo).
    if (g.online && HF.online && HF.online.bind) {
      g._setSeat = seat => { P = seat; };
      g._onlineStop = HF.online.bind(g, refresh);
      console.info('[online] asiento', P + 1, g.online.host ? 'anfitrión' : 'invitado', 'jugador', HF.online.playerId());
      // Reloj del jugador activo (banco de 210 s, +3 s por acción).
      let clockId = 0;
      const tickClock = () => {
        const el = q('#clock'); if (!el) return;
        const room = HF.online.room && HF.online.room();
        if (!room || room.game_phase !== 'TURN_BASED') { el.textContent = ''; return; }
        const act = (room.players_data || []).find(p => p.player_id === room.active_player);
        el.textContent = '⏱' + HF.online.fmtTime(act ? HF.online.timeLeft(room, act.player_id) : null);
      };
      clockId = setInterval(tickClock, 1000); tickClock();
      g._clockStop = () => clearInterval(clockId);
    }

    // ----- menús -----
    // Marcador por tarjetas: identidad, capital, recursos (+neto), ejército y
    // territorio. Cada tarjeta se expande al tocarla para ver el desglose.
    function scoreboard() {
      const stats = g.f.map((f, idx) => Object.assign(HF.factionSummary(g, f), { idx }));
      const maxPower = Math.max(1, ...stats.map(s => s.power));
      const card = s => {
        const f = s.f, mine = s.idx === 0;
        const capTxt = !s.alive ? 'Eliminado' : !s.cap ? 'Sin capital' : s.threat ? 'En peligro' : 'Segura';
        const capCls = !s.alive || !s.cap ? 'bad' : s.threat ? 'warn' : 'safe';
        const net = (v, unit) => `<b>${s.stock[unit]}</b><i class="sc-net ${v >= 0 ? 'pos' : 'neg'}">${fmt(v)}</i>`;
        const tags = [];
        if (!s.alive) tags.push(['bad', '☠ Eliminado']);
        if (s.threat) tags.push(['bad', '🏰 Capital amenazada']);
        if (s.alive && s.netFood < 0) tags.push(['bad', '¡Déficit de trigo!']);
        if (s.alive && s.netGold < 0) tags.push(['warn', '¡Déficit de oro!']);
        const structs = [
          ['🏕️', s.camps], ['🏘️', s.towns], ['🛡️', s.bastions], ['🏙️', s.cities], ['🛤️', s.roads]
        ].filter(x => x[1] > 0).map(x => `<span title="${x[1]}">${x[0]}${x[1]}</span>`).join(' ');
        const detail = Object.keys(HF.UNITS).map(t => s.byType[t] ? `${HF.UNITS[t].icon} ${HF.UNITS[t].name}: <b>${s.byType[t]}</b>` : '').filter(Boolean).join(' · ') || 'Sin tropas';
        return `<div class="score-card ${mine ? 'me' : ''} ${s.alive ? '' : 'dead'}" data-sc="${s.idx}" style="border-left-color:${f.color}">
          <div class="sc-head">${HF.crestHTML(f.crest, 24)}<b>${HF.esc(f.name)}</b>${mine ? '<span class="sc-you">Tú</span>' : ''}<span class="sc-cap ${capCls}">🏰 ${capTxt}</span></div>
          <div class="sc-row"><span>🪙 Oro</span>${net(s.netGold, 'gold')}</div>
          <div class="sc-row"><span>🌾 Trigo</span>${net(s.netFood, 'food')}</div>
          <div class="sc-row"><span>🪵 Madera</span>${net(s.netWood, 'wood')}</div>
          <div class="sc-row"><span>⚔️ Tropas</span><b>${s.units}</b><i class="sc-net dim">${s.units === 1 ? 'activa' : 'activas'}</i></div>
          <div class="sc-row"><span>📉 Mantenimiento</span><b>−${s.pv.upkeepGold + s.loan} oro · −${s.pv.upkeep} trigo</b></div>
          <div class="sc-row"><span>📍 Hexágonos</span><b>${s.cells}</b></div>
          <div class="sc-row"><span class="lbl">${structs || '<span class="dim">Sin estructuras</span>'}</span></div>
          <div class="sc-bar"><i style="width:${Math.round(s.power / maxPower * 100)}%;background:${f.color}"></i></div>
          ${tags.map(t => `<span class="sc-tag ${t[0]}">${t[1]}</span>`).join('')}
          <div class="sc-detail">
            <div><b>Detalle del ejército</b><br>${detail}</div>
            <div style="margin-top:4px"><b>Infraestructura</b><br>🛤️ Caminos ${s.roads} · 🏕️ Campamentos ${s.camps} · 🏘️ Pueblos ${s.towns} · 🛡️ Bastiones ${s.bastions} · 🏙️ Ciudades ${s.cities}</div>
            <div style="margin-top:4px"><b>Capital</b>: ${s.cap ? `${capTxt} (${s.cap.q},${s.cap.r})` : 'sin capital'}${s.loan ? ` · 💳 deuda ${s.loan}/turno` : ''}</div>
          </div>
        </div>`;
      };
      HF.modal(`<div class="score-top"><h3><img class="modal-ico" src="assets/ui/codex.webp" alt="" draggable="false"> Marcador · Turno ${g.turn}</h3><button id="scClose" aria-label="Cerrar">✕</button></div>
        <div class="dim small" style="margin:-4px 0 6px">🎯 ${goalText(g)}${g.online ? ` · 🌐 Asiento ${P + 1} (${g.online.host ? 'anfitrión' : 'invitado'})` : ''}</div>
        <div class="score-grid">${stats.map(card).join('')}</div>
        <div class="dim small" style="margin-top:6px">Toca una tarjeta para ver el desglose completo.</div>`, m => {
        m.querySelector('#scClose').onclick = HF.closeModal;
        m.querySelectorAll('[data-sc]').forEach(el => el.onclick = () => el.classList.toggle('open'));
      });
    }
    q('#board').onclick = scoreboard;
    q('#menu').onclick = () => HF.modal(`<h3>${HF.t('GAME_MENU')}</h3><div class="dim small">🎯 ${goalText(g)}</div><br>
      <div class="grid3" style="grid-template-columns:1fr"><button id="r" class="pri">${HF.t('GAME_CONTINUE')}</button><button id="c">${HF.t('GAME_CENTER')}</button><button id="w">${HF.t('GAME_CODEX')}</button><button id="rp">🎬 Compartir partida</button><button id="s">${HF.t('GAME_SAVE_EXIT')}</button><button id="a">${HF.t('GAME_ABANDON')}</button></div>`, m => {
      m.querySelector('#r').onclick = HF.closeModal;
      m.querySelector('#c').onclick = () => { board.fit(); HF.closeModal(); };
      m.querySelector('#w').onclick = () => HF.codex();
      m.querySelector('#rp').onclick = () => { HF.closeModal(); if (HF.replays) HF.replays.share(g.replayId, g); };
      m.querySelector('#s').onclick = () => { save(); HF.go('hub'); };
      m.querySelector('#a').onclick = () => { if (confirm(HF.lang() === 'en' ? 'Surrender the game? Progress will be lost.' : '¿Abandonar la partida? Se perderá el progreso.')) { HF.store.del('savegame_active'); HF.go('hub'); } };
    });

    function showEnd() {
      HF.store.del('savegame_active');
      if (HF.replays) HF.replays.finish(g);
      if (HF.bgm) HF.bgm.stop();
      const res = HF.recordResult(g) || {};
      const won = g.over.won;
      HF.sfx(won ? 'win' : 'lose');
      const s = g.stat, m = g.meta || {};
      const me = g.f[P];
      const surplus = (me.gold || 0) + (me.food || 0) + (me.wood || 0);
      const score = HF.calculateScore(g);
      const mapKey = HF.cloud && HF.cloud.getMapKey ? HF.cloud.getMapKey(g) : 'local';
      // Envío en segundo plano: el jugador ve el resultado sin esperar a la red.
      let mapScoreSent = null;
      if (HF.cloud && HF.cloud.submitMapScore && !g._mapScoreSent) {
        g._mapScoreSent = true;
        mapScoreSent = HF.cloud.submitMapScore({
          map_key: mapKey,
          player_id: HF.cloud.playerId(),
          tribe_name: me.name || (HF.genTribeName ? HF.genTribeName() : 'Mi Tribu'),
          crest: HF.normalizeCrest(me.crest),
          color_hex: me.color || '#3b82f6',
          turns: g.turn,
          score: score,
          surplus: surplus,
          won: !!won
        }).then(r => {
          // Guardar la repetición de la mejor marca para que el Top se pueda ver.
          if (won && r && r.ok && !r.skipped && HF.replays && HF.replays.saveCode && HF.cloud.submitReplayCode) {
            HF.replays.saveCode(g).then(code => {
              if (code && code.length <= 60000) return HF.cloud.submitReplayCode(mapKey, HF.cloud.playerId(), code);
            }).catch(() => { });
          }
          return r;
        }).catch(() => null);
      }
      let extra = '';
      if (g.mode === 'campaign' && won) {
        extra = `<div class="stars" style="font-size:28px;text-align:center">${'★'.repeat(res.stars)}${'☆'.repeat(3 - res.stars)}</div>
        <div class="small">★ Victoria<br>${g.turn <= m.par ? '★' : '☆'} En ≤ ${m.par} turnos<br>${res.stars === 3 || (res.stars === 2 && g.turn > m.par) ? '★' : '☆'} ${HF.CHTXT[m.challenge]}</div>`;
      }
      if (g.mode === 'daily') extra = `<div style="text-align:center;font-size:20px">${res.official ? (won ? 'Resultado oficial ' + HF.medal(g.turn) : 'Intento oficial fallido') : 'Práctica (no cuenta)'}</div>`;
      const kd = s.lost ? (s.kills / s.lost).toFixed(2) : (s.kills ? '∞' : '0.00');
      HF.modal(`<h2 style="text-align:center">${won ? '🏆 ¡Victoria!' : '💀 Derrota'}</h2><div style="text-align:center" class="dim">${HF.esc(g.over.reason)} · Turno ${g.turn}</div>${extra}
        <div class="kpis">
          <div class="kpi"><span>⚔️</span><b>${kd}</b><small>Eficiencia militar</small><em>${s.kills} bajas / ${s.lost} pérdidas</em></div>
          <div class="kpi"><span>🔗</span><b>${s.cuts}</b><small>Asfixia logística</small><em>hexágonos aislados</em></div>
          <div class="kpi"><span><img class="res-kpi" src="assets/ui/wheat.webp" alt=""></span><b>${surplus}</b><small>Superávit</small><em>${costIcon('gold')}${me.gold} · ${costIcon('food')}${me.food} · ${costIcon('wood')}${me.wood}</em></div>
        </div>
        <canvas class="chart" id="ch"></canvas>
        <div class="chart-legend">${g.f.map(f => `<span><i style="background:${f.color}"></i>${HF.esc(f.name)}</span>`).join('')}</div>
        <div class="card" style="margin-top:8px">
          <div class="row"><b>🏆 Récords del Mapa</b><span class="dim small">Tu puntuación: <b style="color:var(--acc)">${score.toLocaleString()} pts</b><span id="myRank"></span></span></div>
          <div id="mapLB" class="dim small" style="margin-top:6px">Cargando clasificación mundial…</div>
        </div>
        <div class="dim small" style="text-align:center">Conquistadas ${s.captured} · Edificios ${s.built} · Deserciones ${s.deserts}</div><br>
        <button id="btnShareReplay" class="pri" style="width:100%;margin-bottom:6px">🎬 Compartir Repetición</button>
        <div class="row"><button id="menu2" class="grow">Menú</button>${g.mode === 'campaign' && won && m.idx < 29 ? '<button id="nx" class="pri grow">Siguiente ▶</button>' : '<button id="again" class="pri grow">Repetir</button>'}</div>`, mm => {
        chart(mm.querySelector('#ch'));
        // Top del mapa: se carga después del envío para que incluya la marca
        // recién registrada; el modal ya es usable mientras tanto.
        const loadLeaderboard = () => {
          HF.cloud.getMapLeaderboard(mapKey).then(rows => {
            const box = mm.querySelector('#mapLB');
            if (!box || !mm.isConnected) return;
            if (!rows || !rows.length) {
              box.innerHTML = (HF.cloud.lastOffline && HF.cloud.lastOffline())
                ? '<div class="dim small">Sin conexión para cargar el ranking.</div>'
                : '<div class="dim small">¡Eres el primero en registrar una puntuación en este mapa!</div>';
              return;
            }
            const myId = HF.cloud.playerId();
            box.innerHTML = `<table style="width:100%;font-size:12px">
              <tr><th>#</th><th>Tribu</th><th>Turnos</th><th>Puntos</th><th></th></tr>
              ${rows.map((r, i) => {
                const isMe = r.player_id === myId;
                return `<tr style="${isMe ? 'color:var(--acc);font-weight:bold' : ''}">
                  <td>${i + 1}</td>
                  <td>${HF.crestHTML(r.crest, 22)} ${HF.esc(r.tribe_name || '—')}</td>
                  <td>T${+r.turns || 0}</td>
                  <td>${(+r.score || 0).toLocaleString()}</td>
                  <td>${r.won ? `<button data-rp="${i}" title="Ver repetición" style="min-height:26px;padding:2px 7px;font-size:11px">▶</button>` : ''}</td>
                </tr>`;
              }).join('')}
            </table>`;
            box.querySelectorAll('[data-rp]').forEach(b => b.onclick = () => {
              const r = rows[+b.dataset.rp];
              if (r) HF.playCloudReplay(mapKey, r.player_id);
            });
          }).catch(() => {
            const box = mm.querySelector('#mapLB');
            if (box) box.innerHTML = '<div class="dim small">Sin conexión para cargar el ranking.</div>';
          });
        };
        const afterSend = () => {
          // Puesto del jugador (también se guarda en el historial local).
          if (HF.cloud && HF.cloud.getMapRank) {
            HF.cloud.getMapRank(mapKey, HF.cloud.playerId()).then(rank => {
              if (!rank) return;
              const rk = mm.querySelector('#myRank');
              if (rk) rk.textContent = ' · Puesto #' + rank;
              if (g.replayId && HF.replays && HF.replays.setRank) HF.replays.setRank(g.replayId, rank);
            }).catch(() => { });
          }
          loadLeaderboard();
        };
        const lbBox = mm.querySelector('#mapLB');
        if (lbBox) {
          if (!HF.cloud || !HF.cloud.getMapLeaderboard || !HF.cloud.online) {
            lbBox.innerHTML = '<div class="dim small">Modo sin conexión · sin ranking mundial.</div>';
          } else if (mapScoreSent) {
            mapScoreSent.then(afterSend, afterSend);
          } else afterSend();
        }

        mm.querySelector('#menu2').onclick = () => HF.go(g.mode === 'campaign' ? 'campaign' : 'hub');
        const nx = mm.querySelector('#nx'), ag = mm.querySelector('#again');
        if (nx) nx.onclick = () => HF.startGame(HF.makeGame(HF.campaign[m.idx + 1], HF.loadTribe()));
        if (ag) ag.onclick = () => HF.go(g.mode === 'campaign' ? 'campaign' : g.mode === 'daily' ? 'daily' : 'newgame');
        const sh = mm.querySelector('#btnShareReplay');
        if (sh) sh.onclick = async () => {
          sh.disabled = true;
          HF.toast('Generando enlace de repetición…', 1200);
          let code;
          try { code = await HF.encodeReplay(HF.replayPayload(g)); }
          catch (e) { console.error(e); sh.disabled = false; return HF.toast('No se pudo generar la repetición'); }
          const url = location.href.split('#')[0] + '#replay=' + code;
          const host = location.hostname;
          const local = location.protocol === 'file:' || !host || host === 'localhost' || host === '127.0.0.1' ||
            /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
          const show = why => HF.modal(`<h3>🎬 Repetición de la partida</h3>
            ${why ? `<p class="neg small">${why}</p>` : ''}
            <div class="dim small">Enlace</div><textarea readonly id="repUrl" style="min-height:80px">${HF.esc(url)}</textarea>
            <div class="dim small">Código (pégalo en 🎬 desde el Hub)</div><textarea readonly id="repCode" style="min-height:64px">${HF.esc(code)}</textarea>
            <div class="row"><button id="cpUrl">Copiar enlace</button><button id="cpCode" class="pri grow">Copiar código</button><button id="x">Cerrar</button></div>`, m2 => {
            const copy = (txt, msg) => {
              const done = () => HF.toast(msg, 2600);
              try { navigator.clipboard.writeText(txt).then(done).catch(() => { m2.querySelector('#repCode').select(); }); }
              catch (e) { m2.querySelector('#repCode').select(); }
            };
            m2.querySelector('#cpUrl').onclick = () => copy(url, 'Enlace copiado');
            m2.querySelector('#cpCode').onclick = () => copy(code, 'Código copiado');
            m2.querySelector('#x').onclick = HF.closeModal;
          });
          if (local) { sh.disabled = false; return show('Este enlace apunta a un archivo o servidor local: en otro teléfono no abrirá. Comparte el código y usa el botón 🎬 del Hub, o publica el juego en una URL accesible.'); }
          if (url.length > 1800) { sh.disabled = false; return show('El enlace es largo; algunos navegadores móviles lo truncan. Comparte el código si el enlace falla.'); }
          const ok = () => HF.toast('¡Enlace de repetición copiado al portapapeles!', 2800);
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok).catch(() => show('No se pudo copiar automáticamente. Copia el enlace o el código.'));
            else show('Copia el enlace o el código para compartir.');
          } catch (e) { show('Copia el enlace o el código para compartir.'); }
          sh.disabled = false;
        };
      });
    }
    function chart(cv) {
      const w = Math.max(260, cv.clientWidth || 320), h = 210, d = Math.min(2, G.devicePixelRatio || 1);
      cv.width = w * d; cv.height = h * d; cv.style.height = h + 'px';
      const x = cv.getContext('2d');
      x.setTransform(d, 0, 0, d, 0, 0);
      const tl = g.timeline, land = Math.max(1, g.cells.filter(c => c && c.t !== HF.T.MAR).length);
      const padL = 34, padR = 8, padT = 16, padB = 18, base = h - padB, top = padT;
      const bg = x.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#10243f'); bg.addColorStop(1, '#0a1424');
      x.fillStyle = bg; x.fillRect(0, 0, w, h);
      // cuadrícula de referencia
      x.font = '600 9px "Plus Jakarta Sans", sans-serif'; x.textBaseline = 'middle'; x.textAlign = 'right';
      for (const p of [0, 25, 50, 75, 100]) {
        const py = base - (base - top) * p / 100;
        x.strokeStyle = 'rgba(138,160,200,.14)'; x.lineWidth = 1;
        x.beginPath(); x.moveTo(padL, py); x.lineTo(w - padR, py); x.stroke();
        x.fillStyle = '#8aa0c8'; x.fillText(p + '%', padL - 4, py);
      }
      const tmax = tl.length > 1 ? tl[tl.length - 1].t : 1;
      x.textAlign = 'center'; x.textBaseline = 'top';
      for (let i = 0; i < 5; i++) {
        const px = padL + (w - padL - padR) * i / 4;
        x.strokeStyle = 'rgba(138,160,200,.08)';
        x.beginPath(); x.moveTo(px, top); x.lineTo(px, base); x.stroke();
        x.fillStyle = '#8aa0c8'; x.fillText('T' + Math.round(1 + (tmax - 1) * i / 4), px, base + 4);
      }
      x.fillStyle = '#8aa0c8'; x.font = '600 10px "Plus Jakarta Sans", sans-serif'; x.textAlign = 'left'; x.textBaseline = 'top';
      x.fillText('Territorio por turno', padL, 2);
      x.lineJoin = 'round'; x.lineCap = 'round';
      g.f.forEach((f, k) => {
        if (!tl.length) return;
        const pts = tl.map((t, i) => ({
          x: padL + (w - padL - padR) * (tl.length > 1 ? i / (tl.length - 1) : 0),
          y: base - (base - top) * Math.min(1, (t.terr[k] || 0) / land)
        }));
        // área translúcida bajo la curva
        x.beginPath(); x.moveTo(pts[0].x, base); x.lineTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i];
          x.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
        }
        const last = pts[pts.length - 1];
        x.lineTo(last.x, last.y); x.lineTo(last.x, base); x.closePath();
        x.fillStyle = f.color; x.globalAlpha = .25; x.fill(); x.globalAlpha = 1;
        // línea suavizada
        x.beginPath(); x.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i];
          x.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
        }
        x.lineTo(last.x, last.y);
        x.strokeStyle = f.color; x.lineWidth = 2; x.stroke();
        // hito de eliminación de un rival
        if (k > 0) {
          let elim = -1;
          for (let i = 1; i < tl.length; i++) if ((tl[i].terr[k] || 0) === 0 && (tl[i - 1].terr[k] || 0) > 0) { elim = i; break; }
          if (elim >= 0) {
            const p = pts[elim];
            x.beginPath(); x.arc(p.x, p.y, 3, 0, Math.PI * 2); x.fillStyle = f.color; x.fill();
            x.font = '11px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'bottom';
            x.fillText('💀', p.x, p.y - 3);
            x.textAlign = 'left'; x.textBaseline = 'top'; x.font = '600 10px "Plus Jakarta Sans", sans-serif';
          }
        }
      });
    }

    refresh();
    board.startView();
    // Prólogo cinematográfico: solo la primera vez (configurable en Ajustes).
    if (HF.introCrawl) HF.introCrawl(g);
    if (g.turn === 1 && g.mode !== 'skirmish' || g.mode === 'daily') {
      const m = g.meta || {};
      HF.modal(`<h3>${HF.esc(m.name || 'Desafío')}</h3><p>${goalText(g)}</p>${m.par ? `<div class="dim small">★ en ≤ ${m.par} turnos · ★ ${HF.CHTXT[m.challenge]}</div>` : ''}<br><button class="pri" id="x" style="width:100%">¡Vamos!</button>`, mm => mm.querySelector('#x').onclick = HF.closeModal);
    }
    const capi = g.cells.findIndex(c => c && c.o === P && c.cap);
    if (capi >= 0) board.centerOn(capi);
    info(`${goalText(g)}`);
    if (g.over) showEnd();
  };
})(window);
