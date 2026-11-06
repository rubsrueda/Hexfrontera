'use strict';
// Prueba del comercio físico: rutas por dominio, caravana que avanza 4
// casillas/turno, devengo y entrega de oro, y saqueo por caballería.
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

let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };
const T = HF.T, B = HF.B;

function makeGame() {
  const R = 6, gr = HF.makeGrid(R);
  const g = {
    R, turn: 1, cur: 0, cells: [], f: [], _trade: null, caravans: [], tradeBlocked: {}, events: [],
    undo: [], stat: { kills: 0, lost: 0 }, timeline: [], fogMap: new Int8Array(gr.list.length)
  };
  g.f = [
    { id: 0, alive: true, human: true, stock: { 0: { gold: 0, food: 0, wood: 0 } }, gold: 0, food: 0, wood: 0, tags: [] },
    { id: 1, alive: true, human: false, stock: { 0: { gold: 0, food: 0, wood: 0 } }, gold: 0, food: 0, wood: 0, tags: [] }
  ];
  for (const d of gr.list) g.cells[d.i] = { i: d.i, q: d.q, r: d.r, t: T.LLANO, o: -1, b: 0, sup: 0, comp: 0, res: 0 };
  g._grid = HF.makeGrid(R);
  return g;
}
const at = (g, q, r) => g.cells[g._grid.idx(q, r)];

function roadLine(g, q0, r0, r1) {
  for (let r = r0; r <= r1; r++) {
    const c = at(g, q0, r);
    c.o = 0; c.sup = 1; c.comp = 0; c.b = (r === r0 || r === r1) ? B.PUEBLO : B.CAMINO;
  }
  at(g, q0, r0).cap = 0;
  at(g, q0, r1).cap = 0;
}

(async () => {
  // --- 1. Ruta terrestre y camino guardado ---
  let g = makeGame();
  roadLine(g, 0, 0, 5);
  let routes = HF.tradeRoutes(g, g.f[0]);
  ok(routes.length === 1 && routes[0].kind === 'land', 'detecta 1 ruta terrestre');
  ok(routes[0] && routes[0].path.length === 6, `guarda el camino completo (${routes[0] && routes[0].path.length})`);

  // --- 2. La caravana aparece, avanza 4 y devenga 5 ---
  HF.syncCaravans(g);
  let car = g.caravans.find(c => c.owner === 0);
  ok(!!car && car.kind === 'land', 'aparece la carreta');
  ok(car && car.pos === 4 && car.gold === 5, `avanza 4 casillas y devenga 5 (pos ${car && car.pos}, oro ${car && car.gold})`);

  // --- 3. Segundo turno: llega al final y entrega 10 ---
  g.turn = 2; g._trade = null;
  HF.syncCaravans(g);
  car = g.caravans.find(c => c.owner === 0);
  ok(g.f[0].stock[0].gold === 10, `entrega el oro al llegar (${g.f[0].stock[0].gold} de oro)`);
  ok(car && car.pos === 5 && car.dir === -1 && car.gold === 0, 'invierte la marcha tras entregar');

  // --- 4. Saqueo por caballería ---
  g.turn = 3; g.cur = 1;
  const target = g.caravans.find(c => c.owner === 0);
  const cellId = target.path[target.pos];
  const c = g.cells[cellId];
  const from = g._grid.nb[cellId][0];
  const raiderCell = g.cells[from];
  raiderCell.comp = 0;
  raiderCell.u = { type: 'CAB', tier: 1, owner: 1, mv: 1, at: 1 };
  raiderCell.o = 1;
  // la caravana lleva 10 acumulados
  target.gold = 10;
  const r = HF.raidCaravan(g, from, cellId);
  ok(r.ok && r.loot === 10, `saqueo con botín de 10 (${r.loot})`);
  ok(g.f[1].stock[0].gold === 10, 'el botín va al atacante');
  ok(!g.caravans.some(k => k === target), 'la caravana se destruye');
  ok((g.tradeBlocked[target.key] || 0) > g.turn, 'la ruta queda bloqueada');

  // --- 5. Ruta marítima ---
  g = makeGame();
  // dos ciudades costeras unidas por una línea de mar
  const a = at(g, -3, 0), b = at(g, 3, 0);
  a.o = b.o = 0; a.sup = b.sup = 1; a.b = b.b = B.PUEBLO; a.comp = b.comp = 0;
  for (let q = -2; q <= 2; q++) { const w = at(g, q, 0); w.t = T.MAR; w.o = -1; }
  routes = HF.tradeRoutes(g, g.f[0]);
  const sea = routes.find(x => x.kind === 'sea');
  ok(!!sea, 'detecta ruta marítima entre costeras');
  ok(sea && sea.path.length === 7, `camino marítimo con extremos (${sea && sea.path.length})`);
  HF.syncCaravans(g);
  const ship = g.caravans.find(c => c.kind === 'sea');
  ok(!!ship, 'aparece la urca');

  // --- 6. Carga manual entre puertos ---
  g = makeGame();
  const p1 = at(g, -3, 0), p2 = at(g, 3, 0);
  p1.o = p2.o = 0; p1.sup = p2.sup = 1; p1.b = p2.b = B.PUEBLO; p1.comp = p2.comp = 0;
  for (let q = -2; q <= 2; q++) { const w = at(g, q, 0); w.t = T.MAR; w.o = -1; }
  g.f[0].stock[0].wood = 60;
  const send = HF.sendCargo(g, p1.i, p2.i, 'wood', 50);
  ok(send.ok && send.qty === 50, 'envía 50 de madera');
  ok(g.f[0].stock[0].wood === 10, `descuenta la carga del puerto (${g.f[0].stock[0].wood})`);
  const cargo = g.caravans.find(c => c.kind === 'cargo');
  ok(!!cargo && cargo.cargo.qty === 50, 'aparece la urca de carga');

  // navega y entrega en el puerto de destino
  HF.syncCaravans(g);
  ok(g.f[0].stock[0].wood === 10, 'sigue en tránsito tras el primer turno');
  g.turn = 2; g._trade = null;
  HF.syncCaravans(g);
  ok(g.f[0].stock[0].wood === 60, `entrega la carga al llegar (${g.f[0].stock[0].wood})`);
  ok(!g.caravans.some(c => c.kind === 'cargo'), 'la urca desaparece al entregar');

  // --- 7. Captura de la carga por el enemigo ---
  g.f[0].stock[0].wood = 60;
  const send2 = HF.sendCargo(g, p1.i, p2.i, 'wood', 50);
  ok(send2.ok, 'segundo envío');
  const cargo2 = g.caravans.find(c => c.kind === 'cargo');
  const c2cell = cargo2.path[cargo2.pos];
  const from2 = g._grid.nb[c2cell][0];
  g.cells[from2].u = { type: 'CAB', tier: 1, owner: 1, mv: 1, at: 1 };
  g.cells[from2].comp = 0; g.cells[from2].o = 1;
  g.f[1].stock[0].wood = 0;
  g.cur = 1;
  const rr = HF.raidCaravan(g, from2, c2cell);
  ok(rr.ok && rr.loot === 50, `captura la carga (${rr.loot})`);
  ok(g.f[1].stock[0].wood === 50, 'el botín va al atacante');

  // ---------- asalto por cualquier tropa (8-14) ----------
  const raidIn = (opts, cellId) => {
    const o = opts.get(cellId);
    return o && (o.k === 'raid' ? o : (o.alt || []).find(a => a.k === 'raid'));
  };
  function landRaider(type) {
    const gg = makeGame();
    roadLine(gg, 0, 0, 5);
    HF.syncCaravans(gg);
    const c = gg.caravans.find(k => k.owner === 0 && k.kind === 'land');
    c.gold = 18;
    const cellId = c.path[c.pos];
    const from = gg._grid.nb[cellId].find(j => !gg.cells[j].u);
    gg.cells[from].u = { type, tier: 1, owner: 1, mv: 1, at: 1 };
    gg.cells[from].o = 1; gg.cells[from].comp = 0;
    gg.cur = 1;
    return { g: gg, car: c, cellId, from };
  }
  function seaGame() {
    const gg = makeGame();
    const a = at(gg, -3, 0), b = at(gg, 3, 0);
    a.o = b.o = 0; a.sup = b.sup = 1; a.b = b.b = B.PUEBLO; a.comp = b.comp = 0;
    for (let q = -2; q <= 2; q++) { const w = at(gg, q, 0); w.t = T.MAR; w.o = -1; }
    HF.syncCaravans(gg);
    return gg;
  }

  // --- 8. La infantería asalta carretas ---
  let s = landRaider('INF');
  let ro = raidIn(HF.options(s.g, s.from), s.cellId);
  ok(!!ro && ro.loot === 18, 'la infantería ve el asalto y el botín');
  let res = HF.act(s.g, s.from, s.cellId, 'raid');
  ok(res.ok && res.loot === 18, `la infantería saquea la carreta (${res.loot})`);
  ok(s.g.f[1].stock[0].gold === 18, 'el botín terrestre llega al atacante');
  ok(!s.g.caravans.some(k => k === s.car), 'la carreta desaparece');

  // --- 9. Los ingenieros y los arqueros también ---
  s = landRaider('ENG');
  ok(!!raidIn(HF.options(s.g, s.from), s.cellId), 'el ingeniero puede asaltar');
  s = landRaider('ARC');
  ok(!!raidIn(HF.options(s.g, s.from), s.cellId), 'el arquero puede asaltar');
  s = landRaider('SIE');
  ok(!!raidIn(HF.options(s.g, s.from), s.cellId), 'el asedio puede asaltar');

  // --- 10. La caballería se acerca y corta la ruta ---
  g = makeGame();
  roadLine(g, 0, 0, 5);
  HF.syncCaravans(g);
  let cabCar = g.caravans.find(k => k.owner === 0 && k.kind === 'land');
  cabCar.gold = 20;
  const cabCell = cabCar.path[cabCar.pos];
  for (let k = 0; k < cabCar.pos; k++) { const c = g.cells[cabCar.path[k]]; c.o = 1; c.comp = 0; }
  const cabFrom = g.cells[cabCar.path[0]];
  cabFrom.u = { type: 'CAB', tier: 1, owner: 1, mv: 6, at: 1 };
  g.cur = 1;
  const cabOpt = raidIn(HF.options(g, cabFrom.i), cabCell);
  ok(!!cabOpt && cabOpt.from !== cabFrom.i, 'la caballería asalta desde una casilla de lanzamiento');
  const cabRes = HF.act(g, cabFrom.i, cabCell, 'raid');
  ok(cabRes.ok && cabRes.loot === 20, `la caballería saquea a la carrera (${cabRes.loot})`);
  const cabNow = g.cells.find(c => c && c.u && c.u.type === 'CAB');
  ok(cabNow && !cabFrom.u && cabNow.i === cabOpt.from, 'la caballería avanza hasta el convoy');
  ok(cabNow && cabNow.u.mv === 0, 'la marcha consume el movimiento');

  // --- 11. El barco de guerra aborda las urcas ---
  g = seaGame();
  const urca = g.caravans.find(c => c.kind === 'sea' && c.owner === 0);
  urca.gold = 22;
  const urcaCell = urca.path[urca.pos];
  const wFrom = g._grid.nb[urcaCell].find(j => g.cells[j].t === T.MAR && !g.cells[j].u);
  g.cells[wFrom].u = { type: 'BAR', tier: 1, owner: 1, mv: 1, at: 1 };
  g.cells[wFrom].o = 1; g.cur = 1;
  ok(!!raidIn(HF.options(g, wFrom), urcaCell), 'el barco de guerra ve el abordaje');
  const shipRes = HF.act(g, wFrom, urcaCell, 'raid');
  ok(shipRes.ok && shipRes.loot === 22, `el barco saquea la urca (${shipRes.loot})`);
  ok(g.f[1].stock[0].gold === 22, 'el botín naval llega al atacante');

  // --- 12. La infantería no alcanza el mar; el arquero sí desde la costa ---
  g = seaGame();
  const urca2 = g.caravans.find(c => c.kind === 'sea' && c.owner === 0);
  urca2.gold = 9;
  const u2Cell = urca2.path[urca2.pos];
  const shore = g._grid.nb[u2Cell].find(j => g.cells[j].t !== T.MAR && g.cells[j].t !== T.RIO);
  g.cells[shore].o = 1; g.cells[shore].comp = 0;
  g.cells[shore].u = { type: 'INF', tier: 1, owner: 1, mv: 1, at: 1 };
  g.cur = 1;
  ok(!raidIn(HF.options(g, shore), u2Cell), 'la infantería no recibe la opción sobre una urca');
  const badSea = HF.raidCaravan(g, shore, u2Cell);
  ok(!badSea.ok && /mar/.test(badSea.msg), 'el motor explica que la infantería no alcanza el mar');
  g.cells[shore].u = { type: 'ARC', tier: 1, owner: 1, mv: 1, at: 1 };
  ok(!!raidIn(HF.options(g, shore), u2Cell), 'el arquero hostiga la urca desde la costa');
  const arcRes = HF.act(g, shore, u2Cell, 'raid');
  ok(arcRes.ok && arcRes.loot === 9, `el arquero saquea la urca (${arcRes.loot})`);

  // --- 13. Una unidad enemiga protege el comercio ---
  g = makeGame();
  roadLine(g, 0, 0, 5);
  HF.syncCaravans(g);
  const guarded = g.caravans.find(c => c.owner === 0 && c.kind === 'land');
  guarded.gold = 30;
  const guardedCell = guarded.path[guarded.pos];
  g.cells[guardedCell].u = { type: 'INF', tier: 1, owner: 0, mv: 0, at: 0 };
  const gFrom = g._grid.nb[guardedCell].find(j => !g.cells[j].u);
  g.cells[gFrom].u = { type: 'INF', tier: 1, owner: 1, mv: 1, at: 1 };
  g.cells[gFrom].o = 1; g.cells[gFrom].comp = 0;
  g.cur = 1;
  ok(!raidIn(HF.options(g, gFrom), guardedCell), 'la guarnición protege la caravana');
  const blocked = HF.raidCaravan(g, gFrom, guardedCell);
  ok(!blocked.ok && /protege/.test(blocked.msg), 'el motor impide saquear bajo una unidad enemiga');

  // --- 14. El comercio propio nunca es objetivo ---
  g = makeGame();
  roadLine(g, 0, 0, 5);
  HF.syncCaravans(g);
  const ownCar = g.caravans.find(c => c.owner === 0 && c.kind === 'land');
  const ownCell = ownCar.path[ownCar.pos];
  const ownFrom = g._grid.nb[ownCell].find(j => !g.cells[j].u);
  g.cells[ownFrom].u = { type: 'INF', tier: 1, owner: 0, mv: 1, at: 1 };
  g.cells[ownFrom].o = 0; g.cells[ownFrom].comp = 0;
  g.cur = 0;
  ok(!raidIn(HF.options(g, ownFrom), ownCell), 'no se ofrece saquear el comercio propio');
  ok(!HF.raidCaravan(g, ownFrom, ownCell).ok, 'el motor rechaza saquear el comercio propio');

  console.log(fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK');
  process.exit(fail ? 1 : 0);
})();
