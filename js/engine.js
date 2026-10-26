(function (G) {
  const HF = G.HF, T = HF.T, B = HF.B;
  const SETTLE = { 3: 1, 4: 1, 5: 1, 6: 1 };
  const isSettle = b => !!SETTLE[b];
  HF.isSettle = isSettle;
  const passableT = c => c.t !== T.MAR;
  // f es opcional: la IA y el generador consultan el terreno sin conocer la facción.
  const canStep = (u, c, f) => {
    if (c.fire > 0) return false;                 // PHOSPHORUS_FIRE: la casilla arde y es intransitable
    if (u.type === 'BAR') return isWater(c);
    // CIV_TYPE_THALASSOCRACY: las tropas de tierra se hacen a la mar sin puerto (los ríos ya eran transitables)
    if (c.t === T.MAR) return !!(f && has(f, 'CIV_TYPE_THALASSOCRACY'));
    if (!passableT(c)) return false;
    // SCOUT_NETWORK: la infantería cruza la montaña como terreno normal
    if (c.t === T.MONTANA) return isRoad(c) || (u.type === 'INF' && !!f && has(f, 'SCOUT_NETWORK')) || (HF.CFG.mountainUnits || ['INF', 'ARC']).indexOf(u.type) >= 0;
    return true;
  };
  // camino y todo edificio superior: sin penalización de terreno y transitable por cualquier unidad de tierra
  const isRoad = c => c.b >= B.CAMINO;
  const isWater = c => c.t === T.MAR || c.t === T.RIO;
  HF.canStep = canStep;
  const BUILDABLE_LAND = c => c.t === T.LLANO || c.t === T.COLINA || c.t === T.MONTANA;
  const readyU = u => u.mv > 0 || u.at > 0 || !!(u.cargo && u.cargo.mv > 0);
  HF.ready = readyU;

  HF.hasTag = (f, tag) => f.tags.indexOf(tag) >= 0;
  const has = HF.hasTag;
  // Estaciones globales: 0 primavera, 1 verano, 2 otoño, 3 invierno.
  const SEASONS = ['Primavera', 'Verano', 'Otoño', 'Invierno'];
  const seasonOf = g => Math.floor((g.turn - 1) / (HF.CFG.seasons.length || 6)) % 4;
  HF.season = seasonOf;
  HF.SEASONS = SEASONS;
  HF.seasonName = i => SEASONS[i] || SEASONS[0];
  const chopWood = f => has(f, 'EXTRACTIVE_ENCLAVE') ? HF.CFG.chopWoodEnclave : HF.CFG.chopWood;
  const grid = g => g._grid || (g._grid = HF.makeGrid(g.R));
  HF.nbs = (g, i) => grid(g).nb[i];
  const rnd = g => g._rng || (g._rng = HF.rng(g.rs || 1));
  const save_rs = g => { if (g._rng) g.rs = g._rng.get(); };
  HF.rnd = rnd;

  function ev(g, i, txt, kind) { g.events.push({ i, txt, kind: kind || 'info', turn: g.turn }); if (g.events.length > 60) g.events.shift(); }

  // ---------- creación ----------
  HF.newGame = function (o) {
    const nF = o.factions.length;
    const g = {
      v: 1, mode: o.mode || 'skirmish', seed: o.seed >>> 0, R: o.R, biome: o.biome, fog: o.fog || 'FULL', difficulty: o.difficulty || 'normal',
      turn: 1, cur: 0, over: null, goal: o.goal || { type: 'conquer' }, meta: o.meta || {}, rs: (o.seed * 7 + 13) >>> 0,
      f: [], cells: null, fogMap: null, timeline: [], events: [], undo: [],
      stat: { kills: 0, lost: 0, cuts: 0, deserts: 0, isolatedEver: false, built: 0, captured: 0, recruited: 0 }
    };
    let caps;
    if (o.customCells) {
      const gr = grid(g);
      g.cells = gr.cells.map(c => c ? HF.newCell(c) : null);
      for (const d of o.customCells) Object.assign(g.cells[d.i], d);
      caps = [];
      for (const c of gr.list) { const cc = g.cells[c.i]; if (cc.cap && cc.o >= 0) caps[cc.o] = cc.i; }
    } else {
      const m = HF.generateMap({ R: o.R, seed: o.seed, biome: o.biome, factions: nF });
      g.cells = m.cells; caps = m.caps; g._grid = m.grid;
    }
    const sr = o.startRes || HF.CFG.start;
    o.factions.forEach((fo, k) => {
      const t = { alma_path: fo.alma_path, arma_path: fo.arma_path, victoria_path: fo.victoria_path };
      HF.compileTribe(t);
      g.f.push({
        id: k, name: fo.name, color: fo.color, crest: fo.crest, human: !!fo.human, tags: t.active_rules,
        gold: sr.gold, food: sr.food, wood: sr.wood, alive: true, grace: 0, wonderTurns: 0, wonderCell: -1,
        starvationsInduced: 0, goodStreak: 0, deficit: false, loan: null
      });
    });
    if (!o.customCells || o.giveUnits) {
      caps.forEach((ci, k) => {
        if (ci == null) return;
        const n = HF.nbs(g, ci).map(j => g.cells[j]).find(c => passableT(c) && !c.u && c.o === k);
        if (n) n.u = { type: 'INF', tier: 1, owner: k, mv: 1, at: 1 };
      });
    }
    if (o.setup) o.setup(g);
    HF.supply(g);
    HF.initStock(g);
    HF.updateFog(g);
    HF.recordTimeline(g);
    save_rs(g);
    return g;
  };

  // ---------- suministro ----------
  HF.supply = function (g) {
    const cells = g.cells, gr = grid(g), seen = new Set(), infos = [];
    let cuts = 0;
    g._trade = null;   // un cambio de suministro/provincia puede alterar las rutas comerciales
    for (const c0 of gr.list) {
      const c = cells[c0.i];
      if (c.o < 0 || seen.has(c.i)) { if (c.o < 0) { c.sup = 0; c.comp = -1; } continue; }
      const comp = [], q = [c.i]; seen.add(c.i);
      while (q.length) {
        const x = q.pop(); comp.push(cells[x]);
        for (const y of gr.nb[x]) if (!seen.has(y) && cells[y].o === c.o) { seen.add(y); q.push(y); }
      }
      let best = null;
      // una provincia empacada (noCamp) no recibe un campamento gratuito al recalcularse
      if (g.supInit && comp.length >= HF.CFG.isolatedCampMin && !comp.some(x => isSettle(x.b)) && !comp.some(x => x.noCamp)) {
        const inComp = new Set(comp.map(x => x.i));
        let spot = null, sv = -1;
        for (const x of comp) {
          if (x.b > B.ARBOL || x.t === T.RIO || x.t === T.MAR || x.burn > 0 || x.fire > 0) continue;
          const v = gr.nb[x.i].filter(j => inComp.has(j)).length + (x.t === T.MONTANA ? -2 : 0);
          if (v > sv) { sv = v; spot = x; }
        }
        if (spot) {
          spot.b = B.CAMPAMENTO;
          if (c.o === 0) ev(g, spot.i, 'Territorio aislado: nuevo campamento y provincia', 'good');
        }
      }
      for (const x of comp) if (isSettle(x.b) && (!best || HF.RANK[x.b] > HF.RANK[best.b] || (HF.RANK[x.b] === HF.RANK[best.b] && x.cap && !best.cap))) best = x;
      if (best) for (const x of comp) x.noCamp = 0;   // al integrarse en una provincia, el marcador caduca
      const prevCap = comp.find(x => x.cap && isSettle(x.b));
      if (prevCap && best && HF.RANK[prevCap.b] === HF.RANK[best.b]) best = prevCap;
      const olds = comp.map(x => x.comp);
      for (const x of comp) {
        const was = x.sup;
        x.sup = best ? 1 : 0; x.cap = (x === best) ? 1 : 0; x.comp = comp[0].i;
        if (was === 1 && !x.sup && g.supInit) { cuts++; if (x.o === 0) { g.stat.isolatedEver = true; } }
      }
      infos.push({ o: c.o, id: comp[0].i, olds, sup: !!best });
    }
    g.supInit = true;
    if (g.f) for (const f of g.f) if (f.stock) remapStock(f, infos.filter(n => n.o === f.id));
    return cuts;
  };

  // ---------- recursos por provincia ----------
  // al fusionarse o dividirse las provincias, el almacén se reparte según las casillas que aporta cada parte
  function remapStock(f, infos) {
    const ks = ['gold', 'food', 'wood'], out = {};
    const cnt = infos.map(n => { const m = {}; if (n.sup) for (const k of n.olds) if (f.stock[k]) m[k] = (m[k] || 0) + 1; return m; });
    infos.forEach(n => { if (n.sup) out[n.id] = { gold: 0, food: 0, wood: 0 }; });
    const tot = {}; cnt.forEach(m => { for (const k in m) tot[k] = (tot[k] || 0) + m[k]; });
    for (const k in tot) {
      for (const r of ks) {
        let left = f.stock[k][r], bi = -1, bn = 0;
        infos.forEach((n, j) => { const x = cnt[j][k] || 0; if (!x) return; const sh = Math.floor(f.stock[k][r] * x / tot[k]); out[n.id][r] += sh; left -= sh; if (x > bn) { bn = x; bi = j; } });
        if (bi >= 0) out[infos[bi].id][r] += left;
      }
    }
    f.stock = out; syncTotals(f);
  }
  function syncTotals(f) {
    f.gold = 0; f.food = 0; f.wood = 0;
    for (const k in f.stock) { f.gold += f.stock[k].gold; f.food += f.stock[k].food; f.wood += f.stock[k].wood; }
  }
  HF.syncTotals = syncTotals;
  // provincia principal: la del asentamiento de mayor rango
  function mainComp(g, f) {
    let best = null;
    for (const c of g.cells) if (c && c.o === f.id && c.sup && c.cap && (!best || HF.RANK[c.b] > HF.RANK[best.b])) best = c;
    return best ? best.comp : -1;
  }
  HF.initStock = g => {
    for (const f of g.f) {
      if (f.stock) continue;
      f.stock = {}; const m = mainComp(g, f);
      if (m >= 0) f.stock[m] = { gold: f.gold, food: f.food, wood: f.wood };
      syncTotals(f);
      if (m < 0) { f.gold = f.food = f.wood = 0; }
    }
  };
  const stockOf = (f, comp) => f.stock && f.stock[comp];
  // provincia de la que depende cada casilla: la propia si es territorio abastecido, si no la más cercana
  function provMap(g, f) {
    const gr = grid(g), m = new Int32Array(g.cells.length).fill(-1), q = [];
    for (const c of g.cells) if (c && c.o === f.id && c.sup) { m[c.i] = c.comp; q.push(c.i); }
    for (let h = 0; h < q.length; h++) { const x = q[h]; for (const y of gr.nb[x]) if (m[y] < 0 && g.cells[y]) { m[y] = m[x]; q.push(y); } }
    return m;
  }
  HF.provOf = (g, f, c) => (c.o === f.id && c.sup) ? c.comp : provMap(g, f)[c.i];
  HF.provinces = (g, f) => { const s = new Set(); for (const c of g.cells) if (c && c.o === f.id && c.sup) s.add(c.comp); return Array.from(s); };
  HF.stockFor = (g, f, comp) => comp == null || comp < 0 ? { gold: f.gold, food: f.food, wood: f.wood } : (stockOf(f, comp) || { gold: 0, food: 0, wood: 0 });
  const addWood = (g, f, cell, n) => { const k = HF.provOf(g, f, cell), s = stockOf(f, k); if (s) { s.wood += n; syncTotals(f); } };

  // ---------- economía ----------
  // mantenimiento por unidad (y su carga, si es un barco); kind = 'up' (comida) o 'upGold'
  const cellUp = (f, c, kind) => { let v = unitUpkeep(f, c.u, kind); if (c.u.cargo) v += unitUpkeep(f, c.u.cargo, kind); return v; };
  // comp (opcional): solo las unidades que dependen de esa provincia
  HF.upkeepOf = (g, f, kind, comp, pm) => {
    let up = 0;
    if (comp != null && !pm) pm = provMap(g, f);
    for (const c of g.cells) if (c && c.u && c.u.owner === f.id && (comp == null || pm[c.i] === comp)) up += cellUp(f, c, kind || 'up');
    return up;
  };
  function unitUpkeep(f, u, kind) {
    kind = kind || 'up';
    let v = HF.UNITS[u.type][kind][u.tier - 1] || HF.UNITS[u.type][kind].slice(-1)[0];
    if (u.type === 'CAB') { if (has(f, 'KNIGHTLY_ORDER')) v *= 2; if (kind === 'up' && has(f, 'CIV_TYPE_NOMAD')) v = Math.max(1, v - 1); }
    if (u.type === 'INF' && kind === 'up' && has(f, 'ASCETIC_COMMUNE')) v = Math.max(1, v - 1);
    return v;
  }
  // Rutas comerciales: dos asentamientos PUEBLO/CIUDAD unidos por camino o agua.
  // Se cachean por turno; máximo 3 por facción (config.commerce.maxRoutes).
  function tradeRoutes(g, f) {
    if (!g._trade) g._trade = {};
    const cached = g._trade[f.id];
    if (cached && cached.turn === g.turn) return cached.routes;
    const gr = grid(g), ends = [];
    for (const c of g.cells) if (c && c.o === f.id && c.sup && (c.b === B.PUEBLO || c.b === B.CIUDAD)) ends.push(c);
    const pairs = [];
    for (const s of ends) {
      const dist = new Map([[s.i, 0]]), q = [s.i];
      for (let h = 0; h < q.length; h++) {
        const x = q[h], cx = g.cells[x];
        for (const y of gr.nb[x]) {
          if (dist.has(y)) continue;
          const n = g.cells[y];
          if (!n || !(isRoad(n) || isWater(n)) || !(n.o === f.id || n.o === -1)) continue;
          dist.set(y, dist.get(x) + 1); q.push(y);
        }
      }
      for (const t of ends) if (t.i > s.i && dist.has(t.i)) pairs.push({ a: s.i, b: t.i, d: dist.get(t.i) });
    }
    pairs.sort((p, q) => p.d - q.d || p.a - q.a || p.b - q.b);
    const max = Math.max(0, HF.CFG.commerce.maxRoutes || 3);
    const routes = pairs.slice(0, max);
    g._trade[f.id] = { turn: g.turn, routes };
    return routes;
  }
  HF.tradeRoutes = tradeRoutes;
  HF.income = (g, f, comp) => {
    const inc = { gold: 0, food: 0, wood: 0 }, C = HF.CFG.income;
    const mult = has(f, 'EXTRACTIVE_ENCLAVE') ? C.enclaveMult : 1;
    const add = (src, m) => { if (src) for (const k in src) inc[k] += src[k] * m; };
    if (has(f, 'CIV_TYPE_SEDENTARY') && (comp == null || comp === mainComp(g, f))) inc.gold += C.sedentaryGold;
    const tName = Object.keys(T), rName = ['', 'ORO', 'TRIGO', 'MADERA'];
    const autumn = seasonOf(g) === 2;
    for (const c of g.cells) {
      if (!c || c.o !== f.id || !c.sup || (comp != null && c.comp !== comp)) continue;
      if (c.b === B.ARBOL) continue; // el árbol bloquea toda producción hasta talarlo
      if (c.burn > 0 || c.fire > 0) continue; // cenizas/fuego: la casilla es improductiva
      add(C.terrain[tName[c.t]], 1);
      if (HF.PROD[c.b]) { inc.gold += HF.PROD[c.b][0]; inc.food += HF.PROD[c.b][1]; }
      if (c.res) {
        const bonus = HF.CFG.buildingResBonus[c.b] || 0;
        const R = C.resource[rName[c.res]];
        for (const k in R) inc[k] += R[k] * mult + bonus;
      }
      // Otoño: la cosecha dorada suma +1 comida por trigo
      if (autumn && c.res === HF.RES.TRIGO) inc.food += HF.CFG.seasons.autumnWheatFood;
    }
    const routes = tradeRoutes(g, f);
    for (const r of routes) {
      if (comp == null || g.cells[r.a].comp === comp) inc.gold += HF.CFG.commerce.routeGold;
      if (comp == null || g.cells[r.b].comp === comp) inc.gold += HF.CFG.commerce.routeGold;
    }
    return inc;
  };
  HF.preview = (g, f, comp) => {
    const i = HF.income(g, f, comp), u = HF.upkeepOf(g, f, 'up', comp), ug = HF.upkeepOf(g, f, 'upGold', comp);
    const loan = f.loan && f.loan.turns > 0 && (comp == null || f.loan.comp === comp) ? f.loan.perTurn : 0;
    return { inc: i, upkeep: u, upkeepGold: ug, loan, netFood: i.food - u, netGold: i.gold - ug - loan };
  };

  function degradeUnit(g, c, f) {
    const u = c.u;
    if (u.tier > 1) { u.tier--; return 'baja'; }
    c.u = null; c.tomb = HF.CFG.deficit.tombTurns; if (f.human) { g.stat.deserts++; } return 'deserta';
  }
  // C3.2.1 · INDUCED_BANKRUPTCY: una tropa que muere en una casilla sin suministro
  // acredita a los rivales que llevan la doctrina (el cerco estrangula la economía).
  function creditStarvation(g, victim, cell) {
    if (!cell || cell.sup) return;
    for (const o of g.f) {
      if (o.id === victim || !o.alive || !has(o, 'INDUCED_BANKRUPTCY')) continue;
      o.starvationsInduced = (o.starvationsInduced || 0) + 1;
      if (o.human) ev(g, cell.i, 'Bancarrota inducida: tropa rival perdida (' + o.starvationsInduced + '/' + HF.CFG.doctrine.inducedDeaths + ')', 'good');
    }
  }
  // cada provincia paga a sus unidades con su propio almacén; si no puede, las más caras bajan de nivel o desertan
  function settle(g, f) {
    if (!f.stock) HF.initStock(g);
    const provs = HF.provinces(g, f), pm = provMap(g, f), mart = [];
    let anyDef = false, rebel = false;
    const upk = (k, kind) => HF.upkeepOf(g, f, kind, k, pm);
    const loanActive = !!(f.loan && f.loan.turns > 0);
    const loanK = loanActive ? (provs.indexOf(f.loan.comp) >= 0 ? f.loan.comp : (provs.length ? provs[0] : -1)) : -1;
    const worstIn = (k, kind) => {
      let w = null, wv = -1;
      for (const c of g.cells) if (c && c.u && c.u.owner === f.id && pm[c.i] === k) { const v = cellUp(f, c, kind); if (v > wv) { wv = v; w = c; } }
      return w;
    };
    for (const k of provs) {
      const s = f.stock[k] || (f.stock[k] = { gold: 0, food: 0, wood: 0 });
      const inc = HF.income(g, f, k);
      s.wood += inc.wood;
      const debt = (loanActive && k === loanK) ? f.loan.perTurn : 0;
      let gold = s.gold + inc.gold - upk(k, 'upGold') - debt, gg = 60;
      while (gold < 0 && gg-- > 0) {
        const worst = worstIn(k, 'upGold');
        if (!worst) break;
        anyDef = true;
        const nm = HF.UNITS[worst.u.type].name, r = degradeUnit(g, worst, f);
        if (r === 'deserta') creditStarvation(g, f.id, worst);
        if (f.human) ev(g, worst.i, 'Sin oro: ' + nm + ' ' + r, 'bad');
        // Quiebra durante un préstamo: la deserción se cobra al doble
        if (debt > 0) {
          const w2 = worstIn(k, 'upGold');
          if (w2) {
            const nm2 = HF.UNITS[w2.u.type].name, r2 = degradeUnit(g, w2, f);
            if (r2 === 'deserta') creditStarvation(g, f.id, w2);
            if (f.human) ev(g, w2.i, 'Quiebra: ' + nm2 + ' ' + r2, 'bad');
          }
        }
        gold = s.gold + inc.gold - upk(k, 'upGold') - debt;
      }
      s.gold = Math.max(0, gold);
      let net = s.food + inc.food - upk(k, 'up');
      if (net < 0) {
        anyDef = true;
        if (has(f, 'ZEALOT_MARTYRDOM')) mart.push(k);
        else if (has(f, 'INTEGRATION_PRESERVE')) {
          for (const c of g.cells) if (c && c.o === f.id && c.comp === k && c.conq && !isSettle(c.b)) { c.o = -1; c.conq = false; c.u = null; c.wonder = 0; rebel = true; }
          if (f.human) ev(g, null, 'Déficit: tierras conquistadas se rebelan', 'bad');
        } else {
          let guard = 60;
          while (net < 0 && guard-- > 0) {
            const worst = worstIn(k, 'up');
            if (!worst) break;
            const nm = HF.UNITS[worst.u.type].name, r = degradeUnit(g, worst, f);
            if (r === 'deserta') creditStarvation(g, f.id, worst);
            if (f.human) ev(g, worst.i, 'Hambruna: ' + nm + ' ' + r, 'bad');
            net = s.food + inc.food - upk(k, 'up');
          }
        }
        net = Math.max(0, net);
      }
      s.food = net;
    }
    if (loanActive) {
      f.loan.turns--;
      if (f.loan.turns <= 0) f.loan = null;
    }
    if (mart.length) {
      f.grace++;
      if (f.grace > HF.CFG.deficit.martyrGrace) {
        for (const c of g.cells) if (c && c.u && c.u.owner === f.id && mart.indexOf(pm[c.i]) >= 0) { c.u = null; c.tomb = HF.CFG.deficit.tombTurns; }
        if (f.human) ev(g, null, 'Martirio: las unidades de la provincia perecen', 'bad');
      }
    } else if (!anyDef) f.grace = 0;
    f.deficit = anyDef;
    f.goodStreak = f.deficit ? 0 : f.goodStreak + 1;
    syncTotals(f);
    if (rebel) HF.supply(g);
  }
  function startTurn(g, f) {
    for (const c of g.cells) if (c && c.u && c.u.owner === f.id) {
      c.u.mv = 1; c.u.at = 1; c.u.retreat = 0;
      if (c.u.cargo) { c.u.cargo.mv = 1; c.u.cargo.at = 1; c.u.cargo.retreat = 0; }
    }
    settle(g, f);
  }
  HF.startTurn = startTurn;

  // ---------- combate ----------
  function unitDef(g, u, c) {
    const f = g.f[u.owner], K = HF.CFG.combat, D = HF.UNITS[u.type];
    if (u.type === 'INF') {
      // B1.1.2 · PRAETORIAN_GUARD: el Tier 4 usa sus estadísticas de élite
      const base = u.tier >= HF.CFG.doctrine.pretorianTier ? HF.CFG.doctrine.pretorianDef : u.tier;
      let d = base + (c.t === T.COLINA ? K.hillDef : 0) + (c.t === T.MONTANA ? K.mountainDef : 0);
      if (has(f, 'TESTUDO_SHIELD')) {
        let n = 0; for (const j of HF.nbs(g, c.i)) { const x = g.cells[j]; if (x.u && x.u.owner === u.owner && x.u.type === 'INF') n++; }
        d += Math.min(K.testudoMax, n);
      }
      return d;
    }
    if (u.type === 'CAB' && has(f, 'KNIGHTLY_ORDER')) return D.defKnight + u.tier - 1;
    return D.def + u.tier - 1;
  }
  HF.defenseAt = function (g, ci) {
    const c = g.cells[ci], bd = isSettle(c.b) ? HF.BDEF[c.b] : 0;
    // B3.3.3 · LAST_STAND_FORT: tras absorber el primer asalto, la ciudad resiste con Defensa 1
    if (c.lastStand && c.lastStandTurn === g.turn) return HF.CFG.doctrine.lastStandDef;
    let base;
    if (c.u) { const ud = unitDef(g, c.u, c); base = bd > 0 ? ud + bd : ud; } else base = bd;
    if (c.o >= 0) for (const j of HF.nbs(g, ci)) {
      const n = g.cells[j];
      if (n.o !== c.o) continue;
      if (n.u) base = Math.max(base, unitDef(g, n.u, n));
      if (n.b === B.BASTION) base = Math.max(base, HF.CFG.combat.bastionAura);
    }
    return Math.max(0, base - (c.deg || 0));
  };
  // empate: la unidad que ya está en el nivel máximo gana al atacar a otra del mismo poder
  const beats = (g, u, A, D) => A > D || (A === D && u.tier >= (has(g.f[u.owner], 'ASCETIC_COMMUNE') ? HF.CFG.fuseMaxAscetic : HF.CFG.fuseMax));
  // from = casilla desde la que parte el golpe (para AMBUSH_CAMOUFLAGE y la carga)
  function attackOf(g, u, charge, target, from) {
    const f = g.f[u.owner];
    let a;
    if (u.type === 'INF') a = u.tier >= HF.CFG.doctrine.pretorianTier ? HF.CFG.doctrine.pretorianAtk : u.tier;
    else {
      a = HF.UNITS[u.type].atk + u.tier - 1;
      if (u.type === 'CAB') {
        const tf = target.o >= 0 ? g.f[target.o] : null;
        if (charge && !(tf && has(tf, 'PIKE_WALL'))) a += HF.CFG.combat.chargeBonus;
      }
    }
    // B3.2.1 · AMBUSH_CAMOUFLAGE
    const fc = from != null ? g.cells[from] : null;
    if (fc && fc.b === B.ARBOL && has(f, 'AMBUSH_CAMOUFLAGE')) a += HF.CFG.doctrine.ambushBonus;
    // B1.2.2 · VANGUARD_SACRIFICE: desgaste temporal del agresor
    if (u.debuff && u.debuffTurn === g.turn) a -= u.debuff;
    return Math.max(0, a);
  }
  HF.attackOf = attackOf;
  function unitRange(g, u) {
    const f = g.f[u.owner], D = HF.UNITS[u.type];
    if (u.type === 'BAR') return D.move + (seasonOf(g) === 1 ? HF.CFG.seasons.summerShipMove : 0);
    if (u.retreat > 0) return 1;   // B2.1.1 · PARTHIAN_RETREAT: solo un paso de retirada
    if (u.type === 'INF' && has(f, 'TACTIC_HEAVY_LINE')) return D.moveHeavy;
    return D.move;
  }
  function atkRange(g, u) {
    const f = g.f[u.owner], D = HF.UNITS[u.type];
    if (u.type === 'CAB' && has(f, 'TACTIC_MOBILE_WAR')) return D.atkRangeMobile;
    return D.atkRange;
  }
  const enemyOf = (g, i, c) => c.o !== i;

  // el barco lleva a una unidad de tierra; puede desembarcarla en una casilla de tierra contigua
  function unloadOptions(g, ci, u, out) {
    const cu = u.cargo, gr = grid(g);
    if (!cu || cu.mv <= 0) return;
    const f = g.f[u.owner];
    for (const y of gr.nb[ci]) {
      const n = g.cells[y];
      if (isWater(n) || !canStep(cu, n, f)) continue;
      if (n.o === u.owner) {
        if (n.u) continue;
        out.set(y, { k: n.b === B.ARBOL ? 'chop' : 'move', ship: true });
      } else {
        if (cu.at <= 0 || (n.u && n.u.owner === u.owner)) continue;
        const A = attackOf(g, cu, false, n, ci), D = HF.defenseAt(g, y);
        out.set(y, { k: 'atk', A, D, ok: beats(g, cu, A, D), from: ci, cost: 1, ship: true });
      }
    }
  }

  function shipOptions(g, ci, u, out) {
    const gr = grid(g), c = g.cells[ci];
    unloadOptions(g, ci, u, out);
    const summer = seasonOf(g) === 1, winter = seasonOf(g) === 3;
    const barMove = HF.UNITS.BAR.move + (summer ? HF.CFG.seasons.summerShipMove : 0);
    if (u.mv > 0) {
      const dist = new Map([[ci, 0]]), q = [ci];
      while (q.length) {
        const x = q.shift(), d = dist.get(x);
        if (d >= barMove) continue;
        for (const y of gr.nb[x]) {
          const n = g.cells[y];
          if (dist.has(y) || !isWater(n)) continue;
          if (winter && n.t === T.RIO) continue;   // río helado: los barcos no navegan
          if (n.u) {
            if (n.u.owner === u.owner && n.u.type === 'BAR' && !n.u.cargo && !u.cargo && HF.CFG.fuseTypes.includes('BAR') && n.u.tier + u.tier <= (has(g.f[u.owner], 'ASCETIC_COMMUNE') ? HF.CFG.fuseMaxAscetic : HF.CFG.fuseMax)) out.set(y, { k: 'fuse' });
            continue;
          }
          dist.set(y, d + 1); out.set(y, { k: 'move' }); q.push(y);
        }
      }
    }
    if (u.at > 0) {
      for (const y of gr.nb[ci]) {
        const n = g.cells[y];
        if (winter && n.t === T.RIO) continue;
        if (n.u && n.u.owner !== u.owner && n.u.type === 'BAR') { const A = HF.UNITS.BAR.atk + u.tier - 1, D = HF.defenseAt(g, y); out.set(y, { k: 'atk', A, D, ok: beats(g, u, A, D), from: ci, cost: 1 }); }
      }
      for (const d of gr.list) {
        const t = g.cells[d.i];
        if (t.i !== ci && HF.hexDist(c, t) <= HF.UNITS.BAR.shoot && t.u && t.u.owner !== u.owner && t.u.type !== 'BAR') out.set(t.i, { k: 'shoot' });
      }
    }
  }

  // Mapa destino -> opción para la unidad en ci
  HF.options = function (g, ci) {
    const c = g.cells[ci], u = c.u, out = new Map();
    if (!u || !readyU(u)) return out;
    if (u.type === 'BAR') { shipOptions(g, ci, u, out); return out; }
    if (u.mv > 0 && HF.CFG.shipCarry) {
      for (const y of grid(g).nb[ci]) {
        const n = g.cells[y];
        if (isWater(n) && n.u && n.u.owner === u.owner && n.u.type === 'BAR' && !n.u.cargo) out.set(y, { k: 'board' });
      }
    }
    const f = g.f[u.owner], gr = grid(g);
    const maxFuse = has(f, 'ASCETIC_COMMUNE') ? HF.CFG.fuseMaxAscetic : HF.CFG.fuseMax, fuseTypes = HF.CFG.fuseTypes;
    const thal = has(f, 'CIV_TYPE_THALASSOCRACY');
    const winter = seasonOf(g) === 3;
    const range = u.mv > 0 ? unitRange(g, u) : 0;
    // Presupuesto en cuartos de PA: una arista camino->camino cuesta 0.25.
    const budget = Math.max(0, Math.round(range * 4));
    const roadStep = Math.max(1, Math.round((HF.CFG.roads.fastCost || .25) * 4));
    const dist = new Map([[ci, 0]]), term = new Set();
    const buckets = Array.from({ length: budget + 1 }, () => []);
    buckets[0].push(ci);
    for (let cost = 0; cost <= budget; cost++) {
      const list = buckets[cost];
      for (let bi = 0; bi < list.length; bi++) {
        const x = list[bi];
        if (dist.get(x) !== cost || term.has(x)) continue;
        const xRoad = isRoad(g.cells[x]);
        for (const y of gr.nb[x]) {
          const n = g.cells[y];
          if (!canStep(u, n, f)) continue;
          // CIV_TYPE_THALASSOCRACY: también se navega por agua neutral a 1 paso
          const sea = thal && isWater(n) && (n.o === u.owner || n.o === -1);
          if (!sea && n.o !== u.owner) continue;
          if (u.type === 'SIE' && n.t === T.RIO && !isRoad(n)) continue;
          if (n.u) {
            if (fuseTypes.includes(u.type) && n.u.type === u.type && y !== ci) {
              // B1.1.2 · PRAETORIAN_GUARD: dos Tier 3 propios se funden en Tier 4
              const elite = has(f, 'PRAETORIAN_GUARD') && !has(f, 'ASCETIC_COMMUNE') && u.type === 'INF' && u.tier === 3 && n.u.tier === 3 && pretorianCount(g, u.owner) < HF.CFG.doctrine.pretorianMax;
              if (elite) { dist.set(y, cost + 1); out.set(y, { k: 'fuse', elite: true }); }
              else if (n.u.tier + u.tier <= maxFuse) { dist.set(y, cost + 1); out.set(y, { k: 'fuse' }); }
            }
            continue;
          }
          const step = (u.retreat > 0) ? 4 : (xRoad && isRoad(n) ? roadStep : 4);
          const nd = cost + step;
          if (nd > budget) continue;
          const old = dist.get(y);
          if (old !== undefined && old <= nd) continue;
          dist.set(y, nd);
          if (n.b === B.ARBOL) { out.set(y, { k: 'chop' }); continue; }
          out.set(y, { k: 'move' });
          // SCOUT_NETWORK: la montaña deja de ser terreno lento para la infantería
          const scoutMtn = u.type === 'INF' && has(f, 'SCOUT_NETWORK') && n.t === T.MONTANA;
          // Invierno: INF/CAB cruzan el río helado sin quedar atascadas
          const ice = winter && n.t === T.RIO && (u.type === 'INF' || u.type === 'CAB');
          const slow = (((n.t === T.RIO && !sea && !ice) || (n.t === T.MONTANA && !scoutMtn)) && !isRoad(n)) ||
            (u.type === 'CAB' && n.t === T.COLINA && !isRoad(n) && !has(f, 'CIV_TYPE_NOMAD') && !has(f, 'TACTIC_MOBILE_WAR'));
          if (slow) term.add(y); else buckets[nd].push(y);
        }
      }
    }
    // ataques: desde la casilla actual o desde cualquiera alcanzable (consume movimiento)
    const rng = atkRange(g, u);
    const launch = u.at > 0 ? [ci, ...[...dist.keys()].filter(k => !term.has(k) && k !== ci && !(out.get(k) && out.get(k).k !== 'move'))] : [];
    for (const from of launch) {
      const stack = [[from, 0, -1, true]];
      while (stack.length) {
        const [x, d, dir, straight] = stack.pop();
        if (d >= rng) continue;
        gr.nb[x].forEach(y => {
          const n = g.cells[y];
          if ((n.o === u.owner && !(n.u && n.u.owner !== u.owner)) || !canStep(u, n, f)) return;
          if (n.burn > 0 && n.o !== u.owner) return;      // A3.3.2 · SCORCHED_EARTH: cenizas no capturables
          if (u.type === 'SIE' && n.t === T.RIO && !isRoad(n)) return;
          const dirY = dirBetween(g, x, y);
          const st = d === 0 ? true : (straight && dirY === dir);
          const lvl = d + 1;
          const charge = u.type === 'CAB' && lvl === 2 && st && g.cells[x].t === T.LLANO && n.t === T.LLANO;
          const A = attackOf(g, u, charge, n, from), D = HF.defenseAt(g, y);
          const prev = out.get(y);
          const cand = { k: 'atk', A, D, ok: beats(g, u, A, D), from, cost: lvl };
          // sin movimiento solo puede destruir unidades enemigas (no puede ocupar casillas vacías)
          if ((u.mv > 0 || n.u) && (!prev || (prev.k === 'atk' && ((!prev.ok && cand.ok) || (prev.ok === cand.ok && cand.cost < prev.cost))))) {
            if (!prev || prev.k === 'atk') out.set(y, cand);
          }
          if (!n.u && lvl < rng) stack.push([y, lvl, dirY, st]);
        });
      }
    }
    // disparos
    if ((u.type === 'ARC' || u.type === 'SIE') && u.at > 0) {
      const sr = u.type === 'ARC' ? (c.t === T.COLINA ? HF.UNITS.ARC.shootHill : HF.UNITS.ARC.shoot) : HF.UNITS[u.type].shoot;
      for (const d of gr.list) {
        const t = g.cells[d.i];
        if (t.i === ci || HF.hexDist(c, t) > sr) continue;
        if (t.u && t.u.owner !== u.owner) out.set(t.i, { k: 'shoot' });
        else if (u.type === 'SIE' && !t.u && t.o !== u.owner && isSettle(t.b)) out.set(t.i, { k: 'siege' });
      }
    }
    doctrineOptions(g, ci, c, u, f, out);
    return out;
  };

  // ---------- doctrinas: opciones adicionales ----------
  function pretorianCount(g, owner) {
    let n = 0;
    for (const c of g.cells) {
      if (!c || !c.u || c.u.owner !== owner) continue;
      if (c.u.type === 'INF' && c.u.tier >= HF.CFG.doctrine.pretorianTier) n++;
      if (c.u.cargo && c.u.cargo.type === 'INF' && c.u.cargo.tier >= HF.CFG.doctrine.pretorianTier) n++;
    }
    return n;
  }
  function wonderOf(g, f) {
    for (const c of g.cells) if (c && c.o === f.id && c.wonder) return c;
    return null;
  }
  function needsLastStand(g, u, ci) {
    const t = g.cells[ci];
    return !!(t && t.b === B.CIUDAD && t.u && t.o >= 0 && t.o !== u.owner &&
      t.lastStandTurn !== g.turn && has(g.f[t.o], 'LAST_STAND_FORT'));
  }
  // añade una acción sin pisar la que ya ocupa el destino: la UI ofrece alternativas
  function putAlt(out, i, opt) {
    const cur = out.get(i);
    if (!cur) { out.set(i, opt); return; }
    if (!cur.alt) cur.alt = [];
    if (!cur.alt.some(a => a.k === opt.k)) cur.alt.push(opt);
  }
  function doctrineOptions(g, ci, c, u, f, out) {
    const gr = grid(g), D = HF.CFG.doctrine;
    // B3.1.3 · PHOSPHORUS_FIRE: los arqueros pueden incendiar bosques enemigos
    if (u.type === 'ARC' && u.at > 0 && has(f, 'PHOSPHORUS_FIRE')) {
      const sr = c.t === T.COLINA ? HF.UNITS.ARC.shootHill : HF.UNITS.ARC.shoot;
      for (const d of gr.list) {
        const t = g.cells[d.i];
        if (t.i === ci || t.b !== B.ARBOL || t.o < 0 || t.o === u.owner || t.fire > 0) continue;
        if (HF.hexDist(c, t) > sr) continue;
        putAlt(out, t.i, { k: 'fire', from: ci });
      }
    }
    // B3.2.2 · CALTROP_SNARE: trampa invisible en una casilla neutra contigua
    if (u.type === 'INF' && u.at > 0 && has(f, 'CALTROP_SNARE')) {
      const prov = HF.provOf(g, f, c), st = stockOf(f, prov), cost = D.caltropCost;
      if (st && st.gold >= cost.gold) {
        for (const y of gr.nb[ci]) {
          const n = g.cells[y];
          if (n.o !== -1 || n.u || n.trap != null || isSettle(n.b) || isWater(n) || n.burn > 0 || n.fire > 0 || !canStep(u, n, f)) continue;
          putAlt(out, y, { k: 'trap', from: ci, prov, cost });
        }
      }
    }
    // A3.1.2 · PACKABLE_YURTS: desmontar el campamento propio
    if (c.b === B.CAMPAMENTO && c.o === u.owner && u.at > 0 && has(f, 'PACKABLE_YURTS')) out.set(ci, { k: 'pack_camp' });
    // C3.1.1 · HOSTILE_TAKEOVER: sobornar un pueblo o bastión enemigo contiguo
    if (u.at > 0 && has(f, 'HOSTILE_TAKEOVER')) {
      const prov = HF.provOf(g, f, c), st = stockOf(f, prov), cost = D.takeoverCost;
      if (st && st.gold >= cost.gold) {
        for (const y of gr.nb[ci]) {
          const n = g.cells[y];
          if (n.o < 0 || n.o === u.owner || n.cap || (n.b !== B.PUEBLO && n.b !== B.BASTION)) continue;
          putAlt(out, y, { k: 'takeover', from: ci, prov, cost });
        }
      }
    }
    // C2.1.1 · PYRAMID_STAND_15T: erigir la pirámide sobre un bastión propio
    if (has(f, 'PYRAMID_STAND_15T') && u.at > 0 && c.o === u.owner && c.b === B.BASTION && !c.wonder && !wonderOf(g, f)) {
      const prov = HF.provOf(g, f, c), st = stockOf(f, prov), cost = D.wonderCost;
      if (st && st.gold >= cost.gold) out.set(ci, { k: 'wonder', prov, cost });
    }
    // B3.3.3 · LAST_STAND_FORT: marcar los asaltos que la guarnición absorberá
    for (const [i, o] of out) if (o.k === 'atk' && o.ok && needsLastStand(g, u, i)) o.lastStand = true;
  }
  function dirBetween(g, a, b) { return grid(g).nb[a].indexOf(b); }

  function snap(g) {
    g.undo.push(JSON.stringify({ cells: g.cells.map(c => c && stripCell(c)), f: g.f, stat: g.stat, fogMap: g.fogMap ? Array.from(g.fogMap) : null }));
    if (g.undo.length > 30) g.undo.shift();
  }
  function stripCell(c) { const o = Object.assign({}, c); return o; }
  HF.canUndo = g => g.undo.length > 0 && !g.over;
  HF.undo = g => {
    if (!HF.canUndo(g)) return false;
    const s = JSON.parse(g.undo.pop());
    g.cells = s.cells; g.f = s.f; g.stat = s.stat;
    if (s.fogMap) g.fogMap = Int8Array.from(s.fogMap);
    HF.supply(g); HF.updateFog(g);
    return true;
  };
  const noUndo = g => { g.undo.length = 0; };

  function kill(g, c, byHuman) {
    if (c.u && c.u.owner === 0) g.stat.lost += 1 + (c.u.cargo ? 1 : 0);
    if (c.u && byHuman) g.stat.kills += 1 + (c.u.cargo ? 1 : 0);
    c.u = null;
  }

  HF.act = function (g, from, to, kind) {
    if (g.over) return { ok: false, msg: 'Partida terminada' };
    const c = g.cells[from];
    let u = c.u;
    if (!u || u.owner !== g.cur) return { ok: false, msg: 'No es tu unidad' };
    let opt = HF.options(g, from).get(to);
    if (!opt) return { ok: false, msg: 'Destino no válido' };
    // acción alternativa elegida en la UI (trampa, incendio, soborno...)
    if (kind && kind !== opt.k) {
      const alt = opt.alt && opt.alt.find(a => a.k === kind);
      if (!alt) return { ok: false, msg: 'Acción no disponible' };
      opt = alt;
    }
    const t = g.cells[to], f = g.f[u.owner], D = HF.CFG.doctrine;
    const human = f.human;
    // si desembarca, la unidad que actúa es la carga y el barco se queda en su casilla
    const shipU = opt.ship ? u : null;
    if (shipU) u = shipU.cargo;
    const vacate = () => { if (shipU) shipU.cargo = null; else c.u = null; };
    if (opt.k === 'board') {
      if (human) snap(g);
      t.u.cargo = u; c.u = null; u.mv = 0;
      bastionFire(g, to, u);
    } else if (opt.k === 'move') {
      if (human) snap(g);
      const wasOwn = c.o === u.owner, safe = t.o === u.owner;
      t.u = u; vacate(); t.tomb = 0; u.mv = 0; u.retreat = 0;
      if (u.type === 'SIE') u.at = 0;
      // A3.3.2 · SCORCHED_EARTH: retirarse de una casilla propia hacia territorio seguro la deja en cenizas
      if (has(f, 'SCORCHED_EARTH') && wasOwn && safe && !isSettle(c.b) && !isWater(c)) {
        c.burn = D.scorchedTurns;
        if (human) ev(g, c.i, 'Tierra quemada: cenizas ' + D.scorchedTurns + ' turnos', 'good');
      }
      if (!triggerTrap(g, to, u)) bastionFire(g, to, u);
    } else if (opt.k === 'chop') {
      if (human) snap(g);
      t.u = u; vacate(); t.b = B.NINGUNO;
      addWood(g, f, t, chopWood(f)); u.mv = 0; u.retreat = 0;
      if (!triggerTrap(g, to, u)) bastionFire(g, to, u);
    } else if (opt.k === 'fuse') {
      if (human) snap(g);
      if (opt.elite) { t.u.tier = D.pretorianTier; t.u.elite = 1; ev(g, to, 'Pretoriano forjado (Tier 4)', human ? 'good' : 'bad'); }
      else t.u.tier += u.tier;
      t.u.mv = 0; t.u.at = Math.min(t.u.at, u.at); c.u = null;
    } else if (opt.k === 'atk') {
      // B3.3.3 · LAST_STAND_FORT: el primer asalto que supera la defensa es absorbido
      if (opt.lastStand) {
        if (human) snap(g); else noUndo(g);
        if (t.u) { t.u.tier = 1; t.u.elite = 0; }
        t.lastStand = 1; t.lastStandTurn = g.turn;
        u.at = 0; u.mv = 0;
        ev(g, to, 'Último Bastión: la guarnición resiste con Defensa 1', human ? 'bad' : 'good');
        HF.updateFog(g); HF.checkEnd(g);
        return { ok: true, kind: 'atk', held: true };
      }
      if (!opt.ok) return { ok: false, msg: 'Defensa ' + opt.D + ' ≥ ataque ' + opt.A };
      if (!t.u && human) snap(g); else noUndo(g);
      const wasOwner = t.o, wasCap = t.cap, wasCity = t.b === B.CIUDAD, naval = u.type === 'BAR';
      // sin movimiento restante: destruye a la unidad contigua pero se queda en su casilla
      const stay = !shipU && u.mv <= 0 && !!t.u;
      // B2.1.1 · PARTHIAN_RETREAT: el jinete dispara a distancia y NO avanza a la casilla
      const shot = !stay && !!t.u && u.type === 'CAB' && HF.hexDist(c, t) > 1 && has(f, 'PARTHIAN_RETREAT');
      if (t.u) {
        // B1.2.2 · VANGUARD_SACRIFICE: matar un recluta desgasta al agresor hasta el fin del turno
        if (t.u.type === 'INF' && t.u.tier === 1 && t.u.owner >= 0 && has(g.f[t.u.owner], 'VANGUARD_SACRIFICE')) {
          u.debuff = D.vanguardDebuff; u.debuffTurn = g.turn;
          ev(g, to, 'Sacrificio de vanguardia: el atacante pierde ' + D.vanguardDebuff + ' de ataque', t.u.owner === 0 ? 'good' : 'bad');
        }
        kill(g, t, human);
      }
      if (stay) { u.at = 0; t.deg = 0; checkElim(g); HF.updateFog(g); HF.checkEnd(g); return { ok: true, kind: 'atk' }; }
      if (shot) {
        // disparo ecuestre: muere el defensor, el jinete se queda y puede retroceder
        u.at = 0; t.deg = 0;
        parthianRetreat(g, u, from);
        checkElim(g); HF.updateFog(g); HF.checkEnd(g);
        return { ok: true, kind: 'atk', shot: true };
      }
      t.u = u; vacate(); u.at = 0; if (opt.from !== from || shipU) u.mv = 0; u.retreat = 0; t.tomb = 0;
      let chopped = false;
      if (!naval && t.b === B.ARBOL) { t.b = B.NINGUNO; chopped = true; }
      const trapped = triggerTrap(g, to, u);
      if (!trapped) {
        if (!naval && wasOwner !== u.owner) {
          t.conq = wasOwner >= 0 || t.conq;
          if (wasOwner === 0) g.stat.lost++;
          if (human) g.stat.captured++;
          t.o = u.owner; t.cap = 0; t.noCamp = 0;
          t.lastStand = 0; t.lastStandTurn = -1; g._trade = null;
          // el monumento profanado deja de contar para su dueño
          if (t.wonder) { t.wonder = 0; if (wasOwner >= 0) g.f[wasOwner].wonderTurns = 0; }
          ev(g, to, human ? 'Casilla conquistada' : 'Casilla perdida', human ? 'good' : 'bad');
        }
        t.deg = 0;
        const cuts = HF.supply(g);
        if (chopped) addWood(g, f, t, chopWood(f));
        if (human) g.stat.cuts += cuts;
        // A2.3.1 · SACRED_SWAMP: entrar en el río sagrado agota allí el turno
        let swampLock = false;
        if (!naval && t.t === T.RIO && wasOwner >= 0 && wasOwner !== u.owner && has(g.f[wasOwner], 'SACRED_SWAMP')) {
          u.mv = 0; u.at = 0; swampLock = true;
          ev(g, to, 'Marismas sagradas: la unidad queda atascada', human ? 'bad' : 'good');
        }
        // C1.1.1 · DECAPITATION_STRIKE
        if (!naval && has(f, 'DECAPITATION_STRIKE') && wasCap && wasCity && wasOwner >= 0 && wasOwner !== u.owner) decapitate(g, wasOwner);
        checkElim(g);
        // B2.1.1 · PARTHIAN_RETREAT (el pantano sagrado anula la retirada)
        if (!swampLock) parthianRetreat(g, u, to);
      } else if (chopped) addWood(g, f, t, chopWood(f));
      if (!trapped) bastionFire(g, to, u);
    } else if (opt.k === 'shoot') {
      noUndo(g);
      t.deg = (t.deg || 0) + (has(f, 'CHISEL_TIP_ARROWS') ? HF.CFG.combat.shootDegChisel : HF.CFG.combat.shootDeg); t.degBy = u.owner; u.at = 0;
      parthianRetreat(g, u, from);
    } else if (opt.k === 'siege') {
      noUndo(g);
      const downs = HF.CFG.siegeDowngrade;
      t.b = downs[t.b]; if (t.b === B.CIUDAD || !t.b) t.cap = 0; u.at = 0; g._trade = null;
      if (t.wonder && t.b !== B.BASTION) { t.wonder = 0; if (t.o >= 0) g.f[t.o].wonderTurns = 0; }
      const cuts = HF.supply(g); if (human) g.stat.cuts += cuts;
      checkElim(g);
    } else if (opt.k === 'fire') {
      // B3.1.3 · PHOSPHORUS_FIRE
      noUndo(g);
      t.b = B.NINGUNO; t.fire = D.phosphorusBurn; t.tomb = 0; u.at = 0;
      if (t.u) {
        const v = t.u;
        let dest = null;
        for (const j of HF.nbs(g, to)) {
          const x = g.cells[j];
          if (!x.u && !isWater(x) && !(x.fire > 0) && !(x.burn > 0) && (x.o === v.owner || x.o === -1) && canStep(v, x, g.f[v.owner])) { dest = x; break; }
        }
        if (dest) { dest.u = v; t.u = null; }
        else { if (v.owner === 0) g.stat.lost += 1 + (v.cargo ? 1 : 0); t.u = null; }
      }
      ev(g, to, 'Fuego de fósforo: el bosque arde', human ? 'good' : 'bad');
    } else if (opt.k === 'trap') {
      // B3.2.2 · CALTROP_SNARE
      if (human) snap(g); else noUndo(g);
      if (!costOk(stockOf(f, opt.prov), opt.cost)) return { ok: false, msg: 'Oro insuficiente en la provincia' };
      pay(f, opt.prov, opt.cost);
      t.trap = f.id; t.trapTurn = g.turn; t.tomb = 0;
      u.mv = 0; u.at = 0;
      if (human) ev(g, to, 'Trampa colocada', 'good');   // la trampa es invisible para el rival
    } else if (opt.k === 'pack_camp') {
      // A3.1.2 · PACKABLE_YURTS
      if (human) snap(g);
      if (t.b !== B.CAMPAMENTO) return { ok: false, msg: 'No hay campamento que empacar' };
      t.b = B.NINGUNO; t.cap = 0; t.noCamp = 1; g._trade = null;   // reubicar no regala otro campamento
      u.at = 0; u.mv = 0;
      HF.supply(g);
      // la madera se devuelve después de recalcular provincias (puede ir a otra conectada)
      addWood(g, f, t, D.packRefund);
      if (human) ev(g, to, 'Campamento empacado: +' + D.packRefund + ' madera', 'good');
    } else if (opt.k === 'takeover') {
      // C3.1.1 · HOSTILE_TAKEOVER
      if (human) snap(g); else noUndo(g);
      if (!costOk(stockOf(f, opt.prov), opt.cost)) return { ok: false, msg: 'Oro insuficiente en la provincia conectada' };
      const wasOwner = t.o;
      pay(f, opt.prov, opt.cost);
      if (t.u) kill(g, t, human);
      t.o = u.owner; t.cap = 0; t.conq = true; t.deg = 0; t.tomb = 0; t.noCamp = 0; g._trade = null;
      t.lastStand = 0; t.lastStandTurn = -1;
      if (t.wonder) { t.wonder = 0; if (wasOwner >= 0) g.f[wasOwner].wonderTurns = 0; }
      u.at = 0; u.mv = 0;
      if (human) g.stat.captured++;
      HF.supply(g); checkElim(g);
      ev(g, to, 'OPA hostil: casilla comprada', human ? 'good' : 'bad');
    } else if (opt.k === 'wonder') {
      // C2.1.1 · PYRAMID_STAND_15T
      if (human) snap(g); else noUndo(g);
      if (!costOk(stockOf(f, opt.prov), opt.cost)) return { ok: false, msg: 'Oro insuficiente en la provincia' };
      pay(f, opt.prov, opt.cost);
      t.wonder = 1; t.wonderAt = g.turn;
      f.wonderCell = t.i; f.wonderTurns = 0;
      u.at = 0; u.mv = 0;
      if (human) ev(g, to, 'Pirámide erigida: resiste ' + D.wonderStandTurns + ' turnos', 'good');
    }
    if (opt.k === 'shoot' && t.u) { t.deg = Math.max(t.deg, 1); }
    HF.updateFog(g);
    HF.checkEnd(g);
    return { ok: true, kind: opt.k };
  };

  // ---------- doctrinas: efectos de resolución ----------
  // B2.1.1 · PARTHIAN_RETREAT: si hay una casilla propia libre al lado, conserva 1 paso de huida
  function parthianRetreat(g, u, pos) {
    if (!u || u.type !== 'CAB' || !has(g.f[u.owner], 'PARTHIAN_RETREAT')) return;
    const f = g.f[u.owner];
    for (const j of HF.nbs(g, pos)) {
      const x = g.cells[j];
      if (x.u || x.fire > 0 || x.o !== u.owner || !canStep(u, x, f)) continue;
      u.mv = HF.CFG.doctrine.parthianRetreatMv; u.retreat = 1;
      return;
    }
    u.mv = 0; u.retreat = 0;
  }
  // B3.2.2 · CALTROP_SNARE: el primer enemigo que pisa la casilla muere
  function triggerTrap(g, ci, u) {
    const t = g.cells[ci];
    if (t.trap == null || t.trap === u.owner) return false;
    t.trap = null; t.tomb = HF.CFG.doctrine.caltropTomb;
    if (u.owner === 0) g.stat.lost += 1 + (u.cargo ? 1 : 0);
    t.u = null;
    ev(g, ci, 'Trampa: ' + HF.UNITS[u.type].name + ' destruida', u.owner === 0 ? 'bad' : 'good');
    return true;
  }
  // B3.3.1 · WALL_EMBRASURES: el bastión dispara una vez por turno al enemigo que se detiene a 2 casillas
  function bastionFire(g, ci, u) {
    if (!u || u.owner == null) return;
    const t = g.cells[ci];
    for (const j of HF.nbs(g, ci)) {
      for (const k of HF.nbs(g, j)) {
        const b = g.cells[k];
        if (!b || b.b !== B.BASTION || b.o < 0 || b.o === u.owner) continue;
        if (b.firedTurn === g.turn || !has(g.f[b.o], 'WALL_EMBRASURES')) continue;
        if (HF.hexDist(b, t) !== 2) continue;
        b.firedTurn = g.turn;
        t.deg = Math.max(t.deg || 0, HF.CFG.doctrine.wallEmbrasuresDeg);
        // se atribuye al dueño del bastión: la degradación dura hasta que él vuelva a jugar
        t.degBy = b.o;
        ev(g, ci, 'Troneras de muralla: defensa degradada', u.owner === 0 ? 'bad' : 'good');
        return;
      }
    }
  }
  // C1.1.1 · DECAPITATION_STRIKE: la capital perdida desbanda todo el ejército rival
  function decapitate(g, victim) {
    const vf = g.f[victim];
    let n = 0;
    for (const c of g.cells) {
      if (!c || !c.u || c.u.owner !== victim) continue;
      if (victim === 0) g.stat.lost += 1 + (c.u.cargo ? 1 : 0);
      c.u = null; c.tomb = HF.CFG.deficit.tombTurns; n++;
    }
    if (n) ev(g, null, (vf ? vf.name : 'Rival') + ': decapitación, ' + n + ' tropas se desbandan', victim === 0 ? 'bad' : 'good');
  }

  // ---------- reclutar y construir ----------
  const costOk = (s, cost) => !!s && ['gold', 'food', 'wood'].every(k => !cost[k] || s[k] >= cost[k]);
  const pay = (f, comp, cost) => { for (const k of ['gold', 'food', 'wood']) if (cost[k]) f.stock[comp][k] -= cost[k]; syncTotals(f); };
  HF.affordAny = (g, f, cost) => Object.keys(f.stock || {}).some(k => costOk(f.stock[k], cost));
  HF.unitCost = (g, f, type) => {
    const c = Object.assign({}, HF.UNITS[type].cost);
    if (type === 'INF') {
      if (has(f, 'GOV_FEUDAL_NOBILITY')) { c.gold = Math.ceil(c.gold * .8); c.food = Math.ceil(c.food * .8); }
      if (has(f, 'MIL_LEVY_SWARM')) { c.gold = Math.ceil(c.gold / 2); c.food = Math.ceil(c.food / 2); }
    }
    return c;
  };
  HF.buildCost = (g, f, b) => {
    const c = Object.assign({}, HF.BCOST[b]);
    if ((b === B.PUEBLO || b === B.CIUDAD) && has(f, 'SERFDOM_CHAIN')) c.wood = Math.ceil(c.wood / 2);
    return c;
  };
  const clampTier = t => Math.max(1, Math.min(3, t | 0 || 1));
  // coste × rango para el reclutamiento directo de T2/T3
  HF.recruitCost = (g, f, type, tier) => {
    const c = HF.unitCost(g, f, type), n = clampTier(tier);
    for (const k in c) c[k] *= n;
    return c;
  };
  // casillas donde se puede reclutar y, para cada una, las provincias que podrían pagarlo
  function recruitScan(g, type, tier) {
    const f = g.f[g.cur], out = new Map(), def = HF.UNITS[type], t = clampTier(tier);
    if (!def || (t > 2 && has(f, 'ASCETIC_COMMUNE'))) return out;
    const gr = grid(g), srcs = g.cells.filter(c => c && c.o === f.id && c.sup && def.from.indexOf(c.b) >= 0);
    if (!srcs.length) return out;
    const cost = HF.recruitCost(g, f, type, t);
    for (const d of gr.list) {
      const c = g.cells[d.i];
      if (c.u || c.trap != null || c.burn > 0 || c.fire > 0) continue;   // trampas y cenizas bloquean el reclutamiento
      let comps;
      if (def.naval) {
        if (!isWater(c) || (seasonOf(g) === 3 && c.t === T.RIO)) continue;   // río helado
        comps = srcs.filter(s => gr.nb[c.i].indexOf(s.i) >= 0).map(s => s.comp);
      } else {
        const ownedOk = c.o === f.id && c.sup;
        // casilla neutral contigua a territorio propio abastecido
        const border = !ownedOk && c.o === -1 && gr.nb[c.i].some(j => { const m = g.cells[j]; return m && m.o === f.id && m.sup; });
        if ((!ownedOk && !border) || !canStep({ type }, c) || c.b === B.ARBOL || (!ownedOk && isSettle(c.b))) continue;
        const near = s => HF.hexDist(s, c) <= HF.CFG.recruitRadius;
        if (ownedOk) comps = srcs.some(s => s.comp === c.comp && near(s)) ? [c.comp] : [];
        else comps = gr.nb[c.i].map(j => g.cells[j]).filter(m => m && m.o === f.id && m.sup && srcs.some(s => s.comp === m.comp && near(s))).map(m => m.comp);
      }
      comps = Array.from(new Set(comps)).filter(k => costOk(stockOf(f, k), cost));
      if (comps.length) out.set(c.i, comps);
    }
    return out;
  }
  HF.recruitCells = (g, type, tier) => Array.from(recruitScan(g, type, tier).keys());
  HF.recruitScan = recruitScan;
  HF.recruit = function (g, type, ci, comp, tier) {
    const f = g.f[g.cur], t = clampTier(tier);
    if (g.over) return { ok: false, msg: 'Partida terminada' };
    if (t > 2 && has(f, 'ASCETIC_COMMUNE')) return { ok: false, msg: 'El dogma ascético prohíbe el Tier 3' };
    const comps = recruitScan(g, type, t).get(ci);
    if (!comps || (comp != null && comps.indexOf(comp) < 0)) return { ok: false, msg: 'Casilla no válida o provincia sin recursos' };
    const cost = HF.recruitCost(g, f, type, t);
    if (f.human) snap(g);
    pay(f, comp != null ? comp : comps[0], cost);
    const c = g.cells[ci];
    c.u = { type, tier: t, owner: f.id, mv: 1, at: 1 }; c.tomb = 0;
    // reclutar en casilla neutral la ocupa y consume el movimiento
    if (!HF.UNITS[type].naval && c.o !== f.id) { c.o = f.id; c.cap = 0; c.u.mv = 0; g._trade = null; HF.supply(g); }
    if (f.human) g.stat.recruited++;
    HF.updateFog(g);
    return { ok: true };
  };
  HF.buildCells = function (g, b) {
    const f = g.f[g.cur], out = [], cost = HF.buildCost(g, f, b);
    for (const d of grid(g).list) {
      const c = g.cells[d.i];
      if (c.o !== f.id || !c.sup || !costOk(stockOf(f, c.comp), cost)) continue;
      if (c.burn > 0 || c.fire > 0 || c.trap != null) continue;   // cenizas, fuego o trampas: no se construye
      if (HF.BLEVEL[b] <= HF.BLEVEL[c.b || 0]) continue;
      if (BUILDABLE_LAND(c) || (b === B.CAMINO && c.t === T.RIO)) out.push(c.i);
    }
    return out;
  };
  HF.build = function (g, b, ci) {
    const f = g.f[g.cur];
    if (g.over || !HF.buildCells(g, b).includes(ci)) return { ok: false, msg: 'Casilla no válida o provincia sin recursos' };
    const cost = HF.buildCost(g, f, b);
    if (f.human) snap(g);
    pay(f, g.cells[ci].comp, cost);
    const c = g.cells[ci]; c.b = b;
    // A1.3.3 · FORTIFIED_ESTATE: el bastión queda operativo en el acto, sin esperar turno
    if (b === B.BASTION && has(f, 'FORTIFIED_ESTATE')) c.builtTurn = g.turn;
    if (f.human) g.stat.built++;
    g._trade = null;   // una calzada nueva puede abrir rutas comerciales
    HF.supply(g); HF.updateFog(g);
    return { ok: true };
  };
  // Expansión acuario: préstamo de emergencia desde la capital.
  HF.loan = function (g, ci) {
    const f = g.f[g.cur], c = g.cells[ci];
    if (!f || !f.alive || g.over) return { ok: false, msg: 'Partida terminada' };
    if (!c || c.o !== f.id || !c.cap || c.b !== B.CIUDAD) return { ok: false, msg: 'Solo en una ciudad capital' };
    if (f.loan && f.loan.turns > 0) return { ok: false, msg: 'Ya tienes un préstamo activo' };
    f.loan = null;
    const comp = HF.provOf(g, f, c), s = stockOf(f, comp);
    if (!s) return { ok: false, msg: 'La capital no tiene tesorería conectada' };
    if (f.human) snap(g);
    s.gold += HF.CFG.loan.amount; syncTotals(f);
    f.loan = { comp, turns: HF.CFG.loan.turns, perTurn: HF.CFG.loan.perTurn, cell: ci };
    if (f.human) ev(g, ci, 'Empréstito: +' + HF.CFG.loan.amount + ' oro · deuda ' + HF.CFG.loan.perTurn + '/turno', 'good');
    HF.updateFog(g);
    return { ok: true, amount: HF.CFG.loan.amount, turns: HF.CFG.loan.turns, perTurn: HF.CFG.loan.perTurn };
  };

  // ---------- niebla ----------
  HF.updateFog = function (g) {
    const n = g.cells.length;
    if (!g.fogMap) g.fogMap = new Int8Array(n);
    if (g.fog === 'NONE') { g.fogMap.fill(2); return; }
    const gr = grid(g);
    for (let i = 0; i < n; i++) if (g.fogMap[i] === 2) g.fogMap[i] = g.fog === 'EXPLORED' ? 1 : 1;
    const mark = (c, r) => { for (const d of gr.list) if (HF.hexDist(c, d) <= r) g.fogMap[d.i] = 2; };
    for (const c of gr.list) {
      const x = g.cells[c.i];
      let r = 0;
      if (x.o === 0) r = 1;
      if (x.u && x.u.owner === 0) r = Math.max(r, 1 + (x.t === T.COLINA ? 1 : 0));
      if (x.o === 0 && (x.b === B.CIUDAD || x.b === B.PUEBLO || x.b === B.BASTION)) r = 2;
      if (r) mark(x, r);
    }
    if (g.fog === 'EXPLORED') { /* el terreno descubierto se mantiene visible aunque sin unidades enemigas */ }
  };
  HF.visible = (g, i) => g.fog === 'NONE' || (g.fogMap && g.fogMap[i] === 2);

  // ---------- fin de partida ----------
  function checkElim(g) {
    for (const f of g.f) {
      if (!f.alive) continue;
      if (!g.cells.some(c => c && c.o === f.id && c.b === B.CIUDAD)) {
        f.alive = false; f.wonderTurns = 0; f.wonderCell = -1; f.loan = null; g._trade = null;
        for (const c of g.cells) if (c && c.o === f.id) { c.o = -1; c.cap = 0; c.u = null; c.sup = 0; c.wonder = 0; c.trap = null; c.lastStand = 0; c.noCamp = 0; }
        for (const c of g.cells) if (c && c.trap === f.id) c.trap = null;   // las trampas caen con su dueño
        ev(g, null, f.name + ' ha sido eliminado', f.human ? 'bad' : 'good');
      }
    }
    HF.supply(g);
  }
  const landCount = g => g.cells.filter(c => c && c.t !== T.MAR).length;
  HF.territory = (g, i) => g.cells.filter(c => c && c.o === i).length;
  HF.checkEnd = function (g) {
    if (g.over) return;
    const me = g.f[0];
    if (!me.alive) return finish(g, -1, 'Tu civilización ha caído');
    if (g.f.slice(1).every(f => !f.alive) && g.f.length > 1) return finish(g, 0, 'Dominación total');
    for (const f of g.f) {
      if (!f.alive) continue;
      const w = HF.winTag(g, f);
      if (w) return finish(g, f.id, w);
    }
    const gl = g.goal || {};
    if (gl.type === 'survive' && g.turn > gl.n) return finish(g, 0, 'Has sobrevivido ' + gl.n + ' turnos');
    if (gl.type === 'gold' && me.gold >= gl.n) return finish(g, 0, 'Has acumulado ' + gl.n + ' de oro');
    if (gl.type === 'territory' && HF.territory(g, 0) >= gl.n) return finish(g, 0, 'Territorio de ' + gl.n + ' casillas');
    if (gl.type === 'city' && g.cells.filter(c => c && c.o === 0 && c.b === B.CIUDAD).length >= gl.n) return finish(g, 0, 'Ciudades suficientes');
    if (gl.type === 'maxTurns' && g.turn > gl.n) return finish(g, -1, 'Se acabó el tiempo');
    if (has(me, 'WIN_BLITZKRIEG') && g.turn > HF.CFG.win.blitzTurn) return finish(g, -1, 'Blitzkrieg: demasiado lento');
  };
  HF.winTag = (g, f) => {
    // C2.1.1 · PYRAMID_STAND_15T: el monumento intacto durante N turnos da la partida
    if (has(f, 'PYRAMID_STAND_15T') && (f.wonderTurns || 0) >= HF.CFG.doctrine.wonderStandTurns) return 'Pirámide Eterna: ' + HF.CFG.doctrine.wonderStandTurns + ' turnos en pie';
    // C3.2.1 · INDUCED_BANKRUPTCY: el cerco mata N tropas rivales y quiebra su economía
    if (has(f, 'INDUCED_BANKRUPTCY') && (f.starvationsInduced || 0) >= HF.CFG.doctrine.inducedDeaths) return 'Bancarrota inducida: ' + HF.CFG.doctrine.inducedDeaths + ' tropas rivales perdidas por cerco';
    if (has(f, 'WIN_SURVIVAL_T50') && g.turn > HF.CFG.win.survivalTurn) return 'Has resistido ' + HF.CFG.win.survivalTurn + ' turnos';
    if (has(f, 'WIN_GOLD_ACCUMULATE') && f.gold >= HF.CFG.win.gold) return 'Banca Central: ' + HF.CFG.win.gold + ' de oro';
    if (has(f, 'WIN_HEGEMONY_MAP') && HF.territory(g, f.id) / landCount(g) >= HF.CFG.win.hegemony) return 'Hegemonía territorial';
    if (has(f, 'GOLDEN_ERA_STREAK') && f.goodStreak >= HF.CFG.win.goldenEra) return 'Edad Dorada';
    return null;
  };
  function finish(g, winner, reason) {
    g.over = { winner, reason, turn: g.turn, won: winner === 0 };
    HF.recordTimeline(g);
  }
  HF.recordTimeline = g => {
    g.timeline.push({ t: g.turn, terr: g.f.map(f => HF.territory(g, f.id)), gold: g.f.map(f => f.gold), units: g.f.map(f => g.cells.filter(c => c && c.u && c.u.owner === f.id).length) });
  };

  // ---------- turnos ----------
  HF.endTurn = function (g, aiPlay) {
    if (g.over) return;
    clearDeg(g, 0);
    noUndo(g);
    for (let i = 1; i < g.f.length; i++) {
      const f = g.f[i];
      if (!f.alive || g.over) continue;
      g.cur = i;
      startTurn(g, f);
      if (aiPlay) aiPlay(g, i);
      clearDeg(g, i);
      checkElim(g);
      HF.checkEnd(g);
    }
    g.cur = 0;
    if (g.over) { save_rs(g); return; }
    // fin de ronda: tumbas, cenizas y fuegos
    for (const c of g.cells) if (c) {
      if (c.tomb > 0) c.tomb--;
      if (c.burn > 0) c.burn--;
      if (c.fire > 0) c.fire--;
    }
    // C2.1.1 · PYRAMID_STAND_15T: contar solo si el monumento sigue en pie y en manos de su dueño
    for (const f of g.f) {
      if (!f.alive) { f.wonderTurns = 0; f.wonderCell = -1; continue; }
      if (f.wonderCell == null || f.wonderCell < 0) { const w = wonderOf(g, f); f.wonderCell = w ? w.i : -1; }
      const wc = f.wonderCell >= 0 ? g.cells[f.wonderCell] : null;
      if (wc && wc.wonder && wc.o === f.id && wc.b === B.BASTION) f.wonderTurns = (f.wonderTurns || 0) + 1;
      else { f.wonderTurns = 0; f.wonderCell = -1; }
    }
    const gr = grid(g), r = rnd(g), add = [];
    const spread = HF.CFG.treeSpreadChance * (seasonOf(g) === 0 ? HF.CFG.seasons.springTreeMult : 1);
    for (const d of gr.list) {
      const c = g.cells[d.i];
      if (c.b !== B.ARBOL) continue;
      for (const j of gr.nb[c.i]) {
        const n = g.cells[j];
        if ((n.t === T.LLANO || n.t === T.COLINA) && !n.b && !n.u && !(n.burn > 0) && !(n.fire > 0) && n.trap == null && r() < spread) add.push(n.i);
      }
    }
    for (const i of add) g.cells[i].b = B.ARBOL;
    g.turn++;
    startTurn(g, g.f[0]);
    HF.updateFog(g);
    HF.recordTimeline(g);
    HF.checkEnd(g);
    save_rs(g);
  };
  function clearDeg(g, who) { for (const c of g.cells) if (c && c.deg && c.degBy === who) { c.deg = 0; } }

  // ---------- guardado ----------
  HF.serialize = g => {
    const o = {};
    save_rs(g);
    for (const k of Object.keys(g)) if (k[0] !== '_' && k !== 'undo' && k !== 'fogMap') o[k] = g[k];
    o.fogMap = g.fogMap ? Array.from(g.fogMap) : null;
    o.cells = g.cells.map(c => {
      if (!c) return null;
      const d = { i: c.i, q: c.q, r: c.r };
      for (const k of ['t', 'res', 'b', 'o', 'cap', 'tomb', 'deg', 'sup', 'conq',
        'burn', 'fire', 'wonder', 'wonderAt', 'lastStand', 'lastStandTurn', 'builtTurn', 'firedTurn', 'noCamp']) if (c[k]) d[k] = c[k];
      if (c.comp !== undefined) d.comp = c.comp;
      if (c.degBy != null) d.degBy = c.degBy;         // el dueño 0 es un valor válido
      if (c.trap != null) d.trap = c.trap;           // el dueño 0 es un valor válido
      if (c.trapTurn != null) d.trapTurn = c.trapTurn;
      d.o = c.o; if (c.u) d.u = c.u;
      return d;
    });
    return o;
  };
  HF.deserialize = o => {
    const g = Object.assign({}, o); g.undo = [];
    for (const f of g.f) {
      if (f.starvationsInduced == null) f.starvationsInduced = 0;
      if (f.wonderCell == null) f.wonderCell = -1;
      if (f.wonderTurns == null) f.wonderTurns = 0;
      if (f.loan == null || !(f.loan.turns > 0)) f.loan = null;
    }
    g.cells = o.cells.map(c => c && Object.assign(HF.newCell(c), c));
    for (const c of g.cells) if (c && c.u && c.u.pa !== undefined) { c.u.mv = c.u.at = c.u.pa; delete c.u.pa; }
    g.fogMap = o.fogMap ? Int8Array.from(o.fogMap) : null;
    g.supInit = false;
    HF.supply(g); g.supInit = true;
    HF.initStock(g);
    return g;
  };
  HF.stars = g => {
    if (!g.over || !g.over.won) return 0;
    const m = g.meta || {};
    let s = 1;
    if (g.turn <= (m.par || 30)) s++;
    const ch = m.challenge;
    const okc = ch === 'NO_ISOLATED' ? !g.stat.isolatedEver : ch === 'NO_DESERT' ? g.stat.deserts === 0 : ch === 'CUT2' ? g.stat.cuts >= 2 : true;
    if (okc) s++;
    return s;
  };
})(typeof window !== 'undefined' ? window : globalThis);
