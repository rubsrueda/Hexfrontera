# ARQUITECTURA DIPLOMACIA — HEXFRONTIER

**Versión:** 1.0  
**Fecha:** 2026-11-12  
**Autor:** Agente Arquitecto  
**Estado:** Entregable formal para Programador  

---

## 1. DIAGNÓSTICO DEL SISTEMA ACTUAL

### 1.1 Arquitectura Base (Monolito IIFE)
El juego usa un **monolito IIFE** en `index.html` con carga secuencial de 37 scripts. Cada módulo se inyecta en el namespace global `window.HF` mediante el patrón:
```javascript
(function(G) { const HF = G.HF; ... })(typeof window !== 'undefined' ? window : globalThis);
```
**Impacto diplomacia:** Los nuevos módulos (`diplomacy.js`, `diplomacy_ai.js`, `diplomacy_ui.js`) **deben seguir este patrón** y cargarse en `index.html` tras `engine.js` y antes de `ai.js` para que `HF.Diplomacy` esté disponible cuando `HF.aiPlay` lo invoque.

### 1.2 Estado Único Mutable (`g`)
Todo el estado reside en un único objeto `g` mutado in-place. Claves actuales:
```javascript
g = {
  turn, cur, over, f: [...], cells: [...], fogMap: Int8Array,
  timeline, events, undo, replayLog, caravans, tradeBlocked, storms,
  stat, _grid, _rng, _trade, supInit, mySeat, difficulty, R, biome...
}
```
**Impacto diplomacia:** Se añaden `g.treaties` (Map), `g.nextTreatyId`, `g.loanMarket`, `g.diplomacyConfig` y extensiones en `g.f[i]` (economy, diplomacy, treaties) y `g.cells[i]` (tradeRoutes, borderControl). **Migración obligatoria en `HF.deserialize`**.

### 1.3 Game Loop por Turnos (Engine.js)
**Ciclo real** (engine.js:2122-2141):
```javascript
HF.endTurn = function(g, aiPlay) {
  clearDeg(g, 0); noUndo(g); markPhase(g);
  for (i=1; i<g.f.length; i++) if (f.alive) {
    g.cur = i; startTurn(g, f);          // supply() → settle()
    if (aiPlay) aiPlay(g, i);             // HF.aiPlay → 4 fases
    clearDeg(g, i); checkElim(g); HF.checkEnd(g);
    if (aiPlay) markPhase(g);
  }
  g.cur = 0; roundEnd(g);                 // g.turn++, stormStep, startTurn(g, f[0])
}
```
**Puntos de integración diplomática:**
| Hook | Ubicación | Uso Diplomático |
|------|-----------|-----------------|
| `startTurn` | engine.js:861 | `processLoanPayments`, `checkTradeRouteInterdiction`, `updateThreatMap` |
| `settle` | engine.js:661 | Ingreso/gasto rutas comerciales, net = income - expenses |
| `HF.endTurn` | engine.js:2122 | `processExpirations` (después de IA, antes de roundEnd) |
| `roundEnd` | engine.js:2070 | `g.turn++`, expiración natural de tratados |
| `HF.act` | engine.js:1617 | `canAttack` (bloqueo por PNA Sagrado) |
| `HF.supply` | engine.js:132 | Pathfinding rutas comerciales (pesos diplomáticos) |
| `HF.aiPlay` | ai.js:275 | Nueva **Fase 0.5: Diplomacia Estratégica** |

### 1.4 Acoplamientos Engine ↔ AI ↔ UI
- **Engine → AI:** `HF.endTurn` llama `HF.aiPlay` directamente (callback hardcoded). La IA accede a `HF.UNITS`, `HF.CFG`, `HF.canStep`, `HF.supply`, `HF.options`.
- **Engine ↔ UI:** `game.js` llama `HF.act`, `HF.endTurn`, `HF.serialize`, `HF.deserialize`. Engine llama `HF.updateFog`, `HF.recordTimeline`, `HF.checkEnd`.
- **Board ↔ Engine:** `board.js` lee `g.cells`, `g.f`, `g.fogMap` directamente. Render loop independiente (`requestAnimationFrame`).

**Impacto diplomacia:** `HF.Diplomacy` se expone como API pública. `engine.js` y `ai.js` **solo invocan hooks definidos** (`HF.Diplomacy.*`), sin conocer internos. `board.js` recibe `drawNAPBorderOverlay` como función de render opcional.

### 1.5 Cuellos de Botella Críticos
| Cuello | Ubicación | Impacto Diplomacia | Mitigación |
|--------|-----------|---------------------|------------|
| **BFS Suministro** | `HF.supply()` (O(N) por acción) | Pathfinding rutas comerciales reutiliza BFS | Cache `g._trade` por facción/turno; pesos diplomáticos en Dijkstra, no BFS |
| **Serialización JSON** | `HF.serialize`/`deserialize` (30 snapshots) | Nuevos Maps/objetos en `g.treaties` | Versionado savegame + migración automática; `Map` → `Array` en serialize |
| **IA Sincrónica** | `HF.endTurn` bloquea hilo principal | Fase diplomacia IA añade ~2-3ms | Algoritmos O(1) por facción; cache `threatMap` |

---

## 2. MAPA DEL SISTEMA

### 2.1 Nuevos Módulos (Orden de Carga en `index.html`)
```html
<!-- Después de engine.js, antes de ai.js -->
<script src="js/diplomacy.js"></script>      <!-- Núcleo: FSM, API, algoritmos -->
<script src="js/diplomacy_ai.js"></script>   <!-- IA diplomática: evaluateNAPNeed, evaluateLoanNeed -->
<script src="js/diplomacy_ui.js"></script>   <!-- Render: overlays, panel, eventos visuales -->
```

### 2.2 Dependencias y Flujo de Datos

```
┌─────────────────────────────────────────────────────────────────┐
│                        HF.Diplomacy (diplomacy.js)              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Tratados   │  │  Préstamos  │  │ Rutas Com.  │             │
│  │  (FSM)      │  │  (FSM)      │  │  (Pathfind) │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
└─────────┼────────────────┼────────────────┼────────────────────┘
          │                │                │
    ┌─────▼─────┐    ┌─────▼─────┐    ┌─────▼─────┐
    │  engine.js│    │   ai.js   │    │  board.js │
    │           │    │           │    │           │
    │ HF.act    │    │ HF.aiPlay │    │ draw()    │
    │  →canAttack│    │  →Fase 0.5│    │  →Overlay │
    │           │    │           │    │           │
    │ startTurn │    │           │    │           │
    │  →payments│    │           │    │           │
    │  →interdic│    │           │    │           │
    │           │    │           │    │           │
    │ settle    │    │           │    │           │
    │  →routes  │    │           │    │           │
    │           │    │           │    │           │
    │ endTurn   │    │           │    │           │
    │  →expire  │    │           │    │           │
    └───────────┘    └───────────┘    └───────────┘
          │                │                │
          └────────────────┼────────────────┘
                           ▼
                    ┌─────────────┐
                    │    g (Estado Único)    │
                    │  treaties: Map         │
                    │  loanMarket: {...}     │
                    │  diplomacyConfig: {...}│
                    │  f[i].economy          │
                    │  f[i].diplomacy        │
                    │  cells[i].tradeRoutes  │
                    └─────────────┘
```

### 2.3 API Pública `HF.Diplomacy.*` (Contrato de Integración)

```javascript
HF.Diplomacy = {
  // === GESTIÓN DE TRATADOS ===
  proposeTreaty: (g, proposer, target, type, terms) => {success, treatyId, message},
  respondToTreaty: (g, treatyId, responder, response, counterTerms) => {success, status},
  processExpirations: (g) => Number,                    // llamado en HF.endTurn
  getActiveTreaties: (g, factionId, typeFilter) => [],
  hasActiveNAP: (g, factionA, factionB) => Boolean,
  canAttack: (g, attacker, defender, from, to) => {allowed, reason, treatyId, countdown},
  
  // === GESTIÓN DE PRÉSTAMOS ===
  requestLoan: (g, borrower, amount, maxRate, purpose, targetLender) => {},
  offerLoan: (g, lender, maxAmount, baseRate, minCreditScore) => {},
  processLoanPayments: (g, factionId) => {paid, defaulted, details}, // llamado en startTurn
  enforceDefault: (g, loanId) => {},
  
  // === GESTIÓN DE RUTAS COMERCIALES ===
  establishTradeRoute: (g, treatyId, resource, fromF, toF, amount) => {},
  calculateTradeRoute: (g, fromCell, toCell, avoidFactions) => {path, cost, safe, distance} | null,
  checkTradeRouteInterdiction: (g) => {},                // llamado en startTurn
  
  // === INTELIGENCIA DIPLOMÁTICA (IA) ===
  updateThreatMap: (g, factionId) => {},                 // llamado en startTurn
  evaluateNAPNeed: (g, factionId) => {needed, target, urgency, maxDuration, reasoning},
  evaluateLoanNeed: (g, factionId) => {needed, amount, maxRate, purpose},
  evaluateTradeOpportunity: (g, factionId) => {partner, give, take, value},
  
  // === UI / INFORMACIÓN ===
  getTreatyCountdown: (g, treatyId) => Number,
  getTreatyTooltip: (g, treatyId, viewerFaction) => String,
  getDiplomacySummary: (g, factionId) => {}
};
```

---

## 3. MODELO DE DATOS

### 3.1 Entidades Principales

#### 3.1.1 Tratado (`HF.Treaty` — almacenado en `g.treaties` Map)
```javascript
// HF.TREATY_TYPES
const TREATY_TYPES = {
  NAP: 'non_aggression_pact',
  TRADE: 'trade_agreement',
  LOAN: 'loan_contract',
  TRUCE: 'truce'
};

HF.Treaty = {
  id: Number,                       // global unique (g.nextTreatyId++)
  type: String,                     // TREATY_TYPES.*
  factions: [Number, Number],       // ordenados asc
  startTurn: Number,
  expiryTurn: Number,               // INCLUSIVE: válido HASTA este turno
  status: 'active' | 'expired' | 'broken' | 'in_arrears' | 'defaulted' | 'paid' | 'suspended' | 'interdicted' | 'ended',
  
  // --- NAP ---
  napTerms: {
    borderLock: Boolean,            // default: true
    visionSharing: Boolean,         // default: false
    breakPenalty: Number            // 0 = IMPOSIBLE romper (Pacto Sagrado)
  },
  
  // --- TRADE ---
  tradeTerms: {
    routes: [{
      resource: 'gold'|'food'|'wood'|'iron',
      fromFaction: Number,
      toFaction: Number,
      amountPerTurn: Number,
      routeCells: [Number],         // celdas por las que pasa (interdicción)
      active: Boolean
    }],
    totalValuePerTurn: Number
  },
  
  // --- LOAN ---
  loanTerms: {
    principal: Number,
    interestRate: Number,           // ej. 0.15 = 15%/turno
    remainingTurns: Number,
    totalOwed: Number,
    collateral: { type: 'trade_route'|'city_income'|'unit_production', targetId: Number } | null,
    lender: Number,
    borrower: Number
  },
  
  // --- Metadatos ---
  negotiationLog: [{ turn, proposer, terms, accepted }],
  brokenBy: Number | null,
  brokenTurn: Number | null
};
```

#### 3.1.2 Extensión Facción (`g.f[i]`)
```javascript
faction: {
  // ... existentes (id, name, color, gold, food, wood, alive, tags, loan, deficit, goodStreak)...
  
  // NUEVO: Diplomacia
  treaties: [Number],               // IDs de tratados activos (ref g.treaties)
  treatyHistory: [Number],          // IDs finalizados/rotos
  
  // NUEVO: Economía de supervivencia
  economy: {
    income: { food: 0, gold: 0, wood: 0, iron: 0, population: 0 },
    expenses: { food: 0, gold: 0, wood: 0, iron: 0, population: 0 },
    net: { food: 0, gold: 0, wood: 0, iron: 0, population: 0 },
    activeLoans: [Number],          // IDs préstamos como prestatario
    loansGiven: [Number],           // IDs préstamos como prestamista
    creditScore: Number,            // 0-100, afecta tasas interés
    defaultHistory: Number,
    strategicReserves: { food: 0, gold: 0, wood: 0, iron: 0 }
  },
  
  // NUEVO: Inteligencia diplomática
  diplomacy: {
    threatMap: Map<Number, Number>, // factionId -> threatLevel (0-100)
    preferredTargets: [Number],
    securedFlanks: [Number],        // facciones con PNA activo
    tradePartners: [Number],
    trustScores: Map<Number, Number> // factionId -> trust (0-100)
  }
};
```

#### 3.1.3 Extensión Célula (`g.cells[i]`)
```javascript
cell: {
  // ... existentes ...
  
  // NUEVO: Rutas comerciales
  tradeRoutes: [{
    treatyId: Number,
    resource: String,
    direction: Number,              // factionId destino
    active: Boolean
  }],
  
  // NUEVO: Control fronterizo (PNA)
  borderControl: {
    owner: Number,
    contestedBy: Number | null,
    napLocked: Boolean              // true si PNA activo con borderLock
  }
};
```

#### 3.1.4 Estado Global (`g`)
```javascript
g: {
  // ... existentes ...
  
  // NUEVO: Registro global de tratados
  treaties: Map<Number, HF.Treaty>, // treatyId -> Treaty
  nextTreatyId: Number,
  
  // NUEVO: Mercado global de préstamos (para IA)
  loanMarket: {
    offers: [{ id, lender, maxAmount, interestRate, minCreditScore, active }],
    requests: [{ id, borrower, amount, maxRate, purpose, active }]
  },
  
  // NUEVO: Configuración diplomática (fusionable con CFG.DIPLOMACY)
  diplomacyConfig: {
    napMinDuration: 5, napMaxDuration: 30, napBreakPenalty: 0,
    tradeRouteInterdictionDamage: 0.5,
    loanDefaultPenalty: 0.3,
    trustDecayPerTurn: 1,
    trustLossOnNapBreak: 50,        // legacy (no usado si breakPenalty=0)
    trustLossOnLoanDefault: 30
  }
};
```

### 3.2 Serialización y Persistencia (Migración Savegames)

**Estrategia:** Versionado en savegame + migración automática en `HF.deserialize`.

```javascript
// En engine.js - HF.serialize (añadir)
function serializeDiplomacy(g) {
  return {
    version: 2, // v2 = con diplomacia
    treaties: Array.from(g.treaties.entries()).map(([id, t]) => [id, {
      ...t,
      factions: [...t.factions],
      negotiationLog: t.negotiationLog.map(e => ({...e})),
      napTerms: t.napTerms ? {...t.napTerms} : null,
      tradeTerms: t.tradeTerms ? {...t.tradeTerms, routes: t.tradeTerms.routes.map(r => ({...r}))} : null,
      loanTerms: t.loanTerms ? {...t.loanTerms, collateral: t.loanTerms.collateral ? {...t.loanTerms.collateral} : null} : null
    }]),
    nextTreatyId: g.nextTreatyId,
    loanMarket: { offers: g.loanMarket.offers.map(o => ({...o})), requests: g.loanMarket.requests.map(r => ({...r})) },
    diplomacyConfig: {...g.diplomacyConfig}
  };
}

// En engine.js - HF.deserialize (añadir al final)
function migrateDiplomacy(g, data) {
  if (!data.treaties) { // savegame v1 (pre-diplomacia)
    g.treaties = new Map();
    g.nextTreatyId = 1;
    g.loanMarket = { offers: [], requests: [] };
    g.diplomacyConfig = CFG.DIPLOMACY || { /* defaults */ };
    // Inicializar extensiones en facciones
    for (const f of g.f) {
      f.treaties = []; f.treatyHistory = [];
      f.economy = { income: {food:0,gold:0,wood:0,iron:0,population:0}, expenses: {...}, net: {...}, activeLoans: [], loansGiven: [], creditScore: 70, defaultHistory: 0, strategicReserves: {food:0,gold:0,wood:0,iron:0} };
      f.diplomacy = { threatMap: new Map(), preferredTargets: [], securedFlanks: [], tradePartners: [], trustScores: new Map() };
    }
    // Inicializar borderControl en celdas
    for (const c of g.cells) if (c) c.borderControl = { owner: c.o, contestedBy: null, napLocked: false };
    return;
  }
  // v2+: restaurar Maps
  g.treaties = new Map(data.treaties.map(([id, t]) => [id, {...t, factions: new Set(t.factions)}]));
  g.nextTreatyId = data.nextTreatyId;
  g.loanMarket = data.loanMarket;
  g.diplomacyConfig = data.diplomacyConfig;
  // Restaurar referencias facción↔tratado
  for (const [id, t] of g.treaties) for (const fId of t.factions) if (g.f[fId]) {
    if (!g.f[fId].treaties.includes(id)) g.f[fId].treaties.push(id);
    if (t.type === 'loan_contract') {
      if (t.loanTerms.borrower === fId && !g.f[fId].economy.activeLoans.includes(id)) g.f[fId].economy.activeLoans.push(id);
      if (t.loanTerms.lender === fId && !g.f[fId].economy.loansGiven.includes(id)) g.f[fId].economy.loansGiven.push(id);
    }
  }
}
```

---

## 4. FSM Y CONTRATOS DE INTEGRACIÓN

### 4.1 Máquinas de Estado

#### 4.1.1 FSM Tratado (Nivel Tratado)
```
┌─────────────┐
│ NEGOTIATING │ ◄─── proposeTreaty / respondToTreaty (counter)
└──────┬──────┘
       │ accept()
       ▼
┌─────────────┐     turn == expiryTurn + 1      ┌──────────┐
│   ACTIVE    │ ──────────────────────────────► │ EXPIRED  │
└──────┬──────┘                                 └──────────┘
       │
       │ breakTreaty() [SOLO si breakPenalty > 0]
       ▼
┌─────────────┐
│   BROKEN    │ ──► Penalizaciones, pérdida confianza, casus belli
└─────────────┘
```

**REGLA DE ORO (Pacto Sagrado):** `breakPenalty = 0` para NAP → **NO EXISTE transición ACTIVE → BROKEN**. El tratado solo muere por expiración natural (`processExpirations` en `HF.endTurn`).

#### 4.1.2 FSM Préstamo (Nivel Préstamo)
```
┌─────────────┐
│  PROPOSED   │ ◄─── offerLoan / requestLoan
└──────┬──────┘
       │ accept()
       ▼
┌─────────────┐     remainingTurns == 0      ┌──────────┐
│   ACTIVE    │ ────────────────────────────► │   PAID   │
└──────┬──────┘                                 └──────────┘
       │
       │ default() [oro insuficiente en processLoanPayments]
       ▼
┌─────────────┐     payArrears()              ┌─────────────┐
│  IN_ARREARS │ ────────────────────────────► │   ACTIVE    │
└─────────────┘                                 └─────────────┘
       │
       │ default() repetido / embargo total
       ▼
┌─────────────┐
│  DEFAULTED  │ ──► Embargo ingresos, pérdida ciudades, casus belli
└─────────────┘
```

#### 4.1.3 FSM Ruta Comercial
```
┌─────────────┐     ruta válida + ambos vivos     ┌──────────┐
│  ESTABLISHED│ ────────────────────────────────► │  ACTIVE  │
└─────────────┘                                    └────┬─────┘
                                                         │
                           ┌─────────────────────────────┼─────────────────────────────┐
                           │                             │                             │
                      guerra declarada              ruta interceptada            tratado expira
                      (cualquier tipo)              (unidad enemiga en celda)      (NAP/TRADE)
                           │                             │                             │
                           ▼                             ▼                             ▼
                    ┌─────────────┐               ┌──────────────┐              ┌──────────┐
                    │  SUSPENDED  │               │  INTERDICTED │              │  ENDED   │
                    └──────┬──────┘               └──────┬───────┘              └──────────┘
                           │                             │
                      paz firmada                   ruta liberada
                           │                             │
                           └──────────────┬──────────────┘
                                          ▼
                                    ┌──────────┐
                                    │  ACTIVE  │
                                    └──────────┘
```

---

### 4.2 Puntos de Integración en Motor Existente

#### 4.2.1 `HF.act()` — Validación de Acciones (engine.js:1617)
```javascript
// EN engine.js HF.act(g, from, to, kind)
// ANTES de procesar cualquier acción militar:
if (kind === 'attack' || kind === 'move_into_hostile') {
  const defenderFaction = g.cells[to].f;
  const attackerFaction = g.cells[from].f;
  const check = HF.Diplomacy.canAttack(g, attackerFaction, defenderFaction, from, to);
  if (!check.allowed) {
    return { ok: false, reason: check.reason }; // "PNA activo con facción X (expira en T+5)"
  }
}
```

#### 4.2.2 `HF.endTurn()` / `startTurn()` — Ciclo de Vida
```javascript
// EN engine.js HF.endTurn()
// DESPUÉS de procesar todas las facciones IA, ANTES de roundEnd:
HF.Diplomacy.processExpirations(g); // Expirar tratados, liberar rutas

// EN engine.js startTurn(g, factionId)  (línea 861)
// AL INICIO del turno de cada facción:
HF.Diplomacy.processLoanPayments(g, factionId);  // Cobrar préstamos
HF.Diplomacy.checkTradeRouteInterdiction(g);     // Verificar rutas
HF.Diplomacy.updateThreatMap(g, factionId);      // Actualizar IA
```

#### 4.2.3 `HF.settle()` — Economía (engine.js:661)
```javascript
// EN engine.js settle(g, factionId)
// DESPUÉS de calcular income/expenses base (línea 793 aprox):
// 1. Aplicar ingresos/gastos de rutas comerciales activas
for (const treatyId of faction.treaties) {
  const treaty = g.treaties.get(treatyId);
  if (!treaty || treaty.type !== 'trade_agreement' || treaty.status !== 'active') continue;
  for (const route of treaty.tradeTerms.routes) {
    if (!route.active) continue;
    if (route.toFaction === factionId) faction.economy.income[route.resource] += route.amountPerTurn;
    else if (route.fromFaction === factionId) faction.economy.expenses[route.resource] += route.amountPerTurn;
  }
}
// 2. Los pagos de préstamos YA se descontaron en startTurn vía processLoanPayments
//    PERO contabilizar en expenses para net correcto:
// faction.economy.expenses.gold += loanPaymentsThisTurn;
// 3. Calcular net = income - expenses (por recurso)
for (const res of ['food','gold','wood','iron','population']) {
  faction.economy.net[res] = faction.economy.income[res] - faction.economy.expenses[res];
}
```

#### 4.2.4 `HF.supply()` — Pathfinding Rutas Comerciales (engine.js:132)
```javascript
// REUTILIZAR HF.supply() BFS PERO CON PESOS DIPLOMÁTICOS EN DIJKSTRA (calculateTradeRoute)
// Pesos por celda vecina:
const getDiplomaticWeight = (g, fromFaction, toCell) => {
  const toFaction = toCell.o;
  if (toFaction === fromFaction) return 1.0;                    // propia
  if (toFaction === 0 || toFaction === -1) return 3.0;          // neutral
  if (HF.Diplomacy.hasActiveNAP(g, fromFaction, toFaction) || hasActiveTrade(g, fromFaction, toFaction)) return 1.5; // aliado
  if (atWar(g, fromFaction, toFaction)) return Infinity;        // enemigo en guerra
  return 10.0; // enemigo sin guerra (tensión)
};
// Unidad enemiga en celda de ruta = interdicción (weight = Infinity)
```

#### 4.2.5 `HF.aiPlay` — Fase Diplomacia Estratégica (ai.js:275)
```javascript
// EN ai.js HF.aiPlay(g, me)
// INSERTAR al INICIO (Fase 0.5), ANTES de playUnits/macro/recruit:
function aiDiplomacyPhase(g, factionId) {
  // 1. Actualizar mapa de amenazas
  HF.Diplomacy.updateThreatMap(g, factionId);
  
  // 2. Evaluar necesidad de PNA (neutralizar flanco)
  const napNeed = HF.Diplomacy.evaluateNAPNeed(g, factionId);
  if (napNeed.needed && Math.random() < 0.7) {
    HF.Diplomacy.proposeTreaty(g, factionId, napNeed.targetFaction, 'non_aggression_pact', {
      duration: napNeed.maxDuration,
      borderLock: true,
      visionSharing: false,
      breakPenalty: 0 // PACTO SAGRADO
    });
  }
  
  // 3. Evaluar necesidad de préstamo
  const loanNeed = HF.Diplomacy.evaluateLoanNeed(g, factionId);
  if (loanNeed.needed) {
    HF.Diplomacy.requestLoan(g, factionId, loanNeed.amount, loanNeed.maxRate, loanNeed.purpose);
  }
  
  // 4. Evaluar oportunidades comerciales (asimetría biomas)
  const tradeOpp = HF.Diplomacy.evaluateTradeOpportunity(g, factionId);
  if (tradeOpp.value > 50) proposeTradeAgreement(g, factionId, tradeOpp);
  
  // 5. Gestionar tratados por expirar (renovar o preparar guerra)
  const expiringSoon = HF.Diplomacy.getActiveTreaties(g, factionId, 'non_aggression_pact')
    .filter(t => t.expiryTurn - g.turn <= 3);
  for (const treaty of expiringSoon) {
    const other = treaty.factions.find(f => f !== factionId);
    const threat = g.f[factionId].diplomacy.threatMap.get(other) || 0;
    if (threat > 60) {
      g.f[factionId].diplomacy.preferredTargets.push(other); // NO renovar
    } else if (threat < 30) {
      // Renovar con visionSharing
      HF.Diplomacy.proposeTreaty(g, factionId, other, 'non_aggression_pact', {
        duration: 15, borderLock: true, visionSharing: true, breakPenalty: 0
      });
    }
  }
}

// Y en HF.aiPlay:
HF.aiPlay = function(g, me) {
  aiDiplomacyPhase(g, me);        // ← NUEVA FASE 0.5
  const df = distField(g, me);
  playUnits(g, me, df);
  macro(g, me);
  recruit(g, me, df);
  playUnits(g, me, df);
  playShips(g, me, df);
  
  // Microtáctica: posicionamiento pre-expiración
  aiPreExpirationPositioning(g, me);
};
```

#### 4.2.6 `board.js` — Render Overlays Diplomáticos
```javascript
// En board.js draw() - NUEVA FUNCIÓN:
function drawNAPBorderOverlay(g, ctx, board) {
  for (const [treatyId, treaty] of g.treaties) {
    if (treaty.type !== 'non_aggression_pact' || treaty.status !== 'active') continue;
    const countdown = treaty.expiryTurn - g.turn + 1;
    const [fA, fB] = treaty.factions;
    const colorA = board.colors[fA], colorB = board.colors[fB];
    for (const cellId of getBorderCellsBetween(g, fA, fB)) {
      const cell = g.cells[cellId];
      const [x, y] = board.toScreen(...board.pos(cell));
      // Efecto "sello de cera" pulsante
      const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
      ctx.globalAlpha = 0.6 * pulse;
      const grad = ctx.createLinearGradient(x - 20, y, x + 20, y);
      grad.addColorStop(0, colorA); grad.addColorStop(0.5, '#FFD700'); grad.addColorStop(1, colorB);
      ctx.strokeStyle = grad; ctx.lineWidth = 3; ctx.setLineDash([8, 4]);
      drawHexBorder(ctx, x, y, board.size * board.cam.z);
      ctx.setLineDash([]);
      if (countdown <= 5) {
        ctx.fillStyle = countdown <= 2 ? '#FF0000' : '#FFA500';
        ctx.font = 'bold 14px Georgia'; ctx.textAlign = 'center';
        ctx.fillText(`${countdown}`, x, y + 5);
      }
    }
  }
}
// Llamar en board.draw() tras pintar celdas y antes de unidades
```

---

## 5. VALIDACIÓN DE PUNTOS CRÍTICOS

| Punto Crítico | Validación Arquitectónica | Implementación Requerida |
|---------------|---------------------------|--------------------------|
| **`breakPenalty=0` en NAP = Pacto Sagrado inquebrantable** | FSM Tratado: **no existe transición ACTIVE→BROKEN** si `breakPenalty===0`. `canAttack` devuelve `allowed:false` con countdown. No hay acción "romper tratado" en API. | `diplomacy.js`: `canAttack` hard-block; `processExpirations` única vía de fin. |
| **Economía préstamos encaja en `settle()` sin romper `income/expenses/net`** | `processLoanPayments` en `startTurn` descuenta oro y acumula en `expenses.gold`. `settle` suma rutas comerciales a `income`/`expenses` y recalcula `net = income - expenses` por recurso. | `engine.js`: `startTurn` llama `processLoanPayments`; `settle` integra rutas. |
| **Pathfinding rutas comerciales reutiliza `HF.supply()` BFS con pesos diplomáticos** | `calculateTradeRoute` usa **Dijkstra/A*** (no BFS) con `getDiplomaticWeight`. `HF.supply` inalterado. Cache `g._trade` por facción/turno. | `diplomacy.js`: `calculateTradeRoute` independiente; `establishTradeRoute` guarda `routeCells`. |
| **IA diplomática se inserta en `HF.aiPlay` como fase 0.5 (antes de auditoría financiera)** | `aiDiplomacyPhase` llamada **al inicio** de `HF.aiPlay`, antes de `playUnits`/`macro`/`recruit`. Usa `threatMap` actualizado. | `ai.js`: nueva función + llamada en `HF.aiPlay`. `diplomacy_ai.js`: `evaluateNAPNeed`, `evaluateLoanNeed`, `evaluateTradeOpportunity`. |
| **Serialización compatible con savegames existentes (versionado + migración automática)** | `serializeDiplomacy` añade `version:2`. `deserialize` detecta `!data.treaties` → migración v1→v2 (inicializa estructuras vacías). Maps → Arrays para JSON. | `engine.js`: hooks en `serialize`/`deserialize` + `migrateDiplomacy`. |
| **Performance: overhead < 5ms/turno en mapas R=18** | - `threatMap`: O(F²) por facción (F≤6) → trivial<br>- `evaluateNAPNeed`: O(F×border) → cache `sharedBorderLength`<br>- `calculateTradeRoute`: Dijkstra solo al establecer ruta (no cada turno)<br>- `checkTradeRouteInterdiction`: O(routes × pathLen) → routes ≤ 3/facción<br>- `processLoanPayments`: O(loans) → loans ≤ 3/facción | `diplomacy.js`: algoritmos O(1) por facción; caches invalidados en `HF.supply`/`HF.act`. |

---

## 6. ARCHIVOS A CREAR / MODIFICAR

### 6.1 Nuevos Archivos
| Archivo | Responsabilidad |
|---------|-----------------|
| `js/diplomacy.js` | Núcleo: `HF.Diplomacy` API, FSM tratados/préstamos/rutas, `canAttack`, `calculateTradeRoute`, `processExpirations`, `processLoanPayments`, `checkTradeRouteInterdiction`, `updateThreatMap` |
| `js/diplomacy_ai.js` | IA diplomática: `evaluateNAPNeed`, `evaluateLoanNeed`, `evaluateTradeOpportunity`, `estimateEnemyNAPWillingness`, `proposeTradeAgreement`, `aiPreExpirationPositioning` |
| `js/diplomacy_ui.js` | Render: `drawNAPBorderOverlay`, `renderDiplomacyTimeline`, `getTreatyTooltip`, panel diplomacia, eventos narrativos (flavor text) |
| `data/diplomacy_events.json` | Plantillas de eventos: `nap_signed`, `nap_expiring_soon`, `nap_expired`, `loan_default`, `trade_route_interdicted` |

### 6.2 Archivos Existentes a Modificar
| Archivo | Cambios |
|---------|---------|
| `js/config.js` | Añadir `CFG.DIPLOMACY` (sección 8 de especificación) |
| `js/engine.js` | Integrar hooks en `HF.act` (canAttack), `HF.endTurn` (processExpirations), `startTurn` (processLoanPayments, checkTradeRouteInterdiction, updateThreatMap), `settle` (rutas comerciales), `serialize`/`deserialize` (migración v2) |
| `js/ai.js` | Insertar `aiDiplomacyPhase` al inicio de `HF.aiPlay`; añadir `aiPreExpirationPositioning` al final |
| `js/board.js` | Añadir `drawNAPBorderOverlay`; llamar en `draw()`; integrar `diplomacy_ui.js` events |
| `js/game.js` | Panel diplomacia (botón HUD), tooltips tratados, timeline visual, botones proponer/aceptar |
| `js/data.js` | Estructuras iniciales `faction.economy`, `faction.diplomacy`, `faction.treaties` en `HF.newGame` |
| `index.html` | Cargar 3 nuevos scripts tras `engine.js` y antes de `ai.js` |

### 6.3 Orden de Carga Actualizado (`index.html`)
```html
<script src="js/engine.js"></script>
<script src="js/diplomacy.js"></script>        <!-- NUEVO -->
<script src="js/diplomacy_ai.js"></script>     <!-- NUEVO -->
<script src="js/diplomacy_ui.js"></script>     <!-- NUEVO -->
<script src="js/ai.js"></script>
<script src="js/board.js"></script>
...
```

---

## 7. CONFIGURACIÓN (`CFG.DIPLOMACY` en `config.js`)

```javascript
CFG.DIPLOMACY = {
  // Pacto Sagrado (NAP)
  nap: {
    minDuration: 5, maxDuration: 30, breakPenalty: 0,        // 0 = SAGRADO
    borderLockDefault: true, visionSharingDefault: false,
    renewalGracePeriod: 3
  },
  // Acuerdos Comerciales
  trade: {
    maxRoutesPerTreaty: 3, routeInterdictionLoss: 0.5,
    routeSetupCost: 10, minRouteValue: 2
  },
  // Préstamos / Banca
  loans: {
    baseInterestRate: 0.10, maxInterestRate: 0.50,
    creditScoreImpact: { onTimePayment: +1, latePayment: -5, default: -20, earlyRepayment: +3 },
    collateralTypes: ['trade_route', 'city_income', 'unit_production'],
    defaultSeizureRate: 0.30, maxActiveLoansPerFaction: 3
  },
  // Confianza / Reputación
  trust: {
    baseTrust: 50, decayPerTurn: 1,
    napBreakPenalty: 50, loanDefaultPenalty: 30,
    tradeBetrayalPenalty: 20, warDeclarationPenalty: 15, giftBonus: 5
  },
  // IA Diplomacia
  ai: {
    napUrgencyThreshold: 2, loanDesperationThreshold: -20,
    tradeAsymmetryThreshold: 2.0,
    maxNAPDurationVsThreat: { low: 25, medium: 15, high: 8 }
  }
};
```

---

## 8. TESTING Y VALIDACIÓN (Casos de Prueba Críticos)

| ID | Escenario | Resultado Esperado |
|----|-----------|-------------------|
| **TC-01** | Atacar con PNA activo (`breakPenalty=0`) | `canAttack` → `allowed: false`, razón incluye countdown |
| **TC-02** | Mover unidad a celda fronteriza bloqueada por PNA | Movimiento denegado, tooltip "Frontera sellada" |
| **TC-03** | PNA expira turno N → Turno N+1 atacar permitido | `canAttack` → `allowed: true` en turno N+1 |
| **TC-04** | IA mueve tropas a frontera en turnos N-3, N-2, N-1 | Unidades posicionadas para atacar en N+1 |
| **TC-05** | Intentar romper PNA via acción diplomática | No existe acción "romper" si `breakPenalty=0` |
| **TC-10** | Facción con `net.gold < 0` paga préstamo | Pago ok, `net.gold` más negativo, préstamo continúa |
| **TC-11** | Facción sin oro → default préstamo | `in_arrears`, embargo 30% ingresos, `creditScore -20` |
| **TC-12** | Default repetido → `DEFAULTED` | Embargo total, pérdida ciudad/colateral, casus belli |
| **TC-20** | Ruta establecida, unidad enemiga entra en celda | Ruta → `INTERDICTED`, 50% recurso perdido ese turno |
| **TC-21** | Unidad enemiga sale de celda | Ruta → `ACTIVE` (recuperación automática) |
| **TC-22** | Guerra declarada → rutas suspendidas | Rutas entre beligerantes → `SUSPENDED` |
| **TC-30** | IA con 3 frentes abiertos | Propone PNA al flanco más débil/dispuesto |
| **TC-31** | IA con `net.gold < -20` | Solicita préstamo urgente al mercado |
| **TC-32** | IA con excedente madera, vecino con excedente oro | Propone acuerdo comercial madera↔oro |
| **TC-33** | PNA expira en 2 turnos, amenaza alta | Mueve unidades a posiciones de ataque |

---

## 9. MÉTRICAS DE ÉXITO (KPIs)

1. **Tensión Diplomática:** % partidas donde jugadores/IA posicionan tropas en últimos 3 turnos de PNA > 70%
2. **Supervivencia Económica:** % facciones IA que usan préstamos/comercio para evitar quiebra > 50%
3. **Frentes Controlados:** Partidas donde IA mantiene ≤ 2 frentes abiertos simultáneos > 80%
4. **Rupturas Cero:** 0 instancias de ruptura de PNA con `breakPenalty=0` (hard constraint)
5. **Juice Visual:** 100% tratados muestran countdown, border glow, eventos narrativos
6. **Performance:** `HF.Diplomacy` añade **< 5ms/turno** en mapas R=18 (1027 celdas, 6 facciones)

---

## 10. RIESGOS Y MITIGACIONES

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| IA se ata con PNAs largos y no ataca | Media | Alto | `maxNAPDurationVsThreat` límite dinámico; IA evalúa renovación vs expiración |
| Préstamos triviales (oro fácil) | Alta | Medio | `baseInterestRate=10%` + `creditScore` gate; `maxActiveLoans=3` |
| Rutas comerciales inviables (pathfinding) | Media | Medio | Fallback: rutas directas adyacentes; peso diplomático en pathfinding |
| Serialización rompe savegames antiguos | Baja | Crítico | Versionado en savegame; migración automática en `deserialize` |
| Acoplamiento `diplomacy.js` → `engine.js` | Alta | Medio | Contratos claros (`HF.Diplomacy.*`); engine solo llama hooks definidos |

---

**Fin del documento.**  
**Listo para implementación por Programador.**