'use strict';
// Integración del Hub con la copia de emergencia: si js/telemetry.js dejó
// localStorage["hex_crash_save"], el Hub ofrece restaurarla.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeDom() {
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
    body: { style: {}, appendChild() { }, classList: { add() { }, remove() { }, toggle() { } } },
    visibilityState: 'visible', hidden: false
  };
  return { el, doc };
}

function renderHub(crashDoc) {
  const { el, doc } = makeDom();
  const store = new Map();
  if (crashDoc) store.set('hex_crash_save', JSON.stringify(crashDoc));
  const listeners = Object.create(null);
  const sandbox = {
    HF: {},
    console: { error() { }, warn() { }, log() { }, info() { } },
    document: doc, window: null,
    navigator: { onLine: false, language: 'es', userAgent: 'crash-hub-test' },
    location: { href: 'http://localhost/', protocol: 'http:', hash: '' },
    localStorage: {
      getItem: k => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: k => store.delete(k),
      key: i => Array.from(store.keys())[i] || null,
      get length() { return store.size; }
    },
    setTimeout, clearTimeout, setInterval, clearInterval,
    Promise, Date, Math, JSON,
    performance: { now: () => Date.now() },
    addEventListener: (t, f) => { (listeners[t] || (listeners[t] = [])).push(f); },
    removeEventListener() { }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const f of ['util.js', 'telemetry.js', 'config.js', 'data.js', 'i18n.js', 'names.js', 'cloud.js', 'progress.js', 'screens.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox);
  sandbox.HF.go('hub');
  return { html: el.innerHTML, HF: sandbox.HF, sandbox, store };
}

let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };

// --- 1. Sin copia de emergencia no hay banner ---
{
  const r = renderHub(null);
  ok(!r.html.includes('crashCard'), 'sin copia no aparece el aviso de rescate');
  ok(!r.html.includes('crashGo'), 'sin copia no hay botón de restaurar');
}

// --- 2. Con copia de emergencia el Hub ofrece restaurarla ---
{
  const r = renderHub({
    v: 1, app: 'hexfrontier', kind: 'error',
    at: '2026-11-03T12:00:00.000Z', turn: 33, mode: 'skirmish',
    message: 'boom', state: { turn: 33, mode: 'skirmish', cells: [] }
  });
  ok(!!r.HF.crash && r.HF.crash.has(), 'telemetry deja disponible HF.crash en el Hub');
  ok(r.html.includes('crashCard'), 'el Hub pinta el aviso de partida recuperable');
  ok(r.html.includes('Partida recuperable'), 'el aviso se explica en texto');
  ok(r.html.includes('T33'), 'el aviso muestra el turno de la copia');
  ok(r.html.includes('id="crashGo"') && r.html.includes('id="crashNo"'), 'el aviso ofrece restaurar y descartar');
}

console.log(fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK');
process.exit(fail ? 1 : 0);
