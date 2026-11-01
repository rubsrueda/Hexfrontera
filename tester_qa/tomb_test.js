'use strict';
// Tumba de una unidad propia: se consume al pisarla y hay un 5% de evento
// (recuperar unidad, recursos, edificio ≤ bastión o nada).
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
const makeGame = () => {
  const R = 4, g = { R, turn: 5, cur: 0, cells: [], f: [], events: [], _rng: null };
  g.f = [{ id: 0, alive: true, human: true, stock: { 0: { gold: 0, food: 0, wood: 0 } }, gold: 0, food: 0, wood: 0 }];
  const gr = HF.makeGrid(R);
  for (const d of gr.list) g.cells[d.i] = { i: d.i, q: d.q, r: d.r, t: T.LLANO, o: 0, b: 0, sup: 1, comp: 0 };
  g._grid = gr;
  return g;
};
const seq = (...v) => { const q = v.slice(); return () => (q.length ? q.shift() : 0.99); };
function setup(g) {
  const t = g.cells[g._grid.idx(0, 0)];
  const u = { type: 'INF', tier: 1, owner: 0, mv: 0, at: 0 };
  t.u = u;
  t.tomb = 3; t.tombOwner = 0; t.tombUnit = { type: 'ARC', tier: 2 };
  return { t, u };
}

// 1. Sin suerte: la tumba se consume y no pasa nada
let g = makeGame(), { t, u } = setup(g);
g._rng = seq(0.9);
ok(HF.visitTomb(g, u, t, g.f[0]) === null, 'sin disparo del 5% no hay premio');
ok(t.tomb === 0 && t.tombUnit === null, 'la visita consume la tumba');

// 2. Recuperar la unidad caída (ARC N2) en una casilla libre vecina
g = makeGame(); ({ t, u } = setup(g));
g._rng = seq(0.01, 0.01);
ok(HF.visitTomb(g, u, t, g.f[0]) === 'recover', 'recupera la unidad');
const back = g.cells.find(c => c && c.u && c.u !== u && c.u.owner === 0);
ok(!!back && back.u.type === 'ARC' && back.u.tier === 2, 'la unidad vuelve con su tipo y nivel');

// 3. Recursos gratis
g = makeGame(); ({ t, u } = setup(g));
g._rng = seq(0.01, 0.5);
ok(HF.visitTomb(g, u, t, g.f[0]) === 'resources', 'obtiene recursos');
ok(g.f[0].stock[0].gold === 25 && g.f[0].stock[0].food === 15 && g.f[0].stock[0].wood === 10, 'suma 25 oro, 15 comida y 10 madera');

// 4. Edificio gratis (≤ bastión)
g = makeGame(); ({ t, u } = setup(g));
g._rng = seq(0.01, 0.75, 0.3);
ok(HF.visitTomb(g, u, t, g.f[0]) === 'building', 'obtiene un edificio');
ok([B.CAMINO, B.CAMPAMENTO, B.PUEBLO, B.BASTION].indexOf(t.b) >= 0, `edificio válido (${t.b})`);

// 5. Tumba ajena: nunca da premio
g = makeGame(); ({ t, u } = setup(g));
t.tombOwner = 1; g._rng = seq(0.01, 0.01);
ok(HF.visitTomb(g, u, t, g.f[0]) === null, 'la tumba de otro no da premio');

console.log(fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK');
process.exit(fail ? 1 : 0);
