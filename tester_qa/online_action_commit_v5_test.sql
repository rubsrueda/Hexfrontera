-- Ejecutar después de hf_turn_rules_v5.sql y hf_action_commit_v5.sql.
-- Inserta una sala temporal y revierte todos los cambios.
begin;
do $$
declare
  code text := 'V5' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10));
  host text := 'P-HOST-' || code;
  guest text := 'P-GUEST-' || code;
  players jsonb;
  action jsonb;
  room jsonb;
  rejected boolean := false;
begin
  players := jsonb_build_array(
    hf_v5_start_player_turn(jsonb_build_object('player_id', host, 'seat', 1, 'is_bot', false), clock_timestamp()),
    hf_v5_start_player_turn(jsonb_build_object('player_id', guest, 'seat', 2, 'is_bot', false), clock_timestamp())
  );
  insert into hf_online_matches(room_code, host_id, status, game_phase, current_turn,
    setup_json, players_data, state_json, state_seq)
  values(code, host, 'ACTIVE', 'SIMULTANEOUS', 1, '{"turns_version":5}'::jsonb, players, '{"step":0,"turn":1}'::jsonb, 0);

  action := fn_hf_v5_enqueue_action(code, guest, '{"k":"act","from":0,"to":1}'::jsonb);
  select to_jsonb(m) into room from hf_online_matches m where room_code = code;
  if (room->'players_data'->1->>'time_bank_seconds')::int <> 210 then
    raise exception 'La acción pendiente añadió tiempo antes de ser aceptada';
  end if;
  begin
    perform fn_hf_v5_enqueue_action(code, guest, '{"k":"act"}'::jsonb);
  exception when others then
    if sqlerrm = 'Ya tienes una acción pendiente' then rejected := true; else raise; end if;
  end;
  if not rejected then raise exception 'Se admitieron dos acciones pendientes del mismo jugador'; end if;
  room := fn_hf_v5_commit_action(code, host, action->>'id', 0, false, null, 'Acción inválida');
  if room->'actions'->0->>'status' <> 'rejected' or
     (room->'players_data'->1->>'time_bank_seconds')::int <> 210 or
     (room->'players_data'->1->>'actions_this_turn')::int <> 0 or
     (room->>'state_seq')::int <> 0 or (room->'state_json'->>'step')::int <> 0 then
    raise exception 'Una acción rechazada alteró el tiempo o el estado';
  end if;

  action := fn_hf_v5_enqueue_action(code, guest, '{"k":"build","b":1,"i":2}'::jsonb);
  rejected := false;
  begin
    perform fn_hf_v5_commit_action(code, host, action->>'id', 1, true, '{"step":1}'::jsonb);
  exception when others then
    if sqlerrm like 'El estado de la partida cambió%' then rejected := true; else raise; end if;
  end;
  if not rejected then raise exception 'Se aceptó un estado de partida obsoleto'; end if;
  room := fn_hf_v5_commit_action(code, host, action->>'id', 0, true, '{"step":1,"turn":1}'::jsonb);
  if room->'actions'->1->>'status' <> 'accepted' or
     (room->'players_data'->1->>'time_bank_seconds')::int <> 220 or
     (room->'players_data'->1->>'actions_this_turn')::int <> 1 or
     (room->>'state_seq')::int <> 1 or (room->'state_json'->>'step')::int <> 1 then
    raise exception 'Estado y reloj no se confirmaron juntos';
  end if;
  room := fn_hf_v5_commit_action(code, host, action->>'id', 0, true, '{"step":99,"turn":1}'::jsonb);
  if (room->'players_data'->1->>'time_bank_seconds')::int <> 220 or
     (room->>'state_seq')::int <> 1 or (room->'state_json'->>'step')::int <> 1 then
    raise exception 'Reintentar una confirmación duplicó la acción';
  end if;

  action := fn_hf_v5_enqueue_action(code, host, '{"k":"recruit","type":"INF","i":0}'::jsonb);
  room := fn_hf_v5_commit_action(code, host, action->>'id', 1, true, '{"step":2,"turn":1}'::jsonb);
  if (room->'players_data'->0->>'time_bank_seconds')::int <> 220 or
     (room->'players_data'->1->>'time_bank_seconds')::int <> 220 then
    raise exception 'El tiempo del anfitrión o del invitado es incorrecto';
  end if;
  action := fn_hf_v5_enqueue_action(code, guest, '{"k":"act"}'::jsonb);
  update hf_online_matches set game_phase = 'TURN_BASED', active_player = host where room_code = code;
  room := fn_hf_v5_commit_action(code, host, action->>'id', 2, true, '{"step":3,"turn":1}'::jsonb);
  if room->'actions'->3->>'status' <> 'rejected' or (room->>'state_seq')::int <> 2
     or (room->'players_data'->1->>'time_bank_seconds')::int <> 220 then
    raise exception 'Rechazar una acción tardía alteró el estado';
  end if;

  update hf_online_matches set game_phase = 'SIMULTANEOUS' where room_code = code;
  action := fn_hf_v5_enqueue_action(code, guest, '{"k":"act"}'::jsonb);
  update hf_online_matches set players_data = jsonb_set(players_data, '{1,player_id}', '"BOT-2"'::jsonb)
    where room_code = code;
  room := fn_hf_v5_commit_action(code, host, action->>'id', 2, true, '{"step":3,"turn":1}'::jsonb);
  if room->'actions'->4->>'status' <> 'rejected' then
    raise exception 'No se pudo descartar la acción del jugador reemplazado';
  end if;
  update hf_online_matches set game_phase = 'TURN_BASED', active_player = host where room_code = code;
  action := fn_hf_v5_enqueue_action(code, host, '{"k":"act"}'::jsonb);
  room := fn_hf_v5_commit_action(code, host, action->>'id', 2, true, '{"step":3,"turn":1}'::jsonb);
  if (room->>'state_seq')::int <> 3 or (room->'players_data'->0->>'time_bank_seconds')::int <> 230 then
    raise exception 'Una acción aceptada en fase alternada no se contabilizó';
  end if;
  action := fn_hf_v5_enqueue_action(code, host, '{"k":"act"}'::jsonb);
  update hf_online_matches set players_data = jsonb_set(players_data, '{0,turn_started_at}',
    to_jsonb(clock_timestamp() - interval '231 seconds')) where room_code = code;
  room := fn_hf_v5_commit_action(code, host, action->>'id', 3, true, '{"step":4,"turn":1}'::jsonb);
  if room->'actions'->6->>'status' <> 'rejected' or
     (room->>'state_seq')::int <> 3 or (room->'players_data'->0->>'time_bank_seconds')::int <> 230 then
    raise exception 'Una acción tardía alteró el tiempo o el estado';
  end if;
  raise notice 'Cola y confirmación de acciones v5 verificadas.';
end $$;
rollback;
