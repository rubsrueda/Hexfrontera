'use strict';
// Nombres históricos de ciudades (names.js → HF.CITY_NAMES / pickCityName):
// al menos 100, sin repetir dentro de la partida, asignados a capitales,
// pueblos y ciudades nuevas, guardados en la partida y usados por el comercio
// naval (mensaje de la urca y entrega en el puerto de destino).
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const JS = path.join(__dirname, '..', 'js');
let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };

const HF = {};
const sandbox = { console, HF, window: null };
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ['util.js', 'config.js', 'data.js', 'mapgen.js', 'names.js', 'engine.js'])
  vm.runInContext(fs.readFileSync(path.join(JS, f), 'utf8'), sandbox);
HF.updateFog = () => {};
HF.checkEnd = () => {};

const T = HF.T, B = HF.B;

// --- 1. El catálogo ---
{
  const names = HF.CITY_NAMES;
  ok(Array.isArray(names) && names.length >= 100, `hay al menos 100 nombres (${names.length})`);
  ok(new Set(names).size === names.length, 'todos los nombres son únicos');
  ok(names.every(n => typeof n === 'string' && n.trim() === n && n.length > 1), 'sin espacios ni vacíos');
  ok(names.every(n => /^[A-ZÁÉÍÓÚÑ]/.test(n)), 'todos empiezan por mayúscula');
  ok(names.includes('Tarraco') && names.includes('Alexandria') && names.includes('Carthage') &&
    names.includes('Lutetia') && names.includes('Athens') && names.includes('Tyre'),
    'están representadas las siete culturas');
}

// --- 2. pickCityName evita los ya usados ---
{
  const g = { cells: [{ city: 'Tarraco' }, { city: 'Athens' }, null] };
  const used = new Set(['Tarraco', 'Athens']);
  let okAll = true;
  for (let i = 0; i < 200; i++) { const n = HF.pickCityName(g); if (!n || used.has(n)) okAll = false; }
  ok(okAll, 'nunca devuelve un nombre ya usado en la partida');

  // Agotado el catálogo: ordinal para seguir sin repetir.
  const full = { cells: HF.CITY_NAMES.map(n => ({ city: n })) };
  const extra = HF.pickCityName(full);
  ok(extra && / [2-9]\d*$/.test(extra) && !HF.CITY_NAMES.includes(extra), `con 105 usados devuelve ordinal (${extra})`);
}

// --- 3. newGame bautiza todos los asentamientos del mapa ---
function newGame(seed) {
  const t = HF.defaultTribe();
  return HF.newGame({
    R: 9, seed, biome: 'plains', fog: 'NONE',
    factions: [Object.assign({}, t, { name: 'A', human: true }), Object.assign({}, t, { name: 'B', human: false, tribe_id: 'b' })]
  });
}
{
  const g = newGame(4242);
  const settle = g.cells.filter(c => c && (c.b === B.PUEBLO || c.b === B.CIUDAD));
  ok(settle.length > 0, `el mapa tiene asentamientos (${settle.length})`);
  ok(settle.every(c => !!c.city), 'todos los asentamientos tienen nombre');
  const names = settle.map(c => c.city);
  ok(new Set(names).size === names.length, 'sin nombres repetidos en el mapa');
  ok(names.every(n => HF.CITY_NAMES.includes(n) || / [2-9]\d*$/.test(n)), 'todos salen del catálogo');

  const caps = g.cells.filter(c => c && c.cap && c.o >= 0);
  ok(caps.length > 0 && caps.every(c => !!c.city), 'las capitales también tienen nombre');
}

// --- 4. Fundar un pueblo le asigna nombre y se guarda en la partida ---
function baseGame() {
  const R = 6, gr = HF.makeGrid(R);
  const g = {
    R, turn: 1, cur: 0, cells: [], f: [], events: [], undo: [],
    stat: { kills: 0, lost: 0, cuts: 0, deserts: 0, built: 0, captured: 0, recruited: 0 },
    timeline: [], caravans: [], tradeBlocked: {}, storms: [], replayLog: [], rs: 7,
    goal: { type: 'conquer' }, _grid: gr, f: []
  };
  for (const d of gr.list) { const c = HF.newCell(d); c.t = T.LLANO; g.cells[d.i] = c; }
  const col = gr.list.filter(d => d.q === 0).slice(0, 5);
  col.forEach((d, k) => { const c = g.cells[d.i]; c.o = 0; c.sup = 1; if (k === 0) { c.b = B.CIUDAD; c.cap = 0; } });
  g.f = [
    { id: 0, alive: true, human: true, tags: [], stock: { 0: { gold: 999, food: 999, wood: 999 } }, gold: 0, food: 0, wood: 0, grace: 0, goodStreak: 0, deficit: false, loan: null, starvationsInduced: 0 },
    { id: 1, alive: true, human: false, tags: [], stock: { 0: { gold: 999, food: 999, wood: 999 } }, gold: 0, food: 0, wood: 0, grace: 0, goodStreak: 0, deficit: false, loan: null, starvationsInduced: 0 }
  ];
  HF.supply(g);
  // El almacén es por provincia: se rellena después de calcular los comps.
  for (const f of g.f) for (const k of Object.keys(f.stock)) f.stock[k] = { gold: 999, food: 999, wood: 999 };
  g.cells[col[0].i].city = 'Roma';
  return { g, cells: col.map(d => d.i) };
}
{
  const { g, cells } = baseGame();
  const target = cells[1];
  ok(HF.buildCells(g, B.PUEBLO).includes(target), 'hay una casilla válida para fundar un pueblo');
  const r = HF.build(g, B.PUEBLO, target);
  ok(r.ok, 'el pueblo se funda');
  ok(!!g.cells[target].city && g.cells[target].city !== 'Roma', `el pueblo recibe nombre propio (${g.cells[target].city})`);
  ok(HF.CITY_NAMES.includes(g.cells[target].city), 'el nombre sale del catálogo histórico');

  // Persistencia: serialize/deserialize conserva los nombres.
  const saved = HF.deserialize(JSON.parse(JSON.stringify(HF.serialize(g))));
  ok(saved.cells[target].city === g.cells[target].city, 'el nombre sobrevive a guardar/cargar');
  ok(saved.cells[cells[0]].city === 'Roma', 'la capital conserva su nombre al cargar');

  // Una partida vieja sin nombres se bautiza al cargar.
  const raw = JSON.parse(JSON.stringify(HF.serialize(g)));
  for (const c of raw.cells) if (c) delete c.city;
  const old = HF.deserialize(raw);
  ok(old.cells.filter(c => c && (c.b === B.PUEBLO || c.b === B.CIUDAD)).every(c => !!c.city),
    'una partida guardada sin nombres se bautiza al cargarla');
}

// --- 5. Comercio naval: la urca dice a qué ciudad va y dónde entrega ---
{
  const { g } = baseGame();
  const a = g.cells[g._grid.idx(-3, 0)], b = g.cells[g._grid.idx(3, 0)];
  a.o = b.o = 0; a.sup = b.sup = 1; a.b = b.b = B.PUEBLO; a.comp = b.comp = 0;
  a.city = 'Ostia'; b.city = 'Tarraco';
  for (let q = -2; q <= 2; q++) { const w = g.cells[g._grid.idx(q, 0)]; w.t = T.MAR; w.o = -1; }
  HF.supply(g);
  for (const k of Object.keys(g.f[0].stock)) g.f[0].stock[k] = { gold: 100, food: 100, wood: 100 };
  g.f[0].stock[a.comp] = { gold: 100, food: 100, wood: 100 };

  const send = HF.sendCargo(g, a.i, b.i, 'wood', 10);
  ok(send.ok, 'la urca zarpa');
  const msg = (g.events.filter(e => /Urca de carga/.test(e.txt)).slice(-1)[0] || {}).txt || '';
  ok(/rumbo a Tarraco/.test(msg), `el aviso nombra la ciudad de destino (${msg})`);
  ok(/10 madera/.test(msg), 'el aviso usa el recurso en español');

  HF.syncCaravans(g);
  HF.syncCaravans(g);
  const delivered = (g.events.filter(e => /Carga entregada/.test(e.txt)).slice(-1)[0] || {}).txt || '';
  ok(/Carga entregada en Tarraco/.test(delivered), `la entrega nombra la ciudad (${delivered})`);
  ok(g.f[0].stock[b.comp].wood === 110, 'la madera llega al puerto de destino');
}

if (fail) { console.error(`\n${fail} comprobaciones CON FALLOS`); process.exit(1); }
console.log('\nNombres de ciudad y comercio naval: todo OK');
