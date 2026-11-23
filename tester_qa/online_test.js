'use strict';
// Prueba del cliente multijugador sin navegador: sesión, salas y ayudas de
// presentación (banco de tiempo, fase, listos) con una nube simulada.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HF = {};
const doc = {
  addEventListener() { },
  createElement() { return { style: {}, classList: { add() { }, remove() { } }, appendChild() { }, setAttribute() { } }; },
  getElementById() { return null; },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  documentElement: { dir: 'ltr' }
};
const sandbox = {
  console, HF, document: doc, window: null,
  navigator: { onLine: true, language: 'es' },
  localStorage: null,
  setTimeout, clearTimeout, setInterval, clearInterval,
  performance: { now: () => Date.now() }
};
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ['util.js', 'config.js', 'data.js', 'i18n.js', 'names.js', 'cloud.js', 'screens.js', 'online.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox);

let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };

const pid = HF.online.playerId();
let fakeRoom = null;
HF.cloud.rpc = async (fn, args) => {
  if (fn === 'fn_hf_turns_version') return { ok: true, data: 5 };
  if (fn === 'fn_hf_create_room' || fn === 'fn_hf_join_room') {
    fakeRoom = {
      room_code: args.p_room, host_id: args.p_player, status: 'WAITING', max_players: args.p_max || 4,
      players_data: [{ player_id: args.p_player, name: args.p_name, crest: args.p_crest, seat: 1, is_ready: false, is_bot: false, time_bank_seconds: 210 }],
      game_phase: 'SIMULTANEOUS', current_turn: 1, turn_started_at: new Date().toISOString(),
      setup_json: args.p_setup || {}
    };
    return { ok: true, data: fakeRoom };
  }
  return { ok: true, data: fakeRoom };
};
HF.cloud.select = async () => ({ ok: true, data: [fakeRoom] });

(async () => {
  const created = await HF.online.create({ max: 2 });
  ok(created.ok && !!created.room, 'crea la sala');
  ok(HF.online.code() === created.room.room_code, 'guarda el código en la sesión');
  ok(HF.online.me(created.room) && HF.online.me(created.room).player_id === pid, 'reconoce al jugador en la sala');
  ok(HF.online.isHost(created.room), 'el creador es anfitrión');
  ok(HF.online.phaseLabel(created.room) === 'Esperando jugadores', 'etiqueta de espera');
  ok(created.room.setup_json && typeof created.room.setup_json.seed === 'number', 'la sala lleva un setup con semilla');
  ok(created.room.setup_json.turns_version === 5, 'la sala nueva utiliza el protocolo v5');

  // Listos y fase
  const room = JSON.parse(JSON.stringify(created.room));
  room.setup_json.turns_version = 4;
  room.status = 'ACTIVE'; room.game_phase = 'TURN_BASED'; room.current_turn = 3;
  room.active_player = pid;
  room.turn_started_at = new Date(Date.now() - 10000).toISOString();
  room.players_data[0].time_bank_seconds = 210;
  room.players_data[0].is_ready = true;
  ok(HF.online.allReady(room), 'detecta que todos están listos');
  const left = HF.online.timeLeft(room, pid);
  ok(left <= 200 && left >= 195, `banco de tiempo descontado (${left}s)`);
  ok(HF.online.fmtTime(210) === '3:30', 'formatea el tiempo');
  ok(HF.online.phaseLabel(room) === 'Turnos individuales', 'etiqueta de turnos individuales');
  const simultaneousClock = {
    status: 'ACTIVE', game_phase: 'SIMULTANEOUS', setup_json: { turns_version: 5 },
    players_data: [
      { player_id: pid, turn_started_at: new Date(Date.now() - 10000).toISOString(), time_bank_seconds: 220 },
      { player_id: 'P-OTHER', turn_started_at: new Date(Date.now() - 20000).toISOString(), time_bank_seconds: 210 }
    ]
  };
  const myClock = HF.online.timeLeft(simultaneousClock, pid);
  const rivalClock = HF.online.timeLeft(simultaneousClock, 'P-OTHER');
  ok(myClock >= 209 && myClock <= 211 && rivalClock >= 189 && rivalClock <= 191,
    'fase simultánea calcula cada reloj y su tiempo adicional independientemente');
  simultaneousClock.players_data[0].is_ready = true;
  ok(HF.online.timeLeft(simultaneousClock, pid) === null, 'el turno simultáneo terminado no muestra un reloj activo');
  simultaneousClock.players_data[0].is_ready = false;
  simultaneousClock.game_phase = 'TURN_BASED';
  simultaneousClock.active_player = 'P-OTHER';
  ok(HF.online.timeLeft(simultaneousClock, pid) === null &&
    HF.online.timeLeft(simultaneousClock, 'P-OTHER') !== null,
  'fase alternada solo cuenta el reloj del jugador activo');
  ok(!HF.online.isBot({ player_id: 'P-HUMAN', is_bot: true }), 'una identidad humana marcada por error nunca se trata como IA');
  ok(HF.online.isBot({ player_id: 'BOT-2', is_bot: true }), 'un asiento de IA explícito sigue siendo bot');
  ok(!HF.online.isBot({ player_id: 'BOT-2', is_bot: false }), 'una identidad de bot sin marca activa no ejecuta IA');

  const state = await HF.online.state();
  ok(state.ok && state.room && state.room.room_code === room.room_code, 'descarga el estado de la sala');

  const myRoomsReply = [
    { room_code: 'MINE1', status: 'ACTIVE', players_data: [{ player_id: pid, is_bot: false }] },
    { room_code: 'OTHER', status: 'ACTIVE', players_data: [{ player_id: 'P-OTHER', is_bot: false }] },
    { room_code: 'BOT', status: 'ACTIVE', players_data: [{ player_id: pid, is_bot: true }] },
    { room_code: 'DONE', status: 'FINISHED', players_data: [{ player_id: pid, is_bot: false }] },
    ...['MINE2', 'MINE3', 'MINE4'].map(code => ({
      room_code: code, status: 'WAITING', players_data: [{ player_id: pid, is_bot: false }]
    }))
  ];
  HF.cloud.rpc = async fn => ({ ok: true, data: fn === 'fn_hf_list_my_rooms' ? myRoomsReply : [
    { room_code: 'OWN', status: 'WAITING', players_data: [{ player_id: pid }] },
    { room_code: 'OPEN', status: 'WAITING', players_data: [{ player_id: 'P-OTHER' }] },
    { room_code: 'PLAYING', status: 'ACTIVE', players_data: [{ player_id: 'P-OTHER' }] }
  ] });
  const mine = await HF.online.refreshMyRooms();
  ok(mine.rooms.length === 3 && mine.rooms.every(r => /^MINE/.test(r.room_code)),
    'Mis salas muestra como máximo tres salas abiertas donde participa el jugador actual');
  const available = await HF.online.publicRooms();
  ok(available.rooms.length === 1 && available.rooms[0].room_code === 'OPEN',
    'las salas públicas solo muestran salas ajenas que esperan jugadores');

  HF.cloud.rpc = async fn => fn === 'fn_hf_turns_version' ? { ok: true, data: 5 } : fn === 'fn_hf_create_room'
    ? { ok: true, data: Object.assign({}, fakeRoom, { room_code: 'EXIST' }) }
    : { ok: true, data: fakeRoom };
  const existingRoom = await HF.online.create();
  ok(existingRoom.ok && existingRoom.existing && HF.online.code() === 'EXIST',
    'crear abre la sala propia que ya esperaba rival');

  let called = '';
  HF.cloud.rpc = async (fn, args) => {
    called = fn;
    if (fn === 'fn_hf_turns_version') return { ok: true, data: 5 };
    return { ok: true, data: Object.assign({}, fakeRoom, {
      room_code: args.p_room || fakeRoom.room_code, setup_json: { quick_match: true }
    }) };
  };
  const quick = await HF.online.quickMatch();
  ok(quick.ok && called === 'fn_hf_quick_match_v2', 'búsqueda rápida usa la RPC con verificación de presencia');
  let versionFour = true;
  const savedQuickRpc = HF.cloud.rpc;
  HF.cloud.rpc = async (fn, args) => fn === 'fn_hf_turns_version' && versionFour
    ? { ok: true, data: 4 } : savedQuickRpc(fn, args);
  const notActivated = await HF.online.create();
  ok(!notActivated.ok && /no tiene activada/.test(notActivated.msg),
    'no crea una sala antes de activar v5 en el servidor');
  const pingOld = await HF.online.ping();
  ok(!pingOld.ok && /no tiene activada/.test(pingOld.msg),
    'probar conexión informa si el servidor aún no tiene v5');
  versionFour = false;
  HF.cloud.rpc = savedQuickRpc;
  await HF.online.join('ABCDE', true);
  ok(called === 'fn_hf_join_public_room_v2', 'la entrada pública valida la presencia del anfitrión');
  await HF.online.join('ABCDE');
  ok(called === 'fn_hf_join_room', 'la entrada privada conserva la RPC por código');
  await HF.online.timeoutPlayer(pid);
  ok(called === 'fn_hf_skip_expired_turn', 'un turno vencido no usa la RPC que sustituía al jugador por un bot');
  await HF.online.claimHost();
  ok(called === 'fn_hf_claim_host_v2', 'el relevo usa la RPC que conserva a los jugadores humanos');
  await HF.online.hostActionTime('2026-01-01T00:00:00Z');
  ok(called === 'fn_hf_host_action_time', 'el anfitrión solicita tiempo tras una acción realizada');
  await HF.online.closeWaitingRoom();
  ok(called === 'fn_hf_close_waiting_room' && !HF.online.session(),
    'cerrar una sala propia en espera abandona la sesión');

  const actionGame = { cur: 0, f: [{}, {}], cells: [] };
  const invoked = [];
  HF.act = (game, from, to, kind) => {
    invoked.push(['act', game.cur, from, to, kind]);
    return { ok: false, msg: 'Movimiento inválido' };
  };
  HF.build = (game, building, cell) => {
    invoked.push(['build', game.cur, building, cell]);
    return { ok: true };
  };
  HF.recruit = (game, type, cell, unused, tier) => {
    invoked.push(['recruit', game.cur, type, cell, tier]);
    return { ok: true };
  };
  const rejected = HF.online.applyRemoteAction(actionGame, {
    seat: 2, action: { k: 'act', from: 1, to: 2, kind: 'move' }
  });
  ok(!rejected.ok && rejected.msg === 'Movimiento inválido' && actionGame.cur === 0,
    'distingue una acción remota rechazada y restaura el jugador actual');
  ok(HF.online.applyRemoteAction(actionGame, {
    seat: 2, action: { k: 'build', b: 3, i: 4 }
  }).ok && HF.online.applyRemoteAction(actionGame, {
    seat: 2, action: { k: 'recruit', type: 'INF', i: 5, tier: 2 }
  }).ok && invoked.every(call => call[1] === 1) && actionGame.cur === 0,
  'aplica construcción y reclutamiento con el asiento correcto');
  ok(!HF.online.applyRemoteAction(actionGame, { seat: 3, action: { k: 'act' } }).ok &&
    !HF.online.applyRemoteAction(actionGame, { seat: 2, action: { k: 'unknown' } }).ok,
  'rechaza asientos y acciones desconocidas sin ejecutar el motor');
  HF.sendCargo = (game, from, to, resource, quantity) =>
    ({ ok: game.cur === 1 && from === 4 && to === 5 && resource === 'food' && quantity === 10 });
  actionGame.cells[4] = { o: 1 };
  ok(HF.online.applyRemoteAction(actionGame, { seat: 2, action: {
    k: 'cargo', from: 4, to: 5, resource: 'food', quantity: 10
  } }).ok, 'el transporte de carga se aplica en el asiento del jugador');
  actionGame.cells[4].o = 0;
  ok(!HF.online.applyRemoteAction(actionGame, { seat: 2, action: {
    k: 'cargo', from: 4, to: 5, resource: 'food', quantity: 10
  } }).ok, 'no permite enviar carga desde un puerto de otro jugador');
  HF.Diplomacy = {
    respondToTreaty(game, treaty, responder, response) {
      return { success: game.cur === 1 && treaty === 7 && responder === 1 && response === 'accept' };
    }
  };
  ok(HF.online.applyRemoteAction(actionGame, { seat: 2, action: {
    k: 'diplomacy', op: 'respond', treaty: 7, response: 'accept'
  } }).ok, 'la diplomacia se valida con el asiento del jugador');
  delete HF.Diplomacy;
  HF.act = () => { throw new Error('Error del motor'); };
  let actionError = '';
  try { HF.online.applyRemoteAction(actionGame, { seat: 2, action: { k: 'act' } }); }
  catch (e) { actionError = e.message; }
  ok(actionError === 'Error del motor' && actionGame.cur === 0,
    'propaga errores del motor y restaura el jugador actual');

  const savedDeserialize = HF.deserialize, savedSerialize = HF.serialize, savedRpc = HF.cloud.rpc;
  const v5Room = {
    room_code: 'V5TEST', host_id: pid, setup_json: { turns_version: 5 }, state_seq: 4,
    state_json: { cur: 0, f: [{}, {}], value: 1 },
    actions: [{ id: 'one', status: 'pending', seat: 2, action: { k: 'act' } }]
  };
  HF.deserialize = state => JSON.parse(JSON.stringify(state));
  HF.serialize = state => JSON.parse(JSON.stringify(state));
  let commitArgs;
  HF.cloud.rpc = async (fn, args) => {
    commitArgs = { fn, args };
    return { ok: true, data: Object.assign({}, v5Room, {
      actions: [{ id: 'one', status: args.p_accepted ? 'accepted' : 'rejected' }]
    }) };
  };
  HF.act = game => { game.value++; return { ok: true }; };
  let processed = await HF.online.processNextV5Action(v5Room);
  ok(processed.ok && processed.accepted && commitArgs.fn === 'fn_hf_v5_commit_action' &&
    commitArgs.args.p_state_seq === 4 && commitArgs.args.p_state.value === 2 &&
    commitArgs.args.p_state.cur === 0 && v5Room.state_json.value === 1,
  'valida la acción sobre una copia y confirma estado y versión juntos');
  HF.act = () => ({ ok: false, msg: 'Acción inválida' });
  processed = await HF.online.processNextV5Action(v5Room);
  ok(processed.ok && !processed.accepted && commitArgs.args.p_state === null &&
    commitArgs.args.p_message === 'Acción inválida',
  'rechaza una acción inválida sin enviar un estado nuevo');
  HF.cloud.rpc = async () => ({ ok: true, data: Object.assign({}, v5Room, {
    actions: [{ id: 'one', status: 'rejected' }]
  }) });
  HF.act = () => ({ ok: true });
  processed = await HF.online.processNextV5Action(v5Room);
  ok(processed.ok && !processed.accepted, 'respeta el resultado ya confirmado al reintentar');
  processed = await HF.online.processNextV5Action(Object.assign({}, v5Room, { actions: [] }));
  ok(processed.ok && !processed.processed, 'no confirma nada si la cola está vacía');
  const savedSelect = HF.cloud.select;
  HF.cloud.select = async () => ({ ok: true, data: [v5Room] });
  HF.store.set('online_session', { room_code: v5Room.room_code, player_id: pid });
  await HF.online.state();
  HF.cloud.rpc = async (fn, args) => {
    commitArgs = { fn, args };
    return { ok: true, data: { id: 'queued', status: 'pending' } };
  };
  const queued = await HF.online.submit({ k: 'act', from: 0, to: 1 });
  ok(queued.ok && queued.pending && commitArgs.fn === 'fn_hf_v5_enqueue_action' &&
    commitArgs.args.p_room === v5Room.room_code,
  'el jugador en v5 envía su acción a la cola transaccional');
  HF.cloud.rpc = async (fn, args) => {
    commitArgs = { fn, args };
    return { ok: true, data: v5Room };
  };
  await HF.online.ready();
  ok(commitArgs.fn === 'fn_hf_v5_ready', 'confirmar un turno v5 usa el servidor nuevo');
  await HF.online.endTurn();
  ok(commitArgs.fn === 'fn_hf_v5_ready', 'finalizar un turno humano v5 usa el servidor nuevo');
  await HF.online.timeoutPlayer('P-OTHER');
  ok(commitArgs.fn === 'fn_hf_v5_tick' && commitArgs.args.p_player === pid,
    'el progreso v5 usa la identidad del participante que consulta');
  await HF.online.contact();
  ok(commitArgs.fn === 'fn_hf_v5_contact', 'el contacto v5 usa su propia transición');
  await HF.online.claimHost();
  ok(commitArgs.fn === 'fn_hf_v5_claim_host', 'el relevo v5 valida al participante');
  await HF.online.heartbeat();
  ok(commitArgs.fn === 'fn_hf_v5_heartbeat', 'la presencia v5 no restaura jugadores reemplazados');
  const savedAiPlay = HF.aiPlay, savedMpEndRound = HF.mpEndRound;
  HF.aiPlay = (game, seat) => { game.f[seat].played = true; };
  HF.mpEndRound = game => { game.turn++; };
  const engineRoom = {
    room_code: 'V5TEST', host_id: pid, state_seq: 3, current_turn: 1,
    game_phase: 'TURN_BASED', active_player: 'BOT-2',
    state_json: { turn: 1, cur: 0, f: [{}, {}] },
    players_data: [{ seat: 1, player_id: pid, is_bot: false },
      { seat: 2, player_id: 'BOT-2', is_bot: true }]
  };
  HF.cloud.rpc = async (fn, args) => {
    commitArgs = { fn, args };
    return { ok: true, data: engineRoom };
  };
  const botTurn = await HF.online.processV5Engine(engineRoom, 'bot');
  ok(botTurn.ok && commitArgs.fn === 'fn_hf_v5_commit_engine' &&
    commitArgs.args.p_kind === 'bot' && commitArgs.args.p_state.f[1].played &&
    !engineRoom.state_json.f[1].played,
  'procesa el bot en una copia y guarda con control de versión');
  engineRoom.game_phase = 'SIMULTANEOUS'; engineRoom.current_turn = 2;
  const newRound = await HF.online.processV5Engine(engineRoom, 'round');
  ok(newRound.ok && commitArgs.args.p_kind === 'round' &&
    commitArgs.args.p_state.turn === 2 && commitArgs.args.p_state.f[1].played,
  'sincroniza la ronda y ejecuta los bots simultáneos antes de avanzar');
  engineRoom.players_data[1].bot_from_round = 2;
  const historicalRound = await HF.online.processV5Engine(engineRoom, 'round');
  ok(historicalRound.ok && !commitArgs.args.p_state.f[1].played && commitArgs.args.p_state.f[1].human,
    'no ejecuta al bot en una ronda anterior a su sustitución');
  delete engineRoom.players_data[1].bot_from_round;
  engineRoom.setup_json = { turns_version: 5, bot_backlog: [{ turn: 1, player_id: 'BOT-2', seat: 2 }] };
  engineRoom.active_player = pid;
  const replayBot = await HF.online.processV5Engine(engineRoom, 'backlog');
  ok(replayBot.ok && commitArgs.args.p_kind === 'backlog' && commitArgs.args.p_active === 'BOT-2' &&
    commitArgs.args.p_state.f[1].played,
  'reproduce el turno de bot pendiente antes de continuar la partida');
  HF.aiPlay = savedAiPlay; HF.mpEndRound = savedMpEndRound;
  HF.cloud.select = savedSelect;
  HF.deserialize = savedDeserialize; HF.serialize = savedSerialize; HF.cloud.rpc = savedRpc;

  const savedMakeGame = HF.makeGame, savedLoadTribe = HF.loadTribe;
  const savedUpdateFog = HF.updateFog, savedStartGame = HF.startGame;
  const savedTimeout = sandbox.setTimeout, savedSelectForStart = HF.cloud.select;
  const savedRpcForStart = HF.cloud.rpc, savedSerializeForStart = HF.serialize, savedDeserializeForStart = HF.deserialize;
  let orphanRoom = {
    room_code: 'ORPHAN', status: 'ACTIVE', host_id: 'P-OLD', state_json: null,
    setup_json: { turns_version: 5 }, players_data: [
      { player_id: 'P-OLD', seat: 1, is_bot: false },
      { player_id: pid, seat: 2, is_bot: false }
    ]
  };
  let initialRpc = '', startedGame;
  HF.store.set('online_session', { room_code: orphanRoom.room_code, player_id: pid });
  sandbox.setTimeout = fn => { fn(); return 1; };
  HF.makeGame = () => ({ turn: 1, f: [{}, {}] });
  HF.loadTribe = () => ({});
  HF.updateFog = () => {};
  HF.startGame = game => { startedGame = game; };
  HF.serialize = game => JSON.parse(JSON.stringify(game));
  HF.deserialize = state => JSON.parse(JSON.stringify(state));
  HF.cloud.select = async () => ({ ok: true, data: [orphanRoom] });
  HF.cloud.rpc = async (fn, args) => {
    if (fn === 'fn_hf_turns_version') return { ok: true, data: 5 };
    if (fn === 'fn_hf_v5_claim_host') {
      orphanRoom = Object.assign({}, orphanRoom, { host_id: pid });
      return { ok: true, data: orphanRoom };
    }
    if (fn === 'fn_hf_v5_publish_initial_state') {
      initialRpc = fn;
      orphanRoom = Object.assign({}, orphanRoom, { state_json: args.p_state, state_seq: 1 });
      return { ok: true, data: orphanRoom };
    }
    return { ok: false, error: 'RPC no esperada: ' + fn };
  };
  const recoveredStart = await HF.online.enterMatch();
  ok(recoveredStart.ok && initialRpc === 'fn_hf_v5_publish_initial_state' &&
    startedGame && startedGame.online.host && startedGame.mySeat === 1,
  'el invitado recupera al anfitrión ausente y publica el tablero inicial v5');
  sandbox.setTimeout = savedTimeout;
  HF.makeGame = savedMakeGame; HF.loadTribe = savedLoadTribe;
  HF.updateFog = savedUpdateFog; HF.startGame = savedStartGame;
  HF.cloud.select = savedSelectForStart; HF.cloud.rpc = savedRpcForStart;
  HF.serialize = savedSerializeForStart; HF.deserialize = savedDeserializeForStart;

  const savedStateForReplacement = HF.online.state, savedGo = HF.go, savedToast = HF.toast;
  const savedClaim = HF.online.claimHost;
  let replacementNotice = '', replacementRoute = '', replacementClaims = 0;
  HF.online.state = async () => ({ ok: true, room: {
    room_code: 'V5TEST', status: 'ACTIVE', host_id: pid,
    setup_json: { turns_version: 5 }, players_data: [
      { player_id: 'BOT-1', seat: 1, is_bot: true, replaced_player_id: pid }
    ]
  } });
  HF.toast = text => { replacementNotice = text; };
  HF.go = route => { replacementRoute = route; };
  HF.online.claimHost = async () => { replacementClaims++; return { ok: true }; };
  const replacementGame = { online: { host: true, seat: 0 }, mySeat: 0, f: [{}], turn: 1 };
  const stopReplacement = HF.online.bind(replacementGame, () => {});
  await new Promise(resolve => setTimeout(resolve, 50));
  stopReplacement();
  ok(replacementRoute === 'online' && /reemplazado/.test(replacementNotice) && replacementClaims === 0,
    'el jugador reemplazado sale del tablero sin recuperar el control de la sala');
  HF.online.state = savedStateForReplacement; HF.go = savedGo;
  HF.toast = savedToast; HF.online.claimHost = savedClaim;

  const savedState = HF.online.state, savedPublish = HF.online.publish;
  const syncRoom = {
    host_id: pid, status: 'ACTIVE', game_phase: 'SIMULTANEOUS', current_turn: 1,
    players_data: [{ player_id: pid, seat: 1 }], actions: []
  };
  HF.online.state = async () => ({ ok: true, room: syncRoom });
  let attempts = 0, confirmations = 0, warnings = 0;
  HF.online.publish = async () => ++attempts === 1 ? { ok: false, msg: 'error de prueba' } : { ok: true };
  HF.serialize = () => ({});
  HF.hasContact = () => false;
  HF.toast = () => { warnings++; };
  const syncGame = { online: { host: true, seat: 0 }, mySeat: 0, turn: 1, over: { winner: 0 }, _onlineDirty: true };
  const stop = HF.online.bind(syncGame, confirmed => { if (confirmed) confirmations++; });
  await new Promise(resolve => setTimeout(resolve, 100));
  ok(syncGame._onlineDirty && confirmations === 0 && warnings === 1, 'fallo de publicación conserva el estado y no confirma el resultado');
  await new Promise(resolve => setTimeout(resolve, 1800));
  stop();
  ok(attempts >= 2 && !syncGame._onlineDirty && confirmations > 0, 'reintenta y confirma el resultado tras publicar');
  HF.online.state = savedState;
  HF.online.publish = savedPublish;

  const savedContact = HF.online.contact, savedEndTurn = HF.online.endTurn;
  const contactRoom = {
    host_id: pid, status: 'ACTIVE', game_phase: 'SIMULTANEOUS', current_turn: 1,
    turn_started_at: new Date().toISOString(), active_player: pid,
    players_data: [
      { player_id: pid, seat: 1, is_bot: false, time_bank_seconds: 210 },
      { player_id: 'P-HUMAN', seat: 2, is_bot: true, time_bank_seconds: 210 }
    ], actions: []
  };
  let botCalls = 0, contactCalls = 0;
  HF.aiPlay = () => { botCalls++; };
  HF.hasContact = () => true;
  HF.online.state = async () => ({ ok: true, room: contactRoom });
  HF.online.contact = async () => {
    contactCalls++;
    contactRoom.game_phase = 'TURN_BASED';
    contactRoom.active_player = 'P-HUMAN';
    return { ok: true, room: contactRoom };
  };
  HF.online.endTurn = async () => { throw new Error('No debe ceder el turno del humano'); };
  const controlGame = { online: { host: true, seat: 0 }, mySeat: 0, turn: 1,
    f: [{ human: true }, { human: false }] };
  const stopControl = HF.online.bind(controlGame, () => {});
  await new Promise(resolve => setTimeout(resolve, 900));
  stopControl();
  ok(contactCalls === 1 && contactRoom.game_phase === 'TURN_BASED', 'el contacto cambia a turnos individuales una sola vez');
  ok(botCalls === 0 && controlGame.f[1].human, 'la IA no controla al humano marcado erróneamente al contacto');
  HF.online.state = savedState;
  HF.online.contact = savedContact;
  HF.online.endTurn = savedEndTurn;

  await HF.online.leave();
  ok(HF.online.session() === null, 'salir borra la sesión');

  // 5. Errores de la RPC visibles (p. ej. si falta ejecutar el SQL).
  HF.cloud.rpc = async fn => fn === 'fn_hf_turns_version' ? { ok: true, data: 5 }
    : ({ ok: false, status: 404, data: { message: 'Could not find the function public.fn_hf_create_room' } });
  const bad = await HF.online.create({ max: 2 });
  ok(!bad.ok && /hf_multiplayer\.sql/.test(bad.msg || ''), 'propaga el error de la RPC al formulario');
  ok(/hf_multiplayer\.sql/.test(HF.online.lastError()), 'guarda el último error para mostrarlo');

  console.log(fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK');
  process.exit(fail ? 1 : 0);
})();
