'use strict';
// Encuestas dinámicas: i18n, normalización, render por tipo, validación,
// envío atómico, cola offline, enfriamiento y seguridad de texto.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const JS = path.join(__dirname, '..', 'js');
let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };
const wait = ms => new Promise(r => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// DOM mínimo: nodos reales con clase, atributos, hijos y selectores simples.
// ---------------------------------------------------------------------------
function FakeNode(tag) {
  this.tagName = String(tag || 'div').toUpperCase();
  this.children = [];
  this.parentNode = null;
  this.id = '';
  this._classes = new Set();
  this._text = '';
  this._attrs = Object.create(null);
  this.style = {};
  this.dataset = {};
  this.value = '';
  this.type = '';
  this.disabled = false;
  this.hidden = false;
  this.maxLength = 0;
  this.placeholder = '';
  this.autocomplete = '';
  this.title = '';
  this.noValidate = false;
  this.onclick = null;
  this.oninput = null;
  this.onchange = null;
  this.onkeydown = null;
  this.onsubmit = null;
  this._focused = false;
  this.classList = {
    add: (...names) => names.forEach(n => this._classes.add(n)),
    remove: (...names) => names.forEach(n => this._classes.delete(n)),
    contains: n => this._classes.has(n),
    toggle: (n, force) => {
      const on = force === undefined ? !this._classes.has(n) : !!force;
      if (on) this._classes.add(n); else this._classes.delete(n);
      return on;
    }
  };
}
Object.defineProperty(FakeNode.prototype, 'className', {
  get() { return Array.from(this._classes).join(' '); },
  set(v) {
    this._classes = new Set(String(v || '').split(/\s+/).filter(Boolean));
  }
});
Object.defineProperty(FakeNode.prototype, 'textContent', {
  get() {
    if (this.children.length) return this.children.map(c => c.textContent).join('');
    return this._text;
  },
  set(v) { this._text = String(v == null ? '' : v); this.children = []; }
});
Object.defineProperty(FakeNode.prototype, 'innerHTML', {
  get() { return this._text; },
  set(v) { this._text = String(v == null ? '' : v); this.children = []; }
});
FakeNode.prototype.appendChild = function (child) {
  child.parentNode = this;
  this.children.push(child);
  return child;
};
FakeNode.prototype.removeChild = function (child) {
  const i = this.children.indexOf(child);
  if (i >= 0) this.children.splice(i, 1);
  child.parentNode = null;
  return child;
};
FakeNode.prototype.setAttribute = function (k, v) {
  this._attrs[k] = String(v);
  if (k === 'id') this.id = String(v);
  if (k === 'class') this.className = String(v);
};
FakeNode.prototype.getAttribute = function (k) {
  return this._attrs[k] == null ? null : this._attrs[k];
};
FakeNode.prototype.focus = function () { this._focused = true; };
FakeNode.prototype.contains = function (node) {
  for (let n = node; n; n = n.parentNode) if (n === this) return true;
  return false;
};
Object.defineProperty(FakeNode.prototype, 'isConnected', {
  get() {
    for (let n = this; n; n = n.parentNode) if (n === body) return true;
    return false;
  }
});
FakeNode.prototype.querySelector = function (sel) {
  const list = queryAll(this, sel, true);
  return list.length ? list[0] : null;
};
FakeNode.prototype.querySelectorAll = function (sel) {
  return queryAll(this, sel, false);
};

function matches(node, sel) {
  sel = String(sel || '').trim();
  if (!sel) return false;
  if (sel.charAt(0) === '.') return node.classList.contains(sel.slice(1));
  if (sel.charAt(0) === '#') return node.id === sel.slice(1);
  if (sel.charAt(0) === '[') {
    const m = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(sel);
    if (!m) return false;
    const v = node.getAttribute(m[1]);
    return m[2] === undefined ? v != null : v === m[2];
  }
  return node.tagName.toLowerCase() === sel.toLowerCase();
}
function walk(node, fn) {
  for (const child of node.children) {
    fn(child);
    walk(child, fn);
  }
}
function queryAll(root, selector, firstOnly) {
  const parts = String(selector || '').split(',').map(s => s.trim()).filter(Boolean);
  const out = [];
  if (!parts.length) return out;
  walk(root, node => {
    if (firstOnly && out.length) return;
    if (parts.some(sel => matches(node, sel))) out.push(node);
  });
  return out;
}
function findById(root, id) {
  let found = null;
  walk(root, node => { if (!found && node.id === id) found = node; });
  return found;
}

const body = new FakeNode('body');
const modal = new FakeNode('div');
modal.id = 'modal';
modal.className = 'hidden';
body.appendChild(modal);

const localStorageMap = new Map();
const doc = {
  body,
  documentElement: { lang: 'es', dir: 'ltr', style: {} },
  activeElement: null,
  createElement: tag => new FakeNode(tag),
  getElementById: id => findById(body, id),
  querySelector: sel => body.querySelector(sel),
  querySelectorAll: sel => body.querySelectorAll(sel),
  addEventListener() { },
  removeEventListener() { }
};

const HF = {};
const sandbox = {
  console, HF, window: null, document: doc,
  navigator: { onLine: true, language: 'es' },
  location: { href: 'https://hexfrontier.test/', protocol: 'https:', hostname: 'hexfrontier.test', hash: '' },
  localStorage: {
    getItem: k => (localStorageMap.has(k) ? localStorageMap.get(k) : null),
    setItem: (k, v) => localStorageMap.set(k, String(v)),
    removeItem: k => localStorageMap.delete(k),
    key: i => Array.from(localStorageMap.keys())[i] || null,
    get length() { return localStorageMap.size; }
  },
  setTimeout, clearTimeout, setInterval, clearInterval,
  Promise, Date, Math, JSON, performance: { now: () => Date.now() },
  addEventListener() { }, removeEventListener() { }
};
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ['util.js', 'config.js', 'i18n.js', 'event-feedback-langs.js']) {
  vm.runInContext(fs.readFileSync(path.join(JS, f), 'utf8'), sandbox, { filename: f });
}

// Stubs de UI y nube que el módulo usa en tiempo de llamada.
HF.sfx = () => { };
const toasts = [];
HF.toast = (msg, ms) => { toasts.push(String(msg)); };
HF.esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
let diagHTML = '';
HF.modal = html => { diagHTML = html; };
HF.closeModal = () => { };
const rpcCalls = [];
let activePayload = null;
let submitImpl = async () => ({ ok: true, data: { ok: true, response_id: 'resp-1' } });
HF.cloud = {
  online: true,
  rpc: async (fn, args) => {
    rpcCalls.push({ fn, args });
    if (fn === 'get_active_event_questions') return { ok: true, status: 200, data: activePayload };
    if (fn === 'fn_ef_submit_response') return submitImpl(args);
    return { ok: false, status: 404 };
  }
};

vm.runInContext(fs.readFileSync(path.join(JS, 'event-feedback.js'), 'utf8'), sandbox, { filename: 'event-feedback.js' });
const EF = HF.EventFeedbackModal;

// ---------------------------------------------------------------------------
// Datos de prueba
// ---------------------------------------------------------------------------
const Q = {
  rating: '11111111-1111-4111-8111-111111111111',
  select: '22222222-2222-4222-8222-222222222222',
  bool: '33333333-3333-4333-8333-333333333333',
  text: '44444444-4444-4444-8444-444444444444'
};
function payload(over) {
  const base = {
    active: true,
    campaign: { campaign_id: 'campaign-1', name: 'Campaña QA', description: 'Cuéntanos cómo fue.' },
    event: { campaign_event_id: 'event-1', event_type: 'MATCH_OVER', collect_user_info: true, allow_comments: true },
    questions: [
      { question_id: Q.text, question_text: '¿Qué mejorarías?', question_type: 'TEXT', display_order: 4, is_required: false },
      { question_id: Q.rating, question_text: '¿Cómo fue la partida?', question_type: 'RATING', display_order: 1, is_required: true },
      { question_id: Q.bool, question_text: '¿Recomendarías el juego?', question_type: 'BOOLEAN', display_order: 3, is_required: false },
      { question_id: Q.select, question_text: '¿Qué dificultad elegiste?', question_type: 'SELECT', options: ['Fácil', 'Media', 'Difícil'], display_order: 2, is_required: true }
    ]
  };
  return Object.assign(base, over || {});
}
function resetAll() {
  EF.reset();
  rpcCalls.length = 0;
  toasts.length = 0;
  activePayload = payload();
  HF.cloud.online = true;
  submitImpl = async () => ({ ok: true, data: { ok: true, response_id: 'resp-1' } });
}
async function open(opts) {
  const r = await EF.checkAndRender('MATCH_OVER', opts || {});
  await wait(5);
  return r;
}
function sheet() { return doc.querySelector('.ef-sheet'); }
function fillAll() {
  const s = sheet();
  const cards = s.querySelectorAll('.ef-q');
  cards[0].querySelectorAll('.ef-star')[4].onclick();       // rating = 5
  cards[1].querySelectorAll('.ef-opt')[1].onclick();       // select = Media
  cards[2].querySelector('.ef-switch').onclick();          // boolean = true
  const area = cards[3].querySelector('.ef-text');
  area.value = 'Más tutoriales';
  area.oninput();
}
function submitCall() { return rpcCalls.find(c => c.fn === 'fn_ef_submit_response'); }

(async () => {
  // -------------------------------------------------------------------------
  // 1. i18n y utilidades puras
  // -------------------------------------------------------------------------
  {
    const langs = Object.keys(HF.EF_LOCALES || {});
    ok(langs.length === 13, 'hay textos en los 13 idiomas');
    const baseKeys = Object.keys(HF.EF_LOCALES.es);
    ok(baseKeys.length >= 30, 'el diccionario cubre los textos del modal (' + baseKeys.length + ')');
    ok(langs.every(code => baseKeys.every(k => typeof HF.EF_LOCALES[code][k] === 'string' && HF.EF_LOCALES[code][k].length)),
      'todos los idiomas tienen todas las claves');
    ok(HF.t('EF_TITLE') === HF.LOCALES.es.EF_TITLE, 'HF.t resuelve las claves del módulo');
    ok(EF._internals.normalizeType('match_over') === 'MATCH_OVER', 'normaliza el tipo a mayúsculas');
    ok(EF._internals.normalizeType('x') === '', 'rechaza tipos demasiado cortos');
    ok(EF._internals.normalizeType('TRIBE-MODIFIED') === '', 'rechaza guiones no válidos');
  }

  // -------------------------------------------------------------------------
  // 2. Sin campaña activa / sin preguntas / RPC ausente
  // -------------------------------------------------------------------------
  resetAll();
  activePayload = payload({ active: false, questions: [] });
  {
    const r = await open();
    ok(r.shown === false && r.reason === 'inactive', 'sin campaña activa no se muestra nada');
    ok(!doc.querySelector('.ef-overlay'), 'no se crea la capa');
  }

  resetAll();
  activePayload = payload({ questions: [] });
  {
    const r = await open();
    ok(r.shown === false && r.reason === 'no_questions', 'una campaña sin preguntas no abre el modal');
  }

  resetAll();
  HF.cloud.rpc = async () => ({ ok: false, status: 404 });
  {
    const r = await open();
    ok(r.shown === false && r.reason === 'rpc', 'si falta el SQL, el juego sigue sin errores visibles');
    ok(!doc.querySelector('.ef-overlay'), 'no se abre nada cuando la RPC no existe');
  }
  HF.cloud.rpc = async (fn, args) => {
    rpcCalls.push({ fn, args });
    if (fn === 'get_active_event_questions') return { ok: true, status: 200, data: activePayload };
    if (fn === 'fn_ef_submit_response') return submitImpl(args);
    return { ok: false, status: 404 };
  };

  // -------------------------------------------------------------------------
  // 3. Render dinámico y orden por display_order
  // -------------------------------------------------------------------------
  resetAll();
  {
    const r = await open();
    ok(r.shown === true, 'con campaña activa abre el modal');
    ok(rpcCalls[0].fn === 'get_active_event_questions' && rpcCalls[0].args.p_event_type === 'MATCH_OVER',
      'consulta la RPC con el tipo de evento');
    const s = sheet();
    ok(!!s, 'crea la hoja del modal');
    ok(s.querySelector('.ef-kicker').textContent === 'Campaña QA', 'muestra el nombre de la campaña');
    ok(s.querySelector('.ef-title').textContent === HF.t('EF_TITLE'), 'título localizado');
    const cards = s.querySelectorAll('.ef-q');
    ok(cards.length === 4, 'pinta las 4 preguntas');
    ok(cards[0].querySelector('.ef-q-text').textContent.indexOf('partida') >= 0
      && cards[1].querySelector('.ef-q-text').textContent.indexOf('dificultad') >= 0
      && cards[2].querySelector('.ef-q-text').textContent.indexOf('Recomendarías') >= 0
      && cards[3].querySelector('.ef-q-text').textContent.indexOf('mejorarías') >= 0,
      'respeta el orden por display_order, no el orden de la RPC');
    ok(cards[0].querySelectorAll('.ef-star').length === 5, 'RATING pinta 5 estrellas');
    ok(cards[1].querySelectorAll('.ef-opt').length === 3, 'SELECT pinta sus 3 opciones');
    ok(!!cards[2].querySelector('.ef-switch'), 'BOOLEAN pinta un interruptor');
    ok(!!cards[3].querySelector('.ef-text'), 'TEXT pinta un textarea');
    ok(s.querySelectorAll('.ef-input').length === 2, 'collect_user_info añade correo y alias');
    ok(!!s.querySelector('.ef-comment'), 'allow_comments añade el comentario final');
    ok(s.querySelector('.ef-progress-label').textContent === HF.t('EF_ANSWERED').replace('{a}', '0').replace('{b}', '4'),
      'el progreso arranca en 0 de 4');
  }

  // -------------------------------------------------------------------------
  // 4. Validación + envío correcto (cabecera y desgloses)
  // -------------------------------------------------------------------------
  {
    const s = sheet();
    const send = s.querySelector('.ef-send');
    send.onclick();
    await wait(20);
    ok(!submitCall(), 'no envía si faltan preguntas obligatorias');
    ok(s.querySelectorAll('.ef-q-error').length === 2, 'marca las dos preguntas obligatorias');
    ok(s.querySelectorAll('.ef-star').every(b => !b.classList.contains('on')), 'no marca estrellas sin tocar');
    fillAll();
    await wait(5);
    ok(s.querySelector('.ef-progress-label').textContent === HF.t('EF_ANSWERED').replace('{a}', '4').replace('{b}', '4'),
      'el progreso llega a 4 de 4 al responder');
    send.onclick();
    await wait(20);
    const call = submitCall();
    ok(!!call, 'envía la encuesta por la RPC atómica');
    ok(call.args.p_campaign_event_id === 'event-1', 'envía el campaign_event_id');
    ok(Array.isArray(call.args.p_answers) && call.args.p_answers.length === 4, 'envía 4 detalles');
    const byId = {};
    for (const a of call.args.p_answers) byId[a.question_id] = a.value;
    ok(byId[Q.rating] === '5', 'RATING viaja como "5"');
    ok(byId[Q.select] === 'Media', 'SELECT viaja con el valor elegido');
    ok(byId[Q.bool] === 'true', 'BOOLEAN viaja como "true"');
    ok(byId[Q.text] === 'Más tutoriales', 'TEXT viaja con el texto');
    ok(call.args.p_email === null && call.args.p_alias === null, 'sin datos personales no inventa campos');
    ok(s.classList.contains('ef-done'), 'la hoja pasa al estado de éxito');
    ok(s.querySelector('.ef-form').classList.contains('hidden'), 'oculta el formulario');
    ok(!s.querySelector('.ef-success').classList.contains('hidden'), 'muestra la confirmación');
    ok(EF.seen()['event-1'] && EF.seen()['event-1'].status === 'answered', 'marca la encuesta como respondida');
    ok(EF._internals.shouldSkip('event-1') === 'answered', 'no se vuelve a preguntar la misma campaña');
  }
  EF.reset();

  // -------------------------------------------------------------------------
  // 5. «Ahora no» + force
  // -------------------------------------------------------------------------
  resetAll();
  {
    await open();
    sheet().querySelector('.ef-later').onclick();
    await wait(280);
    ok(!doc.querySelector('.ef-overlay'), '«Ahora no» cierra la capa');
    ok(EF.seen()['event-1'].status === 'dismissed', 'registra el descarte');
    ok(EF._internals.shouldSkip('event-1') === 'dismissed', 'aplica el enfriamiento');
    const again = await open();
    ok(again.shown === false && again.reason === 'session', 'la sesión no insiste tras cerrar');
  }
  EF.reset();
  resetAll();
  {
    await open();
    sheet().querySelector('.ef-later').onclick();
    await wait(280);
    const forced = await open({ force: true });
    ok(forced.shown === true, 'force permite reabrir para pruebas/soporte');
  }
  EF.reset();

  // -------------------------------------------------------------------------
  // 6. Seguridad: el texto de la BD no se interpreta como HTML
  // -------------------------------------------------------------------------
  resetAll();
  activePayload.questions[0].question_text = '<img src=x onerror="window.pwned=1">';
  {
    await open();
    const card = sheet().querySelectorAll('.ef-q')[3];
    ok(card.querySelector('.ef-q-text').textContent === '<img src=x onerror="window.pwned=1">',
      'el texto de la pregunta se pinta como texto');
    ok(!card.querySelector('img'), 'no se crea ningún <img> desde la BD');
  }
  EF.reset();

  // -------------------------------------------------------------------------
  // 7. Correo inválido y datos opcionales
  // -------------------------------------------------------------------------
  resetAll();
  {
    await open();
    fillAll();
    const s = sheet();
    const email = s.querySelectorAll('.ef-input')[0];
    const alias = s.querySelectorAll('.ef-input')[1];
    email.value = 'no-es-un-correo';
    alias.value = 'Comandante QA';
    s.querySelector('.ef-send').onclick();
    await wait(20);
    ok(!submitCall(), 'no envía con un correo inválido');
    ok(s.querySelectorAll('.ef-err').some(n => n.textContent === HF.t('EF_EMAIL_BAD')), 'muestra el error de correo');
    email.value = 'qa@example.com';
    s.querySelector('.ef-send').onclick();
    await wait(20);
    const call = submitCall();
    ok(!!call && call.args.p_email === 'qa@example.com', 'envía el correo válido');
    ok(!!call && call.args.p_alias === 'Comandante QA', 'envía el alias');
  }
  EF.reset();

  // -------------------------------------------------------------------------
  // 8. Banderas collect_user_info / allow_comments
  // -------------------------------------------------------------------------
  resetAll();
  activePayload.event.collect_user_info = false;
  activePayload.event.allow_comments = false;
  {
    await open();
    const s = sheet();
    ok(s.querySelectorAll('.ef-input').length === 0, 'sin collect_user_info no pide correo/alias');
    ok(!s.querySelector('.ef-comment'), 'sin allow_comments no pide comentario');
    fillAll();
    s.querySelector('.ef-send').onclick();
    await wait(20);
    const call = submitCall();
    ok(!!call && call.args.p_email === null && call.args.p_alias === null && call.args.p_comment === null,
      'la RPC recibe null en los campos no permitidos');
  }
  EF.reset();

  // -------------------------------------------------------------------------
  // 9. Fallo definitivo del servidor
  // -------------------------------------------------------------------------
  resetAll();
  submitImpl = async () => ({ ok: true, data: { ok: false, error: 'INVALID_OPTION' } });
  {
    await open();
    fillAll();
    const s = sheet();
    s.querySelector('.ef-send').onclick();
    await wait(20);
    ok(s.querySelector('.ef-global').textContent === HF.t('EF_ERR_SELECT'), 'traduce el código de error del servidor');
    ok(!s.querySelector('.ef-send').disabled, 'reactiva el botón para corregir');
  }
  EF.reset();

  // -------------------------------------------------------------------------
  // 10. Sin red: cola local y reintento
  // -------------------------------------------------------------------------
  resetAll();
  {
    await open();
    fillAll();
    HF.cloud.online = false;
    submitImpl = async () => ({ ok: false, offline: true });
    sheet().querySelector('.ef-send').onclick();
    await wait(30);
    ok(EF.pending() === 1, 'guarda la respuesta en la cola local sin red');
    ok(toasts.some(x => x === HF.t('EF_QUEUED')), 'avisa de que se enviará al reconectar');
    ok(EF.seen()['event-1'].status === 'dismissed', 'no vuelve a insistir mientras hay una pendiente');
    HF.cloud.online = true;
    submitImpl = async () => ({ ok: true, data: { ok: true, response_id: 'resp-2' } });
    const sent = await EF.flush();
    ok(sent === 1, 'flush envía la cola pendiente');
    ok(EF.pending() === 0, 'la cola queda vacía');
    ok(EF.seen()['event-1'].status === 'answered', 'al reintentar con éxito marca respondida');
  }
  EF.reset();

  // -------------------------------------------------------------------------
  // 11. Límites de sesión y limpieza
  // -------------------------------------------------------------------------
  resetAll();
  {
    const first = await open();
    ok(first.shown === true, 'la primera encuesta de la sesión se abre');
    sheet().querySelector('.ef-later').onclick();
    await wait(280);
    const second = await open();
    ok(second.shown === false && second.reason === 'session',
      'solo una encuesta por campaign_event y sesión');
  }
  EF.reset();

  // -------------------------------------------------------------------------
  // 12. Una campaña nueva del mismo evento no queda bloqueada por la anterior
  // -------------------------------------------------------------------------
  resetAll();
  {
    await open();
    sheet().querySelector('.ef-later').onclick();
    await wait(280);
    activePayload = payload({
      campaign: { campaign_id: 'campaign-2', name: 'Campaña 2', description: 'Otra encuesta.' },
      event: { campaign_event_id: 'event-2', event_type: 'MATCH_OVER', collect_user_info: true, allow_comments: true }
    });
    const second = await open();
    ok(second.shown === true && second.key === 'event-2',
      'una campaña nueva del mismo evento se muestra en la misma sesión');
  }
  EF.reset();

  // -------------------------------------------------------------------------
  // 12b. Claves canónicas + etiquetas resueltas por la RPC
  // -------------------------------------------------------------------------
  resetAll();
  activePayload = payload({
    questions: [
      { question_id: Q.text, question_text: 'survey.match_over.q1_lost', question_label: '¿Hubo algún momento en el que te sentiste perdido?', question_type: 'TEXT', display_order: 1, is_required: true },
      { question_id: Q.select, question_text: 'survey.match_over.q3_return', question_label: '¿Volverás a jugar?', question_type: 'SELECT', options: ['survey.match_over.opt_yes', 'survey.match_over.opt_maybe', 'survey.match_over.opt_no'], option_labels: ['Sí, sin duda', 'Quizá', 'No'], display_order: 2, is_required: true }
    ]
  });
  {
    await open();
    const s = sheet();
    const cards = s.querySelectorAll('.ef-q');
    ok(cards[0].querySelector('.ef-q-text').textContent === '¿Hubo algún momento en el que te sentiste perdido?',
      'pinta question_label resuelto por la RPC');
    ok(cards[1].querySelector('.ef-q-text').textContent === '¿Volverás a jugar?',
      'pinta la segunda question_label');
    const opts = cards[1].querySelectorAll('.ef-opt');
    ok(opts[0].textContent === 'Sí, sin duda',
      'pinta option_labels resuelto por la RPC');
    opts[0].onclick();
    const ta = cards[0].querySelector('.ef-text');
    ta.value = 'Me perdí al principio';
    ta.oninput();
    s.querySelector('.ef-send').onclick();
    await wait(20);
    const call = submitCall();
    const byId = {};
    for (const a of call.args.p_answers) byId[a.question_id] = a.value;
    ok(byId[Q.select] === 'survey.match_over.opt_yes',
      'SELECT guarda la clave canónica, no la etiqueta traducida');
    ok(byId[Q.text] === 'Me perdí al principio',
      'TEXT guarda el texto libre del jugador');
  }
  EF.reset();

  // -------------------------------------------------------------------------
  // 12c. La RPC nueva manda etiquetas ya resueltas (DB-first)
  // -------------------------------------------------------------------------
  resetAll();
  activePayload = payload({
    campaign: { campaign_id: 'campaign-db', name: 'survey.match_over.title', name_label: 'CAMPAÑA DB', description: 'x', description_label: 'DESC DB' },
    questions: [
      { question_id: Q.text, question_text: 'survey.match_over.q1_lost', question_label: 'ETIQUETA DB', question_type: 'TEXT', display_order: 1, is_required: true },
      { question_id: Q.select, question_text: 'survey.match_over.q3_return', question_label: 'PREGUNTA DB', question_type: 'SELECT', options: ['survey.match_over.opt_yes', 'survey.match_over.opt_maybe'], option_labels: ['OPCIÓN DB', 'OTRA DB'], display_order: 2, is_required: false }
    ]
  });
  {
    await open();
    const s = sheet();
    ok(s.querySelector('.ef-kicker').textContent === 'CAMPAÑA DB',
      'usa name_label de la BD para la campaña');
    const cards = s.querySelectorAll('.ef-q');
    ok(cards[0].querySelector('.ef-q-text').textContent === 'ETIQUETA DB',
      'usa question_label de la BD para la pregunta');
    ok(cards[1].querySelectorAll('.ef-opt')[0].textContent === 'OPCIÓN DB',
      'usa option_labels de la BD para la opción');
  }
  EF.reset();

  // -------------------------------------------------------------------------
  // 12d. La preview del diagnóstico no envenena el disparador real
  // -------------------------------------------------------------------------
  resetAll();
  {
    const preview = await open({ preview: true, force: true });
    ok(preview.shown === true, 'la preview se abre aunque no haya marcas');
    sheet().querySelector('.ef-later').onclick();
    await wait(280);
    ok(!EF.seen()['event-1'], 'cerrar la preview no escribe la marca de descarte');
    const real = await open();
    ok(real.shown === true, 'el disparador real vuelve a mostrar la encuesta tras la preview');
  }
  EF.reset();

  // -------------------------------------------------------------------------
  // 13. Diagnóstico sin pintar
  // -------------------------------------------------------------------------
  resetAll();
  {
    const d = await EF.debug('MATCH_OVER');
    ok(d.ok && d.active === true && d.questions === 4 && d.session === false && d.seen === null,
      'debug devuelve campaña, preguntas y bloqueos locales sin abrir el modal');
  }
  EF.reset();

  // -------------------------------------------------------------------------
  // 14. Panel de diagnóstico visible (sin DevTools)
  // -------------------------------------------------------------------------
  resetAll();
  {
    EF.openDebug();
    await wait(20);
    ok(/Diagnóstico de encuesta/.test(diagHTML) && /Probar MATCH_OVER/.test(diagHTML)
      && /Limpiar marcas/.test(diagHTML),
      'el diagnóstico visible se abre desde Ajustes sin DevTools');
  }
  EF.reset();

  // -------------------------------------------------------------------------
  // 15. Integración: los cinco disparadores están conectados en el shell
  // -------------------------------------------------------------------------
  {
    const src = name => fs.readFileSync(path.join(JS, name), 'utf8');
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    ok(/checkAndRender\('GAME_ENTRY'/.test(src('main.js')), 'GAME_ENTRY conectado en main.js');
    ok(/checkAndRender\('MATCH_OVER'/.test(src('game.js')), 'MATCH_OVER conectado en game.js');
    ok(/checkAndRender\('TRIBE_MODIFIED'/.test(src('screens.js')), 'TRIBE_MODIFIED conectado en screens.js');
    ok(/checkAndRender\('MAP_EDIT_COMPLETE'/.test(src('editor.js')), 'MAP_EDIT_COMPLETE conectado en editor.js');
    ok(/checkAndRender\('REPLAY_FINISHED'/.test(src('replay.js')), 'REPLAY_FINISHED conectado en replay.js');
    ok(/js\/event-feedback\.js/.test(html) && /js\/event-feedback-langs\.js/.test(html),
      'index.html carga los dos scripts del módulo');
  }

  console.log(fail ? '\nCON FALLOS (' + fail + ')' : '\nTODO OK');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
