'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const sandbox = { console, HF: {}, Date, Math, JSON, Map, Set, Int8Array, Int16Array, Uint8Array, Float32Array, performance: { now: () => Date.now() } };
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of ['util.js', 'config.js', 'data.js', 'names.js', 'mapgen.js', 'engine.js', 'diplomacy.js', 'diplomacy_ai.js', 'progress.js', 'ai.js'])
  vm.runInContext(fs.readFileSync(path.join('js', f), 'utf8'), sandbox, { filename: f });
const HF = sandbox.HF;
HF.updateFog = () => {}; HF.checkEnd = () => {}; HF.recordTimeline = () => {};
const tribe = Object.assign({ name: 'P', color: HF.COLORS[0], crest: HF.CRESTS[0] }, HF.PRESETS[0]);
const g = HF.makeGame({ size: 'small', seed: 4242, biome: 'archipelago', fog: 'NONE', difficulty: 'normal', n: 2, startRes: { gold: 200, food: 200, wood: 200 } }, tribe);
const cap0 = g.cells.find(c => c && c.o === 0 && c.b === HF.B.CIUDAD);
const cap1 = g.cells.find(c => c && c.o === 1 && c.b === HF.B.CIUDAD);
function bfs(f, t) { const p = new Map([[f, -1]]), q = [f]; for (let h = 0; h < q.length; h++) { const x = q[h]; if (x === t) { const a = []; let c = t; while (c !== f) { a.push(c); c = p.get(c); } return a.reverse(); } for (const y of g._grid.nb[x]) { const n = g.cells[y]; if (!n || p.has(y) || n.t === HF.T.MAR) continue; p.set(y, x); q.push(y); } } }
const p = bfs(cap0.i, cap1.i); const mid = p[Math.floor(p.length / 2)]; g.cells[mid].t = HF.T.MAR; g.cells[mid].b = 0; g.cells[mid].res = 0; g.cells[mid].u = null; g._aiComp = null; HF.supply(g); HF.initStock(g); HF.updateFog(g);
HF._aiShipTrace = d => { if (d.to === 81 || d.to === 82) console.log('SHIPTRACE', JSON.stringify(d)); };
HF._aiShipNoAct = d => { if (d.cargo) console.log('NOACT', JSON.stringify(d)); };
const origRecruit = HF.recruit;
HF.recruit = function (gg, type, ci, comp) {
  const r = origRecruit.apply(this, arguments);
  if (gg === g && type === 'BAR') console.log('RECRUIT BAR', ci, comp, r && r.ok, r && r.msg);
  return r;
};
for (let t = 0; t < 14; t++) {
  const prevCur = g.cur; g.cur = 1;
  const scan = HF.recruitScan(g, 'BAR').size;
  const a = HF.aiAnalysis(g, 1);
  g.cur = prevCur;
  console.log('TURN', g.turn, 'gold', g.f[1].gold, 'food', g.f[1].food, 'wood', g.f[1].wood, 'ships', g.cells.filter(c => c && c.u && c.u.owner === 1 && c.u.type === 'BAR').length, 'BARscan', scan, 'naval', a.naval.targetComp, a.naval.needTransport, a.naval.shipsWanted, a.naval.targetHasSettle);
  HF.endTurn(g, HF.aiPlay);
}
const a = HF.aiAnalysis(g, 1);
console.log('ctx naval target', a.naval.targetComp, 'myComps', [...a.myComps], 'comp81', a.comp[81], 'comp82', a.comp[82], 'comp54', a.comp[54]);
console.log('landed comp2', g.cells.filter(c => c && c.u && c.u.owner === 1 && a.comp[c.i] === 2).map(c => c.u.type + '@' + c.i));
