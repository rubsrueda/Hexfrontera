'use strict';
// ---------------------------------------------------------------------------
// Regresión de la cuenta:
//   · editar la llave secreta desde Ajustes
//   · recuperar credenciales por correo (ID + llave)
//   · vincular un dispositivo con ID + llave
// No prueba la red: mockea los métodos de HF.cloud y verifica el cableado UI.
// ---------------------------------------------------------------------------
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
  get() {
    if (!this._fc) this._fc = new FakeEl(this._html);
    return this._fc;
  }
});
FakeEl.prototype._node = function (id) {
  if (!this._nodes.has(id)) {
    this._nodes.set(id, {
      id: id, onclick: null, onchange: null, oninput: null, onkeydown: null,
      value: '', textContent: '', disabled: false, dataset: {},
      classList: { add() { }, remove() { }, toggle() { } }, style: {},
      focus() { }
    });
  }
  return this._nodes.get(id);
};
FakeEl.prototype.querySelector = function (sel) {
  if (sel.charAt(0) === '#' && this._html.indexOf('id="' + sel.slice(1) + '"') >= 0) return this._node(sel.slice(1));
  return null;
};
FakeEl.prototype.querySelectorAll = function (sel) {
  const out = [];
  if (sel === '[data-k]') {
    const re = /data-k="([^"]+)"/g;
    let m;
    while ((m = re.exec(this._html))) {
      const n = this._node('k:' + m[1]);
      n.dataset.k = m[1];
      out.push(n);
    }
  }
  return out;
};

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
  createElement() { return new FakeEl(); },
  addEventListener() { }, removeEventListener() { },
  documentElement: { lang: 'es', dir: 'ltr' },
  body: { classList: { add() { }, remove() { }, toggle() { } }, style: {} },
  visibilityState: 'visible', hidden: false
};

const sandbox = {
  console, document: doc, window: null,
  navigator: { onLine: true, language: 'es' },
  localStorage: null, setTimeout, clearTimeout, setInterval, clearInterval,
  performance: { now: () => Date.now() },
  confirm: () => false,
  fetch() { return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('{}'), json: () => Promise.resolve({}) }); }
};
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ['util.js', 'config.js', 'i18n.js', 'cloud.js', 'screens.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox);
}
const HF = sandbox.HF;

let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };
const tick = (ms) => new Promise(r => setTimeout(r, ms == null ? 0 : ms));

// Identidad local de prueba.
HF.store.set('player_id', 'HF-TEST0001');
HF.store.set('secret_key', 'K-OLDKEY');
HF.store.set('cloud_registered', true);
HF.store.set('is_premium', true);
HF.store.set('recovery_email', 'respaldo@example.com');

let newKey = '';
let recoverEmail = '';
let linkId = '';
let linkKey = '';

HF.cloud.generateSecretKey = () => 'K-GENERATED';
HF.cloud.setSecretKey = (value) => { newKey = value; return Promise.resolve({ ok: true }); };
HF.cloud.recoverByEmail = (email) => { recoverEmail = email; return Promise.resolve({ ok: true, sent: true }); };
HF.cloud.linkDevice = (id, key) => { linkId = id; linkKey = key; return Promise.resolve({ ok: true }); };
HF.cloud.recoveryEmail = () => 'respaldo@example.com';

const render = () => { HF.go('settings'); return appEl.innerHTML; };

(async () => {
  // -------------------------------------------------------------------------
  // 1. El botón «Editar llave» existe en Free y Premium
  // -------------------------------------------------------------------------
  HF.store.set('is_premium', true);
  let html = render();
  ok(html.indexOf('id="licenseEditKey"') >= 0, 'el usuario Premium ve «Editar llave»');

  HF.store.set('is_premium', false);
  html = render();
  ok(html.indexOf('id="licenseEditKey"') >= 0, 'el usuario Free también puede editar su llave');
  ok(html.indexOf('id="licenseRestore"') >= 0, 'sigue disponible «Restaurar compra»');
  ok(html.indexOf('id="licenseRecover"') >= 0, 'el usuario Free también puede recuperar su cuenta');

  // -------------------------------------------------------------------------
  // 2. Editar la llave
  // -------------------------------------------------------------------------
  HF.store.set('is_premium', true);
  render();
  appEl.querySelector('#licenseEditKey').onclick();
  ok(modalEl.innerHTML.indexOf('id="skNew"') >= 0, 'el modal de edición pide la nueva llave');
  ok(modalEl.innerHTML.indexOf('K-OLDKEY') >= 0, 'el modal muestra la llave actual');

  const skInput = modalEl.firstChild.querySelector('#skNew');
  skInput.value = 'K-NEWKEY1';
  modalEl.firstChild.querySelector('#skGo').onclick();
  await tick(10);
  ok(newKey === 'K-NEWKEY1', 'se envía la nueva llave al servidor');
  ok(/Llave actualizada/.test(toastEl.textContent), 'se avisa de que la llave se actualizó');

  // -------------------------------------------------------------------------
  // 3. Recuperar credenciales por correo (también en Free)
  // -------------------------------------------------------------------------
  HF.store.set('is_premium', false);
  render();
  appEl.querySelector('#licenseRecover').onclick();
  ok(modalEl.innerHTML.indexOf('id="rcMail"') >= 0, '«Recuperar cuenta» pide el correo');
  const rcInput = modalEl.firstChild.querySelector('#rcMail');
  rcInput.value = 'respaldo@example.com';
  modalEl.firstChild.querySelector('#rcGo').onclick();
  await tick(10);
  ok(recoverEmail === 'respaldo@example.com', 'se envía el correo de respaldo');
  ok(/recibirás tu ID y tu llave|Si el correo existe/.test(toastEl.textContent), 'se explica que las credenciales llegarán por correo');

  // -------------------------------------------------------------------------
  // 4. Vincular dispositivo con ID + llave
  // -------------------------------------------------------------------------
  HF.store.set('is_premium', true);
  render();
  appEl.querySelector('#licenseLink').onclick();
  ok(modalEl.innerHTML.indexOf('id="lkId"') >= 0 && modalEl.innerHTML.indexOf('id="lkKey"') >= 0, '«Vincular dispositivo» pide ID y llave');
  modalEl.firstChild.querySelector('#lkId').value = 'HF-TARGET01';
  modalEl.firstChild.querySelector('#lkKey').value = 'K-TARGET1';
  modalEl.firstChild.querySelector('#lkGo').onclick();
  await tick(10);
  ok(linkId === 'HF-TARGET01' && linkKey === 'K-TARGET1', 'se validan el ID y la llave introducidos');
  ok(/Dispositivo vinculado|Licencia completa activa/.test(toastEl.textContent), 'se confirma la vinculación');

  console.log(fail ? '\nCON FALLOS (' + fail + ')' : '\nTODO OK');
  process.exit(fail ? 1 : 0);
})().catch(e => {
  console.error('FAIL: excepción:', e && e.stack || e);
  process.exit(1);
});
