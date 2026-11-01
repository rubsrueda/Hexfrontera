'use strict';
// Regresión: abrir la pantalla Online sin sesión (el fallo era leer
// s.room_code con sesión nula) y con una sesión guardada.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HF = {};
const el = {
  innerHTML: '', isConnected: true,
  querySelector() { return null; }, querySelectorAll() { return []; },
  addEventListener() { }, removeEventListener() { }, classList: { add() { }, remove() { }, toggle() { } }
};
const node = () => ({
  innerHTML: '', style: {}, classList: { add() { }, remove() { }, toggle() { } },
  querySelector() { return null; }, querySelectorAll() { return []; },
  appendChild() { }, remove() { }, setAttribute() { }, addEventListener() { }, removeEventListener() { }
});
const modalNode = {
  innerHTML: '', style: {}, classList: { add() { }, remove() { }, toggle() { } },
  querySelector() { return null; }, querySelectorAll() { return []; }
};
const doc = {
  getElementById() { return el; },
  querySelector(sel) { return sel === '#modal' ? modalNode : (sel === '#app' ? el : null); },
  querySelectorAll() { return []; },
  createElement() { return node(); },
  addEventListener() { }, removeEventListener() { },
  documentElement: { lang: 'es', dir: 'ltr', style: {} },
  body: { appendChild() { }, style: {} },
  visibilityState: 'visible', hidden: false
};
const sandbox = {
  console, HF, document: doc, window: null, navigator: { onLine: true, language: 'es' },
  localStorage: null, setTimeout, clearTimeout, setInterval, clearInterval,
  performance: { now: () => Date.now() }
};
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ['util.js', 'config.js', 'data.js', 'i18n.js', 'names.js', 'cloud.js', 'screens.js', 'online.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox);

let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };

// 1. Sin sesión: debe mostrar crear/unirse, sin lanzar.
HF.store.del('online_session');
let threw = null;
try { HF.go('online'); } catch (e) { threw = e; }
ok(!threw, 'abre Online sin sesión');
ok(el.innerHTML.includes('Unirse a una sala'), 'muestra el formulario de unión');
ok(el.innerHTML.includes('Configurar partida'), 'enlaza a la configuración de partida');
ok(el.innerHTML.includes('Probar conexión'), 'muestra el diagnóstico de conexión');
if (threw) console.error(threw);

// 2. Con sesión pero sin sala cargada: no debe romper por s.room_code.
HF.store.set('online_session', { room_code: 'ABCDE', player_id: HF.online.playerId() });
threw = null;
try { HF.go('online'); } catch (e) { threw = e; }
ok(!threw, 'abre Online con sesión guardada');
ok(el.innerHTML.includes('ABCDE'), 'muestra el código de la sala');
ok(el.innerHTML.includes('Jugadores'), 'muestra la lista de jugadores');
if (threw) console.error(threw);
if (HF.onLeave) { HF.onLeave(); HF.onLeave = null; }

console.log(fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK');
process.exit(fail ? 1 : 0);
