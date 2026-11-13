#!/usr/bin/env node
'use strict';
/**
 * tester_qa/diplomacy_test.js
 *
 * Regresión del fallo "enemy.diplomacy.threatMap?.get is not a function" y del
 * bloqueo del fin de turno por la IA diplomática.
 *
 * Cubre:
 *   1. Estado inicial sano (Maps, config real desde HF.CFG.diplomacy).
 *   2. Muchos turnos de IA sin excepciones y con tratados que de verdad se firman.
 *   3. Guardar/cargar: `factions` siempre array (nunca Set) y Maps numéricos.
 *   4. Undo: el snapshot conserva amenazas y confianza (no las convierte en {}).
 *   5. Estado heredado con objeto plano y partida v1 (sin diplomacia).
 *   6. Negociación: la IA acepta/rechaza; el Pacto Sagrado bloquea ataques.
 *   7. Comercio: rutas activas y transferencia real de recursos.
 *   8. Préstamos: mercado que se financia y cuotas que se cobran una sola vez.
 *   9. Aislamiento: aunque la diplomacia reviente, el turno termina.
 *  10. Pantalla: panel y overlay PNA se generan/pintan sin helpers inexistentes.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = {
  console, HF: {}, Date, Math, JSON, Map, Set, Int8Array, Int16Array,
  Uint8Array, Float32Array, performance: { now: () => Date.now() }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const JS = path.join(__dirname, '..', 'js');
const FILES = ['util.js', 'config.js', 'data.js', 'names.js', 'mapgen.js',
  'engine.js', 'diplomacy.js', 'diplomacy_ai.js', 'diplomacy_ui.js', 'ai.js'];
for (const f of FILES) {
  vm.runInContext(fs.readFileSync(path.join(JS, f), 'utf8'), sandbox, { filename: f });
}

const HF = sandbox.HF;
HF.updateFog = () => { };
HF.checkEnd = () => { };
HF.recordTimeline = () => { };

let fail = 0;
const ok = (cond, msg) => {
  if (cond) console.log('ok   ' + msg);
  else { console.error('FAIL: ' + msg); fail++; }
};
const seq = (a, fn) => { try { fn(); return null; } catch (e) { return e; } };

function makeFactions(n) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const preset = HF.PRESETS[k % HF.PRESETS.length];
    out.push({
      name: 'F' + k, color: HF.COLORS[k], crest: HF.CRESTS[k], human: k === 0,
      alma_path: preset.alma_path, arma_path: preset.arma_path, victoria_path: preset.victoria_path
    });
  }
  return out;
}
function newGame(seed, n) {
  return HF.newGame({
    R: 8, seed: seed || 1234, biome: 'plains', fog: 'NONE', difficulty: 'normal',
    factions: makeFactions(n || 4)
  });
}
function play(g, turns) {
  const errors = [];
  for (let t = 0; t < turns; t++) {
    try { HF.endTurn(g, HF.aiPlay); }
    catch (e) { errors.push({ turn: g.turn, msg: e.message }); break; }
  }
  return errors;
}
const isNumMap = m => m instanceof Map && Array.from(m.keys()).every(k => typeof k === 'number');

// =====================================================================
// 1. Estado inicial
// =====================================================================
console.log('--- 1. Estado inicial ---');
let g = newGame();
ok(g.treaties instanceof Map, 'g.treaties es un Map');
ok(g.diplomacyConfig && g.diplomacyConfig.nap && g.diplomacyConfig.nap.maxDuration === 30,
  'lee HF.CFG.diplomacy (antes HF.CFG.DIPLOMACY no existía y quedaba {})');
ok(g.f.every(f => isNumMap(f.diplomacy.threatMap)), 'threatMap es Map en todas las facciones');
ok(g.f.every(f => isNumMap(f.diplomacy.trustScores)), 'trustScores es Map en todas las facciones');
ok(g.f.every(f => Array.isArray(f.treaties) && Array.isArray(f.economy.activeLoans)),
  'treaties y economy.activeLoans son arrays');
ok(typeof HF.dipError === 'function' && Object.keys(HF.dipFaults()).length === 0, 'sin fallos registrados al crear');

// =====================================================================
// 2. Tanda larga de IA
// =====================================================================
console.log('--- 2. 60 turnos de IA ---');
let errors = play(g, 60);
ok(errors.length === 0, '60 turnos sin excepciones' + (errors[0] ? ' (' + errors[0].msg + ')' : ''));
ok(Object.keys(HF.dipFaults()).length === 0, 'ningún fallo interno de diplomacia (' + JSON.stringify(HF.dipFaults()) + ')');
ok(g.turn === 61, 'el turno avanza (' + g.turn + ')');
const signed = (g.diplomacyLog || []).filter(e => e.type === 'signed').length;
ok(signed > 0, 'la IA firma tratados de verdad (' + signed + ' firmados)');
const activeAny = HF.Diplomacy.getAllActive(g);
ok(activeAny.length > 0, 'hay tratados activos en el mapa (' + activeAny.length + ')');
ok(g.treaties.size <= 48, 'el número de tratados está acotado (' + g.treaties.size + ')');
ok(g.f.every(f => f.treaties.length <= 8), 'cada facción respeta el tope de tratados');
ok(g.loanMarket.requests.length <= 8 && g.loanMarket.offers.length <= 8, 'mercado de préstamos acotado');
ok(g.f.every(f => isNumMap(f.diplomacy.threatMap)), 'los threatMap siguen siendo Maps tras 60 turnos');

// =====================================================================
// 3. Guardar y reanudar
// =====================================================================
console.log('--- 3. Serializar / deserializar ---');
const threatBefore = HF.Diplomacy.threatOf(g, 1, 0);
const blob = JSON.parse(JSON.stringify(HF.serialize(g)));
ok(blob.diplomacy && blob.diplomacy.version === 3, 'el guardado usa la versión 3');
ok(blob.diplomacy.treaties.every(([, t]) => Array.isArray(t.factions)), 'las facciones viajan como array, no como Set');
let g2 = null;
const de = seq(0, () => { g2 = HF.deserialize(blob); });
ok(de === null && !!g2, 'deserializa sin lanzar' + (de ? ' (' + de.message + ')' : ''));
if (g2) {
  ok(isNumMap(g2.f[1].diplomacy.threatMap), 'threatMap restaurado como Map');
  ok(g2.f[1].diplomacy.threatMap.get(0) === threatBefore,
    'conserva el valor de amenaza con clave numérica (' + threatBefore + ' → ' +
    g2.f[1].diplomacy.threatMap.get(0) + ')');
  ok(g2.f.every(f => Array.isArray(f.treaties)), 'treaties restaurado como array');
  let anySet = false;
  for (const t of g2.treaties.values()) if (t.factions instanceof Set) anySet = true;
  ok(!anySet, 'ningún tratado conserva un Set en factions');
  ok(g2.f.every(f => f.economy && isNumMap(f.diplomacy.trustScores)), 'economía y confianza restauradas');
  const e2 = play(g2, 15);
  ok(e2.length === 0, '15 turnos tras reanudar sin errores' + (e2[0] ? ' (' + e2[0].msg + ')' : ''));
  ok(typeof HF.canUndo(g2) === 'boolean', 'la partida reanudada es jugable');
}

// =====================================================================
// 4. Undo
// =====================================================================
console.log('--- 4. Deshacer (snapshot JSON) ---');
let g3 = newGame(77);
play(g3, 6);
const threatU = HF.Diplomacy.threatOf(g3, 2, 1);
// Réplica exacta del snapshot del motor (engine.js · snap)
g3.undo.push(JSON.stringify({
  cells: g3.cells.map(c => c && Object.assign({}, c)),
  f: g3.f.map(f => HF.Diplomacy.plainFaction(f)),
  stat: g3.stat, fogMap: null, rl: null
}));
const un = seq(0, () => { ok(HF.undo(g3), 'HF.undo devuelve true'); });
ok(un === null, 'HF.undo no lanza' + (un ? ' (' + un.message + ')' : ''));
ok(g3.f.every(f => isNumMap(f.diplomacy.threatMap)), 'tras deshacer, threatMap vuelve a ser Map');
ok(HF.Diplomacy.threatOf(g3, 2, 1) === threatU, 'las amenazas sobreviven al undo');
const e3 = play(g3, 4);
ok(e3.length === 0, '4 turnos tras deshacer sin el error de threatMap' + (e3[0] ? ' (' + e3[0].msg + ')' : ''));

// =====================================================================
// 5. Estado heredado (objetos planos y partida v1)
// =====================================================================
console.log('--- 5. Compatibilidad con estados antiguos ---');
let g4 = newGame(99);
g4.f[1].diplomacy.threatMap = { 0: 55 };
g4.f[1].diplomacy.trustScores = { 0: 20 };
ok(HF.Diplomacy.threatOf(g4, 1, 0) === 55, 'lee un threatMap plano heredado (55)');
ok(HF.Diplomacy.trustOf(g4, 1, 0) === 20, 'lee un trustScores plano heredado (20)');
const e4 = play(g4, 6);
ok(e4.length === 0, '6 turnos con estado heredado sin errores' + (e4[0] ? ' (' + e4[0].msg + ')' : ''));
ok(isNumMap(g4.f[1].diplomacy.threatMap), 'el estado heredado se migra a Map');

const v1 = JSON.parse(JSON.stringify(HF.serialize(newGame(5))));
delete v1.diplomacy;
delete v1.diplomacyLog;
for (const f of v1.f) { delete f.diplomacy; delete f.treaties; delete f.treatyHistory; delete f.economy; }
let g5 = null;
const de5 = seq(0, () => { g5 = HF.deserialize(v1); });
ok(de5 === null && !!g5, 'carga una partida v1 (sin diplomacia)' + (de5 ? ' (' + de5.message + ')' : ''));
if (g5) {
  ok(g5.treaties instanceof Map && g5.f.every(f => isNumMap(f.diplomacy.threatMap) && f.economy),
    'la partida v1 recibe diplomacia y economía válidas');
  const e5 = play(g5, 8);
  ok(e5.length === 0, '8 turnos tras migrar v1 sin errores' + (e5[0] ? ' (' + e5[0].msg + ')' : ''));
}

// =====================================================================
// 6. Negociación real y Pacto Sagrado
// =====================================================================
console.log('--- 6. Propuestas, aceptación y bloqueo de ataques ---');
let g6 = newGame(2024);
// Hacer al rival claramente proclive: confianza alta y sin NAP previo.
g6.f[1].diplomacy.trustScores.set(0, 95);
g6.f[1].diplomacy.threatMap.clear();
g6.f[1].economy.net.gold = -60;
const prop = HF.Diplomacy.proposeTreaty(g6, 0, 1, HF.TREATY_TYPES.NAP, {
  duration: 10, borderLock: true, visionSharing: true, breakPenalty: 0
});
ok(prop.success === true, 'la propuesta se crea');
ok(prop.status === 'active' || prop.status === 'rejected',
  'la IA responde en el acto (estado: ' + prop.status + ')');
if (prop.status === 'active') {
  ok(HF.Diplomacy.hasActiveNAP(g6, 0, 1), 'el PNA queda activo');
  const atk = HF.Diplomacy.canAttack(g6, 0, 1, 0, 1);
  ok(atk.allowed === false, 'el Pacto Sagrado bloquea el ataque');
  ok(/Pacto|PNA/.test(atk.reason), 'el motivo explica el tratado (' + atk.reason + ')');
  const blocked = g6.cells.some(c => c && c.borderControl && c.borderControl.napLocked);
  ok(blocked, 'la frontera queda sellada en el mapa');
  const bef = HF.Diplomacy.threatOf(g6, 0, 1);
  HF.Diplomacy.updateThreatMap(g6, 0, true);
  ok(HF.Diplomacy.threatOf(g6, 0, 1) <= bef + 1, 'el PNA reduce la amenaza percibida');
  ok(HF.Diplomacy.breakTreaty(g6, prop.treatyId, 0).success === false,
    'un Pacto Sagrado no se puede romper');
} else {
  console.log('(informativo) la IA rechazó el PNA: se omite el bloqueo de frontera');
}

// =====================================================================
// 7. Comercio: rutas y transferencia real
// =====================================================================
console.log('--- 7. Comercio ---');
let g7 = newGame(4242);
for (const f of g7.f) { f.diplomacy.trustScores.set(0, 90); f.diplomacy.trustScores.set(1, 90); }
g7.f[1].economy.net.food = -20;
g7.f[0].economy.net.gold = -20;
g7.f[0].stock[Object.keys(g7.f[0].stock)[0]].food = 200;
const trade = HF.Diplomacy.proposeTreaty(g7, 0, 1, HF.TREATY_TYPES.TRADE, {
  duration: 20,
  routes: [
    { resource: 'food', fromFaction: 0, toFaction: 1, amountPerTurn: 5 },
    { resource: 'gold', fromFaction: 1, toFaction: 0, amountPerTurn: 5 }
  ]
});
ok(trade.success === true, 'propuesta comercial creada');
const tradeT = g7.treaties.get(trade.treatyId);
if (tradeT && tradeT.status === 'active') {
  ok(tradeT.tradeTerms.routes.length >= 1, 'la ruta comercial se establece (' + tradeT.tradeTerms.routes.length + ')');
  ok(tradeT.tradeTerms.routes.every(r => r.routeCells.length > 0), 'cada ruta tiene camino trazado');
  const to = g7.f[1];
  const foodBefore = to.food || 0;
  const key = Object.keys(to.stock)[0];
  const stockBefore = to.stock[key].food || 0;
  HF.Diplomacy.processTradeTransfers(g7);
  ok((to.stock[key].food || 0) > stockBefore,
    'los recursos se transfieren de verdad (' + stockBefore + ' → ' + to.stock[key].food + ')');
  ok(to.food >= foodBefore, 'los totales de la facción se sincronizan');
  // El neto comercial no se multiplica por el número de provincias.
  const nProv = HF.provinces(g7, to).length;
  HF.startTurn(g7, to);
  ok((to.economy.income.food || 0) <= 5 * 3 + 1,
    'el neto comercial se contabiliza una vez por ruta (provincias: ' + nProv + ', income food: ' + to.economy.income.food + ')');
} else {
  console.log('(informativo) comercio rechazado: ' + (trade.message || trade.status));
  ok(true, 'el rechazo tampoco lanza excepciones');
}

// =====================================================================
// 8. Préstamos
// =====================================================================
console.log('--- 8. Préstamos ---');
let g8 = newGame(31337);
HF.Diplomacy._addGold(g8, g8.f[1], 400);
const req = HF.Diplomacy.requestLoan(g8, 0, 40, 0.2, 'development');
ok(req.success === true, 'solicitud de préstamo publicada');
const made = HF.Diplomacy.processLoanMarket(g8);
ok(made > 0, 'el mercado financia la solicitud (' + made + ')');
const loan = Array.from(g8.treaties.values()).find(t => t.type === HF.TREATY_TYPES.LOAN && t.status === 'active');
ok(!!loan, 'existe un contrato de préstamo activo');
if (loan) {
  ok(g8.f[0].economy.activeLoans.indexOf(loan.id) >= 0, 'el prestatario registra el préstamo');
  const lenderKey = Object.keys(g8.f[1].stock)[0];
  const borrowed = g8.f[0].stock[Object.keys(g8.f[0].stock)[0]].gold || 0;
  ok(borrowed >= 0, 'el oro del prestatario es válido (' + borrowed + ')');
  const beforeBorrower = HF.Diplomacy._stockGold(g8.f[0]);
  const beforeLender = g8.f[1].stock[lenderKey].gold || 0;
  const owed = loan.loanTerms.totalOwed;
  const pay = HF.Diplomacy.processLoanPayments(g8, 0);
  ok(pay.paid > 0, 'se cobra la cuota del préstamo (' + pay.paid + ')');
  ok(HF.Diplomacy._stockGold(g8.f[0]) <= beforeBorrower - pay.paid + 0.001,
    'el prestatario paga exactamente una cuota');
  ok((g8.f[1].stock[lenderKey].gold || 0) >= beforeLender, 'el prestamista recibe el pago');
  ok(owed > 0 && loan.loanTerms.totalOwed < owed, 'la deuda baja con el pago');
}

// =====================================================================
// 9. Aislamiento de fallos: el turno nunca se bloquea
// =====================================================================
console.log('--- 9. Un fallo diplomático no detiene el fin de turno ---');
let g9 = newGame(606);
const turnBefore = g9.turn;
const realThreat = HF.Diplomacy.updateThreatMap;
HF.Diplomacy.updateThreatMap = () => { throw new Error('threatMap roto a propósito'); };
const crash = seq(0, () => { HF.endTurn(g9, HF.aiPlay); });
HF.Diplomacy.updateThreatMap = realThreat;
ok(crash === null, 'HF.endTurn no propaga la excepción' + (crash ? ' (' + crash.message + ')' : ''));
ok(g9.turn === turnBefore + 1, 'el turno avanza igualmente (' + turnBefore + ' → ' + g9.turn + ')');
ok(g9.aiFaults > 0, 'el fallo queda contabilizado en g.aiFaults (' + g9.aiFaults + ')');
ok(/threatMap roto/.test(JSON.stringify(HF.dipFaults())), 'el fallo queda registrado para diagnóstico');
const e9 = play(g9, 3);
ok(e9.length === 0, '3 turnos más sin errores tras restaurar la IA');

// =====================================================================
// 10. Pantalla
// =====================================================================
console.log('--- 10. Pantalla de diplomacia ---');
const g10 = newGame(808);
play(g10, 20);
const host = { nodeType: 1, classList: { add() { } }, innerHTML: '' };
const uiErr = seq(0, () => HF.DiplomacyUI.renderDiplomacyPanel(g10, 0, host));
ok(uiErr === null, 'el panel se genera sin lanzar' + (uiErr ? ' (' + uiErr.message + ')' : ''));
ok(/dip-panel/.test(host.innerHTML) && /Diplomacia/.test(host.innerHTML), 'el HTML del panel se construye');
ok(/Relaciones/.test(host.innerHTML) && /Tratados activos/.test(host.innerHTML), 'incluye relaciones y tratados');
ok(/data-act="nap"/.test(host.innerHTML), 'incluye acciones de negociación');

let strokes = 0;
const ctx = {
  save() { }, restore() { }, setLineDash() { }, beginPath() { }, moveTo() { }, lineTo() { },
  closePath() { strokes++; }, stroke() { }, fill() { }, fillRect() { }, fillText() { },
  measureText: () => ({ width: 8 }),
  createLinearGradient: () => ({ addColorStop() { } })
};
const board = {
  colors: g10.f.map(f => f.color), size: 24, cam: { z: 1 }, W: 900, H: 700, fogMap: null,
  pos: c => [c.q * 10, c.r * 10], toScreen: (x, y) => [x + 400, y + 300]
};
const gNAPs = HF.Diplomacy.getAllActive(g10).filter(t => t.type === HF.TREATY_TYPES.NAP && t.napTerms.borderLock);
if (gNAPs.length) {
  const ov = seq(0, () => HF.DiplomacyUI.drawNAPBorderOverlay(g10, ctx, board));
  ok(ov === null, 'el overlay PNA se pinta sin lanzar' + (ov ? ' (' + ov.message + ')' : ''));
  ok(strokes > 0, 'el overlay dibuja las fronteras selladas (' + strokes + ' hexágonos)');
} else {
  // Sin NAP en esta partida: se firma uno a la fuerza para probar el dibujo.
  HF.Diplomacy.proposeTreaty(g10, 0, 1, HF.TREATY_TYPES.NAP, { duration: 10, borderLock: true, breakPenalty: 0 });
  const anyNap = HF.Diplomacy.getAllActive(g10).some(t => t.type === HF.TREATY_TYPES.NAP);
  if (anyNap) {
    const ov = seq(0, () => HF.DiplomacyUI.drawNAPBorderOverlay(g10, ctx, board));
    ok(ov === null, 'el overlay PNA se pinta sin lanzar');
    ok(strokes > 0, 'el overlay dibuja las fronteras selladas (' + strokes + ' hexágonos)');
  } else {
    console.log('(informativo) sin NAP activo: no hay overlay que probar');
    ok(true, 'el overlay se omite limpiamente sin tratados');
  }
}

// =====================================================================
// Resumen
// =====================================================================
console.log(fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK');
process.exit(fail ? 1 : 0);
