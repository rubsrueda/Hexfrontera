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
let i = 0;
// aplicar hasta la primera fase [4], que cierra el turno humano
for (; i < p.log.length; i++) {
  const t = p.log[i];
  if (t[0] === 4) { HF.replayPhase(g, t[1]); i++; break; }
  HF.replayApply(g, t);
}
console.log('AI T1 start turn', g.turn, 'cur', g.cur, 'gold/food/wood', g.f[1].gold, g.f[1].food, g.f[1].wood);
console.log('recruit INF', HF.recruitScan(g, 'INF').size, 'build camp', HF.buildCells(g, HF.B.CAMPAMENTO).length, 'report', JSON.stringify(HF.aiReport(g, 1)));
const origAct = HF.act, origBuild = HF.build, origRecruit = HF.recruit;
HF.act = function (gg, from, to, kind) { const u = gg.cells[from] && gg.cells[from].u; const r = origAct.apply(this, arguments); if (gg === g) console.log('ACT', u && u.type, from, to, kind || '', r.ok); return r; };
HF.build = function (gg, b, ci) { const r = origBuild.apply(this, arguments); if (gg === g) console.log('BUILD', HF.BNAME[b], ci, r.ok); return r; };
HF.recruit = function (gg, type, ci, comp) { const r = origRecruit.apply(this, arguments); if (gg === g) console.log('RECRUIT', type, ci, comp, r.ok); return r; };
HF.aiPlay(g, 1);
console.log('after AI T1', 'gold/food/wood', g.f[1].gold, g.f[1].food, g.f[1].wood, 'terr', g.cells.filter(c => c && c.o === 1).length, 'units', g.cells.filter(c => c && c.u && c.u.owner === 1).length);
console.log('next log entries', JSON.stringify(p.log.slice(i, i + 8)));
