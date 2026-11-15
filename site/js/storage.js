/* Almacenamiento de la aplicación (web · Electron/Steam · Capacitor).

   `HF.store` (js/util.js) es el backend real; js/platform.js lo sustituye por
   userData en Electron y lo replica en Filesystem en móvil. Este módulo añade
   una fachada estable para el resto del código y resuelve el caso que rompía la
   sesión al pulsar F5: cuando localStorage no está disponible o está lleno,
   `HF.store` cae a memoria y `player_id`/`secret_key` se regeneraban.

   Solución: las dos claves de identidad se replican en una cookie de primera
   parte (pequeñas, < 512 bytes). La cookie sobrevive a la recarga aunque
   localStorage esté bloqueado, y se restaura a `HF.store` al leerla.

   API:
     HF.storage.get(key, default)
     HF.storage.set(key, value)      -> true si el backend principal aceptó
     HF.storage.remove(key)
     HF.storage.has(key)
     HF.storage.persistent()         -> ¿el backend principal sobrevive al cierre?
     HF.storage.backend()            -> 'electron' | 'localStorage' | 'memory'
     HF.storage.identityBackup()     -> ¿hay respaldo de identidad por cookie?
*/
(function (G) {
  const HF = G.HF;
  if (!HF) return;

  const MIRROR = { player_id: 'hf_auth_id', secret_key: 'hf_auth_key' };
  const COOKIE_MAX = 512;
  const YEAR = 31536000;

  function doc() { return G.document || null; }

  function readCookie(name) {
    try {
      const raw = doc() && doc().cookie;
      if (!raw) return null;
      const parts = String(raw).split(';');
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        const eq = p.indexOf('=');
        if (eq < 0) continue;
        if (p.slice(0, eq).trim() !== name) continue;
        return decodeURIComponent(p.slice(eq + 1).trim());
      }
    } catch (e) { /* cookies bloqueadas */ }
    return null;
  }

  function writeCookie(name, value) {
    try {
      if (!doc()) return false;
      const secure = G.location && /^https:/i.test(String(G.location.protocol || '')) ? '; Secure' : '';
      doc().cookie = name + '=' + encodeURIComponent(value) +
        '; Path=/; Max-Age=' + YEAR + '; SameSite=Lax' + secure;
      return true;
    } catch (e) { return false; }
  }

  function dropCookie(name) {
    try {
      if (!doc()) return;
      const secure = G.location && /^https:/i.test(String(G.location.protocol || '')) ? '; Secure' : '';
      doc().cookie = name + '=; Path=/; Max-Age=0; SameSite=Lax' + secure;
    } catch (e) { }
  }

  function get(key, def) {
    let value = HF.store.get(key, undefined);
    // Sin valor en el backend: puede ser una recarga con localStorage bloqueado.
    if (value === undefined && MIRROR[key]) {
      const raw = readCookie(MIRROR[key]);
      if (raw != null) {
        try { value = JSON.parse(raw); } catch (e) { value = raw; }
        try { HF.store.set(key, value); } catch (e) { }
      }
    }
    return value === undefined ? def : value;
  }

  function set(key, value) {
    let ok = true;
    try { ok = HF.store.set(key, value) !== false; } catch (e) { ok = false; }
    // La identidad siempre se replica: si el backend falla, la cookie mantiene
    // la sesión hasta que el almacenamiento vuelva a estar disponible.
    if (MIRROR[key]) {
      let raw = '';
      try { raw = JSON.stringify(value); } catch (e) { raw = ''; }
      if (raw && raw.length <= COOKIE_MAX) writeCookie(MIRROR[key], raw);
    }
    return ok;
  }

  function remove(key) {
    try { HF.store.del(key); } catch (e) { }
    if (MIRROR[key]) dropCookie(MIRROR[key]);
  }

  function has(key) {
    if (get(key, undefined) !== undefined) return true;
    return false;
  }

  let probed = null;
  function persistent() {
    if (probed !== null) return probed;
    // Electron escribe en userData mediante el puente nativo.
    if (HF.platform && HF.platform.electron) { probed = true; return probed; }
    let local = false;
    try {
      const ls = G.localStorage;
      ls.setItem('hf__probe', '1');
      local = ls.getItem('hf__probe') === '1';
      ls.removeItem('hf__probe');
    } catch (e) { local = false; }
    probed = !!local;
    return probed;
  }

  function backend() {
    if (HF.platform && HF.platform.electron) return 'electron';
    return persistent() ? 'localStorage' : 'memory';
  }

  function identityBackup() {
    return !!(readCookie(MIRROR.player_id) || readCookie(MIRROR.secret_key));
  }

  HF.storage = {
    get, set, remove, has,
    persistent, backend, identityBackup,
    keys: MIRROR
  };
})(typeof window !== 'undefined' ? window : globalThis);
