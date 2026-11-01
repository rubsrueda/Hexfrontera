/* Multijugador en red (salas de hasta 4 jugadores).
   Transporte: REST + RPC de Supabase (sql/hf_multiplayer.sql) con sondeo del
   estado, que tolera cambios de app y reconexiones. La partida se juega en el
   tablero local; cada cliente aplica las acciones de la sala. */
(function (G) {
  const HF = G.HF;
  const KEY = 'online_session';
  const POLL_MS = 1600;
  const HEARTBEAT_MS = 9000;
  const CODE_ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  const getSession = () => HF.store.get(KEY, null);
  const setSession = s => (s ? HF.store.set(KEY, s) : HF.store.del(KEY));
  const pid = () => (HF.cloud && HF.cloud.playerId ? HF.cloud.playerId() : '');
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
    lastError = r && r.offline ? 'Sin conexión' : 'No se pudo completar (HTTP ' + ((r && r.status) || '?') + ')';
    console.warn('[online]', r);
    return lastError;
  }
  function myTribe() {
    const t = HF.loadTribe ? HF.loadTribe() : {};
    return { name: t.name || 'Jugador', crest: t.crest || 'c01', color: t.color || '#3b82f6' };
  }

  let timer = 0, beat = 0, lastRoom = null, listeners = [], lastError = '';

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
        if (room.state_json) g = HF.deserialize(room.state_json);
        else {
          const spec = Object.assign({}, room.setup_json || {});
          spec.mode = 'skirmish';
          const ps = api.players(room);
          // Solo las facciones con jugador: nada de IAs pasivas en la sala.
          spec.n = Math.max(2, ps.length);
          g = HF.makeGame(spec, HF.loadTribe());
          g.f.forEach((f, i) => {
            const p = ps.find(x => x.seat === i + 1);
            if (p) { f.name = p.name; f.crest = p.crest; f.color = p.color_hex; f.human = true; }
            else f.human = false;
          });
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
      return r.ok ? { ok: true, data: r.data } : { ok: false, msg: errMsg(r) };
    },

    // Sondeo de la partida: el anfitrión aplica acciones ajenas y publica;
    // los invitados recargan el snapshot. Incluye relojes, bots y relevo.
    bind(g, refresh) {
      let seq = -1, ack = null, stopped = false, claimTried = false, contactSent = false;
      const runBot = seat => {
        try { g.cur = Math.max(0, seat); HF.aiPlay(g, Math.max(0, seat)); return true; }
        catch (e) { console.warn('[online] bot', e); return false; }
        finally { g.cur = 0; }
      };
      const applyHost = room => {
        const acts = room.actions || [];
        if (ack === null) { ack = acts.length; return false; }
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
          g.cur = 0;
        }
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
      const createCard = `<div class="card">
        <b>Crear una sala</b>
        <p class="dim small">Se juega con un mapa y una semilla compartidos; hasta 4 jugadores.</p>
        <label>Jugadores</label>
        <div class="row" id="scMax">${[2, 3, 4].map(n => `<button data-max="${n}" class="${n === 4 ? 'sel' : ''}">${n}</button>`).join('')}</div>
        <button class="pri big" id="scCreate" style="margin-top:8px">Crear sala</button>
      </div>
      <div class="card">
        <b>Unirse a una sala</b>
        <label>Código</label>
        <div class="row"><input id="scCode" maxlength="5" placeholder="ABCDE" style="text-transform:uppercase;flex:1;min-width:0"><button id="scJoin" class="pri">Entrar</button></div>
      </div>
      <div class="card">
        <div class="dim small">Si algo falla, comprueba que ejecutaste <b>sql/hf_multiplayer.sql</b> en Supabase.</div>
        <button id="scTest" style="margin-top:6px">🔌 Probar conexión</button>
      </div>`;
      const rows = ps.map(p => `<div class="row" style="padding:5px 0;border-bottom:1px solid var(--line)">
        ${HF.crestHTML(p.crest, 24)}
        <div class="grow"><b>${HF.esc(p.name)}</b>${p.player_id === pid() ? ' <span class="sc-you">Tú</span>' : ''}${p.is_bot ? ' <span class="dim small">bot</span>' : ''}${room && room.active_player === p.player_id ? ' <span class="small" style="color:var(--acc)">▶ turno</span>' : ''}</div>
        <span class="dim small">${p.is_ready ? '✔ listo' : '…'}</span>
      </div>`).join('');
      const bank = room && room.game_phase === 'TURN_BASED' && me
        ? `<div class="small" style="margin-top:6px">⏱ Tu banco: ${api.fmtTime(api.timeLeft(room, pid()))}</div>` : '';
      const roomCodeTxt = room ? room.room_code : (s ? s.room_code : '');
      const roomCards = `<div class="card">
        <div class="row"><div class="grow"><div class="dim small">Sala</div><b style="font-size:22px;letter-spacing:3px">${HF.esc(roomCodeTxt)}</b></div>
        <button id="scCopy" style="min-height:36px">Copiar</button></div>
        <div class="dim small">${status}${room && room.status === 'ACTIVE' ? ' · Turno ' + room.current_turn : ''}${room && room.setup_json && room.setup_json.seed ? ' · semilla ' + room.setup_json.seed : ''}</div>
      </div>
      <div class="card"><b>Jugadores (${ps.length}/${room ? room.max_players : 4})</b>${rows}${bank}</div>
      ${ps.length < 2 ? `<p class="dim small">Comparte el código con otro jugador. Para probar tú solo, abre el juego en una <b>ventana de incógnito</b>: dos pestañas normales comparten el mismo jugador.</p>` : ''}
      <div class="row" style="gap:6px;flex-wrap:wrap">
        ${room && room.status === 'ACTIVE' ? `<button class="pri grow" id="scEnter">⚔️ Entrar al tablero</button>` : ''}
        ${room && room.status === 'WAITING' && api.isHost(room) ? `<button class="pri grow" id="scStart" ${ps.length < 2 ? 'disabled' : ''}>Iniciar partida</button>` : ''}
        ${room && room.status === 'ACTIVE' && room.game_phase === 'SIMULTANEOUS' && me && !me.is_ready ? `<button class="pri grow" id="scReady">Estoy listo</button>` : ''}
        <button id="scLeave">Salir de la sala</button>
      </div>
      ${room && room.status === 'ACTIVE' ? `<p class="dim small" style="margin-top:8px">Niebla por jugador. La partida empieza en turnos simultáneos y pasa a turnos individuales con reloj cuando dos facciones se ven.</p>` : ''}
      <p class="dim small" id="scMsg" style="min-height:16px"></p>`;
      el.innerHTML = `<div class="screen">${HF.header('🌐 Multijugador')}<div class="scroll">${!s ? createCard : roomCards}<p class="dim small" id="scMsg" style="min-height:16px"></p></div></div>`;
      HF.wireBack(el);
      const msg = t => { const m = el.querySelector('#scMsg'); if (m) m.textContent = t || ''; };
      const maxSel = el.querySelector('#scMax');
      let max = 4;
      if (maxSel) maxSel.querySelectorAll('[data-max]').forEach(b => b.onclick = () => {
        max = +b.dataset.max;
        maxSel.querySelectorAll('[data-max]').forEach(x => x.classList.toggle('sel', x === b));
      });
      const q = s2 => el.querySelector(s2);
      if (q('#scCreate')) q('#scCreate').onclick = async () => {
        msg('Creando…');
        try {
          const r = await api.create({ max });
          if (!r.ok) { console.error('[online] crear sala', r); return msg('⚠ ' + r.msg); }
          HF.sfx('good'); startWatch(); render(api.room());
        } catch (e) { console.error('[online] crear sala', e); msg('⚠ ' + (e.message || e)); }
      };
      if (q('#scJoin')) q('#scJoin').onclick = async () => {
        const code = (q('#scCode').value || '').trim().toUpperCase();
        if (code.length < 4) return msg('Escribe el código de la sala');
        msg('Entrando…');
        const r = await api.join(code);
        if (!r.ok) return msg(r.msg);
        HF.sfx('good'); startWatch(); render(api.room());
      };
      if (q('#scCopy')) q('#scCopy').onclick = () => {
        const code = room ? room.room_code : s.room_code;
        try { navigator.clipboard.writeText(code); msg('Código copiado: ' + code); } catch (e) { msg('Código: ' + code); }
      };
      if (q('#scStart')) q('#scStart').onclick = async () => {
        const r = await api.start();
        msg(r.ok ? '' : r.msg);
        if (r.ok) render(r.room);
      };
      if (q('#scReady')) q('#scReady').onclick = async () => {
        const r = await api.ready();
        msg(r.ok ? '' : r.msg);
        if (r.ok) render(r.room);
      };
      if (q('#scTest')) q('#scTest').onclick = async () => {
        msg('Probando conexión…');
        const r = await api.ping();
        if (r.ok) msg('✅ Conexión correcta · funciones del multijugador instaladas');
        else msg('❌ ' + r.msg);
      };
      if (q('#scLeave')) q('#scLeave').onclick = async () => { await api.leave(); render(null); };
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

    HF.onLeave = () => { api.stop(); cleanups.forEach(f => { try { f(); } catch (e) { } }); };
    render(api.room());
    if (getSession()) {
      startWatch();
      api.state().then(r => { if (r.ok && r.room && el.isConnected) render(r.room); });
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
