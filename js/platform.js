/* Puente de plataforma de Hexfrontier (web · Electron/Steam · Capacitor).

   Este módulo es OPCIONAL: en web no hace nada salvo escuchar el ciclo de vida.
   Se carga justo después de util.js para que el resto de módulos ya vean el
   almacén definitivo.

   Qué resuelve:
   1. Escritorio: sustituye HF.store por un backend que lee de forma síncrona
      desde `app.getPath('userData')` a través del puente `window.HFNative`
      (preload + IPC). La caché en memoria evita un round-trip por lectura y
      las escrituras se agrupan y se vacían con `flushSync()` antes de cerrar.
   2. Móvil: localStorage sigue siendo la fuente (síncrona), pero cada clave se
      replica en Filesystem (LIBRARY/saves) para sobrevivir a una limpieza del
      WebView; al arrancar se restauran las claves ausentes antes del Hub.
   3. Resiliencia: pausa/reanuda el bucle de render (HF.pauseBoards), la música
      (HF.bgm.suspend/resume) y los diálogos (HF.banter.pause/resume), y guarda
      la partida antes de que el sistema suspenda o mate el proceso.

   Contrato del puente (preload de Electron):
     HFNative.store.get(key)         -> string | null   (síncrono, sendSync)
     HFNative.store.setMany(entries) -> Promise
     HFNative.store.flushSync(entries) -> void          (síncrono, sendSync)
     HFNative.onBeforeQuit(cb)       -> void            (cb antes de cerrar)
*/
(function (G) {
  const HF = G.HF;
  if (!HF) return;

  const doc = (G.document && typeof G.document.addEventListener === 'function') ? G.document : null;
  const win = (typeof G.addEventListener === 'function') ? G : null;
  const NA = G.HFNative || null;                 // puente Electron
  const CAP = G.Capacitor || null;               // puente Capacitor
  const plugins = (CAP && CAP.Plugins) || {};
  const FS = plugins.Filesystem || null;
  const isElectron = !!(NA && NA.store);
  const isCapacitor = !!(CAP && ((CAP.isNativePlatform && CAP.isNativePlatform()) ||
    (CAP.getPlatform && CAP.getPlatform() !== 'web')));
  const isMobile = isCapacitor;
  const LOCAL_PREFIX = 'hf_';

  let storeFlush = null;        // vaciado síncrono (Electron)
  let storeFlushAsync = null;   // vaciado diferido (móvil)
  let restoredKeys = 0;

  // ---------------------------------------------------------------------------
  // 1. Escritorio: almacén nativo en userData
  // ---------------------------------------------------------------------------
  function installElectronStore(bridge) {
    const cache = new Map();
    const dirty = new Map();
    let timer = 0, warned = false;

    const read = key => {
      if (cache.has(key)) return cache.get(key);
      let v = null;
      try { v = bridge.get(key); } catch (e) { v = null; }
      if (typeof v !== 'string') v = null;
      cache.set(key, v);
      return v;
    };
    const drain = () => {
      const batch = [];
      for (const e of dirty) batch.push(e);
      dirty.clear();
      return batch;
    };
    const queue = (key, value) => {
      dirty.set(key, value);
      if (!timer) timer = G.setTimeout(write, 320);
    };
    function write() {
      if (timer) { G.clearTimeout(timer); timer = 0; }
      const batch = drain();
      if (!batch.length) return;
      Promise.resolve()
        .then(() => bridge.setMany(batch))
        .catch(err => {
          if (!warned) { warned = true; console.warn('[store] no se pudo escribir en userData', err); }
        });
    }
    function flushSync() {
      if (timer) { G.clearTimeout(timer); timer = 0; }
      const batch = drain();
      if (!batch.length) return;
      try { bridge.flushSync(batch); }
      catch (e) { console.error('[store] flushSync', e); }
    }
    // Un solo traspaso de los datos del navegador/versiones antiguas. Las
    // claves nativas existentes nunca se pisan.
    function migrate() {
      let moved = 0;
      try {
        if (bridge.get('platform_migrated') != null) return 0;
        const ls = G.localStorage;
        if (ls && ls.length) {
          const batch = [];
          for (let i = 0; i < ls.length; i++) {
            const full = ls.key(i);
            if (!full || full.slice(0, LOCAL_PREFIX.length) !== LOCAL_PREFIX) continue;
            const key = full.slice(LOCAL_PREFIX.length);
            if (bridge.get(key) != null) continue;
            const val = ls.getItem(full);
            if (val == null) continue;
            cache.set(key, val);
            batch.push([key, val]);
            moved++;
          }
          if (batch.length) bridge.flushSync(batch);
        }
      } catch (e) { console.warn('[store] migración desde localStorage', e); }
      cache.set('platform_migrated', '1');
      try { bridge.flushSync([['platform_migrated', '1']]); } catch (e) { }
      return moved;
    }

    const api = {
      get(key, def) {
        try { const v = read(key); return v == null ? def : JSON.parse(v); }
        catch (e) { return def; }
      },
      set(key, obj) {
        let raw;
        try { raw = JSON.stringify(obj); } catch (e) { return false; }
        cache.set(key, raw);
        queue(key, raw);
        return true;
      },
      del(key) { cache.set(key, null); queue(key, null); },
      has(key) { return read(key) != null; },
      // El proceso principal escribe `<clave>.json.tmp` y renombra: ya es atómico.
      atomicSave(key, obj) { return this.set(key, obj); },
      // El principal repara los `.tmp` huérfanos al arrancar.
      recover() { },
      // Diagnóstico
      flush: write,
      _cache: cache
    };
    migrate();
    storeFlush = flushSync;
    storeFlushAsync = write;
    return api;
  }

  if (isElectron) {
    try { HF.store = installElectronStore(NA.store); }
    catch (e) { console.error('[platform] no se pudo montar el almacén nativo', e); }
  }

  // ---------------------------------------------------------------------------
  // 2. Móvil: espejo de localStorage en Filesystem
  // ---------------------------------------------------------------------------
  function installMobileMirror(filesystem) {
    const DIR = 'LIBRARY';
    const FOLDER = 'saves';
    const pathOf = key => FOLDER + '/hf_' + key + '.json';
    const pending = new Map();
    let timer = 0;

    function flush() {
      if (!pending.size) return Promise.resolve();
      const jobs = [];
      for (const e of pending) {
        const key = e[0], value = e[1];
        pending.delete(key);
        jobs.push(value == null
          ? Promise.resolve(filesystem.deleteFile({ path: pathOf(key), directory: DIR })).catch(() => { })
          : Promise.resolve(filesystem.writeFile({ path: pathOf(key), data: value, directory: DIR, encoding: 'utf8' })).catch(() => { }));
      }
      return Promise.all(jobs);
    }
    function queue(key, value) {
      pending.set(key, value);
      if (!timer) timer = G.setTimeout(() => { timer = 0; flush(); }, 1200);
    }
    function schedule(key) {
      let raw = null;
      try { raw = G.localStorage.getItem(LOCAL_PREFIX + key); } catch (e) { }
      queue(key, raw);
    }
    // Envuelve el almacén síncrono: localStorage sigue escribiendo y el espejo
    // se actualiza por detrás.
    const store = HF.store;
    const set0 = store.set.bind(store), del0 = store.del.bind(store);
    store.set = function (key, obj) {
      const ok = set0(key, obj);
      if (ok) schedule(key);
      return ok;
    };
    store.del = function (key) {
      del0(key);
      queue(key, null);
    };
    storeFlushAsync = () => { if (timer) { G.clearTimeout(timer); timer = 0; } flush(); };

    function mkdir() {
      if (!filesystem.mkdir) return Promise.resolve();
      return Promise.resolve(filesystem.mkdir({ path: FOLDER, directory: DIR, recursive: true })).catch(() => { });
    }
    // Restaura solo las claves que falten: localStorage siempre manda.
    function restore() {
      return mkdir().then(() => filesystem.readdir({ path: FOLDER, directory: DIR })).then(res => {
        const files = (res && res.files) || [];
        const jobs = [];
        for (const name of files) {
          if (!/^hf_.+\.json$/.test(name)) continue;
          const key = name.slice(3, -5);
          if (HF.store.has(key)) continue;
          jobs.push(Promise.resolve(filesystem.readFile({ path: FOLDER + '/' + name, directory: DIR, encoding: 'utf8' }))
            .then(r => {
              if (!r || typeof r.data !== 'string') return;
              HF.store.set(key, JSON.parse(r.data));
              restoredKeys++;
            })
            .catch(() => { }));
        }
        return Promise.all(jobs);
      }).catch(() => { /* primera ejecución: aún no hay carpeta */ });
    }
    return restore;
  }

  let mobileRestore = null;
  if (isMobile && FS) {
    try { mobileRestore = installMobileMirror(FS); }
    catch (e) { console.error('[platform] espejo móvil deshabilitado', e); }
  }

  // ---------------------------------------------------------------------------
  // 3. Ciclo de vida y guardado de emergencia
  // ---------------------------------------------------------------------------
  const SAVE_GAP = 450;                    // ms entre guardados por eventos
  let paused = false, pauseReason = '', lastSave = 0, blurTimer = 0;

  function flushStore() {
    try {
      if (storeFlush) storeFlush();
      else if (storeFlushAsync) storeFlushAsync();
    } catch (e) { console.warn('[platform] flush', e); }
  }

  // force = true salta el antirrebote: se usa al cerrar/suspender, donde perder
  // el guardado por llegar 100 ms después de otro sería justo el fallo a evitar.
  function saveNow(reason, force) {
    const now = Date.now();
    if (!force && now - lastSave < SAVE_GAP) return false;
    lastSave = now;
    // game.js expone aquí su save(): serializa la partida y vacía la repetición.
    try { if (HF.requestSave) HF.requestSave(); } catch (e) { console.warn('[platform] save', e); }
    flushStore();
    HF.platform.lastSaveAt = now;
    HF.platform.lastSaveReason = reason || '';
    return true;
  }

  function pause(reason) {
    if (paused) return;
    paused = true; pauseReason = reason || '';
    HF.runtimePaused = true;
    try { HF.pauseBoards && HF.pauseBoards(); } catch (e) { }
    try { HF.bgm && HF.bgm.suspend && HF.bgm.suspend(); } catch (e) { }
    try { HF.banter && HF.banter.pause && HF.banter.pause(); } catch (e) { }
    saveNow(reason);
    if (doc && doc.body && doc.body.classList) doc.body.classList.add('hf-paused');
    HF.platform.paused = true;
    HF.platform.pauseReason = pauseReason;
  }

  function resume(reason) {
    if (!paused) return;
    paused = false; pauseReason = '';
    HF.runtimePaused = false;
    try { HF.resumeBoards && HF.resumeBoards(); } catch (e) { }
    try { HF.bgm && HF.bgm.resume && HF.bgm.resume(); } catch (e) { }
    try { HF.banter && HF.banter.resume && HF.banter.resume(); } catch (e) { }
    if (doc && doc.body && doc.body.classList) doc.body.classList.remove('hf-paused');
    HF.platform.paused = false;
    HF.platform.pauseReason = '';
    HF.platform.lastResumeReason = reason || '';
  }

  function hydrate() {
    // Recalcula el tamaño del canvas tras rotar u ocupar la pantalla completa:
    // el WebView móvil no siempre dispara `resize` al cambiar de orientación.
    try {
      const cur = HF.cur && HF.cur();
      const board = cur && cur.board;
      if (board && board.resize) board.resize();
      else if (board && board.fit) board.fit();
      if (board && board.draw) board.draw();
    } catch (e) { }
  }

  // --- DOM / Page Lifecycle ---
  // `win` puede no existir en entornos sin DOM (pruebas, workers).
  if (doc && win) {
    doc.addEventListener('visibilitychange', () => {
      if (doc.visibilityState === 'hidden') pause('visibility');
      else resume('visibility');
    });
    // Un modal del sistema o el lanzador pueden robar el foco sin ocultar la
    // pestaña: se pausa con un margen corto para no reaccionar a parpadeos.
    win.addEventListener('blur', () => {
      if (blurTimer) return;
      blurTimer = G.setTimeout(() => { blurTimer = 0; if (doc.visibilityState !== 'hidden') pause('blur'); }, 180);
    });
    win.addEventListener('focus', () => {
      if (blurTimer) { G.clearTimeout(blurTimer); blurTimer = 0; }
      if (doc.visibilityState !== 'hidden') resume('focus');
    });
    win.addEventListener('pagehide', () => saveNow('pagehide', true));
    win.addEventListener('beforeunload', () => saveNow('beforeunload', true));
    win.addEventListener('freeze', () => pause('freeze'));
    win.addEventListener('resume', () => { hydrate(); resume('freeze'); });
    win.addEventListener('orientationchange', () => G.setTimeout(hydrate, 220));
    win.addEventListener('resize', () => G.setTimeout(hydrate, 120));
  }

  // --- Electron: cierre ordenado ---
  if (isElectron) {
    try {
      // El principal espera a este callback antes de destruir la ventana.
      NA.onBeforeQuit(() => {
        HF.runtimePaused = false;
        saveNow('quit', true);
        flushStore();
      });
    } catch (e) { console.warn('[platform] onBeforeQuit', e); }
    try { NA.ready && NA.ready(); } catch (e) { }
  }

  // --- Capacitor: estado de la app y botón atrás ---
  function bindNativeApp() {
    const api = plugins.App;
    if (!api || !api.addListener) return false;
    try {
      api.addListener('appStateChange', s => {
        if (s && s.isActive === false) pause('app-background');
        else if (s && s.isActive) { hydrate(); resume('app-active'); }
      });
      api.addListener('pause', () => pause('app-pause'));
      api.addListener('resume', () => { hydrate(); resume('app-resume'); });
      // Android: sin listener propio, Atrás cierra la app en mitad de la partida.
      api.addListener('backButton', () => {
        const screen = HF.currentScreen || 'hub';
        if (screen === 'game') {
          const menu = doc && doc.getElementById('menu');
          if (menu) { menu.click(); return; }
        }
        if (screen !== 'hub' && HF.go) { HF.go('hub'); return; }
        // En el Hub no se sale: evita cierres accidentales por doble toque.
      });
      return true;
    } catch (e) { return false; }
  }
  if (isMobile) {
    if (!bindNativeApp() && win) win.addEventListener('load', bindNativeApp);
    try {
      const sb = plugins.StatusBar;
      if (sb) {
        if (sb.setStyle) Promise.resolve(sb.setStyle({ style: 'DARK' })).catch(() => { });
        if (sb.setOverlaysWebView) Promise.resolve(sb.setOverlaysWebView({ overlay: false })).catch(() => { });
      }
      const splash = plugins.SplashScreen;
      if (splash && splash.hide && win) win.addEventListener('load', () => { Promise.resolve(splash.hide()).catch(() => { }); });
    } catch (e) { }
  }

  // ---------------------------------------------------------------------------
  // 4. API pública
  // ---------------------------------------------------------------------------
  HF.runtimePaused = false;
  HF.platform = {
    kind: isElectron ? 'electron' : isMobile ? 'capacitor' : 'web',
    native: isElectron || isMobile,
    electron: isElectron,
    mobile: isMobile,
    bridgeVersion: (NA && NA.apiVersion) || (CAP && CAP.version) || 0,
    versions: (NA && NA.versions) || null,
    savePath: (isElectron && NA.store.path) ? NA.store.path() : null,
    paused: false,
    pauseReason: '',
    lastSaveAt: 0,
    lastSaveReason: '',
    lastResumeReason: '',
    restoredKeys: () => restoredKeys,
    pause, resume,    saveNow,
    flushStore,
    hydrate
  };

  // La restauración móvil termina antes de que main.js monte el Hub.
  HF.platform.ready = mobileRestore
    ? Promise.resolve().then(mobileRestore).then(() => ({ restored: restoredKeys }))
    : Promise.resolve({ restored: 0 });

  console.info('[platform] ' + HF.platform.kind +
    (HF.platform.savePath ? ' · guardados en ' + HF.platform.savePath : ''));
})(typeof window !== 'undefined' ? window : globalThis);
