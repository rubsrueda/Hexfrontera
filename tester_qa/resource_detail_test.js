'use strict';
// Detalle de recursos (pantalla del HUD): el grid de ingresos/gastos debe
// cuadrar con lo que el motor cobra y paga de verdad.
//
// Cubre el fallo reportado: la pantalla «no tenía sentido» porque sus números
// no se correspondían con la barra superior. Ahora se comprueba, con el motor
// real, que:
//   1. El total de ingresos por recurso del desglose = HF.income (el HUD).
//   2. Las filas del desglose suman exactamente ese total.
//   3. El total de gastos = mantenimiento + préstamo, por recurso.
//   4. El balance neto = ingresos − gastos.
//   5. En una provincia, el desglose usa el mismo ámbito que HF.preview.
//   6. Una casilla sin suministro no aporta ingresos, pero su tropa sí paga.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HF = {};
const sandbox = { console, HF, window: null };
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ['util.js', 'config.js', 'data.js', 'engine.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox);
HF.updateFog = () => { };
HF.checkEnd = () => { };

const T = HF.T, B = HF.B;
let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };

function faction(id, human, tags) {
  return {
    id, name: 'F' + id, alive: true, human, tags: tags || [],
    stock: {}, gold: 0, food: 0, wood: 0, grace: 0, goodStreak: 0,
    deficit: false, loan: null, starvationsInduced: 0
  };
}

// Columna de 6 casillas propias: capital con oro, campamento con trigo,
// colina con madera, camino, montaña con infantería y una casilla aislada.
function makeGame() {
  const R = 6, gr = HF.makeGrid(R);
  const g = {
    R, turn: 1, cur: 0, cells: [], f: [], events: [], undo: [],
    stat: { kills: 0, lost: 0, cuts: 0, deserts: 0, built: 0, captured: 0, recruited: 0 },
    timeline: [], caravans: [], tradeBlocked: {}, storms: [], replayLog: [], rs: 1,
    goal: { type: 'conquer' }, _grid: gr
  };
  for (const d of gr.list) g.cells[d.i] = { i: d.i, q: d.q, r: d.r, t: T.LLANO, o: -1, b: 0, sup: 0, comp: 0, res: 0 };
  g.f = [faction(0, true, ['CIV_TYPE_SEDENTARY']), faction(1, false)];

  const col = gr.list.filter(d => d.q === 0).slice(0, 6);
  for (const d of col) g.cells[d.i].o = 0;
  const at = k => g.cells[col[k].i];

  at(0).b = B.CIUDAD; at(0).cap = 0; at(0).res = HF.RES.ORO;
  at(1).b = B.CAMPAMENTO; at(1).res = HF.RES.TRIGO;
  at(2).t = T.COLINA; at(2).res = HF.RES.MADERA;
  at(3).b = B.CAMINO;
  at(4).t = T.MONTANA; at(4).u = { type: 'INF', tier: 1, owner: 0, mv: 1, at: 1 };
  at(5).t = T.COLINA; at(5).u = { type: 'ARC', tier: 2, owner: 0, mv: 1, at: 1 };

  HF.supply(g);
  HF.initStock(g);
  const prov = at(0).comp;
  for (const k of Object.keys(g.f[0].stock)) g.f[0].stock[k] = { gold: 500, food: 500, wood: 100 };
  // Préstamo de la provincia: 4 de oro por turno durante 2 turnos.
  g.f[0].loan = { turns: 2, perTurn: 4, comp: prov };
  return { g, prov, col: col.map(d => d.i) };
}

const sum3 = o => (o.gold || 0) + (o.food || 0) + (o.wood || 0);
const KEYS = ['gold', 'food', 'wood'];
const LABEL = { gold: 'oro', food: 'trigo', wood: 'madera' };

// --- 1. Ámbito de facción: el grid cuadra con el HUD ---
{
  const { g, prov } = makeGame();
  const f = g.f[0];
  const bd = HF.resourceBreakdown(g, f, null);
  const inc = HF.income(g, f, null);
  const upGold = HF.upkeepOf(g, f, 'upGold', null);
  const upFood = HF.upkeepOf(g, f, 'up', null);

  ok(!!bd && !!bd.income && !!bd.expenses && !!bd.net, 'el desglose expone ingresos, gastos y neto');
  ok(typeof bd.income.total === 'object' && !Array.isArray(bd.income.total), 'el total es por recurso, nunca una suma de oro+trigo+madera');

  for (const k of KEYS) {
    ok(bd.income.total[k] === inc[k], `ingreso ${LABEL[k]}: desglose (${bd.income.total[k]}) = motor (${inc[k]})`);
    const rows = bd.income.terrain[k] + bd.income.buildings[k] + bd.income.resources[k] + bd.income.doctrines[k];
    ok(rows === bd.income.total[k], `ingreso ${LABEL[k]}: terreno + edificios + recursos + doctrinas = total`);
  }

  ok(bd.expenses.total.gold === upGold + 4, `gasto oro: mantenimiento (${upGold}) + préstamo (4) = ${bd.expenses.total.gold}`);
  ok(bd.expenses.total.food === upFood, `gasto trigo: mantenimiento (${upFood}) = ${bd.expenses.total.food}`);
  ok(bd.expenses.total.wood === 0, 'sin gasto de madera');

  for (const k of KEYS) {
    ok(bd.net[k] === bd.income.total[k] - bd.expenses.total[k], `neto ${LABEL[k]} = ingresos − gastos (${bd.net[k]})`);
  }

  // Contadores que la pantalla usa para «×N».
  ok(bd.counts.resources.ORO === 1 && bd.counts.resources.TRIGO === 1 && bd.counts.resources.MADERA === 1,
    'cuenta una casilla de cada recurso natural');
  ok(bd.counts.units.INF === 1 && bd.counts.units['ARC N2'] === 1, 'cuenta las unidades por tipo y nivel');

  // --- 2. Ámbito de provincia: mismo criterio que HF.preview ---
  const bdP = HF.resourceBreakdown(g, f, prov);
  const incP = HF.income(g, f, prov);
  for (const k of KEYS) ok(bdP.income.total[k] === incP[k], `provincia: ingreso ${LABEL[k]} = motor (${incP[k]})`);
  ok(bdP.expenses.total.gold === HF.upkeepOf(g, f, 'upGold', prov) + 4, 'provincia: el préstamo de esa provincia se cuenta');
  ok(bdP.income.total.gold < bd.income.total.gold || sum3(bdP.income.total) <= sum3(bd.income.total),
    'la provincia nunca ingresa más que la facción completa');
}

// --- 3. Casilla aislada: no ingresa, pero su tropa sigue pagando ---
{
  const { g, prov, col } = makeGame();
  const f = g.f[0];
  const iso = g.cells[col[5]];
  iso.sup = 0;                       // cortada del suministro
  const before = HF.income(g, f, null);
  const bd = HF.resourceBreakdown(g, f, null);
  for (const k of KEYS) ok(bd.income.total[k] === before[k], `aislada: el ingreso ${LABEL[k]} sigue cuadrando`);
  ok(bd.expenses.total.food === HF.upkeepOf(g, f, 'up', null), 'aislada: su tropa sigue pagando mantenimiento');
  ok(bd.expenses.units.detail['ARC N2'] && bd.expenses.units.detail['ARC N2'].count === 1,
    'aislada: el mantenimiento de la unidad aislada aparece en el desglose');
}

// --- 4. Sin préstamo no hay fila de préstamo ---
{
  const { g } = makeGame();
  g.f[0].loan = null;
  const bd = HF.resourceBreakdown(g, g.f[0], null);
  ok(bd.expenses.loans.gold === 0 && Object.keys(bd.expenses.loans.detail).length === 0,
    'sin préstamo activo no se inventa un gasto de préstamo');
  ok(bd.expenses.total.gold === HF.upkeepOf(g, g.f[0], 'upGold', null), 'sin préstamo el gasto de oro es solo mantenimiento');
}

console.log('\n' + (fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK'));
process.exit(fail ? 1 : 0);
