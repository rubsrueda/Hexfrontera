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
const gr = g._grid;

// --- geometría ---
function landComp() {
  const comp = new Int16Array(g.cells.length).fill(-1); let n = 0;
  for (const d of gr.list) {
    if (comp[d.i] >= 0 || g.cells[d.i].t === HF.T.MAR) continue;
    const q = [d.i]; comp[d.i] = n;
    while (q.length) { const x = q.pop(); for (const y of gr.nb[x]) if (comp[y] < 0 && g.cells[y].t !== HF.T.MAR) { comp[y] = n; q.push(y); } }
    n++;
  }
  return { comp, n };
}
const { comp, n } = landComp();
const caps = g.f.map(f => g.cells.find(c => c && c.cap && c.o === f.id));
console.log('SETUP', JSON.stringify({ R: p.setup.R, biome: p.setup.biome, seed: p.setup.seed, difficulty: p.setup.difficulty, fog: p.setup.fog }));
console.log('CAPS', caps.map((c, i) => g.f[i].name + ' #' + c.i + ' comp' + comp[c.i] + ' q' + c.q + ' r' + c.r + ' dist' + HF.hexDist(c, caps[1 - i])));
let terr = 0, sea = 0, rio = 0, trees = 0;
for (const d of gr.list) { const c = g.cells[d.i]; if (c.t === HF.T.MAR) sea++; else terr++; if (c.t === HF.T.RIO) rio++; if (c.b === HF.B.ARBOL) trees++; }
console.log('CELLS', { land: terr, sea, rio, trees, comps: n });
// agua navegable: componentes
function waterComp() {
  const wc = new Int16Array(g.cells.length).fill(-1); let n = 0;
  for (const d of gr.list) {
    if (wc[d.i] >= 0 || g.cells[d.i].t !== HF.T.MAR) continue;
    const q = [d.i]; wc[d.i] = n;
    while (q.length) { const x = q.pop(); for (const y of gr.nb[x]) if (wc[y] < 0 && g.cells[y].t === HF.T.MAR) { wc[y] = n; q.push(y); } }
    n++;
  }
  return { wc, n };
}
const w = waterComp();
console.log('WATER COMPS', w.n);
// recursos cerca de capitales
for (let k = 0; k < 2; k++) {
  const c = caps[k]; const near = { trigo: 0, oro: 0, madera: 0, total: 0 };
  for (const d of gr.list) { const x = g.cells[d.i]; if (HF.hexDist(c, x) <= 3) { near.total++; if (x.res === HF.RES.TRIGO) near.trigo++; else if (x.res === HF.RES.ORO) near.oro++; else if (x.res === HF.RES.MADERA) near.madera++; } }
  console.log('NEAR CAP', g.f[k].name, JSON.stringify(near));
}
// articulaciones entre capitales (si están en la misma comp)
if (comp[caps[0].i] === comp[caps[1].i] && caps[0].i !== caps[1].i) {
  function connectedWithout(block) {
    const start = caps[0].i, target = caps[1].i;
    const seen = new Set([start, block]); const q = [start];
    for (let h = 0; h < q.length; h++) {
      const x = q[h]; if (x === target) return true;
      for (const y of gr.nb[x]) { const c = g.cells[y]; if (!c || seen.has(y) || c.t === HF.T.MAR) continue; seen.add(y); q.push(y); }
    }
    return false;
  }
  const cuts = [];
  for (const d of gr.list) {
    const c = g.cells[d.i];
    if (c.t === HF.T.MAR || d.i === caps[0].i || d.i === caps[1].i) continue;
    if (connectedWithout(d.i)) continue;
    // tamaño del trozo que queda con la capital 0
    const seen = new Set([d.i]); const q = [caps[0].i]; seen.add(caps[0].i);
    for (let h = 0; h < q.length; h++) { const x = q[h]; for (const y of gr.nb[x]) { const cc = g.cells[y]; if (!cc || seen.has(y) || cc.t === HF.T.MAR) continue; seen.add(y); q.push(y); } }
    cuts.push({ i: d.i, sideA: seen.size - 1, sideB: terr - seen.size, q: c.q, r: c.r });
  }
  cuts.sort((a, b) => Math.min(a.sideA, a.sideB) - Math.min(b.sideA, b.sideB));
  console.log('CHOKEPOINTS count', cuts.length);
  console.log('CHOKEPOINTS top', JSON.stringify(cuts.slice(0, 12)));
}
// acciones
function uname(u) { return u ? (HF.UNITS[u.type] || {}).name + 'N' + u.tier : '—'; }
function cell(i) { const c = g.cells[i]; return '#' + i + (c ? ' ' + (c.b ? HF.BNAME[c.b] : HF.TNAME[c.t]) + ' o' + c.o + (c.u ? '[' + uname(c.u) + ']' : '') : '?'); }
function desc(t) {
  const f = g.f[g.cur]; const who = f ? f.name : 'F' + g.cur;
  if (t[0] === 1) { const u = g.cells[t[1]] && g.cells[t[1]].u; return who + ': ' + uname(u) + ' ' + cell(t[1]) + ' -> ' + cell(t[2]) + ' [' + (t[3] || 'move') + ']'; }
  if (t[0] === 2) return who + ': BUILD ' + HF.BNAME[t[1]] + ' en ' + cell(t[2]);
  if (t[0] === 3) return who + ': RECRUIT ' + ((HF.UNITS[t[1]] || {}).name || t[1]) + ' en ' + cell(t[2]);
  if (t[0] === 5) return who + ': LOAN ' + cell(t[1]);
  if (t[0] === 10) return who + ': BANK ' + t[2] + ' ' + t[1] + ' ' + cell(t[3]);
  return who + ': ' + JSON.stringify(t);
}
console.log('--- LOG ---');
for (let idx = 0; idx < p.log.length; idx++) {
  const t = p.log[idx];
  if (t[0] === 4) {
    console.log('--- fin fase ' + (g.f[g.cur] && g.f[g.cur].name) + ' T' + g.turn + ' rng=' + (t.length > 1));
    if (g.f[g.cur] && !g.f[g.cur].human) {
      const r = HF.aiReport(g, g.cur);
      console.log('  IA', JSON.stringify({ stance: r.stance, enemy: r.enemy, res: r.resources, terr: r.territory, units: r.units, bld: r.buildings, naval: r.naval, cut: r.cutTargets.slice(0, 3), raid: r.raid }));
    }
    HF.replayPhase(g, t[1]);
  } else { console.log('  ' + desc(t)); HF.replayApply(g, t); }
}
// estado final
function stat() {
  return g.f.map(f => { let te = 0, un = 0; const b = {}; for (const c of g.cells) { if (!c) continue; if (c.o === f.id) { te++; if (c.b) b[HF.BNAME[c.b]] = (b[HF.BNAME[c.b]] || 0) + 1; } if (c.u && c.u.owner === f.id) un++; } return { name: f.name, te, un, b, gold: f.gold, food: f.food, wood: f.wood }; });
}
console.log('FINAL T' + g.turn, JSON.stringify(stat(), null, 1));
// ASCII
const sym = c => {
  if (!c) return ' ';
  if (c.t === HF.T.MAR) return '~';
  if (c.b === HF.B.CIUDAD) return 'C';
  if (c.b === HF.B.PUEBLO) return 'P';
  if (c.b === HF.B.BASTION) return 'B';
  if (c.b === HF.B.CAMPAMENTO) return 'c';
  if (c.b === HF.B.ARBOL) return 'T';
  if (c.t === HF.T.MONTANA) return '^';
  if (c.t === HF.T.COLINA) return 'n';
  if (c.t === HF.T.RIO) return '=';
  return '.';
};
console.log('--- MAPA (T=' + g.turn + ') ~ mar, . llano, n colina, ^ montaña, T árbol, C/P/B/c asentamientos; unidades: i=INF, a=ARC, e=ENG, k=CAB, s=SIE, b=BAR ---');
for (let r = -p.setup.R; r <= p.setup.R; r++) {
  let line = '';
  for (let q = -p.setup.R; q <= p.setup.R; q++) {
    if (Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) > p.setup.R) { line += ' '; continue; }
    const idx = gr.idx(q, r); const c = idx != null ? g.cells[idx] : null;
    if (!c) { line += ' '; continue; }
    let ch = sym(c);
    if (c.u) ch = ({ INF: 'i', ARC: 'a', ENG: 'e', CAB: 'k', SIE: 's', BAR: 'b' })[c.u.type] || 'u';
    if (c.cap) ch = c.o === 0 ? '@' : '#';
    line += ch;
  }
  console.log(line);
}
