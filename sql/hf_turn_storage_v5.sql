-- Persistencia del avance v5; no habilita automáticamente nuevas salas.
-- Requiere hf_turn_progress_v5.sql. No programa todavía tareas periódicas.

create or replace function public.hf_v5_tick_locked(p_room text, p_at timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_row hf_online_matches;
  v_result jsonb;
  v_players jsonb;
  v_host text;
  v_iteration integer;
  v_i integer;
  v_bot jsonb;
  v_host_seen timestamptz;
  v_deadline timestamptz;
begin
  select * into v_row from hf_online_matches where room_code = upper(trim(p_room)) for update;
  if not found then return null; end if;
  if v_row.status <> 'ACTIVE' or v_row.setup_json->>'turns_version' is distinct from '5' then
    return to_jsonb(v_row);
  end if;
  for v_iteration in 1..8 loop
    if v_row.game_phase = 'TURN_BASED' then
      v_i := hf_player_index(v_row.players_data, v_row.active_player);
      if v_i < 0 then raise exception 'Jugador activo no encontrado'; end if;
      v_bot := v_row.players_data->v_i;
      if coalesce((v_bot->>'is_bot')::boolean, false)
         and not coalesce((v_bot->>'is_ready')::boolean, false) then
        select (e->>'last_seen')::timestamptz into v_host_seen
          from jsonb_array_elements(v_row.players_data) e where e->>'player_id' = v_row.host_id;
        v_deadline := (v_bot->>'turn_started_at')::timestamptz +
          make_interval(secs => (v_bot->>'time_bank_seconds')::double precision);
        if v_deadline is null then raise exception 'Reloj del bot incompleto'; end if;
        if p_at >= v_deadline and (v_host_seen is null or v_host_seen <= p_at - interval '20 seconds') then
          v_bot := hf_v5_finish_player_turn(v_bot) || jsonb_build_object('finished_at', v_deadline);
          update hf_online_matches set
            players_data = jsonb_set(players_data, array[v_i::text], v_bot, false),
            setup_json = jsonb_set(coalesce(setup_json, '{}'::jsonb), '{bot_backlog}',
              coalesce(setup_json->'bot_backlog', '[]'::jsonb) ||
                jsonb_build_array(jsonb_build_object('turn', current_turn,
                  'player_id', v_bot->>'player_id', 'seat', (v_bot->>'seat')::integer)), true)
            where id = v_row.id returning * into v_row;
        end if;
      end if;
    end if;
    v_result := hf_v5_advance(v_row.players_data, v_row.game_phase, v_row.active_player,
      v_row.current_turn, p_at);
    if not (v_result->>'changed')::boolean then exit; end if;
    if (v_result->>'empty')::boolean then
      delete from hf_online_matches where id = v_row.id;
      return jsonb_build_object('room_code', v_row.room_code, 'status', 'DELETED');
    end if;
    v_players := v_result->'players';
    v_host := v_row.host_id;
    if hf_player_index(v_players, v_host) < 0 or exists (
      select 1 from jsonb_array_elements(v_players) e
      where e->>'player_id' = v_host and coalesce((e->>'is_bot')::boolean, false)
    ) then v_host := null; end if;
    update hf_online_matches set players_data = v_players, host_id = v_host,
      current_turn = (v_result->>'round')::integer,
      active_player = v_result->>'active', updated_at = p_at
    where id = v_row.id returning * into v_row;
  end loop;
  return to_jsonb(v_row);
end $$;

create or replace function public.fn_hf_v5_tick(p_room text, p_player text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row hf_online_matches;
begin
  select * into v_row from hf_online_matches where room_code = upper(trim(p_room)) for update;
  if not found then raise exception 'Sala no encontrada'; end if;
  if hf_player_index(v_row.players_data, p_player) < 0 or exists (
    select 1 from jsonb_array_elements(v_row.players_data) e
    where e->>'player_id' = p_player and coalesce((e->>'is_bot')::boolean, false)
  ) then raise exception 'Ya no participas en esta partida'; end if;
  return hf_v5_tick_locked(p_room, clock_timestamp());
end $$;

create or replace function public.fn_hf_v5_ready(p_room text, p_player text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_row hf_online_matches;
  v_i integer;
  v_player jsonb;
  v_at timestamptz;
begin
  select * into v_row from hf_online_matches where room_code = upper(trim(p_room)) for update;
  if not found then raise exception 'Sala no encontrada'; end if;
  v_at := clock_timestamp();
  if v_row.status <> 'ACTIVE' or v_row.setup_json->>'turns_version' is distinct from '5' then
    raise exception 'La partida no usa el nuevo sistema de turnos';
  end if;
  v_i := hf_player_index(v_row.players_data, p_player);
  if v_i < 0 then raise exception 'Ya no participas en esta partida'; end if;
  v_player := v_row.players_data->v_i;
  if coalesce((v_player->>'is_bot')::boolean, false) or
     coalesce((v_player->>'is_ready')::boolean, false) then
    raise exception 'El jugador no tiene un turno abierto';
  end if;
  if v_row.game_phase = 'TURN_BASED' and v_row.active_player is distinct from p_player then
    raise exception 'No es tu turno';
  end if;
  if exists (select 1 from jsonb_array_elements(coalesce(v_row.actions, '[]'::jsonb)) e
    where e->>'status' = 'pending' and e->>'player_id' = p_player) then
    raise exception 'Espera a que se valide tu acción pendiente';
  end if;
  if v_at >= (v_player->>'turn_started_at')::timestamptz +
      make_interval(secs => (v_player->>'time_bank_seconds')::double precision) then
    return hf_v5_tick_locked(p_room, v_at);
  end if;
  v_player := hf_v5_finish_player_turn(v_player) || jsonb_build_object('finished_at', v_at);
  if coalesce((v_player->>'is_bot')::boolean, false) then
    v_player := v_player || jsonb_build_object('bot_from_round', v_row.current_turn + 1);
  end if;
  update hf_online_matches set players_data = jsonb_set(players_data, array[v_i::text], v_player, false),
    updated_at = v_at where id = v_row.id;
  return hf_v5_tick_locked(p_room, v_at);
end $$;

create or replace function public.hf_v5_tick_all()
returns integer language plpgsql security definer set search_path = public as $$
declare v_room text; v_count integer := 0;
begin
  for v_room in
    select room_code from hf_online_matches
    where status = 'ACTIVE' and setup_json->>'turns_version' = '5'
    order by id for update skip locked
  loop
    begin
      perform hf_v5_tick_locked(v_room, clock_timestamp());
      v_count := v_count + 1;
    exception when others then
      raise warning 'hf-v5-turns: sala %: % (SQLSTATE %)', v_room, sqlerrm, sqlstate;
    end;
  end loop;
  return v_count;
end $$;

revoke all on function public.hf_v5_tick_locked(text, timestamptz) from public, anon, authenticated;
revoke all on function public.hf_v5_tick_all() from public, anon, authenticated;
grant execute on function public.fn_hf_v5_tick(text, text) to anon, authenticated;
grant execute on function public.fn_hf_v5_ready(text, text) to anon, authenticated;
notify pgrst, 'reload schema';
