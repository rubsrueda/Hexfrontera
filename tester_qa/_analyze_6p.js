'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const sandbox = { console, HF: {}, Date, Math, JSON, Map, Set, Int8Array, Int16Array, Int32Array, Uint8Array, Float32Array, Array, Object, String, Number, Boolean, Error, performance: { now: () => Date.now() }, Blob, Response, CompressionStream, DecompressionStream, btoa: s => Buffer.from(s, 'binary').toString('base64'), atob: s => Buffer.from(s, 'base64').toString('binary') };
sandbox.window = sandbox; sandbox.globalThis = sandbox; vm.createContext(sandbox);
for (const f of ['util.js', 'config.js', 'data.js', 'names.js', 'mapgen.js', 'engine.js', 'diplomacy.js', 'diplomacy_ai.js', 'replay.js', 'progress.js', 'ai.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox, { filename: f });
const HF = sandbox.HF; HF.updateFog = () => {}; HF.checkEnd = () => {}; HF.recordTimeline = () => {};
const attacks = {};
const origAct = HF.act;
HF.act = function (g, from, to, kind) {
  const u = g.cells[from] && g.cells[from].u;
  const r = origAct.apply(this, arguments);
  if (r && r.ok && kind === 'atk' && u && u.owner != null) {
    const t = g.cells[to];
    const def = t && t.u && t.u.owner != null ? t.u.owner : (t ? t.o : -1);
    const key = u.owner + '>' + def;
    attacks[key] = (attacks[key] || 0) + 1;
  }
  return r;
};
const g = HF.makeGame({ mode: 'skirmish', size: 'large', seed: 60606, n: 6, biome: 'archipelago', fog: 'NONE', difficulty: 'hard', startRes: { gold: 80, food: 80, wood: 80 } }, HF.loadTribe());
const ids = g.f.map(f => f.id);
console.log('factions', g.f.map(f => f.name + (f.human ? '(H)' : '')).join(' | '));
for (let t = 0; t < 30; t++) {
  HF.endTurn(g, HF.aiPlay);
  if (g.turn === 6 || g.turn === 11 || g.turn === 16 || g.turn === 21 || g.turn === 26) {
    console.log('\n=== T' + g.turn + ' ===');
    for (const id of ids) {
      const f = g.f[id]; if (!f.alive) { console.log(id, f.name, 'DEAD'); continue; }
      const a = HF.aiAnalysis(g, id);
      let terr = 0, units = 0; const b = {};
      for (const c of g.cells) { if (!c) continue; if (c.o === id) { terr++; if (c.b) b[HF.BNAME[c.b]] = (b[HF.BNAME[c.b]] || 0) + 1; } if (c.u && c.u.owner === id) units++; }
      const naps = (f.diplomacy && f.diplomacy.treaties || []).filter(x => x && x.type && x.type !== 'WAR' && x.active !== false).map(x => x.type + ':' + (x.a === id ? x.b : x.a)).join(',');
      console.log(id, f.name, (f.human ? 'H' : 'AI'), 'enemy', a.enemy, 'stance', a.stance, 'terr', terr, 'units', units, 'bld', JSON.stringify(b), 'naval', a.naval.targetComp + '/' + a.naval.shipsWanted, 'ships', a.myShips.length, 'naps', naps || '-');
    }
  }
}
console.log('\nATTACKS', JSON.stringify(attacks, null, 1));
const final = {};
for (const id of ids) { const f = g.f[id]; final[f.name] = { alive: f.alive, terr: g.cells.filter(c => c && c.o === id).length, units: g.cells.filter(c => c && c.u && c.u.owner === id).length }; }
console.log('FINAL T' + g.turn, JSON.stringify(final, null, 1));
console.log('over', JSON.stringify(g.over));
