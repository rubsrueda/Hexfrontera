(function (G) {
  const HF = G.HF = G.HF || {};
  const BASE = 'https://wwafeitljxnlvmjtwsjz.supabase.co/rest/v1';
  const API_KEY = 'sb_publishable_9jlzQGRdEZhBtbofd-poZw_pIG74t42';
  const HEADERS = {
    apikey: API_KEY,
    Authorization: 'Bearer ' + API_KEY,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  };
  const TIMEOUT = 1500;
  const enc = encodeURIComponent;

  // ---------- almacenamiento local ----------
  const get = (k, d) => HF.store.get(k, d);
  const set = (k, v) => HF.store.set(k, v);

  function makeId() {
    let id;
    do { id = 'HF-' + Math.floor(1000 + Math.random() * 9000); } while (get('player_id', null) === id);
    return id;
  }
  function makeKey() { return 'K-' + Math.random().toString(36).substring(2, 8).toUpperCase(); }
  function playerId() {
    let id = get('player_id', null);
    if (!id) { id = makeId(); set('player_id', id); }
    return id;
  }
  function secretKey() {
    let k = get('secret_key', null);
    if (!k) { k = makeKey(); set('secret_key', k); }
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
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { lastOffline = true; return { ok: false, offline: true }; }
    if (typeof G.fetch !== 'function') { lastOffline = true; return { ok: false, offline: true }; }
    const ctrl = typeof G.AbortController === 'function' ? new G.AbortController() : null;
    const timer = G.setTimeout(() => { if (ctrl) ctrl.abort(); }, TIMEOUT);
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

  // ---------- identidad ----------
  function initIdentity() {
    const id = playerId(), key = secretKey();
    if (!get('cloud_registered', false)) {
      // Upsert silencioso: si ya existe la fila, no duplica.
      request('/hf_players?on_conflict=player_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: Object.assign({ player_id: id, secret_key: key }, profileData())
      }).then(r => { if (r && r.ok) set('cloud_registered', true); }).catch(() => { });
    }
    return { player_id: id, secret_key: key };
  }

  async function saveProfileCloud() {
    const id = playerId(), key = secretKey();
    const r = await request(`/hf_players?player_id=eq.${enc(id)}&secret_key=eq.${enc(key)}`, {
      method: 'PATCH', body: profileData()
    });
    if (r.ok) set('cloud_registered', true);
    return r;
  }

  function restoreFromRow(row) {
    if (!row) return false;
    set('player_id', row.player_id);
    set('secret_key', row.secret_key);
    set('is_premium', !!row.is_premium);
    set('recovery_email', row.recovery_email || '');
    if (row.tribe_data && typeof row.tribe_data === 'object') set('tribe_profile', row.tribe_data);
    if (row.stats_data && typeof row.stats_data === 'object') {
      const st = Object.assign({}, row.stats_data);
      if (st.campaign_progress) { set('campaign_progress', st.campaign_progress); delete st.campaign_progress; }
      set('player_statistics', st);
    }
    set('cloud_registered', true);
    return true;
  }

  async function linkDevice(targetId, targetKey) {
    const r = await request(`/hf_players?player_id=eq.${enc(String(targetId || '').trim())}&secret_key=eq.${enc(String(targetKey || '').trim())}&select=*`);
    if (!r.ok) return { ok: false, offline: !!r.offline, msg: r.offline ? 'Modo sin conexión' : 'ID o clave incorrecta' };
    const row = Array.isArray(r.data) ? r.data[0] : r.data;
    if (!row) return { ok: false, msg: 'ID o clave incorrecta' };
    restoreFromRow(row);
    return { ok: true, player: row };
  }

  async function refreshProfile() {
    const id = playerId();
    const r = await request(`/hf_players?player_id=eq.${enc(id)}&select=*`);
    if (!r.ok) return r;
    const row = Array.isArray(r.data) ? r.data[0] : r.data;
    if (row) restoreFromRow(row);
    return { ok: !!row, data: row };
  }

  async function setRecoveryEmail(email) {
    const id = playerId(), key = secretKey();
    const r = await request(`/hf_players?player_id=eq.${enc(id)}&secret_key=eq.${enc(key)}`, {
      method: 'PATCH', body: { recovery_email: String(email || '').trim(), is_premium: true }
    });
    if (r.ok) { set('recovery_email', String(email || '').trim()); set('is_premium', true); }
    return r;
  }

  async function recoverByEmail(email) {
    const r = await request(`/hf_players?recovery_email=eq.${enc(String(email || '').trim())}&select=*`);
    if (!r.ok) return { ok: false, offline: !!r.offline, msg: r.offline ? 'Modo sin conexión' : 'No se encontró la cuenta' };
    const row = Array.isArray(r.data) ? r.data[0] : r.data;
    if (!row) return { ok: false, msg: 'No se encontró la cuenta' };
    restoreFromRow(row);
    return { ok: true, player: row };
  }

  // ---------- desafío diario ----------
  function queueDaily(score) {
    const q = get('daily_queue', []);
    q.push(score); set('daily_queue', q.slice(-100));
    return { ok: false, queued: true, offline: true };
  }
  async function submitDailyScore(score) {
    score = Object.assign({}, score || {});
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
      const r = await request('/hf_daily_scores', { method: 'POST', body: score });
      if (!r.ok) {
        left.push(score);
        if (r.offline) { for (const x of q.slice(q.indexOf(score) + 1)) left.push(x); break; }
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
    return request('/hf_community_maps', { method: 'POST', body: mapData });
  }
  async function getCommunityMaps() {
    const r = await request('/hf_community_maps?order=upvotes.desc&limit=20');
    return r.ok && Array.isArray(r.data) ? r.data : [];
  }
  async function upvoteMap(mapId) {
    const voted = get('voted_maps', []);
    if (voted.indexOf(mapId) >= 0) return { ok: false, msg: 'Ya votaste este mapa' };
    const cur = await request(`/hf_community_maps?id=eq.${enc(mapId)}&select=upvotes`);
    if (!cur.ok) return cur;
    const row = Array.isArray(cur.data) ? cur.data[0] : cur.data;
    if (!row) return { ok: false, msg: 'Mapa no encontrado' };
    const r = await request(`/hf_community_maps?id=eq.${enc(mapId)}`, {
      method: 'PATCH', body: { upvotes: (row.upvotes || 0) + 1 }
    });
    if (r.ok) { voted.push(mapId); set('voted_maps', voted); }
    return r;
  }

  async function ping() {
    const r = await request('/hf_players?select=player_id&limit=1');
    return !!r.ok;
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

  // Upsert del récord del jugador en ese mapa. Solo escribe si mejora la marca
  // previa (más puntos o, a igualdad, menos turnos) para no borrar un récord
  // bueno al repetir el mapa y perder.
  async function submitMapScore(payload) {
    if (!payload || !payload.map_key || !payload.player_id) return { ok: false, msg: 'Puntuación incompleta' };
    const prev = await request(`/hf_map_scores?map_key=eq.${enc(payload.map_key)}&player_id=eq.${enc(payload.player_id)}&select=score,turns`);
    if (!prev.ok) return prev;
    const row = Array.isArray(prev.data) ? prev.data[0] : prev.data;
    if (row) {
      const cur = +row.score || 0, curTurns = +row.turns || 0, next = +payload.score || 0, nextTurns = +payload.turns || 0;
      if (!(next > cur || (next === cur && nextTurns < curTurns))) return { ok: true, skipped: true, data: row };
    }
    return request('/hf_map_scores?on_conflict=map_key,player_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: payload
    });
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

  // Guarda el código de repetición de la mejor partida (requiere la columna
  // replay_code; si no existe, falla en silencio y el Top sigue funcionando).
  async function submitReplayCode(mapKey, playerId, code) {
    return request(`/hf_map_scores?map_key=eq.${enc(mapKey)}&player_id=eq.${enc(playerId)}`, {
      method: 'PATCH', body: { replay_code: String(code || '') }
    });
  }

  function mapKeyLabel(key) {
    const s = String(key || '');
    if (s.indexOf('daily_') === 0) return 'Diario ' + s.slice(6);
    if (s.indexOf('camp_') === 0) return 'Campaña · nivel ' + ((+s.slice(5) || 0) + 1);
    if (s.indexOf('map_') === 0) return 'Mapa de la comunidad';
    if (s.indexOf('hex_') === 0) return 'Escaramuza ' + s.slice(4).toUpperCase();
    return s || 'Mapa';
  }

  HF.cloud = {
    request, ping, initIdentity,
    playerId, secretKey, isPremium, recoveryEmail,
    profileData, saveProfileCloud, refreshProfile, linkDevice, restoreFromRow, setRecoveryEmail, recoverByEmail,
    submitDailyScore, flushQueue, getDailyLeaderboard,
    getMapKey, submitMapScore, getMapLeaderboard, getMapRank, getGlobalTop, getPlayerStanding, getMapReplay, submitReplayCode,
    mapKeyLabel,
    publishMap, getCommunityMaps, upvoteMap,
    queuedScores: () => get('daily_queue', []),
    lastOffline: () => lastOffline,
    replayMissing: () => replayColumnMissing,
    get online() { return typeof navigator === 'undefined' || navigator.onLine !== false; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
