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

function info(g, tag) {
  const comp = HF.aiAnalysis(g, 1).comp;
  const caps = g.cells.map((c, i) => c && c.cap ? i : -1).filter(i => i >= 0);
  console.log(tag, 'turn', g.turn, 'caps', caps.map(i => i + ':o' + g.cells[i].o + ':c' + comp[i] + ':' + HF.BNAME[g.cells[i].b]));
  for (const o of g.f) {
    const terr = g.cells.filter(c => c && c.o === o.id).length;
    const units = g.cells.filter(c => c && c.u && c.u.owner === o.id).length;
    console.log('  f' + o.id, o.name, 'terr', terr, 'units', units, 'gold/food/wood', o.gold, o.food, o.wood);
  }
}

function sim(label, spec, turns) {
  const tribe = Object.assign({ name: 'Prueba', color: HF.COLORS[0], crest: HF.CRESTS[0] }, HF.PRESETS[0]);
  const g = HF.makeGame(Object.assign({ fog: 'NONE', difficulty: 'normal', n: 2, startRes: { gold: 120, food: 120, wood: 120 } }, spec), tribe);
  console.log('\n====', label, 'seed', spec.seed);
  info(g, 'start');
  for (let t = 0; t < turns; t++) {
    const ev0 = g.events.length;
    HF.endTurn(g, HF.aiPlay);
    if (t < 6 || t % 5 === 0) {
      const evs = g.events.slice(ev0).map(e => e.txt).filter(x => /conquist|perdid|fusion|tala|Reliquia|Banca|Empréstito|asedio|Cerc|AISLADO|hambr/i.test(x));
      const a = HF.aiAnalysis(g, 1);
      console.log(' t' + g.turn, 'stance', a.stance, 'enemy', a.enemy, 'naval', a.naval.targetComp + '/' + a.naval.beach + '/wf:' + (a.naval.wf ? 'y' : 'n') + '/need:' + a.naval.needTransport + '/ships:' + a.myShips.length, 'units', a.myUnits.length, 'terr', g.cells.filter(c => c && c.o === 1).length, 'guard', Object.keys(a.guard || {}).length);
      if (evs.length) console.log('   ev:', evs.slice(0, 5).join(' | '));
    }
    if (g.over) { console.log('over', g.over); break; }
  }
  info(g, 'end');
}

sim('plains', { size: 'small', seed: 4242, biome: 'plains' }, 12);
sim('archipelago', { size: 'small', seed: 4242, biome: 'archipelago' }, 12);
