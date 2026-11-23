-- Ejecutar después de hf_turn_rules_v5.sql. No modifica partidas.
begin;
do $$
declare
  t timestamptz := '2026-01-01 00:00:00+00';
  p jsonb := '{"player_id":"P-TEST","seat":2,"is_bot":false}'::jsonb;
  b jsonb;
  rejected boolean := false;
begin
  p := hf_v5_start_player_turn(p, t);
  if (p->>'time_bank_seconds')::int <> 210 or (p->>'actions_this_turn')::int <> 0 then
    raise exception 'El turno no comienza con 210 segundos y cero acciones';
  end if;
  p := hf_v5_accept_action(p, t + interval '209 seconds');
  if (p->>'time_bank_seconds')::int <> 220 or (p->>'actions_this_turn')::int <> 1 then
    raise exception 'La acción aceptada no suma exactamente 10 segundos';
  end if;
  p := hf_v5_accept_action(p, t + interval '219 seconds');
  if (p->>'time_bank_seconds')::int <> 230 or (p->>'actions_this_turn')::int <> 2 then
    raise exception 'La segunda acción aceptada no añade tiempo acumulativo';
  end if;
  begin
    perform hf_v5_accept_action(p, t + interval '230 seconds');
  exception when others then
    if sqlerrm = 'Tu turno ha terminado' then rejected := true; else raise; end if;
  end;
  if not rejected then raise exception 'Se admitió una acción en el límite del reloj'; end if;
  rejected := false;
  begin
    perform hf_v5_accept_action(p, t - interval '1 second');
  exception when others then
    if sqlerrm = 'Tu turno ha terminado' then rejected := true; else raise; end if;
  end;
  if not rejected then raise exception 'Se admitió una acción antes de empezar el turno'; end if;
  p := hf_v5_finish_player_turn(p);
  if (p->>'inactive_turns')::int <> 0 then raise exception 'Un turno activo se marcó inactivo'; end if;

  p := hf_v5_start_player_turn(p, t);
  p := hf_v5_finish_player_turn(p);
  if (p->>'inactive_turns')::int <> 1 or (p->>'is_bot')::boolean then
    raise exception 'Un solo turno inactivo no debe reemplazar al jugador';
  end if;
  p := hf_v5_start_player_turn(p, t);
  p := hf_v5_accept_action(p, t + interval '1 second');
  p := hf_v5_finish_player_turn(p);
  if (p->>'inactive_turns')::int <> 0 then raise exception 'La actividad no reinició el contador'; end if;

  p := hf_v5_finish_player_turn(hf_v5_start_player_turn(p, t));
  p := hf_v5_finish_player_turn(hf_v5_start_player_turn(p, t));
  if p->>'player_id' <> 'BOT-2' or p->>'replaced_player_id' <> 'P-TEST'
      or not (p->>'is_bot')::boolean or (p->>'seat')::int <> 2 then
    raise exception 'Dos turnos inactivos no reemplazaron el asiento correctamente';
  end if;
  b := hf_v5_start_player_turn(p, t);
  rejected := false;
  begin
    perform hf_v5_accept_action(b, t + interval '1 second');
  exception when others then
    if sqlerrm = 'El jugador no tiene un turno abierto' then rejected := true; else raise; end if;
  end;
  if not rejected then raise exception 'Se admitió una acción humana para un bot'; end if;
  b := hf_v5_finish_player_turn(b);
  if b->>'replaced_player_id' <> 'P-TEST' then raise exception 'Se perdió la identidad reemplazada'; end if;
  rejected := false;
  begin
    perform hf_v5_finish_player_turn(b);
  exception when others then
    if sqlerrm = 'El turno del jugador ya terminó' then rejected := true; else raise; end if;
  end;
  if not rejected then raise exception 'Se cerró el mismo turno dos veces'; end if;

  p := hf_v5_start_player_turn('{"player_id":"P-MANY","seat":1,"is_bot":false}'::jsonb, t);
  for i in 1..1000 loop
    p := hf_v5_accept_action(p, t + interval '1 second');
  end loop;
  if (p->>'time_bank_seconds')::int <> 10210 or (p->>'actions_this_turn')::int <> 1000 then
    raise exception 'El tiempo adicional está limitado o no se acumula correctamente';
  end if;
  raise notice 'Reglas aisladas de reloj e inactividad verificadas.';
end $$;
rollback;
