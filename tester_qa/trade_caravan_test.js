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

let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };
const T = HF.T, B = HF.B;

function makeGame() {
  const R = 6, gr = HF.makeGrid(R);
  const g = {
    R, turn: 1, cur: 0, cells: [], f: [], _trade: null, caravans: [], tradeBlocked: {}, events: []
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

  console.log(fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK');
  process.exit(fail ? 1 : 0);
})();
