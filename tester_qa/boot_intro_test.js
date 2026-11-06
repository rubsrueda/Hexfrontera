#!/usr/bin/env node
/**
 * tester_qa/boot_intro_test.js
 *
 * Comprueba el ORDEN de arranque de js/main.js: la introducción debe
 * mostrarse ANTES del menú principal y el menú no debe abrirse hasta cerrarla.
 * Además valida que "No volver a mostrar" (showLoreIntro = false) la omita.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const MAIN = path.join(ROOT, 'js', 'main.js');

function runScenario(opts) {
  const calls = { go: [], show: [], complete: [] };

  const docHandlers = {};
  global.document = {
    getElementById: () => null,
    addEventListener: (t, fn) => { (docHandlers[t] = docHandlers[t] || []).push(fn); },
    removeEventListener: () => { },
    body: { classList: { add() { }, remove() { } } }
  };
  global.location = {
    search: opts.search || '',
    hash: opts.hash || '',
    protocol: 'file:',
    href: 'file:///hexfrontier/index.html'
  };
  // En Node 24 `navigator` es un getter global: hay que redefinirlo.
  Object.defineProperty(global, 'navigator', { value: {}, configurable: true, writable: true });
  global.addEventListener = () => { };
  global.setTimeout = setTimeout;

  const HF = {
    telemetry: { install() { } },
    store: { recover() { }, get: (k, d) => d, set() { } },
    settings: () => Object.assign({}, opts.settings),
    go: name => calls.go.push(name),
    cloud: { initIdentity() { }, flushQueue() { } },
    openSharedMap: () => calls.go.push('sharedmap'),
    playReplayFromCode: () => calls.go.push('replay'),
    platform: { ready: null },
    sfx: () => { },
    LoreScreen: null
  };
  if (opts.hasLore) {
    HF.LoreScreen = {
      onComplete(cb) { calls.complete.push(cb); },
      show(id) { calls.show.push(id); }
    };
  }
  global.window = { HF, location: global.location, setTimeout, addEventListener: () => { } };

  eval(fs.readFileSync(MAIN, 'utf8'));

  const hubBeforeClose = calls.go.filter(g => g === 'hub').length;
  if (calls.complete.length) calls.complete[calls.complete.length - 1]({ dontShowAgain: false });
  const hubAfterClose = calls.go.filter(g => g === 'hub').length;

  return {
    showsLore: calls.show.length > 0,
    page: calls.show[0] || null,
    hubBeforeClose,
    hubAfterClose
  };
}

let fails = 0;
const check = (cond, msg) => { if (!cond) fails++; console.log((cond ? '  ok   ' : '  FAIL ') + msg); };

console.log('=== boot_intro_test · orden de arranque ===');

console.log('\n[A] jugador nuevo');
let r = runScenario({ settings: { showLoreIntro: true }, hasLore: true });
check(r.showsLore, 'la introducción se muestra al abrir el juego');
check(r.page === 'imperio', 'empieza en la primera pantalla ("imperio")');
check(r.hubBeforeClose === 0, 'el menú NO se abre antes de cerrar la introducción');
check(r.hubAfterClose === 1, 'al cerrar la introducción se abre el menú');

console.log('\n[B] el jugador marcó "No volver a mostrar"');
r = runScenario({ settings: { showLoreIntro: false }, hasLore: true });
check(!r.showsLore, 'no se muestra la introducción');
check(r.hubAfterClose === 1, 'el menú se abre directamente');

console.log('\n[C] escape ?nolore=1');
r = runScenario({ settings: { showLoreIntro: true }, search: '?nolore=1', hasLore: true });
check(!r.showsLore, 'se salta la introducción');
check(r.hubAfterClose === 1, 'el menú se abre directamente');

console.log('\n[D] falta LoreScreen.js');
r = runScenario({ settings: { showLoreIntro: true }, hasLore: false });
check(!r.showsLore, 'no intenta mostrarla');
check(r.hubAfterClose === 1, 'el juego sigue siendo jugable (menú directo)');

console.log('\n[E] enlace compartido #map=…');
r = runScenario({ settings: { showLoreIntro: true }, hash: '#map=v1:abc', hasLore: true });
check(!r.showsLore, 'no interrumpe la apertura de un mapa compartido');

console.log('\n' + (fails ? '=== CON FALLOS: ' + fails + ' ===' : '=== OK · orden de arranque correcto ==='));
process.exitCode = fails ? 1 : 0;
