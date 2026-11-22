-- Ejecutar en SQL Editor después de hf_turns_v4.sql. Todo se revierte al final.
begin;
do $$
declare
  code text := 'TEST-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 16));
  test_id bigint := -1 - floor(random() * 9000000000000000)::bigint;
  room hf_online_matches;
  first_start timestamptz;
begin
  insert into hf_online_matches(id, room_code, host_id, status, max_players, game_phase,
    current_turn, active_player, turn_started_at, players_data)
  overriding system value values (
    test_id, code, 'P-HOST-TEST', 'ACTIVE', 2, 'SIMULTANEOUS', 1, 'P-HOST-TEST', now(),
    '[{"player_id":"P-HOST-TEST","seat":1,"is_bot":false,"time_bank_seconds":210},
      {"player_id":"P-GUEST-TEST","seat":2,"is_bot":false,"time_bank_seconds":210}]'::jsonb);

  perform fn_hf_set_phase(code, 'P-GUEST-TEST', 'TURN_BASED');
  select * into room from hf_online_matches where id = test_id;
  if room.game_phase <> 'TURN_BASED' or room.active_player <> 'P-HOST-TEST' then
    raise exception 'La transición de contacto no respeta el primer asiento';
  end if;
  first_start := room.turn_started_at;
  perform fn_hf_set_phase(code, 'P-GUEST-TEST', 'TURN_BASED');
  select * into room from hf_online_matches where id = test_id;
  if room.turn_started_at <> first_start or room.active_player <> 'P-HOST-TEST' then
    raise exception 'Una segunda notificación de contacto reinició el turno';
  end if;

  perform fn_hf_host_action_time(code, 'P-HOST-TEST', first_start);
  select * into room from hf_online_matches where id = test_id;
  if (room.players_data->0->>'time_bank_seconds')::int <> 225 then
    raise exception 'La acción del anfitrión no añadió 15 segundos';
  end if;
  perform fn_hf_timeout(code, 'P-HOST-TEST');
  select * into room from hf_online_matches where id = test_id;
  if room.active_player <> 'P-HOST-TEST' or (room.players_data->0->>'is_bot')::boolean then
    raise exception 'El timeout antiguo alteró un turno no vencido';
  end if;

  perform fn_hf_end_turn(code, 'P-HOST-TEST');
  select * into room from hf_online_matches where id = test_id;
  if room.active_player <> 'P-GUEST-TEST' or (room.players_data->1->>'time_bank_seconds')::int <> 210 then
    raise exception 'El turno no pasó al invitado con 210 segundos';
  end if;
  perform fn_hf_submit_action(code, 'P-GUEST-TEST', '{"k":"act","from":0,"to":1}'::jsonb);
  select * into room from hf_online_matches where id = test_id;
  if (room.players_data->1->>'time_bank_seconds')::int <> 225 then
    raise exception 'El envío del invitado no añadió 15 segundos';
  end if;
  update hf_online_matches set turn_started_at = now() - interval '226 seconds' where id = test_id;
  perform fn_hf_timeout(code, 'P-GUEST-TEST');
  select * into room from hf_online_matches where id = test_id;
  if room.active_player <> 'P-HOST-TEST' or room.current_turn <> 2
     or (room.players_data->1->>'is_bot')::boolean
     or (room.players_data->0->>'time_bank_seconds')::int <> 210 then
    raise exception 'El turno vencido no pasó al siguiente humano correctamente';
  end if;

  update hf_online_matches set players_data = jsonb_set(
    jsonb_set(players_data, '{0,is_bot}', 'true'::jsonb), '{0,last_seen}',
    to_jsonb(now() - interval '30 seconds')) where id = test_id;
  perform fn_hf_claim_host(code, 'P-GUEST-TEST');
  perform fn_hf_heartbeat(code, 'P-HOST-TEST');
  select * into room from hf_online_matches where id = test_id;
  if room.host_id <> 'P-GUEST-TEST' or (room.players_data->0->>'is_bot')::boolean then
    raise exception 'El relevo o la recuperación no preservaron al jugador humano';
  end if;
  raise notice 'Pruebas v4 correctas; la transacción se revertirá.';
end $$;
rollback;
