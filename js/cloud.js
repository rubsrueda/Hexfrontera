(function (G) {
  const HF = G.HF = G.HF || {};
  const BASE = 'https://wwafeitljxnlvmjtwsjz.supabase.co/rest/v1';
  // Edge Functions del mismo proyecto (PayPal). La service_role NUNCA va en el
  // cliente: la función la usa desde el entorno seguro de Supabase.
  const FUNCTIONS_BASE = 'https://wwafeitljxnlvmjtwsjz.supabase.co/functions/v1';
  // Clave PÚBLICA (publishable/anon). La service_role NUNCA va en el cliente:
  // si alguna vez hace falta, se usa en una Edge Function con secreto de servidor.
  const API_KEY = 'sb_publishable_9jlzQGRdEZhBtbofd-poZw_pIG74t42';
  const HEADERS = {
    apikey: API_KEY,
    Authorization: 'Bearer ' + API_KEY,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  };
  // Las Edge Functions no entienden `Prefer`; además, enviarlo obligaría a
  // declararlo en el preflight CORS. Se usa un juego de cabeceras limpio.
  // `apikey` basta para el gateway; no se manda Authorization con una clave
  // publishable que no es un JWT.
  const EDGE_HEADERS = {
    apikey: API_KEY,
    'Content-Type': 'application/json'
  };
  const TIMEOUT = 1500;
  const enc = encodeURIComponent;

  // ---------- política de seguridad ----------
  // El servidor (PostgreSQL) es la única fuente de verdad para puntuaciones,
  // votos y licencia: sql/security_hardening.sql. Si las RPC no están
  // desplegadas todavía, se usa la ruta antigua para no romper el juego; en
  // cuanto se aplica el SQL, manda el servidor.
  const cfgSec = () => (HF.CFG && HF.CFG.security) || {};
  const strict = () => cfgSec().strictServerValidation !== false;
  const onlineAllowed = () => !(HF.security && HF.security.locked);

  // ---------- almacenamiento local ----------
  const get = (k, d) => HF.store.get(k, d);
  const set = (k, v) => HF.store.set(k, v);

  function makeId() {
    // Identidad opaca y persistente. Antes eran 4 dígitos: dos jugadores podían
    // colisionar y el upsert por player_id fusionaba cuentas (historial y tribu).
    const t = Date.now().toString(36).toUpperCase().slice(-4);
    const r = (Math.random().toString(36) + '000000').slice(2, 8).toUpperCase();
    return 'HF-' + t + r;
  }
  function makeKey() { return 'K-' + Math.random().toString(36).substring(2, 8).toUpperCase(); }
  function playerId() {
    let id = get('player_id', null);
    if (!id) {
      id = makeId();
      if (!set('player_id', id)) console.warn('[cloud] no se pudo persistir player_id: la identidad no sobrevivirá al reinicio');
    }
    return id;
  }
  function secretKey() {
    let k = get('secret_key', null);
    if (!k) {
      k = makeKey();
      if (!set('secret_key', k)) console.warn('[cloud] no se pudo persistir secret_key');
    }
    return k;
  }
  const isPremium = () => !!get('is_premium', false);
  const recoveryEmail = () => get('recovery_email', '') || '';

  function profileData() {
    const tribe = HF.loadTribe();
    const stats = HF.getStats();
    stats.campaign_progress = HF.store.get('campaign_progress', { stars: {} });
    const data = {
      tribe_name: tribe.name || (HF.genTribeName ? HF.genTribeName() : 'Mi Tribu'),
      tribe_data: tribe,
      stats_data: stats
    };
    // No enviar false: evita pisar una licencia premium ya registrada en la nube.
    if (isPremium()) data.is_premium = true;
    return data;
  }

  // ---------- red ----------
  let lastOffline = false;
  async function request(endpoint, options) {
    options = options || {};
    if (!onlineAllowed()) return { ok: false, blocked: true, offline: false };
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { lastOffline = true; return { ok: false, offline: true }; }
    if (typeof G.fetch !== 'function') { lastOffline = true; return { ok: false, offline: true }; }
    const ms = options.timeout || TIMEOUT;
    const ctrl = typeof G.AbortController === 'function' ? new G.AbortController() : null;
    const timer = G.setTimeout(() => { if (ctrl) ctrl.abort(); }, ms);
    try {
      const headers = Object.assign({}, HEADERS, options.headers || {});
      const opts = Object.assign({}, options, { headers });
      if (opts.body && typeof opts.body !== 'string') opts.body = JSON.stringify(opts.body);
      if (ctrl) opts.signal = ctrl.signal;
      const res = await G.fetch(BASE + endpoint, opts);
      G.clearTimeout(timer);
      let data = null;
      try { const txt = await res.text(); data = txt ? JSON.parse(txt) : null; } catch (e) { data = null; }
      if (!res.ok) { lastOffline = false; return { ok: false, offline: false, status: res.status, data }; }
      lastOffline = false;
      return { ok: true, status: res.status, data };
    } catch (e) {
      G.clearTimeout(timer);
      lastOffline = true;
      return { ok: false, offline: true };
    }
  }

  // RPC genérica (más margen: crear sala o publicar un estado puede tardar).
  const rpcRaw = (fn, args, ms) => request('/rpc/' + fn, { method: 'POST', body: args || {}, timeout: ms || 9000 });

  // Edge Function (Deno) del proyecto. El cuerpo va en JSON y la respuesta
  // también; `ok` refleja tanto el HTTP como el `ok` lógico del servidor.
  async function callFunction(name, payload, ms) {
    if (!onlineAllowed()) return { ok: false, blocked: true };
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { lastOffline = true; return { ok: false, offline: true }; }
    if (typeof G.fetch !== 'function') { lastOffline = true; return { ok: false, offline: true }; }
    const timeout = ms || 25000;
    const ctrl = typeof G.AbortController === 'function' ? new G.AbortController() : null;
    const timer = G.setTimeout(() => { if (ctrl) ctrl.abort(); }, timeout);
    try {
      const res = await G.fetch(FUNCTIONS_BASE + '/' + encodeURIComponent(name), {
        method: 'POST',
        headers: EDGE_HEADERS,
        body: JSON.stringify(payload || {}),
        signal: ctrl ? ctrl.signal : undefined
      });
      G.clearTimeout(timer);
      let data = null;
      try { const txt = await res.text(); data = txt ? JSON.parse(txt) : null; } catch (e) { data = null; }
      lastOffline = false;
      if (!res.ok) return { ok: false, offline: false, status: res.status, data, msg: d3msg(data) };
      return { ok: !(data && data.ok === false), status: res.status, data, msg: d3msg(data) };
    } catch (e) {
      G.clearTimeout(timer);
      lastOffline = true;
      const aborted = e && (e.name === 'AbortError' || /aborted/i.test(String(e.message || e)));
      return {
        ok: false,
        offline: true,
        timeout: aborted,
        detail: String((e && e.message) || e || '')
      };
    }
  }

  // RPC "validada": distingue "no existe la función" (falta migrar el SQL) de
  // "el servidor dijo que no" (msg). Así el cliente puede degradar con criterio.
  async function rpcCheck(fn, args, ms) {
    if (!onlineAllowed()) return { ok: false, blocked: true, missing: false };
    const r = await rpcRaw(fn, args, ms);
    if (r.ok) {
      const d = r.data || {};
      return Object.assign({ ok: d.ok !== false }, d, { rpc: true });
    }
    // 404/400 en PostgREST = función inexistente o firma distinta.
    const missing = (r.status === 404) || (r.status === 400);
    return { ok: false, missing, offline: !!r.offline, status: r.status, msg: d3msg(r.data) };
  }
  function d3msg(data) {
    if (!data) return '';
    if (typeof data === 'string') return data;
    return String((data && (data.message || data.msg || data.error)) || '');
  }
  // Mensaje legible cuando el servidor no devolve JSON con detalle.
  function httpMsg(status) {
    if (status === 401 || status === 403) return 'permiso denegado';
    if (status === 404) return 'servidor de ranking no disponible';
    return status ? 'error HTTP ' + status : '';
  }

  // ---------- identidad ----------
  // Registro idempotente. Se puede esperar antes de una operación que exige
  // que la fila exista en hf_players (por ejemplo, crear una orden PayPal).
  let registerPromise = null;
  function ensureRegistered() {
    if (get('cloud_registered', false)) return Promise.resolve({ ok: true, cached: true });
    if (registerPromise) return registerPromise;

    const id = playerId(), key = secretKey(), p = profileData();
    registerPromise = rpcCheck('fn_hf_register', {
      p_player: id, p_secret: key,
      p_tribe_name: p.tribe_name, p_tribe: p.tribe_data, p_stats: p.stats_data
    }).then(r => {
      if (r.ok) { set('cloud_registered', true); return { ok: true }; }
      if (!r.missing) return { ok: false, offline: !!r.offline, msg: r.msg };
      // Compatibilidad: instalaciones sin sql/security_hardening.sql.
      return request('/hf_players?on_conflict=player_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: Object.assign({ player_id: id, secret_key: key }, p)
      }).then(rr => {
        if (rr && rr.ok) { set('cloud_registered', true); return { ok: true }; }
        return { ok: false, offline: !!(rr && rr.offline), msg: d3msg(rr && rr.data) };
      });
    }).catch(() => ({ ok: false, offline: true }));

    // Si falla (sin conexión, servidor caído), el siguiente intento reintenta.
    registerPromise.then(() => { registerPromise = null; }, () => { registerPromise = null; });
    return registerPromise;
  }

  function initIdentity() {
    const id = playerId(), key = secretKey();
    ensureRegistered().catch(() => { });
    // Si una edición de la tribu se quedó sin subir (cierre inesperado), se
    // reintenta al arrancar: el perfil de la nube vuelve a coincidir.
    if (get('tribe_dirty', false)) saveProfileCloud().catch(() => { });
    return { player_id: id, secret_key: key };
  }

  async function saveProfileCloud() {
    const id = playerId(), key = secretKey(), p = profileData();
    const r = await rpcCheck('fn_hf_save_profile', {
      p_player: id, p_secret: key,
      p_tribe_name: p.tribe_name, p_tribe: p.tribe_data, p_stats: p.stats_data
    });
    if (r.ok) { set('cloud_registered', true); set('tribe_dirty', false); return { ok: true, data: r }; }
    if (!r.missing) return { ok: false, offline: !!r.offline, msg: r.msg };
    // Compatibilidad pre-migración.
    const legacy = await request(`/hf_players?player_id=eq.${enc(id)}&secret_key=eq.${enc(key)}`, {
      method: 'PATCH', body: p
    });
    if (legacy.ok) { set('cloud_registered', true); set('tribe_dirty', false); }
    return legacy;
  }

  // Subida diferida del perfil (la tribu se edita al teclear/colorear).
  let profileTimer = 0;
  function saveProfileSoon(delay) {
    set('tribe_dirty', true);
    if (profileTimer) G.clearTimeout(profileTimer);
    const wait = delay == null ? 1200 : delay;
    profileTimer = G.setTimeout(() => {
      profileTimer = 0;
      saveProfileCloud().catch(() => { });
    }, wait);
  }

  // Restaura una fila de la nube en local. `force` lo usan vincular/recuperar
  // (el usuario lo pide explícitamente); el resto conserva la tribu local si es
  // más reciente que la copia de la nube.
  function restoreFromRow(row, force) {
    if (!row) return false;
    if (row.tribe_data && typeof row.tribe_data === 'object') {
      const local = get('tribe_profile', null);
      const localAt = +(local && local.updatedAt) || 0;
      const cloudAt = +(row.tribe_data.updatedAt) || 0;
      if (force || !local || cloudAt > localAt) set('tribe_profile', row.tribe_data);
    }
    set('player_id', row.player_id);
    if (row.secret_key) set('secret_key', row.secret_key);
    set('is_premium', !!row.is_premium);
    set('recovery_email', row.recovery_email || '');
    if (row.stats_data && typeof row.stats_data === 'object') {
      const st = Object.assign({}, row.stats_data);
      if (st.campaign_progress) { set('campaign_progress', st.campaign_progress); delete st.campaign_progress; }
      set('player_statistics', st);
    }
    set('cloud_registered', true);
    return true;
  }

  async function linkDevice(targetId, targetKey) {
    const pid = String(targetId || '').trim();
    const pkey = String(targetKey || '').trim();
    if (!pid || !pkey) return { ok: false, msg: 'ID o clave incorrecta' };

    // El servidor devuelve el perfil SIN la clave; la clave la aporta el jugador.
    const r = await rpcCheck('fn_hf_profile', { p_player: pid, p_secret: pkey });
    if (r.ok && r.player_id) {
      restoreFromRow(Object.assign({ secret_key: pkey }, r), true);
      return { ok: true };
    }
    if (!r.missing) return { ok: false, offline: !!r.offline, msg: r.offline ? 'Modo sin conexión' : 'ID o clave incorrecta' };

    // Compatibilidad pre-migración: nunca se pide select=* (eso exponía la clave).
    const legacy = await request(`/hf_players?player_id=eq.${enc(pid)}&secret_key=eq.${enc(pkey)}&select=player_id,tribe_name,tribe_data,stats_data,is_premium,recovery_email`);
    if (!legacy.ok) return { ok: false, offline: !!legacy.offline, msg: legacy.offline ? 'Modo sin conexión' : 'ID o clave incorrecta' };
    const row = Array.isArray(legacy.data) ? legacy.data[0] : legacy.data;
    if (!row) return { ok: false, msg: 'ID o clave incorrecta' };
    restoreFromRow(Object.assign({ secret_key: pkey }, row), true);
    return { ok: true };
  }

  async function refreshProfile() {
    const id = playerId(), key = secretKey();
    const r = await rpcCheck('fn_hf_profile', { p_player: id, p_secret: key });
    if (r.ok && r.player_id) { restoreFromRow(Object.assign({ secret_key: key }, r)); return { ok: true, data: r }; }
    if (!r.missing) return { ok: false, offline: !!r.offline };
    // Compatibilidad: sin select=* (la clave ya no viaja al navegador).
    const legacy = await request(`/hf_players?player_id=eq.${enc(id)}&select=player_id,tribe_name,tribe_data,stats_data,is_premium,recovery_email`);
    if (!legacy.ok) return legacy;
    const row = Array.isArray(legacy.data) ? legacy.data[0] : legacy.data;
    if (row) restoreFromRow(row);
    return { ok: !!row, data: row };
  }

  async function setRecoveryEmail(email) {
    const id = playerId(), key = secretKey();
    const value = String(email || '').trim();
    const r = await rpcCheck('fn_hf_set_recovery_email', { p_player: id, p_secret: key, p_email: value });
    if (r.ok) { set('recovery_email', value); return { ok: true }; }
    if (!r.missing) return { ok: false, offline: !!r.offline, msg: r.msg || 'No se pudo guardar el correo' };

    // Compatibilidad: la licencia premium NO se regala desde el cliente; el
    // servidor mantiene el valor que ya tuviera.
    const legacy = await request(`/hf_players?player_id=eq.${enc(id)}&secret_key=eq.${enc(key)}`, {
      method: 'PATCH', body: { recovery_email: value }
    });
    if (legacy.ok) set('recovery_email', value);
    return legacy;
  }

  // Recuperación: se pide al servidor y NUNCA se recibe la clave secreta.
  // Sin el SQL aplicado, esta función queda deshabilitada a propósito: la ruta
  // antigua (SELECT por correo) permitía quedarse con la cuenta de otro.
  async function recoverByEmail(email) {
    const value = String(email || '').trim();
    const r = await rpcCheck('fn_hf_recover_request', { p_email: value });
    if (r.ok) {
      return {
        ok: false,
        pending: true,
        playerId: r.player_id || '',
        msg: 'Solicitud registrada. Necesitas el código de rescate enviado a tu correo.'
      };
    }
    if (r.missing) {
      return { ok: false, msg: 'Recuperación no disponible: falta aplicar sql/security_hardening.sql' };
    }
    return { ok: false, offline: !!r.offline, msg: r.offline ? 'Modo sin conexión' : (r.msg || 'No se encontró la cuenta') };
  }

  // ---------- desafío diario ----------
  function queueDaily(score) {
    const q = get('daily_queue', []);
    q.push(score); set('daily_queue', q.slice(-100));
    return { ok: false, queued: true, offline: true };
  }
  async function submitDailyScore(score) {
    score = Object.assign({}, score || {});
    const id = playerId(), key = secretKey();
    // El servidor decide si el intento es oficial (primero del día).
    const rpc = await rpcCheck('fn_hf_submit_daily', {
      p_player: id, p_secret: key,
      p_date: score.date_key, p_turns: score.turns, p_surplus: score.surplus,
      p_tribe: score.tribe_name, p_crest: score.crest, p_color: score.color_hex
    });
    if (rpc.rpc || rpc.ok || rpc.missing === false) {
      if (rpc.ok) return { ok: true, official: !!rpc.official, data: rpc };
      if (rpc.practice) return { ok: false, practice: true, msg: rpc.msg || 'Intento de práctica' };
      if (!rpc.offline) return { ok: false, msg: rpc.msg || 'No se aceptó la marca' };
    }
    const r = await request('/hf_daily_scores', { method: 'POST', body: score });
    if (r.ok) return r;
    return queueDaily(score);
  }
  async function flushQueue() {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return { ok: false, pending: get('daily_queue', []).length };
    const q = get('daily_queue', []);
    if (!q.length) return { ok: true, pending: 0 };
    const left = [];
    for (const score of q) {
      const rpc = await rpcCheck('fn_hf_submit_daily', {
        p_player: playerId(), p_secret: secretKey(),
        p_date: score.date_key, p_turns: score.turns, p_surplus: score.surplus,
        p_tribe: score.tribe_name, p_crest: score.crest, p_color: score.color_hex
      });
      if (rpc.ok || rpc.practice) continue;          // aceptado o ya oficial
      if (rpc.missing) {
        const r = await request('/hf_daily_scores', { method: 'POST', body: score });
        if (r.ok) continue;
        left.push(score);
      } else {
        left.push(score);
        if (rpc.offline) { for (const x of q.slice(q.indexOf(score) + 1)) left.push(x); break; }
      }
    }
    set('daily_queue', left);
    return { ok: true, pending: left.length };
  }
  async function getDailyLeaderboard(dateKey) {
    const r = await request(`/hf_daily_scores?date_key=eq.${enc(dateKey)}&order=turns.asc,surplus.desc&limit=20`);
    return r.ok && Array.isArray(r.data) ? r.data : [];
  }

  // ---------- mapas comunitarios ----------
  async function publishMap(mapData) {
    const d = mapData || {};
    const r = await rpcCheck('fn_hf_publish_map', {
      p_player: playerId(), p_secret: secretKey(),
      p_name: d.name, p_code: d.code,
      p_radius: +(d.radius || 7), p_factions: +(d.factions_count || 2)
    });
    if (r.ok) return { ok: true, data: { id: r.id } };
    if (!r.missing) return { ok: false, offline: !!r.offline, msg: r.msg };
    return request('/hf_community_maps', { method: 'POST', body: mapData });
  }
  async function getCommunityMaps() {
    const r = await request('/hf_community_maps?order=upvotes.desc&limit=20');
    return r.ok && Array.isArray(r.data) ? r.data : [];
  }
  // Una fila concreta: la usan los enlaces #map=<id> para abrir un mapa compartido.
  async function getCommunityMap(mapId) {
    const r = await request(`/hf_community_maps?id=eq.${enc(mapId)}&select=*`);
    return r.ok && Array.isArray(r.data) ? (r.data[0] || null) : null;
  }
  async function upvoteMap(mapId) {
    const voted = get('voted_maps', []);
    if (voted.indexOf(mapId) >= 0) return { ok: false, msg: 'Ya votaste este mapa' };
    // Un voto por jugador y mapa lo garantiza el servidor (PK en hf_map_votes).
    const r = await rpcCheck('fn_hf_upvote_map', { p_map_id: +mapId, p_player: playerId(), p_secret: secretKey() });
    if (r.ok) { voted.push(mapId); set('voted_maps', voted); return { ok: true }; }
    if (!r.missing) return { ok: false, msg: r.msg || 'No se pudo votar' };

    // Compatibilidad pre-migración (lectura-modificación no atómica).
    const cur = await request(`/hf_community_maps?id=eq.${enc(mapId)}&select=upvotes`);
    if (!cur.ok) return cur;
    const row = Array.isArray(cur.data) ? cur.data[0] : cur.data;
    if (!row) return { ok: false, msg: 'Mapa no encontrado' };
    const res = await request(`/hf_community_maps?id=eq.${enc(mapId)}`, {
      method: 'PATCH', body: { upvotes: (row.upvotes || 0) + 1 }
    });
    if (res.ok) { voted.push(mapId); set('voted_maps', voted); }
    return res;
  }

  async function ping() {
    const r = await request('/hf_players?select=player_id&limit=1');
    return !!r.ok;
  }

  // ---------- enlaces cortos de mapas del editor (?m=X9K2A) ----------
  // El mapa editado no se reconstruye con semilla: la nube guarda una fila
  // pequeña (código → v1:…). sql/short_links.sql.
  async function shortenMap(mapCode, name) {
    const code = String(mapCode || '');
    // Acepta códigos de mapa (v1:…) y de repetición (z…/j…): la tabla y las
    // RPC de enlaces cortos guardan el código completo sin interpretarlo.
    if (!/^(?:v1:|[zj])/i.test(code)) return { ok: false, msg: 'Código no válido' };
    const r = await rpcCheck('fn_hf_shorten_map', {
      p_player: playerId(), p_secret: secretKey(), p_code: code, p_name: name || ''
    });
    if (r.ok && r.code) return { ok: true, code: String(r.code).toUpperCase() };
    if (r.missing) return { ok: false, msg: 'Enlaces cortos no disponibles: falta aplicar sql/short_links.sql' };
    return { ok: false, offline: !!r.offline, msg: r.msg || 'No se pudo crear el enlace' };
  }

  // Cache local acotada: el segundo intento funciona aunque no haya red.
  const MAP_LINK_CACHE_MAX = 25;
  function cacheMapLink(code, mapCode) {
    const key = String(code || '').toUpperCase();
    if (!key || !mapCode) return;
    const cache = get('map_links', {});
    cache[key] = String(mapCode);
    const keys = Object.keys(cache);
    if (keys.length > MAP_LINK_CACHE_MAX) {
      for (const k of keys.slice(0, keys.length - MAP_LINK_CACHE_MAX)) delete cache[k];
    }
    set('map_links', cache);
  }

  async function resolveShortMap(code) {
    const key = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (key.length < 4 || key.length > 10) return { ok: false, msg: 'Código no válido' };
    const cache = get('map_links', {});
    if (cache[key]) return { ok: true, code: cache[key], cached: true };
    const r = await rpcCheck('fn_hf_resolve_map', { p_code: key });
    if (r.ok && r.code) { cacheMapLink(key, r.code); return { ok: true, code: r.code, name: r.name }; }
    if (r.missing) return { ok: false, msg: 'Enlaces cortos no disponibles: falta aplicar sql/short_links.sql' };
    return { ok: false, offline: !!r.offline, msg: r.offline ? 'Sin conexión: no se pudo resolver el enlace' : (r.msg || 'Enlace no encontrado') };
  }

  // ---------- clasificación por mapa (competencia asíncrona) ----------
  // Clave determinista del mapa jugado: diario y comunitario usan su id; la
  // campaña, su nivel; el resto, un hash corto de los parámetros base.
  function getMapKey(g) {
    const meta = (g && g.meta) || {};
    if (meta.daily) return 'daily_' + meta.daily;
    if (meta.mapId) return 'map_' + meta.mapId;
    if (g && g.mode === 'campaign' && meta.idx != null) return 'camp_' + meta.idx;
    const custom = g && (g._customCells || g.customCells);
    const raw = `${g.R}_${g.seed}_${g.biome || 'plains'}_${g.f.length}_${custom ? custom.length : 0}`;
    let h = 0;
    for (let i = 0; i < raw.length; i++) h = Math.imul(31, h) + raw.charCodeAt(i) | 0;
    return 'hex_' + Math.abs(h).toString(36);
  }

  // Envío de la marca. El cliente manda los HECHOS de la partida (turnos,
  // bajas, deserciones, excedente, victoria) y el servidor recalcula el score
  // con la misma fórmula: si el número no cuadra, se rechaza.
  async function submitMapScore(payload) {
    if (!payload || !payload.map_key || !payload.player_id) return { ok: false, msg: 'Puntuación incompleta' };
    // La marca exige que exista la fila de identidad: si el registro aún no
    // terminó, el servidor respondería «no autorizado».
    await ensureRegistered().catch(() => { });
    const r = await rpcCheck('fn_hf_submit_map_score', {
      p_player: payload.player_id,
      p_secret: secretKey(),
      p_map_key: payload.map_key,
      p_turns: +payload.turns || 0,
      p_kills: +payload.kills || 0,
      p_lost: +payload.lost || 0,
      p_deserts: +payload.deserts || 0,
      p_surplus: +payload.surplus || 0,
      p_won: !!payload.won,
      p_tribe: payload.tribe_name,
      p_crest: payload.crest,
      p_color: payload.color_hex,
      p_score: payload.score == null ? null : (+payload.score | 0)
    });
    if (r.rpc) {
      // Servidor respondió: conservar su mensaje; si no vino, dar uno legible.
      return r.ok ? r : Object.assign({}, r, { msg: r.msg || 'el servidor rechazó la marca' });
    }
    if (!r.missing) {
      // Offline / bloqueado por seguridad.
      return Object.assign({}, r, { msg: r.msg || (r.offline ? 'sin conexión con el servidor' : 'envío bloqueado') });
    }

    // Compatibilidad pre-migración: se conserva la ruta anterior.
    const prev = await request(`/hf_map_scores?map_key=eq.${enc(payload.map_key)}&player_id=eq.${enc(payload.player_id)}&select=score,turns`);
    if (!prev.ok) {
      return { ok: false, offline: !!prev.offline, status: prev.status, msg: d3msg(prev.data) || httpMsg(prev.status) };
    }
    const row = Array.isArray(prev.data) ? prev.data[0] : prev.data;
    if (row) {
      const cur = +row.score || 0, curTurns = +row.turns || 0, next = +payload.score || 0, nextTurns = +payload.turns || 0;
      if (!(next > cur || (next === cur && nextTurns < curTurns))) return { ok: true, skipped: true, data: row };
    }
    const out = await request('/hf_map_scores?on_conflict=map_key,player_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: payload
    });
    if (out.ok) return out;
    return { ok: false, offline: !!out.offline, status: out.status, msg: d3msg(out.data) || httpMsg(out.status) };
  }

  const ROW_COLS = 'player_id,tribe_name,crest,color_hex,map_key,turns,score,surplus,won';

  // Top 10 del mapa: más puntos primero y, a igualdad, menos turnos. No se
  // descarga replay_code aquí (puede pesar); se pide solo al pulsar ▶.
  async function getMapLeaderboard(mapKey) {
    const r = await request(`/hf_map_scores?map_key=eq.${enc(mapKey)}&select=${ROW_COLS}&order=score.desc,turns.asc&limit=10`);
    return r.ok && Array.isArray(r.data) ? r.data : [];
  }

  // Puesto exacto del jugador en un mapa (1 = primero).
  async function getMapRank(mapKey, playerId) {
    const r = await request(`/hf_map_scores?map_key=eq.${enc(mapKey)}&select=player_id,score,turns&limit=1000`);
    if (!r.ok || !Array.isArray(r.data)) return 0;
    const mine = r.data.find(x => x.player_id === playerId);
    if (!mine) return 0;
    const ms = +mine.score || 0, mt = +mine.turns || 0;
    let rank = 1;
    for (const x of r.data) {
      const s = +x.score || 0, t = +x.turns || 0;
      if (s > ms || (s === ms && t < mt)) rank++;
    }
    return rank;
  }

  // Mejor marca de cada jugador (una fila por jugador, ya ordenada).
  async function getGlobalTop(limit) {
    const n = Math.max(10, Math.min(500, limit || 40));
    const r = await request(`/hf_map_scores?select=${ROW_COLS}&order=score.desc,turns.asc&limit=${n}`);
    if (!r.ok || !Array.isArray(r.data)) return [];
    const seen = new Set(), out = [];
    for (const row of r.data) { if (seen.has(row.player_id)) continue; seen.add(row.player_id); out.push(row); }
    return out;
  }

  // Posición global del jugador y su mejor marca.
  async function getPlayerStanding(playerId) {
    const top = await getGlobalTop(500);
    if (!top.length) {
      // Sin filas: puede ser un jugador nuevo o falta de conexión.
      if (lastOffline) return { ok: false, offline: true };
      return { ok: true, rank: 0, total: 0, best: null, maps: 0 };
    }
    const mi = await request(`/hf_map_scores?player_id=eq.${enc(playerId)}&select=map_key,score,turns,won&order=score.desc&limit=200`);
    const mine = mi.ok && Array.isArray(mi.data) ? mi.data : [];
    const idx = top.findIndex(x => x.player_id === playerId);
    return {
      ok: true,
      rank: idx >= 0 ? idx + 1 : 0,
      total: top.length,
      capped: idx < 0 && top.length >= 500,
      best: mine[0] || (idx >= 0 ? top[idx] : null),
      maps: mine.length
    };
  }

  // Código de repetición de una fila concreta (se descarga bajo demanda).
  let replayColumnMissing = false;
  async function getMapReplay(mapKey, playerId) {
    const r = await request(`/hf_map_scores?map_key=eq.${enc(mapKey)}&player_id=eq.${enc(playerId)}&select=replay_code`);
    if (!r.ok) { if (r.status === 400) replayColumnMissing = true; return ''; }
    const row = Array.isArray(r.data) ? r.data[0] : r.data;
    return (row && row.replay_code) || '';
  }

  // Guarda el código de repetición de la mejor partida (sólo la propia fila).
  async function submitReplayCode(mapKey, playerId, code) {
    const r = await rpcCheck('fn_hf_submit_replay', {
      p_player: playerId || playerId_(), p_secret: secretKey(), p_map_key: mapKey, p_code: String(code || '')
    });
    if (r.rpc) return r;
    if (!r.missing) return r;
    return request(`/hf_map_scores?map_key=eq.${enc(mapKey)}&player_id=eq.${enc(playerId)}`, {
      method: 'PATCH', body: { replay_code: String(code || '') }
    });
  }
  const playerId_ = () => playerId();

  function mapKeyLabel(key) {
    const s = String(key || '');
    if (s.indexOf('daily_') === 0) return 'Diario ' + s.slice(6);
    if (s.indexOf('camp_') === 0) return 'Campaña · nivel ' + ((+s.slice(5) || 0) + 1);
    if (s.indexOf('map_') === 0) return 'Mapa de la comunidad';
    if (s.indexOf('hex_') === 0) return 'Escaramuza ' + s.slice(4).toUpperCase();
    return s || 'Mapa';
  }

  // Licencia: la verdad está en la nube. Se consulta de vez en cuando y se
  // cachea; el flag local sólo sirve para pintar la UI antes de responder.
  let licenseChecked = 0;
  async function verifyLicense(force) {
    const now = Date.now();
    if (!force && now - licenseChecked < 10 * 60 * 1000) return { ok: true, cached: true, is_premium: isPremium() };
    const r = await rpcCheck('fn_hf_license', { p_player: playerId(), p_secret: secretKey() });
    if (!r.ok) return { ok: false, offline: !!r.offline, missing: !!r.missing };
    licenseChecked = now;
    set('is_premium', !!r.is_premium);
    return { ok: true, is_premium: !!r.is_premium };
  }

  HF.cloud = {
    request, ping, initIdentity, ensureRegistered,
    playerId, secretKey, isPremium, recoveryEmail, verifyLicense,
    profileData, saveProfileCloud, saveProfileSoon, refreshProfile, linkDevice, restoreFromRow, setRecoveryEmail, recoverByEmail,
    submitDailyScore, flushQueue, getDailyLeaderboard,
    getMapKey, submitMapScore, getMapLeaderboard, getMapRank, getGlobalTop, getPlayerStanding, getMapReplay, submitReplayCode,
    mapKeyLabel,
    publishMap, getCommunityMaps, getCommunityMap, upvoteMap,
    shortenMap, resolveShortMap,
    queuedScores: () => get('daily_queue', []),
    lastOffline: () => lastOffline,
    replayMissing: () => replayColumnMissing,
    strictServerValidation: strict,
    functionsBase: FUNCTIONS_BASE,
    callFunction,
    get online() { return onlineAllowed() && (typeof navigator === 'undefined' || navigator.onLine !== false); }
  };
  // RPC y consultas genéricas para el multijugador (sql/hf_multiplayer.sql).
  HF.cloud.rpc = (fn, args) => rpcRaw(fn, args);
  HF.cloud.select = (table, query) => request('/' + table + '?' + query, { method: 'GET', timeout: 6000 });
  HF.cloud.patch = (table, query, body) => request('/' + table + '?' + query, { method: 'PATCH', body: body, timeout: 9000 });
})(window);
