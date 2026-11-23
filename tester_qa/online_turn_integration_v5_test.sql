-- Prueba las RPC de integración en una transacción reversible.
begin;
do $$
declare
  code text := 'I5' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10));
  host text := 'P-HOST-' || code;
  guest text := 'P-GUEST-' || code;
  room jsonb;
  denied boolean := false;
begin
  perform fn_hf_create_room(code, host, 'Host', 'c01', '#000000', '{"turns_version":5}', 2);
  room := fn_hf_join_room(code, guest, 'Invitado', 'c01', '#000000');
  if room->>'status' <> 'ACTIVE' or room->'players_data'->0->>'turn_started_at' is null
     or room->'players_data'->1->>'turn_started_at' is null then
    raise exception 'La activación no inició ambos relojes';
  end if;
  begin
    perform fn_hf_v5_publish_initial_state(code, guest, '{"turn":1}');
  exception when others then
    if sqlerrm like 'Solo el anfitrión%' then denied := true; else raise; end if;
  end;
  if not denied then raise exception 'Un invitado publicó el tablero inicial'; end if;
  room := fn_hf_v5_publish_initial_state(code, host, '{"turn":1}');
  room := fn_hf_v5_publish_initial_state(code, host, '{"turn":1,"otro":true}');
  if room->'state_json'->>'otro' is not null or (room->>'state_seq')::integer <> 1 then
    raise exception 'El tablero inicial fue sobrescrito';
  end if;
  update hf_online_matches set state_seq = 0 where room_code = code;
  denied := false;
  update hf_online_matches set players_data = jsonb_set(
    jsonb_set(jsonb_set(players_data, '{1,actions_this_turn}', '1'),
      '{1,time_bank_seconds}', '220'),
    '{1,turn_started_at}', to_jsonb(clock_timestamp() - interval '50 seconds'))
    where room_code = code;
  room := fn_hf_v5_contact(code, host);
  if room->>'game_phase' <> 'TURN_BASED' or room->>'active_player' <> host then
    raise exception 'El contacto no inició turnos alternados';
  end if;
  room := fn_hf_v5_ready(code, host);
  if room->>'active_player' <> guest or (room->'players_data'->1->>'actions_this_turn')::int <> 1
      or (room->'players_data'->1->>'time_bank_seconds')::int not between 169 and 170 then
    raise exception 'No se conservó el tiempo o la actividad anterior al contacto';
  end if;
  update hf_online_matches set players_data = jsonb_set(
    jsonb_set(players_data, '{1,player_id}', '"BOT-2"'), '{1,is_bot}', 'true'),
    active_player = 'BOT-2' where room_code = code;
  room := fn_hf_v5_commit_engine(code, host, 0, 'bot', 1, 'BOT-2', '{"turn":1,"bot_played":true}');
  if room->>'active_player' <> host or (room->>'current_turn')::int <> 2
      or (room->'state_json'->>'bot_played')::boolean is not true then
    raise exception 'El bot no guardó su estado y cedió el turno de forma atómica';
  end if;
  begin
    perform fn_hf_v5_commit_engine(code, host, 0, 'bot', 1, 'BOT-2', '{"turn":1}');
  exception when others then
    if sqlerrm like 'El estado de la partida cambió%' then denied := true; else raise; end if;
  end;
  if not denied then raise exception 'Se aceptó el turno del bot dos veces'; end if;
  room := fn_hf_v5_commit_engine(code, host, 1, 'round', 1, host, '{"turn":2}');
  if (room->>'state_seq')::int <> 2 or (room->'state_json'->>'turn')::int <> 2 then
    raise exception 'No se guardó la actualización del tablero de la ronda';
  end if;
  update hf_online_matches set host_id = null where room_code = code;
  room := fn_hf_v5_claim_host(code, host);
  if room->>'host_id' <> host then raise exception 'No se recuperó la coordinación'; end if;
  perform fn_hf_v5_heartbeat(code, host);
  update hf_online_matches set setup_json = setup_json ||
    '{"bot_backlog":[{"turn":2,"player_id":"BOT-2","seat":2}]}'::jsonb where room_code = code;
  room := fn_hf_v5_commit_engine(code, host, 2, 'backlog', 2, 'BOT-2',
    '{"turn":2,"replayed":true}');
  if jsonb_array_length(room->'setup_json'->'bot_backlog') <> 0 or
     (room->'state_json'->>'replayed')::boolean is not true then
    raise exception 'No se reprodujo el turno pendiente del bot';
  end if;
  update hf_online_matches set active_player = 'BOT-2', game_phase = 'TURN_BASED',
    players_data = jsonb_set(players_data, '{1,is_ready}', 'false'),
    state_json = '{"turn":2}', state_seq = 3 where room_code = code;
  room := fn_hf_v5_commit_engine(code, host, 3, 'bot', 2, 'BOT-2',
    '{"turn":2,"over":{"winner":1}}');
  if room->>'status' <> 'FINISHED' or (room->'state_json'->'over'->>'winner')::int <> 1 then
    raise exception 'El final producido por un bot no se conservó ni cerró la sala';
  end if;
  code := code || 'C';
  perform fn_hf_create_room(code, host, 'Host', 'c01', '#000000', '{"turns_version":5}', 2);
  perform fn_hf_join_room(code, guest, 'Invitado', 'c01', '#000000');
  perform fn_hf_v5_publish_initial_state(code, host, '{"turn":1}');
  update hf_online_matches set players_data = jsonb_set(players_data, '{0,actions_this_turn}', '1')
    where room_code = code;
  perform fn_hf_v5_ready(code, host);
  update hf_online_matches set players_data = jsonb_set(players_data, '{1,actions_this_turn}', '1'),
    actions = jsonb_build_array(jsonb_build_object('player_id', guest, 'turn', 1, 'status', 'accepted'))
    where room_code = code;
  room := fn_hf_v5_contact(code, host);
  if room->>'active_player' <> guest or not (room->'players_data'->0->>'is_ready')::boolean then
    raise exception 'El contacto cambió de jugador o reabrió un turno terminado';
  end if;
  room := fn_hf_v5_ready(code, guest);
  if (room->>'current_turn')::int <> 2 or room->>'active_player' <> host
     or (room->'players_data'->0->>'inactive_turns')::int <> 0 then
    raise exception 'El contacto repitió un turno terminado o alteró la inactividad';
  end if;
  raise notice 'Inicio, contacto, bot y relevo v5 verificados.';
end $$;
rollback;
