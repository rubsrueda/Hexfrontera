'use strict';
// Vista Táctica OTAN: en las casillas LIBRES, valor de defensa de la posición
// (edificio/aura/zona de control) y bonus de terreno para infantería.
//   🛡N  → defensa actual de la casilla vacía.
//   +T   → colina +1 · montaña +2 (lo que ganaría una unidad de infantería).
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const JS = path.join(__dirname, '..', 'js');
let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };

const HF = {};
const store = new Map();
const sandbox = {
  console, HF, window: null,
  navigator: { onLine: false, language: 'es', userAgent: 'nato-tile-test' },
  location: { href: 'https://hexfrontier.test/', protocol: 'https:', hostname: 'hexfrontier.test', hash: '' },
  localStorage: {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
    key: i => Array.from(store.keys())[i] || null,
    get length() { return store.size; }
  },
  setTimeout, clearTimeout, setInterval, clearInterval,
  Promise, Date, Math, JSON, performance: { now: () => Date.now() },
  Image: function Image() { this.width = 0; this.height = 0; this.onload = null; this.onerror = null; },
  addEventListener() { }, removeEventListener() { },
  document: { querySelector: () => null, querySelectorAll: () => [], createElement: () => ({ style: {}, classList: { add() { }, remove() { } }, getContext: () => ({}) }), addEventListener() { }, body: { classList: { toggle() { } } }, documentElement: { lang: 'es', dir: 'ltr', style: {} } }
};
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ['util.js', 'config.js', 'data.js', 'i18n.js', 'names.js', 'mapgen.js', 'engine.js', 'art.js', 'board.js', 'game.js'])
  vm.runInContext(fs.readFileSync(path.join(JS, f), 'utf8'), sandbox);

const T = HF.T, B = HF.B, P = HF.Board.prototype;
const FS = 40, CX = 100, CY = 100;

function makeGame() {
  const R = 6, gr = HF.makeGrid(R);
  const g = { R, turn: 3, cur: 1, cells: [], f: [], _grid: gr, caravans: [] };
  g.f = [
    { id: 0, alive: true, human: true, tags: [] },
    { id: 1, alive: true, human: false, tags: [] }
  ];
  for (const d of gr.list) {
    const c = HF.newCell(d);
    c.t = T.LLANO; c.o = -1; c.b = 0; c.sup = 0; c.comp = 0;
    g.cells[d.i] = c;
  }
  return g;
}

function recorder() {
  const ops = [];
  const ctx = {
    ops, font: '', fillStyle: '', strokeStyle: '', lineWidth: 1, textAlign: '', textBaseline: '',
    fillRect(x, y, w, h) { ops.push({ op: 'fillRect', x, y, w, h }); },
    beginPath() { ops.push({ op: 'beginPath' }); },
    moveTo(x, y) { ops.push({ op: 'moveTo', x, y }); },
    lineTo(x, y) { ops.push({ op: 'lineTo', x, y }); },
    quadraticCurveTo() { ops.push({ op: 'quad' }); },
    closePath() { },
    arc() { ops.push({ op: 'arc' }); },
    fill() { ops.push({ op: 'fill', fill: this.fillStyle }); },
    stroke() { ops.push({ op: 'stroke', stroke: this.strokeStyle, width: this.lineWidth }); },
    fillText(t, x, y) { ops.push({ op: 'text', t, x, y, fill: this.fillStyle, font: this.font, align: this.textAlign }); },
    measureText(s) { return { width: String(s).length * 6 }; },
    save() { }, restore() { }
  };
  return ctx;
}

function draw(g, opts) {
  opts = opts || {};
  const ci = opts.cell != null ? opts.cell : g._grid.list[0].i;
  const c = g.cells[ci];
  if (opts.terrain != null) c.t = opts.terrain;
  if (opts.building != null) c.b = opts.building;
  if (opts.owner != null) c.o = opts.owner;
  if (opts.deg != null) c.deg = opts.deg;
  if (opts.unit) c.u = opts.unit;
  const ctx = recorder();
  const board = Object.create(P);
  board.game = g;
  board.colors = ['#3b82f6', '#ef4444'];
  const geo = P.drawNatoTileDefense.call(board, ctx, c, CX, CY, FS);
  return { ctx, geo, c, ops: ctx.ops, texts: ctx.ops.filter(o => o.op === 'text') };
}
const textOf = r => r.texts.map(o => o.t);

// 1. Llano vacío: no hay nada que anunciar.
{
  ok(typeof P.drawNatoTileDefense === 'function', 'existe drawNatoTileDefense()');
  const g = makeGame();
  const r = draw(g, { owner: 0 });
  ok(r.geo === null && r.texts.length === 0, 'llano vacío: sin etiqueta (defensa 0, sin bonus)');
}

// 2. Terreno: colina +1, montaña +2.
{
  let g = makeGame();
  let r = draw(g, { terrain: T.COLINA, owner: 0 });
  ok(r.geo && r.geo.ter === 1 && textOf(r).join(' ') === '+1', 'colina: +1');
  ok(r.texts[0] && r.texts[0].fill === '#4ade80', 'colina: +1 en verde');

  g = makeGame();
  r = draw(g, { terrain: T.MONTANA, owner: 0 });
  ok(r.geo && r.geo.ter === 2 && textOf(r).join(' ') === '+2', 'montaña: +2');

  // El mar no da bonus ni defensa: no se pinta nada.
  g = makeGame();
  r = draw(g, { terrain: T.MAR, owner: 0 });
  ok(r.geo === null && r.texts.length === 0, 'mar vacío: sin etiqueta');
}

// 3. Edificios: la defensa de la posición sale del edificio.
{
  let g = makeGame();
  let r = draw(g, { building: B.CIUDAD, owner: 0 });
  ok(r.geo && r.geo.def === 2 && textOf(r).join(' ') === '🛡2', 'ciudad vacía: 🛡2');
  ok(r.texts[0] && r.texts[0].fill === '#f4efea', 'ciudad: escudo en blanco');

  g = makeGame();
  r = draw(g, { building: B.CIUDAD, terrain: T.COLINA, owner: 0 });
  ok(textOf(r).join(' ') === '🛡2 +1', 'ciudad en colina: 🛡2 y +1');
  ok(r.geo && r.geo.bw <= FS * .96 + .01, 'la placa cabe en la casilla');

  g = makeGame();
  r = draw(g, { building: B.PUEBLO, owner: 0 });
  ok(r.geo && r.geo.def === 1 && textOf(r).join(' ') === '🛡1', 'pueblo vacío: 🛡1');
}

// 4. Aura de bastión aliado: escudo azul.
{
  const g = makeGame();
  const ci = g._grid.list[0].i;
  const nb = g.cells[g._grid.nb[ci][0]];
  nb.b = B.BASTION; nb.o = 0;
  const r = draw(g, { cell: ci, owner: 0, terrain: T.LLANO });
  ok(r.geo && r.geo.def === 2 && textOf(r).join(' ') === '🛡2', 'junto a bastión propio: 🛡2');
  ok(r.texts[0] && r.texts[0].fill === '#38bdf8', 'aura de bastión: escudo azul');
}

// 5. Casilla degradada por disparo: defensa rebajada y escudo rojo.
{
  const g = makeGame();
  const r = draw(g, { building: B.CIUDAD, owner: 0, deg: 1 });
  ok(r.geo && r.geo.def === 1 && textOf(r).join(' ') === '🛡1', 'ciudad degradada: 🛡1');
  ok(r.texts[0] && r.texts[0].fill === '#f87171', 'degradada: escudo rojo');
}

// 6. Con unidad no se duplica: ya lo muestra su ficha OTAN.
{
  const g = makeGame();
  const r = draw(g, { terrain: T.COLINA, owner: 0, unit: { type: 'INF', tier: 1, owner: 0, mv: 1, at: 1 } });
  ok(r.geo === null && r.texts.length === 0, 'casilla ocupada: no se pinta la etiqueta de casilla');
}

if (fail) { console.error(`\n${fail} comprobaciones CON FALLOS`); process.exit(1); }
console.log('\nDefensa en casillas libres (OTAN): todo OK');
