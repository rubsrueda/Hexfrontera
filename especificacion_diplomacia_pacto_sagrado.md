# ESPECIFICACIÓN TÉCNICA: MECÁNICA DIPLOMÁTICA "PACTO SAGRADO / FRONTALIDAD LOGÍSTICA"

**Proyecto:** HEXFRONTIER  
**Versión:** 1.0  
**Fecha:** 2026-11-12  
**Autor:** Orquestador (Lead Agent)  
**Estado:** Para revisión del Arquitecto  

---

## 1. RESUMEN EJECUTIVO

Esta especificación define una nueva mecánica diplomática que transforma la diplomacia de "gestión de relaciones abstractas" a **"extensión de la logística de guerra"**. Tres pilares fundamentales:

1. **Pacto Sagrado (PNA con caducidad rígida):** Contratos inquebrantables con fecha de expiración visible. Sin traiciones a mitad de camino. La tensión emerge de la **cuenta atrás pública**.
2. **Frontalidad Logística (Gestión de frentes):** La diplomacia como herramienta geométrica para neutralizar flancos y concentrar masa crítica. Un frente abierto = sentencia logística.
3. **Economía de Supervivencia Asimétrica (Banca/Préstamos/Intercambios):** Recursos que duelen de verdad. Reclutamiento = factura permanente. Préstamos con intereses asfixiantes. Intercambios forzados por asimetría de biomas.

---

## 2. MODELO DE DATOS

### 2.1 Nuevas Entidades y Extensiones

#### 2.1.1 Tratado (Nueva entidad principal)
```javascript
// HF.TREATY_TYPES
const TREATY_TYPES = {
  NAP: 'non_aggression_pact',      // Pacto de No Agresión (PNA)
  TRADE: 'trade_agreement',         // Acuerdo Comercial
  LOAN: 'loan_contract',            // Contrato de Préstamo
  TRUCE: 'truce'                    // Tregua forzada (post-guerra)
};

// Estructura de un Tratado activo
HF.Treaty = {
  id: Number,                       // ID único global
  type: String,                     // TREATY_TYPES.*
  factions: [Number, Number],       // [factionA, factionB] - ordenados asc
  startTurn: Number,                // Turno de firma
  expiryTurn: Number,               // Turno de expiración (INCLUSIVE - válido HASTA este turno)
  status: 'active' | 'expired' | 'broken', // Estado actual
  
  // --- Específicos por tipo ---
  // NAP
  napTerms: {
    borderLock: Boolean,            // ¿Bloquea movimiento en frontera? (default: true)
    visionSharing: Boolean,         // ¿Comparten visión? (default: false)
    breakPenalty: Number            // Penalización por ruptura (0 = imposible romper)
  },
  
  // TRADE
  tradeTerms: {
    routes: [                       // Rutas comerciales activas
      {
        resource: String,           // 'wood' | 'gold' | 'food' | 'iron'
        fromFaction: Number,        // Productor
        toFaction: Number,          // Consumidor
        amountPerTurn: Number,
        routeCells: [Number],       // Celdas por las que pasa (para interdicción)
        active: Boolean
      }
    ],
    totalValuePerTurn: Number       // Valor total del intercambio/turno
  },
  
  // LOAN
  loanTerms: {
    principal: Number,              // Cantidad prestada (oro)
    interestRate: Number,           // Tasa por turno (ej. 0.15 = 15%/turno)
    remainingTurns: Number,         // Turnos restantes de pago
    totalOwed: Number,              // Principal + intereses acumulados
    collateral: {                   // Garantía (opcional)
      type: 'trade_route' | 'city_income' | 'unit_Production',
      targetId: Number
    },
    lender: Number,                 // Facción prestamista
    borrower: Number                // Facción prestataria
  },
  
  // Metadatos
  negotiationLog: [                 // Historial de contraofertas
    { turn: Number, proposer: Number, terms: Object, accepted: Boolean }
  ],
  brokenBy: Number | null,          // Quién lo rompió (si status === 'broken')
  brokenTurn: Number | null
};
```

#### 2.1.2 Extensión de Facción (`g.f[i]`)
```javascript
// Añadir a la estructura de facción existente
faction: {
  // ... campos existentes ...
  
  // NUEVO: Diplomacia
  treaties: [Number],               // IDs de tratados activos (referencia a g.treaties)
  treatyHistory: [Number],          // IDs de tratados finalizados/rotos
  
  // NUEVO: Economía de supervivencia
  economy: {
    // Recursos base (ya existen en config.js como CFG.RESOURCES)
    // food, gold, wood, iron, population
    
    // Flujo por turno (calculado en settle())
    income: { food: 0, gold: 0, wood: 0, iron: 0, population: 0 },
    expenses: { food: 0, gold: 0, wood: 0, iron: 0, population: 0 },
    net: { food: 0, gold: 0, wood: 0, iron: 0, population: 0 },
    
    // Deuda y banca
    activeLoans: [Number],          // IDs de préstamos donde es prestatario
    loansGiven: [Number],           // IDs de préstamos donde es prestamista
    creditScore: Number,            // 0-100, afecta tasas de interés
    defaultHistory: Number,         // Veces que ha incumplido préstamos
    
    // Reservas estratégicas (para IA)
    strategicReserves: { food: 0, gold: 0, wood: 0, iron: 0 }
  },
  
  // NUEVO: Inteligencia diplomática
  diplomacy: {
    threatMap: Map<Number, Number>, // factionId -> threatLevel (0-100)
    preferredTargets: [Number],     // Facciones objetivo prioritarias
    securedFlanks: [Number],        // Facciones con PNA activo (flancos neutralizados)
    tradePartners: [Number],        // Facciones con acuerdos comerciales
    trustScores: Map<Number, Number> // factionId -> trust (0-100, decae con rupturas)
  }
};
```

#### 2.1.3 Extensión de Célula (`g.cells[i]`)
```javascript
// Añadir para soporte de rutas comerciales e interdicción
cell: {
  // ... campos existentes ...
  
  // NUEVO: Rutas comerciales
  tradeRoutes: [                    // Rutas que pasan por esta celda
    {
      treatyId: Number,
      resource: String,
      direction: Number,            // factionId destino
      active: Boolean
    }
  ],
  
  // NUEVO: Control fronterizo (para PNA)
  borderControl: {                  // Solo relevante en celdas fronterizas
    owner: Number,                  // Facción que controla
    contestedBy: Number | null,     // Facción que disputa (unidades adyacentes)
    napLocked: Boolean              // ¿Bloqueada por PNA activo?
  }
};
```

#### 2.1.4 Estado Global (`g`)
```javascript
// Añadir al objeto g principal
g: {
  // ... campos existentes ...
  
  // NUEVO: Registro global de tratados
  treaties: Map<Number, HF.Treaty>, // treatyId -> Treaty
  nextTreatyId: Number,
  
  // NUEVO: Mercado global de préstamos (para IA)
  loanMarket: {
    offers: [                       // Ofertas de préstamo públicas
      {
        id: Number,
        lender: Number,
        maxAmount: Number,
        interestRate: Number,       // Base rate
        minCreditScore: Number,
        active: Boolean
      }
    ],
    requests: [                     // Solicitudes de préstamo
      {
        id: Number,
        borrower: Number,
        amount: Number,
        maxRate: Number,
        purpose: 'maintenance' | 'recruitment' | 'construction' | 'emergency',
        active: Boolean
      }
    ]
  },
  
  // NUEVO: Configuración diplomática
  diplomacyConfig: {
    napMinDuration: 5,              // Turnos mínimos
    napMaxDuration: 30,             // Turnos máximos
    napBreakPenalty: 0,             // 0 = imposible romper (Pacto Sagrado)
    tradeRouteInterdictionDamage: 0.5, // % de recurso perdido si ruta interceptada
    loanDefaultPenalty: 0.3,        // % de ingresos embargados por defecto
    trustDecayPerTurn: 1,           // Decaimiento natural de confianza
    trustLossOnNapBreak: 50,        // Pérdida masiva si se rompe PNA (legacy)
    trustLossOnLoanDefault: 30
  }
};
```

---

## 3. MÁQUINAS DE ESTADO (FSM)

### 3.1 FSM de Tratado (Nivel Tratado)

```
┌─────────────┐
│  NEGOTIATING │ ◄─── Propuesta / Contraoferta
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

**Regla de Oro (Pacto Sagrado):** `breakPenalty = 0` para NAP → **NO EXISTE transición ACTIVE → BROKEN**. El tratado solo muere por expiración natural.

### 3.2 FSM de Préstamo (Nivel Préstamo)

```
┌─────────────┐
│  PROPOSED   │ ◄─── Oferta / Solicitud en mercado
└──────┬──────┘
       │ accept()
       ▼
┌─────────────┐     remainingTurns == 0      ┌──────────┐
│   ACTIVE    │ ────────────────────────────► │  PAID    │
└──────┬──────┘                                 └──────────┘
       │
       │ default() [oro insuficiente en settle()]
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

### 3.3 FSM de Ruta Comercial

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

## 4. CONTRATOS DE INTEGRACIÓN (API PÚBLICA)

### 4.1 Módulo `HF.Diplomacy` (Nuevo módulo)

```javascript
HF.Diplomacy = {
  // === GESTIÓN DE TRATADOS ===
  
  // Proponer un tratado (inicia negociación)
  // Returns: { success: Boolean, treatyId: Number, message: String }
  proposeTreaty: (g, proposerFaction, targetFaction, type, terms) => {},
  
  // Responder a propuesta (aceptar/rechazar/contraoferta)
  // Returns: { success: Boolean, treatyId: Number, status: 'accepted'|'rejected'|'countered' }
  respondToTreaty: (g, treatyId, responderFaction, response, counterTerms) => {},
  
  // Finalizar tratados expirados (llamado en roundEnd)
  // Returns: Number (count of expired treaties)
  processExpirations: (g) => {},
  
  // Obtener tratados activos de una facción
  getActiveTreaties: (g, factionId, typeFilter) => [],
  
  // Verificar si dos facciones tienen PNA activo
  hasActiveNAP: (g, factionA, factionB) => Boolean,
  
  // Verificar si se puede atacar (respeta PNA sagrado)
  // Returns: { allowed: Boolean, reason: String }
  canAttack: (g, attackerFaction, defenderFaction, fromCell, toCell) => {},
  
  // === GESTIÓN DE PRÉSTAMOS ===
  
  // Solicitar préstamo al mercado / facción específica
  requestLoan: (g, borrower, amount, maxRate, purpose, targetLender) => {},
  
  // Ofrecer préstamo al mercado
  offerLoan: (g, lender, maxAmount, baseRate, minCreditScore) => {},
  
  // Procesar pagos de préstamos (llamado en settle() de cada facción)
  // Returns: { paid: Number, defaulted: Number, details: [] }
  processLoanPayments: (g, factionId) => {},
  
  // Embargar ingresos por defecto
  enforceDefault: (g, loanId) => {},
  
  // === GESTIÓN DE RUTAS COMERCIALES ===
  
  // Establecer ruta comercial (requiere TRADE treaty activo)
  establishTradeRoute: (g, treatyId, resource, fromFaction, toFaction, amountPerTurn) => {},
  
  // Calcular ruta óptima (pathfinding evitando enemigos)
  // Returns: { path: [cellId], cost: Number, safe: Boolean } | null
  calculateTradeRoute: (g, fromCell, toCell, avoidFactions) => {},
  
  // Verificar interdicción de rutas (llamado cada turno)
  checkTradeRouteInterdiction: (g) => {},
  
  // === INTELIGENCIA DIPLOMÁTICA (IA) ===
  
  // Actualizar mapa de amenazas de una facción
  updateThreatMap: (g, factionId) => {},
  
  // Evaluar necesidad de PNA (neutralizar flanco)
  // Returns: { needed: Boolean, targetFaction: Number, urgency: Number, maxDuration: Number }
  evaluateNAPNeed: (g, factionId) => {},
  
  // Evaluar necesidad de préstamo
  // Returns: { needed: Boolean, amount: Number, maxRate: Number, purpose: String }
  evaluateLoanNeed: (g, factionId) => {},
  
  // Evaluar oportunidad de intercambio asimétrico
  // Returns: { partner: Number, give: {resource, amount}, take: {resource, amount}, value: Number }
  evaluateTradeOpportunity: (g, factionId) => {},
  
  // === UI / INFORMACIÓN ===
  
  // Obtener cuenta atrás visible para UI (turnos hasta expiración)
  getTreatyCountdown: (g, treatyId) => Number,
  
  // Generar tooltip de tratado para UI
  getTreatyTooltip: (g, treatyId, viewerFaction) => String,
  
  // Obtener resumen diplomático para facción
  getDiplomacySummary: (g, factionId) => {}
};
```

### 4.2 Puntos de Integración con Motor Existente

#### 4.2.1 `HF.act()` - Validación de Acciones
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

#### 4.2.2 `HF.endTurn()` / `startTurn()` - Ciclo de Vida
```javascript
// EN engine.js HF.endTurn()
// DESPUÉS de procesar todas las facciones IA, ANTES de roundEnd:
HF.Diplomacy.processExpirations(g); // Expirar tratados, liberar rutas

// EN engine.js startTurn(g, factionId)
// AL INICIO del turno de cada facción:
HF.Diplomacy.processLoanPayments(g, factionId); // Cobrar préstamos
HF.Diplomacy.checkTradeRouteInterdiction(g);    // Verificar rutas
HF.Diplomacy.updateThreatMap(g, factionId);     // Actualizar IA
```

#### 4.2.3 `HF.settle()` - Economía
```javascript
// EN engine.js settle(g, factionId)
// DESPUÉS de calcular income/expenses base:
// 1. Aplicar ingresos/gastos de rutas comerciales activas
// 2. Aplicar pagos de préstamos (ya hecho en startTurn)
// 3. Calcular net = income - expenses
// 4. Si net.gold < 0 y tiene préstamos → riesgo de default
// 5. Actualizar faction.economy.net, income, expenses
```

#### 4.2.4 `HF.supply()` - Rutas Comerciales
```javascript
// EN engine.js supply()
// Las rutas comerciales necesitan pathfinding de suministro
// Reutilizar HF.supply() BFS pero con pesos:
// - Celdas propias: coste 1
// - Celdas aliadas (PNA/TRADE): coste 1.5
// - Celdas neutrales: coste 3
// - Celdas enemigas: INF (imposible)
// Una ruta interceptada = unidad enemiga en celda de la ruta
```

---

## 5. ALGORITMOS CLAVE (PSEUDOCÓDIGO)

### 5.1 `canAttack()` - El Guardián del Pacto Sagrado

```javascript
function canAttack(g, attackerId, defenderId, fromCell, toCell) {
  // 1. Buscar PNA activo entre ambas facciones
  const treaties = HF.Diplomacy.getActiveTreaties(g, attackerId, 'non_aggression_pact');
  const nap = treaties.find(t => t.factions.includes(defenderId));
  
  if (nap) {
    const countdown = nap.expiryTurn - g.turn + 1; // Turnos restantes INCLUYENDO actual
    
    // PACTO SAGRADO: breakPenalty = 0 → IMPOSIBLE romper
    if (nap.napTerms.breakPenalty === 0) {
      return { 
        allowed: false, 
        reason: `PACTO SAGRADO VIGENTE con ${HF.getFactionName(defenderId)}. Expira en ${countdown} turnos (Turno ${nap.expiryTurn}). No se puede romper.`,
        treatyId: nap.id,
        countdown: countdown
      };
    }
    
    // Legacy: PNA rompible (no usado en diseño nuevo)
    // Requeriría acción diplomática explícita + penalización
  }
  
  // 2. Verificar tregua forzada (post-guerra)
  const truces = HF.Diplomacy.getActiveTreaties(g, attackerId, 'truce');
  const truce = truces.find(t => t.factions.includes(defenderId));
  if (truce) {
    return { 
      allowed: false, 
      reason: `TREGUA FORZADA vigente (expira en ${truce.expiryTurn - g.turn + 1} turnos)`,
      treatyId: truce.id
    };
  }
  
  // 3. Verificar movimiento en zona fronteriza bloqueada por PNA
  if (g.cells[toCell].borderControl?.napLocked) {
    const owner = g.cells[toCell].borderControl.owner;
    if (owner === defenderId) {
      const nap = HF.Diplomacy.getActiveTreaties(g, attackerId, 'non_aggression_pact')
        .find(t => t.factions.includes(defenderId));
      if (nap) {
        return {
          allowed: false,
          reason: `Frontera sellada por PACTO SAGRADO (expira Turno ${nap.expiryTurn})`
        };
      }
    }
  }
  
  return { allowed: true, reason: null };
}
```

### 5.2 `evaluateNAPNeed()` - IA: ¿Necesito neutralizar un flanco?

```javascript
function evaluateNAPNeed(g, factionId) {
  const faction = g.f[factionId];
  const threats = faction.diplomacy.threatMap; // factionId -> threatLevel (0-100)
  const securedFlanks = faction.diplomacy.securedFlanks; // factionIds con PNA activo
  const activeNAPs = HF.Diplomacy.getActiveTreaties(g, factionId, 'non_aggression_pact');
  
  // 1. Identificar frentes abiertos (vecinos hostiles SIN PNA)
  const openFronts = [];
  for (const [enemyId, threat] of threats) {
    if (threat < 30) continue; // No es amenaza real
    if (securedFlanks.includes(enemyId)) continue; // Ya neutralizado
    
    // Verificar contacto territorial (frontera compartida)
    const sharedBorder = calculateSharedBorderLength(g, factionId, enemyId);
    if (sharedBorder === 0) continue; // No tocan, no es flanco inmediato
    
    openFronts.push({ enemyId, threat, borderLength: sharedBorder });
  }
  
  // 2. Si 0 o 1 frente abierto → NO necesito PNA urgente
  if (openFronts.length <= 1) {
    return { needed: false, reason: 'Frentes controlados' };
  }
  
  // 3. MÁS DE 1 FRENTE ABIERTO = EMERGENCIA LOGÍSTICA
  // Ordenar por amenaza * longitud de frontera (presión total)
  openFronts.sort((a, b) => (b.threat * b.borderLength) - (a.threat * a.borderLength));
  
  // El flanco MÁS peligroso es el que QUIERO ATACAR
  // Los DEMÁS flancos son los que NECESITO NEUTRALIZAR con PNA
  const primaryTarget = openFronts[0]; // Objetivo principal de guerra
  const flanksToSecure = openFronts.slice(1); // Flancos a neutralizar
  
  // 4. Evaluar candidatos a PNA (flancos secundarios)
  for (const flank of flanksToSecure) {
    const enemy = g.f[flank.enemyId];
    
    // ¿El enemigo aceptaría? (IA enemiga evalúa su propia situación)
    const enemyWillingness = estimateEnemyNAPWillingness(g, flank.enemyId, factionId);
    if (enemyWillingness < 0.5) continue; // No aceptará
    
    // Calcular duración óptima: cubrir hasta que gane guerra principal
    const estimatedWarDuration = estimateWarDuration(g, factionId, primaryTarget.enemyId);
    const napDuration = Math.min(
      Math.max(estimatedWarDuration + 3, g.diplomacyConfig.napMinDuration),
      g.diplomacyConfig.napMaxDuration
    );
    
    return {
      needed: true,
      targetFaction: flank.enemyId,
      urgency: flank.threat * flank.borderLength, // Presión logística
      maxDuration: napDuration,
      primaryTarget: primaryTarget.enemyId,
      reasoning: `Neutralizar flanco ${HF.getFactionName(flank.enemyId)} para concentrar vs ${HF.getFactionName(primaryTarget.enemyId)}`
    };
  }
  
  return { needed: false, reason: 'Ningún flanco acepta PNA' };
}

// Helper: Estimar disposición enemiga a firmar PNA
function estimateEnemyNAPWillingness(g, enemyId, proposerId) {
  const enemy = g.f[enemyId];
  const enemyThreats = enemy.diplomacy.threatMap;
  const enemyOpenFronts = countOpenFronts(g, enemyId);
  
  // Factores que aumentan disposición:
  let willingness = 0.3; // Base
  
  // 1. Enemigo también tiene múltiples frentes → NECESITA aire
  if (enemyOpenFronts >= 2) willingness += 0.4;
  
  // 2. Enemigo más débil militarmente → Quiere tiempo
  const myMilitary = calculateTotalMilitaryPower(g, proposerId);
  const enemyMilitary = calculateTotalMilitaryPower(g, enemyId);
  if (enemyMilitary < myMilitary * 0.7) willingness += 0.2;
  
  // 3. Confianza previa
  const trust = enemy.diplomacy.trustScores.get(proposerId) || 50;
  willingness += (trust - 50) / 100 * 0.2;
  
  // 4. Relación comercial existente
  if (enemy.diplomacy.tradePartners.includes(proposerId)) willingness += 0.15;
  
  // 5. Desesperación económica (necesita préstamo/comercio)
  if (enemy.economy.net.gold < -10) willingness += 0.2;
  
  return Math.min(1.0, Math.max(0.0, willingness));
}
```

### 5.3 `processLoanPayments()` - El Cobrador Implacable

```javascript
function processLoanPayments(g, factionId) {
  const faction = g.f[factionId];
  const results = { paid: 0, defaulted: 0, details: [] };
  
  for (const loanId of faction.economy.activeLoans) {
    const loan = g.treaties.get(loanId);
    if (!loan || loan.type !== 'loan_contract' || loan.status !== 'active') continue;
    
    const paymentDue = Math.ceil(loan.loanTerms.principal * loan.loanTerms.interestRate);
    // Nota: En diseño, el principal se devuelve al final, solo intereses por turno
    // O: cuota fija = (principal * (1 + rate)^turns) / turns
    const installment = calculateInstallment(loan);
    
    if (faction.economy.net.gold >= installment) {
      // PAGAR
      faction.economy.net.gold -= installment;
      faction.economy.expenses.gold += installment;
      loan.loanTerms.remainingTurns--;
      loan.loanTerms.totalOwed -= installment;
      results.paid += installment;
      results.details.push({ loanId, status: 'paid', amount: installment });
      
      if (loan.loanTerms.remainingTurns <= 0) {
        loan.status = 'paid';
        faction.economy.activeLoans = faction.economy.activeLoans.filter(id => id !== loanId);
        // Prestamista recibe el pago
        const lender = g.f[loan.loanTerms.lender];
        lender.economy.net.gold += installment;
        lender.economy.income.gold += installment;
      }
    } else {
      // DEFAULT
      results.defaulted++;
      results.details.push({ loanId, status: 'defaulted', amount: installment, shortfall: installment - faction.economy.net.gold });
      
      // Embargo inmediato: 30% de ingresos futuros + pérdida confianza
      handleLoanDefault(g, loanId, factionId);
    }
  }
  
  return results;
}

function handleLoanDefault(g, loanId, borrowerId) {
  const loan = g.treaties.get(loanId);
  const borrower = g.f[borrowerId];
  const lender = g.f[loan.loanTerms.lender];
  
  // 1. Marcar préstamo en mora
  loan.status = 'in_arrears';
  
  // 2. Penalización de confianza (mutua pero asimétrica)
  borrower.diplomacy.trustScores.set(lender.factionId, 
    (borrower.diplomacy.trustScores.get(lender.factionId) || 50) - g.diplomacyConfig.trustLossOnLoanDefault);
  lender.diplomacy.trustScores.set(borrowerId,
    (lender.diplomacy.trustScores.get(borrowerId) || 50) - 10); // Menos para prestamista
  
  // 3. Embargo: 30% de ingresos de oro van automáticamente al prestamista
  // Se implementa en settle() revisando loan.status === 'in_arrears'
  borrower.economy.creditScore = Math.max(0, borrower.economy.creditScore - 20);
  borrower.economy.defaultHistory++;
  
  // 4. Si hay garantía (collateral), ejecutarla
  if (loan.loanTerms.collateral) {
    executeCollateral(g, loan);
  }
  
  // 5. Evento narrativo
  HF.addEvent(g, {
    type: 'loan_default',
    turn: g.turn,
    borrower: borrowerId,
    lender: loan.loanTerms.lender,
    amount: loan.loanTerms.principal,
    message: `${HF.getFactionName(borrowerId)} incumple préstamo de ${loan.loanTerms.principal} oro con ${HF.getFactionName(lender.factionId)}. Embargo activado.`
  });
}
```

### 5.4 `calculateTradeRoute()` - Pathfinding Asimétrico

```javascript
function calculateTradeRoute(g, fromCellId, toCellId, avoidFactions = []) {
  // Dijkstra/A* sobre grafo hexagonal con pesos diplomáticos
  // fromCellId: ciudad productora / nodo de entrada
  // toCellId: ciudad consumidora / nodo de salida
  
  const openSet = new PriorityQueue(); // { cellId, cost, path }
  const closedSet = new Set();
  const cameFrom = new Map();
  const gScore = new Map();
  
  openSet.enqueue({ cellId: fromCellId, cost: 0, path: [fromCellId] });
  gScore.set(fromCellId, 0);
  
  while (!openSet.isEmpty()) {
    const current = openSet.dequeue();
    
    if (current.cellId === toCellId) {
      return { 
        path: current.path, 
        cost: current.cost, 
        safe: true,
        distance: current.path.length - 1
      };
    }
    
    if (closedSet.has(current.cellId)) continue;
    closedSet.add(current.cellId);
    
    // Expandir vecinos hexagonales
    for (const neighborId of HF.getNeighbors(current.cellId)) {
      if (closedSet.has(neighborId)) continue;
      
      const neighbor = g.cells[neighborId];
      const currentCell = g.cells[current.cellId];
      
      // CALCULAR PESO DIPLOMÁTICO
      let weight = 1.0;
      const neighborFaction = neighbor.f;
      const currentFaction = currentCell.f;
      
      // Mar/Océano = imposible para rutas terrestres (salvo puertos)
      if (neighbor.biome === 'ocean' && !hasPort(neighbor)) continue;
      
      // Facción evitable (enemigo declarado)
      if (avoidFactions.includes(neighborFaction)) {
        weight = Infinity; // Imposible
      }
      // Facción propia
      else if (neighborFaction === currentFaction) {
        weight = 1.0;
      }
      // Aliado (PNA o TRADE activo)
      else if (HF.Diplomacy.hasActiveNAP(g, currentFaction, neighborFaction) ||
               hasActiveTrade(g, currentFaction, neighborFaction)) {
        weight = 1.5;
      }
      // Neutral
      else if (neighborFaction === 0 || isNeutral(g, neighborFaction)) {
        weight = 3.0;
      }
      // Enemigo SIN guerra declarada (tensión)
      else if (!atWar(g, currentFaction, neighborFaction)) {
        weight = 10.0; // Muy arriesgado
      }
      // Enemigo EN GUERRA
      else {
        weight = Infinity; // Imposible
      }
      
      // Unidades enemigas en la celda = interdicción
      if (neighbor.u && g.f[neighbor.u].factionId !== currentFaction) {
        if (atWar(g, currentFaction, g.f[neighbor.u].factionId) || 
            HF.Diplomacy.hasActiveNAP(g, currentFaction, g.f[neighbor.u].factionId) === false) {
          weight = Infinity; // Ruta interceptada
        }
      }
      
      const tentativeGScore = gScore.get(current.cellId) + weight;
      
      if (tentativeGScore < (gScore.get(neighborId) || Infinity)) {
        cameFrom.set(neighborId, current.cellId);
        gScore.set(neighborId, tentativeGScore);
        openSet.enqueue({ 
          cellId: neighborId, 
          cost: tentativeGScore, 
          path: [...current.path, neighborId] 
        });
      }
    }
  }
  
  return null; // No hay ruta viable
}
```

### 5.5 `settle()` Extended - Economía de Supervivencia

```javascript
// Extensión de HF.settle(g, factionId) existente
function settleExtended(g, factionId) {
  const faction = g.f[factionId];
  const cells = g.cells;
  
  // 1. RESET CONTADORES
  faction.economy.income = { food: 0, gold: 0, wood: 0, iron: 0, population: 0 };
  faction.economy.expenses = { food: 0, gold: 0, wood: 0, iron: 0, population: 0 };
  
  // 2. INGRESOS BASE (ciudades, edificios, territorio)
  for (const cellId of faction.ownedCells) {
    const cell = cells[cellId];
    // ... lógica existente de ingresos por bioma/edificios ...
    // Acumular en faction.economy.income
  }
  
  // 3. INGRESOS DE RUTAS COMERCIALES
  for (const treatyId of faction.treaties) {
    const treaty = g.treaties.get(treatyId);
    if (!treaty || treaty.type !== 'trade_agreement' || treaty.status !== 'active') continue;
    
    for (const route of treaty.tradeTerms.routes) {
      if (!route.active) continue;
      
      if (route.toFaction === factionId) {
        // SOMOS RECEPTORES
        faction.economy.income[route.resource] += route.amountPerTurn;
        // El dador ya lo contabilizó como gasto
      } else if (route.fromFaction === factionId) {
        // SOMOS DADORES
        faction.economy.expenses[route.resource] += route.amountPerTurn;
      }
    }
  }
  
  // 4. GASTOS DE MANTENIMIENTO (UNIDADES) - YA EXISTE EN ENGINE.JS
  // HF.settle() ya itera unidades y suma up/upGold
  // Asegurar que se usa faction.economy.expenses
  
  // 5. PAGOS DE PRÉSTAMOS (intereses) - YA HECHO EN startTurn via processLoanPayments
  // Pero contabilizar en expenses para net correcto
  // faction.economy.expenses.gold += loanPaymentsThisTurn;
  
  // 6. CALCULAR NETO
  for (const res of ['food', 'gold', 'wood', 'iron', 'population']) {
    faction.economy.net[res] = faction.economy.income[res] - faction.economy.expenses[res];
  }
  
  // 7. APLICAR NETO A RESERVAS
  // food → graneros (límite por silos)
  // gold → tesorería (sin límite duro, pero préstamos dependen de flujo)
  // wood/iron → almacenes (límite por almacenes)
  
  // 8. VERIFICAR SUPERVIVENCIA (hambre, deserción, quiebra)
  checkSurvival(g, factionId);
  
  // 9. ACTUALIZAR CREDIT SCORE (basado en flujo de caja sostenido)
  updateCreditScore(g, factionId);
}

function checkSurvival(g, factionId) {
  const faction = g.f[factionId];
  const net = faction.economy.net;
  
  // HAMBRE: net.food < 0 → unidades desertan / población muere
  if (net.food < 0) {
    const deficit = Math.abs(net.food);
    // Perder población: 1 pop por 5 comida de déficit
    const popLoss = Math.ceil(deficit / 5);
    // Deserción unidades: prioridad N3 > N2 > N1, INF > CAB > ARC > ENG > SIE > BAR
    desertUnits(g, factionId, popLoss);
    HF.addEvent(g, { type: 'famine', faction: factionId, popLoss, deficit });
  }
  
  // QUIEBRA: net.gold < 0 Y sin préstamos activos / crédito agotado
  if (net.gold < 0 && faction.economy.activeLoans.length === 0 && faction.economy.creditScore < 20) {
    // Deserción masiva por impago
    const desertionCount = Math.ceil(Math.abs(net.gold) / 10);
    desertUnits(g, factionId, desertionCount, 'unpaid');
    HF.addEvent(g, { type: 'bankruptcy', faction: factionId, desertions: desertionCount });
  }
  
  // DEUDA EXTREMA: net.gold << 0 con préstamos → riesgo default próximo turno
  if (net.gold < -50) {
    // IA: trigger evaluateLoanNeed() urgente
    faction.diplomacy.urgentLoanNeed = true;
  }
}
```

---

## 6. INTEGRACIÓN CON IA (HF.aiPlay)

### 6.1 Nueva Fase: Diplomacia Estratégica (Fase 0.5 - Antes de Macrogestión)

```javascript
// En ai.js, HF.aiPlay(g, factionId)
// INSERTAR al inicio, antes de auditoría financiera:

function aiDiplomacyPhase(g, factionId) {
  const faction = g.f[factionId];
  
  // 1. ACTUALIZAR MAPA DE AMENAZAS
  HF.Diplomacy.updateThreatMap(g, factionId);
  
  // 2. EVALUAR NECESIDAD DE PNA (NEUTRALIZAR FLANCOS)
  const napNeed = HF.Diplomacy.evaluateNAPNeed(g, factionId);
  if (napNeed.needed && Math.random() < 0.7) { // 70% prob actuar si necesidad alta
    const terms = {
      duration: napNeed.maxDuration,
      borderLock: true,
      visionSharing: false,
      breakPenalty: 0 // PACTO SAGRADO
    };
    HF.Diplomacy.proposeTreaty(g, factionId, napNeed.targetFaction, 'non_aggression_pact', terms);
  }
  
  // 3. EVALUAR NECESIDAD DE PRÉSTAMO
  const loanNeed = HF.Diplomacy.evaluateLoanNeed(g, factionId);
  if (loanNeed.needed) {
    HF.Diplomacy.requestLoan(g, factionId, loanNeed.amount, loanNeed.maxRate, loanNeed.purpose);
  }
  
  // 4. EVALUAR OPORTUNIDADES COMERCIALES (ASIMETRÍA DE BIOMAS)
  const tradeOpp = HF.Diplomacy.evaluateTradeOpportunity(g, factionId);
  if (tradeOpp.value > 50) { // Umbral de valor
    // Proponer acuerdo comercial + rutas
    proposeTradeAgreement(g, factionId, tradeOpp);
  }
  
  // 5. GESTIONAR TRATADOS POR EXPIRAR (RENOVAR O PREPARAR GUERRA)
  const expiringSoon = HF.Diplomacy.getActiveTreaties(g, factionId, 'non_aggression_pact')
    .filter(t => t.expiryTurn - g.turn <= 3); // Próximos 3 turnos
  
  for (const treaty of expiringSoon) {
    const otherFaction = treaty.factions.find(f => f !== factionId);
    const threat = faction.diplomacy.threatMap.get(otherFaction) || 0;
    
    if (threat > 60) {
      // PREPARAR GUERRA: mover tropas a frontera (fase microtáctica lo hará)
      faction.diplomacy.preferredTargets.push(otherFaction);
      // NO renovar - dejar expirar para atacar limpio
    } else if (threat < 30) {
      // RENOVAR: relación estable
      HF.Diplomacy.proposeTreaty(g, factionId, otherFaction, 'non_aggression_pact', {
        duration: 15,
        borderLock: true,
        visionSharing: true, // Mayor confianza
        breakPenalty: 0
      });
    }
  }
}
```

### 6.2 Microtáctica: Posicionamiento Pre-Expiración

```javascript
// En fase microtáctica de aiPlay(), ANTES de ataques:
function aiPreExpirationPositioning(g, factionId) {
  const faction = g.f[factionId];
  
  // Para cada PNA que expira en ≤ 3 turnos con facción de alta amenaza
  const expiringNap = HF.Diplomacy.getActiveTreaties(g, factionId, 'non_aggression_pact')
    .filter(t => t.expiryTurn - g.turn <= 3);
  
  for (const treaty of expiringNap) {
    const enemyId = treaty.factions.find(f => f !== factionId);
    const threat = faction.diplomacy.threatMap.get(enemyId) || 0;
    
    if (threat > 50) {
      // MOVER UNIDADES A FRONTERA (posición de ataque para turno de expiración)
      const borderCells = getBorderCells(g, factionId, enemyId);
      const attackPositions = selectBestAttackPositions(g, factionId, borderCells);
      
      for (const { unitId, targetCell } of attackPositions) {
        // Mover hacia targetCell (sin atacar aún - PNA vigente)
        const path = HF.findPath(g, unitId, targetCell, { avoidCombat: true });
        if (path && path.length > 1) {
          HF.act(g, unitId, path[1], 'move'); // Movimiento silencioso
        }
      }
    }
  }
}
```

---

## 7. UI/UX - CUENTA ATRÁS VISIBLE (JUICE)

### 7.1 Indicadores Visuales

```javascript
// En board.js / game.js - Renderizado de tratados

// 1. OVERLAY FRONTERA PNA
function drawNAPBorderOverlay(g, ctx) {
  for (const [treatyId, treaty] of g.treaties) {
    if (treaty.type !== 'non_aggression_pact' || treaty.status !== 'active') continue;
    
    const countdown = treaty.expiryTurn - g.turn + 1;
    const [fA, fB] = treaty.factions;
    const colorA = HF.getFactionColor(fA);
    const colorB = HF.getFactionColor(fB);
    
    // Dibujar línea discontinua en celdas fronterizas
    for (const cellId of getBorderCellsBetween(g, fA, fB)) {
      const cell = g.cells[cellId];
      const screenPos = HF.cellToScreen(cellId);
      
      // Efecto "sello de cera" pulsante
      const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
      ctx.globalAlpha = 0.6 * pulse;
      
      // Gradiente entre colores de ambas facciones
      const grad = ctx.createLinearGradient(
        screenPos.x - 20, screenPos.y,
        screenPos.x + 20, screenPos.y
      );
      grad.addColorStop(0, colorA);
      grad.addColorStop(0.5, '#FFD700'); // Oro = sagrado
      grad.addColorStop(1, colorB);
      
      ctx.strokeStyle = grad;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 4]);
      drawHexBorder(ctx, screenPos, HF.CFG.cellSize);
      ctx.setLineDash([]);
      
      // CONTADOR NUMÉRICO en centro de frontera
      if (countdown <= 5) { // Solo mostrar cuando urge
        ctx.fillStyle = countdown <= 2 ? '#FF0000' : '#FFA500';
        ctx.font = 'bold 14px Georgia';
        ctx.textAlign = 'center';
        ctx.fillText(`${countdown}`, screenPos.x, screenPos.y + 5);
      }
    }
  }
}

// 2. PANEL DIPLOMÁTICO - TIMELINE VISUAL
function renderDiplomacyTimeline(g, factionId) {
  const treaties = HF.Diplomacy.getActiveTreaties(g, factionId);
  const now = g.turn;
  
  return treaties.map(t => ({
    id: t.id,
    type: t.type,
    partner: t.factions.find(f => f !== factionId),
    partnerName: HF.getFactionName(t.factions.find(f => f !== factionId)),
    startTurn: t.startTurn,
    expiryTurn: t.expiryTurn,
    countdown: t.expiryTurn - now + 1,
    progress: (now - t.startTurn) / (t.expiryTurn - t.startTurn + 1), // 0-1
    isCritical: t.expiryTurn - now <= 3,
    statusColor: t.expiryTurn - now <= 2 ? 'danger' : 
                 t.expiryTurn - now <= 5 ? 'warning' : 'stable',
    tooltip: HF.Diplomacy.getTreatyTooltip(g, t.id, factionId)
  }));
}
```

### 7.2 Eventos Narrativos (Flavor Text)

```javascript
// Generados por HF.addEvent() en momentos clave

const DIPLOMACY_EVENTS = {
  nap_signed: {
    templates: [
      "El Pacto de {duration} años entre {us} y {them} se sella con sangre y cera. La frontera calla... por ahora.",
      "{them} y {us} firman el Pacto Sagrado. {countdown} turnos de tregua comprada. Úsenlos sabiamente.",
      "Las espadas se envainan. {us} y {them} acuerdan no agresión hasta el Turno {expiryTurn}. El reloj empieza a correr."
    ]
  },
  nap_expiring_soon: {
    templates: [
      "El Pacto con {them} expira en {countdown} turnos. El acero susurra en las fundas.",
      "{countdown} turnos. La frontera con {them} hierve en silencio. Prepárense.",
      "La cera del sello se agrieta. {them} y {us}: {countdown} turnos para el juicio final."
    ]
  },
  nap_expired: {
    templates: [
      "El Pacto Sagrado con {them} ha expirado. La frontera ya no es una línea, es un desafío.",
      "Turno {turn}: El tratado con {them} muere de vieja. La guerra no necesita declaración.",
      "El silencio termina. {them} y {us} quedan liberados de sus cadenas. Que gane el más fuerte."
    ]
  },
  loan_default: {
    templates: [
      "{borrower} ha incumplido su deuda con {lender}. Los cobradores llaman a las puertas... con espadas.",
      "El oro prometido no llegó. {lender} ejecuta el embargo sobre {borrower}. La usura cobra su precio.",
      "Quiebra de honor: {borrower} no paga a {lender}. Las rutas comerciales se cierran. La confianza, rota."
    ]
  },
  trade_route_interdicted: {
    templates: [
      "Caravana interceptada en {cell}. {resource} perdidos. La guerra llega a los mercados.",
      "La ruta {resource} entre {from} y {to} ha sido cortada. El hambre acecha a quien no protege sus venas comerciales."
    ]
  }
};
```

---

## 8. CONFIGURACIÓN (config.js)

```javascript
// Añadir a HF.CFG en config.js

CFG.DIPLOMACY = {
  // Pacto Sagrado (NAP)
  nap: {
    minDuration: 5,
    maxDuration: 30,
    breakPenalty: 0,              // 0 = SAGRADO (inquebrantable)
    borderLockDefault: true,
    visionSharingDefault: false,
    renewalGracePeriod: 3         // Turnos antes de expiración para renovar
  },
  
  // Acuerdos Comerciales
  trade: {
    maxRoutesPerTreaty: 3,
    routeInterdictionLoss: 0.5,   // 50% recurso perdido si interceptado
    routeSetupCost: 10,           // Oro coste inicial
    minRouteValue: 2              // Mínimo recursos/turno por ruta
  },
  
  // Préstamos / Banca
  loans: {
    baseInterestRate: 0.10,       // 10% base por turno
    maxInterestRate: 0.50,        // 50% usura máxima
    creditScoreImpact: {
      onTimePayment: +1,
      latePayment: -5,
      default: -20,
      earlyRepayment: +3
    },
    collateralTypes: ['trade_route', 'city_income', 'unit_production'],
    defaultSeizureRate: 0.30,     // 30% ingresos embargados
    maxActiveLoansPerFaction: 3
  },
  
  // Confianza / Reputación
  trust: {
    baseTrust: 50,
    decayPerTurn: 1,
    napBreakPenalty: 50,          // Legacy (no usado si breakPenalty=0)
    loanDefaultPenalty: 30,
    tradeBetrayalPenalty: 20,
    warDeclarationPenalty: 15,
    giftBonus: 5
  },
  
  // IA Diplomacia
  ai: {
    napUrgencyThreshold: 2,       // Frentes abiertos para buscar PNA
    loanDesperationThreshold: -20, // Net gold para buscar préstamo urgente
    tradeAsymmetryThreshold: 2.0,  // Ratio excedente/déficit para proponer comercio
    maxNAPDurationVsThreat: {     // Duración máxima según amenaza del otro
      low: 25,    // Amenaza < 30
      medium: 15, // Amenaza 30-60
      high: 8     // Amenaza > 60
    }
  }
};
```

---

## 9. PERSISTENCIA Y SERIALIZACIÓN

### 9.1 Savegame (Extensión de `HF.serialize` / `HF.deserialize`)

```javascript
// En engine.js - Añadir a serialización

function serializeDiplomacy(g) {
  return {
    treaties: Array.from(g.treaties.entries()).map(([id, t]) => [id, {
      ...t,
      factions: [...t.factions],
      negotiationLog: t.negotiationLog.map(e => ({...e})),
      // Convertir Maps a arrays
      napTerms: t.napTerms ? {...t.napTerms} : null,
      tradeTerms: t.tradeTerms ? {...t.tradeTerms, routes: t.tradeTerms.routes.map(r => ({...r}))} : null,
      loanTerms: t.loanTerms ? {...t.loanTerms, collateral: t.loanTerms.collateral ? {...t.loanTerms.collateral} : null} : null
    }]),
    nextTreatyId: g.nextTreatyId,
    loanMarket: {
      offers: g.loanMarket.offers.map(o => ({...o})),
      requests: g.loanMarket.requests.map(r => ({...r}))
    },
    diplomacyConfig: {...g.diplomacyConfig}
  };
}

function deserializeDiplomacy(g, data) {
  g.treaties = new Map(data.treaties.map(([id, t]) => [id, {
    ...t,
    factions: new Set(t.factions), // O array, según uso
    negotiationLog: t.negotiationLog || [],
    napTerms: t.napTerms || null,
    tradeTerms: t.tradeTerms || null,
    loanTerms: t.loanTerms || null
  }]));
  g.nextTreatyId = data.nextTreatyId;
  g.loanMarket = data.loanMarket || { offers: [], requests: [] };
  g.diplomacyConfig = data.diplomacyConfig || CFG.DIPLOMACY;
  
  // Restaurar referencias en facciones
  for (const [id, treaty] of g.treaties) {
    for (const fId of treaty.factions) {
      if (g.f[fId]) {
        if (!g.f[fId].treaties.includes(id)) g.f[fId].treaties.push(id);
        if (treaty.type === 'loan_contract') {
          if (treaty.loanTerms.borrower === fId && !g.f[fId].economy.activeLoans.includes(id)) {
            g.f[fId].economy.activeLoans.push(id);
          }
          if (treaty.loanTerms.lender === fId && !g.f[fId].economy.loansGiven.includes(id)) {
            g.f[fId].economy.loansGiven.push(id);
          }
        }
      }
    }
  }
}
```

---

## 10. TESTING Y VALIDACIÓN (Casos de Prueba)

### 10.1 Casos Críticos (Pacto Sagrado)

| ID | Escenario | Resultado Esperado |
|----|-----------|-------------------|
| TC-01 | Atacar con PNA activo (breakPenalty=0) | `canAttack` → `allowed: false`, razón incluye countdown |
| TC-02 | Mover unidad a celda fronteriza bloqueada por PNA | Movimiento denegado, tooltip "Frontera sellada" |
| TC-03 | PNA expira turno N → Turno N+1 atacar permitido | `canAttack` → `allowed: true` en turno N+1 |
| TC-04 | IA mueve tropas a frontera en turnos N-3, N-2, N-1 | Unidades posicionadas para atacar en N+1 |
| TC-05 | Intentar romper PNA via acción diplomática | No existe acción "romper" si breakPenalty=0 |

### 10.2 Casos Economía/Préstamos

| ID | Escenario | Resultado Esperado |
|----|-----------|-------------------|
| TC-10 | Facción con net.gold < 0 paga préstamo | Pago ok, net.gold más negativo, préstamo continúa |
| TC-11 | Facción sin oro → default préstamo | `in_arrears`, embargo 30% ingresos, creditScore -20 |
| TC-12 | Default repetido → DEFAULTED | Embargo total, pérdida ciudad/colateral, casus belli |
| TC-13 | Préstamo pagado completamente → status PAID | Prestamista recibe última cuota, préstamo removido |

### 10.3 Casos Rutas Comerciales

| ID | Escenario | Resultado Esperado |
|----|-----------|-------------------|
| TC-20 | Ruta establecida, unidad enemiga entra en celda | Ruta → INTERDICTED, 50% recurso perdido ese turno |
| TC-21 | Unidad enemiga sale de celda | Ruta → ACTIVE (recuperación automática) |
| TC-22 | Guerra declarada → rutas suspendidas | Todas las rutas entre beligerantes → SUSPENDED |
| TC-23 | Paz firmada → rutas reactivadas | Rutas previas → ACTIVE si path válido |

### 10.4 Casos IA Diplomacia

| ID | Escenario | Resultado Esperado |
|----|-----------|-------------------|
| TC-30 | IA con 3 frentes abiertos | Propone PNA al flanco más débil/dispuesto |
| TC-31 | IA con net.gold < -20 | Solicita préstamo urgente al mercado |
| TC-32 | IA con excedente madera, vecino con excedente oro | Propone acuerdo comercial madera↔oro |
| TC-33 | PNA expira en 2 turnos, amenaza alta | Mueve unidades a posiciones de ataque |

---

## 11. ARCHIVOS A MODIFICAR / CREAR

### 11.1 Nuevos Archivos
- `js/diplomacy.js` — Módulo principal `HF.Diplomacy` (API, FSM, algoritmos)
- `js/diplomacy_ai.js` — Lógica diplomática de IA (fases, evaluaciones)
- `js/diplomacy_ui.js` — Renderizado overlays, panel diplomacia, eventos visuales
- `data/diplomacy_events.json` — Plantillas de flavor text para eventos

### 11.2 Archivos Existentes a Modificar
- `js/config.js` — Añadir `CFG.DIPLOMACY`
- `js/engine.js` — Integrar en `HF.act`, `HF.endTurn`, `startTurn`, `settle`, `serialize`, `deserialize`
- `js/ai.js` — Insertar `aiDiplomacyPhase` y `aiPreExpirationPositioning` en `HF.aiPlay`
- `js/board.js` — Añadir `drawNAPBorderOverlay`, integrar en render loop
- `js/game.js` — Panel diplomacia, tooltips, timeline visual
- `js/data.js` — Estructuras iniciales de facción (economy, diplomacy)
- `index.html` — Cargar nuevos scripts en orden correcto

### 11.3 Orden de Carga (index.html)
```html
<!-- Después de engine.js, antes de ai.js -->
<script src="js/diplomacy.js"></script>
<script src="js/diplomacy_ai.js"></script>
<script src="js/diplomacy_ui.js"></script>
```

---

## 12. MÉTRICAS DE ÉXITO (KPIs)

1. **Tensión Diplomatic:** % de partidas donde jugadores/IA posicionan tropas en últimos 3 turnos de PNA > 70%
2. **Supervivencia Económica:** % de facciones IA que usan préstamos/comercio para evitar quiebra > 50%
3. **Frentes Controlados:** Partidas donde IA mantiene ≤ 2 frentes abiertos simultáneos > 80%
4. **Rupturas Cero:** 0 instancias de ruptura de PNA con `breakPenalty=0` (hard constraint)
5. **Juice Visual:** 100% de tratados muestran countdown, border glow, eventos narrativos
6. **Performance:** `HF.Diplomacy` añade < 5ms/turno en mapas R=18

---

## 13. RIESGOS Y MITIGACIONES

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| IA se ata con PNAs largos y no ataca | Media | Alto | `maxNAPDurationVsThreat` límite dinámico; IA evalúa renovación vs expiración |
| Préstamos triviales (oro fácil) | Alta | Medio | `baseInterestRate=10%` + `creditScore` gate; `maxActiveLoans=3` |
| Rutas comerciales inviables (pathfinding) | Media | Medio | Fallback: rutas directas adyacentes; peso diplomático en pathfinding |
| Serialización rompe savegames antiguos | Baja | Crítico | Versionado en savegame; migración automática en `deserialize` |
| Acoplamiento `diplomacy.js` → `engine.js` | Alta | Medio | Contratos claros (`HF.Diplomacy.*`); engine solo llama hooks definidos |

---

## 14. PRÓXIMOS PASOS (Roadmap)

1. **Fase 1 (Arquitecto):** Revisar y validar esta especificación → `arquitectura_diplomacia.md`
2. **Fase 2 (Programador):** Implementar `diplomacy.js`, `diplomacy_ai.js`, `diplomacy_ui.js`
3. **Fase 3 (Guionista):** Poblar `diplomacy_events.json` con flavor text por facción/tono
4. **Fase 4 (Tester):** Validar casos de prueba TC-01 a TC-33, auditar juice visual
5. **Fase 5 (Despliegue):** Verificar compatibilidad savegames, empaquetar

---

*Fin de la especificación. Pendiente revisión del Arquitecto.*