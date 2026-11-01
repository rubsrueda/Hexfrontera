'use strict';
// Prueba del resumen por facción que alimenta el marcador (sin navegador).
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HF = {};
const sandbox = { console, HF, window: null };
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ['util.js', 'config.js', 'data.js', 'engine.js', 'game.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox);

let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };
const T = HF.T, B = HF.B;
const R = 6, gr = HF.makeGrid(R);
const g = {
  R, turn: 7, cur: 0, cells: [], f: [], _trade: null, caravans: [], tradeBlocked: {}, events: [],
  goal: { type: 'conquer' }
};
g.f = [
  { id: 0, alive: true, human: true, color: '#3b82f6', crest: 'c01', name: 'Tú', stock: { 0: { gold: 150, food: 45, wood: 80 } }, gold: 150, food: 45, wood: 80, tags: [] },
  { id: 1, alive: true, human: false, color: '#ef4444', crest: 'c02', name: 'IA', stock: { 0: { gold: 20, food: 5, wood: 10 } }, gold: 20, food: 5, wood: 10, tags: [] }
];
for (const d of gr.list) g.cells[d.i] = { i: d.i, q: d.q, r: d.r, t: T.LLANO, o: -1, b: 0, sup: 0, comp: 0, res: 0 };
g._grid = HF.makeGrid(R);
const at = (q, r) => g.cells[g._grid.idx(q, r)];

// territorio del jugador: capital, pueblo, camino y un par de llanos
const capi = at(0, 0), town = at(0, 1), road = at(1, 0);
for (const c of [capi, town, road]) { c.o = 0; c.sup = 1; c.comp = 0; }
capi.b = B.CIUDAD; capi.cap = 1;
town.b = B.PUEBLO;
road.b = B.CAMINO;
at(0, 2).o = 0; at(0, 2).sup = 1;
// dos unidades propias
at(0, 3).u = { type: 'INF', tier: 1, owner: 0, mv: 1, at: 1 };
at(0, 4).u = { type: 'ARC', tier: 1, owner: 0, mv: 1, at: 1 };
// enemigo a 2 casillas de la capital
at(2, 0).u = { type: 'CAB', tier: 1, owner: 1, mv: 1, at: 1 };

const s = HF.factionSummary(g, g.f[0]);
ok(s.cells === 4, `casillas controladas (${s.cells})`);
ok(s.units === 2, `unidades (${s.units})`);
ok(s.cities === 1 && s.towns === 1 && s.roads === 1, 'estructuras contadas');
ok(s.cap && s.cap.i === capi.i, 'detecta la capital');
ok(s.threat === true, 'marca la capital amenazada');
ok(s.netGold === s.pv.inc.gold - s.pv.upkeepGold - s.loan, 'neto de oro coherente');
ok(s.netFood === s.pv.inc.food - s.pv.upkeep, 'neto de trigo coherente');
ok(s.alive === true, 'facción viva');
const e = HF.factionSummary(g, g.f[1]);
ok(e.threat === false && !e.cap, 'la IA sin capital no figura amenazada');

console.log(fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK');
process.exit(fail ? 1 : 0);
