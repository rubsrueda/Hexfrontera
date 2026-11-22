-- Turnos alternados sin cesión de jugadores humanos a la IA.
-- Requiere hf_multiplayer.sql y hf_matchmaking_v2.sql.

create or replace function fn_hf_turns_version()
returns integer language sql stable security definer set search_path = public as $$
  select 4
$$;

create or replace function fn_hf_set_phase(p_room text, p_player text, p_phase text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row hf_online_matches; v_players jsonb;
begin
  select * into v_row from hf_online_matches where room_code = upper(trim(p_room)) for update;
  if not found then raise exception 'Sala no encontrada'; end if;
  if v_row.status <> 'ACTIVE' or hf_player_index(v_row.players_data, p_player) < 0 then
    raise exception 'No estás en una partida activa';
  end if;
  if p_phase <> 'TURN_BASED' then raise exception 'Fase no admitida'; end if;
  if v_row.game_phase = 'TURN_BASED' then return to_jsonb(v_row); end if;
  if v_row.game_phase <> 'SIMULTANEOUS' then raise exception 'Fase no admitida'; end if;
  v_players := (select jsonb_agg(e || jsonb_build_object('time_bank_seconds', 210) order by ord)
    from jsonb_array_elements(v_row.players_data) with ordinality as p(e, ord));
  update hf_online_matches set game_phase = 'TURN_BASED',
    players_data = v_players, active_player = v_players->0->>'player_id',
    turn_started_at = now(), updated_at = now()
  where id = v_row.id returning * into v_row;
  return to_jsonb(v_row);
end $$;

create or replace function fn_hf_end_turn(p_room text, p_player text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row hf_online_matches; v_players jsonb; v_active jsonb; v_next text; v_current int;
begin
  select * into v_row from hf_online_matches where room_code = upper(trim(p_room)) for update;
  if not found then raise exception 'Sala no encontrada'; end if;
  if v_row.status <> 'ACTIVE' or v_row.game_phase <> 'TURN_BASED' then raise exception 'No es fase por turnos'; end if;
  v_players := coalesce(v_row.players_data, '[]'::jsonb);
  select e into v_active from jsonb_array_elements(v_players) e where e->>'player_id' = v_row.active_player;
  if v_active is null then raise exception 'Jugador activo no encontrado'; end if;
  if v_row.active_player <> p_player and not (
    v_row.host_id = p_player and v_row.active_player like 'BOT-%'
    and coalesce((v_active->>'is_bot')::boolean, false)
  ) then raise exception 'No es tu turno'; end if;
  v_current := (v_active->>'seat')::int;
  select e->>'player_id' into v_next from jsonb_array_elements(v_players) e
    where (e->>'seat')::int > v_current order by (e->>'seat')::int limit 1;
  if v_next is null then
    select e->>'player_id' into v_next from jsonb_array_elements(v_players) e
      order by (e->>'seat')::int limit 1;
    v_row.current_turn := v_row.current_turn + 1;
  end if;
  v_players := jsonb_set(v_players, array[hf_player_index(v_players, v_next)::text, 'time_bank_seconds'], '210'::jsonb, true);
  update hf_online_matches set active_player = v_next, current_turn = v_row.current_turn,
    players_data = v_players, turn_started_at = now(), updated_at = now()
  where id = v_row.id returning * into v_row;
  return to_jsonb(v_row);
end $$;

create or replace function fn_hf_skip_expired_turn(p_room text, p_player text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row hf_online_matches; v_player jsonb; v_seconds int;
begin
  select * into v_row from hf_online_matches where room_code = upper(trim(p_room)) for update;
  if not found then raise exception 'Sala no encontrada'; end if;
  if v_row.status <> 'ACTIVE' or v_row.game_phase <> 'TURN_BASED' or v_row.active_player <> p_player then
    return to_jsonb(v_row);
  end if;
  select e into v_player from jsonb_array_elements(v_row.players_data) e where e->>'player_id' = p_player;
  if v_player is null then raise exception 'Jugador activo no encontrado'; end if;
  v_seconds := greatest(0, coalesce((v_player->>'time_bank_seconds')::int, 210));
  if v_row.turn_started_at is null or now() < v_row.turn_started_at + make_interval(secs => v_seconds) then
    return to_jsonb(v_row);
  end if;
  return fn_hf_end_turn(p_room, p_player);
end $$;

-- Una llamada de un cliente antiguo tampoco transforma al humano en bot.
create or replace function fn_hf_timeout(p_room text, p_player text)
returns jsonb language sql security definer set search_path = public as $$
  select fn_hf_skip_expired_turn(p_room, p_player)
$$;

create or replace function fn_hf_claim_host_v2(p_room text, p_player text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row hf_online_matches; v_seen timestamptz;
begin
  select * into v_row from hf_online_matches where room_code = upper(trim(p_room)) for update;
  if not found then raise exception 'Sala no encontrada'; end if;
  if v_row.host_id = p_player then return to_jsonb(v_row); end if;
  if v_row.status <> 'ACTIVE' or hf_player_index(v_row.players_data, p_player) < 0 then
    raise exception 'No estás en una partida activa';
  end if;
  select (e->>'last_seen')::timestamptz into v_seen from jsonb_array_elements(v_row.players_data) e
    where e->>'player_id' = v_row.host_id;
  if v_seen is not null and v_seen > now() - interval '20 seconds' then raise exception 'El anfitrión sigue conectado'; end if;
  update hf_online_matches set host_id = p_player, updated_at = now() where id = v_row.id returning * into v_row;
  return to_jsonb(v_row);
end $$;

create or replace function fn_hf_claim_host(p_room text, p_player text)
returns jsonb language sql security definer set search_path = public as $$
  select fn_hf_claim_host_v2(p_room, p_player)
$$;

-- Se recupera únicamente la identidad humana que vuelve a enviar su señal.
create or replace function fn_hf_heartbeat(p_room text, p_player text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row hf_online_matches; v_players jsonb; v_i int;
begin
  select * into v_row from hf_online_matches where room_code = upper(trim(p_room)) for update;
  if not found then raise exception 'Sala no encontrada'; end if;
  v_players := coalesce(v_row.players_data, '[]'::jsonb);
  v_i := hf_player_index(v_players, p_player);
  if v_i < 0 then return to_jsonb(v_row); end if;
  v_players := jsonb_set(v_players, array[v_i::text, 'last_seen'], to_jsonb(now()), true);
  if p_player not like 'BOT-%' then
    v_players := jsonb_set(v_players, array[v_i::text, 'is_bot'], 'false'::jsonb, true);
  end if;
  update hf_online_matches set players_data = v_players where id = v_row.id returning * into v_row;
  return to_jsonb(v_row);
end $$;

create or replace function fn_hf_submit_action(p_room text, p_player text, p_action jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row hf_online_matches; v_players jsonb; v_i int; v_seat int; v_seconds int;
begin
  select * into v_row from hf_online_matches where room_code = upper(trim(p_room)) for update;
  if not found then raise exception 'Sala no encontrada'; end if;
  if v_row.status <> 'ACTIVE' then raise exception 'La partida no está activa'; end if;
  v_players := coalesce(v_row.players_data, '[]'::jsonb);
  v_i := hf_player_index(v_players, p_player);
  if v_i < 0 then raise exception 'No estás en la sala'; end if;
  if v_row.game_phase = 'TURN_BASED' then
    if v_row.active_player <> p_player then raise exception 'No es tu turno'; end if;
    v_seconds := coalesce((v_players->v_i->>'time_bank_seconds')::int, 210);
    if v_row.turn_started_at is null or now() >= v_row.turn_started_at + make_interval(secs => v_seconds) then
      raise exception 'Tu turno ha terminado';
    end if;
    v_players := jsonb_set(v_players, array[v_i::text, 'time_bank_seconds'], to_jsonb(v_seconds + 15), true);
  end if;
  v_seat := coalesce((v_players->v_i->>'seat')::int, v_i + 1);
  update hf_online_matches set players_data = v_players,
    actions = coalesce(actions, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'turn', v_row.current_turn, 'seat', v_seat, 'player_id', p_player,
      'action', coalesce(p_action, '{}'::jsonb), 'ts', now())), updated_at = now()
  where id = v_row.id returning * into v_row;
  return to_jsonb(v_row);
end $$;

-- Acciones ya realizadas por el anfitrión; se registran para ampliar su reloj.
create or replace function fn_hf_host_action_time(p_room text, p_player text, p_turn_started_at timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row hf_online_matches; v_players jsonb; v_i int; v_seconds int;
begin
  select * into v_row from hf_online_matches where room_code = upper(trim(p_room)) for update;
  if not found then raise exception 'Sala no encontrada'; end if;
  if v_row.host_id <> p_player or v_row.active_player <> p_player or v_row.game_phase <> 'TURN_BASED'
     or v_row.turn_started_at is distinct from p_turn_started_at then raise exception 'El turno ha cambiado'; end if;
  v_players := v_row.players_data;
  v_i := hf_player_index(v_players, p_player);
  if v_i < 0 then raise exception 'No estás en la sala'; end if;
  v_seconds := coalesce((v_players->v_i->>'time_bank_seconds')::int, 210);
  if now() >= v_row.turn_started_at + make_interval(secs => v_seconds) then raise exception 'Tu turno ha terminado'; end if;
  v_players := jsonb_set(v_players, array[v_i::text, 'time_bank_seconds'], to_jsonb(v_seconds + 15), true);
  update hf_online_matches set players_data = v_players, updated_at = now()
    where id = v_row.id returning * into v_row;
  return to_jsonb(v_row);
end $$;

grant execute on function fn_hf_turns_version() to anon, authenticated;
grant execute on function fn_hf_skip_expired_turn(text, text) to anon, authenticated;
grant execute on function fn_hf_claim_host_v2(text, text) to anon, authenticated;
grant execute on function fn_hf_host_action_time(text, text, timestamptz) to anon, authenticated;
notify pgrst, 'reload schema';
