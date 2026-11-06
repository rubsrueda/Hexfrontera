'use strict';
// Comentarios de los jugadores: i18n (13 idiomas), formulario, validación,
// envío a Web3Forms, cola offline y aviso discreto con enfriamiento.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const JS = path.join(__dirname, '..', 'js');
let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };

const HF = {};
const store = new Map();
const calls = [];
let fetchImpl = (url, opts) => {
  calls.push({ url, opts });
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ success: true }) });
};

// DOM mínimo para el aviso flotante.
function El(tag) {
  const node = {
    tagName: tag, id: '', className: '', innerHTML: '', parentNode: null, children: [], _q: {},
    setAttribute(k, v) { node[k] = v; },
    appendChild(c) { c.parentNode = node; node.children.push(c); return c; },
    removeChild(c) { const i = node.children.indexOf(c); if (i >= 0) node.children.splice(i, 1); c.parentNode = null; return c; },
    querySelector(sel) {
      if (node._q[sel]) return node._q[sel];
      if (sel && sel[0] === '#') {
        return (node._q[sel] = { id: sel.slice(1), value: '', textContent: '', disabled: false, focus() { }, onkeydown: null, onclick: null });
      }
      return null;
    }
  };
  if (tag === 'div') {
    node._q['#fbPromptGo'] = { id: 'fbPromptGo', onclick: null };
    node._q['#fbPromptNo'] = { id: 'fbPromptNo', onclick: null };
  }
  return node;
}
const body = El('body');
const doc = {
  body,
  createElement: t => El(t),
  getElementById: id => body.children.find(c => c.id === id) || null,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener() { },
  documentElement: { lang: 'es', dir: 'ltr', style: {} }
};

const sandbox = {
  console, HF, window: null, document: doc,
  navigator: { onLine: true, language: 'es' },
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
  addEventListener() { }, removeEventListener() { }
};
sandbox.window = sandbox;
sandbox.fetch = (...a) => fetchImpl(...a);
vm.createContext(sandbox);
for (const f of ['util.js', 'config.js', 'i18n.js']) vm.runInContext(fs.readFileSync(path.join(JS, f), 'utf8'), sandbox);

// Stubs de UI que feedback.js usa en tiempo de llamada.
let modalHTML = '';
const toasts = [];
HF.esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
HF.modal = html => { modalHTML = html; };
HF.toast = (m, ms) => { toasts.push(m); };
HF.sfx = () => { };
HF.closeModal = () => { modalHTML = ''; };

vm.runInContext(fs.readFileSync(path.join(JS, 'feedback.js'), 'utf8'), sandbox);

const FB = HF.feedback;
const cfg = () => HF.CFG.feedback;
const reset = () => {
  FB.clear();
  HF.store.del('feedback_prompt_at');
  HF.store.del('feedback_last_at');
  calls.length = 0;
  body.children.length = 0;
};

// ---------------------------------------------------------------------------
// 1. Textos en los 13 idiomas
// ---------------------------------------------------------------------------
const KEYS = ['FB_TITLE', 'FB_INTRO', 'FB_NAME', 'FB_NAME_PH', 'FB_EMAIL', 'FB_MESSAGE', 'FB_SEND',
  'FB_SENDING', 'FB_OK', 'FB_ERR', 'FB_REQUIRED', 'FB_EMAIL_BAD', 'FB_PRIVACY', 'FB_CTA', 'FB_PROMPT',
  'FB_LATER', 'FB_LOCAL'];
{
  ok(Array.isArray(HF.LANGS) && HF.LANGS.length === 13, 'hay 13 idiomas registrados');
  let missing = 0;
  for (const l of HF.LANGS) {
    const dict = HF.LOCALES[l.code] || {};
    const miss = KEYS.filter(k => !dict[k]);
    if (miss.length) { missing++; console.error('   faltan en ' + l.code + ': ' + miss.join(', ')); }
  }
  ok(missing === 0, 'los 13 idiomas tienen las 17 claves de comentarios');
  ok(HF.LOCALES.es.FB_TITLE.includes('💬') && HF.LOCALES.en.FB_MESSAGE.includes('*'), 'título y campo obligatorio marcados');
}

// ---------------------------------------------------------------------------
// 2. Validación (nombre y correo opcionales)
// ---------------------------------------------------------------------------
{
  ok(FB.validate({}).key === 'FB_REQUIRED', 'sin mensaje no se envía');
  ok(FB.validate({ message: '   ' }).key === 'FB_REQUIRED', 'un mensaje vacío no vale');
  ok(FB.validate({ message: 'hola', email: 'no-es-correo' }).key === 'FB_EMAIL_BAD', 'correo con formato inválido');
  const v = FB.validate({ message: '  hola  ', email: ' a@b.co ' });
  ok(v.ok && v.message === 'hola' && v.email === 'a@b.co', 'limpia espacios y acepta el correo');
  const anon = FB.validate({ message: 'solo mensaje' });
  ok(anon.ok && anon.email === '', 'sin nombre ni correo también se puede enviar');
}

// ---------------------------------------------------------------------------
// 3. Envío con Web3Forms
// ---------------------------------------------------------------------------
(async () => {
  reset();
  cfg().accessKey = 'clave-de-prueba';

  // 3.1 Envío correcto.
  const r1 = await FB.send({ name: 'Ana', email: 'ana@example.com', message: 'Me gusta el juego' });
  ok(r1.ok && !r1.queued, 'envío correcto');
  ok(calls.length === 1 && calls[0].url === cfg().endpoint, 'usa el endpoint configurado');
  const bodyJSON = JSON.parse(calls[0].opts.body);
  ok(bodyJSON.access_key === 'clave-de-prueba' && bodyJSON.message === 'Me gusta el juego', 'incluye clave y mensaje');
  ok(bodyJSON.name === 'Ana' && bodyJSON.email === 'ana@example.com', 'incluye los campos opcionales rellenos');
  ok(bodyJSON.language === 'es' && bodyJSON.app === 'Hexfrontier', 'adjunta idioma y app');
  ok(FB.pending() === 0, 'un envío correcto no deja cola');
  ok(FB.lastSentAt() > 0, 'registra la fecha del último envío');

  // 3.2 Sin red: se guarda para reintentar.
  reset();
  fetchImpl = () => Promise.reject(new Error('offline'));
  const r2 = await FB.send({ message: 'sin red' });
  ok(r2.ok && r2.queued && r2.reason === 'network', 'sin red el comentario queda en cola');
  ok(FB.pending() === 1 && FB.outbox()[0].message === 'sin red', 'el comentario se conserva íntegro');

  // 3.3 Rechazo definitivo (4xx): no se encola.
  reset();
  fetchImpl = () => Promise.resolve({ ok: false, status: 400, json: () => Promise.resolve({}) });
  const r3 = await FB.send({ message: 'rechazado' });
  ok(r3.ok === false && r3.reason === 'rejected', 'un 4xx se reporta como rechazo');
  ok(FB.pending() === 0, 'un rechazo definitivo no se reintenta en bucle');

  // 3.4 Sin clave configurada: se guarda y se avisa (FB_LOCAL).
  reset();
  cfg().accessKey = '';
  const r4 = await FB.send({ message: 'sin buzón' });
  ok(r4.ok && r4.queued && r4.reason === 'config', 'sin clave el comentario se guarda');
  ok(FB.pending() === 1, 'queda pendiente para cuando se configure');

  // 3.5 Reintento al configurar la clave.
  reset();
  cfg().accessKey = '';
  await FB.send({ message: 'uno' });
  await FB.send({ message: 'dos' });
  ok(FB.pending() === 2, 'dos comentarios pendientes');
  cfg().accessKey = 'clave-de-prueba';
  fetchImpl = () => { calls.push({ url: 'x', opts: { body: '{}' } }); return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ success: true }) }); };
  const sent = await FB.flush();
  ok(sent === 2 && FB.pending() === 0, 'flush entrega todo lo pendiente');

  // 3.6 Si el reintento falla, no se pierde nada.
  reset();
  cfg().accessKey = '';
  await FB.send({ message: 'tres' });
  cfg().accessKey = 'clave-de-prueba';
  fetchImpl = () => Promise.reject(new Error('sigue sin red'));
  await FB.flush();
  ok(FB.pending() === 1, 'un reintento fallido conserva el comentario');

  // 3.7 Idioma del comentario en cola.
  reset();
  cfg().accessKey = '';
  HF.store.set('settings', { lang: 'en' });
  await FB.send({ message: 'english' });
  ok(FB.outbox()[0].lang === 'en', 'la cola recuerda el idioma original');
  HF.store.set('settings', { lang: 'es' });

  // 3.8 Formulario real: bind del modal y envío desde el botón.
  reset();
  cfg().accessKey = 'clave-de-prueba';
  fetchImpl = (u, o) => { calls.push({ url: u, opts: o }); return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ success: true }) }); };
  const nodes = {};
  const mk = id => (nodes[id] = nodes[id] || { id, value: '', textContent: '', disabled: false, focus() { }, onkeydown: null, onclick: null });
  const modalNode = { isConnected: true, querySelector: sel => mk(sel) };
  HF.modal = (html, bind) => { modalHTML = html; if (bind) bind(modalNode); };
  FB.open();
  ok(typeof nodes['#fbGo'].onclick === 'function', 'el botón de enviar queda conectado');
  ok(modalHTML.includes('id="fbHp"'), 'el formulario incluye el campo trampa antispam');
  nodes['#fbMsg'].value = '   ';
  nodes['#fbGo'].onclick();
  ok(nodes['#fbErr'].textContent === HF.t('FB_REQUIRED'), 'mensaje vacío: error dentro del formulario');
  ok(calls.length === 0, 'no se envía nada con el mensaje vacío');
  ok(nodes['#fbGo'].disabled === false, 'el botón vuelve a estar disponible tras el error');
  nodes['#fbName'].value = 'Ana';
  nodes['#fbMsg'].value = 'Comentario de prueba';
  nodes['#fbGo'].onclick();
  await new Promise(r => setTimeout(r, 0));
  ok(calls.length === 1, 'un mensaje válido se envía desde el botón');
  ok(JSON.parse(calls[0].opts.body).name === 'Ana', 'recoge el nombre escrito');
  ok(toasts[toasts.length - 1] === HF.t('FB_OK'), 'muestra el agradecimiento traducido');
  nodes['#fbHp'].value = 'spam';
  nodes['#fbGo'].disabled = false;
  nodes['#fbGo'].onclick();
  ok(calls.length === 1, 'un bot que rellena el campo trampa no envía nada');
  HF.modal = html => { modalHTML = html; };

  // 3.9 Clave del buzón: la del dispositivo manda sobre config.js.
  reset();
  cfg().accessKey = 'clave-config';
  ok(FB.hasKey() && FB.keySource() === 'config', 'detecta la clave del juego');
  FB.setKey('clave-dispositivo');
  ok(FB.keySource() === 'device', 'la clave del dispositivo tiene prioridad');
  fetchImpl = (u, o) => { calls.push({ url: u, opts: o }); return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ success: true }) }); };
  await FB.send({ message: 'con clave local' });
  ok(JSON.parse(calls[0].opts.body).access_key === 'clave-dispositivo', 'envía con la clave guardada en el dispositivo');
  modalHTML = '';
  FB.open();
  ok(!modalHTML.includes(HF.t('FB_LOCAL')), 'con clave no avisa de buzón sin configurar');
  FB.setKey('');
  ok(FB.keySource() === 'config', 'al quitarla vuelve a la del juego');
  cfg().accessKey = '';
  ok(!FB.hasKey(), 'sin ninguna clave no hay buzón');

  // 3.10 Configurar la clave entrega lo pendiente.
  reset();
  cfg().accessKey = '';
  await FB.send({ message: 'pendiente' });
  ok(FB.pending() === 1, 'comentario pendiente sin clave');
  FB.setKey('clave-nueva');
  fetchImpl = (u, o) => { calls.push({ url: u, opts: o }); return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ success: true }) }); };
  const sentKey = await FB.flush();
  ok(sentKey === 1 && FB.pending() === 0, 'al guardar la clave se envía lo pendiente');
  FB.setKey('');
  reset();

  // -------------------------------------------------------------------------
  // 4. Formulario
  // -------------------------------------------------------------------------
  reset();
  cfg().accessKey = '';
  modalHTML = '';
  FB.open();
  ok(/<h3>/.test(modalHTML) && modalHTML.includes(HF.t('FB_TITLE')), 'el formulario usa el título traducido');
  ok(modalHTML.includes('id="fbName"') && modalHTML.includes('id="fbEmail"'), 'nombre y correo presentes');
  ok(/opcional/i.test(modalHTML), 'los campos opcionales se marcan como tales');
  ok(modalHTML.includes('id="fbMsg"') && modalHTML.includes('id="fbGo"'), 'mensaje obligatorio y botón de envío');
  ok(modalHTML.includes(HF.t('FB_PRIVACY')), 'se explica el uso del correo');
  ok(modalHTML.includes(HF.t('FB_LOCAL')), 'avisa de que el buzón no está configurado');

  cfg().accessKey = 'clave-de-prueba';
  modalHTML = '';
  FB.open();
  ok(!modalHTML.includes(HF.t('FB_LOCAL')), 'con buzón configurado no aparece el aviso local');

  // Formulario en otro idioma.
  HF.store.set('settings', { lang: 'fr' });
  modalHTML = '';
  FB.open();
  ok(modalHTML.includes(HF.LOCALES.fr.FB_TITLE) && modalHTML.includes(HF.LOCALES.fr.FB_SEND), 'el formulario cambia de idioma');
  HF.store.set('settings', { lang: 'es' });

  // -------------------------------------------------------------------------
  // 5. Aviso discreto con enfriamiento
  // -------------------------------------------------------------------------
  reset();
  body.children.length = 0;
  const first = FB.prompt('map');
  ok(first === true, 'el aviso se muestra la primera vez');
  ok(body.children.some(c => c.id === 'fbPrompt'), 'crea el aviso flotante');
  ok(FB.prompt('map') === false, 'no insiste en la misma sesión');
  body.children.length = 0;
  HF.store.del('feedback_prompt_at');
  ok(FB.prompt('game') === true, 'tras el enfriamiento puede volver a mostrarse');
  const box = body.children[0];
  box._q['#fbPromptGo'].onclick();
  const overlay = body.children.find(c => c.className === 'fb-overlay');
  ok(!!overlay && overlay.children.length === 1, 'el aviso abre el formulario en una capa propia');
  const sheet = overlay.children[0];
  ok(String(sheet.innerHTML).includes(HF.t('FB_TITLE')) && String(sheet.innerHTML).includes('id="fbGo"'), 'la capa contiene el formulario completo');
  sheet.querySelector('#fbNo').onclick();
  ok(!body.children.some(c => c.className === 'fb-overlay'), 'la capa se cierra sin tocar la pantalla de atrás');
  ok(!body.children.some(c => c.id === 'fbPrompt'), 'el aviso desaparece al abrir el formulario');

  // -------------------------------------------------------------------------
  // 6. Limpieza
  // -------------------------------------------------------------------------
  reset();
  cfg().accessKey = '';
  await FB.send({ message: 'x' });
  FB.clear();
  ok(FB.pending() === 0, 'se puede vaciar la cola');

  console.log(fail ? '\nCON FALLOS (' + fail + ')' : '\nTODO OK');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
