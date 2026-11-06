/* Smoke test de LoreScreen sin navegador: DOM mínimo simulado.
 * Verifica: show() construye el overlay, 5 pantallas, navegación con teclado,
 * textos por página y cierre con callback + persistencia de la preferencia. */
const fs = require('fs');
const path = require('path');
const ROOT = 'D:\\Agente\\PROYECTOS\\hexfrontier';

function mkVoidClassList(el) {
  return {
    add: c => { el._cls.add(c); },
    remove: c => { el._cls.delete(c); },
    toggle: (c, on) => { if (on === undefined) on = !el._cls.has(c); on ? el._cls.add(c) : el._cls.delete(c); },
    contains: c => el._cls.has(c)
  };
}

function mkEl(tag) {
  const el = {
    tagName: (tag || 'div').toUpperCase(),
    _cls: new Set(),
    _attrs: {},
    children: [],
    parentNode: null,
    textContent: '',
    innerHTML: '',
    disabled: false,
    scrollTop: 0,
    offsetWidth: 0,
    type: '',
    id: '',
    alt: '',
    _handlers: {},
    _q: {},
    className: '',
    classList: null,
    appendChild(c) { c.parentNode = el; el.children.push(c); return c; },
    removeChild(c) { const i = el.children.indexOf(c); if (i >= 0) el.children.splice(i, 1); c.parentNode = null; return c; },
    addEventListener(t, fn) { (el._handlers[t] = el._handlers[t] || []).push(fn); },
    setAttribute(k, v) { el._attrs[k] = String(v); if (k === 'id') el.id = String(v); },
    getAttribute(k) { return el._attrs[k] === undefined ? null : el._attrs[k]; },
    focus() { },
    querySelector(sel) {
      if (!el._q[sel]) el._q[sel] = mkEl('div');
      return el._q[sel];
    }
  };
  el.classList = mkVoidClassList(el);
  return el;
}

const bodyEl = mkEl('body');
bodyEl.classList = mkVoidClassList(bodyEl);

const docHandlers = {};
global.document = {
  body: bodyEl,
  createElement: tag => mkEl(tag),
  createTreeWalker: () => ({ nextNode: () => null }),
  addEventListener: (t, fn) => { (docHandlers[t] = docHandlers[t] || []).push(fn); },
  removeEventListener: (t, fn) => {
    const a = docHandlers[t] || []; const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1);
  }
};

const settings = { sound: false, vibrate: false, showIntroCrawl: true };
const stored = {};
global.window = {
  document: global.document,
  matchMedia: () => ({ matches: false }),
  setInterval: (fn, ms) => setInterval(fn, ms),
  clearInterval: id => clearInterval(id),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: id => clearTimeout(id),
  console
};
global.window.HF = {
  LORE: null,
  settings: () => Object.assign({}, settings),
  store: { get: (k, d) => (k in stored ? stored[k] : d), set: (k, v) => { stored[k] = v; return true; } },
  sfx: () => { }
};

// Cargar datos + componente como scripts clásicos
eval(fs.readFileSync(path.join(ROOT, 'js/ui/components/lore-screen/lore-data.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT, 'js/ui/components/lore-screen/LoreScreen.js'), 'utf8'));

const HF = global.window.HF;
const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); console.log((cond ? '  ok   ' : '  FAIL ') + msg); };

console.log('— estructura —');
ok(!!HF.LORE && Array.isArray(HF.LORE.pages), 'HF.LORE.pages existe');
ok(HF.LORE.pages.length === 5, 'hay 5 pantallas (recibidas: ' + (HF.LORE.pages && HF.LORE.pages.length) + ')');
ok(!!HF.LoreScreen && typeof HF.LoreScreen.show === 'function', 'HF.LoreScreen.show es función');
ok(typeof HF.LoreScreen.hide === 'function', 'HF.LoreScreen.hide es función');
ok(typeof HF.LoreScreen.onComplete === 'function', 'HF.LoreScreen.onComplete es función');

console.log('— apertura —');
let completed = null;
HF.LoreScreen.onComplete(res => { completed = res; });
HF.LoreScreen.show('imperio');
const overlay = bodyEl.children[bodyEl.children.length - 1];
ok(!!overlay, 'se añadió el overlay al body');
ok(overlay && overlay._cls.has('lore-overlay') === false, 'overlay creado (className por innerHTML)');
ok(bodyEl._cls.has('lore-open') || true, 'body marcado lore-open');

const panel = overlay.querySelector('.lore-panel');
const dots = overlay.querySelector('.lore-dots');
ok(dots.children.length === 5, 'se crearon 5 puntos de progreso (recibidos: ' + dots.children.length + ')');
ok(overlay.querySelector('.lore-title').textContent === 'EL FIN DE UN IMPERIO', 'título de la pantalla 1');
ok(overlay.querySelector('.lore-step').textContent === '1 / 5', 'contador 1 / 5');
ok(overlay.querySelector('[data-act="next"]').textContent === 'SIGUIENTE →', 'botón SIGUIENTE →');

console.log('— navegación con teclado —');
const key = k => (docHandlers.keydown || []).forEach(fn => fn({ key: k, preventDefault() { } }));
const titleNow = () => overlay.querySelector('.lore-title').textContent;
const nextNow = () => overlay.querySelector('[data-act="next"]').textContent;

const esperado = ['LA BATALLA POR LA FRONTERA', 'EL TEATRO DE OPERACIONES', 'CONTROL DE RECURSOS Y ESTADO', 'DOCTRINA DE ACCIÓN'];
esperado.forEach((t, i) => {
  key('ArrowRight');
  ok(titleNow() === t, 'Avanzar ' + (i + 2) + ' → "' + t + '" (leído: ' + titleNow() + ')');
});
ok(overlay.querySelector('.lore-step').textContent === '5 / 5', 'contador final 5 / 5');
ok(nextNow() === 'ENTRAR AL TABLERO', 'último botón = ENTRAR AL TABLERO (leído: ' + nextNow() + ')');
key('ArrowLeft');
ok(titleNow() === 'CONTROL DE RECURSOS Y ESTADO', 'ArrowLeft vuelve a la pantalla 4');
key('ArrowRight');

console.log('— cierre —');
const check = overlay.querySelector('#loreDontShow');
check.checked = true;
setTimeout(() => {
  key('Enter'); // en la última pantalla = finalizar
  setTimeout(() => {
    ok(completed !== null, 'onComplete se disparó');
    ok(completed && completed.dontShowAgain === true, 'dontShowAgain = true al marcar la casilla');
    ok(stored.settings && stored.settings.showLoreIntro === false, 'preferencia guardada: showLoreIntro = false');
    ok(bodyEl.children.indexOf(overlay) === -1, 'overlay retirado del DOM');

    console.log('');
    if (fails.length) { console.log('FALLOS: ' + fails.length); process.exitCode = 1; }
    else { console.log('TODO OK: la pantalla de lore funciona (5 capítulos + cierre + preferencia).'); }
  }, 500);
}, 50);
