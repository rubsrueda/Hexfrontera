'use strict';
// Niebla por asiento y detección de primer contacto (base del cambio de fase).
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HF = {};
const sandbox = { console, HF, window: null, navigator: { onLine: false }, localStorage: null };
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ['util.js', 'config.js', 'data.js', 'engine.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox);

let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };
const T = HF.T;
const R = 6, gr = HF.makeGrid(R);
const g = { R, turn: 1, cur: 0, fog: 'FULL', fogMap: null, cells: [], f: [], events: [], _grid: gr };
g.f = [{ id: 0, alive: true, human: true }, { id: 1, alive: true, human: false }];
for (const d of gr.list) g.cells[d.i] = { i: d.i, q: d.q, r: d.r, t: T.LLANO, o: -1, b: 0, sup: 0, comp: 0 };
const at = (q, r) => g.cells[gr.idx(q, r)];
// territorio y unidad de cada bando, separados
at(-5, 0).o = 0; at(-5, 0).u = { type: 'INF', tier: 1, owner: 0, mv: 1, at: 1 };
at(5, 0).o = 1; at(5, 0).u = { type: 'INF', tier: 1, owner: 1, mv: 1, at: 1 };
g.mySeat = 0;

HF.updateFog(g);
ok(g.fogMap[at(-5, 0).i] === 2, 'la niebla ve la unidad propia');
ok(g.fogMap[at(5, 0).i] === 0, 'la niebla no ve al enemigo lejano');
ok(HF.hasContact(g) === false, 'sin contacto al empezar');

// el enemigo se acerca a una casilla de la unidad propia
at(-4, 0).o = 1; at(-4, 0).u = { type: 'CAB', tier: 1, owner: 1, mv: 1, at: 1 };
HF.updateFog(g);
ok(HF.hasContact(g) === true, 'detecta el primer contacto');
ok(g.fogMap[at(-4, 0).i] === 2, 'el enemigo cercano queda visible');

// con niebla desactivada también hay contacto
g.fog = 'NONE';
ok(HF.hasContact(g) === true, 'sin niebla detecta igual');

console.log(fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK');
process.exit(fail ? 1 : 0);
