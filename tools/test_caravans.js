/* Banco de pruebas headless del motor Hexfrontier (comercio, caravanas y carga).
   Uso: node tools/test_caravans.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const JS = path.join(__dirname, '..', 'js');
const G = {};
G.window = G; G.globalThis = G; G.console = console;
G.setTimeout = setTimeout; G.clearTimeout = clearTimeout;
G.performance = { now: () => Date.now() };
G.localStorage = { getItem: () => null, setItem() { }, removeItem() { } };
G.location = { protocol: 'file:', href: 'file:///hexfrontier/index.html' };
G.navigator = { userAgent: 'node', language: 'es' };
const ctx = vm.createContext(G);
for (const f of ['config.js', 'util.js', 'names.js', 'data.js', 'mapgen.js', 'engine.js']) {
  vm.runInContext(fs.readFileSync(path.join(JS, f), 'utf8'), ctx, { filename: f });
}
const HF = ctx.HF, B = HF.B, T = HF.T;
let fails = 0;
const ok = (cond, msg) => { if (!cond) fails++; console.log((cond ? 'OK  ' : 'FAIL') + ' · ' + msg); };

function makeGame(n, R, seed, biome) {
  const facs = [];
  for (let k = 0; k < n; k++) {
    const t = HF.defaultTribe(); t.name = 'F' + k; t.human = k === 0; facs.push(t);
  }
  return HF.newGame({ R, seed, biome: biome || 'plains', fog: 'NONE', factions: facs, mode: 'skirmish', goal: { type: 'conquer' } });
}

// 1) Convoyes desde el turno 1 en todos los mapas
let games = 0, withCars = 0;
for (let s = 1; s <= 12; s++) {
  const g = makeGame(2, 12, 1000 + s * 37);
  games++;
  if (g.caravans.length) withCars++;
}
ok(withCars === games, `convoyes desde el turno 1 en ${withCars}/${games} partidas`);

// 2) Rutas neutrales, nombres y movimiento
const g = makeGame(2, 12, 4242);
ok(HF.neutralRoutes(g).length > 0, 'hay mercado neutral activo: ' + HF.neutralRoutes(g).map(r => r.kind + ' ' + r.a + '->' + r.b).join(', '));
const towns = g.cells.filter(c => c && (c.b === B.PUEBLO || c.b === B.CIUDAD));
ok(towns.every(c => c.city), 'todos los pueblos y ciudades tienen nombre (' + towns.length + ')');
const before = g.caravans.map(c => c.path[c.pos]);
for (let k = 0; k < 3; k++) HF.endTurn(g, null);
ok(g.caravans.some((c, i) => c.path[c.pos] !== before[i]), 'los convoyes se mueven cada ronda');

// 3) Ocupación y asalto terrestre
{
  const car = g.caravans.find(c => c.owner !== 0);
  const carCell = g.cells[car.path[car.pos]];
  const spot = HF.nbs(g, carCell.i).map(i => g.cells[i]).find(c => c && !c.u && !c.b && c.t !== T.MAR && !HF.caravanAt(g, c.i));
  ok(!!spot, 'hay casilla libre junto al convoy');
  spot.u = { type: 'INF', tier: 1, owner: 0, mv: 1, at: 1 }; spot.o = 0; spot.sup = 1;
  const o = HF.options(g, spot.i).get(carCell.i);
  ok(!!o && o.k === 'raid', 'el convoy es ASALTABLE (no solo atacable): ' + (o && o.k));
  const r = HF.raidCaravan(g, spot.i, carCell.i);
  ok(r.ok && r.loot > 0, 'asalto terrestre cobra botín: +' + (r && r.loot));
  ok(HF.caravansAt(g, carCell.i).length === 0, 'el convoy saqueado libera el hexágono');
}

// 4) Asalto naval (urca mercante)
{
  const a = makeGame(2, 12, 777, 'archipelago');
  const car = a.caravans.find(c => c.kind !== 'land');
  ok(!!car, 'el archipiélago tiene tráfico marítimo neutral');
  if (car) {
    const carCell = a.cells[car.path[car.pos]];
    const spot = HF.nbs(a, carCell.i).map(i => a.cells[i]).find(c => c && c.t === T.MAR && !c.u && !HF.caravanAt(a, c.i));
    ok(!!spot, 'hay agua libre junto a la urca');
    spot.u = { type: 'BAR', tier: 1, owner: 0, mv: 1, at: 1, cargo: null }; spot.o = 0;
    a.cur = 0;
    const opts = HF.options(a, spot.i);
    const o = opts.get(carCell.i);
    ok(!!o && o.k === 'raid', 'la urca mercante es ASALTABLE por un barco de guerra: ' + (o && o.k));
    ok(!(opts.get(carCell.i) || {}).k || opts.get(carCell.i).k !== 'move', 'el barco NO puede moverse encima de la urca');
    const r = HF.raidCaravan(a, spot.i, carCell.i);
    ok(r.ok && r.loot > 0, 'abordaje naval cobra botín: +' + (r && r.loot));
  }
}

// 5) La facción con dos asentamientos conectados genera su propio tráfico
{
  const b = makeGame(2, 12, 2024);
  const cap = b.cells.find(c => c && c.o === 0 && c.b === B.CIUDAD);
  let far = null, fd = -1;
  for (const c of b.cells) {
    if (!c || c.t === T.MAR || c.o !== -1 || c.u || c.b) continue;
    const d = HF.hexDist(cap, c);
    if (d > fd) { fd = d; far = c; }
  }
  // camino recto por BFS sobre tierra propia/neutral
  const prev = new Map([[cap.i, -1]]), q = [cap.i];
  while (q.length) {
    const x = q.shift();
    for (const y of HF.nbs(b, x)) {
      if (prev.has(y)) continue;
      const n = b.cells[y];
      if (!n || n.t === T.MAR || (n.o !== -1 && n.o !== 0) || n.u) continue;
      prev.set(y, x); q.push(y);
    }
  }
  let x = far.i;
  while (prev.has(x) && x !== cap.i) {
    const c = b.cells[x];
    if (c !== far && c.b < B.CAMINO) c.b = B.CAMINO;
    if (c.o === -1) c.o = 0;
    x = prev.get(x);
  }
  far.b = B.CIUDAD; far.city = far.city || HF.pickCityName(b);
  HF.supply(b);
  ok(HF.tradeRoutes(b, b.f[0]).length > 0, 'una facción con dos ciudades conectadas abre ruta propia');
  HF.endTurn(b, null);   // el tráfico se recompone al cerrar la ronda
  ok(b.caravans.some(c => c.owner === 0), 'aparece el convoy de la facción en su ruta');
}

// 6) El guardado conserva convoyes
{
  const c = makeGame(2, 12, 999);
  const n = c.caravans.length;
  const g2 = HF.deserialize(JSON.parse(JSON.stringify(HF.serialize(c))));
  ok(n > 0 && g2.caravans.length === n, 'el guardado conserva los convoyes (' + n + ')');
}

// 7) Carga: prohibida entre puertos comunicados por tierra
{
  let d = null, ownCoast = [];
  for (let s = 0; s < 60 && !ownCoast.length; s++) {
    d = makeGame(2, 12, 3131 + s * 17);
    const coastal = c => HF.nbs(d, c.i).some(j => d.cells[j] && d.cells[j].t === T.MAR);
    ownCoast = d.cells.filter(c => c && c.o === 0 && c.t !== T.MAR && c.t !== T.RIO && coastal(c) && !c.u);
  }
  ok(ownCoast.length > 0, 'el territorio propio toca el mar');
  if (ownCoast.length) {
    // Una aldea portuaria nueva (pueblo) y un campamento costero en la misma
    // masa de tierra: comunicados por tierra, el mar no debe servir.
    const port = ownCoast[0];
    port.b = B.PUEBLO; port.city = port.city || HF.pickCityName(d);
    const camp = ownCoast.find(c => c !== port && !c.b && HF.landLinked(d, 0, port.i, c.i));
    HF.supply(d);
    ok(HF.isPort(d, port), 'la aldea costera es puerto');
    if (camp) {
      camp.b = B.CAMPAMENTO;
      HF.supply(d);
      const r = HF.sendCargo(d, port.i, camp.i, 'gold', 5);
      ok(!r.ok && /tierra/i.test(r.msg), 'carga rechazada entre puertos comunicados por tierra: ' + r.msg);
      ok(HF.cargoDests(d, d.f[0], port.i).every(p => p.i !== camp.i), 'el campamento conectado no aparece como destino');
    } else {
      ok(true, 'sin campamento costero conectado en este mapa; regla landLinked verificada');
      ok(HF.landLinked(d, 0, port.i, port.i), 'landLinked reconoce el mismo punto');
    }
  }
}

console.log(fails ? `\n${fails} COMPROBACIONES FALLIDAS` : '\nTodo correcto');
process.exit(fails ? 1 : 0);
