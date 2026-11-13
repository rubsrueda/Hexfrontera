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
for (const t of p.log) { if (t[0] === 4) HF.replayPhase(g, t[1]); else HF.replayApply(g, t); }
const gr = g._grid;
const comp = (() => { const a = new Int16Array(g.cells.length).fill(-1); let n = 0; for (const d of gr.list) { if (a[d.i] >= 0 || g.cells[d.i].t === HF.T.MAR) continue; const q = [d.i]; a[d.i] = n; while (q.length) { const x = q.pop(); for (const y of gr.nb[x]) if (a[y] < 0 && g.cells[y].t !== HF.T.MAR) { a[y] = n; q.push(y); } } n++; } return a; })();
const caps = g.f.map(f => g.cells.find(c => c && c.cap && c.o === f.id));
const cuts = [435, 410, 386, 214];
function region(block, from) {
  const seen = new Set([block, from]), q = [from];
  for (let h = 0; h < q.length; h++) { const x = q[h]; for (const y of gr.nb[x]) { const c = g.cells[y]; if (!c || seen.has(y) || c.t === HF.T.MAR) continue; seen.add(y); q.push(y); } }
  return seen;
}
function sideStats(set) {
  const o = {}; let units = 0, settles = 0, res = 0;
  for (const i of set) { const c = g.cells[i]; if (!c) continue; o[c.o] = (o[c.o] || 0) + 1; if (c.u) units++; if (c.b === HF.B.PUEBLO || c.b === HF.B.CIUDAD || c.b === HF.B.BASTION) settles++; if (c.res) res++; }
  return { cells: set.size, owners: o, units, settles, res };
}
for (const ci of cuts) {
  const a = region(ci, caps[0].i);
  const b = region(ci, caps[1].i);
  console.log('CUT #' + ci, 'q' + g.cells[ci].q + ',r' + g.cells[ci].r, 'A(human side)', JSON.stringify(sideStats(a)), 'B(AI side)', JSON.stringify(sideStats(b)));
  // ¿hay unidad justo en el cuello?
  const c = g.cells[ci];
  console.log('  cell', c.b ? HF.BNAME[c.b] : HF.TNAME[c.t], 'owner', c.o, 'unit', c.u && c.u.type, 'res', c.res);
}
// islas neutrales
const islands = {};
for (const d of gr.list) {
  const c = g.cells[d.i]; if (c.t === HF.T.MAR) continue;
  const k = comp[d.i]; const o = islands[k] = islands[k] || { cells: 0, own: {}, settles: 0, res: 0, coast: 0 };
  o.cells++; o.own[c.o] = (o.own[c.o] || 0) + 1; if (c.b === HF.B.PUEBLO || c.b === HF.B.CIUDAD) o.settles++; if (c.res) o.res++;
  if (HF.nbs(g, d.i).some(j => g.cells[j] && g.cells[j].t === HF.T.MAR)) o.coast++;
}
console.log('ISLANDS', JSON.stringify(islands));
// capitales y distancias
console.log('CAPS', caps.map((c, i) => ({ name: g.f[i].name, i: c.i, q: c.q, r: c.r, comp: comp[c.i] })));
// unidades actuales
console.log('UNITS', g.cells.filter(c => c && c.u).map(c => ({ i: c.i, o: c.o, u: c.u.type + 'N' + c.u.tier, q: c.q, r: c.r })));
