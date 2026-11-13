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

const origAct = HF.act, origBuild = HF.build, origRecruit = HF.recruit, origBank = HF.bankExchange, origLoan = HF.loan;
function name(i) { return (HF.BNAME[g.cells[i].b] || '?') + '@' + i; }
let g;
HF.act = function (gg, from, to, kind) {
  const u = gg.cells[from] && gg.cells[from].u;
  const r = origAct.apply(this, arguments);
  if (gg === g && u && u.owner === 1) {
    console.log('   ACT', u.type + 'N' + u.tier, from, '->', to, kind || '', r && r.ok ? 'ok' : 'FAIL ' + (r && r.msg || ''));
  }
  return r;
};
HF.build = function (gg, b, ci) { const r = origBuild.apply(this, arguments); if (gg === g && r.ok) console.log('   BUILD', HF.BNAME[b], ci, 'o' + gg.cells[ci].o); return r; };
HF.recruit = function (gg, type, ci, comp, tier) { const r = origRecruit.apply(this, arguments); if (gg === g && r.ok) console.log('   RECRUIT', type, ci, 'comp' + comp); return r; };
HF.bankExchange = function (gg, ci, target, qty) { const r = origBank.apply(this, arguments); if (gg === g && r.ok) console.log('   BANK', target, qty, 'cost', r.cost); return r; };
HF.loan = function (gg, ci) { const r = origLoan.apply(this, arguments); if (gg === g && r.ok) console.log('   LOAN', ci, r.amount); return r; };

function sim(label, spec, turns) {
  const tribe = Object.assign({ name: 'Prueba', color: HF.COLORS[0], crest: HF.CRESTS[0] }, HF.PRESETS[0]);
  g = HF.makeGame(Object.assign({ fog: 'NONE', difficulty: 'normal', n: 2, startRes: { gold: 120, food: 120, wood: 120 } }, spec), tribe);
  console.log('\n====', label);
  for (let t = 0; t < turns; t++) {
    console.log('--- turn', g.turn, 'AI units', g.cells.filter(c => c && c.u && c.u.owner === 1).map(c => c.u.type + '@' + c.i + '(' + (c.q + ',' + c.r) + ')').join(' '));
    const a = HF.aiAnalysis(g, 1);
    console.log('  stance', a.stance, 'enemy', a.enemy, 'df@cap', a.capital ? a.df[a.capital.i] : '-', 'naval', JSON.stringify({ target: a.naval.targetComp, beach: a.naval.beach, need: a.naval.needTransport, load: [...a.naval.loadCells], stranded: [...a.naval.stranded], shipsWanted: a.naval.shipsWanted }));
    for (const c of g.cells) if (c && c.u && c.u.owner === 1 && c.u.type === 'BAR') {
      const o = HF.options(g, c.i);
      console.log('  SHIP', c.i, 'cargo', c.u.cargo && c.u.cargo.type, 'wf', a.naval.wf && a.naval.wf[c.i], 'opts', [...o.entries()].slice(0, 12).map(([to, x]) => to + ':' + x.k + (x.ship ? 's' : '') + (x.ok ? '!' : '')).join(','));
    }
    HF.endTurn(g, HF.aiPlay);
    console.log('  after: food', g.f[1].food, 'wood', g.f[1].wood, 'gold', g.f[1].gold, 'terr', g.cells.filter(c => c && c.o === 1).length);
  }
}
sim('archipelago', { size: 'small', seed: 4242, biome: 'archipelago' }, 4);
sim('plains', { size: 'small', seed: 4242, biome: 'plains' }, 4);
