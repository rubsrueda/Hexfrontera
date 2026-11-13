/* FEDERATI · IA estratégica.
   Sustituye la heurística antigua (avanzar siempre hacia el enemigo y construir
   campamentos sin criterio) por un ciclo de decisión en cinco capas:

     1. ANÁLISIS   campos de distancia, componentes de tierra, agua navegable,
                   amenaza proyectada por cada unidad rival y defensa real de
                   cada casilla.
     2. ESTRATEGIA facción enemiga prioritaria, postura (atacar/defender/
                   expandirse), guarniciones y plan anfibio.
     3. TÁCTICA    puntuación de TODAS las opciones del motor (movimiento,
                   ataque, disparo, asedio, tala, saqueo, doctrina...) con
                   penalización por casillas donde la unidad moriría.
     4. ECONOMÍA   construcción de calzadas, provincias, bastiones y ciudades;
                   gestión de árboles, banca de la capital y préstamos.
     5. NAVAL      transporte coordinado, playas seguras, escolta, tormentas
                   y evacuación de cabezas de playa condenadas.

   Reglas de oro:
     · La IA nunca ataca con A <= D (el motor lo prohíbe) ni avanza por una
       casilla donde la suma de ataques rivales supera su defensa, salvo que
       el objetivo valga la pena (ciudad, provincia, victoria).
     · Los edificios son cobertura: una unidad amenazada retrocede a su
       ciudad/bastión en lugar de morir en campo abierto.
     · Cada fase está aislada; un fallo se registra y el turno continúa.
*/
(function (G) {
  'use strict';
  const HF = G.HF, B = HF.B, T = HF.T;
  HF.aiBuild = '2026-11-13-6';
  const BIG = 999, MAX_ROUNDS = 2;

  // =====================================================================
  // 0. Utilidades
  // =====================================================================
  const has = (f, tag) => !!(f && f.tags && f.tags.indexOf(tag) >= 0);
  const grid = g => g._grid || (g._grid = HF.makeGrid(g.R));
  const isWater = c => !!c && (c.t === T.MAR || c.t === T.RIO);
  const isSettle = c => !!c && HF.isSettle(c.b);
  const rankOf = c => (c && HF.RANK[c.b]) || 0;
  const uOf = (g, i) => (g.cells[i] ? g.cells[i].u : null);
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const seasonOf = g => (HF.season ? HF.season(g) : 0);
  const isWinter = g => seasonOf(g) === 3;
  const isNavigable = (g, c) => !!c && (c.t === T.MAR || (c.t === T.RIO && !isWinter(g)));
  const HEX = (a, b) => HF.hexDist(a, b);

  function fail(where, e) {
    try {
      if (HF.dipError) HF.dipError('ai.' + where, e);
      else if (typeof console !== 'undefined') console.error('[IA] ' + where + ':', e);
    } catch (_) { /* nunca romper el turno por un fallo de registro */ }
  }

  function eachCell(g, fn) {
    const gr = grid(g), list = gr.list;
    for (let k = 0; k < list.length; k++) {
      const i = list[k].i, c = g.cells[i];
      if (c) fn(c, i);
    }
  }

  // Vecinos a distancia <= r (incluye el origen con d=0).
  function eachWithin(g, start, r, fn) {
    fn(start, 0);
    if (r <= 0) return;
    const gr = grid(g), seen = new Set([start]);
    let ring = [start];
    for (let d = 1; d <= r; d++) {
      const next = [];
      for (let k = 0; k < ring.length; k++) {
        const nb = gr.nb[ring[k]];
        if (!nb) continue;
        for (let j = 0; j < nb.length; j++) {
          const y = nb[j];
          if (seen.has(y)) continue;
          seen.add(y); next.push(y); fn(y, d);
        }
      }
      ring = next;
    }
  }

  function countAdjacent(g, i, pred) {
    const nb = grid(g).nb[i] || [];
    let n = 0;
    for (let k = 0; k < nb.length; k++) {
      const c = g.cells[nb[k]];
      if (c && pred(c)) n++;
    }
    return n;
  }

  function coastNeighbor(g, i) {
    const nb = grid(g).nb[i] || [];
    for (let k = 0; k < nb.length; k++) {
      const c = g.cells[nb[k]];
      if (c && isWater(c)) return nb[k];
    }
    return -1;
  }

  function safePreview(g, f, comp) {
    try {
      const p = HF.preview(g, f, comp);
      if (p && p.inc) return p;
    } catch (e) { fail('preview', e); }
    const inc = (() => { try { return HF.income(g, f, comp) || {}; } catch (e) { return {}; } })();
    return { inc: inc, upkeep: 0, upkeepGold: 0, loan: 0, netFood: (inc.food || 0), netGold: (inc.gold || 0) };
  }

  function stockOf(g, f, comp) {
    return (f.stock && f.stock[comp]) || { gold: 0, food: 0, wood: 0 };
  }

  // =====================================================================
  // 1. Mapa: componentes de tierra y agua
  // =====================================================================
  function landComponents(g) {
    if (g._aiComp && g._aiComp.length === g.cells.length) return g._aiComp;
    const gr = grid(g), comp = new Int16Array(g.cells.length).fill(-1);
    let n = 0;
    const list = gr.list;
    for (let k = 0; k < list.length; k++) {
      const i = list[k].i, c = g.cells[i];
      if (!c || comp[i] >= 0 || c.t === T.MAR) continue;
      const q = [i]; comp[i] = n;
      for (let h = 0; h < q.length; h++) {
        const x = q[h], nb = gr.nb[x] || [];
        for (let j = 0; j < nb.length; j++) {
          const y = nb[j], nc = g.cells[y];
          if (nc && comp[y] < 0 && nc.t !== T.MAR) { comp[y] = n; q.push(y); }
        }
      }
      n++;
    }
    g._aiComp = comp; g._aiCompN = n;
    return comp;
  }

  // Distancia por tierra hasta territorio enemigo (o pueblo neutral).
  // Es el gradiente de avance: cuanto menor, más cerca del objetivo.
  function distField(g, me) {
    const gr = grid(g), len = g.cells.length;
    const df = new Int16Array(len).fill(BIG), q = [];
    eachCell(g, (c, i) => {
      if ((c.o >= 0 && c.o !== me) || (c.o === -1 && isSettle(c))) { df[i] = 0; q.push(i); }
    });
    if (!q.length) eachCell(g, (c, i) => { if (c.u && c.u.owner !== me) { df[i] = 0; q.push(i); } });
    for (let h = 0; h < q.length; h++) {
      const x = q[h], nd = df[x] + 1, nb = gr.nb[x] || [];
      for (let j = 0; j < nb.length; j++) {
        const y = nb[j], n = g.cells[y];
        if (!n || df[y] !== BIG || n.t === T.MAR) continue;
        df[y] = nd; q.push(y);
      }
    }
    return df;
  }

  // Distancia por agua desde nuestras costas (0 = agua junto a tierra propia).
  function waterDistFromCoast(g, me) {
    const gr = grid(g), len = g.cells.length;
    const wd = new Int16Array(len).fill(BIG), q = [];
    eachCell(g, (c, i) => {
      if (c.o !== me) return;
      const nb = gr.nb[i] || [];
      for (let j = 0; j < nb.length; j++) {
        const n = g.cells[nb[j]];
        if (n && isNavigable(g, n) && wd[nb[j]] === BIG) { wd[nb[j]] = 0; q.push(nb[j]); }
      }
    });
    for (let h = 0; h < q.length; h++) {
      const x = q[h], nd = wd[x] + 1, nb = gr.nb[x] || [];
      for (let j = 0; j < nb.length; j++) {
        const y = nb[j], n = g.cells[y];
        if (n && wd[y] === BIG && isNavigable(g, n)) { wd[y] = nd; q.push(y); }
      }
    }
    return wd;
  }

  // Campo de agua hacia una lista de casillas de tierra: 0 en el agua que las
  // toca. Sirve para navegar a una cabeza de playa concreta.
  function waterFieldTo(g, landCells) {
    const gr = grid(g), len = g.cells.length;
    const wf = new Int16Array(len).fill(BIG), q = [];
    for (let k = 0; k < landCells.length; k++) {
      const nb = gr.nb[landCells[k]] || [];
      for (let j = 0; j < nb.length; j++) {
        const y = nb[j], n = g.cells[y];
        if (n && isNavigable(g, n) && wf[y] === BIG) { wf[y] = 0; q.push(y); }
      }
    }
    for (let h = 0; h < q.length; h++) {
      const x = q[h], nd = wf[x] + 1, nb = gr.nb[x] || [];
      for (let j = 0; j < nb.length; j++) {
        const y = nb[j], n = g.cells[y];
        if (n && wf[y] === BIG && isNavigable(g, n)) { wf[y] = nd; q.push(y); }
      }
    }
    return q.length ? wf : null;
  }

  // Compatibilidad con versiones anteriores: campo de agua hacia cualquier
  // costa útil (enemiga o propia) y primer paso de una ruta naval.
  function waterField(g, me, type) {
    const gr = grid(g), len = g.cells.length;
    const winter = isWinter(g);
    const comp = landComponents(g), hostileMass = new Set();
    eachCell(g, (c, i) => { if (c.o >= 0 && c.o !== me) hostileMass.add(comp[i]); });
    const useful = [];
    eachCell(g, (c, i) => {
      if (!isWater(c) || (winter && c.t === T.RIO)) return;
      const nb = gr.nb[i] || [];
      for (let j = 0; j < nb.length; j++) {
        const n = g.cells[nb[j]];
        if (!n || isWater(n)) continue;
        const target = n.o !== me || hostileMass.has(comp[nb[j]]);
        if (target && (n.b === B.ARBOL || HF.canStep({ type: type || 'CAB' }, n))) { useful.push(i); return; }
      }
    });
    if (!useful.length) return null;
    return waterFieldTo(g, useful);
  }

  function navStep(g, from, wf) {
    if (!wf) return null;
    const gr = grid(g), prev = new Map([[from, -1]]), q = [from], winter = isWinter(g);
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
      const nb = gr.nb[x] || [];
      for (let j = 0; j < nb.length; j++) {
        const y = nb[j], n = g.cells[y];
        if (prev.has(y) || !isNavigable(g, n)) continue;
        if (n.u || (winter && n.t === T.RIO)) continue;
        prev.set(y, x); q.push(y);
      }
    }
    return null;
  }

  // =====================================================================
  // 2. Defensa real por casilla (réplica acotada de HF.defenseAt)
  // =====================================================================
  function maxFuse(g, owner) {
    const f = g.f[owner];
    return has(f, 'ASCETIC_COMMUNE') ? HF.CFG.fuseMaxAscetic : HF.CFG.fuseMax;
  }

  function unitBaseDef(g, u, c) {
    const f = g.f[u.owner], K = HF.CFG.combat, D = HF.UNITS[u.type];
    if (!D) return 0;
    if (u.type === 'INF' || u.type === 'ENG') {
      let d = u.tier >= HF.CFG.doctrine.pretorianTier ? HF.CFG.doctrine.pretorianDef : u.tier;
      if (c.t === T.COLINA) d += K.hillDef;
      if (c.t === T.MONTANA) d += K.mountainDef;
      if (has(f, 'TESTUDO_SHIELD')) {
        let n = 0;
        const nb = grid(g).nb[c.i] || [];
        for (let j = 0; j < nb.length; j++) {
          const x = g.cells[nb[j]];
          if (x && x.u && x.u.owner === u.owner && (x.u.type === 'INF' || x.u.type === 'ENG')) n++;
        }
        d += Math.min(K.testudoMax, n);
      }
      return d;
    }
    if (u.type === 'CAB' && has(f, 'KNIGHTLY_ORDER')) return D.defKnight + u.tier - 1;
    return (D.def || 0) + u.tier - 1;
  }

  // u opcional: defensa que tendría la casilla si u la ocupase. Si ya hay una
  // unidad propia, se usa la fórmula exacta del motor.
  function cellDefense(g, ci, u) {
    const c = g.cells[ci];
    if (!c) return 0;
    if (u && HF.isEncircled(g, ci)) return 0;
    if (c.u && c.u.owner === (u ? u.owner : undefined) && c.lastStand && c.lastStandTurn === g.turn) {
      return HF.CFG.doctrine.lastStandDef;
    }
    const bd = isSettle(c.b) ? HF.BDEF[c.b] : 0;
    let base = 0;
    if (u) { base = unitBaseDef(g, u, c); if (bd > 0) base += bd; }
    else base = bd;
    if (c.o >= 0) {
      const nb = grid(g).nb[ci] || [];
      for (let j = 0; j < nb.length; j++) {
        const n = g.cells[nb[j]];
        if (!n || n.o !== c.o) continue;
        if (n.u) base = Math.max(base, unitBaseDef(g, n.u, n));
        if (n.b === B.BASTION) base = Math.max(base, HF.CFG.combat.bastionAura);
      }
    }
    return Math.max(0, base - (c.deg || 0));
  }

  // ¿Una unidad con esta defensa muere ante este ataque? Empate: solo gana el
  // atacante de nivel máximo (regla beats() del motor).
  function lethal(def, atk, elite) {
    return atk > def || (atk === def && !!elite && atk > 0);
  }

  // =====================================================================
  // 3. Amenaza proyectada
  // =====================================================================
  function attackPowerOf(g, u, target, from) {
    if (!u) return 0;
    const D = HF.UNITS[u.type];
    if (!D) return 0;
    if (u.type === 'INF' || u.type === 'ENG') {
      return u.tier >= HF.CFG.doctrine.pretorianTier ? HF.CFG.doctrine.pretorianAtk : u.tier;
    }
    let a = (D.atk || 0) + u.tier - 1;
    if (u.type === 'CAB' && target && target.t === T.LLANO) {
      const tf = target.o >= 0 ? g.f[target.o] : null;
      if (!(tf && has(tf, 'PIKE_WALL'))) a += HF.CFG.combat.chargeBonus;
    }
    if (u.debuff && u.debuffTurn === g.turn) a -= u.debuff;
    return Math.max(0, a);
  }

  function attackRangeOf(g, u) {
    try {
      const st = HF.unitStats(g, u.type, u.tier, u.owner);
      return Math.max(1, st.atkRange || 1);
    } catch (e) { return 1; }
  }

  function shootRangeOf(g, u, c) {
    if (u.type === 'ARC') return c && c.t === T.COLINA ? HF.UNITS.ARC.shootHill : HF.UNITS.ARC.shoot;
    if (u.type === 'SIE') return HF.UNITS.SIE.shoot || 0;
    if (u.type === 'BAR') return HF.UNITS.BAR.shoot || 0;
    return 0;
  }

  // Proyecta lo que cada unidad rival puede golpear en su próximo turno.
  //   danger[t]      mayor ataque cuerpo a cuerpo/asedio que alcanza t
  //   dangerNow[t]   ataque que alcanza t sin moverse
  //   elite[t]       alguna de esas amenazas es de nivel máximo (gana empates)
  //   shoot[t]       disparos que degradan la defensa de t
  //   attackers[t]   número de unidades rivales que pueden golpear t
  //   navalDanger[t] mayor ataque de barco rival que alcanza t
  function buildThreat(g, me) {
    const len = g.cells.length, gr = grid(g);
    const danger = new Int16Array(len), dangerNow = new Int16Array(len);
    const elite = new Uint8Array(len), shoot = new Int16Array(len), attackers = new Uint8Array(len);
    const navalDanger = new Int16Array(len);

    eachCell(g, (c, ei) => {
      const eu = c.u;
      if (!eu || eu.owner === me) return;
      const ef = g.f[eu.owner];
      const isBar = eu.type === 'BAR';
      const move = Math.max(0, HF.unitRange(g, eu, c));
      const ar = attackRangeOf(g, eu);
      const sr = shootRangeOf(g, eu, c);
      const base = attackPowerOf(g, eu, null, ei);
      const eliteAtk = eu.tier >= maxFuse(g, eu.owner);

      // Casillas alcanzables como origen del golpe.
      const dist = new Map([[ei, 0]]), q = [ei];
      const passable = n => isBar ? isNavigable(g, n) : (n.t !== T.MAR);
      for (let h = 0; h < q.length; h++) {
        const x = q[h], dx = dist.get(x);
        if (dx >= move) continue;
        const nb = gr.nb[x] || [];
        for (let j = 0; j < nb.length; j++) {
          const y = nb[j], n = g.cells[y];
          if (!n || dist.has(y) || !passable(n)) continue;
          if (n.u && n.u.owner !== eu.owner) continue;      // no atraviesa rivales
          if (!isBar && !HF.canStep(eu, n, ef)) continue;
          dist.set(y, dx + 1); q.push(y);
        }
      }

      for (let h = 0; h < q.length; h++) {
        const s = q[h], isNow = s === ei;
        // Golpe cuerpo a cuerpo / abordaje.
        eachWithin(g, s, ar, t => {
          if (t === s) return;
          const tc = g.cells[t];
          if (!tc) return;
          if (isBar) {
            if (!isWater(tc)) return;
            const A = base;
            if (A > navalDanger[t]) navalDanger[t] = A;
          } else {
            if (tc.t === T.MAR) return;
            const A = attackPowerOf(g, eu, tc, s);
            if (A > danger[t]) danger[t] = A;
            if (isNow && A > dangerNow[t]) dangerNow[t] = A;
            if (eliteAtk && A >= danger[t]) elite[t] = 1;
            if (attackers[t] < 255) attackers[t]++;
          }
        });
        // Disparo: degrada defensa (ARC/SIE/BAR con shoot).
        if (sr > 0) {
          eachWithin(g, s, sr, t => {
            if (t === s) return;
            const tc = g.cells[t];
            if (!tc) return;
            if (isBar) {
              if (!isWater(tc)) return;
              if (navalDanger[t] < 1) navalDanger[t] = 1;
            } else {
              if (tc.t === T.MAR) { if (navalDanger[t] < 1) navalDanger[t] = 1; return; }
              shoot[t]++;
              if (isNow) shoot[t]++;
            }
          });
        }
      }

      // Troneras de muralla: bastión enemigo degrada a 2 casillas una vez/turno.
      if (!isBar && c.b === B.BASTION && c.o === eu.owner && has(ef, 'WALL_EMBRASURES')) {
        eachWithin(g, ei, 2, t => {
          if (t === ei) return;
          const tc = g.cells[t];
          if (tc && HF.hexDist(c, tc) === 2) shoot[t]++;
        });
      }
    });
    return { danger, dangerNow, elite, shoot, attackers, navalDanger };
  }

  // =====================================================================
  // 4. Análisis global de la facción
  // =====================================================================
  function canAttackFaction(g, me, other) {
    try {
      if (!HF.Diplomacy || !HF.Diplomacy.canAttack) return true;
      const r = HF.Diplomacy.canAttack(g, me, other, 0, 0);
      return !r || r.allowed !== false;
    } catch (e) { return true; }
  }

  function dipThreat(g, me, other) {
    try { return (HF.Diplomacy && HF.Diplomacy.threatOf) ? HF.Diplomacy.threatOf(g, me, other) : 0; }
    catch (e) { return 0; }
  }

  function unitPower(g, c) {
    const u = c.u;
    if (!u) return 0;
    const D = HF.UNITS[u.type];
    if (!D) return 0;
    const atk = (u.type === 'INF' || u.type === 'ENG')
      ? (u.tier >= HF.CFG.doctrine.pretorianTier ? HF.CFG.doctrine.pretorianAtk : u.tier)
      : (D.atk || 0) + u.tier - 1;
    return atk + unitBaseDef(g, u, c);
  }

  function chooseEnemy(g, me, ctx) {
    let best = null, bestScore = -Infinity;
    const preferred = (g.f[me] && g.f[me].diplomacy && g.f[me].diplomacy.preferredTargets) || [];
    for (let k = 0; k < g.f.length; k++) {
      const o = g.f[k];
      if (!o || !o.alive || o.id === me) continue;
      if (!canAttackFaction(g, me, o.id)) continue;
      let power = 0, cities = 0, towns = 0, terr = 0;
      eachCell(g, (c) => {
        if (c.o !== o.id) return;
        terr++;
        if (c.b === B.CIUDAD) cities++;
        else if (c.b === B.PUEBLO || c.b === B.BASTION) towns++;
        if (c.u) power += unitPower(g, c);
      });
      // Distancia mínima real entre asentamientos propios y territorio rival.
      let minDist = BIG;
      eachCell(g, (c) => {
        if (c.o !== o.id) return;
        for (let a = 0; a < ctx.mySettles.length; a++) {
          const s = g.cells[ctx.mySettles[a]];
          const d = HEX(s, c);
          if (d < minDist) minDist = d;
        }
      });
      let score = 40 - power * 0.55 - minDist * 3.2 + cities * 14 + towns * 4 + dipThreat(g, me, o.id) * 0.15;
      if (preferred.indexOf(o.id) >= 0) score += 18;
      if (cities === 0) score -= 10;          // casi eliminado: rematar
      if (terr < 3) score += 12;
      if (score > bestScore) { bestScore = score; best = o.id; }
    }
    return best;
  }

  function buildGuardMap(g, me, ctx) {
    const guard = Object.create(null);
    for (let k = 0; k < ctx.mySettles.length; k++) {
      const ci = ctx.mySettles[k], c = g.cells[ci];
      let near = BIG, foes = 0;
      for (let j = 0; j < ctx.enemyUnits.length; j++) {
        const d = HEX(c, g.cells[ctx.enemyUnits[j]]);
        if (d < near) near = d;
        if (d <= 3) foes++;
      }
      // Solo se guarnece lo que está cerca de un enemigo. Antes la capital
      // siempre generaba guardia y las unidades se quedaban dando vueltas
      // alrededor de ella en vez de expandirse por recursos.
      if (near > 6) continue;
      let p = 0;
      if (!c.u) p += c.b === B.CIUDAD ? 14 : c.b === B.BASTION ? 10 : 6;
      if (c.b === B.CIUDAD) p += 6;
      if (c.cap) p += 5;
      p += Math.max(0, 5 - near) * 2;
      p += Math.min(9, foes * 3);
      // Unidades navales enemigas cerca de una isla también amenazan la costa.
      for (let j = 0; j < ctx.enemyShips.length; j++) {
        if (HEX(c, g.cells[ctx.enemyShips[j]]) <= 5) p += 4;
      }
      if (p > 0) guard[ci] = Math.min(18, p);
    }
    return guard;
  }

  function analyze(g, me) {
    const f = g.f[me];
    const gr = grid(g);
    const comp = landComponents(g);
    const df = distField(g, me);
    const waterDist = waterDistFromCoast(g, me);
    // Distancia por tierra propia hasta la costa: sirve para llevar tropas al
    // punto de embarque antes de que exista el barco.
    const coastDist = new Int16Array(g.cells.length).fill(BIG);
    {
      const q = [];
      eachCell(g, (c, i) => {
        if (c.o !== me) return;
        if (coastNeighbor(g, i) >= 0) { coastDist[i] = 0; q.push(i); }
      });
      for (let h = 0; h < q.length; h++) {
        const x = q[h], nd = coastDist[x] + 1, nb = gr.nb[x] || [];
        for (let j = 0; j < nb.length; j++) {
          const y = nb[j], n = g.cells[y];
          if (!n || n.o !== me || n.t === T.MAR || coastDist[y] !== BIG) continue;
          coastDist[y] = nd; q.push(y);
        }
      }
    }
    const threat = buildThreat(g, me);

    const myComps = new Set(), myUnits = [], enemyUnits = [], myShips = [], enemyShips = [];
    const mySettles = [], myCities = [], enemySettles = [], enemyCities = [];
    eachCell(g, (c, i) => {
      if (c.o === me) myComps.add(comp[i]);
      if (c.u) {
        if (c.u.owner === me) { myUnits.push(i); if (c.u.type === 'BAR') myShips.push(i); }
        else { enemyUnits.push(i); if (c.u.type === 'BAR') enemyShips.push(i); }
      }
      if (isSettle(c)) {
        if (c.o === me) { mySettles.push(i); if (c.b === B.CIUDAD) myCities.push(i); }
        else if (c.o >= 0) { enemySettles.push(i); if (c.b === B.CIUDAD) enemyCities.push(i); }
      }
    });
    myComps.delete(-1);

    const net = safePreview(g, f, null);
    const income = net.inc || {};
    let myPower = 0, enemyPower = 0;
    const powerByFaction = Object.create(null);
    for (let k = 0; k < myUnits.length; k++) myPower += unitPower(g, g.cells[myUnits[k]]);
    for (let k = 0; k < enemyUnits.length; k++) {
      const c = g.cells[enemyUnits[k]];
      const p = unitPower(g, c);
      enemyPower += p;
      if (c.u) powerByFaction[c.u.owner] = (powerByFaction[c.u.owner] || 0) + p;
    }

    const ctx = {
      g, me, f, comp, df, waterDist, coastDist, threat, net, income,
      myComps, myUnits, enemyUnits, myShips, enemyShips,
      mySettles, myCities, enemySettles, enemyCities,
      myPower, enemyPower,
      powerByFaction,
      capital: null, enemy: null, stance: 'expand', guard: null, siegeTarget: null,
      threatened: false, frontierActive: false, exposedCities: false,
      storm: new Uint8Array(g.cells.length), stormNext: new Uint8Array(g.cells.length),
      trees: new Uint8Array(g.cells.length), frontier: new Uint8Array(g.cells.length),
      cutCache: Object.create(null), cutDetail: Object.create(null), raid: Object.create(null),
      naval: null
    };
    // Capital: la ciudad amurallada de mayor rango; si no, el mejor asentamiento.
    for (let k = 0; k < mySettles.length; k++) {
      const c = g.cells[mySettles[k]];
      if (c.b !== B.CIUDAD) continue;
      if (!ctx.capital || (c.cap && !ctx.capital.cap) || (!!c.cap === !!ctx.capital.cap && rankOf(c) > rankOf(ctx.capital))) ctx.capital = c;
    }
    if (!ctx.capital) for (let k = 0; k < mySettles.length; k++) {
      const c = g.cells[mySettles[k]];
      if (!ctx.capital || rankOf(c) > rankOf(ctx.capital)) ctx.capital = c;
    }

    // Tormentas: casilla actual y siguiente (se mueven una casilla por turno).
    for (let k = 0; k < (g.storms || []).length; k++) {
      const s = g.storms[k], sc = g.cells[s.i];
      if (!sc) continue;
      ctx.storm[s.i] = 1;
      const dir = HF.DIRS && HF.DIRS[s.dir];
      if (!dir) continue;
      const nb = gr.nb[s.i] || [];
      for (let j = 0; j < nb.length; j++) {
        const n = g.cells[nb[j]];
        if (n && n.q === sc.q + dir[0] && n.r === sc.r + dir[1]) { ctx.stormNext[nb[j]] = 1; break; }
      }
    }

    // Árboles propios: valor de tala (recurso bloqueado o madera escasa).
    eachCell(g, (c, i) => {
      if (c.o !== me || c.b !== B.ARBOL) return;
      let v = 0;
      if (c.res) v += 2;
      if (c.res === HF.RES.MADERA) v += 1;
      if (c.comp != null && c.sup) v += 0.5;
      if (v > 0) ctx.trees[i] = Math.min(3, Math.round(v));
    });

    // Frontera terrestre: casillas propias pegadas a tierra no propia.
    eachCell(g, (c, i) => {
      if (c.o !== me) return;
      const nb = gr.nb[i] || [];
      for (let j = 0; j < nb.length; j++) {
        const n = g.cells[nb[j]];
        if (n && n.o !== me && n.t !== T.MAR) { ctx.frontier[i] = 1; ctx.frontierActive = true; break; }
      }
    });

    // ¿Hay ciudades/pueblos en peligro inmediato? La IA refuerza y construye
    // bastiones en lugar de seguir expandiéndose a lo loco.
    for (let k = 0; k < mySettles.length; k++) {
      const i = mySettles[k], c = g.cells[i];
      let near = BIG;
      for (let j = 0; j < enemyUnits.length; j++) {
        const d = HEX(c, g.cells[enemyUnits[j]]);
        if (d < near) near = d;
      }
      if (near <= 5 || ctx.threat.dangerNow[i] > 0 || ctx.threat.shoot[i] > 0) {
        ctx.threatened = true;
        if (near <= 4 || ctx.threat.dangerNow[i] > 0) {
          if (c.b === B.CIUDAD) ctx.exposedCities = true;
        }
      }
    }

    ctx.enemy = chooseEnemy(g, me, ctx);
    if (ctx.enemy == null) ctx.stance = 'expand';
    else {
      // Comparar contra el rival ELEGIDO, no contra la suma de todos los
      // rivales. Antes, con 3 IA en el mapa, cualquiera se creía superada por
      // el mundo entero y se quedaba en "defend" aunque pudiera atacar.
      const targetPower = powerByFaction[ctx.enemy] || 0;
      ctx.stance = myPower < targetPower * 0.8 ? 'defend' : 'attack';
    }

    // Raids de corte: una unidad barata puede sacrificarse para romper el
    // cordón logístico rival. Se calcula antes del plan naval para que también
    // inspire un desembarco de castigo.
    try { planRaids(g, me, ctx); } catch (e) { fail('raids', e); }

    // Objetivo de asedio: la ciudad rival más cercana a nuestras tropas. La IA
    // lleva allí al Asedio y fusiona infantería para superar la Defensa 2 de
    // una ciudad; sin esto se quedaba rodeándola con N1 que no pueden entrar.
    ctx.siegeTarget = null;
    if (enemyCities.length) {
      let bd = BIG;
      for (let k = 0; k < enemyCities.length; k++) {
        const city = g.cells[enemyCities[k]];
        let d = BIG;
        for (let j = 0; j < myUnits.length; j++) d = Math.min(d, HEX(city, g.cells[myUnits[j]]));
        if (d < bd) { bd = d; ctx.siegeTarget = enemyCities[k]; }
      }
    }

    try { ctx.naval = navalPlan(g, me, ctx); } catch (e) { fail('navalPlan', e); ctx.naval = emptyNaval(); }
    try { ctx.guard = buildGuardMap(g, me, ctx); } catch (e) { fail('guard', e); ctx.guard = Object.create(null); }
    return ctx;
  }

  function emptyNaval() {
    return {
      targetComp: -1, beach: -1, wf: null, needTransport: false, shipsWanted: 0,
      loadCells: new Set(), stranded: new Set(), threat: 0, value: 0, scores: [], staging: -1, beaches: [],
      raidCell: -1, raidOnly: false
    };
  }

  // =====================================================================
  // 5. Plan anfibio
  // =====================================================================
  // =====================================================================
  // 5b. Corte de líneas de suministro
  // =====================================================================
  // Valor de capturar `to`: cuántas casillas/unidades enemigas quedarían en
  // una componente SIN asentamiento (es decir, sin suministro) al perder esa
  // casilla. Un punto de articulación bien elegido puede matar de hambre a un
  // ejército entero, aunque la unidad que corta muera después.
  function cutInfo(g, ctx, to) {
    if (!ctx.cutCache) ctx.cutCache = Object.create(null);
    if (!ctx.cutDetail) ctx.cutDetail = Object.create(null);
    if (ctx.cutCache[to] != null) return ctx.cutDetail[to] || { v: ctx.cutCache[to], cells: 0, units: 0, settles: 0 };
    const empty = { v: 0, cells: 0, units: 0, settles: 0 };
    const c = g.cells[to];
    if (!c || c.o < 0 || c.o === ctx.me || c.t === T.MAR) { ctx.cutCache[to] = 0; ctx.cutDetail[to] = empty; return empty; }
    const compId = c.comp;
    const compCells = [];
    eachCell(g, (x, i) => { if (x.o === c.o && x.comp === compId) compCells.push(i); });
    if (compCells.length < 2) { ctx.cutCache[to] = 0; ctx.cutDetail[to] = empty; return empty; }

    const detail = { v: 0, cells: 0, units: 0, settles: 0 };
    const add = i => {
      detail.cells++;
      const u = g.cells[i].u;
      if (u) detail.units += 1 + (u.tier - 1) * 0.5;
      if (isSettle(g.cells[i].b)) detail.settles++;
    };
    const compSettles = compCells.filter(i => isSettle(g.cells[i].b)).length;
    const toSettle = isSettle(c.b);

    if (toSettle && compSettles <= 1) {
      // Era el único asentamiento: toda la provincia restante se queda sin
      // suministro. Es el corte perfecto.
      for (const i of compCells) if (i !== to) add(i);
    } else {
      // Separar la componente por la casilla capturada y ver qué trozos se
      // quedan sin ningún pueblo/ciudad/bastión.
      const seen = new Set([to]);
      const nb = grid(g).nb[to] || [];
      for (let j = 0; j < nb.length; j++) {
        const start = nb[j], n = g.cells[start];
        if (!n || seen.has(start) || n.o !== c.o || n.comp !== compId) continue;
        const q = [start]; seen.add(start);
        let settle = 0, cells = 0, units = 0;
        for (let h = 0; h < q.length; h++) {
          const x = q[h], xc = g.cells[x];
          cells++;
          if (isSettle(xc.b)) settle++;
          const u = xc.u;
          if (u) units += 1 + (u.tier - 1) * 0.5;
          const nn = grid(g).nb[x] || [];
          for (let k = 0; k < nn.length; k++) {
            const y = nn[k], yc = g.cells[y];
            if (!yc || seen.has(y) || yc.o !== c.o || yc.comp !== compId) continue;
            seen.add(y); q.push(y);
          }
        }
        if (!settle) { detail.cells += cells; detail.units += units; }
      }
    }
    detail.v = Math.min(180, Math.round(detail.cells * 1.5 + detail.units * 9 + (toSettle ? 10 : 0)));
    ctx.cutCache[to] = detail.v;
    ctx.cutDetail[to] = detail;
    return detail;
  }

  // Elige 1-2 unidades baratas para una incursión de corte. No son la fuerza
  // principal: si mueren, el ejército rival queda sin comida y eso vale más.
  function planRaids(g, me, ctx) {
    const units = [];
    for (let k = 0; k < ctx.myUnits.length; k++) {
      const i = ctx.myUnits[k], u = g.cells[i].u;
      if (!u || u.type === 'BAR' || u.cargo) continue;
      if (ctx.guard && ctx.guard[i]) continue;
      units.push(i);
    }
    if (!units.length) return;
    const goals = [];
    eachCell(g, (c, i) => {
      if (c.o < 0 || c.o === me || c.t === T.MAR) return;
      // Solo puntos de articulación probables: un asentamiento o un cuello con
      // dos o más vecinos del mismo dueño.
      if (!isSettle(c.b) && countAdjacent(g, i, x => x.o === c.o && x.t !== T.MAR) < 2) return;
      let near = BIG;
      for (let k = 0; k < units.length; k++) near = Math.min(near, HEX(g.cells[units[k]], c));
      if (near > 8) return;
      const info = cutInfo(g, ctx, i);
      if (info.v >= 24) goals.push({ i, v: info.v, units: info.units, near });
    });
    goals.sort((a, b) => (b.v + b.units * 5 - b.near * 2) - (a.v + a.units * 5 - a.near * 2));
    const used = new Set();
    for (let k = 0; k < Math.min(2, goals.length); k++) {
      const goal = goals[k];
      let best = -1, bd = BIG;
      for (let j = 0; j < units.length; j++) {
        const ui = units[j];
        if (used.has(ui)) continue;
        const u = g.cells[ui].u;
        if (!u || u.tier > 2) continue;
        const d = HEX(g.cells[ui], g.cells[goal.i]);
        const cost = d - (u.tier === 1 ? 1 : 0) - (ctx.guard && ctx.guard[ui] ? 3 : 0);
        if (cost < bd) { bd = cost; best = ui; }
      }
      if (best >= 0 && bd <= 9) { ctx.raid[best] = { goal: goal.i, value: goal.v }; used.add(best); }
    }
  }

  function cellTargetValue(g, me, c) {
    let v = 0;
    if (c.o >= 0 && c.o !== me) {
      if (c.b === B.CIUDAD) v += 150;
      else if (c.b === B.PUEBLO) v += 85;
      else if (c.b === B.BASTION) v += 65;
      else if (c.b === B.CAMPAMENTO) v += 30;
      else v += 2;
      if (c.u) v += 15 + c.u.tier * 6;
      if (c.sup) v += 4;
    } else if (c.o === -1) {
      if (c.b === B.PUEBLO) v += 22;
      else if (c.b === B.CIUDAD) v += 30;
      else if (c.b === B.BASTION) v += 12;
      else if (c.b === B.CAMPAMENTO) v += 8;
      else if (c.b === B.ARBOL) v += 1;
      if (c.res) v += 6;
    }
    return v;
  }

  function navState(g, me) {
    const all = g._aiNav || (g._aiNav = {});
    let st = all[me];
    if (!st) st = all[me] = { target: null, since: 0, blockUntil: 0 };
    // Compatibilidad con pruebas/depuración antiguas que fijaban el objetivo
    // en el propio `g`.
    if (g._aiNavalTarget) {
      st.target = g._aiNavalTarget; st.since = g._aiNavalSince || 0;
      g._aiNavalTarget = null;
    }
    if (g._aiNavalBlockUntil) { st.blockUntil = g._aiNavalBlockUntil; g._aiNavalBlockUntil = 0; }
    return st;
  }

  function navalPlan(g, me, ctx) {
    const plan = emptyNaval();
    // Estado POR FACCIÓN: antes `g._aiNavalTarget` era global y las tres IA se
    // pisaban el objetivo/tiempo de espera entre sí.
    const ns = navState(g, me);
    if (ns.blockUntil && g.turn < ns.blockUntil) return plan;
    if (ns.blockUntil) { ns.blockUntil = 0; ns.since = 0; }
    const gr = grid(g), comp = ctx.comp, cells = g.cells;
    const ownSettleComps = new Set();
    for (let k = 0; k < ctx.mySettles.length; k++) {
      const i = ctx.mySettles[k];
      // OJO: c.comp es el id de provincia (supply); comp[i] es el id de la
      // masa de tierra. Mezclarlos hacía que la IA "invadiera" su propio
      // continente y gastara barcos en mapas sin mar.
      if (comp[i] >= 0) ownSettleComps.add(comp[i]);
    }
    // Unidades varadas: fuera de una provincia abastecida y sin asentamiento
    // propio en su masa de tierra. Son candidatas a evacuación.
    for (let k = 0; k < ctx.myUnits.length; k++) {
      const i = ctx.myUnits[k], c = cells[i];
      if (!c.u || c.u.type === 'BAR') continue;
      if (!c.sup && !ownSettleComps.has(comp[i]) && comp[i] >= 0) plan.stranded.add(i);
    }

    const targets = new Map();
    // Distancia al agua por COMPONENTE, no por casilla: una ciudad puede estar
    // tierra adentro y aun así ser invadible desembarcando en su costa. Antes
    // solo se valoraban las celdas costeras y las capitales interiores se
    // ignoraban (la IA "invadía" islas vacías en vez del continente rival).
    const compWd = new Map();
    eachCell(g, (c, i) => {
      if (c.t === T.MAR) return;
      const k = comp[i];
      if (k < 0) return;
      let wd = BIG;
      const nb = gr.nb[i] || [];
      for (let j = 0; j < nb.length; j++) {
        const n = cells[nb[j]];
        if (n && isNavigable(g, n) && ctx.waterDist[nb[j]] < wd) wd = ctx.waterDist[nb[j]];
      }
      if (wd < BIG && (!compWd.has(k) || wd < compWd.get(k))) compWd.set(k, wd);
    });
    eachCell(g, (c, i) => {
      if (c.t === T.MAR) return;
      const k = comp[i];
      if (k < 0) return;
      const mine = ctx.myComps.has(k);
      // Si ya tenemos un asentamiento en esa masa de tierra, se llega por
      // tierra: no gastamos barcos en invadir lo que ya es nuestro.
      if (mine && ownSettleComps.has(k)) return;
      const enemyHere = c.o >= 0 && c.o !== me;
      const neutralHere = c.o === -1 && (c.res || isSettle(c.b));
      if (!enemyHere && !neutralHere) return;
      const wd = compWd.get(k);
      if (wd == null || wd >= BIG) return;
      let v = cellTargetValue(g, me, c);
      if (ctx.enemy != null && c.o === ctx.enemy) v *= 1.25;
      // La capital rival manda: es la victoria. Las islas neutrales solo son
      // un premio secundario.
      if (ctx.enemy != null && c.o === ctx.enemy && c.b === B.CIUDAD) v *= 2.6;
      const cut = enemyHere ? cutInfo(g, ctx, i).v : 0;
      if (cut) v += cut * 1.4;
      if (mine) v *= 0.75;
      v = v / (1 + wd * 0.35) - wd * 0.6;
      let t = targets.get(k);
      if (!t) { t = { comp: k, score: 0, cells: [], wd: BIG, enemy: 0, coast: 0, settle: 0, raid: 0, raidCell: -1, raidMax: 0 }; targets.set(k, t); }
      t.score += v;
      t.wd = Math.min(t.wd, wd);
      if (enemyHere) t.enemy++;
      if (cut >= 30 && coastNeighbor(g, i) >= 0) { t.raid++; if (cut > t.raidMax) { t.raidMax = cut; t.raidCell = i; } }
      if (isSettle(c.b) && c.o !== me) t.settle++;
      if (wd < BIG) t.coast++;
      if (c.o === me) t.cells.push(i);
    });

    // Reforzar una cabeza de playa propia con enemigos cerca.
    for (let k = 0; k < ctx.myUnits.length; k++) {
      const i = ctx.myUnits[k], c = cells[i];
      if (!c.u || c.u.type === 'BAR') continue;
      const t = targets.get(comp[i]);
      if (t && t.enemy > 0) t.score += 40;
    }

    plan.scores = [];
    targets.forEach(t => plan.scores.push({ comp: t.comp, score: Math.round(t.score), wd: t.wd, enemy: t.enemy }));
    let best = null;
    // Bloqueo de objetivo: una invasión no puede cambiar de isla cada turno
    // porque las puntuaciones fluctúen. Se mantiene el objetivo elegido hasta
    // que desaparezca (isla tomada o sin nada que invadir).
    const viable = t => t && (t.settle > 0 || t.cells.length > 0 || t.raid > 0 || t.coast >= Math.max(2, HF.CFG.isolatedCampMin || 3));
    const lock = ns.target;
    if (lock && lock.comp != null && targets.has(lock.comp) && viable(targets.get(lock.comp))) best = targets.get(lock.comp);
    if (!best) {
      targets.forEach(t => { if (!viable(t)) return; if (!best || t.score > best.score) best = t; });
      if (best) ns.target = { comp: best.comp, beach: -1, until: g.turn + 8 };
      else ns.since = 0;
    }
    // Colonizar una isla neutral también es una operación anfibia válida:
    // aunque la puntuación por distancia sea baja, una costa con 3 playas y
    // recursos merece una oleada. Antes el umbral 18 lo impedía en mapas R18.
    const colonize = best && best.enemy === 0 && best.score > 4 &&
      (best.settle > 0 || best.coast >= Math.max(2, HF.CFG.isolatedCampMin || 3));
    if (best && (best.score > 18 || colonize)) {
      plan.targetComp = best.comp;
      plan.value = best.score;
      // Las tropas que ya están en la isla objetivo son una cabeza de playa,
      // no náufragos: deben empujar tierra adentro, no volver al barco.
      if (plan.stranded.size) {
        const keep = new Set();
        plan.stranded.forEach(i => { if (comp[i] !== plan.targetComp) keep.add(i); });
        plan.stranded = keep;
      }
      // Control de tiempo: si en 12 turnos no se ha pisado la isla, se aborta
      // la operación y se vuelve a la economía/expansión terrestre.
      if (best.cells.length > 0) ns.since = g.turn;
      else if (!ns.since) ns.since = g.turn;
      if (g.turn - ns.since > 12) {
        ns.blockUntil = g.turn + 15;
        ns.target = null;
        plan.targetComp = -1;
        plan.beach = -1;
        plan.wf = null;
        return plan;
      }
    } else if (plan.stranded.size) {
      // Sin objetivo rentable, al menos rescatar a los varados.
      const first = Array.from(plan.stranded)[0];
      if (first != null && comp[first] >= 0) plan.targetComp = comp[first];
    }

    if (plan.targetComp >= 0) {
      // Playas: tierra del componente junto a agua alcanzable desde nuestra costa.
      const beach = [];
      eachCell(g, (c, i) => {
        if (comp[i] !== plan.targetComp || c.t === T.MAR) return;
        let wd = BIG;
        const nb = gr.nb[i] || [];
        for (let j = 0; j < nb.length; j++) {
          const n = cells[nb[j]];
          if (n && isNavigable(g, n) && ctx.waterDist[nb[j]] < wd) wd = ctx.waterDist[nb[j]];
        }
        if (wd >= BIG) return;
        const def = cellDefense(g, i, null);
        const dng = ctx.threat.danger[i];
        const cut = c.o >= 0 && c.o !== me ? cutInfo(g, ctx, i).v : 0;
        let v = cellTargetValue(g, me, c) + (c.u && c.u.owner !== me ? 12 : 0);
        v += cut * 2;
        v -= def * 14 + dng * 2.5 + wd * 2;
        if (c.o === me && c.u) v -= 6;       // ya hay tropa: no repetir
        beach.push({ i, v, def, cut });
      });
      beach.sort((a, b) => b.v - a.v);
      if (beach.length) {
        const lockBeach = ns.target && ns.target.beach;
        let chosen = beach[0];
        if (lockBeach != null) for (let k = 0; k < beach.length; k++) if (beach[k].i === lockBeach) { chosen = beach[k]; break; }
        plan.beach = chosen.i;
        plan.threat = chosen.def;
        // Grupo de playas CONTIGUO: tres casillas capturadas tienen que formar
        // una componente para que HF.supply funde el campamento. Si se eligen
        // playas dispersas por toda la isla, las unidades mueren aisladas.
        const cluster = [chosen.i];
        for (let k = 0; k < beach.length && cluster.length < 6; k++) {
          const b = beach[k];
          if (b.i === chosen.i) continue;
          if (HEX(g.cells[b.i], g.cells[chosen.i]) <= 2) cluster.push(b.i);
        }
        if (cluster.length < 3) for (let k = 0; k < beach.length && cluster.length < 5; k++) if (cluster.indexOf(beach[k].i) < 0) cluster.push(beach[k].i);
        plan.beaches = cluster;
        // Desembarco de castigo: una sola unidad puede cortar el suministro
        // aunque muera después. Es la misión de raid naval.
        let raidBeach = null;
        for (let k = 0; k < beach.length; k++) if (beach[k].cut >= 30 && (!raidBeach || beach[k].cut > raidBeach.cut)) raidBeach = beach[k];
        plan.raidCell = raidBeach ? raidBeach.i : -1;
        // El campo de agua debe incluir la playa del raid, aunque esté lejos
        // del grupo de fundación.
        if (raidBeach && plan.beaches.indexOf(raidBeach.i) < 0) plan.beaches.push(raidBeach.i);
        if (ns.target && ns.target.comp === plan.targetComp) ns.target.beach = chosen.i;
        // Varias playas del MISMO componente: si la playa principal está
        // ocupada, el transporte puede desembarcar al lado sin cambiar de isla.
        plan.wf = waterFieldTo(g, plan.beaches);
      }
    }

    // Punto de embarque estable: agua junto a la costa propia más cercana a
    // la capital. Los transportes esperan aquí; las tropas caminan hasta la
    // orilla. Así el barco no persigue a una unidad que se mueve cada turno.
    plan.staging = -1;
    {
      const anchor = ctx.capital || ctx.mySettles.length ? g.cells[ctx.capital ? ctx.capital.i : ctx.mySettles[0]] : null;
      let bd = BIG;
      for (let k = 0; k < ctx.myUnits.length; k++) {
        const i = ctx.myUnits[k], c = cells[i];
        if (!c || c.u && c.u.type === 'BAR') continue;
        const w = coastNeighbor(g, i);
        if (w < 0 || !isNavigable(g, cells[w])) continue;
        const d = anchor ? HEX(c, anchor) : 0;
        if (d < bd) { bd = d; plan.staging = w; }
      }
      if (plan.staging < 0) {
        eachCell(g, (c, i) => {
          if (c.o !== me) return;
          const w = coastNeighbor(g, i);
          if (w >= 0 && isNavigable(g, cells[w])) plan.staging = w;
        });
      }
    }

    // Unidades candidatas a embarcar: tropas de tierra con costa propia
    // alcanzable (aunque todavía estén tierra adentro). Así la IA prepara la
    // invasión mientras construye el transporte, en vez de esperar en la orilla.
    // Una invasión necesita una oleada, no un goteo: las casillas capturadas
    // forman una provincia solo al llegar a isolatedCampMin. Si desembarca una
    // unidad por turno, muere de hambre antes de fundar el campamento.
    let targetHasSettle = false;
    if (plan.targetComp >= 0) eachCell(g, (c) => {
      if (c.o === me && comp[c.i] === plan.targetComp && isSettle(c.b)) targetHasSettle = true;
    });
    const waveMin = Math.max(2, HF.CFG.isolatedCampMin || 3);
    const raidOnly = plan.raidCell >= 0 && !targetHasSettle && plan.beaches.length < waveMin;
    plan.raidOnly = raidOnly;
    const wanted = plan.targetComp >= 0
      ? (raidOnly ? 1 : (targetHasSettle ? 2 : waveMin))
      : 0;
    plan.targetHasSettle = targetHasSettle;
    const shipCount = ctx.myShips.length;
    const slots = Math.max(shipCount, wanted);
    const load = [];
    const stCell = plan.staging >= 0 ? cells[plan.staging] : null;
    for (let k = 0; k < ctx.myUnits.length; k++) {
      const i = ctx.myUnits[k], c = cells[i], u = c.u;
      if (!u || u.type === 'BAR' || u.cargo) continue;
      // Las tropas ya desembarcadas en el objetivo no vuelven a subir.
      if (plan.targetComp >= 0 && comp[i] === plan.targetComp) continue;
      if (u.mv <= 0 && !plan.stranded.has(i)) continue;
      const cd = ctx.coastDist[i];
      if (cd >= BIG && !plan.stranded.has(i)) continue;
      const typeW = { CAB: 5, INF: 4, ENG: 3, ARC: 2, SIE: 1 }[u.type] || 1;
      let v = typeW * 4 - (cd >= BIG ? 0 : cd) * 1.2 - ctx.df[i] * 0.15;
      if (stCell) v -= HEX(c, stCell) * 0.7;
      if (plan.stranded.has(i)) v += 250;
      if (ctx.guard && ctx.guard[i]) v -= 6;
      load.push({ i, v });
    }
    load.sort((a, b) => b.v - a.v);
    for (let k = 0; k < Math.min(slots, load.length); k++) plan.loadCells.add(load[k].i);

    plan.shipsWanted = wanted;
    plan.needTransport = (wanted > 0 && shipCount < wanted) ||
      plan.stranded.size > 0 ||
      (ctx.enemyShips.length > ctx.myShips.length && ctx.turn > 8);
    return plan;
  }

  // =====================================================================
  // 6. Puntuación de acciones de una unidad
  // =====================================================================
  function coverScore(c) {
    if (!c || c.o < 0) return 0;
    if (c.b === B.CIUDAD) return 15;
    if (c.b === B.BASTION) return 17;
    if (c.b === B.PUEBLO) return 10;
    if (c.b === B.CAMPAMENTO) return 2;   // un campamento no es refugio real
    if (c.b === B.CAMINO) return 3;
    return 0;
  }

  function exitsFor(g, ci, u) {
    const nb = grid(g).nb[ci] || [];
    let n = 0;
    for (let j = 0; j < nb.length; j++) {
      const c = g.cells[nb[j]];
      if (!c || c.fire > 0) continue;
      if (c.u && c.u.owner !== u.owner) continue;
      if (!HF.canStep(u, c, g.f[u.owner])) continue;
      n++;
    }
    return n;
  }

  function safetyPenalty(g, ctx, ci, u, scale) {
    const def = cellDefense(g, ci, u);
    const dng = ctx.threat.danger[ci], now = ctx.threat.dangerNow[ci];
    const elite = ctx.threat.elite[ci];
    let p = 0;
    // Amenaza inmediata (el rival golpea SIN moverse): es letal, se penaliza
    // muy fuerte. La amenaza "a un movimiento" solo es un riesgo: si también
    // se penalizara como segura, la unidad no tendría ninguna casilla adonde
    // retirarse y se quedaría quieta muriendo (el problema del camino diezmado).
    if (lethal(def, now, elite)) p -= (90 + 8 * now) * (scale || 1);
    else if (lethal(def, dng, elite)) p -= (22 + 3 * dng) * (scale || 1);
    else if (dng > 0) p -= Math.max(0, dng - def) * 2;
    const sh = ctx.threat.shoot[ci];
    if (sh > 0) p -= Math.min(18, sh * 3);
    return p;
  }

  function scoreMove(g, me, ctx, ci, u, to) {
    const c = g.cells[ci], t = g.cells[to];
    if (!t) return -BIG;
    const fromDf = ctx.df[ci], toDf = ctx.df[to];
    let s = (fromDf - toDf) * 6;
    if (toDf >= fromDf) s -= 3;
    if (t.o === me) s += 3;
    else if (t.o === -1) s += 6 + (t.res ? 3 : 0);
    else s -= 8;

    const raid = ctx.raid && ctx.raid[ci];
    s += coverScore(t);
    s += safetyPenalty(g, ctx, to, u, raid ? 0.35 : 1);

    // No meterse en un saco: pocas salidas = cerco probable.
    const ex = exitsFor(g, to, u);
    if (ex <= 1) s -= 34;
    else if (ex === 2) s -= 9;

    // Apoyo mutuo: una línea de tropas se sostiene mejor que unidades sueltas.
    const friends = countAdjacent(g, to, x => x.u && x.u.owner === me);
    if (friends) s += Math.min(6, friends * 2);

    // Guarnición: acudir a una ciudad/pueblo amenazado.
    if (ctx.guard && ctx.guard[to]) s += ctx.guard[to];
    // Sin amenaza, encerrarse en un asentamiento propio no produce recursos.
    // Las unidades deben salir a capturar casillas y recursos.
    if (isSettle(t.b) && t.o === me && !ctx.threatened) s -= 18;

    // Los débiles no lideran el avance: que vayan detrás de la línea.
    if (u.tier === 1 && (u.type === 'ENG' || u.type === 'ARC' || u.type === 'SIE') && toDf <= 2) s -= 8;

    // Arqueros/asedio: mantener distancia de tiro, no cargar al cuerpo a cuerpo.
    if (u.type === 'ARC' || u.type === 'SIE') {
      const pref = u.type === 'ARC' ? (t.t === T.COLINA ? 3 : 2) : 2;
      if (toDf < 2) s -= 18;
      else if (toDf <= pref + 1) s += 5;
      // El Asedio va directo a la ciudad objetivo: es la única unidad que
      // puede degradar sus muros y abrir la brecha para la infantería.
      if (u.type === 'SIE' && ctx.siegeTarget) {
        const d0 = HEX(c, g.cells[ctx.siegeTarget]);
        const d1 = HEX(t, g.cells[ctx.siegeTarget]);
        s += (d0 - d1) * 9;
      }
    }

    // Retirada: si la casilla actual está sentenciada, alejarse vale oro.
    const curDef = cellDefense(g, ci, u);
    const nowLethal = lethal(curDef, ctx.threat.dangerNow[ci], ctx.threat.elite[ci]);
    if (nowLethal) s += 75;                    // salir del golpe inmediato
    if (nowLethal || lethal(curDef, ctx.threat.danger[ci], ctx.threat.elite[ci])) {
      s += (toDf - fromDf) * 4;                // y alejarse del área de caza
    }

    // Embarcar: acercarse a la costa si hay un plan naval.
    if (ctx.naval && ctx.naval.loadCells && ctx.naval.loadCells.has(ci)) {
      const cd0 = ctx.coastDist[ci], cd1 = ctx.coastDist[to];
      if (cd0 < BIG && cd1 < cd0) s += 8;
      else if (cd0 < BIG && cd1 > cd0) s -= 3;
      if (ctx.naval.staging >= 0) {
        const st = g.cells[ctx.naval.staging];
        if (st) s += (HEX(c, st) - HEX(t, st)) * 7;
      }
      if (coastNeighbor(g, to) >= 0) s += 10;
    }
    if (ctx.naval && ctx.naval.stranded && ctx.naval.stranded.has(ci) && coastNeighbor(g, to) >= 0) s += 25;
    // Incursión de corte: la unidad asignada se dirige al punto logístico
    // aunque el camino esté caliente. El sacrificio puede valer la guerra.
    if (raid) {
      const goal = g.cells[raid.goal];
      if (goal) {
        s += (HEX(c, goal) - HEX(t, goal)) * 7;
        if (to === raid.goal) s += 50;
      }
    }
    return s;
  }

  function scoreAttack(g, me, ctx, ci, u, to, o) {
    const t = g.cells[to];
    if (!t) return -BIG;
    // Ocupar una casilla neutral vacía: es la vía de expansión del juego
    // (el motor la resuelve como ataque contra Defensa 0). Vale más si tiene
    // recurso, si es un pueblo libre o si consolida nuestra frontera.
    if (!t.u && t.o === -1) {
      // El Asedio no se distrae capturando parcelas vacías: su trabajo es
      // romper la ciudad. Los arqueros solo expansionan si no hay nada que
      // hostigar.
      if (u.type === 'SIE') return -8;
      let s = 14 + (t.res ? 8 : 0) + (t.b === B.PUEBLO ? 22 : 0) + (t.b === B.ARBOL ? 4 : 0);
      if (t.t === T.COLINA) s += 3;
      if (t.res === HF.RES.TRIGO) s += 3;
      if (g.turn <= 10) s += 4;                 // fase de expansión temprana
      if (u.type === 'ARC') s -= 5;
      if (countAdjacent(g, to, x => x.o === me) > 0) s += 4;
      s += safetyPenalty(g, ctx, to, u, 0.8);
      return s;
    }
    let s = 10;
    if (t.u) s += 16 + t.u.tier * 7;
    if (t.b === B.CIUDAD) s += 100;
    else if (t.b === B.BASTION) s += 34;
    else if (t.b === B.PUEBLO) s += 30;
    else if (t.b === B.CAMPAMENTO) s += 12;
    if (t.res) s += 4;
    if (t.o >= 0 && t.sup) s += 6;
    if (t.u && t.o === 0) s += 2;
    if (t.o === ctx.enemy) s += 6;
    if (o && o.lastStand) s -= 18;

    // Corte logístico: capturar este punto deja a parte del ejército rival sin
    // asentamiento y, por tanto, sin suministro. Vale más que una muerte.
    const cut = (t.o >= 0 && t.o !== me) ? cutInfo(g, ctx, to).v : 0;
    if (cut) s += cut * 1.8;
    const raid = ctx.raid && ctx.raid[ci];
    if (raid && raid.goal === to) s += 45;

    // Exposición tras ocupar la casilla.
    const defAfter = cellDefense(g, to, u);
    const dng = ctx.threat.danger[to];
    if (lethal(defAfter, dng, ctx.threat.elite[to])) {
      // Tomar una ciudad o cortar la logística justifica el sacrificio.
      if (cut >= 40 || raid || s > 70) s -= 12;
      else s -= (55 + 5 * dng);
    }
    return s;
  }

  function scoreShoot(g, me, ctx, ci, u, to) {
    const t = g.cells[to];
    if (!t) return -BIG;
    let s = 16 + (t.u ? t.u.tier * 5 : 0);
    if (t.b === B.CIUDAD || t.b === B.BASTION) s += 12;
    if (t.u && t.u.type === 'SIE') s += 8;
    if (t.u && t.u.tier >= 3) s += 6;
    return s;
  }

  function scoreSiege(g, me, ctx, ci, u, to) {
    const t = g.cells[to];
    if (!t) return -BIG;
    let s = 30;
    if (t.b === B.CIUDAD) s += 55;
    else if (t.b === B.BASTION) s += 35;
    else if (t.b === B.PUEBLO) s += 28;
    return s;
  }

  function scoreChop(g, me, ctx, ci, u, to) {
    const f = g.f[me], c = g.cells[ci], t = g.cells[to];
    let s = 5;
    if (t.res) s += 18;
    if (ctx.trees[to]) s += 7 * ctx.trees[to];
    const wood = f.wood || 0;
    if (wood < 20) s += 14;
    else if (wood < 45) s += 6;
    else if (wood > 120) s -= 6;
    if (ctx.naval && ctx.naval.loadCells && ctx.naval.loadCells.has(ci)) s -= 12;
    s += safetyPenalty(g, ctx, to, u, 0.8);
    return s;
  }

  function scoreBoard(g, me, ctx, ci, u) {
    if (!ctx.naval) return 2;
    // Un soldado en la isla objetivo combate; no se reembarca.
    if (ctx.naval.targetComp >= 0 && ctx.comp[ci] === ctx.naval.targetComp) return -5;
    if (ctx.naval.stranded && ctx.naval.stranded.has(ci)) return 130;
    if (ctx.naval.loadCells && ctx.naval.loadCells.has(ci)) return 80;
    if (ctx.naval.needTransport) return 25;
    return 2;
  }

  function scoreFuse(g, me, ctx, ci, u, to) {
    const t = g.cells[to];
    if (!t || !t.u) return -BIG;
    // Fusionar no es gratis: sube el mantenimiento (N1+N1 paga 4 comida y un
    // N2 paga 6) y consume el turno de una unidad. Por eso solo se usa para
    // apuntalar una guarnición sitiada o para fabricar el N2/N3 que sí puede
    // romper la Defensa 2 de una ciudad enemiga.
    const pressed = !!(ctx.threatened || (ctx.guard && (ctx.guard[ci] || ctx.guard[to])));
    let nearCity = false;
    if (ctx.siegeTarget != null) {
      const city = g.cells[ctx.siegeTarget];
      nearCity = HEX(g.cells[ci], city) <= 2 || HEX(t, city) <= 2;
    }
    if (nearCity && (u.type === 'INF' || u.type === 'ENG') && t.u.type === u.type) {
      const fused = Math.min(maxFuse(g, me), u.tier + t.u.tier);
      const atk = fused >= HF.CFG.doctrine.pretorianTier ? HF.CFG.doctrine.pretorianAtk : fused;
      let def = 0;
      try { def = HF.defenseAt(g, ctx.siegeTarget); } catch (e) { def = 2; }
      if (atk > def || (atk === def && fused >= HF.CFG.fuseMax)) return 32;
      return 16;
    }
    if (!pressed) return -5;
    if (!isSettle(t.b) && !isSettle(g.cells[ci].b)) return -5;
    return 12;
  }

  function holdScore(g, me, ctx, ci, u) {
    const c = g.cells[ci];
    let s = 0;
    const def = cellDefense(g, ci, u);
    if (lethal(def, ctx.threat.dangerNow[ci], ctx.threat.elite[ci])) s -= 25;
    if (ctx.guard && ctx.guard[ci]) s += Math.min(14, ctx.guard[ci]);
    if (isSettle(c.b) && (ctx.stance === 'defend' || (ctx.guard && ctx.guard[ci]))) s += 5;
    if (u.type === 'ARC' || u.type === 'SIE') s += 3;
    if (ctx.trees[ci]) s -= 8;
    return s;
  }

  function evalOption(g, me, ctx, ci, u, to, o) {
    let s = -BIG, kind = o.k;
    const t = g.cells[to];
    if (!t) return null;
    switch (o.k) {
      case 'atk':
        if (!o.ok) return null;
        s = scoreAttack(g, me, ctx, ci, u, to, o);
        break;
      case 'shoot': s = scoreShoot(g, me, ctx, ci, u, to); break;
      case 'siege': s = scoreSiege(g, me, ctx, ci, u, to); break;
      case 'raid': s = 30 + Math.min(120, o.loot || 0) * 1.4; break;
      case 'chop': s = scoreChop(g, me, ctx, ci, u, to); break;
      case 'move': s = scoreMove(g, me, ctx, ci, u, to); break;
      case 'board': s = scoreBoard(g, me, ctx, ci, u); break;
      case 'fuse': s = scoreFuse(g, me, ctx, ci, u, to); break;
      case 'trap': s = 7; break;
      case 'takeover': s = 95; break;
      case 'wonder': s = 130; break;
      case 'pack_camp': s = 5; break;
      case 'fire': s = (t.b === B.ARBOL && t.o !== me) ? 22 : 4; break;
      default: s = 1;
    }
    return s > -BIG ? { to, kind, score: s, opt: o } : null;
  }

  function actUnit(g, me, ctx, ci, u) {
    const opts = HF.options(g, ci);
    if (!opts || !opts.size) return false;
    let best = null;
    const consider = (to, o) => {
      const cand = evalOption(g, me, ctx, ci, u, to, o);
      if (cand && (!best || cand.score > best.score)) best = cand;
    };
    opts.forEach((o, to) => {
      consider(to, o);
      if (o.alt) for (let k = 0; k < o.alt.length; k++) consider(to, o.alt[k]);
    });
    if (!best) return false;
    const hold = holdScore(g, me, ctx, ci, u);
    // Si quedarse es peor que moverse (por ejemplo, hay un N3 adyacente), una
    // jugada con puntuación negativa sigue siendo la mejor: retirarse.
    if (best.score <= hold) return false;
    if (best.score <= 0 && hold >= 0) return false;
    const r = HF.act(g, ci, best.to, best.kind);
    return !!(r && r.ok);
  }

  function playUnits(g, me, ctx) {
    const order = { SIE: 0, ARC: 1, CAB: 2, INF: 3, ENG: 4 };
    for (let pass = 0; pass < MAX_ROUNDS; pass++) {
      const list = [];
      eachCell(g, (c, i) => {
        // Los barcos NO se juegan aquí: tienen su propia fase (playShips) con
        // desembarco, playa y tormentas. Si se colaban en playUnits, la IA
        // desembarcaba la carga en su propia isla y los transportes oscilaban.
        if (c.u && c.u.owner === me && c.u.type !== 'BAR' && HF.ready(c.u)) list.push(i);
      });
      list.sort((a, b) => {
        const ca = g.cells[a], cb = g.cells[b];
        const oa = order[ca.u.type] == null ? 5 : order[ca.u.type];
        const ob = order[cb.u.type] == null ? 5 : order[cb.u.type];
        return oa - ob || a - b;
      });
      let acted = false;
      for (let k = 0; k < list.length; k++) {
        const i = list[k], c = g.cells[i];
        if (!c || !c.u || c.u.owner !== me || !HF.ready(c.u)) continue;
        try { if (actUnit(g, me, ctx, i, c.u)) acted = true; }
        catch (e) { fail('actUnit', e); }
      }
      if (!acted) break;
    }
  }

  // =====================================================================
  // 7. Construcción: calzadas, provincias, bastiones y ciudades
  // =====================================================================
  function buildCandidates(g, b) {
    try { return HF.buildCells(g, b) || []; } catch (e) { fail('buildCells', e); return []; }
  }

  function canPayBuild(g, f, b, ci, extraWood, extraOther) {
    const c = g.cells[ci];
    if (!c) return false;
    const s = stockOf(g, f, c.comp);
    const cost = HF.buildCost(g, f, b);
    if (cost.gold && s.gold < cost.gold + (extraOther || 2)) return false;
    if (cost.food && s.food < cost.food + (extraOther || 2)) return false;
    if (cost.wood && s.wood < cost.wood + (extraWood == null ? 8 : extraWood)) return false;
    return true;
  }

  function campSpotScore(g, me, ctx, ci) {
    const c = g.cells[ci], f = g.f[me];
    let s = 0;
    for (const x of cellsAround(g, ci, 2)) {
      if (x.res) s += 2;
      if (x.o !== me && x.t !== T.MAR) s += 0.35;
    }
    if (c.res) s += 3;
    if (c.t === T.COLINA || c.t === T.MONTANA) s += 2;
    if (ctx.frontier[ci]) s += 3;
    if (ctx.df[ci] <= 2) s += 1;
    let near = BIG;
    for (let k = 0; k < ctx.mySettles.length; k++) near = Math.min(near, HEX(c, g.cells[ctx.mySettles[k]]));
    if (near < 3) s -= 12;
    if (coastNeighbor(g, ci) >= 0) s += 2;
    if (ctx.threat.danger[ci] > 0) s -= Math.min(10, ctx.threat.danger[ci] * 2);
    return s;
  }

  function cellsAround(g, ci, r) {
    const out = [];
    eachWithin(g, ci, r, (i, d) => { if (d > 0) { const c = g.cells[i]; if (c) out.push(c); } });
    return out;
  }

  function settleSpotScore(g, me, ctx, ci) {
    const c = g.cells[ci];
    let s = 0;
    if (c.res) s += 7;
    const nb = cellsAround(g, ci, 1);
    for (let k = 0; k < nb.length; k++) {
      const x = nb[k];
      if (x.res === HF.RES.TRIGO) s += 3;
      else if (x.res === HF.RES.MADERA) s += 2;
      else if (x.res === HF.RES.ORO) s += 2;
    }
    if (c.b === B.CAMPAMENTO) s += 5;
    if (c.b === B.PUEBLO) s += 7;
    if (coastNeighbor(g, ci) >= 0) s += 2;
    if (ctx.frontier[ci]) s += 2;
    if (ctx.threat.danger[ci] > 0) s -= Math.min(8, ctx.threat.danger[ci] * 2);
    return s;
  }

  function bastionSpotScore(g, me, ctx, ci) {
    const c = g.cells[ci];
    if (c.b === B.PUEBLO || c.b === B.CIUDAD) return -100;   // reservar para ciudad
    let s = 0;
    const foes = countAdjacent(g, ci, x => x.o >= 0 && x.o !== me && x.t !== T.MAR);
    s += foes * 6;
    if (ctx.df[ci] <= 2) s += 6;
    const own = countAdjacent(g, ci, x => x.o === me);
    s += Math.max(0, 6 - own) * 1.6;                         // cuello de botella
    if (c.t === T.COLINA || c.t === T.MONTANA) s += 3;
    if (c.res) s += 2;
    let nearCity = BIG;
    for (let k = 0; k < ctx.myCities.length; k++) nearCity = Math.min(nearCity, HEX(c, g.cells[ctx.myCities[k]]));
    if (nearCity <= 2) s += 4;
    return s;
  }

  function bestCandidate(g, me, ctx, b, scorer) {
    const cands = buildCandidates(g, b);
    let best = -1, bs = -Infinity;
    for (let k = 0; k < cands.length; k++) {
      const ci = cands[k];
      const s = scorer(ci);
      if (s > bs) { bs = s; best = ci; }
    }
    return best < 0 ? null : { ci: best, score: bs };
  }

  // Camino continuo entre dos asentamientos por tierra propia abastecida.
  function ownLandPath(g, me, from, to, limit) {
    const gr = grid(g), prev = new Map([[from, -1]]), q = [from];
    for (let h = 0; h < q.length; h++) {
      const x = q[h];
      if (x === to) {
        const path = [];
        let cur = to;
        while (cur !== from && cur >= 0) { path.push(cur); cur = prev.get(cur); }
        path.reverse();
        return path;
      }
      if (prev.size > (limit || 400)) break;
      const nb = gr.nb[x] || [];
      for (let j = 0; j < nb.length; j++) {
        const y = nb[j], n = g.cells[y];
        if (!n || prev.has(y) || n.t === T.MAR) continue;
        if (n.o !== me || !n.sup) continue;
        prev.set(y, x); q.push(y);
      }
    }
    return null;
  }

  function roadSets(g, me) {
    const roads = new Set(), settles = [];
    eachCell(g, (c, i) => {
      if (c.o !== me) return;
      if (c.b === B.CAMINO) roads.add(i);
      if (isSettle(c.b) && c.sup) { roads.add(i); settles.push(i); }
    });
    const seen = new Set(), train = [];
    for (const s of settles) {
      if (seen.has(s)) continue;
      const comp = new Set([s]), q = [s]; seen.add(s);
      for (let h = 0; h < q.length; h++) {
        const x = q[h], nb = grid(g).nb[x] || [];
        for (let j = 0; j < nb.length; j++) {
          if (seen.has(nb[j]) || !roads.has(nb[j])) continue;
          seen.add(nb[j]); comp.add(nb[j]); q.push(nb[j]);
        }
      }
      train.push(comp);
    }
    return { roads, settles, train };
  }

  function roadPlan(g, me, ctx) {
    const out = new Set();
    const set = roadSets(g, me);
    if (set.settles.length < 2) return out;
    // Conectar asentamientos que no comparten red de calzadas.
    const pairs = [];
    for (let a = 0; a < set.settles.length; a++) for (let b = a + 1; b < set.settles.length; b++) {
      const sa = set.settles[a], sb = set.settles[b];
      let same = false;
      for (let k = 0; k < set.train.length; k++) if (set.train[k].has(sa) && set.train[k].has(sb)) { same = true; break; }
      if (same) continue;
      pairs.push({ a: sa, b: sb, d: HEX(g.cells[sa], g.cells[sb]) });
    }
    pairs.sort((x, y) => x.d - y.d);
    for (let k = 0; k < Math.min(4, pairs.length); k++) {
      const p = pairs[k];
      const path = ownLandPath(g, me, p.a, p.b);
      if (!path) continue;
      for (let j = 0; j < path.length; j++) if (!set.roads.has(path[j])) out.add(path[j]);
      if (out.size > 18) break;
    }
    // Sin huecos que cerrar: acercar la calzada al frente.
    if (!out.size && (ctx.stance === 'attack' || ctx.frontierActive)) {
      const front = [];
      for (let k = 0; k < ctx.mySettles.length; k++) {
        const si = ctx.mySettles[k];
        const c = g.cells[si];
        if (ctx.df[si] > 6) continue;
        const nb = grid(g).nb[si] || [];
        for (let j = 0; j < nb.length; j++) {
          const n = g.cells[nb[j]];
          if (n && n.o === me && n.sup && n.b !== B.ARBOL) front.push(nb[j]);
        }
      }
      for (let k = 0; k < Math.min(4, front.length); k++) if (!set.roads.has(front[k])) out.add(front[k]);
    }
    return out;
  }

  function macro(g, me, ctx) {
    const f = g.f[me];
    const net = ctx.net || {};
    const wood = f.wood || 0, food = f.food || 0;
    // Si falta flota para una invasión, el oro y la madera se reservan para los
    // transportes: construir una ciudad en ese momento dejaba a la IA sin 60
    // de oro y bloqueaba la operación anfibia durante decenas de turnos.
    const navyNeed = !!(ctx.naval && ctx.naval.needTransport && ctx.myShips.length < ctx.naval.shipsWanted);
    // Ritmo de obra: una decisión por turno; dos solo si la economía sobra.
    // Antes la IA construía campamento + pueblo el mismo turno y se quedaba
    // sin comida para reclutar (7 campamentos y 5 unidades en 24 turnos).
    const rich = wood > 110 && food > 55;
    const maxBuilds = navyNeed ? 1 : (g.difficulty === 'easy' ? 1 : (rich ? 2 : 1));
    let builds = 0;
    if (!ctx.builtThisTurn) ctx.builtThisTurn = new Set();
    const tryBuild = (b, ci, extraOther, emergency) => {
      if (builds >= maxBuilds || ci == null || ci < 0 || ctx.builtThisTurn.has(ci)) return false;
      const cost = HF.buildCost(g, f, b);
      if (!emergency) {
        if (cost.food && (f.food || 0) - cost.food < 12) return false;
        if (cost.wood && (f.wood || 0) - cost.wood < 6) return false;
        if (cost.gold && (f.gold || 0) - cost.gold < 6) return false;
        // Reserva de flota: no gastar el oro/madera del próximo transporte.
        if (navyNeed) {
          if ((f.gold || 0) - (cost.gold || 0) < 60) return false;
          if ((f.wood || 0) - (cost.wood || 0) < 60) return false;
        }
      }
      if (!canPayBuild(g, f, b, ci, 6, emergency ? 0 : 4)) return false;
      if (buildCandidates(g, b).indexOf(ci) < 0) return false;
      const r = HF.build(g, b, ci);
      if (r && r.ok) { builds++; ctx.builtThisTurn.add(ci); return true; }
      return false;
    };

    // 0. Flota: si no hay ninguna casilla de agua junto a un asentamiento,
    //    el Barco no se puede reclutar. Se funda un asentamiento costero
    //    (bastión si se puede; pueblo como mal menor), nunca un campamento.
    if (navyNeed && !ctx.threatened) {
      let canTrain = false;
      try { canTrain = HF.recruitScan(g, 'BAR').size > 0; } catch (e) { canTrain = false; }
      if (canTrain) return;
      const portCands = b => buildCandidates(g, b).filter(ci => coastNeighbor(g, ci) >= 0);
      const pickPort = b => {
        let best = null, bs = -Infinity;
        for (const ci of portCands(b)) {
          const s = settleSpotScore(g, me, ctx, ci) + (g.cells[ci].b === B.CAMPAMENTO ? 4 : 0);
          if (s > bs) { bs = s; best = ci; }
        }
        return best;
      };
      let best = pickPort(B.BASTION);
      if (best != null && tryBuild(B.BASTION, best)) return;
      best = pickPort(B.PUEBLO);
      if (best != null) tryBuild(B.PUEBLO, best);
      return;
    }

    // 1. La creación de provincias la resuelve HF.supply con el campamento
    //    automático de las componentes aisladas. La IA no gasta en campamentos
    //    pagados: son un espejismo económico y no son refugio real.

    // 2. Defensa urgente: bastión junto a una ciudad amenazada sin fortaleza.
    if (ctx.stance === 'defend' || ctx.threatened) {
      const b = bestCandidate(g, me, ctx, B.BASTION, ci => bastionSpotScore(g, me, ctx, ci));
      if (b && b.score >= 10 && wood >= 30) tryBuild(B.BASTION, b.ci, 0, true);
    }

    // 3. No se construyen pueblos intermedios: si hay campamento, se mejora
    //    directamente a bastión o ciudad (el pueblo también se sustituye).

    // 4. Calzadas: conectan provincias, habilitan caravanas y aceleran marchas.
    if (wood >= 24 && ctx.mySettles.length >= 2) {
      const plan = roadPlan(g, me, ctx);
      if (plan.size) {
        const cands = buildCandidates(g, B.CAMINO);
        const scored = [];
        for (let k = 0; k < cands.length; k++) {
          const ci = cands[k];
          if (!plan.has(ci)) continue;
          let s = 20;
          if (countAdjacent(g, ci, x => x.b === B.CAMINO || isSettle(x.b))) s += 8;
          if (g.cells[ci].t === T.RIO) s += 10;       // puente
          scored.push({ ci, s });
        }
        scored.sort((a, b) => b.s - a.s);
        for (let k = 0; k < scored.length && builds < maxBuilds; k++) tryBuild(B.CAMINO, scored[k].ci, 4);
      }
    }

    // 5. Fortalecer el frente con un bastión aunque no haya urgencia. Es el
    //    edificio intermedio correcto: 30 de coste, Defensa 3 y +3/+3.
    if (wood >= 36 && food >= 24 && ctx.frontierActive) {
      const b = bestCandidate(g, me, ctx, B.BASTION, ci => bastionSpotScore(g, me, ctx, ci));
      if (b && b.score >= 14) tryBuild(B.BASTION, b.ci);
    }

    // 6. Ciudad: se construye DIRECTAMENTE sobre el mejor racimo de recursos
    //    (el pueblo intermedio no hace falta). Cuesta 60 de cada recurso, así
    //    que solo se intenta con una economía sólida.
    {
      const b = bestCandidate(g, me, ctx, B.CIUDAD, ci => {
        const c = g.cells[ci];
        if (c.b === B.CIUDAD) return -100;
        let s = settleSpotScore(g, me, ctx, ci) + 5;
        if (c.b === B.CAMPAMENTO || c.b === B.PUEBLO || c.b === B.BASTION) s += 6;
        return s;
      });
      const richCity = (f.gold || 0) > 100 && (f.food || 0) > 100 && (f.wood || 0) > 100;
      if (!navyNeed && b && b.score > 0 && richCity && net.netFood > 0 && net.netGold > 0) tryBuild(B.CIUDAD, b.ci, 4);
    }
  }

  // =====================================================================
  // 8. Banca, préstamos y árboles
  // =====================================================================
  function manageBank(g, me, ctx) {
    const f = g.f[me], cap = ctx.capital;
    if (!cap || cap.b !== B.CIUDAD) return;
    const comp = cap.comp, s = stockOf(g, f, comp);
    if (!s) return;
    const net = ctx.net || { netFood: 0, netGold: 0 };
    const buy = (res, qty, maxRate, reserve) => {
      if (qty <= 0) return 0;
      let q = null;
      try { q = HF.bankQuote ? HF.bankQuote(g, f, res) : null; } catch (e) { q = null; }
      if (!q || !(q.rate > 0) || q.rate > maxRate) return 0;
      const maxGold = Math.max(0, (s.gold || 0) - (reserve || 0));
      const afford = Math.floor(maxGold / q.rate);
      const n = Math.min(qty, afford, 60);
      if (n <= 0) return 0;
      const r = HF.bankExchange(g, cap.i, res, n);
      return (r && r.ok) ? n : 0;
    };
    const goldReserve = Math.max(8, net.netGold < 0 ? 0 : 20);
    const reserveForNavy = !!(ctx.naval && ctx.naval.needTransport && ctx.myShips.length < ctx.naval.shipsWanted);
    const spendReserve = reserveForNavy ? Math.max(goldReserve, 70) : goldReserve;
    // Comida: cubrir dos turnos de déficit antes de que el hambre degrade tropas.
    if (net.netFood < 0) {
      const need = Math.min(40, Math.ceil(-net.netFood * 2) + 5);
      const low = (s.food || 0) < need;
      if (low) buy('food', need, (s.food || 0) <= 2 ? 6 : 4.2, spendReserve);
    }
    // Comida de emergencia aunque el neto sea incierto.
    if ((s.food || 0) <= 0 || (f.food || 0) <= 0) buy('food', 20, 6, 4);
    // Colchón de granero: permite pagar Asedio (30) y evita el hambre tras
    // una tanda de reclutamiento. Se paga con oro sobrante en la capital.
    if ((s.food || 0) < 18 && (s.gold || 0) > 45) buy('food', 18 - (s.food || 0), 4.5, Math.max(12, spendReserve));
    // Madera para el siguiente proyecto si está escasa y el oro sobra.
    if ((s.wood || 0) < 18 && (s.gold || 0) > 55) buy('wood', 24 - (s.wood || 0), 4.5, spendReserve);
    // Préstamo de emergencia de la capital (10 turnos): último recurso.
    if (!f.loan && (s.food || 0) <= 0 && net.netFood < 0) {
      try { HF.loan(g, cap.i); } catch (e) { fail('loan', e); }
    }
  }

  function chopPriority(g, me, ctx) {
    // Las unidades ociosas junto a árboles propios con recurso bloqueado talan.
    // Se integra en la puntuación normal; esta función solo expone el cálculo
    // para pruebas y depuración.
    const out = [];
    eachCell(g, (c, i) => {
      if (c.o === me && c.b === B.ARBOL) out.push({ i, v: ctx.trees[i] || 0, res: c.res || 0 });
    });
    return out;
  }

  // =====================================================================
  // 9. Reclutamiento
  // =====================================================================
  function countType(g, me, type) {
    let n = 0;
    eachCell(g, (c) => { if (c.u && c.u.owner === me && c.u.type === type) n++; });
    return n;
  }

  function wantedTypes(g, me, ctx) {
    const f = g.f[me], turn = g.turn, out = [];
    const myInf = countType(g, me, 'INF') + countType(g, me, 'ENG');
    const myArc = countType(g, me, 'ARC');
    const mySiege = countType(g, me, 'SIE');
    const myShips = countType(g, me, 'BAR');
    const myCab = countType(g, me, 'CAB');
    const myEng = countType(g, me, 'ENG');
    const surplus = (ctx.net.netFood > 4 && ctx.net.netGold > 2) || (f.food || 0) > 80;
    const land = myInf + myArc + mySiege + myCab;
    const navyNeed = !!(ctx.naval && ctx.naval.needTransport && myShips < ctx.naval.shipsWanted);

    // Fase de invasión: primero los transportes, pero sin dejar el ejército a
    // cero. Una oleada de 3 barcos necesita 3 unidades de tierra; si la IA se
    // queda solo con barcos, no tiene con qué desembarcar.
    if (navyNeed) {
      if (myShips < ctx.naval.shipsWanted) out.push('BAR');
      if (land < Math.max(2, ctx.naval.shipsWanted)) out.push('INF');
      if (turn > 5 && myArc < 1) out.push('ARC');
      const seenN = new Set(), listN = [];
      for (let k = 0; k < out.length; k++) if (!seenN.has(out[k])) { seenN.add(out[k]); listN.push(out[k]); }
      return listN;
    }

    if (ctx.naval && ctx.naval.needTransport && myShips < Math.max(1, ctx.naval.shipsWanted)) out.push('BAR');
    if (ctx.stance === 'defend') {
      if (ctx.siegeTarget != null && mySiege < 1 && turn > 4) out.push('SIE');
      if (myArc < Math.ceil(myInf / 2) && turn > 3) out.push('ARC');
      out.push('INF');
      if (myShips > 0 && myShips < 2 && ctx.enemyShips.length) out.push('BAR');
    } else {
      if (ctx.siegeTarget != null && mySiege < 1 && turn > 4) out.push('SIE');
      if (myArc < Math.ceil(myInf / 3) + 1 && turn > 3) out.push('ARC');
      if ((has(f, 'TACTIC_MOBILE_WAR') || has(f, 'CIV_TYPE_NOMAD')) && myCab < 2 && surplus) out.push('CAB');
      if (myEng < 1 && turn > 4 && (ctx.frontierActive || has(f, 'MIL_SIEGE_ENGINEERING'))) out.push('ENG');
      if (ctx.naval && ctx.naval.needTransport && myShips < 2) out.push('BAR');
      out.push('INF');
    }
    // Sin duplicados y con la infantería como relleno final.
    const seen = new Set(), list = [];
    for (let k = 0; k < out.length; k++) if (!seen.has(out[k])) { seen.add(out[k]); list.push(out[k]); }
    return list;
  }

  function recruit(g, me, ctx) {
    const f = g.f[me];
    const net = ctx.net;
    const inc = ctx.income || {};
    const navyNeed = !!(ctx.naval && ctx.naval.needTransport && ctx.myShips.length < ctx.naval.shipsWanted);
    let maxNew = g.difficulty === 'easy' ? 1 : HF.CFG.ai.recruitPerTurn;
    if (navyNeed) maxNew = 1;
    if (net.netFood < 0) maxNew = Math.min(maxNew, 1);
    if (net.netFood < -8 || net.netGold < -8) maxNew = Math.min(maxNew, 1);
    // Reserva de comida: sin granero no se puede pagar el Asedio (30) ni
    // sostener un ejército grande. La IA antigua reclutaba 3/turno y acababa
    // con 0 comida y 18 unidades de N1.
    if ((f.food || 0) < 10) maxNew = 0;
    else if ((f.food || 0) < 28 && net.netFood < 4) maxNew = Math.min(maxNew, 1);
    if (f.deficit && !ctx.threatened) maxNew = 0;
    const myUnits = countType(g, me, 'INF') + countType(g, me, 'ENG') + countType(g, me, 'ARC') +
      countType(g, me, 'CAB') + countType(g, me, 'SIE') + countType(g, me, 'BAR');
    const sustainable = Math.floor(((inc.food || 0) + (inc.gold || 0)) / 6) + 5;
    if (myUnits > sustainable + 4) maxNew = Math.min(maxNew, 1);

    let n = 0;
    const types = wantedTypes(g, me, ctx);
    for (let t = 0; t < types.length && n < maxNew; t++) {
      const type = types[t];
      const D = HF.UNITS[type];
      if (!D) continue;
      let scan = null;
      try { scan = HF.recruitScan(g, type); } catch (e) { continue; }
      if (!scan || !scan.size) {
        // Sin hueco/coste para un transporte: si aún no hay 60 de oro/madera,
        // se ahorra en lugar de gastarlo en otra unidad y bloquear la flota.
        if (navyNeed && type === 'BAR' && ((f.gold || 0) < 60 || (f.wood || 0) < 60)) return;
        continue;
      }
      let best = null, bs = -Infinity;
      scan.forEach((comps, ci) => {
        const c = g.cells[ci];
        if (!c) return;
        for (let k = 0; k < comps.length; k++) {
          const comp = comps[k];
          const pv = safePreview(g, f, comp);
          // El Barco se paga con el stock de la provincia (recruitScan ya
          // comprobó costeOk). No se exige que su neto sea positivo: si no,
          // una provincia costera pobre bloqueaba la flota para siempre.
          // Para el resto basta con que el déficit no sea ya crítico global.
          if (type !== 'BAR') {
            if ((f.food || 0) < 15 && pv.netFood < 0) continue;
            if ((f.gold || 0) < 15 && pv.netGold < 0) continue;
          }
          let s = 0;
          if (type === 'BAR') {
            const wd = ctx.naval && ctx.naval.wf ? ctx.naval.wf[ci] : ctx.waterDist[ci];
            s += 24 - (wd >= BIG ? 12 : wd) * 1.2;
            if (ctx.naval && ctx.naval.targetComp >= 0 && ctx.df[ci] < BIG) s += 4;
            s -= (ctx.threat.navalDanger[ci] || 0) * 3;
          } else {
            s -= ctx.df[ci] * 1.6;
            if (ctx.guard[ci]) s += 10;
            if (ctx.threat.danger[ci] >= 3) s -= 16;
            if (ctx.threat.danger[ci] > 0) s -= ctx.threat.danger[ci] * 1.5;
            if (ctx.frontier[ci]) s += 3;
            if (ctx.stance === 'defend' && ctx.myCities.indexOf(ci) >= 0) s += 8;
          }
          if (type === 'SIE' && ctx.enemyCities.length) s += 6;
          if (type === 'ARC') s += 2;
          if (s > bs) { bs = s; best = { ci, comp }; }
        }
      });
      if (!best) continue;
      if (HF.recruit(g, type, best.ci, best.comp).ok) n++;
    }
  }

  // =====================================================================
  // 10. Barcos: navegación, desembarco, escolta y evacuación
  // =====================================================================
  function distToCells(cell, cellsList) {
    let d = BIG;
    for (let k = 0; k < cellsList.length; k++) d = Math.min(d, HEX(cell, cellsList[k]));
    return d;
  }

  function shipCoastSafety(g, i) {
    let d = 0;
    try { d = HF.coastDistance ? HF.coastDistance(g, i, 4) : 0; } catch (e) { d = 0; }
    const lethal = (HF.CFG.storm && HF.CFG.storm.lethalCoastDist) || 2;
    return d >= lethal ? -10 : d <= 1 ? 4 : 0;
  }

  function canLandFrom(g, ctx, plan, pos) {
    if (!plan || plan.targetComp < 0) return false;
    const nb = grid(g).nb[pos] || [];
    for (let j = 0; j < nb.length; j++) {
      const i = nb[j], c = g.cells[i];
      if (!c || c.t === T.MAR || ctx.comp[i] !== plan.targetComp) continue;
      if (c.u && c.u.owner === ctx.me) continue;
      if (c.fire > 0 || c.burn > 0) continue;
      return true;
    }
    return false;
  }

  function hasLandingSpot(g, ctx, plan, w) {
    if (!plan || plan.targetComp < 0) return false;
    const nb = grid(g).nb[w] || [];
    for (let j = 0; j < nb.length; j++) {
      const i = nb[j], c = g.cells[i];
      if (!c || c.t === T.MAR || ctx.comp[i] !== plan.targetComp) continue;
      if (c.u && c.u.owner === ctx.me) continue;   // ya hay tropa propia
      if (c.fire > 0 || c.burn > 0) continue;
      return true;
    }
    return false;
  }

  function shipNavScore(g, me, ctx, from, to, u, plan, targets, useWf) {
    let s = 0;
    if (useWf && plan.wf) {
      const a = plan.wf[from], b = plan.wf[to];
      if (a < BIG && b < BIG) {
        s += (a - b) * 12;
        if (b >= a) s -= 8;
        if (a === 0 && b === 0) s -= 14;
      } else if (b >= BIG) s -= 14;
    }
    if (useWf) {
      const fromSpot = hasLandingSpot(g, ctx, plan, from);
      const toSpot = hasLandingSpot(g, ctx, plan, to);
      if (!fromSpot && toSpot) s += 40;
      else if (toSpot) s += 14;
      else s -= 6;
    }
    if (targets && targets.length) {
      const d0 = distToCells(g.cells[from], targets);
      const d1 = distToCells(g.cells[to], targets);
      s += (d0 - d1) * 10;
      if (d1 === 0) s -= 8;            // ya en el punto de recogida
    }
    if (ctx.storm[to]) s -= 90;
    else if (ctx.stormNext[to]) s -= 30;
    s += shipCoastSafety(g, to);
    s -= (ctx.threat.navalDanger[to] || 0) * 3;
    return s;
  }

  function playShips(g, me, ctx) {
    const plan = ctx.naval || emptyNaval();
    // Se recorre el tablero en vivo: un barco recién reclutado también navega.
    const positions = [];
    eachCell(g, (c, i) => {
      if (c.u && c.u.owner === me && c.u.type === 'BAR' && HF.ready(c.u)) positions.push(i);
    });
    if (!positions.length) return;

    const pickup = [];
    if (plan.stranded && plan.stranded.size) {
      plan.stranded.forEach(i => { if (g.cells[i]) pickup.push(g.cells[i]); });
    } else if (plan.staging >= 0 && g.cells[plan.staging]) {
      pickup.push(g.cells[plan.staging]);
    }
    const targetComp = plan.targetComp;
    const waveMin = Math.max(2, HF.CFG.isolatedCampMin || 3);
    let targetHasSettle = !!plan.targetHasSettle;
    let ownTargetCells = 0;
    if (targetComp >= 0) eachCell(g, (c, i) => {
      if (c.o !== me || ctx.comp[i] !== targetComp) return;
      ownTargetCells++;
      if (isSettle(c.b)) targetHasSettle = true;
    });
    const rescueMode = !!(plan.stranded && plan.stranded.size);

    for (let s = 0; s < positions.length; s++) {
      let pos = positions[s];
      for (let pass = 0; pass < 2; pass++) {
        const c = g.cells[pos];
        if (!c || !c.u || c.u.owner !== me || c.u.type !== 'BAR' || !HF.ready(c.u)) break;
        const u = c.u, cargo = u.cargo;
        const opts = HF.options(g, pos);
        if (!opts || !opts.size) break;
        // Transportes cargados que YA están junto a la playa. La oleada se
        // sincroniza: no se desembarca de uno en uno para que los primeros no
        // mueran de aislamiento antes de que llegue el tercero.
        let atBeach = 0;
        for (let k = 0; k < positions.length; k++) {
          const sc0 = g.cells[positions[k]];
          if (sc0 && sc0.u && sc0.u.owner === me && sc0.u.cargo && canLandFrom(g, ctx, plan, positions[k])) atBeach++;
        }
        let best = null;
        const consider = (to, o) => {
          const t = g.cells[to];
          if (!t) return;
          let sc = -BIG;
          if (o.ship) {
            // Desembarco de la carga.
            const toComp = ctx.comp[to];
            if (plan.targetComp >= 0 && toComp !== plan.targetComp) return;
            if (plan.targetComp < 0 && !ctx.myComps.has(toComp) && t.o !== me) return;
            // Nunca desembarcar de vuelta en nuestra masa de tierra de origen;
            // sí se puede reforzar una cabeza de playa del objetivo, aunque ya
            // tenga celdas nuestras.
            if (ctx.myComps.has(toComp) && toComp !== plan.targetComp && !(plan.stranded && plan.stranded.size)) return;
            // Oleada mínima: sin 3 casillas no hay campamento y la tropa
            // desembarcada muere de hambre al turno siguiente. Se espera a
            // tener suficientes transportes cargados (o a tomar un pueblo).
            const capture = t.o !== me;
            const freeSettle = isSettle(t.b) && t.o !== me;
            const isRaid = plan.raidCell >= 0 && (to === plan.raidCell || (plan.raidOnly && toComp === plan.targetComp));
            if (isRaid) sc += 60;
            if (!targetHasSettle && !freeSettle && !rescueMode && !isRaid) {
              if (!capture) return;
              if (ownTargetCells + atBeach < waveMin) return;
            }
            if (o.k === 'move') {
              if (plan.targetComp < 0 && t.o !== me) return;
              sc = 46 + coverScore(t);
              const cu = cargo;
              const def = cu ? cellDefense(g, to, cu) : 0;
              const dng = ctx.threat.danger[to] || 0;
              if (cu && lethal(def, dng, ctx.threat.elite[to])) sc -= 70;
              else sc -= dng * 2;
              if (plan.targetComp >= 0) sc += 12;
            } else if (o.k === 'atk' && o.ok) {
              sc = 55;
              if (t.u) sc += 16 + t.u.tier * 7;
              if (t.b === B.CIUDAD) sc += 55;
              else if (t.b === B.PUEBLO) sc += 26;
              sc -= (ctx.threat.danger[to] || 0) * 1.5;
            } else if (o.k === 'chop') sc = 32;
          } else if (o.k === 'atk' && o.ok) {
            // Abordaje de un barco rival.
            sc = 40 + (t.u ? t.u.tier * 4 + (t.u.cargo ? 14 : 0) : 0);
          } else if (o.k === 'shoot') {
            sc = 18 + (t.u ? t.u.tier * 4 : 0);
            if (t.b === B.CIUDAD || t.b === B.BASTION) sc += 10;
          } else if (o.k === 'raid') {
            sc = 30 + Math.min(120, o.loot || 0) * 1.4;
          }
          if (sc > -BIG && (!best || sc > best.score)) best = { to, kind: o.k, score: sc, opt: o };
        };
        opts.forEach((o, to) => {
          consider(to, o);
          if (o.alt) for (let k = 0; k < o.alt.length; k++) consider(to, o.alt[k]);
        });
        // 1. Desembarcar o combatir si merece la pena.
        if (best && best.score > 10) {
          const wasUnload = !!best.opt.ship;
          const r = HF.act(g, pos, best.to, best.kind);
          if (!r || !r.ok) break;
          if (wasUnload) {
            ownTargetCells = 0; targetHasSettle = false;
            if (targetComp >= 0) eachCell(g, (cc, ii) => {
              if (cc.o !== me || ctx.comp[ii] !== targetComp) return;
              ownTargetCells++;
              if (isSettle(cc.b)) targetHasSettle = true;
            });
          }
          if (best.to !== pos && !best.opt.ship) { pos = best.to; positions[s] = pos; }
          continue;
        }
        // 2. Navegar con un propósito: recoger tropas, ir a la playa o cazar.
        let targets = null;
        if (!cargo) {
          if (pickup.length) targets = pickup;
          else if (!plan.loadCells.size && ctx.enemyShips.length) targets = ctx.enemyShips.map(i => g.cells[i]);
        }
        if (targets && targets.length && distToCells(c, targets) <= 1) break;
        if (cargo && plan.wf && plan.wf[pos] === 0 && best && best.score > 10) break;
        if (!cargo && plan.wf && plan.wf[pos] === 0 && !pickup.length) break;
        let nav = null;
        opts.forEach((o, to) => {
          if (o.k !== 'move' || o.ship) return;
          const sc = shipNavScore(g, me, ctx, pos, to, u, plan, targets, !!cargo);
          if (!nav || sc > nav.score) nav = { to, score: sc };
        });
        if (!nav || nav.score <= 1) break;
        const r = HF.act(g, pos, nav.to, 'move');
        if (!r || !r.ok) break;
        pos = nav.to; positions[s] = pos;
      }
    }
  }

  // =====================================================================
  // 11. Orquestación
  // =====================================================================
  HF.aiPlay = function (g, me) {
    if (!g || g.over || !g.f || !g.f[me]) return;
    g.cur = me;
    // FASE 0.5: diplomacia (aislada: nunca puede impedir jugar el turno).
    try { if (HF.aiDiplomacy) HF.aiDiplomacy(g, me); } catch (e) { fail('diplomacia', e); }

    let ctx = null;
    try { ctx = analyze(g, me); } catch (e) { fail('analizar', e); }
    if (!ctx) return;

    try { manageBank(g, me, ctx); } catch (e) { fail('banca', e); }
    try { playUnits(g, me, ctx); } catch (e) { fail('unidades', e); }
    try { macro(g, me, ctx); } catch (e) { fail('construccion', e); }
    try { recruit(g, me, ctx); } catch (e) { fail('reclutamiento', e); }
    try { playUnits(g, me, ctx); } catch (e) { fail('unidades2', e); }
    try { playShips(g, me, ctx); } catch (e) { fail('naval', e); }

    // Microtáctica diplomática pre-expiración de PNA.
    if (HF.DiplomacyAI && HF.DiplomacyAI.aiPreExpirationPositioning) {
      try { HF.DiplomacyAI.aiPreExpirationPositioning(g, me); } catch (e) { fail('preExpiracion', e); }
    }
  };

  // Utilidades expuestas para pruebas, depuración y futuras pantallas de IA.
  HF.aiAnalysis = function (g, me) {
    try { return analyze(g, me); } catch (e) { fail('analysis', e); return null; }
  };
  HF.aiThreat = function (g, me) {
    try { return buildThreat(g, me); } catch (e) { fail('threat', e); return null; }
  };
  HF.aiNavalPlan = function (g, me) {
    try { return navalPlan(g, me, analyze(g, me)); } catch (e) { fail('navalPlan', e); return null; }
  };
  HF.aiChopPriority = function (g, me) {
    try { return chopPriority(g, me, analyze(g, me)); } catch (e) { fail('chop', e); return []; }
  };
  HF.aiCutValue = function (g, me, to) {
    try {
      const ctx = { me, cutCache: Object.create(null), cutDetail: Object.create(null) };
      return cutInfo(g, ctx, to).v;
    } catch (e) { fail('cut', e); return 0; }
  };
  // Informe compacto para depurar una partida en curso (se copia desde la
  // consola del navegador y se comparte; no modifica el estado).
  HF.aiReport = function (g, me) {
    try {
      const a = analyze(g, me);
      if (!a) return null;
      const buildings = {};
      let units = 0, terr = 0;
      eachCell(g, (c) => {
        if (c.o === me) {
          terr++;
          if (c.b) buildings[HF.BNAME[c.b] || ('b' + c.b)] = (buildings[HF.BNAME[c.b] || ('b' + c.b)] || 0) + 1;
        }
        if (c.u && c.u.owner === me) units++;
      });
      const naval = a.naval || emptyNaval();
      const cutTargets = Object.keys(a.cutDetail || {})
        .map(k => ({ i: +k, v: a.cutDetail[k].v, units: a.cutDetail[k].units, cells: a.cutDetail[k].cells }))
        .filter(x => x.v > 0)
        .sort((x, y) => y.v - x.v)
        .slice(0, 6);
      const raid = Object.keys(a.raid || {}).map(k => ({ unit: +k, goal: a.raid[k].goal, value: a.raid[k].value }));
      return {
        build: HF.aiBuild || '?', turn: g.turn, me, stance: a.stance, enemy: a.enemy,
        resources: { gold: g.f[me].gold, food: g.f[me].food, wood: g.f[me].wood },
        net: a.net ? { food: a.net.netFood, gold: a.net.netGold } : null,
        territory: terr, units,
        buildings,
        capital: a.capital ? a.capital.i : -1,
        siegeTarget: a.siegeTarget,
        naval: {
          targetComp: naval.targetComp, beach: naval.beach, raidCell: naval.raidCell,
          raidOnly: !!naval.raidOnly, needTransport: !!naval.needTransport,
          shipsWanted: naval.shipsWanted, ships: a.myShips.slice(),
          loadCells: Array.from(naval.loadCells || []),
          stranded: Array.from(naval.stranded || []),
          scores: (naval.scores || []).slice(0, 6)
        },
        cutTargets,
        raid,
        faults: (() => { try { return Object.keys(HF.dipFaults ? HF.dipFaults() : {}); } catch (e) { return ['?']; } })()
      };
    } catch (e) { fail('report', e); return { error: String(e && e.message || e) }; }
  };
  HF.waterField = waterField;
  HF.navStep = navStep;
})(typeof window !== 'undefined' ? window : globalThis);
