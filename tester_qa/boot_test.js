'use strict';
// Arranque real en modo web con el puente de plataforma delante:
// index.html → util → platform → ... → main. Comprueba que el boot asíncrono
// (HF.platform.ready) monta el Hub y que no se rompe el almacén local.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HF = {};
const ctaNode = {
  innerHTML: '', isConnected: true,
  querySelector(sel) { return sel === '.cta-go' ? { onclick: null } : null; },
  querySelectorAll() { return []; }
};
const el = {
  innerHTML: '', isConnected: true,
  querySelector(sel) { return sel === '#cta' ? ctaNode : null; },
  querySelectorAll() { return []; },
  addEventListener() { }, removeEventListener() { },
  classList: { add() { }, remove() { }, toggle() { } }
};
const toastNode = { textContent: '', classList: { add() { }, remove() { } } };
const modalNode = {
  innerHTML: '', style: {}, classList: { add() { }, remove() { }, toggle() { } },
  querySelector() { return null; }, querySelectorAll() { return []; }
};
const doc = {
  getElementById() { return el; },
  querySelector(sel) {
    if (sel === '#modal') return modalNode;
    if (sel === '#toast') return toastNode;
    if (sel === '#app') return el;
    return null;
  },
  querySelectorAll() { return []; },
  createElement() { return { style: {}, classList: { add() { }, remove() { } }, appendChild() { } }; },
  addEventListener() { }, removeEventListener() { },
  documentElement: { lang: 'es', dir: 'ltr', style: {} },
  body: { style: {}, appendChild() { }, classList: { add() { }, remove() { }, toggle() { } } },
  visibilityState: 'visible', hidden: false
};
const sandbox = {
  console, HF, document: doc, window: null,
  navigator: { onLine: false, language: 'es' },
  location: { hash: '', protocol: 'http:', hostname: 'localhost', pathname: '/', href: 'http://localhost/' },
  localStorage: null, setTimeout, clearTimeout, setInterval, clearInterval,
  Promise, Date, Math, JSON, performance: { now: () => Date.now() },
  addEventListener() { }, removeEventListener() { }
};
sandbox.window = sandbox;
vm.createContext(sandbox);

let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };
const load = f => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox);

// Mismo orden que index.html hasta screens (sin canvas, audio ni red).
for (const f of ['util.js', 'telemetry.js', 'platform.js', 'config.js', 'data.js', 'i18n.js', 'names.js',
  'cloud.js', 'progress.js', 'screens.js']) load(f);

ok(!!HF.telemetry && HF.telemetry.installed === true, 'telemetry.js se instala en el arranque');
ok(typeof sandbox.onerror === 'function', 'el interceptor global queda activo');

ok(!!HF.platform && HF.platform.kind === 'web', 'platform.js arranca en modo web');
ok(HF.store === HF.store && typeof HF.store.set === 'function', 'el almacén local queda operativo');
ok(HF.currentScreen === undefined, 'aún no hay pantalla montada');

// La nube no debe intentar red durante la prueba.
HF.cloud.initIdentity = () => { };
HF.cloud.flushQueue = () => Promise.resolve();

// main.js agenda el Hub tras HF.platform.ready (microtarea).
load('main.js');

(async () => {
  await new Promise(r => setTimeout(r, 20));
  ok(HF.currentScreen === 'hub', 'el boot asíncrono monta el Hub');
  ok(el.innerHTML.includes('id="app"') === false && el.innerHTML.length > 200, 'el Hub renderizó contenido');
  ok(el.innerHTML.includes('RETO DIARIO') || el.innerHTML.includes('Campaña'), 'el Hub muestra sus accesos');
  ok(HF.settings().lang === 'es', 'los ajustes por defecto se leen sin puente nativo');

  // Ciclo de vida en web: pausa y reanuda sin tableros ni audio.
  HF.platform.pause('test');
  ok(HF.runtimePaused === true && HF.platform.paused === true, 'la pausa funciona tras el arranque real');
  HF.platform.resume('test');
  ok(HF.runtimePaused === false && HF.platform.paused === false, 'la reanudación funciona tras el arranque real');

  console.log(fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK');
  process.exit(fail ? 1 : 0);
})();
