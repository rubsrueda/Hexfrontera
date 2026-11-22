-- Turnos vencidos y relevo sin sustituir jugadores humanos por bots.
-- Requiere hf_multiplayer.sql y hf_matchmaking_v2.sql.

create or replace function fn_hf_skip_expired_turn(p_room text, p_player text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row hf_online_matches; v_player jsonb; v_seconds int;
begin
  select * into v_row from hf_online_matches
    where room_code = upper(trim(p_room)) for update;
  if not found then raise exception 'Sala no encontrada'; end if;
  if v_row.status <> 'ACTIVE' or v_row.game_phase <> 'TURN_BASED'
     or v_row.active_player <> p_player then
    return to_jsonb(v_row);
  end if;
  select e into v_player from jsonb_array_elements(coalesce(v_row.players_data, '[]'::jsonb)) e
    where e->>'player_id' = p_player limit 1;
  if v_player is null then raise exception 'Jugador activo no encontrado'; end if;
  v_seconds := greatest(0, coalesce((v_player->>'time_bank_seconds')::int, 0));
  if v_row.turn_started_at is null or now() < v_row.turn_started_at + make_interval(secs => v_seconds) then
    return to_jsonb(v_row);
  end if;
  return fn_hf_end_turn(p_room, p_player);
end $$;

create or replace function fn_hf_claim_host_v2(p_room text, p_player text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row hf_online_matches; v_seen timestamptz;
begin
  select * into v_row from hf_online_matches
    where room_code = upper(trim(p_room)) for update;
  if not found then raise exception 'Sala no encontrada'; end if;
  if v_row.host_id = p_player then return to_jsonb(v_row); end if;
  if v_row.status <> 'ACTIVE' or hf_player_index(coalesce(v_row.players_data, '[]'::jsonb), p_player) < 0 then
    raise exception 'No estás en una partida activa';
  end if;
  select (e->>'last_seen')::timestamptz into v_seen
    from jsonb_array_elements(coalesce(v_row.players_data, '[]'::jsonb)) e
    where e->>'player_id' = v_row.host_id limit 1;
  if v_seen is not null and v_seen > now() - interval '20 seconds' then
    raise exception 'El anfitrión sigue conectado';
  end if;
  update hf_online_matches set host_id = p_player, updated_at = now()
    where id = v_row.id returning * into v_row;
  return to_jsonb(v_row);
end $$;

grant execute on function fn_hf_skip_expired_turn(text, text) to anon, authenticated;
grant execute on function fn_hf_claim_host_v2(text, text) to anon, authenticated;
notify pgrst, 'reload schema';
