/* Test del arranque (js/main.js): decide si la introducción aparece ANTES del menú.
 * Sin navegador: se evalúa main.js con un window/HF simulado en 3 escenarios. */
const fs = require('fs');
const ROOT = 'D:\\Agente\\PROYECTOS\\hexfrontier';

function runScenario(label, { settings, search, hash, hasLore }) {
  const calls = { go: [], show: [], complete: [] };

  const docHandlers = {};
  global.document = {
    getElementById: () => null,
    addEventListener: (t, fn) => { (docHandlers[t] = docHandlers[t] || []).push(fn); },
    removeEventListener: () => { },
    body: { classList: { add() { }, remove() { } } }
  };
  global.location = { search: search || '', hash: hash || '', protocol: 'file:', href: 'file:///x/index.html' };
  global.navigator = {};                       // sin serviceWorker -> no se registra nada
  global.addEventListener = () => { };
  global.setTimeout = setTimeout;

  const HF = {
    telemetry: { install() { } },
    store: { recover() { }, get: (k, d) => d, set() { } },
    settings: () => Object.assign({}, settings),
    go: name => calls.go.push(name),
    cloud: { initIdentity() { }, flushQueue() { } },
    openSharedMap: () => calls.go.push('sharedmap'),
    playReplayFromCode: () => calls.go.push('replay'),
    platform: { ready: null },
    sfx: () => { }
  };
  if (hasLore) {
    HF.LoreScreen = {
      onComplete(cb) { calls.complete.push(cb); },
      show(id) { calls.show.push(id); }
    };
  }
  global.window = { HF, location: global.location, setTimeout, addEventListener: () => { } };

  eval(fs.readFileSync(ROOT + '\\js\\main.js', 'utf8'));

  const out = {
    showsLore: calls.show.length > 0,
    lorePage: calls.show[0] || null,
    hubBeforeClose: calls.go.filter(g => g === 'hub').length,
    calls
  };
  // Si se mostró la intro, cerrar el último callback (equivale a pulsar ENTRAR)
  if (calls.complete.length) calls.complete[calls.complete.length - 1]({ dontShowAgain: false });
  out.hubAfterClose = calls.go.filter(g => g === 'hub').length;
  console.log('— ' + label + ' —');
  console.log('  muestra introducción : ' + out.showsLore + (out.showsLore ? ' (página "' + out.lorePage + '")' : ''));
  console.log('  hub antes de cerrar  : ' + out.hubBeforeClose + (out.hubBeforeClose === 0 ? '  ✓ no se adelanta' : '  ✗'));
  console.log('  hub al cerrar        : ' + out.hubAfterClose);
  return out;
}

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('  ✗ ' + m); } else console.log('  ✓ ' + m); };

console.log('=== Escenario A: jugador nuevo (sin preferencia) ===');
let r = runScenario('A', { settings: { showLoreIntro: true }, hasLore: true });
ok(r.showsLore, 'la introducción se muestra al arrancar');
ok(r.lorePage === 'imperio', 'arranca en la primera pantalla ("imperio")');
ok(r.hubBeforeClose === 0, 'el menú NO se abre por debajo/antes');
ok(r.hubAfterClose === 1, 'al cerrar la introducción se abre el menú');

console.log('\n=== Escenario B: jugador marcó "No volver a mostrar" ===');
r = runScenario('B', { settings: { showLoreIntro: false }, hasLore: true });
ok(!r.showsLore, 'la introducción no se muestra');
ok(r.hubAfterClose === 1, 'el menú se abre directamente');

console.log('\n=== Escenario C: escape ?nolore=1 ===');
r = runScenario('C', { settings: { showLoreIntro: true }, search: '?nolore=1', hasLore: true });
ok(!r.showsLore, 'la introducción se salta con ?nolore=1');
ok(r.hubAfterClose === 1, 'el menú se abre directamente');

console.log('\n=== Escenario D: falta LoreScreen.js (fallo de carga) ===');
r = runScenario('D', { settings: { showLoreIntro: true }, hasLore: false });
ok(!r.showsLore, 'no intenta mostrarla');
ok(r.hubAfterClose === 1, 'el juego sigue siendo jugable (menú directo)');

console.log('\n' + (fails ? 'FALLOS: ' + fails : 'TODO OK: el orden de arranque es correcto.'));
process.exitCode = fails ? 1 : 0;
