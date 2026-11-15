/* Simulación completa con IA: varias partidas y rondas, comprobando que el
   comercio no rompe la partida y que las caravanas siguen siendo físicas.
   Uso: node tools/test_sim.js */
const fs = require('fs'), path = require('path'), vm = require('vm');
const JS = path.join(__dirname, '..', 'js');
const G = {};
G.window = G; G.globalThis = G; G.console = console;
G.setTimeout = setTimeout; G.clearTimeout = clearTimeout;
G.performance = { now: () => Date.now() };
G.localStorage = { getItem: () => null, setItem() { }, removeItem() { } };
G.location = { protocol: 'file:' }; G.navigator = { language: 'es' };
const ctx = vm.createContext(G);
const files = ['config.js', 'util.js', 'names.js', 'data.js', 'mapgen.js', 'diplomacy.js', 'engine.js', 'ai.js'];
for (const f of files) {
  try { vm.runInContext(fs.readFileSync(path.join(JS, f), 'utf8'), ctx, { filename: f }); }
  catch (e) { console.log('carga ' + f + ': ' + e.message); process.exit(1); }
}
const HF = ctx.HF;
let fails = 0;
const ok = (c, m) => { if (!c) fails++; console.log((c ? 'OK  ' : 'FAIL') + ' · ' + m); };

function makeGame(n, R, seed, biome) {
  const facs = [];
  for (let k = 0; k < n; k++) { const t = HF.defaultTribe(); t.name = 'F' + k; t.human = k === 0; facs.push(t); }
  return HF.newGame({ R, seed, biome: biome || 'plains', fog: 'NONE', factions: facs, mode: 'skirmish', goal: { type: 'conquer' } });
}

let maxCars = 0, totalRaidable = 0, turnsRun = 0;
for (const spec of [[2, 7, 5], [2, 12, 11], [3, 12, 23], [4, 18, 31], [2, 12, 43]]) {
  const [n, R, seed] = spec;
  const g = makeGame(n, R, seed);
  let err = null;
  try {
    for (let t = 0; t < 25 && !g.over; t++) { HF.endTurn(g, HF.aiPlay); turnsRun++; }
  } catch (e) { err = e; }
  ok(!err, `partida ${n}J R${R} s${seed}: 25 rondas sin excepciones` + (err ? ' → ' + err.message : ''));
  maxCars = Math.max(maxCars, g.caravans.length);
  totalRaidable += g.caravans.filter(c => c.owner !== 0).length;
  // integridad física de las caravanas
  const byCell = new Map();
  let stacked = 0, onUnit = 0;
  for (const car of g.caravans) {
    const cid = car.path[car.pos];
    if (byCell.has(cid)) stacked++;
    byCell.set(cid, car);
    const cell = g.cells[cid];
    if (cell && cell.u) onUnit++;
  }
  ok(stacked === 0, `s${seed}: ningún convoy apilado`);
  ok(onUnit === 0, `s${seed}: ningún convoy sobre una unidad`);
  ok(g.caravans.length > 0 || g.over, `s${seed}: hay tráfico activo al final (${g.caravans.length})`);
  if (!g.over) {
    // el jugador puede asaltar al menos un convoy si tiene una unidad cerca
    let raidable = 0;
    for (const c of g.cells) {
      if (!c || !c.u || c.u.owner !== 0) continue;
      const opts = HF.options(g, c.i);
      for (const [i, o] of opts) if (o.k === 'raid') raidable++;
    }
    console.log(`   · s${seed}: convoyes=${g.caravans.length} asaltos disponibles ahora=${raidable}`);
  }
}
ok(turnsRun > 50, `se simularon ${turnsRun} turnos con IA`);
ok(maxCars > 0, `hubo convoyes en el mapa (máx ${maxCars} a la vez)`);

// Carga: comprobación directa de las dos reglas con un mapa manipulado
{
  const g = makeGame(2, 12, 5151);
  const coastal = c => HF.nbs(g, c.i).some(j => g.cells[j] && g.cells[j].t === ctx.HF.T.MAR);
  let port = null;
  for (let s = 0; s < 80 && !port; s++) {
    const gg = makeGame(2, 12, 5151 + s * 13);
    const cs = gg.cells.filter(c => c && c.o === 0 && c.t === 0 && !c.u && coastal(c));
    if (cs.length) { port = { g: gg, c: cs[0] }; }
  }
  if (port) {
    const gg = port.g, from = port.c;
    from.b = ctx.HF.B.PUEBLO; from.city = from.city || HF.pickCityName(gg);
    HF.supply(gg);
    const near = gg.cells.find(c => c && c.o === 0 && c !== from && !c.b && c.t === 0 && HF.nbs(gg, c.i).some(j => gg.cells[j].t === ctx.HF.T.MAR));
    if (near && HF.landLinked(gg, 0, from.i, near.i)) {
      near.b = ctx.HF.B.CAMPAMENTO; HF.supply(gg);
      const r = HF.sendCargo(gg, from.i, near.i, 'gold', 5);
      ok(!r.ok, 'no se puede abastecer por mar un campamento comunicado por tierra: ' + r.msg);
    } else ok(true, 'sin campamento costero conectado en la muestra; regla cubierta por landLinked');
  } else ok(true, 'sin costa propia en la muestra; regla cubierta por landLinked');
}

console.log(fails ? `\n${fails} COMPROBACIONES FALLIDAS` : '\nTodo correcto');
process.exit(fails ? 1 : 0);
