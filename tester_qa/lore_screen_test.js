#!/usr/bin/env node
/**
 * tester_qa/lore_screen_test.js
 *
 * Pantalla de introducción / lore (especificacion_pantalla_lore.md).
 * Sin navegador: carga los scripts clásicos con un DOM mínimo simulado y
 * comprueba estructura, 13 idiomas, navegación de las 5 pantallas, maquetación
 * de las tiras panorámicas, cierre, callback y persistencia de la preferencia.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const LORE_DIR = path.join(ROOT, 'js', 'ui', 'components', 'lore-screen');

// Idiomas que declara el juego (HF.LANGS).
const LANGS = ['es', 'en', 'zh', 'hi', 'fr', 'ar', 'bn', 'pt', 'ru', 'de', 'ja', 'ko', 'it'];

const wait = ms => new Promise(r => setTimeout(r, ms));

// ---------- DOM mínimo -------------------------------------------------------
function mkClassList(el) {
  return {
    add: c => el._cls.add(c),
    remove: c => el._cls.delete(c),
    toggle: (c, on) => { if (on === undefined) on = !el._cls.has(c); if (on) el._cls.add(c); else el._cls.delete(c); },
    contains: c => el._cls.has(c)
  };
}

function mkEl(tag) {
  const el = {
    tagName: String(tag || 'div').toUpperCase(),
    _cls: new Set(), _attrs: {}, _handlers: {}, _q: {},
    children: [], parentNode: null, textContent: '', innerHTML: '',
    disabled: false, scrollTop: 0, offsetWidth: 0, type: '', id: '', alt: '',
    className: '', classList: null,
    appendChild(c) { c.parentNode = el; el.children.push(c); return c; },
    removeChild(c) {
      const i = el.children.indexOf(c);
      if (i >= 0) el.children.splice(i, 1);
      c.parentNode = null;
      return c;
    },
    addEventListener(t, fn) { (el._handlers[t] = el._handlers[t] || []).push(fn); },
    setAttribute(k, v) { el._attrs[k] = String(v); if (k === 'id') el.id = String(v); },
    getAttribute(k) { return el._attrs[k] === undefined ? null : el._attrs[k]; },
    focus() { },
    querySelector(sel) { if (!el._q[sel]) el._q[sel] = mkEl('div'); return el._q[sel]; }
  };
  el.classList = mkClassList(el);
  return el;
}

const bodyEl = mkEl('body');
const docHandlers = {};

global.document = {
  body: bodyEl,
  createElement: tag => mkEl(tag),
  createTreeWalker: () => ({ nextNode: () => null }),   // sin nodos: el tecleo es instantáneo
  addEventListener: (t, fn) => { (docHandlers[t] = docHandlers[t] || []).push(fn); },
  removeEventListener: (t, fn) => {
    const a = docHandlers[t] || [];
    const i = a.indexOf(fn);
    if (i >= 0) a.splice(i, 1);
  }
};

const settings = { sound: false, vibrate: false };
const stored = {};
let currentLang = 'es';

global.window = {
  document: global.document,
  matchMedia: () => ({ matches: false }),
  setInterval, clearInterval, setTimeout, clearTimeout,
  console
};
global.window.HF = {
  LORE: null,
  lang: () => currentLang,
  settings: () => Object.assign({}, settings),
  store: {
    get: (k, d) => (k in stored ? stored[k] : d),
    set: (k, v) => { stored[k] = v; return true; }
  },
  sfx: () => { }
};

// ---------- carga de los scripts clásicos -----------------------------------
eval(fs.readFileSync(path.join(LORE_DIR, 'lore-data.js'), 'utf8'));
eval(fs.readFileSync(path.join(LORE_DIR, 'LoreScreen.js'), 'utf8'));

const HF = global.window.HF;
let fails = 0;
const ok = (cond, msg) => {
  if (!cond) fails++;
  console.log((cond ? '  ok   ' : '  FAIL ') + msg);
};
const key = k => (docHandlers.keydown || []).slice().forEach(fn => fn({ key: k, preventDefault() { } }));
const lastOverlay = () => bodyEl.children[bodyEl.children.length - 1];

(async function main() {

  console.log('=== lore_screen_test · pantalla de introducción ===');

  console.log('\n[estructura]');
  ok(!!HF.LORE && Array.isArray(HF.LORE.pages), 'HF.LORE.pages existe');
  ok(HF.LORE.pages.length === 5, '5 pantallas (recibidas: ' + (HF.LORE.pages ? HF.LORE.pages.length : 0) + ')');
  ok(typeof HF.LoreScreen.show === 'function', 'API .show()');
  ok(typeof HF.LoreScreen.hide === 'function', 'API .hide()');
  ok(typeof HF.LoreScreen.onComplete === 'function', 'API .onComplete()');
  HF.LORE.pages.forEach(meta => {
    ok(fs.existsSync(path.join(ROOT, meta.art)), 'arte "' + meta.id + '": ' + meta.art);
    ok(['art', 'shot', 'strip'].indexOf(meta.layout) >= 0, 'maquetación "' + meta.id + '" = ' + meta.layout);
  });
  ok(HF.LORE.pages.filter(p => p.layout === 'strip').length === 2, 'las 2 tiras panorámicas usan layout "strip"');
  ok(HF.LORE.pages.filter(p => p.layout === 'shot').length === 2, 'las 2 capturas usan layout "shot"');

  console.log('\n[idiomas]');
  const codes = Object.keys(HF.LORE.langs);
  ok(LANGS.every(c => codes.indexOf(c) >= 0), 'están los 13 idiomas (' + codes.length + ' cargados)');
  LANGS.forEach(code => {
    const d = HF.LORE.langs[code];
    if (!d) { ok(false, code + ': diccionario ausente'); return; }
    const faltan = [];
    ['kicker', 'chapter', 'dontShowAgain'].forEach(k => { if (!d[k]) faltan.push(k); });
    ['prev', 'next', 'start', 'skip'].forEach(k => { if (!d.labels || !d.labels[k]) faltan.push('labels.' + k); });
    HF.LORE.pages.forEach(meta => {
      const p = d.pages && d.pages[meta.id];
      if (!p) faltan.push(meta.id);
      else {
        if (!p.title) faltan.push(meta.id + '.title');
        if (!Array.isArray(p.blocks) || !p.blocks.length) faltan.push(meta.id + '.blocks');
      }
    });
    ok(!faltan.length, code + ': completo (' + (faltan.length ? 'falta ' + faltan.join(', ') : '5 páginas') + ')');
  });

  // ---------- apertura en español -------------------------------------------
  console.log('\n[apertura · es]');
  currentLang = 'es';
  HF.LoreScreen.show('imperio');

  const overlay = lastOverlay();
  ok(!!overlay, 'overlay añadido al body');
  ok(bodyEl._cls.has('lore-open') === true, 'body bloqueado con .lore-open');

  const panel = overlay.querySelector('.lore-panel');
  const dots = overlay.querySelector('.lore-dots');
  const titleEl = overlay.querySelector('.lore-title');
  const stepEl = overlay.querySelector('.lore-step');
  const nextEl = overlay.querySelector('[data-act="next"]');
  const skipEl = overlay.querySelector('[data-act="skip"]');

  ok(dots.children.length === 5, '5 puntos de progreso (recibidos: ' + dots.children.length + ')');
  ok(titleEl.textContent === 'EL FIN DE UN IMPERIO', 'título pantalla 1 (es)');
  ok(stepEl.textContent === '1 / 5', 'contador 1 / 5');
  ok(nextEl.textContent === 'SIGUIENTE →', 'botón "SIGUIENTE →" (es)');
  ok(skipEl.textContent === 'Saltar introducción', 'botón saltar (es)');
  ok(panel.getAttribute('data-layout') === 'art', 'pantalla 1 usa layout "art"');

  console.log('\n[navegación · es]');
  const esperado = [
    ['LA BATALLA POR LA FRONTERA', 'shot'],
    ['EL TEATRO DE OPERACIONES', 'shot'],
    ['CONTROL DE RECURSOS Y ESTADO', 'strip'],
    ['DOCTRINA DE ACCIÓN', 'strip']
  ];
  esperado.forEach(([titulo, layout], i) => {
    key('ArrowRight');
    ok(titleEl.textContent === titulo, 'pantalla ' + (i + 2) + ' = ' + titulo);
    ok(panel.getAttribute('data-layout') === layout, 'pantalla ' + (i + 2) + ' layout = ' + layout);
  });
  ok(stepEl.textContent === '5 / 5', 'contador final 5 / 5');
  ok(nextEl.textContent === 'ENTRAR AL TABLERO', 'último botón = ENTRAR AL TABLERO (es)');
  key('ArrowLeft');
  ok(titleEl.textContent === 'CONTROL DE RECURSOS Y ESTADO', 'ArrowLeft vuelve a la pantalla anterior');

  HF.LoreScreen.hide();
  await wait(400);

  // ---------- otros idiomas -------------------------------------------------
  console.log('\n[otros idiomas]');
  async function probeLang(code, expectedTitle, expectedNext) {
    currentLang = code;
    HF.LoreScreen.show('imperio');
    const ov = lastOverlay();
    const t = ov.querySelector('.lore-title');
    ok(t.textContent === expectedTitle, code + ': título "' + expectedTitle + '" (leído: "' + t.textContent + '")');
    const nb = ov.querySelector('[data-act="next"]').textContent;
    ok(nb === expectedNext, code + ': botón "' + expectedNext + '" (leído: "' + nb + '")');
    HF.LoreScreen.hide();
    await wait(350);
  }

  await probeLang('en', 'THE END OF AN EMPIRE', 'NEXT →');
  await probeLang('zh', '帝国的终结', '下一步 →');
  await probeLang('ja', '帝国の終焉', '次へ →');
  await probeLang('ko', '제국의 종말', '다음 →');
  await probeLang('ru', 'КОНЕЦ ИМПЕРИИ', 'ДАЛЕЕ →');
  await probeLang('ar', 'نهاية إمبراطورية', '← التالي');
  await probeLang('hi', 'एक साम्राज्य का अंत', 'आगे →');
  await probeLang('bn', 'এক সাম্রাজ্যের অবসান', 'পরবর্তী →');
  await probeLang('fr', "LA FIN D'UN EMPIRE", 'SUIVANT →');
  await probeLang('de', 'DAS ENDE EINES IMPERIUMS', 'WEITER →');
  await probeLang('it', 'LA FINE DI UN IMPERO', 'AVANTI →');
  await probeLang('pt', 'O FIM DE UM IMPÉRIO', 'SEGUINTE →');

  // ---------- cierre en español ---------------------------------------------
  console.log('\n[cierre y preferencia]');
  currentLang = 'es';
  HF.LoreScreen.show('imperio');
  const ov2 = lastOverlay();

  let done2 = null;
  HF.LoreScreen.onComplete(res => { done2 = res; });
  ov2.querySelector('#loreDontShow').checked = true;   // el jugador marca la casilla

  for (let i = 0; i < 4; i++) key('ArrowRight');        // hasta la última pantalla
  key('Enter');                                         // "ENTRAR AL TABLERO" = cerrar
  await wait(500);

  ok(done2 !== null, '.onComplete() se disparó');
  ok(done2 && done2.dontShowAgain === true, 'dontShowAgain = true al marcar la casilla');
  ok(stored.settings && stored.settings.showLoreIntro === false, 'guardado: showLoreIntro = false');
  ok(stored.settings && stored.settings.loreIntroSeen === true, 'guardado: loreIntroSeen = true');
  ok(bodyEl.children.indexOf(ov2) === -1, 'overlay retirado del DOM');
  ok(bodyEl._cls.has('lore-open') === false, 'body desbloqueado');

  console.log('\n' + (fails ? '=== CON FALLOS: ' + fails + ' ===' : '=== OK · 5 pantallas · 13 idiomas · preferencia ==='));
  process.exitCode = fails ? 1 : 0;
})();
