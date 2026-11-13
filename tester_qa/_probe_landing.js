'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const sandbox = { console, HF: {}, Date, Math, JSON, Map, Set, Int8Array, Int16Array, Uint8Array, Float32Array, performance: { now: () => Date.now() } };
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of ['util.js', 'config.js', 'data.js', 'names.js', 'mapgen.js', 'engine.js', 'diplomacy.js', 'diplomacy_ai.js', 'ai.js', 'progress.js'])
  vm.runInContext(fs.readFileSync(path.join('js', f), 'utf8'), sandbox, { filename: f });
const HF = sandbox.HF;
HF.updateFog = () => {}; HF.checkEnd = () => {}; HF.recordTimeline = () => {};
const tribe = Object.assign({ name: 'P', color: HF.COLORS[0], crest: HF.CRESTS[0] }, HF.PRESETS[0]);
for (let seed = 1; seed <= 40; seed++) {
  const g = HF.makeGame({ size: 'small', seed, biome: 'archipelago', fog: 'NONE', difficulty: 'normal', n: 2, startRes: { gold: 300, food: 300, wood: 300 } }, tribe);
  g.cur = 1;
  const a = HF.aiAnalysis(g, 1);
  if (!a) continue;
  // Buscar un componente que no sea el propio y tenga >=3 costas
  const cand = a.naval.scores.find(s => s.comp !== a.comp[a.capital ? a.capital.i : -1] && s.wd < 999);
  if (!cand) continue;
  // Buscar 3 playas de ese componente con agua adyacente libre
  const beaches = [];
  for (const c of g.cells) {
    if (!c || a.comp[c.i] !== cand.comp || c.t === HF.T.MAR) continue;
    for (const nb of g._grid.nb[c.i]) {
      const w = g.cells[nb];
      if (w && !w.u && (w.t === HF.T.MAR || w.t === HF.T.RIO)) {
        beaches.push({ land: c, water: nb });
        break;
      }
    }
  }
  if (beaches.length < 3) continue;
  g._aiNavalTarget = { comp: cand.comp, beach: beaches[0].land.i, until: g.turn + 8 };
  g._aiNavalSince = g.turn;
  // Crear 3 transportes con infantería
  for (let k = 0; k < 3; k++) {
    const b = beaches[k];
    g.cells[b.water].u = { type: 'BAR', tier: 1, owner: 1, mv: 1, at: 1, cargo: { type: 'INF', tier: 1, owner: 1, mv: 1, at: 1 } };
  }
  HF.aiPlay(g, 1);
  const onTarget = g.cells.filter(c => c && c.u && c.u.owner === 1 && a.comp[c.i] === cand.comp && c.u.type !== 'BAR');
  if (onTarget.length) {
    console.log('seed', seed, 'comp', cand.comp, 'beaches', beaches.length, 'landed', onTarget.map(c => c.u.type + '@' + c.i), 'targetCells', g.cells.filter(c => c && c.o === 1 && a.comp[c.i] === cand.comp).length);
    break;
  } else {
    console.log('seed', seed, 'comp', cand.comp, 'no landing; ships', g.cells.filter(c => c && c.u && c.u.owner === 1 && c.u.type === 'BAR').map(c => c.i + (c.u.cargo ? '+' : '-')).join(','));
  }
}
