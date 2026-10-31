'use strict';
// Verifica que la proyección inclinada conserva el reparto hexagonal exacto:
// pos -> toScreen -> fromScreen -> hit debe devolver la misma casilla.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctxStub = new Proxy({}, {
  get(_, k) {
    if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop() { } });
    if (k === 'createPattern') return () => null;
    if (k === 'measureText') return () => ({ width: 10 });
    return () => { };
  }
});

function el() {
  return {
    style: {}, innerHTML: '', dataset: {}, classList: { add() { }, remove() { }, toggle() { } },
    querySelector: () => null, querySelectorAll: () => [], appendChild() { }, addEventListener() { },
    getContext: () => ctxStub, width: 0, height: 0,
    parentElement: { clientWidth: 900, clientHeight: 620 }
  };
}

const HF = {
  T: { MAR: 0, LLANO: 1, COLINA: 2, MONTANA: 3, RIO: 4 },
  B: { NINGUNO: 0, ARBOL: 1, CAMINO: 2, CAMPAMENTO: 3, PUEBLO: 4, CIUDAD: 5, BASTION: 6 },
  COLORS: ['#fff'], CFG: { ambience: {}, view: { tilt: 0.62 } },
  settings: () => ({ grid: true }), season: () => 0, nbs: () => [], tradeRoutes: () => [],
  art: { onLoad() { }, preload() { } }
};

const sandbox = {
  console, HF, document: { createElement: () => el(), addEventListener() { } },
  ResizeObserver: class { observe() { } },
  devicePixelRatio: 1, requestAnimationFrame() { }, cancelAnimationFrame() { },
  performance: { now: () => 0 }, DOMMatrix: class { translate() { return this; } scale() { return this; } }
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'board.js'), 'utf8'), sandbox);

const Board = HF.Board;
const cv = el();
cv.parentElement = el();
cv.parentElement.clientWidth = 900; cv.parentElement.clientHeight = 620;
const b = new Board(cv, {});
b.W = 900; b.H = 620; b.dpr = 1;
b.R = 7; b.size = 24;
b.cells = [];
const N = 2 * b.R + 1;
for (let q = -b.R; q <= b.R; q++) for (let r = -b.R; r <= b.R; r++) {
  if (Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) > b.R) continue;  // fuera del mapa hexagonal
  const i = (q + b.R) * N + (r + b.R);
  b.cells[i] = { i, q, r, t: 1 };
}

const TILT = HF.CFG.view.tilt;
let bad = 0, checked = 0;
for (const c of b.cells) {
  if (!c) continue;
  const [wx, wy] = b.pos(c), [sx, sy] = b.toScreen(wx, wy);
  const [bx, by] = b.fromScreen(sx, sy);
  const i = b.hit(sx, sy);
  checked++;
  if (i !== c.i || Math.abs(bx - wx) > 1e-6 || Math.abs(by - wy) > 1e-6) {
    if (bad < 5) console.log('FALLA', c.q, c.r, '->', i, 'esperado', c.i, 'mundo', wx.toFixed(2), wy.toFixed(2), 'ida', bx.toFixed(2), by.toFixed(2));
    bad++;
  }
}
console.log('casillas comprobadas:', checked, '| fallos:', bad);

// La separación vertical en pantalla debe quedar comprimida por TILT.
const at = (q, r) => b.cells[(q + b.R) * N + (r + b.R)];
const a = at(0, 0), d = at(0, 1); // misma q, r+1
const [, ya] = b.toScreen(...b.pos(a)), [, yd] = b.toScreen(...b.pos(d));
const ratio = (yd - ya) / (b.size * 1.5 * b.cam.z);
console.log('separación vertical / mundo:', ratio.toFixed(3), '(esperado ' + TILT.toFixed(3) + ')');

// Dirección -> arista: los faldones de costa deben caer en el lado SUR real.
// (Antes se usaba el índice de dirección como arista y salían en el norte.)
const rec = {
  polys: [], _cur: null,
  beginPath() { this._cur = []; },
  moveTo(x, y) { this._cur.push([x, y]); },
  lineTo(x, y) { this._cur.push([x, y]); },
  closePath() { if (this._cur) this.polys.push(this._cur); this._cur = null; },
  fill() { }, stroke() { },
  createLinearGradient() { return { addColorStop() { } }; },
  set fillStyle(v) { }, set strokeStyle(v) { }, set lineWidth(v) { }
};
b._nbs = () => [];
b.game = null;
const land = { i: 0, q: 0, r: 0, t: 1 };
b.cells = [land];
const X = 100, Y0 = 100, FS2 = 24, LIFT = 2;
b._drawCoastalExtrusion(rec, land, X, Y0, FS2, LIFT);
const v = k => b._vert(X, Y0 - LIFT, FS2, k);
const near = (p, q) => Math.abs(p[0] - q[0]) < 1e-6 && Math.abs(p[1] - q[1]) < 1e-6;
let edgesOk = rec.polys.length === 2;
if (edgesOk) {
  edgesOk = near(rec.polys[0][0], v(2)) && near(rec.polys[0][1], v(3)) &&
    near(rec.polys[1][0], v(1)) && near(rec.polys[1][1], v(2));
}
const dropOk = rec.polys.length === 2 &&
  Math.abs(rec.polys[1][2][1] - rec.polys[1][1][1] - 8) < 1e-6;
console.log('faldón de costa en las aristas sur:', edgesOk ? 'ok' : 'FALLA');
console.log('faldón cae 8 px:', dropOk ? 'ok' : 'FALLA');

// startView(): encuadra como fit() y aplica el acercamiento inicial.
b.cells = null; b.R = 7;
b.fit();
const fitZ = b.cam.z;
b.startView();
const k = (HF.CFG.view && HF.CFG.view.startZoom) || 1.2;
const expectZ = Math.min(3.5, Math.max(fitZ, 1.2) * k);
const startOk = Math.abs(b.cam.z - expectZ) < 1e-9;
console.log('zoom de fit:', fitZ.toFixed(3), '-> zoom inicial:', b.cam.z.toFixed(3), startOk ? 'ok' : 'FALLA');

console.log(bad === 0 && Math.abs(ratio - TILT) < 1e-6 && edgesOk && dropOk && startOk ? 'TODO OK' : 'CON FALLOS');
