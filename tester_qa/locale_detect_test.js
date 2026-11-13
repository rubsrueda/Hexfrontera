'use strict';
// Detección del idioma del jugador: un usuario nuevo debe seguir el idioma
// del dispositivo; una elección manual explícita no debe ser pisada.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };

const store = new Map();
const body = {
  classList: { add() { }, remove() { }, toggle() { } },
  offsetWidth: 1
};
const doc = {
  body,
  documentElement: { lang: '', dir: '' },
  getElementById: () => null,
  addEventListener() { }, removeEventListener() { }
};
const HF = {};
const sandbox = {
  console, HF, window: null,
  navigator: { language: 'de-DE', languages: ['de-DE', 'de'] },
  localStorage: {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
    key: i => Array.from(store.keys())[i] || null,
    get length() { return store.size; }
  },
  document: doc,
  location: { href: 'https://federati.org/', protocol: 'https:', hostname: 'federati.org' },
  setTimeout, clearTimeout, setInterval, clearInterval,
  requestAnimationFrame: cb => setTimeout(cb, 0),
  Promise, Date, Math, JSON
};
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ['util.js', 'config.js', 'i18n.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'), sandbox, { filename: f });
}

(async () => {
  // 1. Usuario nuevo: sin settings guardados, navegador alemán.
  store.clear();
  await HF.initFirstBootLanguage();
  ok(HF.lang() === 'de', 'un usuario nuevo detecta el alemán del dispositivo');
  ok(HF.t('SETTINGS') === HF.LOCALES.de.SETTINGS, 'HF.t usa el diccionario alemán');
  ok(doc.documentElement.lang === 'de', 'el documento queda en alemán');

  // 2. Elección manual explícita: no la pisa el navegador.
  HF.store.set('settings', { lang: 'fr', lang_explicit: true });
  sandbox.navigator.language = 'de-DE';
  sandbox.navigator.languages = ['de-DE', 'de'];
  await HF.initFirstBootLanguage();
  ok(HF.lang() === 'fr', 'una elección manual explícita se conserva');

  // 3. Configuración antigua: lang:'es' sin marca explícita:
  //    se vuelve a detectar el idioma del dispositivo.
  HF.store.set('settings', { lang: 'es' });
  await HF.initFirstBootLanguage();
  ok(HF.lang() === 'de', 'un lang:es antiguo sin marca explícita se re-detecta');

  // 4. Cambio manual desde Ajustes: setLocale marca lang_explicit.
  await HF.setLocale('it');
  ok(HF.lang() === 'it', 'setLocale aplica el idioma elegido');
  const saved = HF.store.get('settings', {});
  ok(saved.lang === 'it' && saved.lang_explicit === true, 'setLocale persiste la elección explícita');
  await HF.initFirstBootLanguage();
  ok(HF.lang() === 'it', 'el siguiente arranque respeta la elección de Ajustes');

  console.log(fail ? '\nCON FALLOS (' + fail + ')' : '\nTODO OK');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
