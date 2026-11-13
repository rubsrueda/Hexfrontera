/* Telemetría de errores en runtime y guardado de emergencia.

   Se carga como un script global más (después de util.js y antes de todo lo
   demás) para interceptar también los fallos de arranque de los demás módulos.
   No usa módulos ES ni bundlers.

   Qué hace:
   - Intercepta `window.onerror` y `unhandledrejection` y registra metadatos
     estructurados en consola (mensaje, origen, línea, columna y stack).
   - Si hay una partida activa (window.gameEngine / HF.cur()), serializa el
     estado y lo vuelca en localStorage["hex_crash_save"] para que el Hub pueda
     ofrecer su recuperación (HF.crash.restore()).
   - Nunca lanza: cualquier fallo del propio interceptor se ignora.

   Claves de diseño:
   - Un volcado por sesión y nunca se pisa uno pendiente de recuperar.
   - El estado se recorta (fuera replayLog) y se limita a 3,5 MB para no
     consumir la cuota de localStorage que necesitan los guardados normales.
   - El handler devuelve false: el error sigue siendo visible en la consola del
     navegador; no lo silenciamos.
*/
(function (G) {
  const HF = G.HF = G.HF || {};
  if (HF.telemetry && HF.telemetry.installed) return;

  const APP = 'hexfrontier';
  const CRASH_KEY = 'hex_crash_save';
  const MAX_RAW = 3.5 * 1024 * 1024;     // techo del volcado (cuota compartida)
  const MAX_RECENT = 25;
  const MAX_MESSAGE = 500;
  const MAX_STACK = 4000;
  const DUMP_GAP = 8000;                 // ms mínimos entre volcados
  const DEDUPE_MS = 4000;                // errores idénticos seguidos

  const recent = [];
  let installed = false;
  let dumping = false;
  let lastDump = 0;
  let dumpCount = 0;
  let lastKey = '';
  let lastAt = 0;
  let skipped = 0;

  const now = () => Date.now();
  const clip = (v, n) => {
    const s = v == null ? '' : String(v);
    return s.length > n ? s.slice(0, n) + '…' : s;
  };

  function hasLocalStorage() {
    // Solo comprueba disponibilidad; la cuota se gestiona en el try/catch del
    // volcado (probar con un setItem en cada error sería un desperdicio).
    try { return !!G.localStorage; } catch (e) { return false; }
  }

  const hasDumpAtBoot = (() => {
    try { return !!G.localStorage && G.localStorage.getItem(CRASH_KEY) != null; }
    catch (e) { return false; }
  })();

  // ---------------------------------------------------------------- metadatos
  function describe(raw) {
    const err = raw && raw.error;
    let message = raw && raw.message;
    let stack = '';
    if (err && typeof err === 'object') {
      if (!message) message = err.message;
      if (err.stack) stack = err.stack;
      if (!message && err.name) message = err.name;
    }
    if (!message && typeof raw.error === 'string') message = raw.error;
    if (!message) message = 'Error desconocido';
    return { message: clip(message, MAX_MESSAGE), stack: clip(stack, MAX_STACK) };
  }

  function activeGame() {
    // Lectura barata: no serializa. Solo para enriquecer el log.
    try {
      const ge = G.gameEngine;
      if (ge && ge.state) return ge.state;
    } catch (e) { }
    try {
      if (HF.cur) { const c = HF.cur(); if (c && c.g) return c.g; }
    } catch (e) { }
    return null;
  }

  function normalize(raw) {
    const d = describe(raw);
    const game = activeGame();
    return {
      v: 1,
      app: APP,
      kind: raw.kind || 'error',
      at: new Date().toISOString(),
      ts: now(),
      message: d.message,
      source: raw.source ? clip(raw.source, 300) : null,
      line: raw.line || 0,
      column: raw.column || 0,
      stack: d.stack,
      name: (raw.error && raw.error.name) || null,
      screen: HF.currentScreen || null,
      turn: game ? game.turn : null,
      url: (G.location && G.location.href) || null,
      ua: (G.navigator && G.navigator.userAgent) || null
    };
  }

  function isExtensionUrl(src) {
    return /^(chrome|moz|safari|ms-browser|safari-web)-extension:\/\//i.test(String(src || ''));
  }

  function remember(ev) {
    const key = ev.kind + '|' + ev.message + '|' + ev.source + '|' + ev.line;
    if (key === lastKey && ev.ts - lastAt < DEDUPE_MS) {
      skipped++;
      const last = recent[recent.length - 1];
      if (last) last.repeats = (last.repeats || 1) + 1;
      return false;
    }
    lastKey = key; lastAt = ev.ts;
    recent.push(ev);
    while (recent.length > MAX_RECENT) recent.shift();
    return true;
  }

  // ------------------------------------------------------------- serialización
  function engineState() {
    // 1) Contrato global explícito: window.gameEngine con método de serialización.
    const ge = G.gameEngine;
    if (ge) {
      try {
        if (typeof ge.serialize === 'function') return { source: 'window.gameEngine.serialize', state: ge.serialize() };
        if (typeof ge.getState === 'function') return { source: 'window.gameEngine.getState', state: ge.getState() };
        if (typeof ge.toJSON === 'function') return { source: 'window.gameEngine.toJSON', state: ge.toJSON() };
        if (ge.state && typeof ge.state === 'object') return { source: 'window.gameEngine.state', state: ge.state };
      } catch (e) { console.warn('[telemetry] gameEngine no pudo serializar', e); }
    }
    // 2) Motor real de Hexfrontier (HF.serialize documentado en engine.js).
    try {
      if (HF.cur && typeof HF.serialize === 'function') {
        const c = HF.cur();
        if (c && c.g && !c.g.over) return { source: 'HF.cur+HF.serialize', state: HF.serialize(c.g) };
      }
    } catch (e) { console.warn('[telemetry] HF.serialize falló', e); }
    return null;
  }

  function strip(state, keys) {
    const out = {};
    for (const k of Object.keys(state)) if (keys.indexOf(k) < 0) out[k] = state[k];
    return out;
  }

  // El estado cabe casi siempre; si no, se recorta por capas hasta el límite.
  function fit(payload) {
    let raw = JSON.stringify(payload);
    if (raw.length <= MAX_RAW) return raw;
    if (payload.state) {
      payload.state = strip(payload.state, ['replayLog', 'undo', 'events', 'timeline']);
      payload.trimmed = ['replayLog', 'undo', 'events', 'timeline'];
      raw = JSON.stringify(payload);
    }
    if (raw.length <= MAX_RAW) return raw;
    payload.state = null;
    payload.stateDropped = true;
    return JSON.stringify(payload);
  }

  function storeDump(ev) {
    if (dumping) return false;
    // Un único volcado pendiente: nunca se pisa la copia que el usuario aún no
    // ha recuperado (si la recupera, la clave se borra y vuelve a haber margen).
    // Una copia sin estado (demasiado grande) no es recuperable: se puede
    // reemplazar para no bloquear futuros volcados.
    const pending = readCrash();
    if (pending && pending.state) return false;
    if (!hasLocalStorage()) return false;
    const gap = HF.telemetry && HF.telemetry.dumpGap != null ? HF.telemetry.dumpGap : DUMP_GAP;
    if (now() - lastDump < gap) return false;
    dumping = true;
    try {
      const snap = engineState();
      if (!snap || !snap.state) return false;          // sin partida no hay nada que salvar
      const payload = Object.assign({}, ev, {
        stateSource: snap.source,
        turn: snap.state.turn != null ? snap.state.turn : ev.turn,
        mode: snap.state.mode || null,
        screen: HF.currentScreen || ev.screen,
        state: snap.state
      });
      const raw = fit(payload);
      G.localStorage.setItem(CRASH_KEY, raw);
      dumpCount++;
      lastDump = now();
      console.warn('[telemetry] copia de emergencia guardada en localStorage["' + CRASH_KEY + '"] (' +
        Math.round(raw.length / 1024) + ' KB, turno ' + payload.turn + ')');
      return true;
    } catch (e) {
      console.warn('[telemetry] no se pudo guardar la copia de emergencia', e && e.message);
      return false;
    } finally {
      dumping = false;
    }
  }

  // Reenvío opcional: HF.telemetry.endpoint = 'https://...' (desactivado por defecto).
  function forward(ev) {
    const url = HF.telemetry && HF.telemetry.endpoint;
    if (!url) return;
    try {
      const body = JSON.stringify(Object.assign({}, ev, { state: undefined }));
      if (G.navigator && G.navigator.sendBeacon) G.navigator.sendBeacon(url, body);
      else if (typeof G.fetch === 'function') G.fetch(url, {
        method: 'POST', body: body, keepalive: true, headers: { 'content-type': 'application/json' }
      }).catch(function () { });
    } catch (e) { /* la telemetría nunca rompe el juego */ }
  }

  // ----------------------------------------------------------------- handlers
  function handle(raw) {
    try {
      if (raw && isExtensionUrl(raw.source)) return;
      const ev = normalize(raw || {});
      const tracked = remember(ev);
      console.error('[telemetry] ' + ev.kind + ' no controlado: ' + ev.message, {
        message: ev.message,
        source: ev.source,
        line: ev.line,
        column: ev.column,
        stack: ev.stack,
        turn: ev.turn,
        screen: ev.screen,
        at: ev.at
      });
      if (tracked) storeDump(ev);
      forward(ev);
    } catch (e) {
      // Jamás relanzar desde el interceptor.
      try { console.warn('[telemetry] fallo del interceptor', e && e.message); } catch (e2) { }
    }
  }

  function onRejection(e) {
    try {
      const reason = e && e.reason;
      if (reason && typeof reason === 'object') {
        handle({ kind: 'rejection', message: reason.message, stack: '', source: null, line: 0, column: 0, error: reason });
      } else {
        handle({ kind: 'rejection', message: reason == null ? 'Promesa rechazada' : String(reason), source: null, line: 0, column: 0, error: null });
      }
    } catch (err) { }
  }

  function install() {
    if (installed) return HF.telemetry;
    installed = true;
    const previous = G.onerror;
    G.onerror = function (message, source, line, column, error) {
      try { handle({ kind: 'error', message: message, source: source, line: line, column: column, error: error }); }
      catch (e) { }
      if (typeof previous === 'function') {
        try { return previous.apply(this, arguments); } catch (e) { }
      }
      return false;   // no suprimir el error
    };
    if (G.addEventListener) {
      try { G.addEventListener('unhandledrejection', onRejection); } catch (e) { }
    }
    return HF.telemetry;
  }

  // ------------------------------------------------------------ API de rescate
  function readCrash() {
    try {
      const raw = G.localStorage && G.localStorage.getItem(CRASH_KEY);
      if (!raw) return null;
      const doc = JSON.parse(raw);
      if (!doc || typeof doc !== 'object') return null;
      return doc;
    } catch (e) { return null; }
  }

  function clearCrash() {
    try { if (G.localStorage) G.localStorage.removeItem(CRASH_KEY); return true; }
    catch (e) { return false; }
  }

  function restoreCrash() {
    const doc = readCrash();
    if (!doc || !doc.state) return { ok: false, msg: 'No hay una copia de emergencia válida' };
    if (typeof HF.deserialize !== 'function' || typeof HF.startGame !== 'function') {
      return { ok: false, msg: 'El motor aún no está listo' };
    }
    let game;
    try {
      game = HF.deserialize(doc.state);
    } catch (e) {
      console.error('[telemetry] no se pudo deserializar la copia', e);
      return { ok: false, msg: 'La copia de emergencia está dañada' };
    }
    try {
      HF.startGame(game);
    } catch (e) {
      console.error('[telemetry] no se pudo reanudar la copia', e);
      return { ok: false, msg: 'La copia no se pudo abrir' };
    }
    clearCrash();
    return { ok: true, turn: game.turn };
  }

  HF.telemetry = {
    installed: false,
    endpoint: null,                     // opcional: URL para reenviar errores
    dumpGap: DUMP_GAP,                  // ms mínimos entre volcados automáticos
    KEY: CRASH_KEY,
    install,
    recent: (n) => recent.slice(-(n || recent.length)),
    clear: () => { recent.length = 0; lastKey = ''; lastAt = 0; skipped = 0; },
    stats: () => ({ errors: recent.length, repeats: skipped, dumps: dumpCount, hasDump: !!readCrash(), hasDumpAtBoot }),
    report: () => JSON.stringify({
      app: APP,
      at: new Date().toISOString(),
      url: (G.location && G.location.href) || null,
      ua: (G.navigator && G.navigator.userAgent) || null,
      errors: recent,
      crash: (() => { const d = readCrash(); return d ? { at: d.at, turn: d.turn, message: d.message, hasState: !!d.state } : null; })()
    }, null, 2),
    // Ganchos para el arranque (main.js los vuelve a llamar: son idempotentes).
    handle,
    dump: () => { const ev = normalize({ message: 'Volcado manual' }); return storeDump(ev); }
  };
  HF.telemetry.installed = true;

  HF.crash = {
    key: CRASH_KEY,
    has: () => !!readCrash(),
    read: readCrash,
    clear: clearCrash,
    restore: restoreCrash
  };

  install();
})(typeof window !== 'undefined' ? window : globalThis);
