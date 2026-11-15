'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const sandbox = { console, HF: {}, Date, Math, JSON, Map, Set, Int8Array, Int16Array, Int32Array, Uint8Array, Float32Array, Array, Object, String, Number, Boolean, Error, performance: { now: () => Date.now() }, Blob, Response, CompressionStream, DecompressionStream, btoa: s => Buffer.from(s, 'binary').toString('base64'), atob: s => Buffer.from(s, 'base64').toString('binary') };
sandbox.window = sandbox; sandbox.globalThis = sandbox; vm.createContext(sandbox);
for (const f of ['util.js', 'config.js', 'data.js', 'names.js', 'mapgen.js', 'engine.js', 'diplomacy.js', 'diplomacy_ai.js', 'replay.js', 'progress.js', 'ai.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox, { filename: f });
const HF = sandbox.HF; HF.updateFog = () => {}; HF.checkEnd = () => {}; HF.recordTimeline = () => {};
const p = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', '_gen', 'replay_payload3.json'), 'utf8'));
const g = HF.newGame(Object.assign({}, p.setup, { isReplay: true })); g.fog = 'NONE'; HF.updateFog(g);
for (const t of p.log) { if (t[0] === 4) HF.replayPhase(g, t[1]); else HF.replayApply(g, t); }
g.cur = 1; g.turn = 12;
const ci = 435, c = g.cells[ci]; c.b = HF.B.NINGUNO; c.o = 1; c.u = null; c.sup = 1; c.comp = g.cells[116].comp;
const hc = g.cells.find(x => x && x.cap && x.o === 0); if (hc) hc.u = { type: 'INF', tier: 3, owner: 0, mv: 1, at: 1 }; const nearHuman = HF.nbs(g, 435).map(i => g.cells[i]).find(x => x && x.t !== HF.T.MAR && !x.u); if (nearHuman) nearHuman.u = { type: 'INF', tier: 3, owner: 0, mv: 1, at: 1 }; HF.supply(g); c.sup = 1; c.comp = g.cells[116].comp; HF.initStock(g); const f = g.f[1]; f.gold = 120; f.food = 120; f.wood = 120; for (const k in f.stock) f.stock[k] = { gold: 120, food: 120, wood: 120 };
const a = HF.aiAnalysis(g, 1);
console.log('navalNeed', a.naval.needTransport, 'faults', JSON.stringify(HF.dipFaults&&HF.dipFaults())); console.log('chokeActive', a.chokeActive, 'choke435', a.choke[ci], 'guard', a.guard[ci]);
HF.aiPlay(g, 1);
console.log('after', g.cells[ci].b, HF.BNAME[g.cells[ci].b], 'unit', g.cells[ci].u && g.cells[ci].u.type + g.cells[ci].u.tier);
