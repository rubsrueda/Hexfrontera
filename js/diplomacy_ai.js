/* FEDERATI · IA diplomática (fase 0.5 del turno de la IA).

   La diplomacia no es decorativa: decide con quién no se puede pelear, con
   quién conviene comerciar, cuándo pedir un préstamo y cuándo pedir una tregua
   para sobrevivir. Todas las decisiones son defensivas ante datos corruptos:
   si el módulo diplomático falla, la IA sigue moviendo, construyendo y
   reclutando (cada fase va aislada).

   Reglas:
     · No se firma un PNA con el objetivo de conquista (sería un Pacto Sagrado
       que impide atacarlo). Se firma con el flanco peligroso.
     · El PNA normal lleva penalización de ruptura (>0). El Pacto Sagrado
       (penalización 0) solo se usa cuando la facción está contra las cuerdas.
     · El comercio se propone por asimetría real de recursos, con cantidades
       dentro del límite del tratado.
     · Si el ejército propio es claramente inferior, se busca tregua con el
       agresor más fuerte.
*/
(function (G) {
  const HF = G.HF = G.HF || {};
  const TT = () => HF.TREATY_TYPES;
  const D = () => HF.Diplomacy;

  function rnd(g) {
    try { if (typeof HF.rnd === 'function') return HF.rnd(g)(); } catch (e) { /* sin RNG */ }
    return Math.random();
  }

  function factions(g) {
    return (g && Array.isArray(g.f)) ? g.f.filter(f => f && f.alive) : [];
  }

  function nameOf(g, id) {
    const f = g && g.f && g.f[id];
    return f ? f.name : ('F' + id);
  }

  function unitPower(g, c) {
    const u = c.u;
    if (!u || !HF.UNITS[u.type]) return 0;
    const D = HF.UNITS[u.type];
    const atk = (u.type === 'INF' || u.type === 'ENG') ? u.tier : (D.atk || 0) + u.tier - 1;
    return atk + (D.def || 0) + u.tier - 1;
  }

  function militaryPower(g, id) {
    let p = 0;
    for (const c of g.cells) if (c && c.u && c.u.owner === id) p += unitPower(g, c);
    return p;
  }

  function territory(g, id) {
    let n = 0;
    for (const c of g.cells) if (c && c.o === id) n++;
    return n;
  }

  function cityCount(g, id) {
    let n = 0;
    for (const c of g.cells) if (c && c.o === id && c.b === HF.B.CIUDAD) n++;
    return n;
  }

  function minDistance(g, a, b) {
    let best = 999;
    for (const c of g.cells) {
      if (!c || c.o !== a) continue;
      for (const d of g.cells) {
        if (!d || d.o !== b) continue;
        const v = HF.hexDist(c, d);
        if (v < best) best = v;
      }
    }
    return best;
  }

  function canAttack(g, me, other) {
    try {
      const r = D() && D().canAttack ? D().canAttack(g, me, other, 0, 0) : null;
      return !r || r.allowed !== false;
    } catch (e) { return true; }
  }

  // Objetivo de conquista: el rival más débil y cercano que no esté protegido
  // por un PNA/tregua. Si no hay ninguno, no se fuerza una guerra imposible.
  function pickWarTarget(g, me, f) {
    const preferred = (f.diplomacy && f.diplomacy.preferredTargets) || [];
    let best = null, bs = -Infinity;
    for (const o of factions(g)) {
      if (o.id === me) continue;
      if (!canAttack(g, me, o.id)) continue;
      const p = militaryPower(g, o.id);
      const dist = minDistance(g, me, o.id);
      const cities = cityCount(g, o.id);
      const terr = territory(g, o.id);
      let s = 40 - p * 0.5 - dist * 2 + cities * 12 + (terr < 5 ? 8 : 0);
      if (preferred.indexOf(o.id) >= 0) s += 15;
      if (s > bs) { bs = s; best = o.id; }
    }
    return best;
  }

  function threatOf(g, me, other) {
    try { return D() && D().threatOf ? D().threatOf(g, me, other) : 0; }
    catch (e) { return 0; }
  }

  function trustOf(g, me, other) {
    try { return D() && D().trustOf ? D().trustOf(g, me, other) : 50; }
    catch (e) { return 50; }
  }

  function willingness(g, responder, proposer, type) {
    try { return D() && D().willingness ? D().willingness(g, responder, proposer, type) : 50; }
    catch (e) { return 0; }
  }

  function hasNap(g, a, b) {
    try { return !!(D() && D().hasActiveNAP && D().hasActiveNAP(g, a, b)); }
    catch (e) { return false; }
  }

  function treatyCount(f) {
    return (f && f.treaties) ? f.treaties.length : 0;
  }

  // ---------------------------------------------------------------------
  // Fase principal
  // ---------------------------------------------------------------------
  function aiDiplomacyPhase(g, me) {
    try {
      if (!g || !HF.Diplomacy || !g.f || !g.f[me]) return;
      const DIP = D();
      DIP.ensure(g);
      const f = g.f[me];
      if (!f || !f.alive) return;
      DIP.updateThreatMap(g, me);

      const myPower = militaryPower(g, me);
      let maxEnemyPower = 0, strongest = null, strongestThreat = -1;
      for (const o of factions(g)) {
        if (o.id === me) continue;
        const p = militaryPower(g, o.id);
        if (p > maxEnemyPower) maxEnemyPower = p;
        const th = threatOf(g, me, o.id);
        if (th > strongestThreat) { strongestThreat = th; strongest = o.id; }
      }
      const losing = myPower < maxEnemyPower * 0.7;
      const war = pickWarTarget(g, me, f);
      const slots = 8 - treatyCount(f);
      let acted = 0;

      // 1. PNA con el flanco peligroso (nunca con el objetivo de conquista,
      //    salvo que estemos perdiendo y toque sobrevivir).
      if (slots > 0 && !hasNap(g, me, war)) {
        let napTarget = null, napThreat = 0;
        for (const o of factions(g)) {
          if (o.id === me || o.id === war) continue;
          if (hasNap(g, me, o.id)) continue;
          const th = threatOf(g, me, o.id);
          if (th > napThreat) { napThreat = th; napTarget = o.id; }
        }
        if (napTarget != null && (napThreat >= 35 || (losing && napThreat >= 20)) &&
          willingness(g, napTarget, me, TT().NAP) >= 42 && rnd(g) < 0.7) {
          const sacred = losing && napThreat >= 60;
          const dur = napThreat >= 60 ? 12 : napThreat >= 35 ? 22 : 28;
          DIP.proposeTreaty(g, me, napTarget, TT().NAP, {
            duration: dur,
            borderLock: true,
            visionSharing: trustOf(g, me, napTarget) >= 60,
            // Penalización > 0: se puede romper pagando. 0 solo en desesperación.
            breakPenalty: sacred ? 0 : 15
          });
          acted++;
        }
      }

      // 1b. Asegurar un flanco aunque la amenaza aún sea baja: un PNA con el
      //     vecino más fiable deja una sola frontera que defender. Nunca con
      //     el objetivo de conquista.
      if (slots > acted && rnd(g) < 0.3) {
        let friend = null, bestScore = -1;
        for (const o of factions(g)) {
          if (o.id === me || o.id === war || hasNap(g, me, o.id)) continue;
          if (threatOf(g, me, o.id) > 45) continue;
          const tr = trustOf(g, me, o.id);
          const wl = willingness(g, o.id, me, TT().NAP);
          if (wl < 42) continue;
          const sc = wl * 0.7 + tr * 0.3;
          if (sc > bestScore) { bestScore = sc; friend = o.id; }
        }
        if (friend != null) {
          const r = DIP.proposeTreaty(g, me, friend, TT().NAP, {
            duration: 25, borderLock: true, visionSharing: trustOf(g, me, friend) >= 60, breakPenalty: 15
          });
          if (r && r.success) acted++;
        }
      }

      // 2. Tregua si estamos claramente por debajo y el agresor nos presiona.
      if (losing && strongest != null && strongestThreat >= 55 && slots > acted) {
        const hasTruce = (() => {
          try { return DIP.hasTruce(g, me, strongest); } catch (e) { return false; }
        })();
        if (!hasTruce && (!hasNap(g, me, strongest) || rnd(g) < 0.5) &&
          willingness(g, strongest, me, TT().TRUCE) >= 30) {
          const r = DIP.proposeTreaty(g, me, strongest, TT().TRUCE, { duration: 10 });
          if (r && r.success) acted++;
        }
      }

      // 3. Comercio por asimetría: dar lo que sobra, recibir lo que falta.
      if (slots > acted) {
        const opp = DIP.evaluateTradeOpportunity(g, me);
        if (opp && opp.value > 25 && opp.partner != null && !hasNap(g, me, opp.partner) &&
          willingness(g, opp.partner, me, TT().TRADE) >= 38 &&
          (opp.partner !== war || trustOf(g, me, opp.partner) >= 65)) {
          const maxRoute = (g.diplomacyConfig && g.diplomacyConfig.trade && g.diplomacyConfig.trade.maxValuePerRoute) || 12;
          const amount = v => Math.max(1, Math.min(maxRoute, Math.round(v)));
          DIP.proposeTreaty(g, me, opp.partner, TT().TRADE, {
            duration: 20,
            routes: [
              { resource: opp.give.resource, fromFaction: me, toFaction: opp.partner, amountPerTurn: amount(opp.give.amount) },
              { resource: opp.take.resource, fromFaction: opp.partner, toFaction: me, amountPerTurn: amount(opp.take.amount) }
            ]
          });
          acted++;
        }
      }

      // 4. Préstamo de emergencia (el mercado lo financia de verdad).
      if (slots > acted) {
        const need = DIP.evaluateLoanNeed(g, me);
        if (need && need.needed) {
          // Buscar el prestamista más rico y no hostil.
          let lender = null, lg = -1;
          for (const o of factions(g)) {
            if (o.id === me) continue;
            if (o.id === war) continue;
            if (threatOf(g, me, o.id) > 55) continue;
            if ((o.gold || 0) > lg) { lg = o.gold || 0; lender = o.id; }
          }
          DIP.requestLoan(g, me, need.amount, need.maxRate, need.purpose, lender);
          acted++;
        }
      }

      // 5. Préstamos que caducan / renovaciones de PNA.
      let naps = [];
      try { naps = DIP.getActiveTreaties(g, me, TT().NAP) || []; } catch (e) { naps = []; }
      for (const treaty of naps) {
        const other = treaty.factions.find(id => id !== me);
        if (other == null) continue;
        const threat = threatOf(g, me, other);
        const expiring = treaty.expiryTurn - g.turn <= 3;
        if (!expiring) continue;
        if (other === war || threat >= 50) {
          // Dejar que expire: se prepara la guerra.
          const pref = f.diplomacy.preferredTargets;
          if (pref.indexOf(other) < 0) pref.push(other);
          if (pref.length > 4) pref.shift();
          continue;
        }
        if (slots > acted && trustOf(g, me, other) >= 40 &&
          willingness(g, other, me, TT().NAP) >= 42) {
          DIP.proposeTreaty(g, me, other, TT().NAP, {
            duration: 25, borderLock: true, visionSharing: true, breakPenalty: 15
          });
          acted++;
        }
      }

      // 6. Oferta de préstamo cuando sobra oro: gana intereses y confianza.
      if (!losing && (f.gold || 0) > 180 && slots > acted + 1) {
        try {
          const active = DIP.getActiveTreaties(g, me, TT().LOAN) || [];
          if (active.length < 1) DIP.offerLoan(g, me, 40, 0.12, 55);
        } catch (e) { /* mercado opcional */ }
      }
    } catch (e) {
      try { if (HF.dipError) HF.dipError('aiDiplomacyPhase', e); } catch (_) { /* no romper */ }
    }
  }

  // ---------------------------------------------------------------------
  // Microtáctica: acercar tropas antes de que expire un PNA
  // ---------------------------------------------------------------------
  function aiPreExpirationPositioning(g, me) {
    try {
      if (!g || !HF.Diplomacy) return;
      const DIP = D();
      DIP.ensure(g);
      const f = g.f[me];
      if (!f || !f.alive) return;
      const naps = DIP.getActiveTreaties(g, me, TT().NAP);
      let moves = 0;
      for (const treaty of naps) {
        if (moves >= 3) break;
        const other = treaty.factions.find(id => id !== me);
        if (other == null) continue;
        const countdown = treaty.expiryTurn - g.turn;
        if (countdown < 0 || countdown > 3) continue;
        if (threatOf(g, me, other) < 55) continue;
        const pref = f.diplomacy.preferredTargets;
        if (pref.indexOf(other) < 0) pref.push(other);
        moves += positionForAttack(g, me, other, 3 - moves);
      }
    } catch (e) {
      try { if (HF.dipError) HF.dipError('aiPreExpirationPositioning', e); } catch (_) { /* no romper */ }
    }
  }

  // Acerca unidades ociosas a la frontera sin gastar más de `limit` acciones.
  function positionForAttack(g, attackerId, targetId, limit) {
    const attacker = g.f[attackerId];
    if (!attacker || !attacker.alive) return 0;
    const border = [];
    for (const c of g.cells) {
      if (!c || c.o !== targetId) continue;
      for (const nb of HF.nbs(g, c.i)) {
        const n = g.cells[nb];
        if (n && n.o === attackerId && !n.u) border.push(n.i);
      }
      if (border.length > 24) break;
    }
    if (!border.length) return 0;
    let done = 0;
    for (const c of g.cells) {
      if (done >= limit) break;
      if (!c || !c.u || c.u.owner !== attackerId || !HF.ready(c.u) || c.u.type === 'BAR') continue;
      let best = -1, bestDist = Infinity;
      for (const ci of border) {
        const dist = HF.hexDist(g.cells[c.i], g.cells[ci]);
        if (dist < bestDist) { bestDist = dist; best = ci; }
      }
      if (best < 0 || bestDist > (c.u.mv || 0)) continue;
      const opts = HF.options(g, c.i);
      const opt = opts && opts.get ? opts.get(best) : null;
      if (!opt || opt.k !== 'move') continue;
      const res = HF.act(g, c.i, best, 'move');
      if (res && res.ok) { done++; border.splice(border.indexOf(best), 1); }
    }
    return done;
  }

  HF.DiplomacyAI = {
    aiDiplomacyPhase,
    aiPreExpirationPositioning,
    // Compatibilidad con llamadas antiguas.
    evaluateNAPNeed: function (g, factionId) {
      try { return HF.Diplomacy.evaluateNAPNeed(g, factionId); }
      catch (e) { if (HF.dipError) HF.dipError('evaluateNAPNeed', e); return { needed: false }; }
    },
    evaluateLoanNeed: function (g, factionId) {
      try { return HF.Diplomacy.evaluateLoanNeed(g, factionId); }
      catch (e) { if (HF.dipError) HF.dipError('evaluateLoanNeed', e); return { needed: false }; }
    },
    evaluateTradeOpportunity: function (g, factionId) {
      try { return HF.Diplomacy.evaluateTradeOpportunity(g, factionId); }
      catch (e) { if (HF.dipError) HF.dipError('evaluateTradeOpportunity', e); return { value: 0 }; }
    },
    estimateEnemyNAPWillingness: function (g, enemyId, ourId) {
      try { return HF.Diplomacy.willingness(g, enemyId, ourId, HF.TREATY_TYPES.NAP); }
      catch (e) { if (HF.dipError) HF.dipError('estimateEnemyNAPWillingness', e); return 30; }
    }
  };

  HF.aiDiplomacy = function (g, factionId) {
    try {
      if (HF.DiplomacyAI && HF.DiplomacyAI.aiDiplomacyPhase) HF.DiplomacyAI.aiDiplomacyPhase(g, factionId);
    } catch (e) { if (HF.dipError) HF.dipError('aiDiplomacy', e); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
