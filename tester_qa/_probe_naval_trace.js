'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const sandbox = { console, HF: {}, Date, Math, JSON, Map, Set, Int8Array, Int16Array, Uint8Array, Float32Array, performance: { now: () => Date.now() } };
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of ['util.js', 'config.js', 'data.js', 'names.js', 'mapgen.js', 'engine.js', 'diplomacy.js', 'diplomacy_ai.js', 'progress.js', 'ai.js'])
  vm.runInContext(fs.readFileSync(path.join('js', f), 'utf8'), sandbox, { filename: f });
const HF = sandbox.HF;
HF.updateFog = () => {}; HF.checkEnd = () => {}; HF.recordTimeline = () => {};
let g;
const origAct = HF.act, origRecruit = HF.recruit, origBuild = HF.build;
HF.act = function (gg, from, to, kind) {
  const u = gg.cells[from] && gg.cells[from].u;
  let optInfo = '';
  try {
    const o = HF.options(gg, from).get(to);
    if (o) optInfo = 'ship=' + !!o.ship + ' ok=' + !!o.ok + ' o=' + gg.cells[to].o + ' b=' + gg.cells[to].b;
  } catch (e) { optInfo = 'optErr'; }
  const r = origAct.apply(this, arguments);
  if (gg === g && u && u.owner === 1) {
    const a = HF.aiAnalysis(gg, 1);
    console.log('   ACT', u.type + 'N' + u.tier, from, '->', to, kind || '', r && r.ok ? 'ok' : 'FAIL', optInfo, 'toComp', a.comp[to], 'target', a.naval.targetComp, 'beach', a.naval.beach, 'cargo', u.cargo && u.cargo.type);
  }
  return r;
};
HF.recruit = function (gg, type, ci, comp) { const r = origRecruit.apply(this, arguments); if (gg === g && r.ok) console.log('   RECRUIT', type, ci); return r; };
HF.build = function (gg, b, ci) { const r = origBuild.apply(this, arguments); if (gg === g && r.ok) console.log('   BUILD', HF.BNAME[b], ci); return r; };

const tribe = Object.assign({ name: 'P', color: HF.COLORS[0], crest: HF.CRESTS[0] }, HF.PRESETS[0]);
g = HF.makeGame({ size: 'small', seed: 4242, biome: 'archipelago', fog: 'NONE', difficulty: 'normal', n: 2, startRes: { gold: 200, food: 200, wood: 200 } }, tribe);
const cap0 = g.cells.find(c => c && c.o === 0 && c.b === HF.B.CIUDAD);
const cap1 = g.cells.find(c => c && c.o === 1 && c.b === HF.B.CIUDAD);
function bfsPath(from, to) { const prev = new Map([[from, -1]]), q = [from], gr = g._grid; for (let h = 0; h < q.length; h++) { const x = q[h]; if (x === to) { const p = []; let c = to; while (c !== from) { p.push(c); c = prev.get(c); } return p.reverse(); } for (const y of gr.nb[x]) { const n = g.cells[y]; if (!n || prev.has(y) || n.t === HF.T.MAR) continue; prev.set(y, x); q.push(y); } } return null; }
const p = bfsPath(cap0.i, cap1.i); const mid = p[Math.floor(p.length / 2)]; g.cells[mid].t = HF.T.MAR; g.cells[mid].b = 0; g.cells[mid].res = 0; g.cells[mid].u = null; g._aiComp = null; HF.supply(g); HF.initStock(g); HF.updateFog(g);
const targetComp = 2;
for (let t = 0; t < 14; t++) {
  console.log('--- turn', g.turn);
  HF.endTurn(g, HF.aiPlay);
  const ships = g.cells.filter(c => c && c.u && c.u.owner === 1 && c.u.type === 'BAR');
  const landed = g.cells.filter(c => c && c.u && c.u.owner === 1 && HF.aiAnalysis(g, 1).comp[c.i] === targetComp);
  console.log('  after ships', ships.map(c => c.i + (c.u.cargo ? '(' + c.u.cargo.type + ')' : '')).join(','), 'landed', landed.map(c => c.u.type + '@' + c.i).join(','), 'food', g.f[1].food);
}
