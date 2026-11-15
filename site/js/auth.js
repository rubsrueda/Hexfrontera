/* Gestor de identidad (AuthManager) adaptado a Federati.

   El juego no usa Supabase Auth: la identidad es `player_id` + `secret_key`,
   persistida por `HF.storage` y validada en el servidor con `fn_hf_profile`.
   Este módulo centraliza ese contrato para que el arranque, la vinculación de
   dispositivos y los futuros empaquetados (Steam/Google Play) no dupliquen la
   lógica.

   Reglas:
   - Si hay identidad persistida, SE CONSERVA. Un fallo de red nunca genera una
     identidad nueva.
   - Solo se crea una identidad si no hay ninguna (ni en storage ni en cookie).
   - La validación remota es opcional y no bloquea el arranque: si el servidor
     no responde, `status().error` lo indica y se reintenta en la siguiente
     operación que lo necesite.

   API:
     HF.auth.boot()                 -> Promise<status>; idempotente
     HF.auth.identity()             -> { player_id, secret_key }
     HF.auth.status()               -> { player_id, validated, error, ... }
     HF.auth.validate() / refresh() -> Promise<status>
     HF.auth.onChange(fn)           -> unsubscribe
     HF.auth.registerProvider(name, handler)
     HF.auth.signInWithProvider(name, payload)

   Extensión para Steam/Google: registrar un proveedor que reciba el ticket y
   devuelva { player_id, secret_key } (normalmente desde una Edge Function).
   No se incluye ningún proveedor por defecto para no inventar credenciales.
*/
(function (G) {
  const HF = G.HF;
  if (!HF) return;

  const state = {
    player_id: '',
    secret_key: '',
    validated: false,
    checking: false,
    error: '',
    source: '',
    at: 0
  };
  let bootPromise = null;
  let listeners = [];

  function snapshot() {
    const persistent = HF.storage ? HF.storage.persistent() : false;
    return Object.assign({}, state, {
      persistent,
      backend: HF.storage ? HF.storage.backend() : 'unknown',
      backup: HF.storage ? HF.storage.identityBackup() : false
    });
  }

  function notify() {
    const s = snapshot();
    for (const fn of listeners.slice()) {
      try { fn(s); } catch (e) { console.error('[auth] listener', e); }
    }
  }

  function readIdentity() {
    let id = '';
    let key = '';
    try { id = HF.storage ? HF.storage.get('player_id', null) : HF.store.get('player_id', null); } catch (e) { }
    try { key = HF.storage ? HF.storage.get('secret_key', null) : HF.store.get('secret_key', null); } catch (e) { }

    // Solo si no hay nada persistido se crea una identidad nueva. `playerId`
    // y `secretKey` de cloud.js ya son idempotentes y escriben por HF.storage.
    if (!id && HF.cloud && HF.cloud.playerId) id = HF.cloud.playerId();
    if (!key && HF.cloud && HF.cloud.secretKey) key = HF.cloud.secretKey();

    if (id) { try { HF.storage ? HF.storage.set('player_id', id) : HF.store.set('player_id', id); } catch (e) { } }
    if (key) { try { HF.storage ? HF.storage.set('secret_key', key) : HF.store.set('secret_key', key); } catch (e) { } }
    return { player_id: String(id || ''), secret_key: String(key || '') };
  }

  async function validate() {
    if (state.checking) return snapshot();
    if (!HF.cloud || !HF.cloud.refreshProfile) {
      state.error = 'sin_cliente';
      notify();
      return snapshot();
    }
    state.checking = true;
    notify();
    try {
      const r = await HF.cloud.refreshProfile();
      if (r && r.ok) {
        state.validated = true;
        state.error = '';
        state.at = Date.now();
      } else if (r && r.offline) {
        // Sin conexión no significa credenciales inválidas: se conserva todo.
        state.validated = false;
        state.error = 'sin_conexion';
      } else {
        state.validated = false;
        state.error = 'no_verificado';
      }
    } catch (e) {
      state.validated = false;
      state.error = 'sin_conexion';
    }
    state.checking = false;
    notify();
    return snapshot();
  }

  function boot() {
    if (bootPromise) return bootPromise;
    const id = readIdentity();
    state.player_id = id.player_id;
    state.secret_key = id.secret_key;
    state.source = 'local';
    notify();

    // Registro idempotente en segundo plano: no bloquea el Hub.
    if (HF.cloud && HF.cloud.ensureRegistered) {
      Promise.resolve(HF.cloud.ensureRegistered()).catch(() => { });
    }
    bootPromise = validate().catch(() => snapshot());
    return bootPromise;
  }

  function identity() {
    if (!state.player_id) {
      const id = readIdentity();
      state.player_id = id.player_id;
      state.secret_key = id.secret_key;
    }
    return { player_id: state.player_id, secret_key: state.secret_key };
  }

  function onChange(fn) {
    if (typeof fn !== 'function') return () => { };
    listeners.push(fn);
    return () => { listeners = listeners.filter(f => f !== fn); };
  }

  // -------------------------------------------------------------------------
  // Proveedores externos (Steam, Google Play, etc.)
  // -------------------------------------------------------------------------
  const providers = Object.create(null);

  function registerProvider(name, handler) {
    if (!name || typeof handler !== 'function') return false;
    providers[String(name)] = handler;
    return true;
  }

  async function signInWithProvider(name, payload) {
    const key = String(name || '');
    const handler = providers[key];
    if (!handler) return { ok: false, msg: 'proveedor_no_registrado' };
    try {
      const r = await handler(payload || {});
      if (!r || !r.player_id || !r.secret_key) {
        return { ok: false, msg: 'credenciales_invalidas' };
      }
      if (HF.storage) {
        HF.storage.set('player_id', r.player_id);
        HF.storage.set('secret_key', r.secret_key);
      } else {
        HF.store.set('player_id', r.player_id);
        HF.store.set('secret_key', r.secret_key);
      }
      state.player_id = String(r.player_id);
      state.secret_key = String(r.secret_key);
      state.validated = true;
      state.error = '';
      state.source = 'provider:' + key;
      state.at = Date.now();
      notify();
      return { ok: true, player_id: state.player_id };
    } catch (e) {
      return { ok: false, msg: String((e && e.message) || e || 'proveedor_error') };
    }
  }

  HF.auth = {
    boot,
    identity,
    status: snapshot,
    validate,
    refresh: validate,
    onChange,
    registerProvider,
    signInWithProvider,
    get ready() { return bootPromise || Promise.resolve(snapshot()); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
