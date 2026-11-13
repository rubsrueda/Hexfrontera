'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const sandbox = { console, HF: {}, Date, Math, JSON, Map, Set, Int8Array, Int16Array, Uint8Array, Float32Array, performance: { now: () => Date.now() } };
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
const JS = path.join(__dirname, '..', 'js');
for (const f of ['util.js', 'config.js', 'data.js', 'names.js', 'mapgen.js', 'engine.js', 'progress.js', 'diplomacy.js', 'diplomacy_ai.js', 'ai.js'])
  vm.runInContext(fs.readFileSync(path.join(JS, f), 'utf8'), sandbox, { filename: f });
const HF = sandbox.HF;
HF.updateFog = () => {}; HF.checkEnd = () => {}; HF.recordTimeline = () => {};
const tribe = Object.assign({ name: 'Prueba', color: HF.COLORS[0], crest: HF.CRESTS[0] }, HF.PRESETS[0]);
const g = HF.makeGame({ size: 'small', seed: 4242, biome: 'archipelago', fog: 'NONE', difficulty: 'normal', n: 2, startRes: { gold: 400, food: 400, wood: 400 } }, tribe);
g.cur = 1;
console.log('turn', g.turn, 'cells', g.cells.length, 'factions', g.f.length);
console.log('grid list', g._grid.list.length, 'nb0', g._grid.nb[0]);
const mine = g.cells.filter(c => c && c.u && c.u.owner === 1);
console.log('ai units', mine.length, mine.map(c => c.u.type + '@' + c.i + ' ' + HF.TNAME[c.t]));
for (const c of mine.slice(0, 2)) {
  const opts = HF.options(g, c.i);
  const arr = [...opts.entries()].slice(0, 8).map(([to, o]) => to + ':' + o.k + (o.ok ? '(ok)' : '') + (o.ship ? 's' : ''));
  console.log('opts', c.i, c.u.type, opts.size, arr.join(', '));
}
console.log('build cells camp', HF.buildCells(g, HF.B.CAMPAMENTO).length, 'road', HF.buildCells(g, HF.B.CAMINO).length, 'pueblo', HF.buildCells(g, HF.B.PUEBLO).length);
const campCells = HF.buildCells(g, HF.B.CAMPAMENTO);
if (campCells.length) { const r = HF.build(g, HF.B.CAMPAMENTO, campCells[0]); console.log('build camp', r, g.cells[campCells[0]].b, 'provs', HF.provinces(g, g.f[1])); }
console.log('income', HF.income(g, g.f[1], null), 'preview', HF.preview(g, g.f[1], null));
console.log('provs', HF.provinces(g, g.f[1]));
console.log('capital', g.cells.filter(c => c && c.o === 1 && c.cap && c.b === HF.B.CIUDAD).map(c => c.i));
const cap = g.cells.find(c => c && c.o === 1 && c.cap && c.b === HF.B.CIUDAD);
if (cap) { console.log('bankQuote food', HF.bankQuote(g, g.f[1], 'food')); const s = g.f[1].stock[cap.comp]; console.log('cap stock', s); const r = HF.bankExchange(g, cap.i, 'food', 5); console.log('bank food', r); }
console.log('land comps', (() => { const comp = new Int16Array(g.cells.length).fill(-1); let n = 0; for (const d of g._grid.list) { if (comp[d.i] >= 0 || g.cells[d.i].t === HF.T.MAR) continue; const q = [d.i]; comp[d.i] = n; while (q.length) { const x = q.pop(); for (const y of g._grid.nb[x]) if (comp[y] < 0 && g.cells[y].t !== HF.T.MAR) { comp[y] = n; q.push(y); } } n++; } return n; })());
console.log('waterField', HF.waterField ? !!HF.waterField(g, 1, 'CAB') : 'none');
console.log('stormAt', HF.stormAt ? HF.stormAt(g, 0) : 'none');
