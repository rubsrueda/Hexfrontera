/* FEDERATI · Diplomacia: tratados, Pacto Sagrado, comercio y banca.
   El estado diplomático se guarda como Maps/arrays, pero puede llegar de un
   guardado, de un undo o de una partida antigua como objeto plano (o incluso
   como Set). Todas las lecturas pasan por `ensure`/`threatOf`/`trustOf`, de
   modo que un dato migrado nunca puede lanzar "…get is not a function" ni
   bloquear el cierre de turno. */
(function (G) {
  const HF = G.HF = G.HF || {};

  // =====================================================================
  // Tipos y estados
  // =====================================================================
  HF.TREATY_TYPES = {
    NAP: 'non_aggression_pact',
    TRADE: 'trade_agreement',
    LOAN: 'loan_contract',
    TRUCE: 'truce'
  };
  const TT = HF.TREATY_TYPES;
  const TYPE_LABEL = {
    non_aggression_pact: 'PNA',
    trade_agreement: 'Comercio',
    loan_contract: 'Préstamo',
    truce: 'Tregua'
  };
  HF.TREATY_LABEL = TYPE_LABEL;
  const STATUS = {
    NEGOTIATING: 'negotiating',
    ACTIVE: 'active',
    REJECTED: 'rejected',
    EXPIRED: 'expired',
    BROKEN: 'broken',
    PAID: 'paid',
    DEFAULTED: 'defaulted',
    ARREARS: 'in_arrears'
  };
  HF.DIPLOMACY_STATUS = STATUS;
  const VALID_TYPE = new Set(Object.values(TT));
  const VALID_STATUS = new Set(Object.values(STATUS));

  // Límites de memoria: sin esto las propuestas de la IA se acumulaban para
  // siempre (una por turno y facción) y el guardado crecía sin control.
  const MAX_TREATIES_PER_FACTION = 8;
  const MAX_TREATIES_TOTAL = 48;
  const NEGOTIATION_TIMEOUT = 3;      // turnos que una propuesta espera respuesta
  const MAX_MARKET_REQUESTS = 8;
  const MAX_MARKET_OFFERS = 8;

  function defaultCfg() {
    return {
      nap: {
        minDuration: 5, maxDuration: 30, breakPenalty: 0, borderLockDefault: true,
        visionSharingDefault: false, renewalGracePeriod: 3
      },
      trade: {
        maxRoutesPerTreaty: 3, routeInterdictionLoss: 0.5, routeSetupCost: 10,
        minRouteValue: 2, maxValuePerRoute: 12
      },
      loans: {
        baseInterestRate: 0.10, maxInterestRate: 0.50,
        creditScoreImpact: { onTimePayment: 1, latePayment: -5, default: -20, earlyRepayment: 3 },
        collateralTypes: ['trade_route', 'city_income', 'unit_production'],
        defaultSeizureRate: 0.30, maxActiveLoansPerFaction: 3,
        termTurns: 10, marketTtl: 6
      },
      trust: {
        baseTrust: 50, decayPerTurn: 1, napBreakPenalty: 50, loanDefaultPenalty: 30,
        tradeBetrayalPenalty: 20, warDeclarationPenalty: 15, giftBonus: 5
      },
      ai: {
        napUrgencyThreshold: 2, loanDesperationThreshold: -20, tradeAsymmetryThreshold: 2.0,
        maxNAPDurationVsThreat: { low: 25, medium: 15, high: 8 }
      }
    };
  }

  function mergeCfg(cfg) {
    const out = defaultCfg();
    if (!cfg || typeof cfg !== 'object') return out;
    for (const group of Object.keys(out)) {
      const src = cfg[group];
      if (!src || typeof src !== 'object') continue;
      for (const key of Object.keys(out[group])) {
        if (src[key] !== undefined && src[key] !== null) out[group][key] = src[key];
      }
    }
    return out;
  }

  // La configuración de equilibrio vive en HF.CFG.diplomacy (minúscula). Antes
  // se leía HF.CFG.DIPLOMACY, que no existe, y todo el módulo trabajaba con {}.
  function cfgDefaults() {
    return mergeCfg(HF.CFG && HF.CFG.diplomacy);
  }

  // =====================================================================
  // Normalización de datos (guardados, undo, versiones antiguas)
  // =====================================================================
  const isObj = v => v !== null && typeof v === 'object';
  const isNum = v => typeof v === 'number' && isFinite(v);

  function toId(v) {
    if (typeof v === 'number') return isNum(v) ? v : NaN;
    return parseInt(v, 10);
  }

  // Convierte Set / array / objeto plano de valores en un array de ids únicos.
  function idList(v) {
    const out = [];
    const push = x => {
      const n = toId(x);
      if (isNum(n) && n >= 0 && out.indexOf(n) < 0) out.push(n);
    };
    if (!v) return out;
    if (Array.isArray(v)) { for (const x of v) push(x); return out; }
    if (v instanceof Set) { for (const x of v) push(x); return out; }
    if (v instanceof Map) { for (const x of v.values()) push(x); return out; }
    if (isObj(v)) { for (const k of Object.keys(v)) push(v[k]); }
    return out;
  }

  // Numera las claves: un Map restaurado desde JSON tendría claves de texto y
  // `get(2)` fallaría aunque el valor exista ("2"). Se reconstruye solo si hace
  // falta, conservando la instancia cuando ya es correcta.
  function numMap(v) {
    if (v instanceof Map) {
      let needsFix = false;
      for (const k of v.keys()) { if (typeof k !== 'number') { needsFix = true; break; } }
      if (!needsFix) return v;
      const m = new Map();
      for (const [k, val] of v) {
        const kk = toId(k), vv = Number(val);
        if (isNum(kk) && isNum(vv)) m.set(kk, vv);
      }
      return m;
    }
    const m = new Map();
    if (isObj(v)) {
      for (const k of Object.keys(v)) {
        const kk = toId(k), vv = Number(v[k]);
        if (isNum(kk) && isNum(vv)) m.set(kk, vv);
      }
    }
    return m;
  }

  function economy() {
    const zero = () => ({ food: 0, gold: 0, wood: 0, iron: 0, population: 0 });
    return {
      income: zero(), expenses: zero(), net: zero(),
      activeLoans: [], loansGiven: [], creditScore: 70, defaultHistory: 0,
      strategicReserves: zero(), lastLoanPayment: 0
    };
  }

  function diplomacyState() {
    return {
      threatMap: new Map(), preferredTargets: [], securedFlanks: [],
      tradePartners: [], trustScores: new Map(), betrayals: new Map(),
      _tTurn: -1
    };
  }

  function ensureFaction(f, idx) {
    if (!f) return null;
    if (!isNum(f.id)) f.id = idx;
    f.treaties = idList(f.treaties);
    f.treatyHistory = idList(f.treatyHistory);
    if (!isObj(f.economy)) f.economy = economy();
    else {
      const base = economy();
      for (const k of ['income', 'expenses', 'net', 'strategicReserves']) {
        if (!isObj(f.economy[k])) f.economy[k] = base[k];
        else for (const res of Object.keys(base[k])) if (!isNum(f.economy[k][res])) f.economy[k][res] = 0;
      }
      if (!Array.isArray(f.economy.activeLoans)) f.economy.activeLoans = idList(f.economy.activeLoans);
      if (!Array.isArray(f.economy.loansGiven)) f.economy.loansGiven = idList(f.economy.loansGiven);
      if (!isNum(f.economy.creditScore)) f.economy.creditScore = 70;
      if (!isNum(f.economy.defaultHistory)) f.economy.defaultHistory = 0;
      if (!isNum(f.economy.lastLoanPayment)) f.economy.lastLoanPayment = 0;
    }
    if (!isObj(f.diplomacy)) f.diplomacy = diplomacyState();
    else {
      const d = f.diplomacy;
      d.threatMap = numMap(d.threatMap);
      d.trustScores = numMap(d.trustScores);
      d.betrayals = numMap(d.betrayals);
      d.preferredTargets = idList(d.preferredTargets);
      d.securedFlanks = idList(d.securedFlanks);
      d.tradePartners = idList(d.tradePartners);
      if (!isNum(d._tTurn)) d._tTurn = -1;
    }
    return f;
  }

  function ensureTreaty(t, id) {
    if (!isObj(t)) return null;
    if (!isNum(t.id)) t.id = id;
    if (!VALID_TYPE.has(t.type)) return null;
    t.factions = idList(t.factions);
    if (t.factions.length < 2) return null;
    if (!VALID_STATUS.has(t.status)) t.status = STATUS.NEGOTIATING;
    if (!isNum(t.startTurn)) t.startTurn = 1;
    if (!isNum(t.duration)) t.duration = t.type === TT.NAP
      ? (cfgDefaults().nap.maxDuration) : 15;
    if (!isNum(t.expiryTurn)) t.expiryTurn = t.startTurn + t.duration - 1;
    if (!Array.isArray(t.negotiationLog)) t.negotiationLog = [];
    if (t.type === TT.NAP) {
      const nt = isObj(t.napTerms) ? t.napTerms : {};
      t.napTerms = {
        borderLock: nt.borderLock !== false,
        visionSharing: nt.visionSharing === true,
        breakPenalty: isNum(nt.breakPenalty) ? nt.breakPenalty : 0
      };
    } else t.napTerms = null;
    if (t.type === TT.TRADE) {
      const tr = isObj(t.tradeTerms) ? t.tradeTerms : {};
      const routes = Array.isArray(tr.routes) ? tr.routes : [];
      t.tradeTerms = {
        routes: routes.filter(r => isObj(r) && typeof r.resource === 'string').map(r => ({
          resource: r.resource,
          fromFaction: toId(r.fromFaction),
          toFaction: toId(r.toFaction),
          amountPerTurn: isNum(r.amountPerTurn) ? Math.max(0, Math.round(r.amountPerTurn)) : 0,
          routeCells: Array.isArray(r.routeCells) ? r.routeCells.filter(isNum) : [],
          active: r.active !== false,
          lastTransfer: isNum(r.lastTransfer) ? r.lastTransfer : 0
        })),
        totalValuePerTurn: isNum(tr.totalValuePerTurn) ? tr.totalValuePerTurn : 0
      };
    } else t.tradeTerms = null;
    if (t.type === TT.LOAN) {
      const ln = isObj(t.loanTerms) ? t.loanTerms : {};
      t.loanTerms = {
        principal: isNum(ln.principal) ? ln.principal : 0,
        interestRate: isNum(ln.interestRate) ? ln.interestRate : 0.1,
        remainingTurns: isNum(ln.remainingTurns) ? ln.remainingTurns : 10,
        totalOwed: isNum(ln.totalOwed) ? ln.totalOwed : 0,
        collateral: isObj(ln.collateral) ? ln.collateral : null,
        lender: toId(ln.lender),
        borrower: toId(ln.borrower)
      };
      if (!isNum(t.loanTerms.lender) || !isNum(t.loanTerms.borrower)) {
        t.loanTerms.lender = t.factions[0];
        t.loanTerms.borrower = t.factions[1];
      }
    } else t.loanTerms = null;
    return t;
  }

  function ensureTreaties(v) {
    const out = new Map();
    if (v instanceof Map) {
      for (const [k, t] of v) {
        const id = toId(isObj(t) && t.id != null ? t.id : k);
        const ok = isNum(id) ? ensureTreaty(t, id) : null;
        if (ok) out.set(ok.id, ok);
      }
    } else if (Array.isArray(v)) {
      for (const pair of v) {
        if (Array.isArray(pair) && pair.length === 2) {
          const id = toId(pair[0]);
          const ok = isNum(id) ? ensureTreaty(pair[1], id) : null;
          if (ok) out.set(ok.id, ok);
        }
      }
    } else if (isObj(v)) {
      for (const k of Object.keys(v)) {
        const id = toId(k);
        const ok = isNum(id) ? ensureTreaty(v[k], id) : null;
        if (ok) out.set(ok.id, ok);
      }
    }
    return out;
  }

  // g.treaties debe ser Map; g.facciones deben existir; los enlaces
  // facción↔tratado se reparan en ambos sentidos. Coste O(F+T): se puede llamar
  // en cada API pública sin afectar al rendimiento.
  function ensure(g) {
    if (!isObj(g)) return g;
    if (!Array.isArray(g.f)) g.f = [];
    g.f.forEach((f, idx) => ensureFaction(f, idx));
    g.treaties = ensureTreaties(g.treaties);
    if (!Array.isArray(g.diplomacyLog)) g.diplomacyLog = [];
    else if (g.diplomacyLog.length > 40) g.diplomacyLog.splice(0, g.diplomacyLog.length - 40);
    if (!isObj(g.loanMarket)) g.loanMarket = { offers: [], requests: [], nextOfferId: 0, nextRequestId: 0 };
    else {
      if (!Array.isArray(g.loanMarket.offers)) g.loanMarket.offers = [];
      if (!Array.isArray(g.loanMarket.requests)) g.loanMarket.requests = [];
      if (!isNum(g.loanMarket.nextOfferId)) g.loanMarket.nextOfferId = 0;
      if (!isNum(g.loanMarket.nextRequestId)) g.loanMarket.nextRequestId = 0;
    }
    g.diplomacyConfig = mergeCfg(g.diplomacyConfig && Object.keys(g.diplomacyConfig).length
      ? g.diplomacyConfig : cfgDefaults());
    if (!isNum(g.nextTreatyId) || g.nextTreatyId < 1) {
      let max = 0;
      for (const id of g.treaties.keys()) if (id > max) max = id;
      g.nextTreatyId = max + 1;
    }
    // Enlaces facción↔tratado.
    for (const f of g.f) {
      if (!f) continue;
      f.treaties = f.treaties.filter(id => {
        const t = g.treaties.get(id);
        return !!t;
      });
    }
    for (const [id, t] of g.treaties) {
      for (const fid of t.factions) {
        const f = g.f[fid];
        if (f && f.treaties.indexOf(id) < 0) f.treaties.push(id);
      }
    }
    return g;
  }

  // Celdas: borderControl/tradeRoutes siempre definidos y los bloqueos
  // fronterizos recalculados a partir de los PNA activos (un undo o un
  // guardado viejo podía dejar `napLocked` huérfano).
  function ensureCells(g) {
    if (!isObj(g) || !Array.isArray(g.cells)) return g;
    const active = [];
    if (g.treaties instanceof Map) {
      for (const t of g.treaties.values()) {
        if (t.type === TT.NAP && t.status === STATUS.ACTIVE && t.napTerms && t.napTerms.borderLock) active.push(t.factions);
      }
    }
    for (const c of g.cells) {
      if (!c) continue;
      if (!isObj(c.borderControl)) c.borderControl = { owner: c.o, contestedBy: null, napLocked: false };
      else if (typeof c.borderControl.napLocked !== 'boolean') c.borderControl.napLocked = false;
      if (!Array.isArray(c.tradeRoutes)) c.tradeRoutes = [];
    }
    for (const c of g.cells) if (c && c.borderControl && c.borderControl.napLocked) c.borderControl.napLocked = false;
    for (const factions of active) {
      const a = factions[0], b = factions[1];
      for (const c of g.cells) {
        if (!c || (c.o !== a && c.o !== b)) continue;
        for (const nb of HF.nbs(g, c.i)) {
          const n = g.cells[nb];
          if (!n || (n.o !== a && n.o !== b) || n.o === c.o) continue;
          c.borderControl = c.borderControl || { owner: c.o, contestedBy: null, napLocked: false };
          n.borderControl = n.borderControl || { owner: n.o, contestedBy: null, napLocked: false };
          c.borderControl.napLocked = true;
          n.borderControl.napLocked = true;
        }
      }
    }
    return g;
  }

  // Vista plana para snapshots JSON: los Map viajan como objeto con claves
  // numéricas y `ensure` los reconstruye al volver.
  function plainFaction(f) {
    if (!isObj(f)) return f;
    const copy = Object.assign({}, f);
    if (isObj(f.diplomacy)) {
      copy.diplomacy = Object.assign({}, f.diplomacy, {
        threatMap: Object.fromEntries(f.diplomacy.threatMap instanceof Map ? f.diplomacy.threatMap : numMap(f.diplomacy.threatMap)),
        trustScores: Object.fromEntries(f.diplomacy.trustScores instanceof Map ? f.diplomacy.trustScores : numMap(f.diplomacy.trustScores)),
        betrayals: Object.fromEntries(f.diplomacy.betrayals instanceof Map ? f.diplomacy.betrayals : numMap(f.diplomacy.betrayals))
      });
    }
    if (isObj(f.economy)) {
      copy.economy = Object.assign({}, f.economy, {
        income: Object.assign({}, f.economy.income),
        expenses: Object.assign({}, f.economy.expenses),
        net: Object.assign({}, f.economy.net),
        activeLoans: (f.economy.activeLoans || []).slice(),
        loansGiven: (f.economy.loansGiven || []).slice()
      });
    }
    copy.treaties = (f.treaties || []).slice();
    copy.treatyHistory = (f.treatyHistory || []).slice();
    return copy;
  }

  // =====================================================================
  // Lecturas seguras
  // =====================================================================
  function faction(g, id) {
    if (!isObj(g) || !Array.isArray(g.f)) return null;
    const n = toId(id);
    if (!isNum(n)) return null;
    return g.f[n] || null;
  }

  function threatOf(g, factionId, otherId) {
    const f = faction(g, factionId);
    if (!f) return 0;
    if (!isObj(f.diplomacy)) ensureFaction(f, f.id);
    let map = f.diplomacy.threatMap;
    if (!(map instanceof Map)) { map = numMap(map); f.diplomacy.threatMap = map; }
    const v = map.get(toId(otherId));
    return isNum(v) ? v : 0;
  }

  function trustOf(g, factionId, otherId) {
    const f = faction(g, factionId);
    if (!f) return 50;
    if (!isObj(f.diplomacy)) ensureFaction(f, f.id);
    let map = f.diplomacy.trustScores;
    if (!(map instanceof Map)) { map = numMap(map); f.diplomacy.trustScores = map; }
    const v = map.get(toId(otherId));
    return isNum(v) ? v : 50;
  }

  function logDip(g, entry) {
    if (!Array.isArray(g.diplomacyLog)) g.diplomacyLog = [];
    g.diplomacyLog.push(Object.assign({ turn: g.turn }, entry));
    if (g.diplomacyLog.length > 40) g.diplomacyLog.splice(0, g.diplomacyLog.length - 40);
  }

  // Un fallo diplomático nunca debe detener una partida: se registra una vez por
  // mensaje y se sigue jugando. La UI puede consultar HF.dipFaults().
  function dipError(kind, e) {
    const msg = (e && e.message) ? e.message : String(e);
    HF._dipFaults = HF._dipFaults || {};
    if (!HF._dipFaults[msg]) {
      HF._dipFaults[msg] = 1;
      if (typeof console !== 'undefined') console.error('[Diplomacia] ' + kind + ': ' + msg, e);
    } else HF._dipFaults[msg]++;
    return msg;
  }
  HF.dipError = dipError;
  HF.dipFaults = () => Object.assign({}, HF._dipFaults || {});

  // =====================================================================
  // Frontera / amenazas
  // =====================================================================
  // Matriz de fronteras compartidas por par de facciones, calculada una sola
  // vez por turno (antes se recorría el mapa entero por facción y por llamada).
  function borderPairs(g) {
    if (g._dipBorders && g._dipBorders.turn === g.turn && g._dipBorders.cells === g.cells) return g._dipBorders.pairs;
    const pairs = new Map();
    for (const c of g.cells) {
      if (!c || c.o == null || c.o < 0) continue;
      for (const nb of HF.nbs(g, c.i)) {
        const n = g.cells[nb];
        if (!n || n.o == null || n.o < 0 || n.o === c.o) continue;
        const a = Math.min(c.o, n.o), b = Math.max(c.o, n.o);
        const key = a + ':' + b;
        let e = pairs.get(key);
        if (!e) { e = { len: 0, units: new Map() }; pairs.set(key, e); }
        e.len++;
        if (n.u && n.u.owner === n.o) e.units.set(n.o, (e.units.get(n.o) || 0) + 1);
        if (c.u && c.u.owner === c.o) e.units.set(c.o, (e.units.get(c.o) || 0) + 1);
      }
    }
    g._dipBorders = { turn: g.turn, cells: g.cells, pairs };
    return pairs;
  }

  function pairOf(g, a, b) {
    const lo = Math.min(a, b), hi = Math.max(a, b);
    return borderPairs(g).get(lo + ':' + hi) || null;
  }

  // =====================================================================
  // API pública
  // =====================================================================
  HF.Diplomacy = {
    TT: TT, STATUS: STATUS,
    ensure: ensure,
    ensureCells: ensureCells,
    ensureFaction: ensureFaction,
    plainFaction: plainFaction,
    threatOf: threatOf,
    trustOf: trustOf,
    dipError: dipError,

    // ------------------------------------------------------------------
    // Tratados
    // ------------------------------------------------------------------
    proposeTreaty: function (g, proposer, target, type, terms) {
      ensure(g);
      const p = faction(g, proposer), t = faction(g, target);
      const pid = toId(proposer), tid = toId(target);
      if (!p || !t || !p.alive || !t.alive) return { success: false, message: 'Facción inválida o eliminada' };
      if (pid === tid) return { success: false, message: 'No puedes proponer un tratado a ti mismo' };
      if (!VALID_TYPE.has(type)) return { success: false, message: 'Tipo de tratado desconocido' };
      if (HF.Diplomacy._hasPendingOrActive(g, pid, tid, type)) {
        return { success: false, message: 'Ya hay un tratado o una propuesta en curso con esta facción' };
      }
      if (p.treaties.length >= MAX_TREATIES_PER_FACTION) {
        return { success: false, message: 'Demasiados tratados activos: rompe o espera a que expiren' };
      }
      const cfg = g.diplomacyConfig;
      const opts = isObj(terms) ? terms : {};
      let duration = Math.round(Number(opts.duration));
      if (!isNum(duration)) duration = type === TT.NAP ? 10 : 15;
      if (type === TT.NAP) {
        duration = Math.max(cfg.nap.minDuration, Math.min(cfg.nap.maxDuration, duration));
      } else {
        duration = Math.max(3, Math.min(40, duration));
      }
      const treaty = {
        id: g.nextTreatyId++,
        type: type,
        factions: [pid, tid].sort((a, b) => a - b),
        startTurn: g.turn,
        duration: duration,
        expiryTurn: g.turn + duration - 1,
        status: STATUS.NEGOTIATING,
        proposer: pid,
        negotiationLog: [{ turn: g.turn, proposer: pid, terms: Object.assign({}, opts), accepted: false }]
      };
      if (type === TT.NAP) {
        treaty.napTerms = {
          borderLock: opts.borderLock !== false,
          visionSharing: opts.visionSharing === true,
          breakPenalty: isNum(opts.breakPenalty) ? opts.breakPenalty : cfg.nap.breakPenalty
        };
      } else if (type === TT.TRADE) {
        treaty.tradeTerms = { routes: [], totalValuePerTurn: 0 };
        if (Array.isArray(opts.routes)) {
          for (const r of opts.routes.slice(0, cfg.trade.maxRoutesPerTreaty)) {
            if (!isObj(r) || typeof r.resource !== 'string') continue;
            const amount = Math.max(0, Math.round(Number(r.amountPerTurn) || 0));
            if (!amount) continue;
            const fromF = isNum(toId(r.fromFaction)) ? toId(r.fromFaction) : pid;
            const toF = isNum(toId(r.toFaction)) ? toId(r.toFaction) : tid;
            treaty.tradeTerms.routes.push({
              resource: r.resource,
              fromFaction: fromF,
              toFaction: toF,
              amountPerTurn: Math.min(cfg.trade.maxValuePerRoute, amount),
              routeCells: [],
              active: true,
              lastTransfer: 0
            });
          }
        }
      } else if (type === TT.LOAN) {
        const amount = Math.max(10, Math.round(Number(opts.amount) || 0));
        const rate = Math.max(0, Math.min(cfg.loans.maxInterestRate, Number(opts.rate) || cfg.loans.baseInterestRate));
        const turns = Math.max(3, Math.min(30, Math.round(Number(opts.turns) || cfg.loans.termTurns)));
        treaty.loanTerms = {
          principal: amount,
          interestRate: rate,
          remainingTurns: turns,
          totalOwed: Math.round(amount * (1 + rate * turns)),
          collateral: isObj(opts.collateral) ? opts.collateral : null,
          lender: isNum(opts.lender) ? toId(opts.lender) : tid,
          borrower: isNum(opts.borrower) ? toId(opts.borrower) : pid
        };
      }
      g.treaties.set(treaty.id, treaty);
      p.treaties.push(treaty.id);
      t.treaties.push(treaty.id);
      logDip(g, { type: 'proposal', treaty: treaty.type, factions: treaty.factions.slice(), turn: g.turn });

      // Negociación automática: si quien responde es una IA, contesta en el
      // acto (antes la propuesta quedaba "negotiating" para siempre y la
      // diplomacia no tenía ningún efecto en la partida).
      let status = STATUS.NEGOTIATING;
      if (!t.human) status = HF.Diplomacy._resolveProposal(g, treaty, tid);
      return {
        success: true,
        treatyId: treaty.id,
        status: status,
        accepted: status === STATUS.ACTIVE,
        message: status === STATUS.ACTIVE
          ? 'Tratado aceptado'
          : status === STATUS.REJECTED
            ? 'Propuesta rechazada'
            : 'Tratado propuesto, pendiente de respuesta'
      };
    },

    _hasPendingOrActive: function (g, a, b, type) {
      for (const t of g.treaties.values()) {
        if (t.type !== type) continue;
        if (t.status !== STATUS.ACTIVE && t.status !== STATUS.NEGOTIATING) continue;
        if (t.factions.indexOf(a) >= 0 && t.factions.indexOf(b) >= 0) return true;
      }
      return false;
    },

    respondToTreaty: function (g, treatyId, responder, response, counterTerms) {
      ensure(g);
      const t = g.treaties.get(toId(treatyId));
      const rid = toId(responder);
      if (!t) return { success: false, status: 'not_found' };
      if (t.factions.indexOf(rid) < 0) return { success: false, status: 'not_party' };
      if (t.status !== STATUS.NEGOTIATING) return { success: false, status: 'not_negotiating' };
      if (response === 'counter') {
        if (isObj(counterTerms)) {
          if (t.type === TT.NAP) {
            t.napTerms = Object.assign({}, t.napTerms, {
              borderLock: counterTerms.borderLock !== false,
              visionSharing: counterTerms.visionSharing === true
            });
          } else if (t.type === TT.TRADE && Array.isArray(counterTerms.routes)) {
            t.tradeTerms.routes = counterTerms.routes.slice(0, g.diplomacyConfig.trade.maxRoutesPerTreaty);
          } else if (t.type === TT.LOAN) {
            t.loanTerms = Object.assign({}, t.loanTerms, counterTerms);
          }
          if (isNum(counterTerms.duration)) {
            t.duration = Math.max(3, Math.round(counterTerms.duration));
            t.expiryTurn = t.startTurn + t.duration - 1;
          }
        }
        t.negotiationLog.push({ turn: g.turn, proposer: rid, terms: Object.assign({}, counterTerms || {}), accepted: false });
        return { success: true, status: STATUS.NEGOTIATING };
      }
      if (response === 'accept') {
        const status = HF.Diplomacy._accept(g, t, rid);
        return { success: status === STATUS.ACTIVE, status: status };
      }
      HF.Diplomacy._reject(g, t, rid);
      return { success: true, status: STATUS.REJECTED };
    },

    // La IA (o un jugador en multijugador) decide sobre una propuesta recibida.
    _resolveProposal: function (g, treaty, responderId) {
      try {
        const willing = HF.Diplomacy.willingness(g, responderId, treaty.proposer, treaty.type);
        const t = treaty;
        let accept = false;
        if (t.type === TT.NAP) {
          accept = willing >= 42;
          // Si ya está en guerra abierta con el proponente prefiere no firmar.
          if (threatOf(g, responderId, t.proposer) >= 90 && willing < 60) accept = false;
        } else if (t.type === TT.TRUCE) {
          accept = willing >= 30;
        } else if (t.type === TT.TRADE) {
          accept = willing >= 35 && HF.Diplomacy._tradeAccepts(g, t, responderId);
        } else if (t.type === TT.LOAN) {
          const lender = faction(g, t.loanTerms.lender);
          const borrower = faction(g, t.loanTerms.borrower);
          accept = !!lender && !!borrower && willing >= 30 &&
            (lender.gold || 0) >= t.loanTerms.principal &&
            (borrower.economy.creditScore || 70) >= 50;
        }
        if (accept) return HF.Diplomacy._accept(g, t, responderId);
        HF.Diplomacy._reject(g, t, responderId);
        return STATUS.REJECTED;
      } catch (e) {
        dipError('_resolveProposal', e);
        return STATUS.NEGOTIATING;
      }
    },

    _tradeAccepts: function (g, treaty, responderId) {
      const routes = treaty.tradeTerms && treaty.tradeTerms.routes || [];
      if (!routes.length) return false;
      let gain = 0, cost = 0;
      for (const r of routes) {
        const responderGets = r.toFaction === responderId;
        const responderNeeds = (faction(g, responderId) && faction(g, responderId).economy.net[r.resource] || 0) < 0;
        if (responderGets) gain += r.amountPerTurn * (responderNeeds ? 2 : 1);
        else cost += r.amountPerTurn;
      }
      return gain > cost * 0.5;
    },

    _accept: function (g, treaty, responderId) {
      const t = treaty;
      if (t.status === STATUS.ACTIVE) return STATUS.ACTIVE;
      if (t.type === TT.TRADE) {
        t.status = STATUS.ACTIVE;
        const made = HF.Diplomacy._activateTradeRoutes(g, t);
        if (!made) {
          HF.Diplomacy._reject(g, t, responderId, 'No hay ruta comercial viable');
          return STATUS.REJECTED;
        }
      }
      t.status = STATUS.ACTIVE;
      t.acceptedTurn = g.turn;
      t.expiryTurn = g.turn + (isNum(t.duration) ? t.duration : 10) - 1;
      t.negotiationLog.push({ turn: g.turn, proposer: responderId, terms: {}, accepted: true });
      if (t.type === TT.NAP && t.napTerms.borderLock) HF.Diplomacy._applyBorderLock(g, t);
      if (t.type === TT.LOAN) HF.Diplomacy._activateLoan(g, t);
      const [a, b] = t.factions;
      HF.Diplomacy.adjustTrust(g, a, b, 5);
      HF.Diplomacy.adjustTrust(g, b, a, 5);
      logDip(g, { type: 'signed', treaty: t.type, factions: t.factions.slice(), turn: g.turn });
      if (typeof HF.toast === 'function') {
        const names = t.factions.map(id => (faction(g, id) && faction(g, id).name) || ('F' + id)).join(' · ');
        if (typeof HF.lang === 'function' ? HF.lang() === 'en' : false) HF.toast('🤝 ' + (TYPE_LABEL[t.type] || t.type) + ' signed: ' + names, 2600);
        else HF.toast('🤝 ' + (TYPE_LABEL[t.type] || t.type) + ' firmado: ' + names, 2600);
      }
      return STATUS.ACTIVE;
    },

    _reject: function (g, treaty, responderId, reason) {
      const t = treaty;
      t.status = STATUS.REJECTED;
      t.negotiationLog.push({ turn: g.turn, proposer: responderId, terms: {}, accepted: false, reason: reason || '' });
      logDip(g, { type: 'rejected', treaty: t.type, factions: t.factions.slice(), turn: g.turn });
      HF.Diplomacy._detach(g, t);
      return STATUS.REJECTED;
    },

    // Quita el tratado de los índices y del mapa: mantiene el guardado pequeño.
    _detach: function (g, t) {
      for (const fid of t.factions) {
        const f = faction(g, fid);
        if (!f) continue;
        const idx = f.treaties.indexOf(t.id);
        if (idx >= 0) f.treaties.splice(idx, 1);
        if (f.treatyHistory.indexOf(t.id) < 0) {
          f.treatyHistory.push(t.id);
          if (f.treatyHistory.length > 30) f.treatyHistory.shift();
        }
      }
      if (g.treaties) g.treaties.delete(t.id);
    },

    breakTreaty: function (g, treatyId, breakerId) {
      ensure(g);
      const t = g.treaties.get(toId(treatyId));
      const bid = toId(breakerId);
      if (!t) return { success: false, message: 'Tratado inexistente' };
      if (t.status !== STATUS.ACTIVE) return { success: false, message: 'El tratado no está activo' };
      if (t.factions.indexOf(bid) < 0) return { success: false, message: 'No eres parte del tratado' };
      if (!t.napTerms || t.napTerms.breakPenalty === 0) {
        return { success: false, message: 'Pacto Sagrado: no se puede romper' };
      }
      const cost = Math.max(0, t.napTerms.breakPenalty || 0);
      if (cost && !HF.Diplomacy._takeGold(g, faction(g, bid), cost)) {
        return { success: false, message: 'Oro insuficiente para pagar la penalidad (' + cost + ')' };
      }
      const other = t.factions.find(id => id !== bid);
      HF.Diplomacy._removeBorderLock(g, t);
      for (const r of (t.tradeTerms ? t.tradeTerms.routes : [])) r.active = false;
      t.status = STATUS.BROKEN;
      t.brokenBy = bid;
      t.brokenTurn = g.turn;
      const f = faction(g, bid);
      if (f) {
        f.diplomacy.betrayals.set(other, g.turn);
        HF.Diplomacy.adjustTrust(g, other, bid, -g.diplomacyConfig.trust.napBreakPenalty);
      }
      logDip(g, { type: 'broken', treaty: t.type, factions: t.factions.slice(), turn: g.turn });
      HF.Diplomacy._detach(g, t);
      return { success: true, message: 'Tratado roto' };
    },

    processExpirations: function (g) {
      ensure(g);
      const finish = [];
      for (const t of g.treaties.values()) {
        if (t.status === STATUS.ACTIVE && g.turn > t.expiryTurn) finish.push([t, 'expired']);
        else if (t.status === STATUS.ARREARS && (t.loanTerms.missed || 0) >= 2) finish.push([t, 'defaulted']);
        else if (t.status === STATUS.NEGOTIATING && g.turn - t.startTurn > NEGOTIATION_TIMEOUT) finish.push([t, 'rejected']);
      }
      for (const [t, why] of finish) {
        if (why === 'defaulted') { HF.Diplomacy.enforceDefault(g, t.id); continue; }
        if (t.type === TT.NAP) HF.Diplomacy._removeBorderLock(g, t);
        if (t.type === TT.TRADE) {
          for (const r of t.tradeTerms.routes) r.active = false;
          for (const fid of t.factions) {
            const f = faction(g, fid);
            if (!f) continue;
            const other = t.factions.find(id => id !== fid);
            const idx = f.diplomacy.tradePartners.indexOf(other);
            if (idx >= 0) f.diplomacy.tradePartners.splice(idx, 1);
          }
        }
        t.status = why === 'expired' ? STATUS.EXPIRED : STATUS.REJECTED;
        logDip(g, { type: why, treaty: t.type, factions: t.factions.slice(), turn: g.turn });
        HF.Diplomacy._detach(g, t);
      }
      // Poda de seguridad: si por cualquier vía se acumulan tratados, se
      // descartan primero los que ya no están activos.
      if (g.treaties.size > MAX_TREATIES_TOTAL) {
        for (const t of Array.from(g.treaties.values())) {
          if (g.treaties.size <= MAX_TREATIES_TOTAL) break;
          if (t.status !== STATUS.ACTIVE) HF.Diplomacy._detach(g, t);
        }
      }
      return finish.length;
    },

    getActiveTreaties: function (g, factionId, typeFilter) {
      const f = faction(g, factionId);
      if (!f || !isObj(g) || !(g.treaties instanceof Map)) return [];
      if (!Array.isArray(f.treaties)) ensureFaction(f, f.id);
      const out = [];
      for (const id of f.treaties) {
        const t = g.treaties.get(id);
        if (t && t.status === STATUS.ACTIVE && (!typeFilter || t.type === typeFilter)) out.push(t);
      }
      return out;
    },

    // Todos los tratados activos, sin depender de una facción concreta.
    getAllActive: function (g) {
      if (!isObj(g) || !(g.treaties instanceof Map)) return [];
      const out = [];
      for (const t of g.treaties.values()) if (t.status === STATUS.ACTIVE) out.push(t);
      return out;
    },

    getIncomingProposals: function (g, factionId) {      ensure(g);
      const fid = toId(factionId), out = [];
      for (const t of g.treaties.values()) {
        if (t.status === STATUS.NEGOTIATING && t.proposer !== fid && t.factions.indexOf(fid) >= 0) out.push(t);
      }
      return out;
    },

    getSentProposals: function (g, factionId) {
      ensure(g);
      const fid = toId(factionId), out = [];
      for (const t of g.treaties.values()) {
        if (t.status === STATUS.NEGOTIATING && t.proposer === fid) out.push(t);
      }
      return out;
    },

    hasActiveNAP: function (g, factionA, factionB) {
      if (toId(factionA) === toId(factionB)) return true;
      const list = HF.Diplomacy.getActiveTreaties(g, factionA, TT.NAP);
      return list.some(t => t.factions.indexOf(toId(factionB)) >= 0);
    },

    hasTruce: function (g, factionA, factionB) {
      return HF.Diplomacy.getActiveTreaties(g, factionA, TT.TRUCE)
        .some(t => t.factions.indexOf(toId(factionB)) >= 0);
    },

    canAttack: function (g, attacker, defender, from, to) {
      const a = toId(attacker), d = toId(defender);
      if (a === d) return { allowed: true, reason: 'Misma facción' };
      const target = faction(g, d);
      const name = target ? target.name : 'Desconocido';
      const nap = HF.Diplomacy.getActiveTreaties(g, a, TT.NAP).find(t => t.factions.indexOf(d) >= 0);
      if (nap) {
        const countdown = nap.expiryTurn - g.turn + 1;
        const sacred = !!(nap.napTerms && nap.napTerms.breakPenalty === 0);
        return {
          allowed: false,
          reason: (sacred ? 'Pacto Sagrado' : 'PNA') + ' activo con ' + name +
            ' (expira en ' + Math.max(0, countdown) + ' turnos)',
          treatyId: nap.id,
          countdown: Math.max(0, countdown)
        };
      }
      const truce = HF.Diplomacy.getActiveTreaties(g, a, TT.TRUCE).find(t => t.factions.indexOf(d) >= 0);
      if (truce) {
        const countdown = truce.expiryTurn - g.turn + 1;
        return {
          allowed: false,
          reason: 'Tregua activa con ' + name + ' (expira en ' + Math.max(0, countdown) + ' turnos)',
          treatyId: truce.id,
          countdown: Math.max(0, countdown)
        };
      }
      return { allowed: true, reason: '' };
    },

    _applyBorderLock: function (g, treaty) {
      if (!treaty.napTerms || !treaty.napTerms.borderLock) return;
      const [fA, fB] = treaty.factions;
      for (const c of g.cells) {
        if (!c || (c.o !== fA && c.o !== fB)) continue;
        for (const nb of HF.nbs(g, c.i)) {
          const n = g.cells[nb];
          if (!n || (n.o !== fA && n.o !== fB) || n.o === c.o) continue;
          c.borderControl = c.borderControl || { owner: c.o, contestedBy: null, napLocked: false };
          n.borderControl = n.borderControl || { owner: n.o, contestedBy: null, napLocked: false };
          c.borderControl.napLocked = true;
          n.borderControl.napLocked = true;
        }
      }
    },

    _removeBorderLock: function (g, treaty) {
      if (!treaty.napTerms || !treaty.napTerms.borderLock) return;
      const [fA, fB] = treaty.factions;
      for (const c of g.cells) {
        if (!c || (c.o !== fA && c.o !== fB)) continue;
        for (const nb of HF.nbs(g, c.i)) {
          const n = g.cells[nb];
          if (!n || (n.o !== fA && n.o !== fB) || n.o === c.o) continue;
          if (c.borderControl) c.borderControl.napLocked = false;
          if (n.borderControl) n.borderControl.napLocked = false;
        }
      }
    },

    // ------------------------------------------------------------------
    // Comercio
    // ------------------------------------------------------------------
    _activateTradeRoutes: function (g, treaty) {
      const terms = treaty.tradeTerms;
      if (!terms || !Array.isArray(terms.routes)) return 0;
      terms.totalValuePerTurn = 0;
      let made = 0;
      for (const route of terms.routes) {
        const from = faction(g, route.fromFaction), to = faction(g, route.toFaction);
        if (!from || !to || !from.alive || !to.alive) continue;
        const res = HF.Diplomacy.establishTradeRoute(g, treaty.id, route.resource, route.fromFaction, route.toFaction, route.amountPerTurn);
        if (res.success) {
          made++;
          terms.totalValuePerTurn += route.amountPerTurn;
          if (from.diplomacy.tradePartners.indexOf(to.id) < 0) from.diplomacy.tradePartners.push(to.id);
          if (to.diplomacy.tradePartners.indexOf(from.id) < 0) to.diplomacy.tradePartners.push(from.id);
        } else {
          route.active = false;
        }
      }
      return made;
    },

    establishTradeRoute: function (g, treatyId, resource, fromF, toF, amount) {
      ensure(g);
      const treaty = g.treaties.get(toId(treatyId));
      if (!treaty || treaty.type !== TT.TRADE) return { success: false, message: 'No es un acuerdo comercial' };
      const from = faction(g, fromF), to = faction(g, toF);
      if (!from || !to) return { success: false, message: 'Facción inválida' };
      if (!isObj(treaty.tradeTerms)) treaty.tradeTerms = { routes: [], totalValuePerTurn: 0 };
      // Si la ruta ya existe y tiene camino (reintento/undo) se reutiliza.
      const existing = treaty.tradeTerms.routes.find(r =>
        r.resource === resource && r.fromFaction === toId(fromF) && r.toFaction === toId(toF));
      if (existing && Array.isArray(existing.routeCells) && existing.routeCells.length) {
        existing.active = true;
        return { success: true, route: existing, path: existing.routeCells };
      }
      const fromCell = g.cells.find(c => c && c.o === toId(fromF) && c.sup && (c.b === HF.B.CIUDAD || c.b === HF.B.PUEBLO));
      const toCell = g.cells.find(c => c && c.o === toId(toF) && c.sup && (c.b === HF.B.CIUDAD || c.b === HF.B.PUEBLO));
      if (!fromCell || !toCell) return { success: false, message: 'Origen o destino sin ciudad/pueblo abastecido' };
      let pathResult = null;
      try { pathResult = HF.Diplomacy.calculateTradeRoute(g, fromCell.i, toCell.i, []); } catch (e) { dipError('calculateTradeRoute', e); }
      if (!pathResult) return { success: false, message: 'No hay ruta viable' };
      let route = existing;
      if (!route) {
        route = {
          resource: resource,
          fromFaction: toId(fromF),
          toFaction: toId(toF),
          amountPerTurn: Math.max(1, Math.round(Number(amount) || 1)),
          routeCells: [],
          active: true,
          lastTransfer: 0
        };
        treaty.tradeTerms.routes.push(route);
      }
      route.routeCells = pathResult.path;
      route.active = true;
      for (const cellId of pathResult.path) {
        const c = g.cells[cellId];
        if (!c) continue;
        c.tradeRoutes = c.tradeRoutes || [];
        if (!c.tradeRoutes.some(r => r.treatyId === treaty.id && r.resource === resource)) {
          c.tradeRoutes.push({ treatyId: treaty.id, resource: resource, direction: toId(toF), active: true });
        }
      }
      return { success: true, route: route, path: pathResult.path };
    },

    calculateTradeRoute: function (g, fromCell, toCell, avoidFactions) {
      fromCell = toId(fromCell);
      toCell = toId(toCell);
      if (!isNum(fromCell) || !isNum(toCell) || !g.cells[fromCell] || !g.cells[toCell]) return null;
      const gr = g._grid || (g._grid = HF.makeGrid(g.R));
      const avoid = Array.isArray(avoidFactions) ? avoidFactions.map(toId) : [];
      const dist = new Map([[fromCell, 0]]);
      const prev = new Map();
      const pq = [{ cell: fromCell, cost: 0 }];
      const startOwner = g.cells[fromCell].o;
      while (pq.length) {
        pq.sort((a, b) => a.cost - b.cost);
        const current = pq.shift();
        if (current.cell === toCell) break;
        if (current.cost > (dist.get(current.cell) || Infinity)) continue;
        for (const nb of gr.nb[current.cell]) {
          const n = g.cells[nb];
          if (!n) continue;
          if (avoid.indexOf(n.o) >= 0) continue;
          const weight = HF.Diplomacy._getDiplomaticWeight(g, startOwner, n);
          if (weight === Infinity) continue;
          const newCost = current.cost + weight;
          if (newCost < (dist.get(nb) || Infinity)) {
            dist.set(nb, newCost);
            prev.set(nb, current.cell);
            pq.push({ cell: nb, cost: newCost });
          }
        }
      }
      if (!dist.has(toCell)) return null;
      const path = [];
      let cur = toCell;
      while (cur !== undefined) {
        path.push(cur);
        if (cur === fromCell) break;
        cur = prev.get(cur);
      }
      path.reverse();
      if (path[0] !== fromCell) return null;
      return { path: path, cost: dist.get(toCell), safe: true, distance: path.length };
    },

    _getDiplomaticWeight: function (g, fromFaction, toCell) {
      const from = toId(fromFaction);
      const owner = toCell ? toCell.o : -1;
      if (owner === from) return 1.0;
      if (owner == null || owner < 0) return 3.0;
      if (HF.Diplomacy.hasActiveNAP(g, from, owner)) return 1.5;
      if (HF.Diplomacy.getActiveTreaties(g, from, TT.TRADE).some(t => t.factions.indexOf(owner) >= 0)) return 1.5;
      return threatOf(g, from, owner) > 60 ? Infinity : 10.0;
    },

    checkTradeRouteInterdiction: function (g) {
      if (!isObj(g) || !(g.treaties instanceof Map)) return;
      for (const treaty of g.treaties.values()) {
        if (treaty.type !== TT.TRADE || treaty.status !== STATUS.ACTIVE) continue;
        if (!treaty.tradeTerms || !Array.isArray(treaty.tradeTerms.routes)) continue;
        for (const route of treaty.tradeTerms.routes) {
          if (!route.active) continue;
          let interdictor = null;
          for (const cellId of route.routeCells) {
            const c = g.cells[cellId];
            if (!c) continue;
            if (c.u && c.u.owner !== route.fromFaction && c.u.owner !== route.toFaction) { interdictor = c.u.owner; break; }
            if (Array.isArray(g.caravans)) {
              for (const car of g.caravans) {
                if (!car || !Array.isArray(car.path)) continue;
                if (car.path[car.pos] === cellId && car.owner !== route.fromFaction && car.owner !== route.toFaction) { interdictor = car.owner; break; }
              }
            }
            if (interdictor != null) break;
          }
          if (interdictor != null) {
            route.active = false;
            route.interdictedBy = interdictor;
            route.interdictedTurn = g.turn;
            const dmg = (g.diplomacyConfig && g.diplomacyConfig.trade.routeInterdictionLoss) || 0.5;
            const loss = Math.floor(route.amountPerTurn * dmg);
            const from = faction(g, route.fromFaction);
            if (from && from.economy) from.economy.expenses[route.resource] = (from.economy.expenses[route.resource] || 0) + loss;
          } else if (!route.active && route.interdictedBy != null) {
            route.active = true;
            route.interdictedBy = null;
          }
        }
      }
    },

    // Transferencia real de recursos: sin esto el comercio solo maquillaba el
    // panel de netos y no movía ni un saco de trigo.
    processTradeTransfers: function (g) {
      if (!isObj(g) || !(g.treaties instanceof Map)) return 0;
      let moved = 0;
      for (const treaty of g.treaties.values()) {
        if (treaty.type !== TT.TRADE || treaty.status !== STATUS.ACTIVE) continue;
        if (!treaty.tradeTerms || !Array.isArray(treaty.tradeTerms.routes)) continue;
        for (const route of treaty.tradeTerms.routes) {
          if (!route.active) continue;
          const from = faction(g, route.fromFaction), to = faction(g, route.toFaction);
          if (!from || !to || !from.alive || !to.alive) { route.active = false; continue; }
          const got = HF.Diplomacy._takeResource(g, from, route.resource, route.amountPerTurn);
          if (got > 0) {
            HF.Diplomacy._addResource(g, to, route.resource, got);
            moved += got;
          }
          route.lastTransfer = got;
        }
      }
      return moved;
    },

    // ------------------------------------------------------------------
    // Economía de recursos para rutas/préstamos
    // ------------------------------------------------------------------
    _stockKeys: function (f) {
      if (isObj(f.stock)) {
        const keys = Object.keys(f.stock).filter(k => isObj(f.stock[k]));
        if (keys.length) return keys;
      }
      f.stock = { 0: { gold: f.gold || 0, food: f.food || 0, wood: f.wood || 0 } };
      return ['0'];
    },

    _takeGold: function (g, f, amount) {
      if (!f || !amount) return false;
      const keys = HF.Diplomacy._stockKeys(f);
      let available = 0;
      for (const k of keys) available += Math.max(0, Math.round(f.stock[k].gold || 0));
      if (available < amount) return false;   // no se toca nada si no alcanza
      let left = amount;
      for (const k of keys) {
        const s = f.stock[k];
        const take = Math.min(Math.max(0, s.gold || 0), left);
        s.gold -= take;
        left -= take;
        if (left <= 0) break;
      }
      if (typeof HF.syncTotals === 'function') HF.syncTotals(f);
      return true;
    },

    _addGold: function (g, f, amount) {
      if (!f || !amount) return;
      const keys = HF.Diplomacy._stockKeys(f);
      const s = f.stock[keys[0]];
      s.gold = (s.gold || 0) + amount;
      if (typeof HF.syncTotals === 'function') HF.syncTotals(f);
    },

    // Oro total de la facción (suma de provincias). Solo lectura.
    _stockGold: function (f) {
      if (!f || !isObj(f.stock)) return 0;
      let total = 0;
      for (const k of Object.keys(f.stock)) if (isObj(f.stock[k])) total += Math.max(0, Math.round(f.stock[k].gold || 0));
      return total;
    },

    _takeResource: function (g, f, resource, amount) {
      if (!f || !isNum(amount) || amount <= 0) return 0;
      let left = Math.round(amount), got = 0;
      for (const k of HF.Diplomacy._stockKeys(f)) {
        const s = f.stock[k];
        const have = s[resource] || 0;
        const take = Math.min(have, left);
        s[resource] = have - take;
        left -= take;
        got += take;
        if (left <= 0) break;
      }
      if (got && typeof HF.syncTotals === 'function') HF.syncTotals(f);
      return got;
    },

    _addResource: function (g, f, resource, amount) {
      if (!f || !isNum(amount) || amount <= 0) return;
      const keys = HF.Diplomacy._stockKeys(f);
      const s = f.stock[keys[0]];
      s[resource] = (s[resource] || 0) + Math.round(amount);
      if (typeof HF.syncTotals === 'function') HF.syncTotals(f);
    },

    // ------------------------------------------------------------------
    // Préstamos
    // ------------------------------------------------------------------
    requestLoan: function (g, borrower, amount, maxRate, purpose, targetLender) {
      ensure(g);
      const f = faction(g, borrower);
      if (!f || !f.alive) return { success: false, message: 'Prestatario inválido' };
      const cfg = g.diplomacyConfig.loans;
      if (f.economy.activeLoans.length >= cfg.maxActiveLoansPerFaction) {
        return { success: false, message: 'Ya tienes demasiados préstamos activos' };
      }
      const mine = g.loanMarket.requests.filter(r => r.active && toId(r.borrower) === f.id);
      if (mine.length >= 2) return { success: false, message: 'Ya tienes solicitudes pendientes en el mercado' };
      if (mine.some(r => g.turn - r.turn < 3)) return { success: false, message: 'Tu solicitud anterior aún está en el mercado' };
      const amt = Math.max(10, Math.min(300, Math.round(Number(amount) || 0)));
      const rate = Math.max(0, Math.min(cfg.maxInterestRate, Number(maxRate) || cfg.baseInterestRate));
      const request = {
        id: ++g.loanMarket.nextRequestId,
        borrower: f.id,
        amount: amt,
        maxRate: rate,
        purpose: typeof purpose === 'string' ? purpose : 'development',
        targetLender: isNum(targetLender) ? toId(targetLender) : null,
        active: true,
        turn: g.turn
      };
      g.loanMarket.requests.push(request);
      if (g.loanMarket.requests.length > MAX_MARKET_REQUESTS * 2) {
        g.loanMarket.requests = g.loanMarket.requests.slice(-MAX_MARKET_REQUESTS);
      }
      logDip(g, { type: 'loan_request', factions: [f.id], amount: amt, turn: g.turn });
      return { success: true, requestId: request.id, message: 'Solicitud de préstamo publicada en el mercado' };
    },

    offerLoan: function (g, lender, maxAmount, baseRate, minCreditScore) {
      ensure(g);
      const f = faction(g, lender);
      if (!f || !f.alive) return { success: false, message: 'Prestamista inválido' };
      const amount = Math.max(10, Math.min(300, Math.round(Number(maxAmount) || 0)));
      if ((f.gold || 0) < amount) return { success: false, message: 'Oro insuficiente' };
      if (g.loanMarket.offers.filter(o => o.active && toId(o.lender) === f.id).length >= 2) {
        return { success: false, message: 'Ya tienes ofertas publicadas' };
      }
      const rate = Math.max(0, Math.min(g.diplomacyConfig.loans.maxInterestRate, Number(baseRate) || g.diplomacyConfig.loans.baseInterestRate));
      const offer = {
        id: ++g.loanMarket.nextOfferId,
        lender: f.id,
        maxAmount: amount,
        interestRate: rate,
        minCreditScore: isNum(minCreditScore) ? minCreditScore : 50,
        active: true,
        turn: g.turn
      };
      g.loanMarket.offers.push(offer);
      if (g.loanMarket.offers.length > MAX_MARKET_OFFERS * 2) g.loanMarket.offers = g.loanMarket.offers.slice(-MAX_MARKET_OFFERS);
      logDip(g, { type: 'loan_offer', factions: [f.id], amount: amount, turn: g.turn });
      return { success: true, offerId: offer.id, message: 'Oferta de préstamo publicada' };
    },

    // Empareja el mercado una vez por turno: las solicitudes de la IA (y del
    // jugador) se financian de verdad con el oro del prestamista.
    processLoanMarket: function (g) {
      ensure(g);
      const cfg = g.diplomacyConfig.loans;
      const ttl = cfg.marketTtl || 6;
      let made = 0;
      for (const req of g.loanMarket.requests) {
        if (!req.active) continue;
        if (g.turn - (isNum(req.turn) ? req.turn : g.turn) > ttl) { req.active = false; continue; }
        const borrower = faction(g, req.borrower);
        if (!borrower || !borrower.alive) { req.active = false; continue; }
        if (borrower.economy.activeLoans.length >= cfg.maxActiveLoansPerFaction) { req.active = false; continue; }
        const candidates = g.f.filter(f => f && f.alive && f.id !== req.borrower &&
          (req.targetLender == null || f.id === req.targetLender) &&
          (f.gold || 0) >= req.amount + 15 &&
          !HF.Diplomacy.getActiveTreaties(g, f.id, TT.LOAN).some(t => t.loanTerms && t.loanTerms.borrower === req.borrower));
        if (!candidates.length) continue;
        // Oferta publicada por un humano si existe y encaja.
        const offer = g.loanMarket.offers.find(o => o.active && toId(o.lender) === candidates[0].id &&
          o.interestRate <= req.maxRate && (borrower.economy.creditScore || 70) >= o.minCreditScore);
        const lender = (offer ? faction(g, offer.lender) : null) ||
          candidates.sort((a, b) => (b.gold || 0) - (a.gold || 0))[0];
        if (!lender) continue;
        const amount = Math.min(req.amount, lender.gold);
        if (amount < 10) continue;
        const risk = Math.max(0, (60 - (borrower.economy.creditScore || 70))) / 100;
        const rate = Math.max(cfg.baseInterestRate,
          Math.min(req.maxRate, cfg.maxInterestRate, (offer ? offer.interestRate : cfg.baseInterestRate) + risk * 0.2));
        const loan = HF.Diplomacy._createLoan(g, lender.id, borrower.id, amount, rate, cfg.termTurns);
        if (loan) {
          req.active = false;
          if (offer) offer.active = false;
          made++;
        }
      }
      // Ofertas sin demanda: caducan.
      for (const off of g.loanMarket.offers) {
        if (!off.active) continue;
        if (g.turn - (isNum(off.turn) ? off.turn : g.turn) > ttl) off.active = false;
      }
      // Limpieza del mercado para que el guardado no crezca sin fin.
      g.loanMarket.requests = g.loanMarket.requests.filter(r => r.active).slice(-MAX_MARKET_REQUESTS);
      g.loanMarket.offers = g.loanMarket.offers.filter(o => o.active).slice(-MAX_MARKET_OFFERS);
      return made;
    },

    _createLoan: function (g, lenderId, borrowerId, amount, rate, turns) {
      const lender = faction(g, lenderId), borrower = faction(g, borrowerId);
      if (!lender || !borrower) return null;
      if (!HF.Diplomacy._takeGold(g, lender, amount)) return null;
      HF.Diplomacy._addGold(g, borrower, amount);
      const t = {
        id: g.nextTreatyId++,
        type: TT.LOAN,
        factions: [lenderId, borrowerId].sort((a, b) => a - b),
        startTurn: g.turn,
        duration: turns,
        expiryTurn: g.turn + turns - 1,
        status: STATUS.ACTIVE,
        proposer: lenderId,
        acceptedTurn: g.turn,
        negotiationLog: [{ turn: g.turn, proposer: lenderId, terms: { amount, rate, turns }, accepted: true }],
        napTerms: null,
        tradeTerms: null,
        loanTerms: {
          principal: amount,
          interestRate: rate,
          remainingTurns: turns,
          totalOwed: Math.round(amount * (1 + rate * turns)),
          collateral: null,
          lender: lenderId,
          borrower: borrowerId
        }
      };
      g.treaties.set(t.id, t);
      lender.treaties.push(t.id);
      borrower.treaties.push(t.id);
      HF.Diplomacy._activateLoan(g, t);
      logDip(g, { type: 'loan_signed', factions: t.factions.slice(), amount: amount, turn: g.turn });
      if (typeof HF.toast === 'function' && (lender.human || borrower.human)) {
        HF.toast('💰 Préstamo de ' + amount + ' oro: ' + lender.name + ' → ' + borrower.name, 2800);
      }
      return t;
    },

    _activateLoan: function (g, t) {
      const ln = t.loanTerms;
      const lender = faction(g, ln.lender), borrower = faction(g, ln.borrower);
      if (!lender || !borrower) return;
      if (lender.economy.loansGiven.indexOf(t.id) < 0) lender.economy.loansGiven.push(t.id);
      if (borrower.economy.activeLoans.indexOf(t.id) < 0) borrower.economy.activeLoans.push(t.id);
    },

    // Coste por turno de los préstamos vigentes (solo lectura: sirve al HUD).
    pendingLoanPayment: function (g, factionId) {
      const f = faction(g, factionId);
      if (!f || !isObj(g.treaties)) return 0;
      let total = 0;
      for (const id of f.economy.activeLoans) {
        const t = g.treaties.get(id);
        if (!t || t.type !== TT.LOAN || t.status !== STATUS.ACTIVE) continue;
        if (t.loanTerms.borrower !== f.id) continue;
        total += Math.ceil(t.loanTerms.totalOwed / Math.max(1, t.loanTerms.remainingTurns));
      }
      return total;
    },

    processLoanPayments: function (g, factionId) {
      ensure(g);
      const f = faction(g, factionId);
      if (!f || !f.economy) return { paid: 0, defaulted: 0, details: [] };
      let paid = 0, defaulted = 0;
      const details = [];
      const loans = f.economy.activeLoans.slice();
      for (const id of loans) {
        const t = g.treaties.get(id);
        if (!t || t.type !== TT.LOAN) {
          const idx = f.economy.activeLoans.indexOf(id);
          if (idx >= 0) f.economy.activeLoans.splice(idx, 1);
          continue;
        }
        if (t.status !== STATUS.ACTIVE && t.status !== STATUS.ARREARS) {
          const idx = f.economy.activeLoans.indexOf(id);
          if (idx >= 0) f.economy.activeLoans.splice(idx, 1);
          continue;
        }
        if (t.loanTerms.borrower !== f.id) continue;
        const payment = Math.ceil(t.loanTerms.totalOwed / Math.max(1, t.loanTerms.remainingTurns));
        if (payment <= 0) { HF.Diplomacy._closeLoan(g, t, STATUS.PAID); continue; }
        if (HF.Diplomacy._takeGold(g, f, payment)) {
          HF.Diplomacy._addGold(g, faction(g, t.loanTerms.lender), payment);
          t.loanTerms.totalOwed = Math.max(0, t.loanTerms.totalOwed - payment);
          t.loanTerms.remainingTurns--;
          paid += payment;
          details.push({ loanId: id, paid: payment, remaining: t.loanTerms.remainingTurns });
          f.economy.creditScore = Math.min(100, (f.economy.creditScore || 70) +
            (g.diplomacyConfig.loans.creditScoreImpact.onTimePayment || 1));
          HF.Diplomacy.adjustTrust(g, t.loanTerms.lender, t.loanTerms.borrower, 2);
          if (t.loanTerms.totalOwed <= 0 || t.loanTerms.remainingTurns <= 0) {
            HF.Diplomacy._closeLoan(g, t, STATUS.PAID);
          }
        } else {
          defaulted += payment;
          t.status = STATUS.ARREARS;
          t.loanTerms.missed = (t.loanTerms.missed || 0) + 1;
          f.economy.creditScore = Math.max(0, (f.economy.creditScore || 70) +
            (g.diplomacyConfig.loans.creditScoreImpact.latePayment || -5));
          details.push({ loanId: id, defaulted: true, owed: payment });
          HF.Diplomacy.adjustTrust(g, t.loanTerms.lender, t.loanTerms.borrower, -5);
          if (t.loanTerms.missed >= 2) HF.Diplomacy.enforceDefault(g, id);
        }
      }
      f.economy.lastLoanPayment = paid;
      return { paid: paid, defaulted: defaulted, details: details };
    },

    _closeLoan: function (g, t, status) {
      t.status = status;
      const lender = faction(g, t.loanTerms.lender), borrower = faction(g, t.loanTerms.borrower);
      if (lender) {
        const idx = lender.economy.loansGiven.indexOf(t.id);
        if (idx >= 0) lender.economy.loansGiven.splice(idx, 1);
      }
      if (borrower) {
        const idx = borrower.economy.activeLoans.indexOf(t.id);
        if (idx >= 0) borrower.economy.activeLoans.splice(idx, 1);
      }
      logDip(g, { type: 'loan_closed', factions: t.factions.slice(), turn: g.turn });
      HF.Diplomacy._detach(g, t);
    },

    enforceDefault: function (g, loanId) {
      ensure(g);
      const t = g.treaties.get(toId(loanId));
      if (!t || t.type !== TT.LOAN) return;
      t.status = STATUS.DEFAULTED;
      const borrower = faction(g, t.loanTerms.borrower);
      const lender = faction(g, t.loanTerms.lender);
      if (borrower) {
        borrower.economy.creditScore = Math.max(0, (borrower.economy.creditScore || 70) - 20);
        borrower.economy.defaultHistory = (borrower.economy.defaultHistory || 0) + 1;
        if (t.loanTerms.collateral) HF.Diplomacy._seizeCollateral(g, t);
      }
      if (lender && borrower) {
        HF.Diplomacy.adjustTrust(g, lender.id, borrower.id, -g.diplomacyConfig.trust.loanDefaultPenalty);
      }
      if (borrower) {
        const idx = borrower.economy.activeLoans.indexOf(t.id);
        if (idx >= 0) borrower.economy.activeLoans.splice(idx, 1);
      }
      if (lender) {
        const idx = lender.economy.loansGiven.indexOf(t.id);
        if (idx >= 0) lender.economy.loansGiven.splice(idx, 1);
      }
      logDip(g, { type: 'loan_default', factions: t.factions.slice(), turn: g.turn });
      HF.Diplomacy._detach(g, t);
    },

    _seizeCollateral: function (g, t) {
      const col = t.loanTerms.collateral;
      if (!col) return;
      if (col.type === 'trade_route') {
        for (const other of g.treaties.values()) {
          if (other.type !== TT.TRADE || !other.tradeTerms) continue;
          for (const r of other.tradeTerms.routes) {
            if (r.treatyId === col.targetId) { r.active = false; r.seized = true; }
          }
        }
      } else if (col.type === 'city_income') {
        const c = g.cells[col.targetId];
        if (c && c.o === t.loanTerms.borrower) c.seizedIncome = true;
      } else if (col.type === 'unit_production') {
        const c = g.cells[col.targetId];
        if (c && c.o === t.loanTerms.borrower) c.embargoed = true;
      }
    },

    // ------------------------------------------------------------------
    // Confianza y voluntad de negociar
    // ------------------------------------------------------------------
    adjustTrust: function (g, factionId, otherId, delta) {
      const f = faction(g, factionId);
      if (!f || !delta) return;
      if (!isObj(f.diplomacy)) ensureFaction(f, f.id);
      if (!(f.diplomacy.trustScores instanceof Map)) f.diplomacy.trustScores = numMap(f.diplomacy.trustScores);
      const cur = trustOf(g, factionId, otherId);
      f.diplomacy.trustScores.set(toId(otherId), Math.max(0, Math.min(100, cur + delta)));
    },

    // Probabilidad lógica (0-100) de que `responderId` firme con `proposerId`.
    willingness: function (g, responderId, proposerId, type) {
      const resp = faction(g, responderId);
      if (!resp || !resp.alive) return 0;
      let w = trustOf(g, responderId, proposerId) - 50;   // base 0
      w += 45;                                            // base 45
      const ourThreat = threatOf(g, responderId, proposerId);
      w -= ourThreat * 0.35;
      let fronts = 0;
      if (isObj(g.f)) {
        for (const other of g.f) {
          if (!other || !other.alive || other.id === toId(responderId)) continue;
          if (threatOf(g, responderId, other.id) > 40) fronts++;
        }
      }
      if (fronts >= 3) w += 25;
      else if (fronts === 2) w += 15;
      else if (fronts === 1) w += 5;
      if (resp.economy && (resp.economy.net.gold || 0) < -20) w += 10;
      if (resp.diplomacy.betrayals.get(toId(proposerId)) != null &&
        g.turn - resp.diplomacy.betrayals.get(toId(proposerId)) < 12) w -= 30;
      if (typeof HF.hasTag === 'function') {
        if (HF.hasTag(resp, 'CONCORDIA_TREATY')) w += 20;
        if (HF.hasTag(resp, 'PAX_IMPERIALIS')) w += 15;
        if (HF.hasTag(resp, 'TRIBUTE_RIDERS')) w += 10;
        if (HF.hasTag(resp, 'TERROR_DOCTRINE')) w -= 20;
        if (HF.hasTag(resp, 'BOOTY_ECONOMY')) w -= 15;
      }
      if (type === TT.TRUCE) w += 10;
      if (type === TT.LOAN) w -= 5;
      return Math.max(0, Math.min(100, w));
    },

    // ------------------------------------------------------------------
    // Inteligencia / información
    // ------------------------------------------------------------------
    updateThreatMap: function (g, factionId, force) {
      ensure(g);
      const f = faction(g, factionId);
      if (!f || !f.alive) return;
      if (!force && f.diplomacy._tTurn === g.turn) return;
      f.diplomacy.threatMap = numMap(f.diplomacy.threatMap);
      f.diplomacy.securedFlanks = [];
      for (const other of g.f) {
        if (!other || !other.alive || other.id === f.id) continue;
        const pair = pairOf(g, f.id, other.id);
        let threat = 0;
        if (pair) {
          threat += pair.len * 2;
          threat += (pair.units.get(other.id) || 0) * 5;
        }
        if (HF.Diplomacy.hasActiveNAP(g, f.id, other.id)) {
          threat = Math.max(0, threat - 30);
          f.diplomacy.securedFlanks.push(other.id);
        }
        const betrayal = f.diplomacy.betrayals.get(other.id);
        if (betrayal != null && g.turn - betrayal < 10) threat += 40;
        f.diplomacy.threatMap.set(other.id, Math.max(0, Math.min(100, threat)));
      }
      f.diplomacy._tTurn = g.turn;
    },

    // Actualiza el mapa de todas las facciones vivas de una vez (una sola
    // pasada de fronteras) y lo invalida si cambian las celdas.
    updateAllThreatMaps: function (g) {
      ensure(g);
      for (const f of g.f) if (f && f.alive) HF.Diplomacy.updateThreatMap(g, f.id, true);
    },

    evaluateNAPNeed: function (g, factionId) {
      ensure(g);
      const f = faction(g, factionId);
      if (!f) return { needed: false };
      const threatMap = numMap(f.diplomacy.threatMap);
      f.diplomacy.threatMap = threatMap;
      let best = null, bestScore = 0;
      for (const other of g.f) {
        if (!other || !other.alive || other.id === f.id) continue;
        if (HF.Diplomacy.hasActiveNAP(g, f.id, other.id)) continue;
        if (HF.Diplomacy._hasPendingOrActive(g, f.id, other.id, TT.NAP)) continue;
        const threat = threatMap.get(other.id) || 0;
        const willing = HF.Diplomacy.willingness(g, other.id, f.id, TT.NAP);
        const score = threat * 0.6 + willing * 0.4;
        if (score > bestScore) { bestScore = score; best = other.id; }
      }
      if (best === null || bestScore < 30) return { needed: false };
      const threat = threatMap.get(best) || 0;
      return {
        needed: true,
        targetFaction: best,
        urgency: threat > 60 ? 'high' : threat > 30 ? 'medium' : 'low',
        maxDuration: threat > 60 ? 8 : threat > 30 ? 15 : 25,
        reasoning: 'Neutralizar flanco con ' + (faction(g, best) ? faction(g, best).name : best) + ' (amenaza: ' + threat + ')'
      };
    },

    evaluateLoanNeed: function (g, factionId) {
      ensure(g);
      const f = faction(g, factionId);
      if (!f) return { needed: false };
      const netGold = f.economy.net.gold || 0;
      const reserves = f.gold || 0;
      if (f.economy.activeLoans.length >= g.diplomacyConfig.loans.maxActiveLoansPerFaction) return { needed: false };
      if (netGold < -30 || reserves < 15) {
        return {
          needed: true,
          amount: Math.min(150, Math.max(40, Math.abs(netGold) * 4 + 30)),
          maxRate: (f.economy.creditScore || 70) < 40 ? 0.40 : (f.economy.creditScore || 70) < 60 ? 0.30 : 0.20,
          purpose: 'emergency'
        };
      }
      if (netGold < -10 && reserves < 50 && (f.economy.creditScore || 70) > 50) {
        return {
          needed: true,
          amount: Math.min(100, Math.max(30, Math.abs(netGold) * 3 + 20)),
          maxRate: 0.25,
          purpose: 'development'
        };
      }
      return { needed: false };
    },

    evaluateTradeOpportunity: function (g, factionId) {
      ensure(g);
      const f = faction(g, factionId);
      if (!f) return { value: 0 };
      const surplus = {}, deficit = {};
      for (const res of ['food', 'gold', 'wood', 'iron']) {
        const net = f.economy.net[res] || 0;
        if (net > 8) surplus[res] = net;
        else if (net < -8) deficit[res] = -net;
      }
      if (!Object.keys(surplus).length || !Object.keys(deficit).length) return { value: 0 };
      let bestPartner = null, bestValue = 0, bestGive = null, bestTake = null;
      for (const other of g.f) {
        if (!other || !other.alive || other.id === f.id) continue;
        if (HF.Diplomacy._hasPendingOrActive(g, f.id, other.id, TT.TRADE)) continue;
        for (const [giveRes, giveAmt] of Object.entries(surplus)) {
          const otherNet = other.economy.net[giveRes] || 0;
          if (otherNet >= -5) continue;
          for (const [takeRes, takeAmt] of Object.entries(deficit)) {
            const otherSurplus = other.economy.net[takeRes] || 0;
            if (otherSurplus <= 5) continue;
            const giveValue = Math.min(giveAmt, -otherNet);
            const takeValue = Math.min(otherSurplus, takeAmt);
            const value = (giveValue + takeValue) * 1.5;
            if (value > bestValue) {
              bestValue = value;
              bestPartner = other.id;
              bestGive = { resource: giveRes, amount: giveValue };
              bestTake = { resource: takeRes, amount: takeValue };
            }
          }
        }
      }
      if (bestPartner === null || bestValue <= 20) return { value: 0 };
      return { partner: bestPartner, give: bestGive, take: bestTake, value: bestValue };
    },

    getTreatyCountdown: function (g, treatyId) {
      const t = isObj(g.treaties) ? g.treaties.get(toId(treatyId)) : null;
      if (!t || t.status !== STATUS.ACTIVE) return -1;
      return Math.max(0, t.expiryTurn - g.turn + 1);
    },

    getTreatyTooltip: function (g, treatyId, viewerFaction) {
      const t = isObj(g.treaties) ? g.treaties.get(toId(treatyId)) : null;
      if (!t) return 'Tratado inexistente';
      const other = t.factions.find(id => id !== toId(viewerFaction));
      const otherF = faction(g, other == null ? t.factions[0] : other);
      const countdown = HF.Diplomacy.getTreatyCountdown(g, t.id);
      let tip = (TYPE_LABEL[t.type] || t.type) + ' con ' + (otherF ? otherF.name : 'Desconocido');
      tip += '\nEstado: ' + t.status;
      tip += '\nExpira en: ' + (countdown > 0 ? countdown + ' turnos' : 'Expirado');
      if (t.type === TT.NAP) {
        tip += '\nCierre fronterizo: ' + (t.napTerms.borderLock ? 'Sí' : 'No');
        tip += '\nVisión compartida: ' + (t.napTerms.visionSharing ? 'Sí' : 'No');
        tip += '\nPenalidad de ruptura: ' + (t.napTerms.breakPenalty === 0 ? 'IMPOSIBLE (Pacto Sagrado)' : t.napTerms.breakPenalty);
      } else if (t.type === TT.TRADE) {
        tip += '\nRutas: ' + t.tradeTerms.routes.length;
        tip += '\nValor/turno: ' + t.tradeTerms.totalValuePerTurn;
      } else if (t.type === TT.LOAN) {
        tip += '\nPrincipal: ' + t.loanTerms.principal;
        tip += '\nInterés: ' + Math.round(t.loanTerms.interestRate * 100) + '%/turno';
        tip += '\nTurnos restantes: ' + t.loanTerms.remainingTurns;
        tip += '\nDeuda total: ' + t.loanTerms.totalOwed;
      }
      return tip;
    },

    getDiplomacySummary: function (g, factionId) {
      ensure(g);
      const f = faction(g, factionId);
      if (!f) return {};
      const threats = [];
      for (const other of g.f) {
        if (!other || other.id === f.id) continue;
        threats.push({
          id: other.id,
          name: other.name,
          threat: threatOf(g, f.id, other.id),
          trust: trustOf(g, f.id, other.id),
          nap: HF.Diplomacy.hasActiveNAP(g, f.id, other.id)
        });
      }
      threats.sort((a, b) => b.threat - a.threat);
      return {
        activeTreaties: HF.Diplomacy.getActiveTreaties(g, f.id).length,
        napCount: HF.Diplomacy.getActiveTreaties(g, f.id, TT.NAP).length,
        tradeCount: HF.Diplomacy.getActiveTreaties(g, f.id, TT.TRADE).length,
        loanCount: HF.Diplomacy.getActiveTreaties(g, f.id, TT.LOAN).length,
        creditScore: f.economy.creditScore || 70,
        trustScores: Object.fromEntries(f.diplomacy.trustScores),
        threatMap: Object.fromEntries(f.diplomacy.threatMap),
        threats: threats,
        securedFlanks: f.diplomacy.securedFlanks.slice(),
        tradePartners: f.diplomacy.tradePartners.slice(),
        incoming: HF.Diplomacy.getIncomingProposals(g, f.id).length,
        sent: HF.Diplomacy.getSentProposals(g, f.id).length,
        pendingPayment: HF.Diplomacy.pendingLoanPayment(g, f.id)
      };
    }
  };

  // Inicialización de una partida nueva (llamada desde engine.js).
  HF.initDiplomacy = function (g) {
    if (!isObj(g)) return;
    g.treaties = new Map();
    g.nextTreatyId = 1;
    g.loanMarket = { offers: [], requests: [], nextOfferId: 0, nextRequestId: 0 };
    g.diplomacyConfig = cfgDefaults();
    g.diplomacyLog = [];
    HF.Diplomacy.ensure(g);
  };
})(typeof window !== 'undefined' ? window : globalThis);
