'use strict';
// Mantenimiento real por nivel (js/config.js → units.*.up / upGold).
//
// Cubre el fallo reportado: el consumo de una unidad debía reflejarse al
// crearla y, sobre todo, al FUSIONARLA. Se comprueba con el motor real:
//   1. La tabla configurada (INF: comida 1/3/7 · oro 1/2/5).
//   2. El HUD (HF.preview) cambia en el acto al fusionar.
//   3. El cierre de turno (settle vía startTurn) descuenta exactamente
//      ingreso − mantenimiento del nivel resultante.
//   4. Toda unidad propia paga, aunque esté fuera del territorio (antes el HUD
//      la sumaba y settle() no la cobraba a ninguna provincia).
//   5. La doctrina ASCETIC_COMMUNE sigue reduciendo −1 la comida de INF/ENG.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HF = {};
const sandbox = { console, HF, window: null };
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ['util.js', 'config.js', 'data.js', 'engine.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox);
// El tablero no existe en la prueba: se neutralizan los ganchos de presentación.
HF.updateFog = () => {};
HF.checkEnd = () => {};

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

// Territorio mínimo: una columna de 5 casillas propias con ciudad capital.
function makeGame(tags) {
  const R = 6, gr = HF.makeGrid(R);
  const g = {
    R, turn: 1, cur: 0, cells: [], f: [], events: [], undo: [],
    stat: { kills: 0, lost: 0, cuts: 0, deserts: 0, built: 0, captured: 0, recruited: 0 },
    timeline: [], caravans: [], tradeBlocked: {}, storms: [], replayLog: [], rs: 1,
    goal: { type: 'conquer' }, _grid: gr
  };
  for (const d of gr.list) g.cells[d.i] = { i: d.i, q: d.q, r: d.r, t: T.LLANO, o: -1, b: 0, sup: 0, comp: 0, res: 0 };
  g.f = [faction(0, true, tags), faction(1, false)];
  const col = gr.list.filter(d => d.q === 0).slice(0, 5);
  col.forEach((d, k) => {
    const c = g.cells[d.i];
    c.o = 0; c.sup = 1; if (k === 0) { c.b = B.CIUDAD; c.cap = 0; }
  });
  HF.supply(g);
  HF.initStock(g);
  const prov = g.cells[col[0].i].comp;
  for (const k of Object.keys(g.f[0].stock)) g.f[0].stock[k] = { gold: 500, food: 500, wood: 100 };
  return { g, prov, cells: col.map(d => d.i), gr };
}

const preview = (g, f) => HF.preview(g, f, null);

// --- 1. La tabla de configuración es la que se documenta ---
ok(HF.UNITS.INF.up.join(',') === '1,3,7', 'INF comida por nivel = 1/3/7');
ok(HF.UNITS.INF.upGold.join(',') === '1,2,5', 'INF oro por nivel = 1/2/5');

// --- 2. Dos N1 → N2: el consumo cambia al fusionar, no al cerrar el turno ---
{
  const { g, cells, prov } = makeGame();
  const [a, b, c] = cells.slice(1);
  g.cells[a].u = { type: 'INF', tier: 1, owner: 0, mv: 1, at: 1 };
  g.cells[b].u = { type: 'INF', tier: 1, owner: 0, mv: 1, at: 1 };
  let pv = preview(g, g.f[0]);
  ok(pv.upkeep === 2 && pv.upkeepGold === 2, `2×INF N1 cuestan 2 comida y 2 oro (${pv.upkeep}/${pv.upkeepGold})`);

  ok(HF.options(g, a).get(b) && HF.options(g, a).get(b).k === 'fuse', 'la fusión N1+N1 está disponible');
  const r = HF.act(g, a, b);
  ok(r.ok && g.cells[b].u.tier === 2, 'la fusión crea una INF N2');
  ok(!g.cells[a].u, 'la unidad de origen desaparece');
  ok(g.events.some(e => e.i === b && /paga 3 comida y 2 oro\/turno/.test(e.txt)),
    'el aviso de fusión anuncia el mantenimiento nuevo (3 comida / 2 oro)');
  ok(g.events.some(e => e.i === b && /el ejército paga \+1 comida/.test(e.txt)),
    'el aviso dice cuánto sube el consumo TOTAL del ejército (+1 comida)');

  pv = preview(g, g.f[0]);
  ok(pv.upkeep === 3, `tras fusionar, el HUD pasa a 3 de comida (${pv.upkeep})`);
  ok(pv.upkeepGold === 2, `tras fusionar, el HUD queda en 2 de oro (${pv.upkeepGold})`);
  ok(HF.upkeepOf(g, g.f[0], 'up', prov) === 3, 'la provincia también cuenta 3 de comida');
  ok(HF.upkeepOf(g, g.f[0], 'upGold', prov) === 2, 'la provincia también cuenta 2 de oro');

  // --- 3. Cobro real al empezar el turno ---
  const f = g.f[0], inc = HF.income(g, f, prov), before = Object.assign({}, f.stock[prov]);
  g.turn = 2;
  HF.startTurn(g, f);
  const after = f.stock[prov];
  ok(after.food === before.food + inc.food - 3,
    `se descuentan 3 de comida (${before.food} + ${inc.food} → ${after.food})`);
  ok(after.gold === before.gold + inc.gold - 2,
    `se descuentan 2 de oro (${before.gold} + ${inc.gold} → ${after.gold})`);

  // --- 4. N2 + N1 → N3 ---
  g.cells[c].u = { type: 'INF', tier: 1, owner: 0, mv: 1, at: 1 };
  ok(HF.options(g, c).get(b) && HF.options(g, c).get(b).k === 'fuse', 'la fusión N1+N2 está disponible');
  const r2 = HF.act(g, c, b);
  ok(r2.ok && g.cells[b].u.tier === 3, 'la fusión crea una INF N3');
  pv = preview(g, g.f[0]);
  ok(pv.upkeep === 7 && pv.upkeepGold === 5, `N3 cuesta 7 comida y 5 oro (${pv.upkeep}/${pv.upkeepGold})`);
}

// --- 5. Una unidad propia fuera del territorio también paga ---
{
  const { g, prov, gr } = makeGame();
  const col = gr.list.filter(d => d.q === 0).slice(0, 3);
  g.cells[col[1].i].u = { type: 'INF', tier: 1, owner: 0, mv: 1, at: 1 };
  // tropa "perdida" en tierra neutral (p. ej. reliquia recuperada)
  const stray = gr.list.find(d => d.q === 4 && d.r === 0);
  g.cells[stray.i].u = { type: 'INF', tier: 1, owner: 0, mv: 1, at: 1 };
  HF.supply(g);

  const pv = preview(g, g.f[0]);
  ok(pv.upkeep === 2 && pv.upkeepGold === 2, `el HUD suma las dos unidades (${pv.upkeep}/${pv.upkeepGold})`);
  ok(HF.upkeepOf(g, g.f[0], 'up', prov) === 2, 'la provincia asume también la unidad perdida (comida)');
  ok(HF.upkeepOf(g, g.f[0], 'upGold', prov) === 2, 'la provincia asume también la unidad perdida (oro)');

  const f = g.f[0], inc = HF.income(g, f, prov), before = Object.assign({}, f.stock[prov]);
  g.turn = 2;
  HF.startTurn(g, f);
  ok(f.stock[prov].food === before.food + inc.food - 2, 'se cobran las 2 comidas, no 1');
  ok(f.stock[prov].gold === before.gold + inc.gold - 2, 'se cobran los 2 oros, no 1');
}

// --- 6. ASCETIC_COMMUNE: −1 comida por unidad (nunca por debajo de 1) ---
{
  const { g, cells } = makeGame(['ASCETIC_COMMUNE']);
  const [a, b] = cells.slice(1);
  g.cells[a].u = { type: 'INF', tier: 1, owner: 0, mv: 1, at: 1 };
  g.cells[b].u = { type: 'INF', tier: 1, owner: 0, mv: 1, at: 1 };
  HF.act(g, a, b);
  const pv = preview(g, g.f[0]);
  ok(g.cells[b].u.tier === 2 && pv.upkeep === 2 && pv.upkeepGold === 2,
    `con ASCETIC, INF N2 paga 2 comida (−1) y 2 oro (${pv.upkeep}/${pv.upkeepGold})`);
  // 2×N1 = 2×1 = 2 y N2 = 3−1 = 2: el total no cambia. El aviso debe decir la
  // verdad (2/2 y «no paga más»), no el 3/2 de la tabla cruda.
  ok(g.events.some(e => /paga 2 comida y 2 oro\/turno/.test(e.txt) && /no paga más que antes/.test(e.txt)),
    'con ASCETIC el aviso refleja el coste real y que el total no sube');
}

if (fail) { console.error(`\n${fail} comprobaciones CON FALLOS`); process.exit(1); }
console.log('\nMantenimiento por nivel: todo OK');
