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

const tribe = Object.assign({ name: 'Prueba', color: HF.COLORS[0], crest: HF.CRESTS[0] }, HF.PRESETS[0]);
const g = HF.makeGame({ size: 'small', seed: 4242, biome: 'plains', fog: 'NONE', difficulty: 'normal', n: 2, startRes: { gold: 120, food: 120, wood: 120 } }, tribe);
for (let t = 0; t < 12; t++) HF.endTurn(g, HF.aiPlay);
console.log('turn', g.turn, 'AI food', g.f[1].food, 'gold', g.f[1].gold, 'wood', g.f[1].wood);
console.log('net', JSON.stringify(g.f[1].economy.net), 'inc', JSON.stringify(g.f[1].economy.income), 'exp', JSON.stringify(g.f[1].economy.expenses));
const cap0 = g.cells.find(c => c && c.o === 0 && c.b === HF.B.CIUDAD);
console.log('player city', cap0 && cap0.i, 'def', cap0 && HF.defenseAt(g, cap0.i), 'unit', cap0 && cap0.u && cap0.u.type + cap0.u.tier);
const units = g.cells.filter(c => c && c.u && c.u.owner === 1);
const byType = {};
for (const c of units) byType[c.u.type + c.u.tier] = (byType[c.u.type + c.u.tier] || 0) + 1;
console.log('AI units', JSON.stringify(byType));
if (cap0) {
  const near = units.map(c => ({ i: c.i, t: c.u.type + c.u.tier, d: HF.hexDist(c, cap0) })).sort((a, b) => a.d - b.d).slice(0, 12);
  console.log('nearest to city', JSON.stringify(near));
  for (const n of near.slice(0, 4)) {
    const opts = HF.options(g, n.i);
    const atks = [...opts.entries()].filter(([to, o]) => o.k === 'atk' && o.ok).map(([to, o]) => to + ':' + o.A + '>' + o.D);
    console.log('  unit', n.i, n.t, 'atkOpts', atks.slice(0, 6).join(','));
  }
}
console.log('AI buildings', g.cells.filter(c => c && c.o === 1 && c.b).map(c => HF.BNAME[c.b] + '@' + c.i).join(' '));
