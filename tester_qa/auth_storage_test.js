'use strict';
// ---------------------------------------------------------------------------
// Regresión del refactor de sesión:
//   · HF.storage: get/set/remove y respaldo de identidad por cookie
//   · HF.auth: conserva player_id/secret_key, no los regenera al recargar
//   · HF.auth: un fallo de red no invalida la identidad
//   · HF.auth: hook de proveedor externo (Steam/Google)
// No usa red ni navegador real: carga los módulos en un sandbox de VM.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let failures = 0;
function ok(name, cond, detail) {
  if (cond) {
    console.log('ok   ' + name);
  } else {
    failures++;
    console.log('FAIL ' + name + (detail ? ' -> ' + detail : ''));
  }
}

function makeDoc() {
  const jar = new Map();
  const doc = {};
  Object.defineProperty(doc, 'cookie', {
    get() {
      return Array.from(jar.entries()).map(([k, v]) => k + '=' + v).join('; ');
    },
    set(raw) {
      const first = String(raw).split(';')[0] || '';
      const eq = first.indexOf('=');
      if (eq < 0) return;
      const name = first.slice(0, eq).trim();
      const value = first.slice(eq + 1).trim();
      const age = /Max-Age=(\d+)/i.exec(String(raw));
      if (age && Number(age[1]) === 0) jar.delete(name);
      else jar.set(name, value);
    }
  });
  return doc;
}

function makeApp(opts) {
  opts = opts || {};
  const data = new Map();
  const store = {
    get(k, d) { return data.has(k) ? data.get(k) : d; },
    set(k, v) {
      if (opts.storeFails) return false;
      data.set(k, v);
      return true;
    },
    del(k) { data.delete(k); },
    has(k) { return data.has(k); }
  };
  const cloud = {
    playerId() {
      let id = store.get('player_id', null);
      if (!id) { id = opts.newId || 'HF-NEW'; store.set('player_id', id); }
      return id;
    },
    secretKey() {
      let k = store.get('secret_key', null);
      if (!k) { k = opts.newKey || 'K-NEW'; store.set('secret_key', k); }
      return k;
    },
    refreshProfile() {
      const r = typeof opts.refresh === 'function' ? opts.refresh() : opts.refresh;
      return Promise.resolve(r || { ok: true });
    },
    ensureRegistered() { return Promise.resolve({ ok: true }); }
  };
  const sandbox = {
    console,
    Promise,
    setTimeout,
    clearTimeout,
    JSON,
    Date,
    Math,
    encodeURIComponent,
    decodeURIComponent,
    location: { protocol: 'https:' },
    document: makeDoc(),
    HF: { store, platform: { electron: false }, cloud }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join('js', 'storage.js'), 'utf8'), sandbox, { filename: 'storage.js' });
  vm.runInContext(fs.readFileSync(path.join('js', 'auth.js'), 'utf8'), sandbox, { filename: 'auth.js' });
  return sandbox;
}

(async function main() {
  // 1. Fachada de almacenamiento.
  {
    const app = makeApp();
    const S = app.HF.storage;
    ok('storage.set acepta el valor', S.set('demo', { a: 1 }) === true);
    ok('storage.get devuelve el valor', S.get('demo').a === 1);
    ok('storage.has detecta la clave', S.has('demo') === true);
    S.remove('demo');
    ok('storage.remove borra la clave', S.get('demo', null) === null);
  }

  // 2. La identidad se recupera de la cookie si el backend la pierde.
  {
    const app = makeApp();
    const S = app.HF.storage;
    S.set('player_id', 'HF-COOKIE');
    S.set('secret_key', 'K-COOKIE');
    app.HF.store.del('player_id');
    app.HF.store.del('secret_key');
    ok('cookie: player_id sobrevive', S.get('player_id', null) === 'HF-COOKIE');
    ok('cookie: secret_key sobrevive', S.get('secret_key', null) === 'K-COOKIE');
    ok('cookie: identityBackup() lo detecta', S.identityBackup() === true);
  }

  // 3. Boot con identidad existente: se conserva y se valida.
  {
    const app = makeApp({ refresh: { ok: true } });
    app.HF.store.set('player_id', 'HF-OLD');
    app.HF.store.set('secret_key', 'K-OLD');
    const st = await app.HF.auth.boot();
    ok('auth conserva el player_id existente', st.player_id === 'HF-OLD', st.player_id);
    ok('auth conserva la secret_key existente', st.secret_key === 'K-OLD');
    ok('auth marca la identidad como validada', st.validated === true);
    ok('auth no inventa un ID nuevo', app.HF.store.get('player_id', null) === 'HF-OLD');
  }

  // 4. Sin conexión: no se invalida ni se regenera nada.
  {
    const app = makeApp({ refresh: { ok: false, offline: true } });
    app.HF.store.set('player_id', 'HF-OFFLINE');
    app.HF.store.set('secret_key', 'K-OFFLINE');
    const st = await app.HF.auth.boot();
    ok('offline conserva el player_id', st.player_id === 'HF-OFFLINE');
    ok('offline conserva la secret_key', st.secret_key === 'K-OFFLINE');
    ok('offline no valida pero avisa', st.validated === false && st.error === 'sin_conexion', st.error);
  }

  // 5. Sin identidad previa: se crea una sola vez y se persiste.
  {
    const app = makeApp({ newId: 'HF-FRESH', newKey: 'K-FRESH' });
    const st = await app.HF.auth.boot();
    ok('primer arranque crea identidad', st.player_id === 'HF-FRESH', st.player_id);
    ok('la identidad nueva queda persistida', app.HF.store.get('player_id', null) === 'HF-FRESH');
  }

  // 6. Si el backend principal falla, la cookie mantiene la sesión.
  {
    const app = makeApp({ storeFails: true });
    const S = app.HF.storage;
    S.set('player_id', 'HF-FALLBACK');
    S.set('secret_key', 'K-FALLBACK');
    ok('fallback: el set informa del fallo', S.set('otra', 1) === false);
    ok('fallback: la identidad sigue disponible', S.get('player_id', null) === 'HF-FALLBACK');
  }

  // 7. Hook de proveedor externo (Steam/Google): solo guarda credenciales.
  {
    const app = makeApp();
    app.HF.auth.registerProvider('steam', async () => ({ player_id: 'HF-STEAM', secret_key: 'K-STEAM' }));
    const r = await app.HF.auth.signInWithProvider('steam', { ticket: 'abc' });
    ok('proveedor: devuelve ok', r.ok === true, r.msg);
    ok('proveedor: guarda el player_id', app.HF.store.get('player_id', null) === 'HF-STEAM');
    ok('proveedor: guarda la secret_key', app.HF.store.get('secret_key', null) === 'K-STEAM');
    const bad = await app.HF.auth.signInWithProvider('desconocido', {});
    ok('proveedor no registrado se rechaza', bad.ok === false && bad.msg === 'proveedor_no_registrado');
  }

  console.log(failures ? ('\n' + failures + ' FALLOS') : '\nTODO OK');
  if (failures) process.exitCode = 1;
})().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
