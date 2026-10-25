(function (G) {
  const HF = G.HF, T = HF.T, B = HF.B;
  const SETTLE = { 3: 1, 4: 1, 5: 1, 6: 1 };
  const isSettle = b => !!SETTLE[b];
  HF.isSettle = isSettle;
  const passableT = c => c.t !== T.MAR;
  const canStep = (u, c) => {
    if (u.type === 'BAR') return isWater(c);
    if (!passableT(c)) return false;
    if (c.t === T.MONTANA) return isRoad(c) || (HF.CFG.mountainUnits || ['INF', 'ARC']).indexOf(u.type) >= 0;
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
        gold: sr.gold, food: sr.food, wood: sr.wood, alive: true, grace: 0, wonderTurns: 0, goodStreak: 0, deficit: false
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
    for (const c0 of gr.list) {
      const c = cells[c0.i];
      if (c.o < 0 || seen.has(c.i)) { if (c.o < 0) { c.sup = 0; c.comp = -1; } continue; }
      const comp = [], q = [c.i]; seen.add(c.i);
      while (q.length) {
        const x = q.pop(); comp.push(cells[x]);
        for (const y of gr.nb[x]) if (!seen.has(y) && cells[y].o === c.o) { seen.add(y); q.push(y); }
      }
      let best = null;
      if (g.supInit && comp.length >= HF.CFG.isolatedCampMin && !comp.some(x => isSettle(x.b))) {
        const inComp = new Set(comp.map(x => x.i));
        let spot = null, sv = -1;
        for (const x of comp) {
          if (x.b > B.ARBOL || x.t === T.RIO || x.t === T.MAR) continue;
          const v = gr.nb[x.i].filter(j => inComp.has(j)).length + (x.t === T.MONTANA ? -2 : 0);
          if (v > sv) { sv = v; spot = x; }
        }
        if (spot) {
          spot.b = B.CAMPAMENTO;
          if (c.o === 0) ev(g, spot.i, 'Territorio aislado: nuevo campamento y provincia', 'good');
        }
      }
      for (const x of comp) if (isSettle(x.b) && (!best || HF.RANK[x.b] > HF.RANK[best.b] || (HF.RANK[x.b] === HF.RANK[best.b] && x.cap && !best.cap))) best = x;
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
  HF.income = (g, f, comp) => {
    const inc = { gold: 0, food: 0, wood: 0 }, C = HF.CFG.income;
    const mult = has(f, 'EXTRACTIVE_ENCLAVE') ? C.enclaveMult : 1;
    const add = (src, m) => { if (src) for (const k in src) inc[k] += src[k] * m; };
    if (has(f, 'CIV_TYPE_SEDENTARY') && (comp == null || comp === mainComp(g, f))) inc.gold += C.sedentaryGold;
    const tName = Object.keys(T), rName = ['', 'ORO', 'TRIGO', 'MADERA'];
    for (const c of g.cells) {
      if (!c || c.o !== f.id || !c.sup || (comp != null && c.comp !== comp)) continue;
      if (c.b === B.ARBOL) continue; // el árbol bloquea toda producción hasta talarlo
      add(C.terrain[tName[c.t]], 1);
      if (HF.PROD[c.b]) { inc.gold += HF.PROD[c.b][0]; inc.food += HF.PROD[c.b][1]; }
      if (c.res) {
        const bonus = HF.CFG.buildingResBonus[c.b] || 0;
        const R = C.resource[rName[c.res]];
        for (const k in R) inc[k] += R[k] * mult + bonus;
      }
    }
    return inc;
  };
  HF.preview = (g, f, comp) => {
    const i = HF.income(g, f, comp), u = HF.upkeepOf(g, f, 'up', comp), ug = HF.upkeepOf(g, f, 'upGold', comp);
    return { inc: i, upkeep: u, upkeepGold: ug, netFood: i.food - u, netGold: i.gold - ug };
  };

  function degradeUnit(g, c, f) {
    const u = c.u;
    if (u.tier > 1) { u.tier--; return 'baja'; }
    c.u = null; c.tomb = HF.CFG.deficit.tombTurns; if (f.human) { g.stat.deserts++; } return 'deserta';
  }
  // cada provincia paga a sus unidades con su propio almacén; si no puede, las más caras bajan de nivel o desertan
  function settle(g, f) {
    if (!f.stock) HF.initStock(g);
    const provs = HF.provinces(g, f), pm = provMap(g, f), mart = [];
    let anyDef = false, rebel = false;
    const upk = (k, kind) => HF.upkeepOf(g, f, kind, k, pm);
    const worstIn = (k, kind) => {
      let w = null, wv = -1;
      for (const c of g.cells) if (c && c.u && c.u.owner === f.id && pm[c.i] === k) { const v = cellUp(f, c, kind); if (v > wv) { wv = v; w = c; } }
      return w;
    };
    for (const k of provs) {
      const s = f.stock[k] || (f.stock[k] = { gold: 0, food: 0, wood: 0 });
      const inc = HF.income(g, f, k);
      s.wood += inc.wood;
      let gold = s.gold + inc.gold - upk(k, 'upGold'), gg = 60;
      while (gold < 0 && gg-- > 0) {
        const worst = worstIn(k, 'upGold');
        if (!worst) break;
        anyDef = true;
        const nm = HF.UNITS[worst.u.type].name, r = degradeUnit(g, worst, f);
        if (f.human) ev(g, worst.i, 'Sin oro: ' + nm + ' ' + r, 'bad');
        gold = s.gold + inc.gold - upk(k, 'upGold');
      }
      s.gold = Math.max(0, gold);
      let net = s.food + inc.food - upk(k, 'up');
      if (net < 0) {
        anyDef = true;
        if (has(f, 'ZEALOT_MARTYRDOM')) mart.push(k);
        else if (has(f, 'INTEGRATION_PRESERVE')) {
          for (const c of g.cells) if (c && c.o === f.id && c.comp === k && c.conq && !isSettle(c.b)) { c.o = -1; c.conq = false; c.u = null; rebel = true; }
          if (f.human) ev(g, null, 'Déficit: tierras conquistadas se rebelan', 'bad');
        } else {
          let guard = 60;
          while (net < 0 && guard-- > 0) {
            const worst = worstIn(k, 'up');
            if (!worst) break;
            const nm = HF.UNITS[worst.u.type].name, r = degradeUnit(g, worst, f);
            if (f.human) ev(g, worst.i, 'Hambruna: ' + nm + ' ' + r, 'bad');
            net = s.food + inc.food - upk(k, 'up');
          }
        }
        net = Math.max(0, net);
      }
      s.food = net;
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
    for (const c of g.cells) if (c && c.u && c.u.owner === f.id) { c.u.mv = 1; c.u.at = 1; if (c.u.cargo) { c.u.cargo.mv = 1; c.u.cargo.at = 1; } }
    settle(g, f);
  }
  HF.startTurn = startTurn;

  // ---------- combate ----------
  function unitDef(g, u, c) {
    const f = g.f[u.owner], K = HF.CFG.combat, D = HF.UNITS[u.type];
    if (u.type === 'INF') {
      let d = u.tier + (c.t === T.COLINA ? K.hillDef : 0) + (c.t === T.MONTANA ? K.mountainDef : 0);
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
  function attackOf(g, u, charge, target) {
    if (u.type === 'INF') return u.tier;
    const a = HF.UNITS[u.type].atk + u.tier - 1;
    if (u.type === 'CAB') {
      const tf = target.o >= 0 ? g.f[target.o] : null;
      return a + (charge && !(tf && has(tf, 'PIKE_WALL')) ? HF.CFG.combat.chargeBonus : 0);
    }
    return a;
  }
  function unitRange(g, u) {
    const f = g.f[u.owner], D = HF.UNITS[u.type];
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
      if (isWater(n) || !canStep(cu, n)) continue;
      if (n.o === u.owner) {
        if (n.u) continue;
        out.set(y, { k: n.b === B.ARBOL ? 'chop' : 'move', ship: true });
      } else {
        if (cu.at <= 0 || (n.u && n.u.owner === u.owner)) continue;
        const A = attackOf(g, cu, false, n), D = HF.defenseAt(g, y);
        out.set(y, { k: 'atk', A, D, ok: beats(g, cu, A, D), from: ci, cost: 1, ship: true });
      }
    }
  }

  function shipOptions(g, ci, u, out) {
    const gr = grid(g), c = g.cells[ci];
    unloadOptions(g, ci, u, out);
    if (u.mv > 0) {
      const dist = new Map([[ci, 0]]), q = [ci];
      while (q.length) {
        const x = q.shift(), d = dist.get(x);
        if (d >= HF.UNITS.BAR.move) continue;
        for (const y of gr.nb[x]) {
          const n = g.cells[y];
          if (dist.has(y) || !isWater(n)) continue;
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
    const range = u.mv > 0 ? unitRange(g, u) : 0;
    const dist = new Map([[ci, 0]]), term = new Set(), q = [ci];
    while (q.length) {
      const x = q.shift(), d = dist.get(x);
      if (d >= range || term.has(x)) continue;
      for (const y of gr.nb[x]) {
        const n = g.cells[y];
        if (dist.has(y) || n.o !== u.owner || !canStep(u, n)) continue;
        if (u.type === 'SIE' && n.t === T.RIO && !isRoad(n)) continue;
        if (n.u) {
          if (fuseTypes.includes(u.type) && n.u.type === u.type && n.u.tier + u.tier <= maxFuse && y !== ci) { dist.set(y, d + 1); out.set(y, { k: 'fuse' }); }
          continue;
        }
        dist.set(y, d + 1);
        if (n.b === B.ARBOL) { out.set(y, { k: 'chop' }); continue; }
        out.set(y, { k: 'move' });
        const slow = ((n.t === T.RIO || n.t === T.MONTANA) && !isRoad(n)) || (u.type === 'CAB' && n.t === T.COLINA && !isRoad(n) && !has(f, 'CIV_TYPE_NOMAD') && !has(f, 'TACTIC_MOBILE_WAR'));
        if (slow) term.add(y);
        q.push(y);
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
          if ((n.o === u.owner && !(n.u && n.u.owner !== u.owner)) || !canStep(u, n)) return;
          if (u.type === 'SIE' && n.t === T.RIO && !isRoad(n)) return;
          const dd = gr.nb[x].indexOf(y);
          const dirY = dirBetween(g, x, y);
          const st = d === 0 ? true : (straight && dirY === dir);
          const lvl = d + 1;
          const charge = u.type === 'CAB' && lvl === 2 && st && g.cells[x].t === T.LLANO && n.t === T.LLANO;
          const A = attackOf(g, u, charge, n), D = HF.defenseAt(g, y);
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
    return out;
  };
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

  HF.act = function (g, from, to) {
    if (g.over) return { ok: false, msg: 'Partida terminada' };
    const c = g.cells[from];
    let u = c.u;
    if (!u || u.owner !== g.cur) return { ok: false, msg: 'No es tu unidad' };
    const opt = HF.options(g, from).get(to);
    if (!opt) return { ok: false, msg: 'Destino no válido' };
    const t = g.cells[to], f = g.f[u.owner];
    const human = f.human;
    // si desembarca, la unidad que actúa es la carga y el barco se queda en su casilla
    const shipU = opt.ship ? u : null;
    if (shipU) u = shipU.cargo;
    const vacate = () => { if (shipU) shipU.cargo = null; else c.u = null; };
    if (opt.k === 'board') {
      if (human) snap(g);
      t.u.cargo = u; c.u = null; u.mv = 0;
    } else if (opt.k === 'move') {
      if (human) snap(g);
      t.u = u; vacate(); t.tomb = 0; u.mv = 0;
      if (u.type === 'SIE') u.at = 0;
    } else if (opt.k === 'chop') {
      if (human) snap(g);
      t.u = u; vacate(); t.b = B.NINGUNO;
      addWood(g, f, t, chopWood(f)); u.mv = 0;
    } else if (opt.k === 'fuse') {
      if (human) snap(g);
      t.u.tier += u.tier; t.u.mv = 0; t.u.at = Math.min(t.u.at, u.at); c.u = null;
    } else if (opt.k === 'atk') {
      if (!opt.ok) return { ok: false, msg: 'Defensa ' + opt.D + ' ≥ ataque ' + opt.A };
      if (!t.u && human) snap(g); else noUndo(g);
      const wasOwner = t.o, naval = u.type === 'BAR';
      // sin movimiento restante: destruye a la unidad contigua pero se queda en su casilla
      const stay = !shipU && u.mv <= 0 && !!t.u;
      if (t.u) { kill(g, t, human); }
      if (stay) { u.at = 0; t.deg = 0; checkElim(g); HF.updateFog(g); HF.checkEnd(g); return { ok: true, kind: 'atk' }; }
      t.u = u; vacate(); u.at = 0; if (opt.from !== from || shipU) u.mv = 0; t.tomb = 0;
      let chopped = false;
      if (!naval && t.b === B.ARBOL) { t.b = B.NINGUNO; chopped = true; }
      if (!naval && wasOwner !== u.owner) {
        t.conq = wasOwner >= 0 || t.conq;
        if (wasOwner === 0) g.stat.lost++;
        if (human) g.stat.captured++;
        t.o = u.owner; t.cap = 0;
        if (opt.from !== from) { /* la unidad salió de su casilla original */ }
        ev(g, to, human ? 'Casilla conquistada' : 'Casilla perdida', human ? 'good' : 'bad');
      }
      t.deg = 0;
      const cuts = HF.supply(g);
      if (chopped) addWood(g, f, t, chopWood(f));
      if (human) g.stat.cuts += cuts;
      checkElim(g);
    } else if (opt.k === 'shoot') {
      noUndo(g);
      t.deg = (t.deg || 0) + (has(f, 'CHISEL_TIP_ARROWS') ? HF.CFG.combat.shootDegChisel : HF.CFG.combat.shootDeg); t.degBy = u.owner; u.at = 0;
    } else if (opt.k === 'siege') {
      noUndo(g);
      const downs = HF.CFG.siegeDowngrade;
      t.b = downs[t.b]; if (t.b === B.CIUDAD || !t.b) t.cap = 0; u.at = 0;
      const cuts = HF.supply(g); if (human) g.stat.cuts += cuts;
      checkElim(g);
    }
    if (opt.k === 'shoot' && t.u) { t.deg = Math.max(t.deg, 1); }
    HF.updateFog(g);
    HF.checkEnd(g);
    return { ok: true, kind: opt.k };
  };

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
  // casillas donde se puede reclutar y, para cada una, las provincias que podrían pagarlo
  function recruitScan(g, type) {
    const f = g.f[g.cur], out = new Map(), def = HF.UNITS[type];
    if (!def) return out;
    const gr = grid(g), srcs = g.cells.filter(c => c && c.o === f.id && c.sup && def.from.indexOf(c.b) >= 0);
    if (!srcs.length) return out;
    const cost = HF.unitCost(g, f, type);
    for (const d of gr.list) {
      const c = g.cells[d.i];
      if (c.u) continue;
      let comps;
      if (def.naval) {
        if (!isWater(c)) continue;
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
  HF.recruitCells = (g, type) => Array.from(recruitScan(g, type).keys());
  HF.recruitScan = recruitScan;
  HF.recruit = function (g, type, ci, comp) {
    const f = g.f[g.cur];
    if (g.over) return { ok: false, msg: 'Partida terminada' };
    const comps = recruitScan(g, type).get(ci);
    if (!comps || (comp != null && comps.indexOf(comp) < 0)) return { ok: false, msg: 'Casilla no válida o provincia sin recursos' };
    const cost = HF.unitCost(g, f, type);
    if (f.human) snap(g);
    pay(f, comp != null ? comp : comps[0], cost);
    const c = g.cells[ci];
    c.u = { type, tier: 1, owner: f.id, mv: 1, at: 1 }; c.tomb = 0;
    // reclutar en casilla neutral la ocupa y consume el movimiento
    if (!HF.UNITS[type].naval && c.o !== f.id) { c.o = f.id; c.cap = 0; c.u.mv = 0; HF.supply(g); }
    if (f.human) g.stat.recruited++;
    HF.updateFog(g);
    return { ok: true };
  };
  HF.buildCells = function (g, b) {
    const f = g.f[g.cur], out = [], cost = HF.buildCost(g, f, b);
    for (const d of grid(g).list) {
      const c = g.cells[d.i];
      if (c.o !== f.id || !c.sup || !costOk(stockOf(f, c.comp), cost)) continue;
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
    if (f.human) g.stat.built++;
    HF.supply(g); HF.updateFog(g);
    return { ok: true };
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
        f.alive = false;
        for (const c of g.cells) if (c && c.o === f.id) { c.o = -1; c.cap = 0; c.u = null; c.sup = 0; }
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
    // fin de ronda
    for (const c of g.cells) if (c && c.tomb > 0) c.tomb--;
    const gr = grid(g), r = rnd(g), add = [];
    for (const d of gr.list) {
      const c = g.cells[d.i];
      if (c.b !== B.ARBOL) continue;
      for (const j of gr.nb[c.i]) { const n = g.cells[j]; if ((n.t === T.LLANO || n.t === T.COLINA) && !n.b && !n.u && r() < HF.CFG.treeSpreadChance) add.push(n.i); }
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
    o.cells = g.cells.map(c => { if (!c) return null; const d = { i: c.i, q: c.q, r: c.r }; for (const k of ['t', 'res', 'b', 'o', 'cap', 'tomb', 'deg', 'degBy', 'sup', 'conq']) if (c[k]) d[k] = c[k]; if (c.comp !== undefined) d.comp = c.comp; d.o = c.o; if (c.u) d.u = c.u; return d; });
    return o;
  };
  HF.deserialize = o => {
    const g = Object.assign({}, o); g.undo = [];
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
