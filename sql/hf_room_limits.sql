-- Límites por identidad de sesión existente. Requiere hf_multiplayer.sql
-- y hf_matchmaking_v2.sql. No borra ni modifica salas al instalarse.

create or replace function hf_room_capacity(p_player text)
returns void language plpgsql set search_path = public as $$
declare v_count integer;
begin
  select count(*) into v_count from hf_online_matches r
  where r.status in ('WAITING', 'ACTIVE')
    and exists (select 1 from jsonb_array_elements(coalesce(r.players_data, '[]'::jsonb)) e
      where e->>'player_id' = p_player and not coalesce((e->>'is_bot')::boolean, false));
  if v_count >= 3 then
    raise exception 'Ya participas en 3 salas abiertas; vuelve a una de Mis salas';
  end if;
end $$;

create or replace function fn_hf_create_room(
  p_room text, p_player text, p_name text, p_crest text, p_color text,
  p_setup jsonb default '{}'::jsonb, p_max int default 4
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row hf_online_matches;
begin
  perform pg_advisory_xact_lock(hashtext('hf_room_limits'));
  select * into v_row from hf_online_matches
    where host_id = p_player and status = 'WAITING'
      and jsonb_array_length(coalesce(players_data, '[]'::jsonb)) = 1
      and players_data->0->>'player_id' = p_player
      and not coalesce((players_data->0->>'is_bot')::boolean, false)
    order by updated_at desc limit 1 for update;
  if found then return to_jsonb(v_row); end if;
  perform hf_room_capacity(p_player);
  insert into hf_online_matches(room_code, host_id, status, max_players, setup_json, is_public, players_data)
  values (
    upper(trim(p_room)), p_player, 'WAITING', greatest(2, least(4, coalesce(p_max, 4))),
    coalesce(p_setup, '{}'::jsonb), coalesce((p_setup->>'is_public')::boolean, false),
    jsonb_build_array(jsonb_build_object(
      'player_id', p_player, 'name', coalesce(p_name, 'Jugador'),
      'crest', coalesce(p_crest, 'c01'), 'color_hex', coalesce(p_color, '#3b82f6'),
      'seat', 1, 'time_bank_seconds', 210, 'is_ready', false, 'is_bot', false, 'last_seen', now()
    ))
  ) returning * into v_row;
  return to_jsonb(v_row);
exception when unique_violation then
  raise exception 'Esa sala ya existe';
end $$;

create or replace function fn_hf_join_room(
  p_room text, p_player text, p_name text, p_crest text, p_color text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row hf_online_matches; v_players jsonb; v_n int; v_i int;
begin
  perform pg_advisory_xact_lock(hashtext('hf_room_limits'));
  select * into v_row from hf_online_matches where room_code = upper(trim(p_room)) for update;
  if not found then raise exception 'Sala no encontrada'; end if;
  if v_row.status = 'FINISHED' then raise exception 'Partida terminada'; end if;
  v_players := coalesce(v_row.players_data, '[]'::jsonb);
  v_i := hf_player_index(v_players, p_player);
  if v_i >= 0 then
    if coalesce((v_players->v_i->>'is_bot')::boolean, false) then
      raise exception 'Ya no participas en esta partida';
    end if;
    return to_jsonb(v_row);
  end if;
  if v_row.status <> 'WAITING' then raise exception 'La partida ya empezó'; end if;
  perform hf_room_capacity(p_player);
  v_n := jsonb_array_length(v_players);
  if v_n >= v_row.max_players then raise exception 'Sala llena'; end if;
  v_players := v_players || jsonb_build_array(jsonb_build_object(
    'player_id', p_player, 'name', coalesce(p_name, 'Jugador'),
    'crest', coalesce(p_crest, 'c01'), 'color_hex', coalesce(p_color, '#3b82f6'),
    'seat', v_n + 1, 'time_bank_seconds', 210, 'is_ready', false, 'is_bot', false, 'last_seen', now()
  ));
  update hf_online_matches set players_data = v_players,
    status = case when v_n + 1 >= max_players then 'ACTIVE' else status end,
    game_phase = case when v_n + 1 >= max_players then 'SIMULTANEOUS' else game_phase end,
    turn_started_at = case when v_n + 1 >= max_players then now() else turn_started_at end,
    updated_at = now()
  where id = v_row.id returning * into v_row;
  return to_jsonb(v_row);
end $$;

create or replace function fn_hf_join_public_room_v2(
  p_room text, p_player text, p_name text, p_crest text, p_color text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row hf_online_matches;
begin
  perform pg_advisory_xact_lock(hashtext('hf_room_limits'));
  select * into v_row from hf_online_matches where room_code = upper(trim(p_room)) for update;
  if not found or not v_row.is_public or v_row.status <> 'WAITING' then
    raise exception 'La sala pública ya no está disponible';
  end if;
  if not hf_waiting_host_online(v_row.players_data, v_row.host_id, interval '45 seconds') then
    raise exception 'El anfitrión de la sala no está disponible';
  end if;
  return fn_hf_join_room(p_room, p_player, p_name, p_crest, p_color);
end $$;

create or replace function fn_hf_quick_match_v2(
  p_room text, p_player text, p_name text, p_crest text, p_color text,
  p_setup jsonb default '{}'::jsonb, p_max int default 2
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row hf_online_matches;
begin
  perform pg_advisory_xact_lock(hashtext('hf_room_limits'));
  update hf_online_matches set status = 'FINISHED', updated_at = now()
  where is_public = true and status = 'WAITING'
    and not hf_waiting_host_online(players_data, host_id, interval '10 minutes')
    and updated_at < now() - interval '10 minutes';
  select * into v_row from hf_online_matches
    where is_public and status = 'WAITING'
      and jsonb_array_length(coalesce(players_data, '[]'::jsonb)) < max_players
      and hf_waiting_host_online(players_data, host_id, interval '45 seconds')
      and hf_player_index(players_data, p_player) < 0
    order by updated_at asc limit 1 for update;
  if found then
    perform fn_hf_join_room(v_row.room_code, p_player, p_name, p_crest, p_color);
    update hf_online_matches set status = 'ACTIVE',
      setup_json = coalesce(setup_json, '{}'::jsonb) || '{"quick_match":true}'::jsonb,
      game_phase = 'SIMULTANEOUS', active_player = host_id,
      turn_started_at = now(), updated_at = now()
    where id = v_row.id returning * into v_row;
    return to_jsonb(v_row);
  end if;
  return fn_hf_create_room(p_room, p_player, p_name, p_crest, p_color,
    coalesce(p_setup, '{}'::jsonb) || '{"quick_match":true,"is_public":true}'::jsonb, 2);
end $$;

-- La API anterior no debe saltarse los límites que aplica la búsqueda actual.
create or replace function fn_hf_quick_match(
  p_room text, p_player text, p_name text, p_crest text, p_color text,
  p_setup jsonb default '{}'::jsonb, p_max int default 4
) returns jsonb language sql security definer set search_path = public as $$
  select fn_hf_quick_match_v2(p_room, p_player, p_name, p_crest, p_color, p_setup, p_max)
$$;

create or replace function fn_hf_close_waiting_room(p_room text, p_player text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row hf_online_matches;
begin
  perform pg_advisory_xact_lock(hashtext('hf_room_limits'));
  select * into v_row from hf_online_matches where room_code = upper(trim(p_room)) for update;
  if not found then raise exception 'Sala no encontrada'; end if;
  if v_row.status <> 'WAITING' or v_row.host_id <> p_player
      or jsonb_array_length(coalesce(v_row.players_data, '[]'::jsonb)) <> 1 then
    raise exception 'Solo puedes cerrar una sala propia que espera rival';
  end if;
  update hf_online_matches set status = 'FINISHED', updated_at = now()
    where id = v_row.id returning * into v_row;
  return to_jsonb(v_row);
end $$;

grant execute on function fn_hf_close_waiting_room(text, text) to anon, authenticated;
notify pgrst, 'reload schema';
