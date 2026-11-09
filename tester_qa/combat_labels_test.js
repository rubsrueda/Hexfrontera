'use strict';
// Etiquetas de la vista Combate (board.js → drawCombatLabels):
// el anillo y, DENTRO del círculo y en su banda inferior, el nivel a la
// izquierda y la defensa a la derecha. Regresión del fallo reportado: el nivel
// flotaba por encima de la unidad (se perdía al apilar) y la defensa caía en el
// lateral, tapada por el propio sprite.
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
  navigator: { onLine: false, language: 'es', userAgent: 'combat-labels-test' },
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
    quadraticCurveTo(a, b, c, d) { ops.push({ op: 'quad' }); },
    arc(x, y, r, a, b) { ops.push({ op: 'arc', x, y, r }); },
    fill() { ops.push({ op: 'fill', fill: this.fillStyle }); },
    clip() { ops.push({ op: 'clip' }); },
    stroke() { ops.push({ op: 'stroke', stroke: this.strokeStyle, width: this.lineWidth }); },
    closePath() { },
    fillText(t, x, y) { ops.push({ op: 'text', t, x, y, fill: this.fillStyle, font: this.font, align: this.textAlign }); },
    measureText(s) { return { width: String(s).length * 6 }; },
    save() { }, restore() { }
  };
  return ctx;
}

function draw(g, u, opts) {
  opts = opts || {};
  const ci = opts.cell != null ? opts.cell : g._grid.list[0].i;
  const c = g.cells[ci];
  c.u = u; c.o = u.owner;
  if (opts.terrain != null) c.t = opts.terrain;
  if (opts.deg != null) c.deg = opts.deg;
  const ctx = recorder();
  const board = Object.create(P);
  board.game = g;
  board.colors = ['#3b82f6', '#ef4444'];
  P.drawCombatRing.call(board, ctx, c, u, CX, CY, FS);
  const geo = P.drawCombatLabels.call(board, ctx, c, u, CX, CY, FS);
  return { ctx, geo, c, ops: ctx.ops, texts: ctx.ops.filter(o => o.op === 'text'), arcs: ctx.ops.filter(o => o.op === 'arc') };
}

// 1. Existe y dibuja el anillo en su sitio.
{
  ok(typeof P.drawCombatRing === 'function', 'existe drawCombatRing()');
  ok(typeof P.drawCombatLabels === 'function', 'existe drawCombatLabels()');
  const g = makeGame();
  const r = draw(g, { type: 'INF', tier: 1, owner: 1, mv: 1, at: 1 });
  const arc = r.arcs[0];
  ok(!!arc && Math.abs(arc.r - FS * .63) < .001, 'anillo de radio 0.63·fs');
  ok(!!arc && Math.abs(arc.x - CX) < .001 && Math.abs(arc.y - (CY + FS * .05)) < .001, 'anillo centrado en la base de la unidad');
}

// 2. Dos etiquetas, dentro del círculo y en la mitad inferior.
{
  const g = makeGame();
  const r = draw(g, { type: 'INF', tier: 2, owner: 1, mv: 1, at: 1 });
  ok(r.texts.length === 2, 'dibuja exactamente dos etiquetas (' + r.texts.length + ')');
  const lvl = r.texts.find(o => o.t === 'N2');
  const def = r.texts.find(o => String(o.t).indexOf('🛡') === 0);
  ok(!!lvl && !!def, 'nivel N2 y defensa 🛡' + (def ? def.t.slice(1) : '?'));
  const cy = CY + FS * .05, R = FS * .63;
  ok(lvl && lvl.y > CY && lvl.y < cy + R, `nivel DENTRO del círculo y por debajo del centro (y=${lvl && lvl.y.toFixed(1)})`);
  ok(def && def.y > CY && def.y < cy + R, `defensa DENTRO del círculo (y=${def && def.y.toFixed(1)})`);
  ok(lvl && def && lvl.x < def.x, 'nivel a la IZQUIERDA y defensa a la DERECHA');
  ok(lvl && lvl.align === 'left' && def && def.align === 'right', 'alineación izquierda/derecha');
  ok(lvl && def && lvl.font === def.font, 'ambas etiquetas comparten tamaño de fuente');
}

// 3. Fuente algo más pequeña que la anterior (0.4·fs) y nunca menor de 7 px.
{
  const g = makeGame();
  const r = draw(g, { type: 'INF', tier: 3, owner: 1, mv: 1, at: 1 });
  const size = +(r.texts[0].font.match(/([\d.]+)px/) || [])[1];
  ok(size <= FS * .32, `fuente más pequeña (${size}px ≤ ${(FS * .32).toFixed(1)})`);
  ok(size >= 7, `fuente legible (${size}px ≥ 7)`);
  ok(r.geo.font === size, 'la geometría devuelve el tamaño usado');
}

// 4. La placa y las etiquetas van POR ENCIMA del anillo y sin recortes.
{
  for (const tier of [1, 2, 3, 4]) {
    const g = makeGame();
    const r = draw(g, { type: 'INF', tier, owner: 1, mv: 1, at: 1 });
    const R = r.geo.R;
    ok(r.geo.bx >= CX - R - .01 && r.geo.bx + r.geo.bw <= CX + R + .01,
      `N${tier}: la placa cabe en el diámetro (${r.geo.bw.toFixed(1)}px ≤ ${(2 * R).toFixed(1)})`);
    ok(r.geo.by >= r.geo.cy && r.geo.by + r.geo.bh <= r.geo.cy + R + .01,
      `N${tier}: la placa está dentro del borde inferior`);
    ok(!r.ops.some(o => o.op === 'clip'), `N${tier}: sin recorte (las etiquetas se ven enteras)`);
    const ring = r.ops.findIndex(o => o.op === 'stroke' && o.width === 2);
    const fill = r.ops.findIndex(o => o.op === 'fill');
    const txt = r.ops.findIndex(o => o.op === 'text');
    ok(ring >= 0 && fill > ring && txt > fill, `N${tier}: anillo → placa → etiquetas (encima del círculo)`);
    const lvl = r.texts.find(o => String(o.t).indexOf('N') === 0);
    const dfn = r.texts.find(o => String(o.t).indexOf('🛡') === 0);
    ok(lvl && lvl.x >= r.geo.bx && dfn && dfn.x <= r.geo.bx + r.geo.bw,
      `N${tier}: el texto no se sale de la placa`);
  }
}

// 5. La defensa es la efectiva (terreno/degrada), no el tier.
{
  const g = makeGame();
  let r = draw(g, { type: 'INF', tier: 1, owner: 1, mv: 1, at: 1 }, { terrain: T.COLINA });
  ok(r.texts.some(o => o.t === '🛡2'), 'colina: defensa 2 en la etiqueta');
  r = draw(g, { type: 'INF', tier: 3, owner: 1, mv: 1, at: 1 }, { terrain: T.MONTANA, deg: 1 });
  ok(r.texts.some(o => o.t === '🛡4'), 'montaña N3 con −1 por disparo: 🛡4');
}

// 6. No usa las posiciones antiguas (nivel encima / defensa al lateral).
{
  const g = makeGame();
  const r = draw(g, { type: 'INF', tier: 2, owner: 1, mv: 1, at: 1 });
  ok(!r.ops.some(o => o.op === 'text' && o.y < CY), 'ninguna etiqueta flota por encima de la unidad');
  ok(!r.ops.some(o => o.op === 'text' && o.x > CX + FS * .5), 'ninguna etiqueta queda fuera del anillo por el lateral');
}

if (fail) { console.error(`\n${fail} comprobaciones CON FALLOS`); process.exit(1); }
console.log('\nEtiquetas de combate: todo OK');
