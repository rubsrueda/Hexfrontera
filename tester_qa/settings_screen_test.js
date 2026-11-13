'use strict';
// Regresión de la pantalla de Ajustes:
//   · idioma como <select> (no una rejilla de botones)
//   · «Cuenta y licencia» con PayPal en web y el pago/registro manual como respaldo
//   · fuera la tarjeta de «Enlaces para compartir» y la de «Comentarios»
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ---------------------------------------------------------------------------
// DOM mínimo (sin jsdom): basta con registrar id="…" y devolver nodos con
// onclick/onchange para comprobar el cableado.
// ---------------------------------------------------------------------------
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
  if (sel === '[data-back]') return this._node('back');
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

const fetchCalls = [];
const sandbox = {
  console, document: doc, window: null,
  navigator: { onLine: true, language: 'es' },
  localStorage: null, setTimeout, clearTimeout, setInterval, clearInterval,
  performance: { now: () => Date.now() },
  confirm: () => false,
  fetch(url, opts) {
    fetchCalls.push({ url: url, opts: opts });
    return Promise.resolve({
      ok: true, status: 200,
      text: () => Promise.resolve('{"success":true}'),
      json: () => Promise.resolve({ success: true })
    });
  }
};
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ['util.js', 'config.js', 'i18n.js', 'cloud.js', 'payment.js', 'screens.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox);
}
const HF = sandbox.HF;

let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };
const render = () => { HF.go('settings'); return appEl.innerHTML; };

// ---------------------------------------------------------------------------
// 1. Idioma: <select> con una opción por idioma (no botones)
// ---------------------------------------------------------------------------
HF.store.set('settings', { lang: 'es' });
let html = render();
ok(html.indexOf('<select id="langSel"') >= 0, 'el idioma se elige con un <select>');
ok((html.match(/<option value=/g) || []).length === HF.LANGS.length, 'hay una opción por idioma (' + HF.LANGS.length + ')');
ok(html.indexOf('class="langs"') < 0, 'ya no hay rejilla de botones de idioma');
ok(html.indexOf('data-lang=') < 0, 'ya no hay botones data-lang');

// ---------------------------------------------------------------------------
// 2. Cuenta y licencia (usuario Free)
// ---------------------------------------------------------------------------
HF.store.set('is_premium', false);
HF.store.del('recovery_email');
html = render();
ok(html.indexOf('id="licenseCard"') >= 0, 'Ajustes muestra «Cuenta y licencia»');
ok(html.indexOf('id="licenseBuy"') >= 0, 'el usuario Free ve «Desbloquear versión completa»');
ok(html.indexOf('id="licenseRegister"') >= 0, 'el usuario Free ve el registro de la compra');
ok(html.indexOf('id="licenseCheck"') >= 0, 'el usuario Free puede comprobar la licencia');
ok(html.indexOf('id="licenseRestore"') >= 0, 'el usuario Free puede restaurar una compra de otro dispositivo');
ok(html.indexOf('id="licenseRecover"') >= 0, 'el usuario Free también puede recuperar una cuenta comprada en otro dispositivo');
appEl.querySelector('#licenseRestore').onclick();
ok(modalEl.innerHTML.indexOf('id="lkId"') >= 0 && modalEl.innerHTML.indexOf('id="lkKey"') >= 0, '«Restaurar compra» pide ID y llave');
HF.closeModal();
ok(html.indexOf('GRATIS') >= 0 || html.indexOf('FREE') >= 0, 'se muestra la insignia de cuenta gratuita');

// ---------------------------------------------------------------------------
// 3. Fuera las tarjetas de enlaces y comentarios
// ---------------------------------------------------------------------------
ok(html.indexOf('shareCard') < 0, 'no queda la tarjeta «Enlaces para compartir»');
ok(html.indexOf('shareBaseEdit') < 0 && html.indexOf('shareBaseVal') < 0, 'no queda la dirección pública en Ajustes');
ok(html.indexOf('fbCard') < 0, 'no queda la tarjeta «Comentarios»');
ok(html.indexOf('fbKey') < 0, 'no queda el campo de clave de Web3Forms en Ajustes');
ok(html.indexOf('id="secretKey"') < 0 && html.indexOf('id="showKey"') < 0, 'no queda la identidad en formato ficha antigua');

// ---------------------------------------------------------------------------
// 4. Cambio de idioma
// ---------------------------------------------------------------------------
HF.store.set('settings', { lang: 'es' });
render();
const langSel = appEl.querySelector('#langSel');
ok(!!langSel && typeof langSel.onchange === 'function', 'el <select> tiene manejador de cambio');
langSel.value = 'fr';
langSel.onchange();
ok(HF.settings().lang === 'fr', 'el idioma elegido se guarda en los ajustes');
ok(appEl.innerHTML.indexOf('<select id="langSel"') >= 0, 'la pantalla se vuelve a pintar tras cambiar de idioma');

// ---------------------------------------------------------------------------
// 5. Usuario Premium: estado, correo, recuperar y vincular
// ---------------------------------------------------------------------------
HF.store.set('settings', { lang: 'es' });
HF.store.set('is_premium', true);
HF.store.set('recovery_email', 'comandante@ejemplo.com');
html = render();
ok(html.indexOf('PREMIUM') >= 0, 'el usuario Premium ve la insignia PREMIUM');
ok(html.indexOf('comandante@ejemplo.com') >= 0, 'se muestra el correo de respaldo');
ok(html.indexOf('id="licenseRecover"') >= 0, 'el usuario Premium ve «Recuperar cuenta»');
ok(html.indexOf('id="licenseLink"') >= 0, 'el usuario Premium ve «Vincular dispositivo»');
ok(html.indexOf('id="licenseEmail"') >= 0, 'el usuario Premium puede registrar/cambiar el correo');
ok(html.indexOf('id="licenseBuy"') < 0, 'el usuario Premium no ve el botón de compra');

// Modales de recuperación / vinculación / correo.
appEl.querySelector('#licenseRecover').onclick();
ok(modalEl.innerHTML.indexOf('id="rcMail"') >= 0, '«Recuperar cuenta» pide el correo');
ok(modalEl.innerHTML.indexOf('id="rcLink"') >= 0, '«Recuperar cuenta» ofrece restaurar con ID + llave');

HF.closeModal();
appEl.querySelector('#licenseLink').onclick();
ok(modalEl.innerHTML.indexOf('id="lkId"') >= 0 && modalEl.innerHTML.indexOf('id="lkKey"') >= 0, '«Vincular dispositivo» pide ID y llave');

HF.closeModal();
appEl.querySelector('#licenseEmail').onclick();
ok(modalEl.innerHTML.indexOf('id="emMail"') >= 0, 'el registro de correo abre su formulario');

// ---------------------------------------------------------------------------
// 6. Precios por plataforma y pago manual
// ---------------------------------------------------------------------------
HF.platform = { kind: 'web' };
ok(HF.payment.getPrices().amount === '$4.99 USD', 'Web: precio base $4.99 (PayPal)');
HF.platform = { kind: 'electron' };
ok(HF.payment.getPrices().amount === '$5.99 USD', 'Steam: precio base $5.99');
HF.platform = { kind: 'capacitor' };
sandbox.Capacitor = { getPlatform: () => 'ios' };
ok(HF.payment.getPrices().amount === '$6.99 USD', 'iOS: precio base $6.99');
sandbox.Capacitor = { getPlatform: () => 'android' };
ok(HF.payment.getPrices().amount === '$5.99 USD', 'Android: precio base $5.99');
delete sandbox.Capacitor;
HF.platform = { kind: 'web' };

// El flujo manual sigue existiendo como respaldo (y para escritorio/móvil).
// Aquí se desactiva PayPal para probar esa ruta sin cargar el SDK externo.
HF.CFG.payment.paypal.enabled = false;
HF.store.set('is_premium', false);
HF.CFG.payment.checkout = '';
HF.payment.openPurchase();
ok(modalEl.innerHTML.indexOf('id="payGo"') >= 0, 'el modal de compra ofrece pagar/solicitar');
ok(modalEl.innerHTML.indexOf('id="payAlready"') >= 0, 'el modal de compra ofrece registrar una compra ya hecha');
ok(modalEl.innerHTML.indexOf('id="payCheck"') >= 0, 'el modal de compra permite comprobar la licencia');
ok(modalEl.innerHTML.indexOf('Solicitar licencia') >= 0, 'sin enlace de pago se ofrece la solicitud manual');
const payGoNode = modalEl.firstChild.querySelector('#payGo');
payGoNode.onclick();
ok(modalEl.innerHTML.indexOf('id="payMail"') >= 0, 'la solicitud manual pide el correo');
ok(modalEl.innerHTML.indexOf('id="payRef"') < 0, 'la solicitud de compra no pide referencia de pago');
HF.closeModal();

HF.payment.openPurchase();
modalEl.firstChild.querySelector('#payAlready').onclick();
ok(modalEl.innerHTML.indexOf('id="payMail"') >= 0, '«Ya pagué» pide el correo');
ok(modalEl.innerHTML.indexOf('id="payRef"') >= 0, '«Ya pagué» pide la referencia de la operación');
ok(modalEl.innerHTML.indexOf('referencia de la operación') >= 0, 'el formulario explica el registro de la compra');
HF.closeModal();

HF.platform = { kind: 'electron' };
HF.CFG.payment.checkout = 'https://store.example.com/buy';
HF.payment.openPurchase();
ok(modalEl.innerHTML.indexOf('Pagar ahora') >= 0, 'con enlace de tienda configurado se ofrece «Pagar ahora»');
ok(HF.payment._withClientRef('https://store.example.com/buy').indexOf('client_reference_id=') > 0, 'el enlace lleva el ID del jugador');
HF.CFG.payment.checkout = '';
HF.CFG.payment.paypal.enabled = true;
HF.platform = { kind: 'web' };

// ---------------------------------------------------------------------------
// 7. Solicitud manual: validación y envío
// ---------------------------------------------------------------------------
HF.payment.requestLicense({ email: 'no-es-correo' }).then(r => {
  ok(r.ok === false, 'una solicitud con correo inválido se rechaza');

  return HF.payment.requestLicense({ email: 'jugador@ejemplo.com', reference: 'REC-123', kind: 'paid' });
}).then(r => {
  ok(r.ok === true && r.sent === true, 'el registro de una compra se envía al buzón');
  const last = HF.payment.pendingRequest();
  ok(last && last.email === 'jugador@ejemplo.com' && last.reference === 'REC-123', 'la solicitud guarda correo y referencia');
  ok(fetchCalls.some(c => /web3forms/.test(c.url)), 'se usa el endpoint de Web3Forms');
  ok(fetchCalls.some(c => /registro de licencia/i.test(String(c.opts && c.opts.body))), 'el asunto identifica el registro de licencia');
  return HF.payment.requestLicense({ email: 'comprar@ejemplo.com', kind: 'buy' });
}).then(r => {
  ok(r.ok === true && r.sent === true, 'la solicitud de compra se envía al buzón');
  ok(fetchCalls.some(c => /solicitud de compra/i.test(String(c.opts && c.opts.body))), 'el asunto identifica la solicitud de compra');

  // La tarjeta Free, tras registrar, mantiene el botón de comprobar licencia.
  HF.store.set('is_premium', false);
  const h = render();
  ok(h.indexOf('id="licenseCheck"') >= 0, 'sigue disponible «Comprobar licencia» tras la solicitud');
  ok(h.indexOf('Solicitud de compra registrada') >= 0, 'la tarjeta Free recuerda la solicitud pendiente');

  console.log(fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK');
  process.exit(fail ? 1 : 0);
}).catch(e => {
  console.error('FAIL: excepción en la solicitud manual:', e);
  process.exit(1);
});
