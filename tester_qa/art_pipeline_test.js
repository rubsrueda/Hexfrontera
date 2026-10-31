'use strict';
// Prueba de humo del pipeline de arte sin navegador: canvas falso con drawImage
// por vecino mas cercano y getImageData/putImageData reales sobre un buffer.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

class Ctx {
  constructor(cv) { this.cv = cv; }
  _buf(src) { return src._data || src.data || null; }
  drawImage(src, ...a) {
    const s = this._buf(src);
    if (!s) return;
    const sw0 = src.width, sh0 = src.height;
    let sx = 0, sy = 0, sw = sw0, sh = sh0, dx, dy, dw, dh;
    if (a.length === 4) { [dx, dy, dw, dh] = a; }
    else { [sx, sy, sw, sh, dx, dy, dw, dh] = a; }
    const dst = this.cv._data, W = this.cv.width;
    for (let y = 0; y < dh; y++) {
      const py = dy + y;
      if (py < 0 || py >= this.cv.height) continue;
      const syy = Math.min(sh0 - 1, Math.max(0, sy + Math.floor((y + .5) * sh / dh)));
      for (let x = 0; x < dw; x++) {
        const px = dx + x;
        if (px < 0 || px >= W) continue;
        const sxx = Math.min(sw0 - 1, Math.max(0, sx + Math.floor((x + .5) * sw / dw)));
        const si = (syy * sw0 + sxx) * 4, di = (py * W + px) * 4;
        dst[di] = s[si]; dst[di + 1] = s[si + 1]; dst[di + 2] = s[si + 2]; dst[di + 3] = s[si + 3];
      }
    }
  }
  getImageData(x, y, w, h) {
    const out = new Uint8ClampedArray(w * h * 4);
    for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
      const si = ((y + py) * this.cv.width + (x + px)) * 4, di = (py * w + px) * 4;
      out[di] = this.cv._data[si]; out[di + 1] = this.cv._data[si + 1];
      out[di + 2] = this.cv._data[si + 2]; out[di + 3] = this.cv._data[si + 3];
    }
    return { width: w, height: h, data: out };
  }
  putImageData(id, x, y) {
    for (let py = 0; py < id.height; py++) for (let px = 0; px < id.width; px++) {
      const si = (py * id.width + px) * 4, di = ((y + py) * this.cv.width + (x + px)) * 4;
      this.cv._data[di] = id.data[si]; this.cv._data[di + 1] = id.data[si + 1];
      this.cv._data[di + 2] = id.data[si + 2]; this.cv._data[di + 3] = id.data[si + 3];
    }
  }
  clip() {} save() {} restore() {} setTransform() {} beginPath() {} fill() {} stroke() {}
}

class Canvas {
  constructor(w, h) { this._w = w | 0; this._h = h | 0; this._data = new Uint8ClampedArray(this._w * this._h * 4); }
  get width() { return this._w; }
  set width(v) { this._w = v | 0; this._data = new Uint8ClampedArray(this._w * this._h * 4); }
  get height() { return this._h; }
  set height(v) { this._h = v | 0; this._data = new Uint8ClampedArray(this._w * this._h * 4); }
  getContext() { return new Ctx(this); }
  toDataURL() { return 'data:image/png;base64,FAKE'; }
}

const PENDING = {};

class Image {
  constructor() { this.width = 0; this.height = 0; this._data = null; }
  set src(v) {
    const img = PENDING[v];
    if (!img) { if (this.onerror) setTimeout(() => this.onerror(), 0); return; }
    this.width = img.width; this.height = img.height; this._data = img.data;
    setTimeout(() => this.onload && this.onload(), 0);
  }
}

const sandbox = {
  console,
  document: { createElement: t => (t === 'canvas' ? new Canvas(1, 1) : {}) },
  Image,
  DOMMatrix: class { translate() { return this; } scale() { return this; } },
  window: null
};
sandbox.window = sandbox;
sandbox.HF = { ARTDATA: {}, CFG: {} };
vm.createContext(sandbox);

// sprite de 40x20 con contenido opaco 24x4 en el centro
const W0 = 40, H0 = 20, data = new Uint8ClampedArray(W0 * H0 * 4);
for (let y = 8; y < 12; y++) for (let x = 8; x < 32; x++) {
  const i = (y * W0 + x) * 4;
  data[i] = 200; data[i + 1] = 120; data[i + 2] = 60; data[i + 3] = 255;
}
PENDING.fake = { width: W0, height: H0, data };
sandbox.HF.ARTDATA.resMADERA = 'fake';

// segunda imagen para unidades: debe conservar el encuadre completo
const data2 = new Uint8ClampedArray(W0 * H0 * 4);
for (let y = 0; y < H0; y++) for (let x = 0; x < W0; x++) {
  const i = (y * W0 + x) * 4;
  const inside = x > 12 && x < 28 && y > 2 && y < 18;
  data2[i] = 90; data2[i + 1] = 140; data2[i + 2] = 200; data2[i + 3] = inside ? 255 : 0;
}
PENDING.fakeUnit = { width: W0, height: H0, data: data2 };
sandbox.HF.ARTDATA.INF = 'fakeUnit';

vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'art.js'), 'utf8'), sandbox);

function assert(cond, msg) { if (!cond) { console.error('FAIL: ' + msg); process.exitCode = 1; } else console.log('ok   ' + msg); }

setTimeout(() => {
  const art = sandbox.HF.art;
  art.get('resource', 'resMADERA');   // dispara la carga
}, 0);

setTimeout(() => {
  const art = sandbox.HF.art;
  const sprite = art.get('resource', 'resMADERA');
  assert(!!sprite, 'sprite cargado');
  assert(sprite && sprite.width === 24 && sprite.height === 4,
    `recorte al contenido de recursos (24x4) -> ${sprite && sprite.width}x${sprite && sprite.height}`);

  // draw() debe encajar dentro de la caja
  const calls = [];
  const rec = { drawImage: (...a) => calls.push(a) };
  art.draw(rec, 'resource', 'resMADERA', 100, 100, 40, 40);
  const [, dx, dy, dw, dh] = calls[0];
  assert(dw <= 40.0001 && dh <= 40.0001, `draw() encaja en la caja (${dw.toFixed(1)}x${dh.toFixed(1)})`);
  assert(Math.abs((dx + dw / 2) - 100) < .01 && Math.abs((dy + dh / 2) - 100) < .01, 'draw() centrado en la casilla');

  // cover() debe cubrir por completo el recuadro del hexagono
  calls.length = 0;
  const hw = 30 * Math.sqrt(3), hh = 60;
  art.cover(rec, 'resource', 'resMADERA', 200, 200, hw, hh);
  const [, cx, cy, cw, ch] = calls[0];
  assert(cw >= hw - .01 && ch >= hh - .01, `cover() cubre el hexagono (${cw.toFixed(1)}x${ch.toFixed(1)} >= ${hw.toFixed(1)}x${hh})`);
  assert(Math.abs((cx + cw / 2) - 200) < .01 && Math.abs((cy + ch / 2) - 200) < .01, 'cover() centrado en la casilla');

  // el icono HTML usa el sprite recortado
  const html = art.html('resource', 'resMADERA', 'X', 28);
  assert(/^<img class="ico"/.test(html) && html.indexOf('FAKE') > 0, 'html() genera <img> con el recorte');

  // drawStretched(): crece en vertical y mantiene fija la base
  calls.length = 0;
  art.draw(rec, 'resource', 'resMADERA', 100, 100, 40, 40);
  const dw0 = calls[0][3], dh0 = calls[0][4];
  calls.length = 0;
  art.drawStretched(rec, 'resource', 'resMADERA', 100, 100, 40, 40, 1.5);
  const [, sx2, sy2, sw2, sh2] = calls[0];
  assert(Math.abs(sh2 - dh0 * 1.5) < .01, `drawStretched() estira la altura (${dh0.toFixed(2)} -> ${sh2.toFixed(2)})`);
  assert(Math.abs(sw2 - dw0) < .01, 'drawStretched() conserva el ancho');
  assert(Math.abs((sy2 + sh2) - (100 + dh0 / 2)) < .01, 'drawStretched() deja la base en su sitio');
  void sx2;

  // las unidades conservan el encuadre original (escala comun del arte)
  art.get('unit', 'INF');
}, 30);

setTimeout(() => {
  const unit = sandbox.HF.art.get('unit', 'INF');
  assert(!!unit && unit.width === W0 && unit.height === H0,
    `unidad sin recorte conserva el encuadre (${unit && unit.width}x${unit && unit.height})`);

  console.log(process.exitCode ? 'CON FALLOS' : 'TODO OK');
}, 80);

