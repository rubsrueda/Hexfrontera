'use strict';
// Déficit global: una capital secundaria no debe degradar unidades si el
// superávit de las demás provincias puede cubrirla (con comisión). La capital
// principal queda exenta de comisión. Sin superávit, el déficit sí se aplica.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { console, Date, Math, JSON, Promise, setTimeout, clearTimeout, setInterval, clearInterval, navigator: { onLine: false }, localStorage: null };
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ['util.js', 'config.js', 'data.js', 'engine.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox);
const HF = sandbox.HF;
HF.updateFog = () => { };
HF.checkEnd = () => { };
HF.income = () => ({ gold: 0, food: 0, wood: 0 });

const T = HF.T, B = HF.B;
const fee = HF.CFG.deficit.commission;
const gross = n => Math.ceil(n * (1 + fee) + 1);
const pct = Math.round(fee * 100);
let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };

function faction(id, human) {
  return {
    id, name: 'F' + id, alive: true, human, tags: [],
    stock: {}, gold: 0, food: 0, wood: 0, grace: 0, goodStreak: 0,
    deficit: false, loan: null, starvationsInduced: 0
  };
}
function makeGame() {
  const R = 8, gr = HF.makeGrid(R);
  const g = {
    R, turn: 2, cur: 0, cells: [], f: [], events: [], undo: [],
    stat: { kills: 0, lost: 0, cuts: 0, deserts: 0, built: 0, captured: 0, recruited: 0 },
    timeline: [], caravans: [], tradeBlocked: {}, storms: [], replayLog: [], rs: 1,
    goal: { type: 'conquer' }, _grid: gr
  };
  for (const d of gr.list) g.cells[d.i] = { i: d.i, q: d.q, r: d.r, t: T.LLANO, o: -1, b: 0, sup: 0, comp: 0, res: 0 };
  g.f = [faction(0, true), faction(1, false)];
  const A = gr.list.filter(d => d.q === 0).slice(0, 5);
  const Bcol = gr.list.filter(d => d.q === 4).slice(0, 3);
  A.forEach((d, k) => { const c = g.cells[d.i]; c.o = 0; c.sup = 1; if (k === 0) { c.b = B.CIUDAD; c.cap = 1; } });
  Bcol.forEach((d, k) => { const c = g.cells[d.i]; c.o = 0; c.sup = 1; if (k === 0) { c.b = B.CIUDAD; c.cap = 0; } });
  HF.supply(g);
  HF.initStock(g);
  const f = g.f[0];
  const main = g.cells[A[0].i].comp, sec = g.cells[Bcol[0].i].comp;
  f.stock[main] = { gold: 100, food: 100, wood: 0 };
  f.stock[sec] = { gold: 0, food: 0, wood: 0 };
  HF.syncTotals(f);
  // Una INF N1 en la capital secundaria: 1 oro + 1 comida de mantenimiento.
  g.cells[Bcol[0].i].u = { type: 'INF', tier: 1, owner: 0, mv: 1, at: 1 };
  return { g, f, main, sec, unit: Bcol[0].i };
}

console.log('[secundaria con superávit global]');
{
  const { g, f, main, sec, unit } = makeGame();
  HF.startTurn(g, f);
  ok(f.stock[main].gold === 100 - gross(1) && f.stock[main].food === 100 - gross(1), 'la capital paga ' + gross(1) + ' por 1 (1 × ' + (1 + fee) + ' + 1 de comisión)');
  ok(f.stock[sec].gold === 0 && f.stock[sec].food === 0, 'la secundaria paga su mantenimiento y queda a cero');
  ok(g.cells[unit].u && g.cells[unit].u.tier === 1, 'la unidad de la secundaria NO se degrada');
  ok(f.deficit === false, 'no se marca déficit: el superávit global lo cubrió');
  ok(g.events.some(e => /Déficit de oro cubierto/.test(e.txt) && new RegExp('comisión ' + pct + '% \\+ 1').test(e.txt)), 'se registra la cobertura con comisión');
}

console.log('\n[ejemplo 5 oro / 3 comida]');
{
  const { g, f, main, sec, unit } = makeGame();
  const realUp = HF.upkeepOf;
  HF.upkeepOf = (gg, ff, kind, k) => k === sec ? (kind === 'up' ? 3 : 5) : 0;
  f.stock[main] = { gold: 20, food: 20, wood: 0 };
  f.stock[sec] = { gold: 0, food: 0, wood: 0 };
  HF.syncTotals(f);
  g.turn = 5;
  HF.startTurn(g, f);
  HF.upkeepOf = realUp;
  ok(f.stock[main].gold === 20 - gross(5) && f.stock[main].food === 20 - gross(3), '20 de capital − ' + gross(5) + ' de oro y ' + gross(3) + ' de trigo (5×' + (1 + fee) + '+1 y 3×' + (1 + fee) + '+1)');
  ok(f.stock[sec].gold === 0 && f.stock[sec].food === 0, 'la secundaria recibe 5/3 y paga su mantenimiento');
  ok(f.deficit === false, 'el déficit de 5/3 queda cubierto');
}

console.log('\n[no alcanza el coste completo]');
{
  const { g, f, main, sec } = makeGame();
  const realUp = HF.upkeepOf;
  HF.upkeepOf = (gg, ff, kind, k) => k === sec ? (kind === 'up' ? 3 : 5) : 0;
  f.stock[main] = { gold: 6, food: 4, wood: 0 };
  f.stock[sec] = { gold: 0, food: 0, wood: 0 };
  HF.syncTotals(f);
  g.turn = 6;
  g.events = [];
  HF.startTurn(g, f);
  HF.upkeepOf = realUp;
  ok(f.stock[main].gold === 6 && f.stock[main].food === 4, 'si no hay ' + gross(5) + '/' + gross(3) + ', la capital NO pierde nada');
  ok(!g.events.some(e => /Déficit de oro cubierto/.test(e.txt)), 'no se inventa una cobertura parcial');
  ok(f.deficit === true, 'el déficit real se aplica a la provincia');
}

console.log('\n[sin superávit]');
{
  const { g, f, main, sec, unit } = makeGame();
  f.stock[main] = { gold: 0, food: 0, wood: 0 };
  f.stock[sec] = { gold: 0, food: 0, wood: 0 };
  HF.syncTotals(f);
  g.turn = 3;
  HF.startTurn(g, f);
  ok(f.deficit === true, 'sin superávit global sí se aplica el déficit');
  ok(!g.cells[unit].u || g.cells[unit].u.tier < 1, 'la unidad de la secundaria se degrada o desaparece');
  ok(f.gold === 0 && f.food === 0, 'sin recursos no aparecen recursos de la nada');
}

console.log('\n[capital principal no se rescata]');
{
  const { g, f, main, sec, unit } = makeGame();
  // Mover la unidad a la capital principal y dar el superávit a la secundaria.
  g.cells[unit].u = null;
  const mainCell = g.cells.find(c => c && c.cap && c.b === B.CIUDAD);
  mainCell.u = { type: 'INF', tier: 1, owner: 0, mv: 1, at: 1 };
  f.stock[main] = { gold: 0, food: 0, wood: 0 };
  f.stock[sec] = { gold: 100, food: 100, wood: 0 };
  HF.syncTotals(f);
  g.turn = 4;
  HF.startTurn(g, f);
  ok(f.stock[sec].gold === 100 && f.stock[sec].food === 100, 'la secundaria NO paga el déficit de la principal');
  ok(!mainCell.u || mainCell.u.tier < 1, 'sin recursos, la unidad de la principal se degrada o desaparece');
  ok(f.deficit === true, 'la principal marca déficit');
  ok(!g.events.some(e => /Déficit de oro cubierto/.test(e.txt)), 'no se cubre la principal con el superávit global');
}

console.log('\n[capital principal sin recursos]');
{
  const { g, f, main, sec } = makeGame();
  // Mover la unidad a la capital y dejar todo a cero.
  const unitCell = g.cells.find(c => c && c.u && c.u.owner === 0);
  if (unitCell) unitCell.u = null;
  const mainCell = g.cells.find(c => c && c.cap && c.b === B.CIUDAD);
  mainCell.u = { type: 'INF', tier: 1, owner: 0, mv: 1, at: 1 };
  f.stock[main] = { gold: 0, food: 0, wood: 0 };
  f.stock[sec] = { gold: 0, food: 0, wood: 0 };
  HF.syncTotals(f);
  g.turn = 7;
  HF.startTurn(g, f);
  ok(!mainCell.u, 'sin recursos la unidad de la capital desaparece (no sobrevive)');
  ok(f.deficit === true, 'la capital sin recursos marca déficit');
  ok(f.gold === 0 && f.food === 0, 'no se crean recursos para pagar');
}

console.log('\n[unidad sin provincia]');
{
  const { g, f } = makeGame();
  for (const c of g.cells) if (c && c.o === 0) { c.o = -1; c.b = 0; c.cap = 0; c.sup = 0; c.comp = -1; c.u = null; }
  f.stock = {};
  HF.syncTotals(f);
  const neutral = g.cells.find(c => c && c.o === -1 && !c.u);
  neutral.u = { type: 'INF', tier: 1, owner: 0, mv: 1, at: 1 };
  g.turn = 8;
  HF.startTurn(g, f);
  ok(!neutral.u, 'sin provincia y sin recursos, la unidad también deserta');
  ok(f.deficit === true, 'la unidad sin provincia marca déficit');
}

console.log('\n[unidad con comp fuera de provincias]');
{
  const { g, f } = makeGame();
  f.stock = {};
  HF.syncTotals(f);
  const cell = g.cells.find(c => c && c.u && c.u.owner === 0);
  const realSupply = HF.supply, realProv = HF.provinces;
  HF.supply = () => { };
  HF.provinces = () => [];
  g.turn = 9;
  HF.startTurn(g, f);
  HF.supply = realSupply;
  HF.provinces = realProv;
  ok(!cell.u, 'sin provincia en la lista, la unidad también se cobra y deserta');
  ok(f.deficit === true, 'la unidad fuera de la lista marca déficit');
}

console.log('\n[las doctrinas ya no bloquean la deserción]');
for (const tag of ['ZEALOT_MARTYRDOM', 'INTEGRATION_PRESERVE']) {
  const { g, f, main, sec, unit } = makeGame();
  f.tags = [tag];
  f.stock = {}; f.stock[main] = { gold: 7, food: 0, wood: 0 }; f.stock[sec] = { gold: 7, food: 0, wood: 0 };
  HF.syncTotals(f);
  g.turn = 10;
  HF.startTurn(g, f);
  ok(f.deficit === true, tag + ' marca déficit');
  ok(!g.cells[unit].u, tag + ' ya no impide que la unidad desearte');
  ok(!g.events.some(e => /martirio|Integración/.test(e.txt)), tag + ' no muestra avisos de doctrina');
}

console.log('\n[consumo secuencial 2 N3 + 2 N2]');
{
  const { g, f, main, sec } = makeGame();
  g.cells[sec] && (g.cells[sec].u = null);
  for (const c of g.cells) if (c && c.u) c.u = null;
  const cells = g.cells.filter(c => c && c.o === 0 && c.cap);
  // 2 N3 + 2 N2 en la capital, comida 0 e ingreso 8.
  const own = g.cells.filter(c => c && c.o === 0 && c.comp === main).slice(0, 4);
  own[0].u = { type: 'INF', tier: 3, owner: 0, mv: 1, at: 1 };
  own[1].u = { type: 'INF', tier: 3, owner: 0, mv: 1, at: 1 };
  own[2].u = { type: 'INF', tier: 2, owner: 0, mv: 1, at: 1 };
  own[3].u = { type: 'INF', tier: 2, owner: 0, mv: 1, at: 1 };
  f.stock[main] = { gold: 100, food: 0, wood: 0 };
  f.stock[sec] = { gold: 0, food: 0, wood: 0 };
  HF.syncTotals(f);
  const realInc = HF.income;
  HF.income = (gg, ff, k) => k === main ? { gold: 0, food: 8, wood: 0 } : { gold: 0, food: 0, wood: 0 };
  g.turn = 12;
  HF.startTurn(g, f);
  HF.income = realInc;
  const tiers = own.map(c => c.u ? 'N' + c.u.tier : '—').join(',');
  ok(tiers === 'N3,N2,N1,N1', '2 N3 + 2 N2 con 8 comida: N3 paga, la otra N3→N2, las N2→N1 (' + tiers + ')');
  ok(f.stock[main].food === 0, 'la comida queda en 0');
  ok(f.deficit === true, 'marca déficit');
}

console.log('\n' + (fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK'));
process.exit(fail ? 1 : 0);
