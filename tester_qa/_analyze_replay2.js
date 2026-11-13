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
const p = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', '_gen', 'replay_payload2.json'), 'utf8'));
const g = HF.newGame(Object.assign({}, p.setup, { isReplay: true }));
g.fog = 'NONE'; g.fogMap = null; HF.updateFog(g);
const comp = HF.aiAnalysis(g, 1).comp;
console.log('SETUP', JSON.stringify({ R: p.setup.R, biome: p.setup.biome, seed: p.setup.seed, difficulty: p.setup.difficulty, factions: p.setup.factions.map(f => f.name) }));
console.log('COMPS', g.f.map(f => { const c = g.cells.find(x => x && x.cap && x.o === f.id); return f.name + ' cap#' + (c && c.i) + ' comp' + (c && comp[c.i]); }));
function uname(u) { return u ? (HF.UNITS[u.type] || {}).name + ' N' + u.tier : '—'; }
function cell(i) { const c = g.cells[i]; return '#' + i + ' ' + (c ? (c.b ? HF.BNAME[c.b] : HF.TNAME[c.t]) + ' o' + c.o + (c.u ? '[' + uname(c.u) + ']' : '') : '?'); }
function desc(t) {
  const f = g.f[g.cur]; const who = f ? f.name : 'F' + g.cur;
  if (t[0] === 1) { const u = g.cells[t[1]] && g.cells[t[1]].u; return who + ' ' + (u ? uname(u) : '?') + ' ' + cell(t[1]) + ' -> ' + cell(t[2]) + ' [' + (t[3] || 'move') + ']'; }
  if (t[0] === 2) return who + ' BUILD ' + HF.BNAME[t[1]] + ' en ' + cell(t[2]);
  if (t[0] === 3) return who + ' RECRUIT ' + ((HF.UNITS[t[1]] || {}).name || t[1]) + ' en ' + cell(t[2]);
  if (t[0] === 5) return who + ' LOAN ' + cell(t[1]);
  if (t[0] === 10) return who + ' BANK ' + t[2] + ' ' + t[1] + ' ' + cell(t[3]);
  return who + ' ' + JSON.stringify(t);
}
for (let idx = 0; idx < p.log.length; idx++) {
  const t = p.log[idx];
  if (t[0] === 4) {
    console.log('--- fin fase', g.f[g.cur] && g.f[g.cur].name, 'T' + g.turn, 'rng?', t.length > 1);
    if (!g.f[g.cur].human) {
      const r = HF.aiReport(g, g.cur);
      console.log('  REPORT', JSON.stringify({ stance: r.stance, enemy: r.enemy, terr: r.territory, units: r.units, res: r.resources, bld: r.buildings, naval: r.naval, cut: r.cutTargets.slice(0, 2), raid: r.raid }));
    }
    HF.replayPhase(g, t[1]);
  } else {
    console.log('  ' + desc(t));
    HF.replayApply(g, t);
  }
}
function stats() {
  return g.f.map(f => {
    let terr = 0, units = 0; const b = {};
    for (const c of g.cells) {
      if (!c) continue;
      if (c.o === f.id) { terr++; if (c.b) b[HF.BNAME[c.b]] = (b[HF.BNAME[c.b]] || 0) + 1; }
      if (c.u && c.u.owner === f.id) units++;
    }
    return { name: f.name, human: f.human, terr, units, b, gold: f.gold, food: f.food, wood: f.wood };
  });
}
console.log('END turn', g.turn, 'over', JSON.stringify(g.over), JSON.stringify(stats(), null, 1));
for (const id of [0, 1]) {
  const a = HF.aiAnalysis(g, id);
  console.log('AI' + id, 'stance', a.stance, 'enemy', a.enemy, 'myPower', a.myPower, 'enemyPower', a.enemyPower, 'naval', a.naval.targetComp, a.naval.needTransport, 'scores', JSON.stringify(a.naval.scores), 'raid', JSON.stringify(a.raid));
}
