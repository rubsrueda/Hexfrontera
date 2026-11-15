'use strict';
// Nivel de la unidad en la vista normal (board.js → drawUnitLevel):
// la cifra va DENTRO de su propio hexágono, en el cuadrante inferior derecho,
// con una fuente reducida. Regresión del fallo reportado: el número se pintaba
// en (x + 0.55·fs, y + 0.55·fs), sobre el vértice sur, y el hexágono contiguo
// (con edificio o unidad) lo tapaba.
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
  navigator: { onLine: false, language: 'es', userAgent: 'unit-level-badge-test' },
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
const TILT = (HF.CFG && HF.CFG.view && HF.CFG.view.tilt) || .62;
const CX = 100, CY = 100;

// Media anchura interior del hexágono a una altura dy (misma geometría que
// board.js: banda central vertical + chaflán hacia los vértices).
function halfWidthAt(dy, fs) {
  const hh = fs * TILT, flat = hh * .5, ady = Math.abs(dy);
  if (ady >= hh) return 0;
  if (ady <= flat) return fs * Math.sqrt(3) / 2;
  return fs * Math.sqrt(3) / 2 * (hh - ady) / (hh - flat);
}

function recorder() {
  const ops = [];
  const ctx = {
    ops, font: '', fillStyle: '', strokeStyle: '', lineWidth: 1, lineJoin: '', textAlign: '', textBaseline: '',
    measureText(s) { const size = +(String(this.font).match(/([\d.]+)px/) || [0, 8])[1]; return { width: String(s).length * size * .62 }; },
    fillText(t, x, y) { ops.push({ op: 'fillText', t, x, y, fill: this.fillStyle, font: this.font, align: this.textAlign }); },
    strokeText(t, x, y) { ops.push({ op: 'strokeText', t, x, y, stroke: this.strokeStyle, width: this.lineWidth }); },
    save() { }, restore() { }
  };
  return ctx;
}

function draw(u, size) {
  const ctx = recorder();
  const geo = P.drawUnitLevel.call(Object.create(P), ctx, u, CX, CY, size);
  return { ctx, geo, ops: ctx.ops, texts: ctx.ops.filter(o => o.op === 'fillText') };
}

// 1. La vista normal solo marca unidades veteranas (N2+); N1 no lleva cifra.
{
  ok(typeof P.drawUnitLevel === 'function', 'existe drawUnitLevel()');
  const r = draw({ type: 'INF', tier: 1, owner: 1 }, 40);
  ok(r.geo === null && r.texts.length === 0, 'N1 no dibuja cifra (no hay nada que tapar)');
}

// 2. Una sola cifra, reducida y con halo oscuro, para N2/N3/N4.
{
  for (const tier of [2, 3, 4]) {
    for (const size of [24, 34, 40, 58]) {
      const r = draw({ type: 'INF', tier, owner: 1 }, size);
      const txt = r.texts[0];
      ok(r.texts.length === 1 && txt && txt.t === String(tier), `N${tier} @${size}px: una cifra "${tier}"`);
      const px = r.geo && r.geo.font;
      ok(px >= 7 && px <= Math.min(size * .32, 11) + 1e-9, `N${tier} @${size}px: fuente reducida (${px.toFixed(1)}px ≤ ${Math.min(size * .32, 11).toFixed(1)})`);
      ok(px < size * .5, `N${tier} @${size}px: menor que la fuente antigua 0.5·fs (${(size * .5).toFixed(1)}px)`);
      const halo = r.ops.find(o => o.op === 'strokeText');
      ok(!!halo && halo.t === String(tier) && halo.width >= Math.max(2, px * .55), `N${tier} @${size}px: halo oscuro que la separa del arte`);
      ok(txt.align === 'center', `N${tier} @${size}px: cifra centrada en su ancla`);
    }
  }
}

// 3. Toda la caja del glifo queda dentro del hexágono propio.
{
  for (const tier of [2, 3, 4]) {
    for (const size of [24, 34, 40, 58, 80]) {
      const r = draw({ type: 'INF', tier, owner: 1 }, size);
      const g = r.geo, hw = g.w / 2, hh = g.h / 2;
      const corners = [
        [g.x - hw, g.y - hh], [g.x + hw, g.y - hh],
        [g.x - hw, g.y + hh], [g.x + hw, g.y + hh]
      ];
      let inside = true, worst = Infinity;
      for (const [px, py] of corners) {
        const dx = px - CX, dy = py - CY;
        const room = halfWidthAt(dy, size) - Math.abs(dx);
        if (room < -1e-6) inside = false;
        if (room < worst) worst = room;
      }
      ok(inside, `N${tier} @${size}px: los 4 vértices del glifo caben en la casilla (margen mínimo ${worst.toFixed(1)}px)`);
      ok(g.x > CX && g.y > CY, `N${tier} @${size}px: sigue en el cuadrante inferior derecho`);
    }
  }
}

// 4. A zoom lejano (casilla más pequeña que la cifra) se oculta en vez de
//    desbordar el hexágono.
{
  for (const size of [8, 12, 18]) {
    const r = draw({ type: 'ARC', tier: 3, owner: 1 }, size);
    ok(r.geo === null && r.texts.length === 0, `@${size}px: sin cifra ilegible fuera de la casilla`);
  }
}

// 5. La cifra no usa la posición antigua (0.55·fs a la derecha y abajo).
{
  for (const size of [34, 58]) {
    const r = draw({ type: 'INF', tier: 2, owner: 1 }, size);
    const txt = r.texts[0];
    ok(txt.x < CX + size * .55 && txt.y < CY + size * .55, `@${size}px: ancla interior (${(txt.x - CX).toFixed(1)}, ${(txt.y - CY).toFixed(1)})`);
  }
}

// 6. draw(): la cifra va en la pasada final, después del edificio del hexágono
//    del sur que antes la tapaba, y su caja cae en la casilla propia.
{
  const T = HF.T, B = HF.B;
  const paint = [];
  const ctx = new Proxy({
    measureText(s) { const size = +(String(this.font).match(/([\d.]+)px/) || [0, 8])[1]; return { width: String(s).length * size * .62 }; },
    createRadialGradient() { return { addColorStop() { } }; },
    createLinearGradient() { return { addColorStop() { } }; },
    fillText(t, x, y) { paint.push({ op: 'text', t, x, y, font: this.font, fill: this.fillStyle, idx: paint.length }); },
    strokeText(t, x, y) { paint.push({ op: 'stroke', t, x, y, idx: paint.length }); }
  }, {
    get(target, key) {
      if (key in target) return target[key];
      if (typeof key === 'symbol') return undefined;
      return function () { };
    },
    set(target, key, val) { target[key] = val; return true; }
  });
  const cells = new Array(49).fill(null);
  const north = { i: 24, q: 0, r: 0, t: T.LLANO, o: 0, b: 0, res: 0, u: { type: 'INF', tier: 2, owner: 0, mv: 1, at: 1 } };
  const south = { i: 25, q: 0, r: 1, t: T.LLANO, o: 1, b: B.CIUDAD, res: 0, u: { type: 'ARC', tier: 1, owner: 1, mv: 1, at: 1 } };
  cells[24] = north; cells[25] = south;
  const game = { turn: 1, cur: 0, mySeat: 0, cells, f: [], caravans: [], storms: [] };
  const board = Object.create(P);
  Object.assign(board, {
    ctx, dpr: 1, cam: { x: 0, y: 0, z: 1 }, size: 24, R: 3, cells, game, W: 400, H: 400,
    fogMap: null, over: new Map(), sel: -1, drag: null, mode: 'play', viewMode: 'normal',
    colors: ['#3b82f6', '#ef4444'], parts: null, bubbles: null, _order: null,
    fx: [], pulses: [], _shakeUntil: 0, hop: null
  });
  for (const k of ['pos', 'toScreen', '_level', '_lift', '_neighbor']) board[k] = P[k];
  board._shore = () => false;
  board._drawClouds = board._drawParts = board._drawStorms = board._drawCaravans = board._drawCoastalExtrusion = () => { };
  P.draw.call(board);

  const lvl = paint.find(o => o.op === 'text' && o.t === '2' && /Plus Jakarta/.test(o.font));
  const city = paint.find(o => o.op === 'text' && o.t === HF.BICON[B.CIUDAD]);
  ok(!!lvl && !!city, 'draw() pinta la cifra y el edificio del hexágono contiguo');
  ok(!!lvl && !!city && lvl.idx > city.idx, 'la cifra se pinta en la pasada final, DESPUÉS del edificio del sur');

  const fs2 = board.size * board.cam.z;
  const [nx, ny0] = board.toScreen(...board.pos(north));
  const [sx, sy0] = board.toScreen(...board.pos(south));
  const ny = ny0 - board._level(north), sy2 = sy0 - board._level(south);
  const px = lvl ? +(lvl.font.match(/([\d.]+)px/) || [0, 0])[1] : 0;
  const hw = px * .62 / 2, hh = px / 2;
  const corners = lvl ? [[lvl.x - hw, lvl.y - hh], [lvl.x + hw, lvl.y - hh], [lvl.x - hw, lvl.y + hh], [lvl.x + hw, lvl.y + hh]] : [];
  const inHex = (px2, py2, cx, cy) => Math.abs(py2 - cy) < fs2 * TILT && Math.abs(px2 - cx) <= halfWidthAt(py2 - cy, fs2);
  ok(!!lvl && corners.every(([x2, y2]) => inHex(x2, y2, nx, ny)), 'draw(): toda la cifra cae dentro de la casilla propia');
  ok(!!lvl && !corners.some(([x2, y2]) => inHex(x2, y2, sx, sy2)), 'draw(): la cifra no invade el hexágono contiguo del sur');

  // En la vista de recursos las unidades van atenuadas: la cifra se omite.
  paint.length = 0;
  board.viewMode = 'resource';
  P.draw.call(board);
  ok(!paint.some(o => o.op === 'text' && o.t === '2'), 'vista de recursos: sin cifra a plena opacidad');
}

if (fail) { console.error(`\n${fail} comprobaciones CON FALLOS`); process.exit(1); }
console.log('\nNivel de unidad en el mapa: todo OK');
