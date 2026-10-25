(function (G) {
  const HF = G.HF, T = HF.T, B = HF.B;

  HF.newCell = c => ({ i: c.i, q: c.q, r: c.r, t: 0, res: 0, b: 0, o: -1, cap: 0, u: null, tomb: 0, deg: 0, sup: 0 });

  // Devuelve { grid, cells[], caps[] } sin propietarios jugables salvo los nacimientos.
  HF.generateMap = function (opt) {
    const R = opt.R, seed = opt.seed >>> 0, N = opt.factions, bio = HF.BIOMES[opt.biome] || HF.BIOMES.plains;
    const grid = HF.makeGrid(R), rnd = HF.rng(seed ^ 0x9e3779b9);
    const cells = grid.cells.map(c => c ? HF.newCell(c) : null);
    const L = grid.list.map(c => cells[c.i]);
    const nb = i => grid.nb[i].map(j => cells[j]);

    // altura con caída insular; en archipiélago, varias islas (una por capital + extras)
    const H = {}, M = {}, isArch = opt.biome === 'archipelago', MGa = HF.CFG.mapgen;
    const archOff = isArch ? HF.rng(seed ^ 0x51ed27)() * Math.PI * 2 : 0;
    const isl = [];
    if (isArch) {
      const ar = HF.rng(seed ^ 0x7a3c19);
      for (let k = 0; k < N; k++) { const a = archOff + 2 * Math.PI * k / N, rho = MGa.capitalRing * R; isl.push({ x: rho * Math.cos(a), y: rho * Math.sin(a), w: 1 }); }
      const minGap = R * MGa.archipelago.minGap;
      for (let t = 0; t < 1500; t++) {
        const a = ar() * Math.PI * 2, rho = Math.sqrt(ar()) * R * .9, x = rho * Math.cos(a), y = rho * Math.sin(a);
        if (isl.every(s => Math.hypot(s.x - x, s.y - y) >= minGap)) isl.push({ x, y, w: .8 + ar() * .4 });
      }
    }
    for (const c of L) {
      const x = c.q + c.r / 2, y = c.r * 0.866, d = Math.hypot(x, y) / R;
      if (isArch) {
        // la tierra son las celdas más cercanas a algún centro de isla: islas separadas por mar
        let m = 1e9; for (const s of isl) m = Math.min(m, Math.hypot(x - s.x, y - s.y) / s.w);
        H[c.i] = -m / R + (HF.fbm(x * .35, y * .35, seed, 3) - .5) * MGa.archipelago.noise;
      } else H[c.i] = HF.fbm(x * .22, y * .22, seed, 4) - Math.pow(d, 3) * .5;
      M[c.i] = HF.fbm(x * .18 + 50, y * .18 + 50, seed + 7, 3);
    }
    const ranked = L.slice().sort((a, b) => H[a.i] - H[b.i]);
    const n = L.length, nSea = Math.floor(n * bio.sea), nMtn = Math.floor(n * bio.mtn), nHill = Math.floor(n * bio.hill);
    ranked.forEach((c, k) => {
      if (k < nSea) c.t = T.MAR;
      else if (k >= n - nMtn) c.t = T.MONTANA;
      else if (k >= n - nMtn - nHill) c.t = T.COLINA;
    });
    for (const c of L) if (Math.max(Math.abs(c.q), Math.abs(c.r), Math.abs(c.q + c.r)) === R) c.t = T.MAR;

    // ríos: descenso desde montañas/colinas altas
    const srcs = L.filter(c => c.t === T.MONTANA).sort(() => rnd() - .5).slice(0, Math.max(1, Math.round(R / 3)));
    for (const s of srcs) {
      let cur = s, steps = 0;
      while (steps++ < R * 2) {
        const cand = nb(cur.i).filter(x => H[x.i] < H[cur.i]).sort((a, b) => H[a.i] - H[b.i]);
        if (!cand.length) break;
        cur = cand[0];
        if (cur.t === T.MAR) break;
        if (cur.t === T.LLANO || cur.t === T.COLINA) cur.t = T.RIO;
      }
    }

    // árboles por ruido + suavizado
    const nTree = Math.floor(n * bio.tree);
    const tr = L.filter(c => c.t === T.LLANO || c.t === T.COLINA).sort((a, b) => HF.fbm(b.q * .3, b.r * .3, seed + 3, 2) - HF.fbm(a.q * .3, a.r * .3, seed + 3, 2));
    tr.slice(0, nTree).forEach(c => { c.b = B.ARBOL; });
    for (const c of L) if (c.b === B.ARBOL && !nb(c.i).some(x => x.b === B.ARBOL)) c.b = 0;

    // recursos
    const MG = HF.CFG.mapgen;
    for (const c of L) {
      if (c.b) continue;
      const near = nb(c.i);
      const moist = M[c.i] + (near.some(x => x.t === T.RIO || x.t === T.MAR) ? .3 : 0);
      if (c.t === T.LLANO && moist >= MG.wheatMoisture && rnd() < MG.wheatChance) c.res = HF.RES.TRIGO;
      else if (c.t === T.COLINA && (near.some(x => x.t === T.MONTANA) || rnd() < MG.goldHillChance)) c.res = HF.RES.ORO;
    }
    for (const c of L) if ((c.t === T.LLANO || c.t === T.COLINA) && !c.res && rnd() < (c.t === T.COLINA ? MG.woodChance.COLINA : MG.woodChance.LLANO)) c.res = HF.RES.MADERA;

    // capitales
    const caps = [];
    const off = isArch ? archOff : rnd() * Math.PI * 2;
    for (let k = 0; k < N; k++) {
      const a = off + 2 * Math.PI * k / N, rho = MG.capitalRing * R;
      const tx = rho * Math.cos(a), ty = rho * Math.sin(a);
      let best = null, bd = 1e9;
      for (const c of L) {
        const x = c.q + c.r / 2, y = c.r * .866, d = Math.hypot(x - tx, y - ty);
        if (d < bd && c.t !== T.MAR && c.t !== T.MONTANA) { bd = d; best = c; }
      }
      caps.push(best.i);
    }
    // anillo de nacimiento
    caps.forEach((ci, k) => {
      const c = cells[ci];
      const ring = [c, ...nb(ci)];
      for (const x of ring) { x.t = T.LLANO; x.b = 0; x.res = 0; x.o = k; }
      c.b = B.CIUDAD; c.cap = 1;
      // recursos garantizados dentro de distancia 2
      const near = L.filter(x => HF.hexDist(x, c) <= MG.guaranteed.radius && x !== c);
      const need = (res, cnt, tf) => {
        let have = near.filter(x => x.res === res).length;
        for (const x of near) {
          if (have >= cnt) break;
          if (x.res === 0 && x.t !== T.MAR && x.t !== T.MONTANA && x.t !== T.RIO && tf(x)) { x.res = res; have++; }
        }
      };
      need(HF.RES.TRIGO, MG.guaranteed.wheat, x => x.t === T.LLANO && x.b === 0);
      need(HF.RES.MADERA, MG.guaranteed.wood, x => (x.t === T.LLANO || x.t === T.COLINA) && x.b === 0);
      if (!near.some(x => x.t === T.COLINA)) { const x = near.find(y => y.t === T.LLANO && !y.res && !y.b && y.o < 0); if (x) x.t = T.COLINA; }
      if (!near.some(x => x.res === HF.RES.ORO)) { const x = near.find(y => y.t === T.COLINA && y.o < 0); if (x) x.res = HF.RES.ORO; }
    });

    // conectividad terrestre entre capitales: se talla un puente de llano
    const passable = c => c.t !== T.MAR && c.t !== T.MONTANA;
    const reach = from => {
      const seen = new Set([from]), q = [from];
      while (q.length) { const x = q.pop(); for (const y of grid.nb[x]) if (!seen.has(y) && passable(cells[y])) { seen.add(y); q.push(y); } }
      return seen;
    };
    for (let k = 1; k < caps.length; k++) {
      const s = reach(caps[0]);
      if (s.has(caps[k])) continue;
      const a = cells[caps[0]], b = cells[caps[k]];
      // línea recta hexagonal entre ambas
      const d = HF.hexDist(a, b);
      for (let s2 = 0; s2 <= d; s2++) {
        const t = d ? s2 / d : 0;
        let fq = a.q + (b.q - a.q) * t, fr = a.r + (b.r - a.r) * t, fs = -fq - fr;
        let rq = Math.round(fq), rr = Math.round(fr), rs = Math.round(fs);
        const dq = Math.abs(rq - fq), dr = Math.abs(rr - fr), ds = Math.abs(rs - fs);
        if (dq > dr && dq > ds) rq = -rr - rs; else if (dr > ds) rr = -rq - rs;
        const c = cells[grid.idx(rq, rr)];
        if (c && !c.b && (c.t === T.MAR || c.t === T.MONTANA)) { c.t = T.LLANO; }
        else if (c && (c.t === T.MAR || c.t === T.MONTANA)) { c.t = T.LLANO; c.b = 0; }
      }
    }

    // pueblos neutrales
    const nTown = N <= 2 ? 2 : Math.min(6, N + 1);
    const cand = L.filter(c => c.t === T.LLANO && !c.b && c.o < 0 && caps.every(ci => HF.hexDist(c, cells[ci]) >= 4)).sort(() => rnd() - .5);
    const placed = [];
    for (const c of cand) {
      if (placed.length >= nTown) break;
      if (placed.every(p => HF.hexDist(p, c) >= 4)) { c.b = B.PUEBLO; placed.push(c); }
    }
    return { grid, cells, caps };
  };
})(typeof window !== 'undefined' ? window : globalThis);
