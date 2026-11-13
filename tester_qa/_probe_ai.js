'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const sandbox = { console, HF: {}, Date, Math, JSON, Map, Set, Int8Array, Int16Array, Uint8Array, Float32Array, performance: { now: () => Date.now() } };
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
const JS = path.join(__dirname, '..', 'js');
for (const f of ['util.js', 'config.js', 'data.js', 'names.js', 'mapgen.js', 'engine.js', 'diplomacy.js', 'diplomacy_ai.js', 'progress.js', 'ai.js'])
  vm.runInContext(fs.readFileSync(path.join(JS, f), 'utf8'), sandbox, { filename: f });
const HF = sandbox.HF;
HF.updateFog = () => {}; HF.checkEnd = () => {}; HF.recordTimeline = () => {};

function run(label, spec, turns, tribeIdx) {
  const tribe = Object.assign({ name: 'Prueba', color: HF.COLORS[0], crest: HF.CRESTS[0] }, HF.PRESETS[tribeIdx || 0]);
  const g = HF.makeGame(Object.assign({ fog: 'NONE', difficulty: 'normal', n: 2, startRes: { gold: 120, food: 120, wood: 120 } }, spec), tribe);
  const t0 = Date.now();
  let firstErr = null;
  for (let t = 0; t < turns; t++) {
    try { HF.endTurn(g, HF.aiPlay); } catch (e) { firstErr = (firstErr || e); break; }
    if (g.over) break;
  }
  const counts = {};
  for (const c of g.cells) if (c && c.o === 1) counts[HF.BNAME[c.b] || 'vacío'] = (counts[HF.BNAME[c.b] || 'vacío'] || 0) + 1;
  const units = g.cells.filter(c => c && c.u && c.u.owner === 1).map(c => c.u.type).reduce((a, t) => (a[t] = (a[t] || 0) + 1, a), {});
  const terr = g.cells.filter(c => c && c.o === 1).length;
  const faults = HF.dipFaults ? HF.dipFaults() : {};
  console.log('---', label, '---');
  console.log('turns', g.turn, 'ms', Date.now() - t0, 'firstErr', firstErr && firstErr.message, 'faults', Object.keys(faults).length);
  console.log('AI terr', terr, 'units', JSON.stringify(units), 'bld', JSON.stringify(counts));
  console.log('AI gold/food/wood', g.f[1].gold, g.f[1].food, g.f[1].wood, 'net', JSON.stringify(g.f[1].economy.net), 'deficit', g.f[1].deficit);
  if (Object.keys(faults).length) console.log('fault detail', JSON.stringify(faults).slice(0, 600));
  return g;
}

run('plains 24', { size: 'small', seed: 4242, biome: 'plains' }, 24);
run('forest 20', { size: 'small', seed: 777, biome: 'forest' }, 20);
run('archipelago 20', { size: 'small', seed: 4242, biome: 'archipelago' }, 20);
