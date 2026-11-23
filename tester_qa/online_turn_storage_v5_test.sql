-- Prueba la persistencia y revierte las salas creadas.
begin;
do $$
declare
  code text := 'S5' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10));
  host text := 'P-HOST-' || code;
  guest text := 'P-GUEST-' || code;
  t timestamptz := clock_timestamp();
  players jsonb;
  room jsonb;
  denied boolean := false;
begin
  players := hf_v5_begin_players(jsonb_build_array(
    jsonb_build_object('player_id', host, 'seat', 1, 'is_bot', false),
    jsonb_build_object('player_id', guest, 'seat', 2, 'is_bot', false)
  ), t);
  insert into hf_online_matches(room_code, host_id, status, game_phase, current_turn, active_player,
    setup_json, players_data)
  values(code, host, 'ACTIVE', 'SIMULTANEOUS', 1, host, '{"turns_version":5}', players);
  room := fn_hf_v5_ready(code, host);
  if not (room->'players_data'->0->>'is_ready')::boolean or (room->>'current_turn')::int <> 1 then
    raise exception 'La confirmación temprana no espera al otro jugador';
  end if;
  room := fn_hf_v5_ready(code, guest);
  if (room->>'current_turn')::int <> 2 or (room->'players_data'->0->>'is_ready')::boolean then
    raise exception 'No se inició la ronda después de dos confirmaciones';
  end if;
  room := hf_v5_tick_locked(code, t + interval '215 seconds');
  if (room->>'status') <> 'DELETED' then
    raise exception 'Los dos turnos inactivos no cerraron una sala solo de bots';
  end if;
  if exists (select 1 from hf_online_matches where room_code = code) then
    raise exception 'La sala solo de bots no se eliminó';
  end if;

  players := hf_v5_begin_players(jsonb_build_array(
    jsonb_build_object('player_id', host, 'seat', 1, 'is_bot', false, 'inactive_turns', 1),
    jsonb_build_object('player_id', guest, 'seat', 2, 'is_bot', false)
  ), t);
  players := jsonb_set(players, '{1,time_bank_seconds}', '220'::jsonb);
  insert into hf_online_matches(room_code, host_id, status, game_phase, current_turn, active_player,
    setup_json, players_data)
  values(code, host, 'ACTIVE', 'SIMULTANEOUS', 1, host, '{"turns_version":5}', players);
  room := hf_v5_tick_locked(code, t + interval '210 seconds');
  if room->'players_data'->0->>'player_id' <> 'BOT-1' or room->>'host_id' is not null
     or (room->'players_data'->0->>'bot_from_round')::integer <> 2 then
    raise exception 'El relevo no liberó el anfitrión reemplazado';
  end if;
  begin
    perform fn_hf_v5_tick(code, host);
  exception when others then
    if sqlerrm = 'Ya no participas en esta partida' then denied := true; else raise; end if;
  end;
  if not denied then raise exception 'El jugador reemplazado sigue autorizado'; end if;
  if not exists (select 1 from hf_online_matches where room_code = code) then
    raise exception 'Se eliminó una sala con un humano';
  end if;
  delete from hf_online_matches where room_code = code;
  players := hf_v5_begin_players(jsonb_build_array(
    jsonb_build_object('player_id', host, 'seat', 1, 'is_bot', false, 'last_seen', t),
    jsonb_build_object('player_id', 'BOT-2', 'seat', 2, 'is_bot', true)
  ), t);
  players := jsonb_set(players, '{0,is_ready}', 'true'::jsonb);
  insert into hf_online_matches(room_code, host_id, status, game_phase, current_turn, active_player,
    setup_json, players_data, state_json, state_seq)
  values(code, host, 'ACTIVE', 'TURN_BASED', 1, 'BOT-2', '{"turns_version":5}', players, '{"turn":1}', 0);
  room := hf_v5_tick_locked(code, t + interval '210 seconds');
  if room->>'active_player' <> host or (room->>'current_turn')::int <> 2
     or room->'setup_json'->'bot_backlog'->0->>'player_id' <> 'BOT-2' then
    raise exception 'No se conservó el turno del bot pendiente cuando se desconectó el anfitrión';
  end if;
  room := hf_v5_tick_locked(code, t + interval '840 seconds');
  if room->>'status' <> 'DELETED' then
    raise exception 'Una sala desconectada con bot no se limpió tras dos turnos humanos inactivos';
  end if;
  players := hf_v5_begin_players(jsonb_build_array(
    jsonb_build_object('player_id', host, 'seat', 1, 'is_bot', false),
    jsonb_build_object('player_id', guest, 'seat', 2, 'is_bot', false)
  ), t - interval '500 seconds');
  insert into hf_online_matches(room_code, host_id, status, game_phase, current_turn, active_player,
    setup_json, players_data)
  values(code || 'X', host, 'ACTIVE', 'TURN_BASED', 1, 'MISSING',
    '{"turns_version":5}', players);
  insert into hf_online_matches(room_code, host_id, status, game_phase, current_turn, active_player,
    setup_json, players_data)
  values(code, host, 'ACTIVE', 'SIMULTANEOUS', 1, host, '{"turns_version":5}', players);
  perform hf_v5_tick_all();
  if exists (select 1 from hf_online_matches where room_code = code) then
    raise exception 'El error de una sala impidió procesar las demás';
  end if;
  raise notice 'Persistencia de turnos, relevo y limpieza v5 verificados.';
end $$;
rollback;
