'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const sandbox = { console, HF: {}, Date, Math, JSON, Map, Set, Int8Array, Int16Array, Uint8Array, Float32Array, performance: { now: () => Date.now() } };
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of ['util.js', 'config.js', 'data.js', 'names.js', 'mapgen.js', 'engine.js', 'diplomacy.js', 'diplomacy_ai.js', 'progress.js', 'ai.js'])
  vm.runInContext(fs.readFileSync(path.join('js', f), 'utf8'), sandbox, { filename: f });
const HF = sandbox.HF;
HF.updateFog = () => {}; HF.checkEnd = () => {}; HF.recordTimeline = () => {};

const tribe = Object.assign({ name: 'P', color: HF.COLORS[0], crest: HF.CRESTS[0] }, HF.PRESETS[0]);
const g = HF.makeGame({ size: 'small', seed: 4242, biome: 'archipelago', fog: 'NONE', difficulty: 'normal', n: 2, startRes: { gold: 200, food: 200, wood: 200 } }, tribe);
const cap0 = g.cells.find(c => c && c.o === 0 && c.b === HF.B.CIUDAD);
const cap1 = g.cells.find(c => c && c.o === 1 && c.b === HF.B.CIUDAD);
console.log('caps', cap0.i, cap1.i, 'comp', HF.aiAnalysis(g, 1).comp[cap0.i], HF.aiAnalysis(g, 1).comp[cap1.i]);
// Cortar el istmo: elegir un camino terrestre entre capitales y hundir una casilla intermedia.
function bfsPath(from, to) {
  const prev = new Map([[from, -1]]), q = [from], gr = g._grid;
  for (let h = 0; h < q.length; h++) {
    const x = q[h];
    if (x === to) { const p = []; let c = to; while (c !== from) { p.push(c); c = prev.get(c); } return p.reverse(); }
    for (const y of gr.nb[x]) { const n = g.cells[y]; if (!n || prev.has(y) || n.t === HF.T.MAR) continue; prev.set(y, x); q.push(y); }
  }
  return null;
}
const path0 = bfsPath(cap0.i, cap1.i);
console.log('land path len', path0 && path0.length);
if (path0) {
  const mid = path0[Math.floor(path0.length / 2)];
  const c = g.cells[mid];
  console.log('cut', mid, HF.TNAME[c.t], HF.BNAME[c.b]);
  c.t = HF.T.MAR; c.b = 0; c.res = 0; c.u = null;
  g._aiComp = null;
  HF.supply(g); HF.initStock(g); HF.updateFog(g);
}
const a0 = HF.aiAnalysis(g, 1);
console.log('after cut comps', a0.comp[cap0.i], a0.comp[cap1.i], 'naval target', a0.naval.targetComp, 'beach', a0.naval.beach, 'need', a0.naval.needTransport, 'load', [...a0.naval.loadCells]);

for (let t = 0; t < 26; t++) {
  HF.endTurn(g, HF.aiPlay);
  if (g.over) break;
  if (t % 3 === 0) {
    const a = HF.aiAnalysis(g, 1);
    const ships = g.cells.filter(c => c && c.u && c.u.owner === 1 && c.u.type === 'BAR');
    const onEnemy = g.cells.filter(c => c && c.u && c.u.owner === 1 && a.comp[c.i] === a.comp[cap0.i]);
    console.log('t' + g.turn, 'naval', a.naval.targetComp + '/' + a.naval.beach + '/need:' + a.naval.needTransport, 'scores', JSON.stringify(a.naval.scores), 'ships', ships.map(c => c.i + (c.u.cargo ? '(cargo:' + c.u.cargo.type + ')' : '')).join(','), 'load', [...a.naval.loadCells].join(','), 'onEnemyIsland', onEnemy.map(c => c.u.type + '@' + c.i).join(','), 'food', g.f[1].food, 'units', g.cells.filter(c => c && c.u && c.u.owner === 1).length);
    for (const sc of ships) {
      const o = HF.options(g, sc.i);
      console.log('   ship', sc.i, 'wf', a.naval.wf && a.naval.wf[sc.i], 'cargo', sc.u.cargo && sc.u.cargo.type, 'opts', [...o.entries()].slice(0, 10).map(([to, x]) => to + ':' + x.k + (x.ship ? 's' : '') + (x.ok ? '!' : '')).join(','));
    }
  }
}
console.log('end turn', g.turn, 'over', JSON.stringify(g.over), 'player city', g.cells.filter(c => c && c.o === 0 && c.b === HF.B.CIUDAD).map(c => c.i));
