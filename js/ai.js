(function (G) {
  const HF = G.HF, B = HF.B, T = HF.T;
  const has = HF.hasTag;

  function distField(g, me) {
    const gr = g._grid, df = new Int16Array(g.cells.length).fill(999), q = [];
    for (const d of gr.list) {
      const c = g.cells[d.i];
      if ((c.o >= 0 && c.o !== me && c.b === B.CIUDAD) || (c.o === -1 && c.b === B.PUEBLO)) { df[c.i] = 0; q.push(c.i); }
    }
    if (!q.length) for (const d of gr.list) { const c = g.cells[d.i]; if (c.o !== me && c.o >= 0) { df[c.i] = 0; q.push(c.i); } }
    for (let h = 0; h < q.length; h++) {
      const x = q[h];
      for (const y of gr.nb[x]) {
        const n = g.cells[y];
        if (df[y] !== 999 || n.t === T.MAR) continue;
        df[y] = df[x] + 1; q.push(y);
      }
    }
    return df;
  }

  function scoreAtk(g, me, o, to, hard) {
    const t = g.cells[to];
    let s = 10;
    if (t.u) s += 25 + t.u.tier * 5;
    if (t.o >= 0) s += 8;
    if (t.b === B.CIUDAD) s += t.o >= 0 ? 100 : 40;
    else if (t.b === B.PUEBLO || t.b === B.BASTION) s += 30;
    else if (t.b === B.CAMPAMENTO) s += 15;
    if (t.res) s += 6;
    if (t.o >= 0 && t.sup && hard) s += 20;
    return s;
  }

  // ---------- transporte naval ----------
  const isW = c => c.t === T.MAR || c.t === T.RIO;
  function landComps(g) {
    const gr = g._grid, comp = new Int16Array(g.cells.length).fill(-1);
    let n = 0;
    for (const d of gr.list) {
      if (comp[d.i] >= 0 || g.cells[d.i].t === T.MAR) continue;
      const q = [d.i]; comp[d.i] = n;
      while (q.length) { const x = q.pop(); for (const y of gr.nb[x]) if (comp[y] < 0 && g.cells[y].t !== T.MAR) { comp[y] = n; q.push(y); } }
      n++;
    }
    return comp;
  }
  // Distancia por agua hasta una costa útil; null si no hay objetivos.
  // Una masa de tierra sigue siendo objetivo mientras conserve casillas
  // enemigas, aunque la IA ya tenga presencia en ella (refuerzos y asedio).
  function waterField(g, me, type) {
    const gr = g._grid, comp = landComps(g), hostileMass = new Set();
    for (const c of g.cells) if (c && comp[c.i] >= 0 && c.o >= 0 && c.o !== me) hostileMass.add(comp[c.i]);
    const wf = new Int16Array(g.cells.length).fill(999), q = [];
    for (const d of gr.list) {
      const c = g.cells[d.i];
      if (!isW(c)) continue;
      const useful = gr.nb[c.i].some(j => {
        const n = g.cells[j];
        if (isW(n)) return false;
        const target = n.o !== me || hostileMass.has(comp[j]);
        // un bosque costero es desembarcable: la unidad entra talando
        return target && (n.b === B.ARBOL || HF.canStep({ type }, n));
      });
      if (useful) { wf[c.i] = 0; q.push(c.i); }
    }
    if (!q.length) return null;
    for (let h = 0; h < q.length; h++) {
      const x = q[h];
      for (const y of gr.nb[x]) if (wf[y] === 999 && isW(g.cells[y])) { wf[y] = wf[x] + 1; q.push(y); }
    }
    return wf;
  }

  // Primer paso de una ruta por agua que rodea barcos ocupados hasta una
  // casilla de costa objetivo (wf === 0). Devuelve null si no hay ruta.
  function navStep(g, from, wf) {
    const gr = g._grid, prev = new Map([[from, -1]]), q = [from];
    for (let h = 0; h < q.length; h++) {
      const x = q[h];
      if (x !== from && wf[x] === 0) {
        let cur = x;
        while (prev.get(cur) !== from) {
          const p = prev.get(cur);
          if (p == null || p < 0) return null;
          cur = p;
        }
        return cur;
      }
      for (const y of gr.nb[x]) {
        if (prev.has(y)) continue;
        const n = g.cells[y];
        if (!isW(n) || n.u) continue;   // otro barco (o tierra) bloquea el paso
        prev.set(y, x); q.push(y);
      }
    }
    return null;
  }
  HF.waterField = waterField;   // expuesto para depuración y pruebas de la IA naval
  HF.navStep = navStep;

  function playShips(g, me, df) {
    const hard = g.difficulty === 'hard', gr = g._grid;
    for (const sc of g.cells.filter(c => c && c.u && c.u.owner === me && c.u.type === 'BAR')) {
      let ci = sc.i;
      for (let step = 0; step < 4; step++) {
        const u = g.cells[ci].u;
        if (!u || u.type !== 'BAR' || !HF.ready(u)) break;
        const wf = waterField(g, me, u.cargo ? u.cargo.type : 'CAB');
        const opts = HF.options(g, ci);
        // combate, desembarco (con o sin ataque) o disparo
        let best = null, bs = 0;
        for (const [to, o] of opts) {
          let s = 0;
          if (o.ship) {
            // desembarcos desde el barco: ataque, tala o playa segura
            if (o.k === 'atk' && o.ok) s = scoreAtk(g, me, o, to, hard) + 20;
            else if (o.k === 'chop') s = 35;
            else if (o.k === 'move') s = 30;
          } else if (o.k === 'atk' && o.ok) s = scoreAtk(g, me, o, to, hard);
          else if (o.k === 'shoot') s = 14 + (g.cells[to].u ? g.cells[to].u.tier * 2 : 0);
          if (s > bs) { bs = s; best = to; }
        }
        if (best != null) {
          const o = opts.get(best);
          if (!HF.act(g, ci, best).ok) break;
          if (o.k === 'atk' && !o.ship) ci = best;
          continue;
        }
        if (!wf) break;
        if (u.cargo) {
          // navegar hacia la costa objetivo
          if (u.mv <= 0) break;
          let mv = null, mw = wf[ci];
          for (const [to, o] of opts) if (o.k === 'move' && !o.ship && wf[to] < mw) { mw = wf[to]; mv = to; }
          // si el descenso directo está bloqueado, rodear por otra ruta de agua
          if (mv == null) {
            const alt = navStep(g, ci, wf), oa = alt != null ? opts.get(alt) : null;
            if (oa && oa.k === 'move' && !oa.ship) mv = alt;
          }
          if (mv == null || !HF.act(g, ci, mv).ok) break;
          ci = mv;
          continue;
        }
        // barco vacío: recoger a una unidad de tierra ociosa junto a una casilla de agua alcanzable
        if (!HF.CFG.shipCarry) break;
        let pick = null, ps = -1e9;
        for (const c of g.cells) {
          if (!c || !c.u || c.u.owner !== me || c.u.type === 'BAR' || c.u.mv <= 0 || c.u.cargo) continue;
          for (const y of gr.nb[c.i]) {
            if (!isW(g.cells[y]) || wf[y] >= 999) continue;
            const o = opts.get(y);
            if (y !== ci && !(u.mv > 0 && o && o.k === 'move')) continue;
            const s = ({ CAB: 3, INF: 2 }[c.u.type] || 1) + c.u.tier - wf[y] * .05;
            if (s > ps) { ps = s; pick = { from: c.i, to: y }; }
          }
        }
        if (!pick) break;
        if (pick.to !== ci) { if (!HF.act(g, ci, pick.to).ok) break; ci = pick.to; }
        HF.act(g, pick.from, ci);
        break;
      }
    }
  }

  function playUnits(g, me, df) {
    const f = g.f[me], hard = g.difficulty === 'hard', easy = g.difficulty === 'easy';
    for (let round = 0; round < 4; round++) {
      let acted = false;
      const mine = g.cells.filter(c => c && c.u && c.u.owner === me && c.u.type !== 'BAR' && HF.ready(c.u));
      for (const c of mine) {
        if (!c.u || c.u.owner !== me || !HF.ready(c.u)) continue;
        const opts = HF.options(g, c.i);
        let best = null, bs = -1e9;
        for (const [to, o] of opts) {
          let s;
          if (o.k === 'atk') { if (!o.ok) continue; s = scoreAtk(g, me, o, to, hard) + (easy ? -5 : 0); }
          else if (o.k === 'shoot') s = 14 + g.cells[to].u.tier * 2;
          else if (o.k === 'siege') s = 40 + (g.cells[to].b === B.CIUDAD ? 40 : 0);
          else if (o.k === 'chop') s = f.wood < 40 ? 12 + (f.wood < 15 ? 30 : 0) : -50;
          else if (o.k === 'fuse') s = (g.cells[to].u.tier + c.u.tier <= 3 && df[c.i] > 3) ? 4 : -100;
          else if (o.k === 'move') {
            if (c.u.type === 'ARC' || c.u.type === 'SIE') s = (df[c.i] - df[to]) * 2 - (df[to] <= 2 ? 6 : 0);
            else s = (df[c.i] - df[to]) * 2 + (to !== c.i ? 0 : -1);
            if (df[to] >= df[c.i]) s = -20;
          }
          if (s > bs) { bs = s; best = to; }
        }
        if (best == null || bs < 1) continue;
        const r = HF.act(g, c.i, best);
        if (r.ok) acted = true;
      }
      if (!acted) break;
    }
  }

  function frontierDist(g, ci, df) { return df[ci]; }

  function macro(g, me) {
    const f = g.f[me];
    for (const [b, from] of [[B.CIUDAD, B.PUEBLO], [B.PUEBLO, B.CAMPAMENTO]]) {
      const cs = HF.buildCells(g, b).filter(ci => g.cells[ci].b === from);
      for (const ci of cs) { if (HF.build(g, b, ci).ok) break; }
    }
    // campamentos para expandir
    const cost = HF.buildCost(g, f, B.CAMPAMENTO);
    if (f.wood >= cost.wood + 5 && g.cells.filter(c => c && c.o === me && HF.isSettle(c.b)).length < HF.CFG.ai.settlementsBase + Math.floor(g.turn / HF.CFG.ai.settlementsPerTurns)) {
      const cs = HF.buildCells(g, B.CAMPAMENTO);
      let best = -1, bs = -1;
      for (const ci of cs) {
        const c = g.cells[ci];
        let s = 0;
        for (const d of g._grid.list) { const x = g.cells[d.i]; if (HF.hexDist(c, x) <= 1 && x.res) s += 2; if (HF.hexDist(c, x) <= 3 && x.o !== me && x.t !== T.MAR) s += .3; }
        const mins = Math.min(...g.cells.filter(x => x && x.o === me && HF.isSettle(x.b)).map(x => HF.hexDist(c, x)));
        if (mins >= 3) s += 3;
        if (s > bs) { bs = s; best = ci; }
      }
      if (best >= 0 && bs >= 3) HF.build(g, B.CAMPAMENTO, best);
    }
  }

  function recruit(g, me, df) {
    const f = g.f[me], easy = g.difficulty === 'easy';
    const maxN = easy ? HF.CFG.ai.recruitPerTurnEasy : HF.CFG.ai.recruitPerTurn;
    let n = 0;
    const army = () => g.cells.filter(c => c && c.u && c.u.owner === me).length;
    while (n < maxN) {
      const wantTypes = ['INF'];
      if (has(f, 'TACTIC_MOBILE_WAR') || has(f, 'CIV_TYPE_NOMAD')) wantTypes.unshift('CAB');
      const A = HF.CFG.ai;
      if (g.turn > A.archerFromTurn && army() % A.archerEvery === A.archerEvery - 1) wantTypes.unshift('ARC');
      if (g.turn > A.siegeFromTurn && army() % A.siegeEvery === A.siegeEvery - 1) wantTypes.unshift('SIE');
      let wfShip = null;
      if (g.turn >= A.shipFromTurn && g.cells.filter(c => c && c.u && c.u.owner === me && c.u.type === 'BAR').length < (easy ? 1 : A.maxShips)) {
        wfShip = waterField(g, me, 'CAB');
        if (wfShip) wantTypes.unshift('BAR');
      }
      let done = false;
      for (const type of wantTypes) {
        const scan = HF.recruitScan(g, type);
        const cells = Array.from(scan.keys());
        if (!cells.length) continue;
        if (type === 'BAR') { cells.sort((a, b) => wfShip[a] - wfShip[b]); if (wfShip[cells[0]] >= 999) continue; }
        else cells.sort((a, b) => df[a] - df[b]);
        // la provincia que paga debe aguantar el mantenimiento de la nueva unidad
        const D = HF.UNITS[type];
        for (const ci of cells) {
          const k = scan.get(ci).find(p => {
            const pv = HF.preview(g, f, p), st = HF.stockFor(g, f, p);
            return pv.netFood - D.up[0] >= (st.food > HF.CFG.ai.foodReserve ? -3 : 0) && pv.netGold - D.upGold[0] >= (st.gold > 40 ? -3 : 0);
          });
          if (k === undefined) continue;
          if (HF.recruit(g, type, ci, k).ok) { done = true; n++; }
          break;
        }
        if (done) break;
      }
      if (!done) break;
    }
  }

  HF.aiPlay = function (g, me) {
    const df = distField(g, me);
    playUnits(g, me, df);
    macro(g, me);
    recruit(g, me, df);
    playUnits(g, me, df);
    playShips(g, me, df);
  };
})(typeof window !== 'undefined' ? window : globalThis);
