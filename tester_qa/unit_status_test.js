'use strict';
// Semáforo de la unidad propia en el tablero (board.js → drawUnitStatus):
//   verde = puede mover y atacar · cian = solo mover · rojo = solo atacar ·
//   sin punto = ya actuó este turno.
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
  navigator: { onLine: false, language: 'es', userAgent: 'unit-status-test' },
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

const P = HF.Board.prototype;
const FS = 40, CX = 100, CY = 100;

function recorder() {
  const ops = [];
  const ctx = {
    ops, font: '', fillStyle: '', strokeStyle: '', lineWidth: 1, textAlign: '', textBaseline: '',
    save() { }, restore() { },
    beginPath() { ops.push({ op: 'beginPath' }); },
    arc(x, y, r, a, b) { ops.push({ op: 'arc', x, y, r }); },
    fill() { ops.push({ op: 'fill', fill: this.fillStyle }); },
    stroke() { ops.push({ op: 'stroke', stroke: this.strokeStyle, width: this.lineWidth }); }
  };
  return ctx;
}

function draw(u, view) {
  const ctx = recorder();
  const board = Object.create(P);
  board.viewMode = view || 'normal';
  const geo = P.drawUnitStatus.call(board, ctx, u, CX, CY, FS);
  return { ctx, geo, ops: ctx.ops, arcs: ctx.ops.filter(o => o.op === 'arc') };
}
const unit = (o) => Object.assign({ type: 'INF', tier: 1, owner: 0, mv: 0, at: 0 }, o);

// 1. Lista: mover y atacar → verde, sobre la unidad (no por debajo).
{
  ok(typeof P.drawUnitStatus === 'function', 'existe drawUnitStatus()');
  const r = draw(unit({ mv: 1, at: 1 }));
  ok(r.geo && r.geo.full === true && r.geo.color === '#4ade80', 'mover+atacar: verde (#4ade80)');
  ok(r.arcs.length === 1, 'un solo punto (' + r.arcs.length + ')');
  const a = r.arcs[0];
  ok(a && Math.abs(a.x - CX) < .01, 'punto en el eje de la casilla (x)');
  ok(a && Math.abs(a.y - (CY - FS * .08)) < .01 && a.y < CY,
    'vista normal: punto SOBRE la unidad, no debajo del dibujo (y)');
  ok(a && a.r >= 2.5, 'punto con radio legible (' + (a && a.r) + 'px)');
  ok(a && a.r <= FS * .12, 'punto discreto, no tapa el arte (' + (a && a.r) + 'px)');
  ok(a && a.r < FS * .2, 'punto contenido en el hexágono (' + (a && a.r) + 'px)');
  ok(r.ops.some(o => o.op === 'stroke' && o.width >= 1), 'punto con contorno oscuro');
}

// 1b. Vista Táctica OTAN: el punto se pinta (no se omite) y va por encima del
// marco de la ficha, dentro de la casilla.
{
  const r = draw(unit({ mv: 1, at: 1 }), 'nato');
  ok(r.geo && r.geo.nato === true, 'OTAN: el semáforo se dibuja también en la vista táctica');
  const a = r.arcs[0];
  const counterTop = CY - FS * .36;          // marco de la ficha (H = 0.72·fs)
  const hexTop = CY - FS * .62;              // vértice superior del hexágono
  ok(a && a.y < counterTop, 'OTAN: el punto queda por encima de la ficha');
  ok(a && a.y - a.r >= hexTop, 'OTAN: el punto sigue dentro de la casilla');
  ok(a && a.r <= FS * .095, 'OTAN: punto pequeño para no tapar la ficha');
}

// 2. Solo mover → cian; solo atacar → rojo.
{
  let r = draw(unit({ mv: 1, at: 0 }));
  ok(r.geo && r.geo.full === false && r.geo.color === '#38bdf8' && r.geo.mv && !r.geo.at, 'solo mover: cian (#38bdf8)');
  r = draw(unit({ mv: 0, at: 1 }));
  ok(r.geo && r.geo.full === false && r.geo.color === '#f87171' && !r.geo.mv && r.geo.at, 'solo atacar: rojo (#f87171)');
}

// 3. Agotada: no hay punto.
{
  const r = draw(unit({ mv: 0, at: 0 }));
  ok(r.geo === null && r.arcs.length === 0, 'sin acciones: no se pinta nada');
}

// 4. La carga de un barco cuenta como movimiento.
{
  const r = draw(unit({ type: 'BAR', mv: 0, at: 0, cargo: { type: 'INF', tier: 1, owner: 0, mv: 1, at: 1 } }));
  ok(r.geo && r.geo.mv === true, 'la carga con movimiento habilita el punto');
}

// 5. Los puntos antiguos (verde/rojo sueltos) ya no se dibujan: solo uno.
{
  const r = draw(unit({ mv: 1, at: 1 }));
  ok(r.ops.filter(o => o.op === 'fill').length === 1, 'un único relleno (sin duplicar los puntos viejos)');
}

if (fail) { console.error(`\n${fail} comprobaciones CON FALLOS`); process.exit(1); }
console.log('\nSemáforo de unidad: todo OK');
