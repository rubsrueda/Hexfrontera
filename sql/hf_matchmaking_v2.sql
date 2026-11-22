-- Actualización no destructiva del emparejamiento público.
-- Requiere sql/hf_multiplayer.sql. No modifica partidas activas ni privadas.

create or replace function hf_waiting_host_online(p_players jsonb, p_host text, p_age interval)
returns boolean language sql stable set search_path = public as $$
  select exists (
    select 1 from jsonb_array_elements(coalesce(p_players, '[]'::jsonb)) e
    where e->>'player_id' = p_host
      and coalesce((e->>'is_bot')::boolean, false) = false
      and (e->>'last_seen')::timestamptz >= now() - p_age
  )
$$;

create or replace function fn_hf_list_public_rooms_v2()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(r) order by r.updated_at desc), '[]'::jsonb)
  from (
    select * from hf_online_matches
    where is_public = true and status = 'WAITING'
      and jsonb_array_length(coalesce(players_data, '[]'::jsonb)) < max_players
      and hf_waiting_host_online(players_data, host_id, interval '45 seconds')
    order by updated_at desc limit 30
  ) r
$$;

create or replace function fn_hf_quick_match_v2(
  p_room text, p_player text, p_name text, p_crest text, p_color text,
  p_setup jsonb default '{}'::jsonb, p_max int default 2
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row hf_online_matches; v_players jsonb; v_n int;
begin
  -- Serializa la búsqueda y creación para evitar dos salas vacías concurrentes.
  perform pg_advisory_xact_lock(hashtext('hf_quick_match_v2'));
  update hf_online_matches set status = 'FINISHED', updated_at = now()
  where is_public = true and status = 'WAITING'
    and not hf_waiting_host_online(players_data, host_id, interval '10 minutes')
    and updated_at < now() - interval '10 minutes';

  select * into v_row from hf_online_matches
  where is_public = true and status = 'WAITING'
    and jsonb_array_length(coalesce(players_data, '[]'::jsonb)) < max_players
    and hf_waiting_host_online(players_data, host_id, interval '45 seconds')
  order by (host_id = p_player) asc, updated_at asc limit 1 for update;

  if found then
    v_players := coalesce(v_row.players_data, '[]'::jsonb);
    if hf_player_index(v_players, p_player) >= 0 then return to_jsonb(v_row); end if;
    v_n := jsonb_array_length(v_players);
    v_players := v_players || jsonb_build_array(jsonb_build_object(
      'player_id', p_player, 'name', coalesce(p_name, 'Jugador'),
      'crest', coalesce(p_crest, 'c01'), 'color_hex', coalesce(p_color, '#3b82f6'),
      'seat', v_n + 1, 'time_bank_seconds', 210, 'is_ready', false,
      'is_bot', false, 'last_seen', now()
    ));
    update hf_online_matches set players_data = v_players, status = 'ACTIVE',
      setup_json = coalesce(setup_json, '{}'::jsonb) || '{"quick_match":true}'::jsonb,
      game_phase = 'SIMULTANEOUS', active_player = host_id,
      turn_started_at = now(), updated_at = now()
    where id = v_row.id returning * into v_row;
    return to_jsonb(v_row);
  end if;

  insert into hf_online_matches(room_code, host_id, status, max_players, setup_json, is_public, players_data)
  values (
    upper(trim(p_room)), p_player, 'WAITING', 2,
    coalesce(p_setup, '{}'::jsonb) || '{"quick_match":true,"is_public":true}'::jsonb, true,
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

create or replace function fn_hf_join_public_room_v2(
  p_room text, p_player text, p_name text, p_crest text, p_color text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row hf_online_matches;
begin
  select * into v_row from hf_online_matches where room_code = upper(trim(p_room)) for update;
  if not found or not v_row.is_public or v_row.status <> 'WAITING' then
    raise exception 'La sala pública ya no está disponible';
  end if;
  if not hf_waiting_host_online(v_row.players_data, v_row.host_id, interval '45 seconds') then
    raise exception 'El anfitrión de la sala no está disponible';
  end if;
  return fn_hf_join_room(p_room, p_player, p_name, p_crest, p_color);
end $$;

grant execute on function fn_hf_list_public_rooms_v2() to anon, authenticated;
grant execute on function fn_hf_quick_match_v2(text, text, text, text, text, jsonb, int) to anon, authenticated;
grant execute on function fn_hf_join_public_room_v2(text, text, text, text, text) to anon, authenticated;
notify pgrst, 'reload schema';
