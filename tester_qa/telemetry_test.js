'use strict';
// Pruebas del interceptor de errores (js/telemetry.js): metadatos en consola,
// volcado de emergencia en localStorage["hex_crash_save"] y API de rescate.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'telemetry.js'), 'utf8');
let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };

function makeEnv(opts) {
  opts = opts || {};
  const HF = {};
  const logs = { error: [], warn: [] };
  const listeners = Object.create(null);
  const store = new Map(Object.entries(opts.store || {}));
  let throwing = !!opts.throwOnSet;
  const sandbox = {
    HF,
    console: {
      error: function () { logs.error.push(Array.prototype.slice.call(arguments)); },
      warn: function () { logs.warn.push(Array.prototype.slice.call(arguments)); },
      log: function () { }, info: function () { }
    },
    localStorage: {
      getItem: k => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { if (throwing) { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; } store.set(k, String(v)); },
      removeItem: k => { store.delete(k); },
      key: i => Array.from(store.keys())[i] || null,
      get length() { return store.size; }
    },
    navigator: { userAgent: 'hex-tests/1.0' },
    location: { href: 'https://hexfrontier.test/index.html' },
    addEventListener: (t, f) => { (listeners[t] || (listeners[t] = [])).push(f); },
    setTimeout, clearTimeout, Date, Math, JSON, Promise
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(SRC, sandbox);
  return {
    HF, sandbox, store, logs, listeners,
    fireError: (msg, file, line, col, err) => sandbox.onerror(msg, file, line, col, err),
    fireRejection: reason => { for (const f of (listeners.unhandledrejection || [])) f({ reason }); },
    setThrowing: v => { throwing = v; }
  };
}

const readDump = store => {
  const raw = store.get('hex_crash_save');
  return raw ? JSON.parse(raw) : null;
};

// ---------------------------------------------------------------- instalación
{
  const prevCalls = [];
  const env0 = makeEnv();
  // Cadena con un onerror previo (no debe romperse).
  const chained = makeEnv();
  chained.sandbox.onerror = function () { prevCalls.push(arguments[0]); return false; };
  vm.runInContext(SRC, chained.sandbox);
  ok(typeof env0.sandbox.onerror === 'function', 'registra window.onerror');
  ok(!!env0.listeners.unhandledrejection && env0.listeners.unhandledrejection.length === 1, 'registra unhandledrejection');
  ok(env0.HF.telemetry && env0.HF.telemetry.installed === true, 'expone HF.telemetry.installed');
  ok(env0.HF.telemetry.install() && env0.listeners.unhandledrejection.length === 1, 'install() es idempotente');
}

// ------------------------------------------------- metadatos y volcado normal
{
  const env = makeEnv();
  const game = { turn: 7, mode: 'skirmish', cells: [], f: [] };
  env.HF.currentScreen = 'game';
  env.HF.cur = () => ({ g: game });
  env.HF.serialize = g => ({ turn: g.turn, mode: g.mode, cells: g.cells, f: g.f, replayLog: [[1, 2, 3]] });

  const boom = new Error('boom en el motor');
  const ret = env.fireError('Uncaught boom en el motor', 'js/engine.js', 42, 9, boom);
  ok(ret === false, 'devuelve false (no silencia el error del navegador)');

  ok(env.logs.error.length === 1, 'registra el error en consola');
  const meta = env.logs.error[0][1];
  ok(meta && meta.message === 'Uncaught boom en el motor', 'el log lleva el mensaje');
  ok(meta.source === 'js/engine.js' && meta.line === 42 && meta.column === 9, 'el log lleva archivo/línea/columna');
  ok(typeof meta.stack === 'string' && meta.stack.includes('boom en el motor'), 'el log lleva el stack trace');

  const dump = readDump(env.store);
  ok(!!dump, 'vuelca la copia de emergencia en localStorage["hex_crash_save"]');
  ok(dump && dump.turn === 7, 'la copia conserva el turno');
  ok(dump && dump.state && dump.state.turn === 7, 'la copia incluye el estado serializado');
  ok(dump && dump.message === 'Uncaught boom en el motor', 'la copia incluye el mensaje del fallo');
  ok(dump && dump.app === 'hexfrontier' && dump.v === 1, 'la copia lleva versión y app');
  ok(env.HF.telemetry.stats().dumps === 1, 'cuenta el volcado');

  // No se pisa una copia pendiente.
  env.HF.serialize = () => ({ turn: 99, mode: 'skirmish' });
  env.fireError('otro fallo distinto', 'js/ai.js', 3, 1, new Error('otro'));
  ok(readDump(env.store).turn === 7, 'un segundo error no pisa la copia pendiente');
  ok(env.HF.telemetry.stats().dumps === 1, 'no vuelve a contar como volcado');

  // La API de rescate lee el documento.
  ok(env.HF.crash.has() === true, 'HF.crash.has() detecta la copia');
  ok(env.HF.crash.read().turn === 7, 'HF.crash.read() devuelve el documento');
  ok(String(env.HF.telemetry.report()).includes('Uncaught boom'), 'report() incluye el error');
}

// ------------------------------------------- contrato window.gameEngine
{
  const env = makeEnv();
  env.sandbox.gameEngine = { turn: 3, serialize: () => ({ turn: 3, mode: 'campaign', cells: [] }) };
  env.fireError('fallo con gameEngine', 'js/game.js', 10, 2, new Error('x'));
  const dump = readDump(env.store);
  ok(dump && dump.stateSource === 'window.gameEngine.serialize', 'usa window.gameEngine.serialize cuando existe');
  ok(dump && dump.turn === 3 && dump.mode === 'campaign', 'toma turno y modo del contrato global');
}

// ------------------------------------------------------- sin partida activa
{
  const env = makeEnv();
  env.HF.cur = () => null;
  env.fireError('fallo en el hub', 'js/screens.js', 5, 5, new Error('hub'));
  ok(env.logs.error.length === 1, 'registra el fallo aunque no haya partida');
  ok(!env.store.has('hex_crash_save'), 'sin partida no escribe copia de emergencia');
}

// --------------------------------------------------- rechazos de promesas
{
  const env = makeEnv();
  env.HF.cur = () => ({ g: { turn: 11, mode: 'skirmish' } });
  env.HF.serialize = () => ({ turn: 11, mode: 'skirmish' });
  env.fireRejection(new Error('promesa rota'));
  ok(env.logs.error.length === 1 && env.logs.error[0][1].message === 'promesa rota', 'captura unhandledrejection con Error');
  ok(readDump(env.store).turn === 11, 'el rechazo también provoca la copia de emergencia');

  const env2 = makeEnv();
  env2.HF.cur = () => ({ g: { turn: 2 } });
  env2.HF.serialize = () => ({ turn: 2 });
  env2.fireRejection('texto plano');
  ok(env2.logs.error[0][1].message === 'texto plano', 'normaliza rechazos con razón no-Error');
}

// --------------------------------------------------- copia previa al arrancar
{
  const env = makeEnv({ store: { hex_crash_save: JSON.stringify({ v: 1, app: 'hexfrontier', turn: 40, state: { turn: 40 } }) } });
  env.HF.cur = () => ({ g: { turn: 1 } });
  env.HF.serialize = () => ({ turn: 1 });
  env.fireError('fallo con copia pendiente', 'js/x.js', 1, 1, new Error('x'));
  ok(readDump(env.store).turn === 40, 'no pisa una copia de una sesión anterior');
}

// ------------------------------------------------------ serializador roto
{
  const env = makeEnv();
  env.HF.cur = () => ({ g: { turn: 5 } });
  env.HF.serialize = () => { throw new Error('estado corrupto'); };
  let threw = null;
  try { env.fireError('fallo y serialize roto', 'js/engine.js', 1, 1, new Error('x')); } catch (e) { threw = e; }
  ok(!threw, 'un serialize roto no escapa del interceptor');
  ok(!env.store.has('hex_crash_save'), 'sin estado serializable no escribe copia');
  ok(env.logs.warn.some(a => String(a[0]).includes('HF.serialize')), 'avisa de que no pudo serializar');
}

// ------------------------------------------------------------- cuota llena
{
  const env = makeEnv({ throwOnSet: true });
  env.HF.cur = () => ({ g: { turn: 9 } });
  env.HF.serialize = () => ({ turn: 9 });
  let threw = null;
  try { env.fireError('fallo sin cuota', 'js/engine.js', 1, 1, new Error('x')); } catch (e) { threw = e; }
  ok(!threw, 'una cuota llena no rompe el manejador');
  ok(!env.store.has('hex_crash_save'), 'sin sitio no deja una copia a medias');
  ok(env.logs.warn.some(a => String(a[0]).includes('copia de emergencia')), 'avisa de que no pudo guardar la copia');
}

// --------------------------------------------------- recorte por tamaño
{
  const env = makeEnv();
  env.HF.cur = () => ({ g: { turn: 12 } });
  env.HF.serialize = () => ({ turn: 12, mode: 'skirmish', replayLog: ['x'.repeat(4 * 1024 * 1024)] });
  env.fireError('fallo con repetición enorme', 'js/replay.js', 1, 1, new Error('x'));
  const dump = readDump(env.store);
  ok(!!dump && !!dump.state, 'con una repetición enorme aún guarda el estado');
  ok(dump && dump.state && dump.state.replayLog === undefined, 'recorta replayLog para caber');
  ok(dump && Array.isArray(dump.trimmed) && dump.trimmed.indexOf('replayLog') >= 0, 'deja constancia de lo recortado');
}

// ------------------------------------------------- estado imposible de recortar
{
  const env = makeEnv();
  env.HF.cur = () => ({ g: { turn: 4 } });
  env.HF.serialize = () => ({ turn: 4, blob: 'y'.repeat(4 * 1024 * 1024) });
  env.fireError('fallo con estado gigante', 'js/engine.js', 1, 1, new Error('x'));
  const dump = readDump(env.store);
  ok(!!dump && dump.stateDropped === true && !dump.state, 'si no cabe, guarda metadatos sin estado');
  ok(env.HF.crash.read() && env.HF.crash.read().turn === 4, 'la copia mantiene el turno para el aviso');
  const r = (function () {
    env.HF.deserialize = () => ({ turn: 4 });
    env.HF.startGame = () => { };
    return env.HF.crash.restore();
  })();
  ok(!r.ok, 'restore() rechaza una copia sin estado');

  // Una copia sin estado no bloquea futuros volcados (no es recuperable).
  env.HF.telemetry.dumpGap = 0;
  env.HF.serialize = () => ({ turn: 5, mode: 'skirmish' });
  env.fireError('fallo posterior con estado pequeño', 'js/ai.js', 2, 2, new Error('y'));
  const dump2 = readDump(env.store);
  ok(dump2 && dump2.state && dump2.turn === 5, 'una copia sin estado se reemplaza por una recuperable');
  ok(dump2 && dump2.stateDropped === undefined, 'la copia nueva no arrastra el marcador de recorte');
}

// ------------------------------------------------------------ extensiones
{
  const env = makeEnv();
  env.HF.cur = () => ({ g: { turn: 1 } });
  env.HF.serialize = () => ({ turn: 1 });
  env.fireError('error de extensión', 'chrome-extension://abcdef/inject.js', 1, 1, new Error('ext'));
  ok(env.logs.error.length === 0, 'ignora errores de extensiones del navegador');
  ok(!env.store.has('hex_crash_save'), 'una extensión no genera copia');
}

// ------------------------------------------------------------- deduplicación
{
  const env = makeEnv();
  env.HF.cur = () => null;
  const e = new Error('repetido');
  env.fireError('repetido', 'js/a.js', 1, 1, e);
  env.fireError('repetido', 'js/a.js', 1, 1, e);
  ok(env.HF.telemetry.stats().errors === 1, 'agrupa errores idénticos seguidos');
  ok(env.HF.telemetry.stats().repeats === 1, 'cuenta las repeticiones descartadas');
}

// ---------------------------------------------------------- API de rescate
{
  const env = makeEnv({
    store: { hex_crash_save: JSON.stringify({ v: 1, app: 'hexfrontier', at: '2026-01-01T00:00:00.000Z', turn: 21, state: { turn: 21, mode: 'daily' } }) }
  });
  ok(env.HF.crash.has(), 'la copia está disponible');
  let started = null;
  env.HF.deserialize = o => ({ turn: o.turn, mode: o.mode });
  env.HF.startGame = g => { started = g; };
  const r = env.HF.crash.restore();
  ok(r.ok && r.turn === 21, 'restore() reanuda la partida');
  ok(started && started.turn === 21, 'restore() llama a HF.startGame');
  ok(!env.store.has('hex_crash_save'), 'restore() consume la copia');

  const env2 = makeEnv({ store: { hex_crash_save: JSON.stringify({ v: 1, state: { turn: 1 } }) } });
  env2.HF.deserialize = () => { throw new Error('roto'); };
  env2.HF.startGame = () => { };
  const r2 = env2.HF.crash.restore();
  ok(!r2.ok, 'restore() informa de una copia dañada');
  ok(env2.store.has('hex_crash_save'), 'una copia dañada no se borra (para poder reportarla)');
}

console.log(fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK');
process.exit(fail ? 1 : 0);
