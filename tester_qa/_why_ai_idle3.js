'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const sandbox = {
  console, HF: {}, Date, Math, JSON, Map, Set, Int8Array, Int16Array, Int32Array,
  Uint8Array, Float32Array, Array, Object, String, Number, Boolean, Error,
  performance: { now: () => Date.now() }, Blob, Response, CompressionStream, DecompressionStream,
  btoa: s => Buffer.from(s, 'binary').toString('base64'),
  atob: s => Buffer.from(s, 'base64').toString('binary')
};
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
const JS = path.join(__dirname, '..', 'js');
for (const f of ['util.js', 'config.js', 'data.js', 'names.js', 'mapgen.js', 'engine.js', 'diplomacy.js', 'diplomacy_ai.js', 'replay.js', 'progress.js', 'ai.js'])
  vm.runInContext(fs.readFileSync(path.join(JS, f), 'utf8'), sandbox, { filename: f });
const HF = sandbox.HF;
HF.updateFog = () => {};
HF.checkEnd = () => {};
HF.recordTimeline = () => {};
const p = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', '_gen', 'replay_payload3.json'), 'utf8'));
const g = HF.newGame(Object.assign({}, p.setup, { isReplay: true }));
g.fog = 'NONE'; g.fogMap = null; HF.updateFog(g);
for (const t of p.log) { if (t[0] === 4) HF.replayPhase(g, t[1]); else HF.replayApply(g, t); }
g.cur = 1;
const f = g.f[1];
console.log('cur', g.cur, 'turn', g.turn, 'deficit', f.deficit, 'stock', JSON.stringify(f.stock), 'gold/food/wood', f.gold, f.food, f.wood);
console.log('preview', JSON.stringify(HF.preview(g, f, null)));
console.log('provinces', JSON.stringify(HF.provinces(g, f)));
console.log('buildCells camp/road/pueblo', HF.buildCells(g, HF.B.CAMPAMENTO).length, HF.buildCells(g, HF.B.CAMINO).length, HF.buildCells(g, HF.B.PUEBLO).length);
console.log('recruitScan INF', HF.recruitScan(g, 'INF').size, 'BAR', HF.recruitScan(g, 'BAR').size);
const a = HF.aiReport(g, 1);
console.log('AIREPORT', JSON.stringify(a, null, 1));
const u = g.cells.find(c => c && c.u && c.u.owner === 1);
if (u) {
  console.log('unit', u.i, u.u, 'def', HF.defenseAt(g, u.i), 'opts', Array.from(HF.options(g, u.i).entries()).slice(0, 12).map(([to, o]) => to + ':' + o.k));
}
