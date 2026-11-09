'use strict';
// ---------------------------------------------------------------------------
// Regresión del pago web con PayPal:
//   · precio único 4.99 USD y Client ID público en config
//   · el modal monta el botón oficial y NO usa Stripe
//   · createOrder llama a la Edge Function con el player_id activo
//   · onApprove captura y desbloquea Premium al instante (sin reiniciar)
//   · recuperación de una orden pendiente y errores legibles
//   · la Edge Function usa Deno.env (sin secretos hardcodeados) y el SQL
//     registra el cobro y activa is_premium de forma atómica
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ----- DOM mínimo ----------------------------------------------------------
function FakeEl(html) {
  this._html = '';
  this._nodes = new Map();
  this.classList = { add() { }, remove() { }, toggle() { } };
  this.style = {};
  this.dataset = {};
  this.innerHTML = html || '';
}
Object.defineProperty(FakeEl.prototype, 'innerHTML', {
  get() { return this._html; },
  set(v) { this._html = String(v); this._nodes.clear(); }
});
FakeEl.prototype._node = function (id) {
  if (!this._nodes.has(id)) {
    this._nodes.set(id, {
      id: id, onclick: null, onchange: null, onkeydown: null,
      value: '', textContent: '', disabled: false, dataset: {},
      classList: { add() { }, remove() { }, toggle() { } }, style: {},
      focus() { }
    });
  }
  return this._nodes.get(id);
};
FakeEl.prototype.querySelector = function (sel) {
  if (sel.charAt(0) === '#' && this._html.indexOf('id="' + sel.slice(1) + '"') >= 0) {
    return this._node(sel.slice(1));
  }
  return null;
};

const doc = {
  documentElement: { lang: 'es', dir: 'ltr' },
  body: { appendChild() { }, classList: { add() { }, remove() { }, toggle() { } }, style: {} },
  head: { appendChild() { } },
  getElementById() { return null; },
  createElement() { return new FakeEl(); },
  addEventListener() { }, removeEventListener() { },
  querySelector() { return null; }
};

// ----- Respuestas de red ---------------------------------------------------
const calls = [];
let captureMode = 'ok';
let createMode = 'ok';

function reply(body, status) {
  return Promise.resolve({
    ok: (status || 200) < 400,
    status: status || 200,
    text: () => Promise.resolve(JSON.stringify(body)),
    json: () => Promise.resolve(body)
  });
}

function fakeFetch(url, opts) {
  let body = {};
  try { body = JSON.parse((opts && opts.body) || '{}'); } catch (e) { }
  calls.push({ url: String(url), body: body, headers: (opts && opts.headers) || {} });

  if (/\/functions\/v1\/paypal/.test(String(url))) {
    if (body.action === 'create-order') {
      if (createMode === '404') {
        return reply({ code: 'NOT_FOUND', message: 'Requested function was not found' }, 404);
      }
      return reply({ ok: true, id: 'ORDER-123', status: 'CREATED' });
    }
    if (body.action === 'capture-order') {
      if (captureMode === 'pending') {
        return reply({ ok: false, error: 'pago_no_completado' }, 409);
      }
      return reply({
        ok: true, payment_id: 'CAP-123', payer_email: 'buyer@example.com',
        amount: '4.99', currency: 'USD', is_premium: true, already: false
      });
    }
    return reply({ ok: false, error: 'accion_desconocida' }, 400);
  }
  return reply({});
}

// ----- SDK falso de PayPal -------------------------------------------------
let buttonOpts = null;
let renderedInto = null;
const fakePayPal = {
  Buttons(options) {
    buttonOpts = options;
    return {
      render(target) { renderedInto = target; return Promise.resolve(); }
    };
  }
};

// ----- Sandbox -------------------------------------------------------------
const sandbox = {
  console, document: doc, window: null,
  navigator: { onLine: true, language: 'es' },
  localStorage: null, setTimeout, clearTimeout, setInterval, clearInterval,
  performance: { now: () => Date.now() },
  fetch: fakeFetch,
  paypal: fakePayPal,
  CustomEvent: function CustomEvent(type, init) { this.type = type; this.detail = init && init.detail; },
  dispatchEvent() { }
};
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ['util.js', 'config.js', 'i18n.js', 'cloud.js', 'payment.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox);
}
const HF = sandbox.HF;

// ----- Utilidades de prueba ------------------------------------------------
let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };
const tick = (ms) => new Promise(r => setTimeout(r, ms == null ? 0 : ms));

let modalHTML = '';
let modalRoot = null;
let lastToast = '';
let lastScreen = '';

HF.modal = (html, bind) => {
  modalHTML = String(html);
  modalRoot = new FakeEl(html);
  if (bind) bind(modalRoot);
  return modalRoot;
};
HF.closeModal = () => { modalHTML = ''; modalRoot = null; };
HF.toast = (msg) => { lastToast = String(msg); };
HF.go = (name) => { lastScreen = name; };
HF.currentScreen = 'settings';
HF.cloud.refreshProfile = () => Promise.resolve({ ok: true });

function reset() {
  HF.store.set('cloud_registered', true);
  HF.store.set('is_premium', false);
  HF.store.del('recovery_email');
  HF.store.del('paypal_pending_order');
  HF.store.set('settings', { lang: 'es' });
  HF.platform = { kind: 'web' };
  HF.CFG.payment.paypal.enabled = true;
  HF.CFG.payment.checkout = '';
  modalHTML = '';
  modalRoot = null;
  lastToast = '';
  lastScreen = '';
  buttonOpts = null;
  renderedInto = null;
  calls.length = 0;
  captureMode = 'ok';
  createMode = 'ok';
}

(async () => {
  // -------------------------------------------------------------------------
  // 1. Configuración y precio
  // -------------------------------------------------------------------------
  reset();
  ok(HF.CFG.payment.paypal.clientId && HF.CFG.payment.paypal.clientId.length > 20, 'el Client ID público de PayPal está configurado');
  ok(HF.payment.paypalAmount() === '4.99', 'el importe es 4.99 USD');
  ok(HF.payment.getPrices().amount === '$4.99 USD', 'la web muestra $4.99 USD');
  ok(HF.payment.isPayPal() === true, 'PayPal está disponible en la web');

  HF.platform = { kind: 'electron' };
  ok(HF.payment.isPayPal() === false, 'PayPal no se ofrece en Electron/Steam');
  HF.platform = { kind: 'capacitor' };
  ok(HF.payment.isPayPal() === false, 'PayPal no se ofrece en la app móvil');
  HF.platform = { kind: 'web' };

  // -------------------------------------------------------------------------
  // 2. El modal monta el botón oficial
  // -------------------------------------------------------------------------
  HF.payment.openPurchase();
  await tick();
  ok(modalHTML.indexOf('id="paypalButton"') >= 0, 'el modal incluye el contenedor del botón PayPal');
  ok(modalHTML.indexOf('$4.99 USD') >= 0, 'el modal muestra el precio 4.99 USD');
  ok(modalHTML.indexOf('30 niveles') < 0, 'el detalle ya no promete 30 niveles ni funciones variables');
  ok(/Gracias a tu apoyo/.test(modalHTML), 'el detalle muestra el mensaje de apoyo y feedback');
  ok(modalHTML.indexOf('Stripe') < 0, 'el flujo web ya no menciona Stripe');
  ok(!!buttonOpts, 'se crea la instancia paypal.Buttons');
  ok(!!renderedInto, 'el botón oficial se renderiza en el contenedor');
  ok(buttonOpts.style && buttonOpts.style.label === 'paypal', 'se usa el estilo oficial de PayPal');

  // -------------------------------------------------------------------------
  // 3. createOrder usa la Edge Function y el player_id activo
  // -------------------------------------------------------------------------
  const orderId = await buttonOpts.createOrder();
  const pid = HF.cloud.playerId();
  const orderCall = calls.find(c => c.body.action === 'create-order');
  ok(orderId === 'ORDER-123', 'createOrder devuelve el id de la orden de PayPal');
  ok(orderCall && orderCall.body.player_id === pid, 'create-order envía el player_id activo');
  ok(orderCall && orderCall.headers && orderCall.headers.apikey, 'la llamada a la Edge Function lleva apikey');
  ok(orderCall && !Object.keys(orderCall.headers).some(h => h.toLowerCase() === 'prefer'), 'la llamada no envía Prefer (evita fallo CORS)');
  ok(HF.payment.pendingOrder() === null, 'una orden aún no aprobada no se guarda como pago pendiente');

  // -------------------------------------------------------------------------
  // 4. onApprove captura y desbloquea Premium sin reiniciar
  // -------------------------------------------------------------------------
  await buttonOpts.onApprove({ orderID: 'ORDER-123' });
  ok(HF.store.get('is_premium') === true, 'is_premium queda activado en local al confirmar el cobro');
  ok(HF.cloud.isPremium() === true, 'HF.cloud.isPremium refleja el desbloqueo inmediato');
  ok(HF.cloud.recoveryEmail() === 'buyer@example.com', 'el correo de PayPal se guarda como respaldo');
  ok(lastScreen === 'settings', 'la pantalla actual se vuelve a pintar (sin reiniciar)');
  ok(/Premium/i.test(lastToast), 'se avisa de la licencia Premium activada');
  ok(calls.some(c => c.body.action === 'capture-order' && c.body.order_id === 'ORDER-123' && c.body.player_id === pid), 'capture-order envía orden y jugador');
  ok(HF.payment.pendingOrder() === null, 'la orden pendiente se limpia tras el éxito');
  ok(modalHTML === '', 'el modal se cierra tras el pago');

  // -------------------------------------------------------------------------
  // 5. Recuperación de una orden pendiente
  // -------------------------------------------------------------------------
  reset();
  HF.store.set('paypal_pending_order', { orderId: 'ORDER-OLD', playerId: HF.cloud.playerId(), at: Date.now() });
  HF.payment.openPurchase();
  await tick();
  ok(modalHTML.indexOf('id="paypalRecover"') >= 0, 'se ofrece recuperar una orden pendiente');
  const recover = modalRoot.querySelector('#paypalRecover');
  recover.onclick();
  await tick(10);
  ok(HF.store.get('is_premium') === true, 'la recuperación activa Premium sin volver a pagar');
  ok(calls.some(c => c.body.action === 'capture-order' && c.body.order_id === 'ORDER-OLD'), 'la recuperación captura la orden guardada');

  // -------------------------------------------------------------------------
  // 6. Error de captura: no activa Premium y muestra un mensaje claro
  // -------------------------------------------------------------------------
  reset();
  captureMode = 'pending';
  HF.payment.openPurchase();
  await tick();
  await buttonOpts.createOrder();
  await buttonOpts.onApprove({ orderID: 'ORDER-123' });
  ok(HF.store.get('is_premium') === false, 'un pago no confirmado NO activa Premium');
  const errNode = modalRoot.querySelector('#paypalErr');
  ok(!!errNode && /no está confirmado/i.test(errNode.textContent), 'el error explica que el pago sigue pendiente');
  ok(HF.payment.pendingOrder() !== null, 'la orden se conserva para reintentar la confirmación');

  // -------------------------------------------------------------------------
  // 7. Un 404 se explica como «función no desplegada», no como «sin conexión»
  // -------------------------------------------------------------------------
  reset();
  createMode = '404';
  HF.payment.openPurchase();
  await tick();
  let deployError = null;
  try { await buttonOpts.createOrder(); } catch (e) { deployError = e; }
  ok(!!deployError && /funcion_no_desplegada/.test(deployError.message), 'un 404 se identifica como función no desplegada');
  buttonOpts.onError(deployError);
  const deployErrNode = modalRoot.querySelector('#paypalErr');
  ok(!!deployErrNode && /no está desplegada/i.test(deployErrNode.textContent), 'el jugador ve que falta desplegar la función');

  // -------------------------------------------------------------------------
  // 8. Escritorio/móvil conserva el flujo de tienda/manual
  // -------------------------------------------------------------------------
  reset();
  HF.platform = { kind: 'electron' };
  HF.CFG.payment.checkout = 'https://store.example.com/buy';
  HF.payment.openPurchase();
  ok(modalHTML.indexOf('id="payGo"') >= 0, 'en Electron se mantiene el enlace de tienda');
  ok(modalHTML.indexOf('id="paypalButton"') < 0, 'en Electron no se monta PayPal');
  HF.CFG.payment.checkout = '';

  // En web, ni con PayPal desactivado se usa un enlace de tienda externo.
  reset();
  HF.CFG.payment.paypal.enabled = false;
  HF.CFG.payment.checkout = 'https://store.example.com/buy';
  HF.payment.openPurchase();
  ok(modalHTML.indexOf('Pagar ahora') < 0, 'la web no ofrece un enlace de tienda externo (sin Stripe)');
  ok(modalHTML.indexOf('Solicitar licencia') >= 0, 'si PayPal no está, la web cae a la solicitud manual');
  HF.CFG.payment.checkout = '';

  // -------------------------------------------------------------------------
  // 9. Requisitos de la Edge Function y del SQL
  // -------------------------------------------------------------------------
  const edge = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'functions', 'paypal', 'index.ts'), 'utf8');
  ok(/Deno\.env\.get\(["']PAYPAL_CLIENT_ID["']\)/.test(edge), 'la Edge Function lee PAYPAL_CLIENT_ID con Deno.env');
  ok(/Deno\.env\.get\(["']PAYPAL_SECRET_KEY["']\)/.test(edge), 'la Edge Function lee PAYPAL_SECRET_KEY con Deno.env');
  ok(/const AMOUNT = ["']4\.99["']/.test(edge), 'la Edge Function fija el cobro en 4.99 USD');
  ok(!/PAYPAL_SECRET_KEY\s*[:=]\s*["'][A-Za-z0-9_-]{16,}["']/.test(edge), 'el Secret de PayPal NO está hardcodeado en la función');
  ok(/\/v2\/checkout\/orders/.test(edge) && /\/capture/.test(edge), 'la función crea y captura órdenes de PayPal');
  ok(/fn_hf_paypal_grant/.test(edge), 'la función activa Premium con la RPC atómica');
  ok(/ORDER_ALREADY_CAPTURED/.test(edge), 'la función es idempotente ante una captura repetida');

  const sql = fs.readFileSync(path.join(__dirname, '..', 'sql', 'paypal_payments.sql'), 'utf8');
  ok(/create table if not exists public\.hf_payments/i.test(sql), 'el SQL crea hf_payments');
  ok(/is_premium = true/.test(sql), 'el SQL activa is_premium');
  ok(/revoke all on public\.hf_payments from anon, authenticated/i.test(sql), 'hf_payments queda cerrada para anon/authenticated');
  ok(/security definer/i.test(sql) && /revoke all on function public\.fn_hf_paypal_grant/i.test(sql), 'la RPC es SECURITY DEFINER y no es pública');
  ok(/exception when unique_violation/i.test(sql), 'un correo de PayPal ya usado no bloquea la activación');

  console.log(fail ? '\nCON FALLOS (' + fail + ')' : '\nTODO OK');
  process.exit(fail ? 1 : 0);
})().catch(e => {
  console.error('FAIL: excepción en la prueba PayPal:', e && e.stack || e);
  process.exit(1);
});
