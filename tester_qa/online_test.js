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

const pid = HF.cloud.playerId();
let fakeRoom = null;
HF.cloud.rpc = async (fn, args) => {
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

  // Listos y fase
  const room = JSON.parse(JSON.stringify(created.room));
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

  const state = await HF.online.state();
  ok(state.ok && state.room && state.room.room_code === room.room_code, 'descarga el estado de la sala');

  await HF.online.leave();
  ok(HF.online.session() === null, 'salir borra la sesión');

  // 5. Errores de la RPC visibles (p. ej. si falta ejecutar el SQL).
  HF.cloud.rpc = async () => ({ ok: false, status: 404, data: { message: 'Could not find the function public.fn_hf_create_room' } });
  const bad = await HF.online.create({ max: 2 });
  ok(!bad.ok && /hf_multiplayer\.sql/.test(bad.msg || ''), 'propaga el error de la RPC al formulario');
  ok(/hf_multiplayer\.sql/.test(HF.online.lastError()), 'guarda el último error para mostrarlo');

  console.log(fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK');
  process.exit(fail ? 1 : 0);
})();
