'use strict';
// Pruebas del puente de plataforma (js/platform.js):
//  - almacén nativo de Electron (lecturas síncronas, escrituras agrupadas,
//    flush síncrono y migración desde localStorage)
//  - ciclo de vida: pausa/reanudación del motor, audio y diálogos, guardado
//    de emergencia y cierre ordenado
//  - modo web intacto (sin puente)
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const JS = path.join(__dirname, '..', 'js');
let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Espera activa: los temporizadores pueden retrasarse bajo carga (CI).
const waitFor = async (fn, ms) => {
  const t0 = Date.now(), limit = ms || 2000;
  while (Date.now() - t0 < limit) { if (fn()) return true; await sleep(20); }
  return false;
};

function emitter(target) {
  const map = new Map();
  target.addEventListener = (t, f) => { if (!map.has(t)) map.set(t, []); map.get(t).push(f); };
  target.removeEventListener = (t, f) => { const a = map.get(t) || []; const i = a.indexOf(f); if (i >= 0) a.splice(i, 1); };
  target.emit = (t, e) => { for (const f of (map.get(t) || []).slice()) f(e || {}); };
  return target;
}

function localStorageStub(seed) {
  const m = new Map(Object.entries(seed || {}));
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: k => { m.delete(k); },
    key: i => Array.from(m.keys())[i] || null,
    get length() { return m.size; },
    _map: m
  };
}

// Emula el renderer: window === sandbox, con document y localStorage mínimos.
function makeWindow(opts) {
  const sandbox = {};
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.console = console;
  sandbox.setTimeout = setTimeout;
  sandbox.clearTimeout = clearTimeout;
  sandbox.Promise = Promise;
  sandbox.Date = Date;
  sandbox.Math = Math;
  sandbox.JSON = JSON;
  sandbox.performance = { now: () => Date.now() };
  sandbox.navigator = { onLine: false };
  sandbox.localStorage = localStorageStub(opts && opts.ls);
  emitter(sandbox);
  const doc = emitter({
    visibilityState: 'visible',
    hidden: false,
    body: { classList: { add() { }, remove() { }, toggle() { } } },
    getElementById: () => null
  });
  sandbox.document = doc;
  sandbox.HF = {};
  sandbox.HFNative = (opts && opts.native) || undefined;
  sandbox.Capacitor = (opts && opts.capacitor) || undefined;
  return sandbox;
}

function load(ctx, files) {
  vm.createContext(ctx);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(JS, f), 'utf8'), ctx);
}

function fakeNative(seed) {
  const files = new Map(Object.entries(seed || {}));
  const stats = { flushSync: 0, setMany: 0, flushedEntries: 0 };
  return {
    kind: 'electron',
    apiVersion: 1,
    platform: 'win32',
    versions: { electron: '33.0.0', chrome: '130.0.0' },
    store: {
      get: k => (files.has(k) ? files.get(k) : null),
      path: () => 'C:/Users/Test/AppData/Roaming/Hexfrontier/saves',
      setMany: entries => {
        stats.setMany++;
        for (const [k, v] of entries) { if (v == null) files.delete(k); else files.set(k, v); }
        return Promise.resolve(true);
      },
      flushSync: entries => {
        stats.flushSync++;
        for (const [k, v] of entries) { stats.flushedEntries++; if (v == null) files.delete(k); else files.set(k, v); }
        return entries.length;
      },
      keys: () => Array.from(files.keys())
    },
    onBeforeQuit(cb) { this._beforeQuit = cb; },
    ready() { this._ready = true; },
    _files: files,
    _stats: stats
  };
}

(async () => {
  // ---------------------------------------------------------------- Electron
  const native = fakeNative();
  const w = makeWindow({
    native,
    ls: { hf_settings: JSON.stringify({ sound: true, lang: 'es', speed: 1 }), hf_tribe_profile: JSON.stringify({ name: 'Vieja' }) }
  });
  load(w, ['util.js', 'platform.js']);
  const HF = w.HF;

  ok(HF.platform.kind === 'electron', 'detecta el contenedor Electron');
  ok(HF.platform.savePath === 'C:/Users/Test/AppData/Roaming/Hexfrontier/saves', 'expone la ruta de guardado nativa');
  ok(!!native._ready, 'avisa al principal de que el renderer está listo');

  // Migración única desde localStorage (sin pisar nada nativo).
  ok(HF.store.get('settings').lang === 'es', 'migra los datos del navegador la primera vez');
  ok(native._files.has('platform_migrated'), 'marca la migración como hecha');
  ok(native._files.get('settings') === JSON.stringify({ sound: true, lang: 'es', speed: 1 }), 'la migración conserva el JSON exacto');

  // Round-trip y agrupación de escrituras.
  const flush0 = native._stats.flushSync;
  HF.store.set('savegame_active', { turn: 7, cells: [{ i: 1 }] });
  HF.store.set('maps', [{ name: 'Campaña' }]);
  ok(HF.store.get('savegame_active').turn === 7, 'lee en el mismo tick lo recién escrito (caché)');
  ok(native._stats.flushSync === flush0, 'las escrituras quedan en cola hasta el flush');
  ok(!native._files.has('savegame_active'), 'antes del flush aún no hay archivo');
  HF.platform.flushStore();
  ok(native._stats.flushSync === flush0 + 1, 'un solo flush agrupa todas las claves sucias');
  ok(native._files.has('savegame_active') && native._files.has('maps'), 'el flush escribe todas las claves sucias');
  ok(JSON.parse(native._files.get('savegame_active')).turn === 7, 'el archivo contiene el estado serializado');

  // Borrado.
  HF.store.del('maps');
  HF.platform.flushStore();
  ok(!native._files.has('maps'), 'del() elimina el archivo tras el flush');

  // atomicSave no crea claves temporales (el principal renombra).
  HF.store.atomicSave('savegame_active', { turn: 8 });
  HF.platform.flushStore();
  ok(!Array.from(native._files.keys()).some(k => k.endsWith('_tmp')), 'atomicSave no deja claves _tmp en el backend');

  // -------------------------------------------------------- ciclo de vida
  let saves = 0, pausedBoards = 0, resumedBoards = 0;
  const audio = { suspended: 0, resumed: 0 }, banter = { paused: 0, resumed: 0 };
  HF.requestSave = () => { saves++; };
  HF.pauseBoards = () => { pausedBoards++; };
  HF.resumeBoards = () => { resumedBoards++; };
  HF.bgm = { suspend: () => { audio.suspended++; }, resume: () => { audio.resumed++; } };
  HF.banter = { pause: () => { banter.paused++; }, resume: () => { banter.resumed++; } };

  w.document.visibilityState = 'hidden';
  w.document.emit('visibilitychange');
  ok(HF.runtimePaused === true, 'ocultar la pestaña pausa el motor');
  ok(HF.platform.paused === true && HF.platform.pauseReason === 'visibility', 'registra el motivo de la pausa');
  ok(pausedBoards === 1, 'pausa los tableros vivos');
  ok(audio.suspended === 1, 'silencia la música');
  ok(banter.paused === 1, 'detiene los diálogos ambientales');
  ok(saves === 1, 'guarda la partida al pasar a segundo plano');

  w.document.visibilityState = 'visible';
  w.document.emit('visibilitychange');
  ok(HF.runtimePaused === false, 'volver al frente reanuda el motor');
  ok(resumedBoards === 1 && audio.resumed === 1 && banter.resumed === 1, 'reanuda tableros, música y diálogos');

  // Sin pausar dos veces.
  w.document.visibilityState = 'hidden';
  w.document.emit('visibilitychange');
  w.document.emit('visibilitychange');
  ok(pausedBoards === 2, 'la pausa es idempotente');
  w.document.visibilityState = 'visible';
  w.document.emit('visibilitychange');

  // blur / focus: pausa diferida que se cancela si el foco vuelve rápido.
  w.emit('blur');
  w.emit('focus');
  await sleep(300);
  ok(HF.platform.paused === false, 'un blur fugaz no pausa el juego');
  w.emit('blur');
  // El temporizador interno (180 ms) puede retrasarse si la máquina está
  // cargada: se espera a que ocurra en vez de asumir un instante exacto.
  ok(await waitFor(() => HF.platform.paused === true), 'perder el foco pausa el juego');
  w.emit('focus');
  ok(HF.platform.paused === false, 'recuperar el foco lo reanuda');

  // Guardado de emergencia al salir de la página (forzado: no lo frena el
  // antirrebote de 450 ms que protege a `pause`).
  const savesBeforeUnload = saves;
  const flushBefore = native._stats.flushSync;
  HF.store.set('settings', { sound: false });
  w.emit('beforeunload');
  ok(saves === savesBeforeUnload + 1, 'beforeunload guarda la partida');
  ok(native._stats.flushSync > flushBefore, 'beforeunload vacía el almacén al disco');

  // Cierre ordenado desde el proceso principal.
  const savesBefore = saves;
  native._beforeQuit();
  ok(saves === savesBefore + 1, 'el cierre de Electron guarda antes de destruir la ventana');
  ok(HF.store.get('settings').sound === false, 'el último estado escrito sobrevive al cierre');

  // ------------------------------------------------------------------- Web
  const web = makeWindow({ ls: {} });
  load(web, ['util.js', 'platform.js']);
  const webStore = web.HF.store;
  ok(web.HF.platform.kind === 'web', 'sin puente se declara modo web');
  ok(typeof webStore.get === 'function' && webStore === web.HF.store, 'el almacén local sigue siendo el de util.js');
  ok(web.HF.runtimePaused === false, 'el flag de pausa existe también en web');
  const readyRes = await web.HF.platform.ready;
  ok(readyRes && readyRes.restored === 0, 'ready resuelve inmediatamente en web');
  web.HF.platform.pause('test');
  ok(web.HF.runtimePaused === true && web.HF.platform.paused === true, 'la pausa funciona sin puente nativo');
  web.HF.platform.resume('test');
  ok(web.HF.runtimePaused === false, 'la reanudación funciona sin puente nativo');

  console.log(fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK');
  process.exit(fail ? 1 : 0);
})();
