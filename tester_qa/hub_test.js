'use strict';
// Regresión del Hub: banner de acción rápida restaurado y botones con arte.
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
const modalNode = {
  innerHTML: '', style: {}, classList: { add() { }, remove() { }, toggle() { } },
  querySelector() { return null; }, querySelectorAll() { return []; }
};
const doc = {
  getElementById() { return el; },
  querySelector(sel) { return sel === '#modal' ? modalNode : (sel === '#app' ? el : null); },
  querySelectorAll() { return []; },
  createElement() { return { style: {}, classList: { add() { }, remove() { } }, appendChild() { } }; },
  addEventListener() { }, removeEventListener() { },
  documentElement: { lang: 'es', dir: 'ltr', style: {} },
  body: { style: {}, appendChild() { } },
  visibilityState: 'visible', hidden: false
};
const sandbox = {
  console, HF, document: doc, window: null,
  navigator: { onLine: false, language: 'es' },
  localStorage: null, setTimeout, clearTimeout, setInterval, clearInterval,
  performance: { now: () => Date.now() }
};
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ['util.js', 'config.js', 'data.js', 'i18n.js', 'names.js', 'cloud.js', 'progress.js', 'screens.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox);

let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };

let threw = null;
try { HF.go('hub'); } catch (e) { threw = e; }
if (threw) console.error(threw);
ok(!threw, 'el Hub se abre sin errores');
const html = el.innerHTML;
ok(html.includes('art/boton-reto-diario.png'), 'Diario usa boton-reto-diario');
ok(html.includes('art/boton-reproducir.png'), 'Repetición usa boton-reproducir');
ok(html.includes('art/boton-campana.png'), 'Mapa usa boton-campana');
ok(html.includes('art/boton-historial.png'), 'Ajustes usa boton-historial');
ok(html.includes('art/boton-codice.png'), 'Códice usa boton-codice');
ok(html.includes('art/boton-reclutar.png'), 'Campaña usa boton-reclutar');
ok(html.includes('art/boton-construir.png'), 'Nueva partida usa boton-construir');
ok(!html.includes('id="set2"'), 'el Ajustes superior ya no existe');
ok(html.includes('id="set"'), 'el Ajustes inferior se mantiene');
ok(html.includes('id="stats"') && html.includes('art/boton-estadisticas.png'), 'Stats sigue en el dock como entrada única');
ok(!html.includes('id="ranking"'), 'el botón Ranking ya no está en el Hub: se entra por Stats');
ok(!html.includes('id="hist"'), 'el historial ya no está en la barra superior');
ok(!html.includes('id="standing"') && !html.includes('id="stOpen"'), 'la tarjeta «Tu posición» ya no está en el Hub');
ok(html.includes('id="fbFab"') && html.includes('fb-fab'), 'el Hub tiene el botón flotante de comentarios');
ok(ctaNode.innerHTML.includes('RETO DIARIO'), 'el banner del reto diario aparece');
ok(ctaNode.innerHTML.includes('cta-go'), 'el banner tiene botón de iniciar');
ok(!html.includes('⚔️ Campaña') && !html.includes('🎲 Nueva partida'), 'sin iconos delante de Campaña/Nueva partida');

console.log(fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK');
process.exit(fail ? 1 : 0);
