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
g.cur = 1;
// Crear un bastión en el cuello #435 (o el que sea más estrecho)
const ci = 435; const c = g.cells[ci]; c.b = HF.B.BASTION; c.o = 1; c.u = null;
// Mantener el humano lejos y dar una unidad N2 cerca
const human = g.cells.find(x => x && x.u && x.u.owner === 0); if (human) human.u = null;
const spot = HF.nbs(g, ci).map(i => g.cells[i]).find(x => x && x.t !== HF.T.MAR && !x.u);
if (spot) spot.u = { type: 'INF', tier: 2, owner: 1, mv: 1, at: 1 };
// Poner unidades humanas lejos, no adyacentes
const hc = g.cells.find(x => x && x.cap && x.o === 0); if (hc) hc.u = { type: 'INF', tier: 3, owner: 0, mv: 1, at: 1 };
HF.supply(g); HF.initStock(g);
const a = HF.aiAnalysis(g, 1);
console.log('critical guard', a.guard[ci], 'near', (a.enemyUnits || []).length, 'bastion', ci, 'spot', spot && spot.i);
HF.aiPlay(g, 1);
const at = g.cells[ci];
console.log('after bastion unit', at.u && at.u.type + at.u.tier, 'spot unit', spot && spot.u && spot.u.type + spot.u.tier);
