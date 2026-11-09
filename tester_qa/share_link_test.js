'use strict';
// Enlaces compartidos: el enlace corto de mapa (?m=XXXXX) y el de semilla
// (?seed=…) deben abrirse desde el mismo campo que las repeticiones.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function FakeEl(html) {
  this._html = '';
  this._nodes = new Map();
  this._fc = null;
  this.classList = { add() { }, remove() { }, toggle() { } };
  this.style = {};
  this.dataset = {};
  this.innerHTML = html || '';
}
Object.defineProperty(FakeEl.prototype, 'innerHTML', {
  get() { return this._html; },
  set(v) { this._html = String(v); this._nodes.clear(); this._fc = null; }
});
Object.defineProperty(FakeEl.prototype, 'firstChild', {
  get() { if (!this._fc) this._fc = new FakeEl(this._html); return this._fc; }
});
FakeEl.prototype._node = function (id) {
  if (!this._nodes.has(id)) {
    const n = new FakeEl();
    n.id = id;
    n.onclick = null;
    n.value = '';
    n.textContent = '';
    n.disabled = false;
    n.focus = function () { };
    this._nodes.set(id, n);
  }
  return this._nodes.get(id);
};
FakeEl.prototype.querySelector = function (sel) {
  if (sel === '[data-back]') return this._node('back');
  if (sel.charAt(0) === '#' && this._html.indexOf('id="' + sel.slice(1) + '"') >= 0) return this._node(sel.slice(1));
  return null;
};
FakeEl.prototype.querySelectorAll = function () { return []; };
FakeEl.prototype.addEventListener = function () { };
FakeEl.prototype.removeEventListener = function () { };

const appEl = new FakeEl();
const modalEl = new FakeEl();
const toastEl = new FakeEl();
const doc = {
  querySelector(sel) {
    if (sel === '#app') return appEl;
    if (sel === '#modal') return modalEl;
    if (sel === '#toast') return toastEl;
    return null;
  },
  querySelectorAll() { return []; },
  getElementById(id) {
    if (id === 'app') return appEl;
    if (id === 'modal') return modalEl;
    if (id === 'toast') return toastEl;
    return null;
  },
  createElement() { return new FakeEl(); },
  addEventListener() { }, removeEventListener() { },
  documentElement: { lang: 'es', dir: 'ltr' },
  body: { classList: { add() { }, remove() { }, toggle() { } }, style: {} },
  visibilityState: 'visible', hidden: false
};

const sandbox = {
  console, document: doc, window: null,
  navigator: { onLine: false, language: 'es' },
  localStorage: null, setTimeout, clearTimeout, setInterval, clearInterval,
  performance: { now: () => Date.now() },
  confirm: () => false,
  fetch: () => Promise.resolve({ ok: false, status: 0, text: () => Promise.resolve(''), json: () => Promise.resolve({}) })
};
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ['util.js', 'config.js', 'data.js', 'i18n.js', 'links.js', 'names.js', 'cloud.js', 'progress.js', 'screens.js', 'maps.js', 'replay.js', 'replays.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox);
}
const HF = sandbox.HF;

let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };

// ---------------------------------------------------------------------------
// 1. parseMapRef reconoce los enlaces cortos
// ---------------------------------------------------------------------------
ok(HF.parseMapRef('https://federati.org/?m=X9K2A').kind === 'short', 'reconoce ?m= como enlace corto');
ok(HF.parseMapRef('https://federati.org/?m=X9K2A').code === 'X9K2A', 'extrae el código del enlace corto');
ok(HF.parseMapRef('X9K2A').kind === 'short', 'reconoce un código corto suelto');
ok(HF.parseMapRef('https://federati.org/?seed=7K2M9QXAB').kind === 'seed', 'reconoce ?seed= como semilla');
ok(HF.parseMapRef('https://federati.org/?seed=7K2M9QXAB').token === '7K2M9QXAB', 'extrae el token de semilla');
ok(HF.parseMapRef('https://federati.org/?r=X9K2A').kind === 'shortReplay', 'reconoce ?r= como repetición corta');
ok(HF.parseMapRef('https://federati.org/#map=12').kind === 'id', 'reconoce #map= como id');
ok(HF.parseMapRef('https://federati.org/#replay=zABC').kind === 'replay', 'reconoce #replay=');
ok(HF.parseMapRef('hola').kind === 'invalid', 'un texto sin sentido sigue siendo inválido');

// ---------------------------------------------------------------------------
// 2. El campo de repetición enruta también los enlaces de mapa
// ---------------------------------------------------------------------------
const mapCalls = [], replayCalls = [];
HF.manualMapUse = (raw, action) => { mapCalls.push({ raw: raw, action: action }); return Promise.resolve({ ok: true }); };
HF.playReplayFromCode = code => { replayCalls.push(code); };

function submit(value) {
  HF.replayCodePrompt();
  const box = modalEl.firstChild.querySelector('#repInput');
  box.value = value;
  modalEl.firstChild.querySelector('#repGo').onclick();
}

submit('https://federati.org/?m=X9K2A');
ok(mapCalls.length === 1 && mapCalls[0].action === 'play' && /\?m=X9K2A/.test(mapCalls[0].raw), 'el enlace corto ?m= se abre como mapa');
ok(replayCalls.length === 0, 'el enlace corto no se intenta como repetición');

submit('X9K2A');
ok(mapCalls.length === 2 && mapCalls[1].raw === 'X9K2A', 'un código corto suelto también abre el mapa');

submit('https://federati.org/?seed=7K2M9QXAB');
ok(mapCalls.length === 3 && /\?seed=/.test(mapCalls[2].raw), 'el enlace de semilla ?seed= se abre como mapa');

submit('https://federati.org/#map=12');
ok(mapCalls.length === 4 && /#map=12/.test(mapCalls[3].raw), 'el enlace #map= se abre como mapa');

submit('v1:7:9:AAAA');
ok(mapCalls.length === 5 && mapCalls[4].raw === 'v1:7:9:AAAA', 'un código v1: se abre como mapa');

submit('https://federati.org/#replay=zABCDEFGH');
ok(replayCalls.length === 1 && replayCalls[0] === 'zABCDEFGH', 'un enlace #replay= sigue abriendo la repetición');
ok(mapCalls.length === 5, 'el enlace de repetición no se desvía al mapa');

submit('zABCDEFGHIJKL');
ok(replayCalls.length === 2 && replayCalls[1] === 'zABCDEFGHIJKL', 'un código de repetición suelto sigue funcionando');

// ---------------------------------------------------------------------------
// 3. El enlace corto de repetición se resuelve y se reproduce
// ---------------------------------------------------------------------------
(async () => {
  let resolved = null;
  replayCalls.length = 0;
  HF.cloud.resolveShortMap = code => { resolved = code; return Promise.resolve({ ok: true, code: 'zFULLREPLAY' }); };
  submit('https://federati.org/?r=X9K2A');
  await new Promise(r => setTimeout(r, 0));
  ok(resolved === 'X9K2A', 'resuelve el código del enlace ?r=');
  ok(replayCalls.length === 1 && replayCalls[0] === 'zFULLREPLAY', '?r= reproduce la partida resuelta');

  // -------------------------------------------------------------------------
  // 4. Compartir una repetición genera un enlace corto ?r=
  // -------------------------------------------------------------------------
  HF.CFG.share.base = 'https://federati.org/';
  HF.cloud.shortenMap = () => Promise.resolve({ ok: true, code: 'X9K2A' });
  HF.store.set('replay_history', [{ id: 'R1', label: 'Partida', turn: 5, over: true, won: true }]);
  HF.store.set('replay_data', { R1: { payload: { v: 1, setup: {}, log: [] }, code: 'zFULLREPLAY' } });
  let sharedHtml = '';
  HF.modal = html => { sharedHtml = html; };
  await HF.replays.share('R1');
  ok(sharedHtml.indexOf('?r=X9K2A') >= 0, 'la repetición se comparte con enlace corto ?r=');
  ok(sharedHtml.indexOf('Enlace corto de la repetición') >= 0, 'el modal identifica el enlace corto');

  console.log(fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK');
  process.exit(fail ? 1 : 0);
})();
