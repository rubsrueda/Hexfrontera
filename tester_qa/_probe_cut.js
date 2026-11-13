'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const sandbox = { console, HF: {}, Date, Math, JSON, Map, Set, Int8Array, Int16Array, Uint8Array, Float32Array, performance: { now: () => Date.now() } };
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of ['util.js', 'config.js', 'data.js', 'names.js', 'mapgen.js', 'engine.js', 'diplomacy.js', 'diplomacy_ai.js', 'ai.js', 'progress.js'])
  vm.runInContext(fs.readFileSync(path.join('js', f), 'utf8'), sandbox, { filename: f });
const HF = sandbox.HF;
HF.updateFog = () => {}; HF.checkEnd = () => {}; HF.recordTimeline = () => {};
const tribe = Object.assign({ name: 'P', color: HF.COLORS[0], crest: HF.CRESTS[0] }, HF.PRESETS[0]);
const g = HF.makeGame({ size: 'small', seed: 123, biome: 'plains', fog: 'NONE', difficulty: 'normal', n: 2, startRes: { gold: 200, food: 200, wood: 200 } }, tribe);
// Camino terrestre de 7 celdas
const start = g.cells.find(c => c && c.t !== HF.T.MAR && c.o === -1 && c.i === 5) || g.cells.find(c => c && c.t !== HF.T.MAR);
const pathCells = [];
let cur = start;
const seen = new Set([cur.i]);
while (pathCells.length < 6) {
  pathCells.push(cur);
  const nb = HF.nbs(g, cur.i).map(i => g.cells[i]).filter(c => c && c.t !== HF.T.MAR && !seen.has(c.i));
  if (!nb.length) break;
  cur = nb[0]; seen.add(cur.i);
}
console.log('path', pathCells.map(c => c.i).join(','));
pathCells.forEach((c, k) => { c.o = 1; c.b = 0; c.res = 0; c.cap = 0; c.u = null; });
const settle = pathCells[pathCells.length - 1];
settle.b = HF.B.PUEBLO;
pathCells[1].u = { type: 'INF', tier: 2, owner: 1, mv: 1, at: 1 };
pathCells[2].u = { type: 'INF', tier: 1, owner: 1, mv: 1, at: 1 };
HF.supply(g); HF.initStock(g);
const mid = pathCells[3];
console.log('comp', mid.comp, 'sup', mid.sup, 'cut mid', HF.aiCutValue(g, 0, mid.i), 'cut settle', HF.aiCutValue(g, 0, settle.i));
console.log('opts mid', [...HF.options(g, pathCells[0].i).entries()].slice(0, 5));
