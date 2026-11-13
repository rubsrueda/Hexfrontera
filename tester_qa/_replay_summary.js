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
// Keep checkEnd to know winner? We'll reconstruct full.
const payload = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', '_gen', 'replay_payload.json'), 'utf8'));
const g = HF.newGame(Object.assign({}, payload.setup, { isReplay: true }));
g.fog = 'NONE'; g.fogMap = null; HF.updateFog(g);
let phases = 0, acts = 0;
for (let idx = 0; idx < payload.log.length; idx++) {
  const t = payload.log[idx];
  try {
    if (t[0] === 4) { phases++; HF.replayPhase(g, t[1]); }
    else { acts++; HF.replayApply(g, t); }
  } catch (e) {
    console.log('FAIL at log index', idx, 'entry', JSON.stringify(t), 'turn', g.turn, 'cur', g.cur,
      'actor', g.f[g.cur] && g.f[g.cur].name, 'error', e.message);
    const c = g.cells[t[1]];
    console.log('from cell', t[1], c && { q: c.q, r: c.r, t: c.t, o: c.o, b: c.b, sup: c.sup, u: c.u });
    if (c && c.u) console.log('options', Array.from(HF.options(g, t[1]).entries()).slice(0, 8).map(([to, o]) => to + ':' + o.k));
    console.log('prev 6', JSON.stringify(payload.log.slice(Math.max(0, idx - 6), idx)));
    break;
  }
}
function stats(g) {
  return g.f.map(f => {
    let terr = 0, units = 0, b = {};
    for (const c of g.cells) {
      if (!c) continue;
      if (c.o === f.id) {
        terr++;
        if (c.b) b[HF.BNAME[c.b]] = (b[HF.BNAME[c.b]] || 0) + 1;
      }
      if (c.u && c.u.owner === f.id) units++;
    }
    return { name: f.name, human: f.human, alive: f.alive, terr, units, gold: f.gold, food: f.food, wood: f.wood, b };
  });
}
console.log('phases', phases, 'acts', acts, 'turn', g.turn, 'over', JSON.stringify(g.over));
console.log(JSON.stringify(stats(g), null, 2));
console.log('log tail', JSON.stringify(payload.log.slice(-12)));
