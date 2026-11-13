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
function bfsPath(from, to) { const prev = new Map([[from, -1]]), q = [from], gr = g._grid; for (let h = 0; h < q.length; h++) { const x = q[h]; if (x === to) { const p = []; let c = to; while (c !== from) { p.push(c); c = prev.get(c); } return p.reverse(); } for (const y of gr.nb[x]) { const n = g.cells[y]; if (!n || prev.has(y) || n.t === HF.T.MAR) continue; prev.set(y, x); q.push(y); } } return null; }
const p = bfsPath(cap0.i, cap1.i); const mid = p[Math.floor(p.length / 2)]; g.cells[mid].t = HF.T.MAR; g.cells[mid].b = 0; g.cells[mid].res = 0; g.cells[mid].u = null; g._aiComp = null; HF.supply(g); HF.initStock(g); HF.updateFog(g);
const a = HF.aiAnalysis(g, 1);
console.log('player cap', cap0.i, 'comp', a.comp[cap0.i], 'o', cap0.o, 'b', cap0.b, 'enemy', a.enemy);
console.log('scores', JSON.stringify(a.naval.scores));
const k = a.comp[cap0.i];
const cellsComp = g.cells.filter(c => c && a.comp[c.i] === k);
console.log('comp cells', cellsComp.map(c => c.i + ':o' + c.o + ':' + HF.BNAME[c.b] + ':' + (c.res ? 'res' : '') + ':u' + (c.u ? c.u.type : '-')).join(' '));
console.log('water around cap', (g._grid.nb[cap0.i] || []).map(i => i + ':' + HF.TNAME[g.cells[i].t] + ':wd' + a.waterDist[i]).join(' '));
console.log('player comps of all own', g.cells.filter(c => c && c.o === 1).slice(0, 5).map(c => c.i + ':c' + a.comp[c.i]).join(' '));
