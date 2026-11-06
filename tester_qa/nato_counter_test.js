'use strict';
// Simbología militar OTAN (APP-6 / MIL-STD-2525) en board.js:
// fichas procedurales (sin imágenes), escalón, rol, ataque y defensa dinámica.
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
  navigator: { onLine: false, language: 'es', userAgent: 'nato-test' },
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

const T = HF.T, B = HF.B;
const P = HF.Board.prototype;
const FS = 40;
const CX = 100, CY = 100;

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
    ops, font: '', fillStyle: '', strokeStyle: '', lineWidth: 1,
    textAlign: '', textBaseline: '', lineJoin: '', lineCap: '',
    fillRect(x, y, w, h) { ops.push({ op: 'fillRect', x, y, w, h, fill: this.fillStyle }); },
    strokeRect(x, y, w, h) { ops.push({ op: 'strokeRect', x, y, w, h, stroke: this.strokeStyle, width: this.lineWidth }); },
    beginPath() { ops.push({ op: 'beginPath' }); },
    moveTo(x, y) { ops.push({ op: 'moveTo', x, y }); },
    lineTo(x, y) { ops.push({ op: 'lineTo', x, y }); },
    quadraticCurveTo(a, b, c, d) { ops.push({ op: 'quad', a, b, c, d }); },
    arc(x, y, r, a, b) { ops.push({ op: 'arc', x, y, r }); },
    fill() { ops.push({ op: 'fill', fill: this.fillStyle }); },
    stroke() { ops.push({ op: 'stroke', stroke: this.strokeStyle, width: this.lineWidth }); },
    fillText(t, x, y) { ops.push({ op: 'text', t, x, y, fill: this.fillStyle, font: this.font }); },
    measureText(s) { return { width: String(s).length * 6 }; },
    save() { }, restore() { },
    drawImage() { throw new Error('drawImage prohibido en modo OTAN'); }
  };
  return ctx;
}

function drawUnit(g, u, opts) {
  opts = opts || {};
  const ci = opts.cell != null ? opts.cell : g._grid.list[0].i;
  const c = g.cells[ci];
  if (!c.u) c.u = u;
  if (c.o < 0) c.o = u.owner;          // una unidad siempre pisa terreno propio
  if (opts.terrain != null) c.t = opts.terrain;
  if (opts.deg != null) c.deg = opts.deg;
  const ctx = recorder();
  const board = Object.create(P);
  board.colors = ['#3b82f6', '#ef4444'];
  board.game = g;
  P.drawNatoCounter.call(board, ctx, c, u, CX, CY, FS);
  return { ctx, c, ops: ctx.ops };
}
const textOps = r => r.ops.filter(o => o.op === 'text');
const textOf = (r, prefix) => (textOps(r).find(o => String(o.t).indexOf(prefix) === 0) || {}).t;
const count = (r, op) => r.ops.filter(o => o.op === op).length;

// ---------------------------------------------------------------------------
// 1. Dibujo procedural por rol (sin imágenes)
// ---------------------------------------------------------------------------
{
  const types = ['INF', 'CAB', 'SIE', 'ENG', 'ARC', 'BAR'];
  ok(typeof P.drawNatoCounter === 'function', 'existe drawNatoCounter()');
  const shapes = {}, counts = {};
  for (const type of types) {
    const g = makeGame();
    let threw = null, r = null;
    try { r = drawUnit(g, { type, tier: 1, owner: 1, mv: 1, at: 1 }); }
    catch (e) { threw = e; }
    ok(!threw, type + ': dibuja sin imágenes ni errores');
    const pathOps = r ? r.ops.filter(o => ['moveTo', 'lineTo', 'quad', 'arc'].indexOf(o.op) >= 0) : [];
    shapes[type] = pathOps.map(o => o.op + ':' + (o.x != null ? Math.round(o.x) + ',' + Math.round(o.y) : '')).join('|');
    counts[type] = { move: count(r || { ops: [] }, 'moveTo'), line: count(r || { ops: [] }, 'lineTo'), quad: count(r || { ops: [] }, 'quad'), arc: count(r || { ops: [] }, 'arc') };
  }
  ok(counts.INF.move === 2 && counts.INF.line === 2 && counts.INF.quad === 0, 'INF: aspa (2 diagonales)');
  ok(counts.CAB.move === 1 && counts.CAB.line === 1, 'CAB: diagonal única');
  ok(counts.SIE.arc === 1 && counts.SIE.move === 0, 'SIE: punto de artillería (círculo)');
  ok(counts.ENG.move === 3 && counts.ENG.line === 3, 'ENG: puente |--| (3 trazos)');
  ok(counts.ARC.quad === 0 && counts.ARC.move === 3, 'ARC: flecha (asta + 2 plumas)');
  ok(counts.BAR.quad === 2 && counts.BAR.move === 1, 'BAR: ondulación naval');
  ok(new Set(types.map(t => shapes[t])).size === types.length, 'cada rol dibuja una figura distinta');
}

// ---------------------------------------------------------------------------
// 2. Escalón de veteranía
// ---------------------------------------------------------------------------
{
  const tiers = { 1: 'I', 2: 'II', 3: 'III', 4: 'X' };
  for (const [tier, mark] of Object.entries(tiers)) {
    const g = makeGame();
    const r = drawUnit(g, { type: 'INF', tier: +tier, owner: 1, mv: 1, at: 1 });
    ok(textOps(r).some(o => o.t === mark), 'Tier ' + tier + ' muestra "' + mark + '"');
  }
}

// ---------------------------------------------------------------------------
// 3. Ataque y defensa dinámica (color y valor por terreno/aura/deg)
// ---------------------------------------------------------------------------
{
  // Llano: defensa blanca.
  let g = makeGame();
  let r = drawUnit(g, { type: 'INF', tier: 1, owner: 1, mv: 1, at: 1 });
  let def = textOps(r).find(o => String(o.t).indexOf('🛡') === 0);
  ok(!!def && def.t === '🛡1' && def.fill === '#ffffff', 'llano: 🛡1 en blanco (' + (def && def.t) + ')');

  // Colina: +1 y verde con ▲.
  g = makeGame();
  r = drawUnit(g, { type: 'INF', tier: 1, owner: 1, mv: 1, at: 1 }, { terrain: T.COLINA });
  def = textOps(r).find(o => String(o.t).indexOf('🛡') === 0);
  ok(def && def.t === '🛡2▲' && def.fill === '#4ade80', 'colina: +1, verde y ▲ (' + (def && def.t) + ')');

  // Montaña: +2 (INF) y verde.
  g = makeGame();
  r = drawUnit(g, { type: 'INF', tier: 1, owner: 1, mv: 1, at: 1 }, { terrain: T.MONTANA });
  def = textOps(r).find(o => String(o.t).indexOf('🛡') === 0);
  ok(def && def.t === '🛡3▲' && def.fill === '#4ade80', 'montaña: +2 y verde (' + (def && def.t) + ')');

  // Bastión adyacente: aura azul.
  g = makeGame();
  const ci = g._grid.list[0].i;
  const nb = g.cells[g._grid.nb[ci][0]];
  nb.b = B.BASTION; nb.o = 1; nb.sup = 1;
  r = drawUnit(g, { type: 'INF', tier: 1, owner: 1, mv: 1, at: 1 }, { cell: ci });
  def = textOps(r).find(o => String(o.t).indexOf('🛡') === 0);
  ok(def && def.t === '🛡2' && def.fill === '#38bdf8', 'bastión vecino: aura azul (' + (def && def.t) + ')');

  // Ablandada por disparo: rojo con ▼ y defensa reducida.
  g = makeGame();
  r = drawUnit(g, { type: 'INF', tier: 1, owner: 1, mv: 1, at: 1 }, { deg: 1 });
  def = textOps(r).find(o => String(o.t).indexOf('🛡') === 0);
  ok(def && def.t === '🛡0▼' && def.fill === '#f87171', 'deg: defensa reducida en rojo (' + (def && def.t) + ')');

  // Ataque efectivo en la esquina inferior izquierda.
  g = makeGame();
  const u = { type: 'INF', tier: 2, owner: 1, mv: 1, at: 1 };
  const uCell = g.cells[g._grid.list[0].i];
  r = drawUnit(g, u, { cell: uCell.i });
  const atk = textOps(r).find(o => String(o.t).indexOf('⚔') === 0);
  const defOp = textOps(r).find(o => String(o.t).indexOf('🛡') === 0);
  ok(atk && atk.t === '⚔' + HF.attackOf(g, u, false, uCell), 'ataque efectivo con ⚔ (' + (atk && atk.t) + ')');
  ok(atk && defOp && atk.x < CX && defOp.x > CX, 'ataque a la izquierda y defensa a la derecha');
}

// ---------------------------------------------------------------------------
// 4. Marco de disponibilidad y economía de dibujo
// ---------------------------------------------------------------------------
{
  let g = makeGame();
  let r = drawUnit(g, { type: 'INF', tier: 1, owner: 1, mv: 1, at: 1 });
  let frame = r.ops.find(o => o.op === 'strokeRect');
  ok(frame && frame.stroke === '#ffffff' && frame.width === 2, 'unidad lista: marco blanco de 2 px');
  ok(frame && Math.abs(frame.w - FS * 1.1) < .01 && Math.abs(frame.h - FS * .72) < .01, 'proporción W=1.1fs, H=0.72fs');

  g = makeGame();
  r = drawUnit(g, { type: 'INF', tier: 1, owner: 1, mv: 0, at: 0 });
  frame = r.ops.find(o => o.op === 'strokeRect');
  ok(frame && frame.stroke === '#000000', 'unidad agotada: marco negro');

  ok(r.ops.length < 60, 'una ficha usa menos de 60 operaciones de canvas (' + r.ops.length + ')');
}

// ---------------------------------------------------------------------------
// 5. Unidades comerciales y selector de vistas
// ---------------------------------------------------------------------------
{
  const g = makeGame();
  const board = Object.create(P);
  board.colors = ['#3b82f6', '#ef4444'];
  board.game = g;
  const fake = k => {
    const ctx = recorder();
    P.drawTradeCounter.call(board, ctx, { kind: k, owner: 1 }, CX, CY, FS);
    return textOps({ ops: ctx.ops }).map(o => o.t).join('');
  };
  ok(fake('land') === 'T', 'carreta: chit con T');
  ok(fake('sea') === '≈', 'urca: chit de superficie ≈');
  ok(fake('cargo') === '▣', 'urca de carga: chit con caja ▣');

  HF.store.set('settings', { nato: false });
  let keys = HF.gameViews().map(v => v.key);
  ok(keys.join(',') === 'normal,combat,politic,resource', 'sin simbología: vista de combate clásica');
  HF.store.set('settings', { nato: true });
  keys = HF.gameViews().map(v => v.key);
  const natoView = HF.gameViews().find(v => v.key === 'nato');
  ok(keys.join(',') === 'normal,nato,politic,resource', 'con simbología: la vista de combate pasa a Táctico OTAN');
  ok(!!natoView && natoView.icon === '🎖️' && /OTAN/.test(natoView.name), 'la vista OTAN tiene icono y nombre propios');
  ok(HF.settings().nato === true, 'la preferencia se guarda en ajustes');
  HF.store.set('settings', {});
}

console.log(fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK');
process.exit(fail ? 1 : 0);
