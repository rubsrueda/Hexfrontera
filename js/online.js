/* Multijugador en red (salas de hasta 4 jugadores).
   Transporte: REST + RPC de Supabase (sql/hf_multiplayer.sql) con sondeo del
   estado, que tolera cambios de app y reconexiones. La partida se juega en el
   tablero local; cada cliente aplica las acciones de la sala. */
(function (G) {
  const HF = G.HF;
  const KEY = 'online_session';
  const SKEY = KEY;
  const SS = (() => { try { return G.sessionStorage || null; } catch (e) { return null; } })();
  const LS = (() => { try { return G.localStorage || null; } catch (e) { return null; } })();
  const MY_ROOMS_KEY = 'hf_online_my_rooms';
  const POLL_MS = 1600;
  const HEARTBEAT_MS = 9000;
  const CODE_ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  // Cada asiento tiene un color distinto: el color de la tribu se repite.
  const SEAT_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#eab308'];

  const getSession = () => {
    if (SS) { try { const v = SS.getItem(SKEY); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
    return HF.store.get(SKEY, null);
  };
  const setSession = s => {
    if (SS) { try { s ? SS.setItem(SKEY, JSON.stringify(s)) : SS.removeItem(SKEY); } catch (e) { } }
    else { s ? HF.store.set(SKEY, s) : HF.store.del(SKEY); }
  };
  // Identidad por pestaña: dos pestañas normales comparten el perfil de
  // localStorage, pero deben ser jugadores distintos en la sala.
  let myId = null;
  function pid() {
    if (myId) return myId;
    try { myId = SS && SS.getItem('hf_online_pid'); } catch (e) { myId = null; }
    if (!myId) {
      myId = 'P-' + Math.random().toString(36).slice(2, 7).toUpperCase();
      try { if (SS) SS.setItem('hf_online_pid', myId); } catch (e) { }
    }
    return myId;
  }
  function usePlayerId(value) {
    if (!value) return;
    myId = String(value);
    try { if (SS) SS.setItem('hf_online_pid', myId); } catch (e) { }
  }
  const rpc = (fn, args) => (HF.cloud && HF.cloud.rpc ? HF.cloud.rpc(fn, args) : Promise.resolve({ ok: false, offline: true }));
  const row = data => (Array.isArray(data) ? data[0] : data) || null;

  function makeCode() {
    let c = '';
    for (let i = 0; i < 5; i++) c += CODE_ALPHA[Math.floor(Math.random() * CODE_ALPHA.length)];
    return c;
  }
  function errMsg(r) {
    const d = r && r.data;
    if (d && (d.message || d.error)) {
      lastError = String(d.message || d.error).replace(/^.*?:\s*/, '');
      console.warn('[online]', r.status || '', d);
      if (/Could not find the function/i.test(lastError)) {
        lastError = 'Faltan las funciones en Supabase: ejecuta sql/hf_multiplayer.sql en el proyecto wwafeitljxnlvmjtwsjz';
      } else if (/schema cache/i.test(lastError)) {
        lastError = 'PostgREST no ve las funciones: ejecuta el SQL y recarga el esquema (notify pgrst)';
      }
      return lastError;
    }
    if (r && r.blocked) {
      lastError = 'Servicios en línea desactivados para este dominio. Abre federati.org o una dirección local de prueba.';
    } else if (r && r.offline) {
      if (r.networkError === 'navigator.onLine=false') lastError = 'El navegador indica que no hay conexión de red.';
      else if (r.timeout) lastError = 'Supabase tardó demasiado en responder. Revisa la conexión y vuelve a intentar.';
      else lastError = 'No se pudo contactar con Supabase (posible bloqueo de red/CORS o endpoint no disponible).';
    } else if (r && (r.status === 401 || r.status === 403)) {
      lastError = 'Supabase rechazó la clave pública o los permisos de la sala.';
    } else {
      lastError = 'No se pudo completar (HTTP ' + ((r && r.status) || '?') + ')';
    }
    console.warn('[online]', r);
    return lastError;
  }
  function myTribe() {
    const t = HF.loadTribe ? HF.loadTribe() : {};
    return { name: t.name || 'Jugador', crest: t.crest || 'c01', color: t.color || '#3b82f6' };
  }

  let timer = 0, beat = 0, lastRoom = null, listeners = [], lastError = '';

  function rememberRoom(room) {
    if (!room || !room.room_code) return;
    if (!LS) {
      console.warn('[online] localStorage no disponible: no se podrá conservar Mis salas');
      return;
    }
    try {
      const rooms = storedRooms();
      const code = room.room_code;
      const playerId = pid();
      const next = rooms.filter(x => !(x.code === code && x.player_id === playerId));
      next.unshift({
        code,
        player_id: playerId,
        status: room.status || 'WAITING',
        updated: room.updated_at || new Date().toISOString(),
        turn: Number(room.current_turn || 1),
        public: !!room.is_public
      });
      LS.setItem(MY_ROOMS_KEY, JSON.stringify(next.slice(0, 40)));
    } catch (e) { console.warn('[online] no se pudo guardar Mis salas', e); }
  }
  function storedRooms() {
    if (!LS) return [];
    try {
      const data = JSON.parse(LS.getItem(MY_ROOMS_KEY) || '[]');
      if (Array.isArray(data)) return data;
      const migrated = [];
      Object.keys(data || {}).forEach(key => {
        const owner = key.endsWith(':rooms') ? key.slice(0, -6) : '';
        (Array.isArray(data[key]) ? data[key] : []).forEach(item => {
          migrated.push(Object.assign({ player_id: owner }, item));
        });
      });
      return migrated;
    } catch (e) { return []; }
  }

  const api = {
    session: getSession,
    code: () => (getSession() || {}).room_code || '',
    playerId: pid,
    seat: () => {
      const s = getSession(), r = lastRoom;
      if (!r || !s) return -1;
      const p = (r.players_data || []).find(x => x.player_id === pid());
      return p ? p.seat : -1;
    },
    room: () => lastRoom,
    lastError: () => lastError,
    onChange(fn) { listeners.push(fn); return () => { listeners = listeners.filter(f => f !== fn); }; },

    async create(opts) {
      opts = opts || {};
      const t = myTribe();
      const setup = opts.setup || {
        mode: 'skirmish', seed: (Math.random() * 1e9) | 0, size: 'medium',
        n: opts.max || 4, biome: 'plains', fog: 'FULL', difficulty: 'normal', goal: { type: 'conquer' }
      };
      for (let attempt = 0; attempt < 4; attempt++) {
        const code = makeCode();
        const r = await rpc('fn_hf_create_room', {
          p_room: code, p_player: pid(), p_name: t.name, p_crest: t.crest, p_color: t.color,
          p_setup: setup, p_max: opts.max || 4
        });
        if (r.ok) {
          const room = row(r.data);
          setSession({ room_code: room.room_code, player_id: pid() });
          lastRoom = room;
          rememberRoom(room);
          return { ok: true, room };
        }
        if (!/ya existe/i.test(errMsg(r))) return { ok: false, msg: errMsg(r) };
      }
      return { ok: false, msg: 'No se pudo crear la sala' };
    },

    async join(code) {
      const t = myTribe();
      const r = await rpc('fn_hf_join_room', {
        p_room: String(code || '').toUpperCase().trim(), p_player: pid(),
        p_name: t.name, p_crest: t.crest, p_color: t.color
      });
      if (!r.ok) return { ok: false, msg: errMsg(r) };
      const room = row(r.data);
      setSession({ room_code: room.room_code, player_id: pid() });
      lastRoom = room;
      rememberRoom(room);
      return { ok: true, room };
    },

    myRooms: storedRooms,

    async refreshMyRooms() {
      const result = [];
      const currentPlayerId = pid();
      let onlineError = '';
      try {
        for (const saved of storedRooms()) {
          if (!HF.cloud || !HF.cloud.select) { result.push(saved); continue; }
          usePlayerId(saved.player_id);
          const r = await HF.cloud.select('hf_online_matches',
            'room_code=eq.' + encodeURIComponent(saved.code) + '&select=*');
          if (r.ok) {
            const room = row(r.data);
            if (room) {
              rememberRoom(room);
              result.push(Object.assign({}, room, { _resumePlayerId: saved.player_id }));
            }
          } else {
            result.push(saved);
            onlineError = errMsg(r);
          }
        }
        if (HF.cloud && HF.cloud.rpc) {
          const r = await rpc('fn_hf_list_my_rooms', { p_player: currentPlayerId });
          if (r.ok) {
            let rooms = r.data;
            if (typeof rooms === 'string') {
              try { rooms = JSON.parse(rooms); } catch (e) { rooms = []; }
            }
            if (!Array.isArray(rooms)) rooms = row(rooms) ? [row(rooms)] : [];
            rooms.forEach(room => {
              usePlayerId(currentPlayerId);
              rememberRoom(room);
              result.unshift(Object.assign({}, room, { _resumePlayerId: currentPlayerId }));
            });
          } else {
            onlineError = errMsg(r);
          }
        } else {
          onlineError = 'Cliente de Supabase no disponible.';
        }
      } finally {
        usePlayerId(currentPlayerId);
      }
      const unique = [];
      result.forEach(room => {
        const code = room.room_code || room.code;
        const owner = room._resumePlayerId || room.player_id;
        if (!unique.some(x => (x.room_code || x.code) === code && (x._resumePlayerId || x.player_id) === owner)) unique.push(room);
      });
      return { rooms: unique, error: onlineError };
    },

    async resume(saved) {
      if (!saved || !saved.code) return { ok: false, msg: 'Sala guardada no válida' };
      usePlayerId(saved.player_id);
      return api.join(saved.code);
    },

    suspend() {
      api.stop();
      setSession(null);
      lastRoom = null;
    },

    async publicRooms() {
      const r = await rpc('fn_hf_list_public_rooms', {});
      if (!r.ok) return { ok: false, msg: errMsg(r), rooms: [] };
      let rooms = r.data;
      if (typeof rooms === 'string') {
        try { rooms = JSON.parse(rooms); } catch (e) { rooms = []; }
      }
      if (!Array.isArray(rooms)) rooms = row(rooms) ? [row(rooms)] : [];
      return { ok: true, rooms };
    },

    async fillBots() {
      const s = getSession();
      if (!s) return { ok: false, msg: 'Sin sala' };
      const r = await rpc('fn_hf_fill_bots', { p_room: s.room_code, p_player: pid() });
      return r.ok ? { ok: true, room: (lastRoom = row(r.data)) } : { ok: false, msg: errMsg(r) };
    },

    async quickMatch(opts) {
      opts = opts || {};
      const t = myTribe();
      const setup = opts.setup || {
        mode: 'skirmish', seed: (Math.random() * 1e9) | 0, size: 'medium',
        n: opts.max || 4, biome: 'plains', fog: 'FULL', difficulty: 'normal', goal: { type: 'conquer' }
      };
      setup.is_public = true;
      const r = await rpc('fn_hf_quick_match', {
        p_room: makeCode(), p_player: pid(), p_name: t.name, p_crest: t.crest,
        p_color: t.color, p_setup: setup, p_max: opts.max || 4
      });
      if (!r.ok) return { ok: false, msg: errMsg(r) };
      const room = row(r.data);
      setSession({ room_code: room.room_code, player_id: pid() });
      lastRoom = room;
      rememberRoom(room);
      return { ok: true, room };
    },

    async state() {
      const s = getSession();
      if (!s) return { ok: true, room: null };
      if (!HF.cloud || !HF.cloud.select) return { ok: false, offline: true };
      const r = await HF.cloud.select('hf_online_matches', 'room_code=eq.' + encodeURIComponent(s.room_code) + '&select=*');
      if (!r.ok) return { ok: false, offline: r.offline, msg: errMsg(r) };
      const room = row(r.data);
      if (!room) { setSession(null); return { ok: true, room: null }; }
      lastRoom = room;
      rememberRoom(room);
      return { ok: true, room };
    },

    async start() {
      const s = getSession();
      if (!s) return { ok: false, msg: 'Sin sala' };
      const r = await rpc('fn_hf_start_room', { p_room: s.room_code, p_player: pid() });
      return r.ok ? { ok: true, room: (lastRoom = row(r.data)) } : { ok: false, msg: errMsg(r) };
    },

    async ready() {
      const s = getSession();
      if (!s) return { ok: false, msg: 'Sin sala' };
      const r = await rpc('fn_hf_set_player_ready', { p_room: s.room_code, p_player: pid() });
      return r.ok ? { ok: true, room: (lastRoom = row(r.data)) } : { ok: false, msg: errMsg(r) };
    },

    async submit(action) {
      const s = getSession();
      if (!s) return { ok: false, msg: 'Sin sala' };
      const r = await rpc('fn_hf_submit_action', { p_room: s.room_code, p_player: pid(), p_action: action || {} });
      return r.ok ? { ok: true, room: (lastRoom = row(r.data)) } : { ok: false, msg: errMsg(r) };
    },

    async contact() {
      const s = getSession();
      if (!s) return { ok: false };
      const r = await rpc('fn_hf_set_phase', { p_room: s.room_code, p_player: pid(), p_phase: 'TURN_BASED' });
      return r.ok ? { ok: true, room: (lastRoom = row(r.data)) } : { ok: false, msg: errMsg(r) };
    },

    async timeout() {
      const s = getSession();
      if (!s) return { ok: false };
      const r = await rpc('fn_hf_timeout', { p_room: s.room_code, p_player: pid() });
      return r.ok ? { ok: true, room: (lastRoom = row(r.data)) } : { ok: false, msg: errMsg(r) };
    },

    async leave() {
      const s = getSession();
      api.stop();
      setSession(null);
      lastRoom = null;
      if (!s) return { ok: true };
      const r = await rpc('fn_hf_leave_room', { p_room: s.room_code, p_player: pid() });
      return { ok: r.ok, msg: r.ok ? '' : errMsg(r) };
    },

    stop() {
      if (timer) { clearInterval(timer); timer = 0; }
      if (beat) { clearInterval(beat); beat = 0; }
    },

    // Arranca el sondeo de la sala y avisa con onChange(room).
    watch() {
      api.stop();
      const tick = async () => {
        if (G.document && G.document.hidden) return;
        const r = await api.state();
        if (r.ok && r.room) { lastRoom = r.room; listeners.forEach(fn => { try { fn(r.room); } catch (e) { } }); }
      };
      tick();
      timer = setInterval(tick, POLL_MS);
      beat = setInterval(() => {
        const s = getSession();
        if (s && !(G.document && G.document.hidden)) rpc('fn_hf_heartbeat', { p_room: s.room_code, p_player: pid() });
      }, HEARTBEAT_MS);
      return () => api.stop();
    },

    // --- partida: anfitrión autoritativo ---
    mySeat(room) {
      const me = api.me(room);
      return me ? me.seat - 1 : -1;
    },
    dirty(g) { if (g && g.online) g._onlineDirty = true; },

    async publish(state) {
      const s = getSession();
      if (!s) return { ok: false, msg: 'Sin sala' };
      const r = await rpc('fn_hf_publish_state', { p_room: s.room_code, p_player: pid(), p_state: state });
      return r.ok ? { ok: true, seq: (r.data && r.data.state_seq) || 0 } : { ok: false, msg: errMsg(r) };
    },

    // Abre el tablero: el anfitrión crea la partida desde el setup y publica el
    // estado; los invitados deserializan el último snapshot.
    async enterMatch() {
      let r = await api.state();
      if (!r.ok || !r.room) return { ok: false, msg: 'Sin sala' };
      let room = r.room;
      if (room.status !== 'ACTIVE') return { ok: false, msg: 'La partida no ha empezado' };
      const seat = api.mySeat(room);
      if (seat < 0) return { ok: false, msg: 'No estás en la sala' };
      const host = api.isHost(room);
      // El invitado espera hasta 10 s a que el anfitrión publique el estado.
      if (!host && !room.state_json) {
        for (let i = 0; i < 8 && !room.state_json; i++) {
          await new Promise(res => setTimeout(res, 1250));
          r = await api.state();
          if (r.ok && r.room) room = r.room;
        }
        if (!room.state_json) return { ok: false, msg: 'El anfitrión aún no ha abierto el tablero' };
      }
      let g;
      if (host) {
        if (room.state_json) { g = HF.deserialize(room.state_json); g._onlineAck = (room.actions || []).length; }
        else {
          const spec = Object.assign({}, room.setup_json || {});
          spec.mode = 'skirmish';
          const ps = api.players(room);
          // Solo las facciones con jugador: nada de IAs pasivas en la sala.
          spec.n = Math.max(2, ps.length);
          g = HF.makeGame(spec, HF.loadTribe());
          g.f.forEach((f, i) => {
            const p = ps.find(x => x.seat === i + 1);
            if (p) { f.name = p.name; f.crest = p.crest; f.color = SEAT_COLORS[i % SEAT_COLORS.length]; f.human = !p.is_bot; }
            else { f.human = false; f.color = SEAT_COLORS[i % SEAT_COLORS.length]; }
          });
          // El anfitrión aplicará desde la primera acción recibida.
          g._onlineAck = 0;
        }
      } else {
        g = HF.deserialize(room.state_json);
      }
      g.fog = g.fog || (room.setup_json && room.setup_json.fog) || 'FULL';
      g.fogMap = null;
      g.mySeat = host ? 0 : seat;
      g.online = { host, seat: g.mySeat, room_code: room.room_code };
      lastRoom = room;
      HF.updateFog(g);
      // Estado inicial autoritativo: sin esto el invitado nunca recibe el mapa.
      if (host && !room.state_json) {
        const pub = await api.publish(HF.serialize(g));
        if (!pub.ok) { console.error('[online] publicar estado inicial', pub); return { ok: false, msg: 'No se pudo publicar el estado: ' + (pub.msg || '') }; }
      }
      HF.startGame(g);
      return { ok: true };
    },

    async endTurn() {
      const s = getSession();
      if (!s) return { ok: false };
      const r = await rpc('fn_hf_end_turn', { p_room: s.room_code, p_player: pid() });
      return r.ok ? { ok: true, room: (lastRoom = row(r.data)) } : { ok: false, msg: errMsg(r) };
    },
    async timeoutPlayer(playerId) {
      const s = getSession();
      if (!s) return { ok: false };
      const r = await rpc('fn_hf_timeout', { p_room: s.room_code, p_player: playerId });
      return r.ok ? { ok: true, room: (lastRoom = row(r.data)) } : { ok: false };
    },
    async claimHost() {
      const s = getSession();
      if (!s) return { ok: false };
      const r = await rpc('fn_hf_claim_host', { p_room: s.room_code, p_player: pid() });
      return r.ok ? { ok: true, room: (lastRoom = row(r.data)) } : { ok: false, msg: errMsg(r) };
    },
    async heartbeat() {
      const s = getSession();
      if (!s) return { ok: false };
      return rpc('fn_hf_heartbeat', { p_room: s.room_code, p_player: pid() });
    },
    // Comprueba que el SQL del multijugador está instalado en Supabase.
    async ping() {
      const r = await rpc('fn_hf_ping', {});
      if (!r.ok) return { ok: false, msg: errMsg(r) };
      const required = [
        ['fn_hf_list_public_rooms', {}],
        ['fn_hf_list_my_rooms', { p_player: pid() }]
      ];
      for (const [fn, args] of required) {
        const check = await rpc(fn, args);
        if (!check.ok) return { ok: false, msg: errMsg(check) };
      }
      return { ok: true, data: r.data };
    },

    // Sondeo de la partida: el anfitrión aplica acciones ajenas y publica;
    // los invitados recargan el snapshot. Incluye relojes, bots y relevo.
    bind(g, refresh) {
      let seq = -1, stopped = false, claimTried = false, contactSent = false;
      let ack = g._onlineAck != null ? g._onlineAck : ((lastRoom && lastRoom.actions) ? lastRoom.actions.length : 0);
      const runBot = seat => {
        try { g.cur = Math.max(0, seat); HF.aiPlay(g, Math.max(0, seat)); return true; }
        catch (e) { console.warn('[online] bot', e); return false; }
        finally { g.cur = 0; }
      };
      const applyHost = room => {
        const acts = room.actions || [];
        let changed = false;
        for (; ack < acts.length; ack++) {
          const a = acts[ack];
          if (!a || a.player_id === pid()) continue;
          try {
            g.cur = Math.max(0, (a.seat || 1) - 1);
            const ac = a.action || {};
            if (ac.k === 'act') HF.act(g, ac.from, ac.to, ac.kind);
            else if (ac.k === 'build') HF.build(g, ac.b, ac.i);
            else if (ac.k === 'recruit') HF.recruit(g, ac.type, ac.i, undefined, ac.tier);
            changed = true;
          } catch (e) { console.warn('[online] acción remota', e); }
          g.cur = g.mySeat || 0;
        }
        g._onlineAck = ack;
        return changed;
      };
      const applyGuest = room => {
        if (!room.state_json || room.state_seq === seq) return false;
        seq = room.state_seq;
        try {
          const ng = HF.deserialize(room.state_json);
          const keep = { online: g.online, mySeat: g.mySeat };
          Object.assign(g, ng, keep);
          g.fogMap = null;
          HF.updateFog(g);
          return true;
        } catch (e) { console.warn('[online] snapshot', e); return false; }
      };
      const takeHost = room => {
        g.online.host = true;
        g.online.seat = api.mySeat(room);
        g.mySeat = g.online.seat;
        if (g._setSeat) g._setSeat(g.mySeat);
        g._onlineDirty = true;
      };
      const dropHost = room => {
        g.online.host = false;
        g.online.seat = api.mySeat(room);
        g.mySeat = g.online.seat;
        if (g._setSeat) g._setSeat(g.mySeat);
      };
      const tick = async () => {
        if (stopped || (G.document && G.document.hidden)) return;
        const r = await api.state();
        if (!r.ok || !r.room) return;
        let room = r.room;

        // Relevo: si el anfitrión lleva >20 s sin latir, otro jugador toma el
        // mando y el anterior pasa a bot.
        if (room.host_id !== pid()) {
          if (g.online.host) dropHost(room);
          const hp = (room.players_data || []).find(p => p.player_id === room.host_id);
          const stale = !hp || !hp.last_seen || (Date.now() - Date.parse(hp.last_seen) > 20000);
          if (stale && !claimTried) {
            claimTried = true;
            const c = await api.claimHost();
            if (c.ok) { room = c.room || room; takeHost(room); }
          }
        } else if (!g.online.host) { takeHost(room); claimTried = false; }
        else claimTried = false;

        if (g.online.host) {
          const changed = applyHost(room);
          let ended = false, acted = false;
          if (room.game_phase === 'TURN_BASED') {
            if (room.current_turn > g.turn && !g.over) { try { HF.mpEndRound(g); ended = true; } catch (e) { } }
            const act = (room.players_data || []).find(p => p.player_id === room.active_player);
            if (act) {
              if (api.timeLeft(room, act.player_id) <= 0 && !act.is_bot) {
                await api.timeoutPlayer(act.player_id);
              } else if (act.is_bot) {
                acted = runBot(act.seat - 1);
                refresh(); g._onlineDirty = true;
                const e = await api.endTurn();
                if (e.ok) {
                  room = e.room || room;
                  if (room.current_turn > g.turn) { try { HF.mpEndRound(g); ended = true; } catch (er) { } }
                }
              }
            }
          } else if (room.current_turn > g.turn && !g.over) {
            for (const p of api.players(room)) if (p.is_bot && p.player_id !== pid()) runBot(p.seat - 1);
            try { HF.mpEndRound(g); ended = true; } catch (e) { console.warn(e); }
          }
          if (room.game_phase === 'SIMULTANEOUS' && !contactSent && HF.hasContact(g)) {
            contactSent = true;
            const c = await api.contact();
            if (c.ok) room = c.room || room;
          }
          if (changed || ended || acted) { refresh(); g._onlineDirty = true; }
          if (g._onlineDirty) { g._onlineDirty = false; await api.publish(HF.serialize(g)); }
        } else {
          if (applyGuest(room)) refresh();
          if (room.game_phase === 'SIMULTANEOUS' && !contactSent && HF.hasContact(g)) {
            contactSent = true;
            await api.contact();
          }
        }
        // Reloj: al agotarse el banco se marca bot (cualquier cliente lo reporta).
        if (room.game_phase === 'TURN_BASED') {
          const act = (room.players_data || []).find(p => p.player_id === room.active_player);
          if (act && !act.is_bot && api.timeLeft(room, act.player_id) <= 0) await api.timeoutPlayer(act.player_id);
        }
      };
      const id = setInterval(tick, POLL_MS);
      const hb = setInterval(() => { if (!stopped) api.heartbeat(); }, HEARTBEAT_MS);
      tick();
      return () => { stopped = true; clearInterval(id); clearInterval(hb); };
    },

    // --- ayudas de presentación ---
    players(room) { return (room && room.players_data) || []; },
    me(room) { return api.players(room).find(p => p.player_id === pid()) || null; },
    isHost(room) { return !!room && room.host_id === pid(); },
    allReady(room) {
      const ps = api.players(room).filter(p => !p.is_bot);
      return ps.length > 0 && ps.every(p => p.is_ready);
    },
    timeLeft(room, playerId) {
      if (!room || room.game_phase !== 'TURN_BASED') return null;
      const p = api.players(room).find(x => x.player_id === playerId);
      if (!p) return null;
      const bank = Number(p.time_bank_seconds || 0);
      const started = Date.parse(room.turn_started_at || '') || Date.now();
      const used = Math.max(0, (Date.now() - started) / 1000);
      return Math.max(0, Math.round(bank - used));
    },
    fmtTime(sec) {
      if (sec == null) return '—';
      const m = Math.floor(sec / 60), s = sec % 60;
      return m + ':' + String(s).padStart(2, '0');
    },
    phaseLabel(room) {
      if (!room) return '';
      if (room.status === 'WAITING') return 'Esperando jugadores';
      if (room.status === 'FINISHED') return 'Partida terminada';
      return room.game_phase === 'TURN_BASED' ? 'Turnos individuales' : 'Turnos simultáneos';
    }
  };

  HF.online = api;

  // ---------- pantalla de sala ----------
  HF.screen('online', el => {
    let watching = false;
    const cleanups = [];
    const render = room => {
      const s = getSession();
      const ps = api.players(room);
      const me = api.me(room);
      const status = room ? api.phaseLabel(room) : '';
      const joinCard = `<div class="card">
        <b>Unirse a una sala</b>
        <p class="dim small">Pide el código al anfitrión; él elige el mapa, el bioma y la niebla.</p>
        <label>Código</label>
        <div class="row"><input id="scCode" maxlength="5" placeholder="ABCDE" style="text-transform:uppercase;flex:1;min-width:0"><button id="scJoin" class="pri">Entrar</button></div>
      </div>
      <div class="card">
        <b>Jugar ahora</b>
        <p class="dim small">Empareja con una partida pública o inicia una partida contra rivales controlados por la IA.</p>
        <div class="row" style="gap:6px"><button id="scQuick" class="pri grow">⚡ Búsqueda rápida</button><button id="scBot" class="grow">🤖 Jugar con bots</button></div>
      </div>
      <div class="card" id="scPublicCard">
        <b>Partidas públicas</b>
        <div id="scPublicList" class="dim small">Cargando partidas…</div>
      </div>
      <div class="card" id="scMyRoomsCard">
        <b>Mis salas</b>
        <div id="scMyRooms" class="dim small">Consultando salas guardadas y Supabase…</div>
      </div>
      <div class="card">
        <div class="dim small">Para crear una sala, elige la configuración en <b>Nueva partida</b> y pulsa “🌐 Crear sala en línea”.</div>
        <button id="scConfig" style="margin-top:6px">⚙️ Configurar partida</button>
        <button id="scTest" style="margin-top:6px">🔌 Probar conexión</button>
      </div>`;
      const rows = ps.map(p => `<div class="row" style="padding:5px 0;border-bottom:1px solid var(--line)">
        ${HF.crestHTML(p.crest, 24)}
        <div class="grow"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${SEAT_COLORS[(p.seat - 1) % SEAT_COLORS.length]};margin-right:6px;vertical-align:middle"></span><b>${HF.esc(p.name)}</b>${p.player_id === pid() ? ' <span class="sc-you">Tú</span>' : ''}${p.is_bot ? ' <span class="dim small">bot</span>' : ''}${room && room.active_player === p.player_id ? ' <span class="small" style="color:var(--acc)">▶ turno</span>' : ''}</div>
        <span class="dim small">${p.is_ready ? '✔ listo' : '…'}</span>
      </div>`).join('');
      const bank = room && room.game_phase === 'TURN_BASED' && me
        ? `<div class="small" style="margin-top:6px">⏱ Tu banco: ${api.fmtTime(api.timeLeft(room, pid()))}</div>` : '';
      const roomCodeTxt = room ? room.room_code : (s ? s.room_code : '');
      const su = room && room.setup_json;
      const suTxt = su && su.size && HF.SIZES[su.size] ? ` · ${HF.SIZES[su.size].name}` : '';
      const biTxt = su && su.biome && HF.BIOMES[su.biome] ? ` · ${HF.BIOMES[su.biome].name}` : '';
      const fogTxt = su && su.fog ? ` · ${({ FULL: 'niebla completa', EXPLORED: 'niebla explorada', NONE: 'sin niebla' })[su.fog] || ''}` : '';
      const roomCards = `<div class="card">
        <div class="row"><div class="grow"><div class="dim small">Sala</div><b style="font-size:22px;letter-spacing:3px">${HF.esc(roomCodeTxt)}</b></div>
        <button id="scCopy" style="min-height:36px">Copiar</button></div>
        <div class="dim small">${status}${room && room.status === 'ACTIVE' ? ' · Turno ' + room.current_turn : ''}${suTxt}${biTxt}${fogTxt}${su && su.seed ? ' · semilla ' + su.seed : ''}</div>
      </div>
      <div class="card"><b>Jugadores (${ps.length}/${room ? room.max_players : 4})</b>${rows}${bank}</div>
      ${ps.length < 2 ? `<p class="dim small">Comparte el código con otro jugador. Cada pestaña o ventana cuenta como un jugador distinto.</p>` : ''}
      <div class="row" style="gap:6px;flex-wrap:wrap">
        ${room && room.status === 'ACTIVE' ? `<button class="pri grow" id="scEnter">⚔️ Entrar al tablero</button>` : ''}
        ${room && room.status === 'WAITING' && api.isHost(room) ? `<button class="pri grow" id="scStart" ${ps.length < 2 ? 'disabled' : ''}>Iniciar partida</button>` : ''}
        ${room && room.status === 'WAITING' && api.isHost(room) ? `<button id="scFillBots">🤖 Rellenar con bots</button>` : ''}
        ${room && room.status === 'ACTIVE' && room.game_phase === 'SIMULTANEOUS' && me && !me.is_ready ? `<button class="pri grow" id="scReady">Estoy listo</button>` : ''}
        <button id="scLeave">Volver a Mis salas</button>
      </div>
      ${room && room.status === 'ACTIVE' ? `<p class="dim small" style="margin-top:8px">Niebla por jugador. La partida empieza en turnos simultáneos y pasa a turnos individuales con reloj cuando dos facciones se ven.</p>` : ''}
      <div class="card" id="scMyRoomsCard"><b>Mis salas</b><div id="scMyRooms" class="dim small">Consultando salas guardadas y Supabase…</div></div>`;
      el.innerHTML = `<div class="screen">${HF.header('🌐 Multijugador')}<div class="scroll">${!s ? joinCard : roomCards}<p class="dim small" id="scMsg" style="min-height:16px"></p></div></div>`;
      HF.wireBack(el);
      const msg = t => { const m = el.querySelector('#scMsg'); if (m) m.textContent = t || ''; };
      const q = s2 => el.querySelector(s2);
      const publicBox = q('#scPublicList');
      if (publicBox) {
        api.publicRooms().then(res => {
          if (!publicBox.isConnected) return;
          if (!res.ok) { publicBox.textContent = res.msg || 'No se pudieron cargar las partidas públicas'; return; }
          if (!res.rooms.length) { publicBox.textContent = 'No hay partidas públicas disponibles.'; return; }
          publicBox.innerHTML = res.rooms.map(room => `<div class="row" style="padding:5px 0;border-bottom:1px solid var(--line)">
            <div class="grow"><b>${HF.esc(room.room_code)}</b><div class="dim small">${room.status === 'WAITING' ? 'Esperando' : 'Activa'} · ${api.players(room).length}/${room.max_players} · turno ${room.current_turn || 1}</div></div>
            <button class="pubJoin" data-code="${HF.esc(room.room_code)}" ${room.status !== 'WAITING' ? 'disabled' : ''}>Entrar</button>
          </div>`).join('');
          publicBox.querySelectorAll('.pubJoin').forEach(btn => btn.onclick = async () => {
            btn.disabled = true;
            const r = await api.join(btn.dataset.code);
            if (!r.ok) return msg(r.msg);
            HF.sfx('good'); startWatch(); render(r.room);
          });
        });
      }
      const myBox = q('#scMyRooms');
      if (myBox) {
        const saved = api.myRooms();
        if (saved.length) myBox.innerHTML = saved.map(item => `<div class="row" style="padding:5px 0;border-bottom:1px solid var(--line)">
          <div class="grow"><b>${HF.esc(item.code)}</b><div class="dim small">${item.status === 'ACTIVE' ? 'Activa' : item.status === 'FINISHED' ? 'Terminada' : 'Esperando'} · turno ${item.turn || 1}</div></div>
          ${item.status !== 'FINISHED' ? `<button class="myJoin" data-code="${HF.esc(item.code)}" data-player="${HF.esc(item.player_id || '')}">Abrir</button>` : ''}
        </div>`).join('');
        myBox.querySelectorAll('.myJoin').forEach(btn => btn.onclick = async () => {
          btn.disabled = true;
          const r = await api.resume({ code: btn.dataset.code, player_id: btn.dataset.player });
          if (!r.ok) { btn.disabled = false; return msg(r.msg); }
          HF.sfx('good'); startWatch(); render(r.room);
        });
        api.refreshMyRooms().then(({ rooms, error }) => {
          if (!myBox.isConnected) return;
          if (!rooms.length) {
            myBox.textContent = error
              ? 'No se pudieron consultar tus salas en Supabase: ' + error
              : 'No hay salas guardadas ni partidas asociadas a este jugador.';
            return;
          }
          myBox.innerHTML = rooms.map(room => typeof room.room_code === 'undefined'
            ? `<div class="row" style="padding:5px 0"><div class="grow"><b>${HF.esc(room.code)}</b><div class="dim small">${room.status === 'ACTIVE' ? 'Activa' : room.status === 'FINISHED' ? 'Terminada' : 'Estado guardado'} · turno ${room.turn || 1}</div></div><button class="myJoin" data-code="${HF.esc(room.code)}" data-player="${HF.esc(room.player_id || '')}">Abrir</button></div>`
            : `<div class="row" style="padding:5px 0;border-bottom:1px solid var(--line)">
                <div class="grow"><b>${HF.esc(room.room_code)}</b><div class="dim small">${room.status === 'ACTIVE' ? 'Activa' : room.status === 'FINISHED' ? 'Terminada' : 'Esperando'} · turno ${room.current_turn || 1}</div></div>
                ${room.status !== 'FINISHED' ? `<button class="myJoin" data-code="${HF.esc(room.room_code)}" data-player="${HF.esc(room._resumePlayerId || room.host_id || '')}">Abrir</button>` : ''}
              </div>`).join('');
          myBox.querySelectorAll('.myJoin').forEach(btn => btn.onclick = async () => {
            btn.disabled = true;
            const r = await api.resume({ code: btn.dataset.code, player_id: btn.dataset.player });
            if (!r.ok) { btn.disabled = false; return msg(r.msg); }
            HF.sfx('good'); startWatch(); render(r.room);
          });
          if (error) {
            const note = document.createElement('p');
            note.className = 'dim small';
            note.textContent = 'Algunas salas muestran el estado guardado localmente: ' + error;
            myBox.appendChild(note);
          }
        }).catch(e => {
          if (!myBox.isConnected) return;
          console.error('[online] cargar Mis salas', e);
          if (!saved.length) myBox.textContent = 'No se pudo consultar Supabase. Revisa la conexión y vuelve a intentar.';
        });
      }
      if (q('#scConfig')) q('#scConfig').onclick = () => HF.go('newgame');
      if (q('#scJoin')) q('#scJoin').onclick = async () => {
        const code = (q('#scCode').value || '').trim().toUpperCase();
        if (code.length < 4) return msg('Escribe el código de la sala');
        msg('Entrando…');
        const r = await api.join(code);
        if (!r.ok) return msg(r.msg);
        HF.sfx('good'); startWatch(); render(api.room());
      };
      if (q('#scQuick')) q('#scQuick').onclick = async () => {
        const btn = q('#scQuick');
        btn.disabled = true; btn.textContent = 'Buscando…';
        const r = await api.quickMatch({ max: 4 });
        btn.disabled = false; btn.textContent = '⚡ Búsqueda rápida';
        if (!r.ok) return msg(r.msg);
        HF.sfx('good'); startWatch(); render(r.room);
      };
      if (q('#scBot')) q('#scBot').onclick = async () => {
        const btn = q('#scBot');
        btn.disabled = true; btn.textContent = 'Preparando IA…';
        const r = await api.create({
          max: 2,
          setup: { mode: 'skirmish', seed: (Math.random() * 1e9) | 0, size: 'medium',
            n: 2, biome: 'plains', fog: 'FULL', difficulty: 'normal', goal: { type: 'conquer' }, is_public: false }
        });
        if (!r.ok) { btn.disabled = false; btn.textContent = '🤖 Jugar con bots'; return msg(r.msg); }
        const bots = await api.fillBots();
        btn.disabled = false; btn.textContent = '🤖 Jugar con bots';
        if (!bots.ok) return msg(bots.msg);
        HF.sfx('good'); startWatch(); render(bots.room);
      };
      if (q('#scCopy')) q('#scCopy').onclick = () => {
        const code = room ? room.room_code : s.room_code;
        const btn = q('#scCopy');
        let copied = false;
        const showCopied = () => {
          copied = true;
          if (btn) { btn.textContent = '✓ Copiado'; btn.classList.add('pri'); }
          msg('Código copiado: ' + code);
          HF.toast('Código copiado: ' + code);
          setTimeout(() => { if (btn && el.isConnected) { btn.textContent = 'Copiar'; btn.classList.remove('pri'); } }, 1800);
        };
        const fallback = () => {
          const ta = document.createElement('textarea');
          ta.value = code;
          ta.setAttribute('readonly', '');
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          try {
            if (document.execCommand('copy')) showCopied();
            else { msg('No se pudo copiar automáticamente. Código: ' + code); HF.toast('Código: ' + code); }
          } catch (e) {
            msg('No se pudo copiar automáticamente. Código: ' + code);
            HF.toast('Código: ' + code);
          } finally { ta.remove(); }
        };
        try {
          if (G.navigator && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(code).then(showCopied).catch(fallback);
          } else fallback();
        } catch (e) { fallback(); }
      };
      if (q('#scStart')) q('#scStart').onclick = async () => {
        const r = await api.start();
        msg(r.ok ? '' : r.msg);
        if (r.ok) render(r.room);
      };
      if (q('#scFillBots')) q('#scFillBots').onclick = async () => {
        msg('Añadiendo rivales IA…');
        const r = await api.fillBots();
        if (!r.ok) return msg(r.msg);
        HF.sfx('good');
        render(r.room);
      };
      if (q('#scReady')) q('#scReady').onclick = async () => {
        const r = await api.ready();
        msg(r.ok ? '' : r.msg);
        if (r.ok) render(r.room);
      };
      if (q('#scTest')) q('#scTest').onclick = async () => {
        msg('Probando conexión…');
        const r = await api.ping();
        if (r.ok) msg('✅ Supabase responde y las funciones de salas públicas/guardadas están instaladas');
        else msg('❌ ' + r.msg);
      };
      if (q('#scLeave')) q('#scLeave').onclick = () => { stopWatch(); api.suspend(); render(null); };
      if (q('#scEnter')) q('#scEnter').onclick = async () => {
        msg('Abriendo el tablero…');
        const r = await api.enterMatch();
        if (!r.ok) return msg(r.msg);
      };
    };

    function startWatch() {
      if (watching) return;
      watching = true;
      cleanups.push(api.watch());
      cleanups.push(api.onChange(room => { if (el.isConnected) render(room); }));
    }

    function stopWatch() {
      watching = false;
      cleanups.splice(0).forEach(f => { try { f(); } catch (e) { console.warn('[online] limpieza', e); } });
    }

    HF.onLeave = () => { stopWatch(); api.stop(); };
    render(api.room());
    if (getSession()) {
      startWatch();
      api.state().then(r => { if (r.ok && r.room && el.isConnected) render(r.room); });
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
