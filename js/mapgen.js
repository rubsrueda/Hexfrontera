(function (G) {
  const HF = G.HF, T = HF.T, B = HF.B;

  HF.newCell = c => ({ i: c.i, q: c.q, r: c.r, t: 0, res: 0, b: 0, o: -1, cap: 0, city: '', u: null, tomb: 0, deg: 0, sup: 0, br: 0 });

  // Devuelve { grid, cells[], caps[] } sin propietarios jugables salvo los nacimientos.
  HF.generateMap = function (opt) {
    const R = opt.R, seed = opt.seed >>> 0, N = opt.factions, bio = HF.BIOMES[opt.biome] || HF.BIOMES.plains;
    const grid = HF.makeGrid(R), rnd = HF.rng(seed ^ 0x9e3779b9);
    const cells = grid.cells.map(c => c ? HF.newCell(c) : null);
    const L = grid.list.map(c => cells[c.i]);
    const nb = i => grid.nb[i].map(j => cells[j]);
    const MG = HF.CFG.mapgen;
    const MGa = HF.CFG.mapgen;
    const isEdge = c => Math.max(Math.abs(c.q), Math.abs(c.r), Math.abs(c.q + c.r)) === R;

    // ---- 1. Elevación + humedad (como el original: caída monótona al borde,
    //         por eso los ríos descienden siempre hasta el mar) ----
    const H = {}, M = {}, isArch = opt.biome === 'archipelago';
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
        let m = 1e9; for (const s of isl) m = Math.min(m, Math.hypot(x - s.x, y - s.y) / s.w);
        H[c.i] = -m / R + (HF.fbm(x * .35, y * .35, seed, 3) - .5) * MGa.archipelago.noise;
      } else {
        // caída radial (d^3) + ruido de costa suave + crestas montañosas.
        // El término d^3 domina el borde, así el relieve baja hacia el mar.
        const coastNoise = (HF.fbm(x * .15, y * .15, seed + 50, 3) - .5) * .18;
        const chains = .22 * HF.fbm(x * .05 + 40, y * .05 + 40, seed + 34, 4);
        H[c.i] = HF.fbm(x * .22, y * .22, seed, 4) - Math.pow(d, 3) * .5 + coastNoise + chains;
      }
      M[c.i] = HF.fbm(x * .18 + 50, y * .18 + 50, seed + 7, 3);
    }

    // ---- 2. Mar (borde siempre mar) y lagos por umbral + flood-fill ----
    const hs = L.map(c => H[c.i]).sort((a, b) => a - b);
    const seaLevel = hs[Math.min(hs.length - 1, Math.floor(hs.length * bio.sea))];
    for (const c of L) if (H[c.i] < seaLevel || isEdge(c)) c.t = T.MAR;
    const sea = new Set();
    {
      const q = [];
      for (const c of L) if (isEdge(c)) { sea.add(c.i); q.push(c.i); }
      let h = 0;
      while (h < q.length) {
        const x = q[h++];
        for (const y of grid.nb[x]) {
          const nc = cells[y];
          if (nc && nc.t === T.MAR && !sea.has(y)) { sea.add(y); q.push(y); }
        }
      }
    }

    // ---- 3. Montañas y colinas por rango entre la TIERRA ----
    const land = L.filter(c => c.t !== T.MAR);
    const landSorted = land.slice().sort((a, b) => H[b.i] - H[a.i]);
    const nMtn = Math.floor(L.length * bio.mtn);
    const nHill = Math.floor(L.length * bio.hill);
    landSorted.slice(0, nMtn).forEach(c => { c.t = T.MONTANA; });
    landSorted.slice(nMtn, nMtn + nHill).forEach(c => { c.t = T.COLINA; });

    // ---- 4. Ríos: descienden de las montañas hasta el mar ----
    // Distancia BFS desde el mar evitando montañas: el río rodea las montañas
    // (nunca las atraviesa) y baja hacia el mar de forma garantizada.
    const distSea = {};
    {
      const q = [];
      for (const c of L) if (sea.has(c.i)) { distSea[c.i] = 0; q.push(c.i); }
      let h = 0;
      while (h < q.length) {
        const x = q[h++];
        for (const y of grid.nb[x]) {
          const nc = cells[y];
          if (nc && nc.t !== T.MAR && nc.t !== T.MONTANA && distSea[y] === undefined) { distSea[y] = distSea[x] + 1; q.push(y); }
        }
      }
    }
    // Origen de río: montañas con salida (vecina llano/colina) para que el río
    // nazca y baje; selección aleatoria para conservar variedad entre semillas.
    const mtnCand = L.filter(c => c.t === T.MONTANA && nb(c.i).some(x => x.t !== T.MAR && x.t !== T.MONTANA));
    const srcs = mtnCand.sort(() => rnd() - .5).slice(0, Math.max(1, Math.round(R / 3)));
    for (const s of srcs) {
      let cur = s, steps = 0;
      while (steps++ < R * 2) {
        let next = null, bd = 1e9, bh = 1e9;
        for (const j of grid.nb[cur.i]) {
          const nc = cells[j];
          if (!nc || distSea[j] === undefined) continue;
          if (distSea[j] < bd || (distSea[j] === bd && H[j] < bh)) { bd = distSea[j]; bh = H[j]; next = nc; }
        }
        if (!next) break;
        if (distSea[cur.i] !== undefined && bd >= distSea[cur.i]) break;
        cur = next;
        if (sea.has(cur.i)) break;
        if (cur.t === T.LLANO || cur.t === T.COLINA) cur.t = T.RIO;
      }
    }

    // ---- 5. Lagos interiores (1–2, agua interior) ----
    if (!isArch) {
      const nLake = R <= 10 ? 1 : 2;
      const lr = HF.rng(seed ^ 0x1a2b3c);
      const placed = [];
      for (let t = 0; t < 300 && placed.length < nLake; t++) {
        const c = L[Math.floor(lr() * L.length)];
        if (!c || c.t !== T.LLANO) continue;                        // solo en llano
        if (nb(c.i).some(x => sea.has(x.i))) continue;               // no tocar la costa
        if (placed.some(p => HF.hexDist(p, c) < 6)) continue;
        c.t = T.MAR;
        placed.push(c);
      }
    }

    // ---- 6. Árboles ----
    const nTree = Math.floor(L.length * bio.tree);
    const tr = L.filter(c => c.t === T.LLANO || c.t === T.COLINA).sort((a, b) => HF.fbm(b.q * .3, b.r * .3, seed + 3, 2) - HF.fbm(a.q * .3, a.r * .3, seed + 3, 2));
    tr.slice(0, nTree).forEach(c => { c.b = B.ARBOL; });
    for (const c of L) if (c.b === B.ARBOL && !nb(c.i).some(x => x.b === B.ARBOL)) c.b = 0;

    // ---- 6. Recursos ----
    for (const c of L) {
      if (c.b) continue;
      const near = nb(c.i);
      const moist = M[c.i] + (near.some(x => x.t === T.RIO || x.t === T.MAR) ? .3 : 0);
      if (c.t === T.LLANO && moist >= MG.wheatMoisture && rnd() < MG.wheatChance) c.res = HF.RES.TRIGO;
      else if (c.t === T.COLINA && (near.some(x => x.t === T.MONTANA) || rnd() < MG.goldHillChance)) c.res = HF.RES.ORO;
    }
    for (const c of L) if ((c.t === T.LLANO || c.t === T.COLINA) && !c.res && rnd() < (c.t === T.COLINA ? MG.woodChance.COLINA : MG.woodChance.LLANO)) c.res = HF.RES.MADERA;

    // ---- 7. Capitales: interiores (al menos 1 casilla de la costa) ----
    const caps = [];
    const off = isArch ? archOff : rnd() * Math.PI * 2;
    const inland = c => c.t !== T.MAR && c.t !== T.MONTANA && c.t !== T.RIO && !nb(c.i).some(x => x.t === T.MAR);
    if (isArch) {
      for (let k = 0; k < N; k++) {
        const a = off + 2 * Math.PI * k / N, rho = MG.capitalRing * R;
        const tx = rho * Math.cos(a), ty = rho * Math.sin(a);
        let best = null, bd = 1e9;
        for (const c of L) {
          const x = c.q + c.r / 2, y = c.r * .866, dd = Math.hypot(x - tx, y - ty);
          if (dd < bd && c.t !== T.MAR && c.t !== T.MONTANA) { bd = dd; best = c; }
        }
        if (best) caps.push(best.i);
      }
    } else {
      for (let k = 0; k < N; k++) {
        const a = off + 2 * Math.PI * k / N, rho = MG.capitalRing * R;
        const tx = rho * Math.cos(a), ty = rho * Math.sin(a);
        let best = null, bd = 1e9;
        for (const c of L) {
          if (!inland(c)) continue;
          const x = c.q + c.r / 2, y = c.r * .866, dd = Math.hypot(x - tx, y - ty);
          if (dd < bd) { bd = dd; best = c; }
        }
        if (best) caps.push(best.i);
      }
    }
    // anillo de nacimiento (nunca aplana el mar)
    caps.forEach((ci, k) => {
      const c = cells[ci];
      const ring = [c, ...nb(ci).filter(x => x.t !== T.MAR)];
      for (const x of ring) { x.t = T.LLANO; x.b = 0; x.res = 0; x.o = k; }
      c.b = B.CIUDAD; c.cap = 1;
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

    // ---- 8. Conectividad: pasos de montaña entre capitales (no talla el mar) ----
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
      const d = HF.hexDist(a, b);
      for (let s2 = 0; s2 <= d; s2++) {
        const t = d ? s2 / d : 0;
        let fq = a.q + (b.q - a.q) * t, fr = a.r + (b.r - a.r) * t, fs = -fq - fr;
        let rq = Math.round(fq), rr = Math.round(fr), rs = Math.round(fs);
        const dq = Math.abs(rq - fq), dr = Math.abs(rr - fr), ds = Math.abs(rs - fs);
        if (dq > dr && dq > ds) rq = -rr - rs; else if (dr > ds) rr = -rq - rs;
        const c = cells[grid.idx(rq, rr)];
        if (c && c.t === T.MONTANA) { c.t = T.LLANO; c.b = 0; }
      }
    }

    // ---- 8b. Garantía de jugabilidad: presupuesto de celdas construibles ----
    // Si el terreno consume demasiado espacio (mar, montañas, ríos, lagos), se
    // recupera montaña → colina para asegurar un mínimo construible por facción.
    const minBuild = (MG.minPlayablePerFaction || 0) * N;
    if (minBuild > 0) {
      let buildable = 0;
      for (const c of L) if (c.t === T.LLANO || c.t === T.COLINA) buildable++;
      if (buildable < minBuild) {
        const mtn = L.filter(c => c.t === T.MONTANA).sort((a, b) => H[a.i] - H[b.i]);
        for (let i = 0; i < mtn.length && buildable + i < minBuild; i++) { mtn[i].t = T.COLINA; mtn[i].b = 0; }
      }
    }

    // ---- 9. Pueblos neutrales ----
    const nTown = N <= 2 ? 2 : Math.min(6, N + 1);
    const isCoast = c => nb(c.i).some(x => sea.has(x.i));
    const cand = L.filter(c => c.t === T.LLANO && !c.b && c.o < 0 && caps.every(ci => HF.hexDist(c, cells[ci]) >= 4))
      .sort(() => rnd() - .5);
    const ordered = cand.filter(isCoast).concat(cand.filter(c => !isCoast(c)));
    const placed = [];
    for (const c of ordered) {
      if (placed.length >= nTown) break;
      if (placed.every(p => HF.hexDist(p, c) >= 4)) { c.b = B.PUEBLO; placed.push(c); }
    }
    return { grid, cells, caps };
  };
})(typeof window !== 'undefined' ? window : globalThis);
