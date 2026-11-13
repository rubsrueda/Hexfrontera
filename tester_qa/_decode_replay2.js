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
(async () => {
  const code = fs.readFileSync(path.join(__dirname, '..', '..', '..', '_gen', 'replay_code2.txt'), 'utf8').trim();
  console.log('code chars', code.length, 'prefix', code.slice(0, 4));
  const p = await HF.decodeReplay(code);
  console.log('setup', JSON.stringify({
    mode: p.setup.mode, seed: p.setup.seed, R: p.setup.R, biome: p.setup.biome,
    difficulty: p.setup.difficulty, fog: p.setup.fog, custom: !!p.setup.customCells,
    factions: (p.setup.factions || []).map(f => ({ name: f.name, human: f.human, tags: (f.tags || []).length }))
  }));
  console.log('log entries', p.log.length);
  const counts = {};
  for (const t of p.log) counts[t[0]] = (counts[t[0]] || 0) + 1;
  console.log('log counts', JSON.stringify(counts));
  fs.writeFileSync(path.join(__dirname, '..', '..', '..', '_gen', 'replay_payload2.json'), JSON.stringify(p, null, 2));
})().catch(e => { console.error(e); process.exit(1); });
