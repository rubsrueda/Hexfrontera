-- Prueba las transiciones sin modificar ninguna partida.
begin;
do $$
declare
  t timestamptz := '2026-01-01 00:00:00+00';
  a jsonb := '{"player_id":"P-A","seat":1,"is_bot":false}'::jsonb;
  b jsonb := '{"player_id":"P-B","seat":2,"is_bot":false}'::jsonb;
  players jsonb;
  state jsonb;
begin
  players := hf_v5_begin_players(jsonb_build_array(a, b), t);
  players := jsonb_set(players, '{1,time_bank_seconds}', '220'::jsonb);
  state := hf_v5_advance(players, 'SIMULTANEOUS', 'P-A', 1, t + interval '209 seconds');
  if (state->>'changed')::boolean then raise exception 'Reloj vencido antes de tiempo'; end if;
  state := hf_v5_advance(players, 'SIMULTANEOUS', 'P-A', 1, t + interval '210 seconds');
  players := state->'players';
  if not (players->0->>'is_ready')::boolean or (players->1->>'is_ready')::boolean
     or (state->>'round')::int <> 1 then
    raise exception 'Los relojes simultáneos no vencen de forma independiente';
  end if;
  state := hf_v5_advance(players, 'SIMULTANEOUS', 'P-A', 1, t + interval '220 seconds');
  players := state->'players';
  if (state->>'round')::int <> 2 or (players->0->>'inactive_turns')::int <> 1
     or (players->1->>'inactive_turns')::int <> 1
     or (players->0->>'turn_started_at')::timestamptz <> t + interval '220 seconds' then
    raise exception 'La siguiente ronda no se inició al terminar ambos turnos';
  end if;
  players := jsonb_set(players, '{1}', hf_v5_accept_action(players->1, t + interval '221 seconds'));
  state := hf_v5_advance(players, 'SIMULTANEOUS', 'P-A', 2, t + interval '440 seconds');
  players := state->'players';
  if players->0->>'player_id' <> 'BOT-1' or players->0->>'replaced_player_id' <> 'P-A'
     or (players->1->>'inactive_turns')::int <> 0 or (state->>'round')::int <> 3 then
    raise exception 'Relevo o reinicio de inactividad incorrecto en simultáneo';
  end if;

  players := hf_v5_begin_players(jsonb_build_array(a, b), t);
  state := hf_v5_advance(players, 'TURN_BASED', 'P-A', 1, t + interval '210 seconds');
  players := state->'players';
  if state->>'active' <> 'P-B' or (players->0->>'inactive_turns')::int <> 1
      or (players->1->>'turn_started_at')::timestamptz <> t + interval '210 seconds' then
    raise exception 'No se cedió el turno alternado al vencer';
  end if;
  state := hf_v5_advance(players, 'TURN_BASED', 'P-B', 1, t + interval '420 seconds');
  players := state->'players';
  if state->>'active' <> 'P-A' or (state->>'round')::int <> 2 then
    raise exception 'No se inició la siguiente ronda alternada';
  end if;
  state := hf_v5_advance(players, 'TURN_BASED', 'P-A', 2, t + interval '630 seconds');
  players := state->'players';
  if state->>'active' <> 'P-B' or players->0->>'player_id' <> 'BOT-1' then
    raise exception 'El jugador inactivo no fue reemplazado al ceder el turno';
  end if;
  state := hf_v5_advance(players, 'TURN_BASED', 'P-B', 2, t + interval '840 seconds');
  if not (state->>'empty')::boolean then raise exception 'No se detectó una sala solo de bots'; end if;
  players := hf_v5_begin_players(jsonb_build_array(a, b), t);
  state := hf_v5_advance(players, 'TURN_BASED', 'P-B', 1, t + interval '210 seconds');
  if state->>'active' <> 'P-A' or (state->>'round')::int <> 1 then
    raise exception 'Un turno anterior pendiente debe finalizar antes de avanzar de ronda';
  end if;
  state := hf_v5_advance(state->'players', 'TURN_BASED', 'P-A', 1, t + interval '420 seconds');
  if (state->>'round')::int <> 2 then
    raise exception 'La ronda no avanzó tras finalizar los turnos pendientes';
  end if;
  raise notice 'Progreso de turnos simultáneos y alternados verificado.';
end $$;
rollback;
