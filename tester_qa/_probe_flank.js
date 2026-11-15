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
g.cur = 1; g.turn = 14;
const ownU = g.cells.find(x=>x&&x.u&&x.u.owner===1); const bi = HF.nbs(g, ownU.i).find(i=>g.cells[i]&&g.cells[i].t!==HF.T.MAR); const b = g.cells[bi]; b.b = HF.B.BASTION; b.o = 0; b.u = { type: 'INF', tier: 2, owner: 0, mv: 1, at: 1 };
HF.supply(g); HF.initStock(g);
const a = HF.aiAnalysis(g, 1);
console.log({ landBlocked: a.landBlocked, contact: a.contactTurn, target: a.naval.targetComp, flank: a.naval.flank, wanted: a.naval.shipsWanted, beaches: a.naval.beaches.slice(0, 4) });
