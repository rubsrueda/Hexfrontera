-- Integración de salas v5. Requiere los módulos de reglas, acciones y turnos v5.
-- No convierte partidas existentes. No instala ni programa pg_cron.

create or replace function public.hf_v5_initialize_match()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.status = 'ACTIVE' and old.status = 'WAITING'
     and new.setup_json->>'turns_version' = '5' then
    new.players_data := hf_v5_begin_players(new.players_data, clock_timestamp());
    new.game_phase := 'SIMULTANEOUS';
    new.active_player := new.players_data->0->>'player_id';
    new.turn_started_at := clock_timestamp();
  end if;
  return new;
end $$;

drop trigger if exists hf_v5_initialize_match on public.hf_online_matches;
create trigger hf_v5_initialize_match before update of status on public.hf_online_matches
for each row execute function public.hf_v5_initialize_match();

create or replace function public.fn_hf_v5_publish_initial_state(
  p_room text, p_player text, p_state jsonb
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row hf_online_matches; v_i integer;
begin
  select * into v_row from hf_online_matches where room_code = upper(trim(p_room)) for update;
  if not found then raise exception 'Sala no encontrada'; end if;
  v_i := hf_player_index(v_row.players_data, p_player);
  if v_row.status <> 'ACTIVE' or v_row.setup_json->>'turns_version' is distinct from '5'
     or v_row.host_id is distinct from p_player or v_i < 0
     or coalesce((v_row.players_data->v_i->>'is_bot')::boolean, false) then
    raise exception 'Solo el anfitrión activo puede iniciar el tablero';
  end if;
  if v_row.state_json is not null then return to_jsonb(v_row); end if;
  if jsonb_typeof(p_state) is distinct from 'object'
     or (p_state->>'turn')::integer is distinct from 1 then
    raise exception 'Estado inicial del tablero inválido';
  end if;
  update hf_online_matches set state_json = p_state,
    state_seq = coalesce(state_seq, 0) + 1, updated_at = clock_timestamp()
    where id = v_row.id returning * into v_row;
  return to_jsonb(v_row);
end $$;

create or replace function public.fn_hf_v5_contact(p_room text, p_player text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_row hf_online_matches;
  v_players jsonb;
  v_first jsonb;
  v_at timestamptz;
  v_last_actor text;
begin
  select * into v_row from hf_online_matches where room_code = upper(trim(p_room)) for update;
  if not found then raise exception 'Sala no encontrada'; end if;
  if v_row.status <> 'ACTIVE' or v_row.setup_json->>'turns_version' is distinct from '5'
     or v_row.host_id is distinct from p_player
     or hf_player_index(v_row.players_data, p_player) < 0 then
    raise exception 'Solo el anfitrión activo puede cambiar la fase';
  end if;
  if v_row.game_phase = 'TURN_BASED' then return to_jsonb(v_row); end if;
  if v_row.game_phase <> 'SIMULTANEOUS' then raise exception 'Fase no admitida'; end if;
  if exists (select 1 from jsonb_array_elements(coalesce(v_row.actions, '[]'::jsonb)) e
    where e->>'status' = 'pending') then raise exception 'Hay acciones pendientes de validar'; end if;
  if v_row.state_json is null or (v_row.state_json->>'turn')::integer is distinct from v_row.current_turn then
    raise exception 'La partida aún está sincronizando la ronda'; end if;
  v_at := clock_timestamp();
  v_players := (select jsonb_agg(case when coalesce((e->>'is_ready')::boolean, false) then e
    else (e - 'finished_at') || jsonb_build_object(
      'carried_actions', coalesce((e->>'actions_this_turn')::bigint, 0),
      'carried_seconds', greatest(0, ceil((e->>'time_bank_seconds')::numeric -
        extract(epoch from (v_at - (e->>'turn_started_at')::timestamptz))))) end order by ord)
    from jsonb_array_elements(v_row.players_data) with ordinality as x(e, ord));
  select e->>'player_id' into v_last_actor
    from jsonb_array_elements(coalesce(v_row.actions, '[]'::jsonb)) with ordinality as x(e, ord)
    where e->>'status' = 'accepted' and (e->>'turn')::integer = v_row.current_turn
    order by ord desc limit 1;
  select e into v_first from jsonb_array_elements(v_players) e
    where not coalesce((e->>'is_ready')::boolean, false)
    order by case when e->>'player_id' = v_last_actor then 0 else 1 end,
      (e->>'seat')::integer limit 1;
  if v_first is null then raise exception 'La ronda no tiene turnos abiertos'; end if;
  v_players := jsonb_set(v_players, array[hf_player_index(v_players, v_first->>'player_id')::text],
    hf_v5_start_player_turn(v_first, v_at), false);
  update hf_online_matches set players_data = v_players, game_phase = 'TURN_BASED',
    active_player = v_first->>'player_id', turn_started_at = v_at, updated_at = v_at
    where id = v_row.id returning * into v_row;
  return to_jsonb(v_row);
end $$;

create or replace function public.fn_hf_v5_claim_host(p_room text, p_player text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row hf_online_matches; v_i integer; v_seen timestamptz;
begin
  select * into v_row from hf_online_matches where room_code = upper(trim(p_room)) for update;
  if not found then raise exception 'Sala no encontrada'; end if;
  v_i := hf_player_index(v_row.players_data, p_player);
  if v_row.status <> 'ACTIVE' or v_row.setup_json->>'turns_version' is distinct from '5'
     or v_i < 0 then raise exception 'Ya no participas en esta partida'; end if;
  if coalesce((v_row.players_data->v_i->>'is_bot')::boolean, false) then
    raise exception 'Ya no participas en esta partida'; end if;
  if v_row.host_id = p_player then return to_jsonb(v_row); end if;
  select (e->>'last_seen')::timestamptz into v_seen from jsonb_array_elements(v_row.players_data) e
    where e->>'player_id' = v_row.host_id;
  if v_seen is not null and v_seen > clock_timestamp() - interval '20 seconds' then
    raise exception 'El anfitrión sigue conectado'; end if;
  update hf_online_matches set host_id = p_player, updated_at = clock_timestamp()
    where id = v_row.id returning * into v_row;
  return to_jsonb(v_row);
end $$;

create or replace function public.fn_hf_v5_heartbeat(p_room text, p_player text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row hf_online_matches; v_i integer;
begin
  select * into v_row from hf_online_matches where room_code = upper(trim(p_room)) for update;
  if not found then raise exception 'Sala no encontrada'; end if;
  v_i := hf_player_index(v_row.players_data, p_player);
  if v_i < 0 or coalesce((v_row.players_data->v_i->>'is_bot')::boolean, false) then
    raise exception 'Ya no participas en esta partida'; end if;
  update hf_online_matches set players_data = jsonb_set(players_data,
    array[v_i::text, 'last_seen'], to_jsonb(clock_timestamp()), true)
    where id = v_row.id returning * into v_row;
  return to_jsonb(v_row);
end $$;

create or replace function public.fn_hf_v5_commit_engine(
  p_room text, p_host text, p_state_seq integer, p_kind text,
  p_round integer, p_active text, p_state jsonb
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row hf_online_matches; v_i integer; v_player jsonb; v_at timestamptz; v_backlog jsonb; v_event jsonb;
begin
  select * into v_row from hf_online_matches where room_code = upper(trim(p_room)) for update;
  if not found then raise exception 'Sala no encontrada'; end if;
  if v_row.status <> 'ACTIVE' or v_row.setup_json->>'turns_version' is distinct from '5'
     or v_row.host_id is distinct from p_host or hf_player_index(v_row.players_data, p_host) < 0 then
    raise exception 'Solo el anfitrión activo puede actualizar el tablero';
  end if;
  if p_state_seq is null or coalesce(v_row.state_seq, 0) <> p_state_seq then
    raise exception 'El estado de la partida cambió; vuelve a sincronizar';
  end if;
  if jsonb_typeof(p_state) is distinct from 'object' or v_row.state_json is null then
    raise exception 'Falta el estado del tablero';
  end if;
  v_backlog := coalesce(v_row.setup_json->'bot_backlog', '[]'::jsonb);
  v_event := v_backlog->0;
  if p_kind = 'round' then
    if (v_row.state_json->>'turn')::integer is distinct from p_round
       or ((p_state->>'turn')::integer is distinct from p_round + 1
         and not (jsonb_typeof(p_state->'over') = 'object'
           and (p_state->>'turn')::integer = p_round))
       or (v_event is not null and (v_event->>'turn')::integer <= p_round)
       or v_row.current_turn <= p_round then
      raise exception 'La ronda cambió; vuelve a sincronizar';
    end if;
    update hf_online_matches set state_json = p_state, state_seq = state_seq + 1,
      status = case when jsonb_typeof(p_state->'over') = 'object' then 'FINISHED' else status end,
      updated_at = clock_timestamp() where id = v_row.id returning * into v_row;
    return to_jsonb(v_row);
  elsif p_kind = 'bot' then
    if v_row.game_phase <> 'TURN_BASED' or v_row.current_turn <> p_round
       or jsonb_array_length(v_backlog) > 0
       or v_row.active_player is distinct from p_active
       or (v_row.state_json->>'turn')::integer is distinct from p_round
       or (p_state->>'turn')::integer is distinct from p_round then
      raise exception 'El turno del bot cambió; vuelve a sincronizar';
    end if;
    v_i := hf_player_index(v_row.players_data, p_active);
    if v_i < 0 then raise exception 'Bot no encontrado'; end if;
    v_player := v_row.players_data->v_i;
    if not coalesce((v_player->>'is_bot')::boolean, false) or
       coalesce((v_player->>'is_ready')::boolean, false) then
      raise exception 'El jugador activo no es un bot disponible';
    end if;
    v_at := clock_timestamp();
    v_player := hf_v5_finish_player_turn(v_player) || jsonb_build_object('finished_at', v_at);
    update hf_online_matches set state_json = p_state, state_seq = state_seq + 1,
      players_data = jsonb_set(players_data, array[v_i::text], v_player, false),
      status = case when jsonb_typeof(p_state->'over') = 'object' then 'FINISHED' else status end,
      updated_at = v_at where id = v_row.id returning * into v_row;
    if v_row.status = 'FINISHED' then return to_jsonb(v_row); end if;
    return hf_v5_tick_locked(p_room, v_at);
  elsif p_kind = 'backlog' then
    if v_event is null or (v_event->>'turn')::integer is distinct from p_round
       or v_event->>'player_id' is distinct from p_active
       or (v_row.state_json->>'turn')::integer is distinct from p_round
       or (p_state->>'turn')::integer is distinct from p_round then
      raise exception 'El turno pendiente del bot cambió; vuelve a sincronizar';
    end if;
    update hf_online_matches set state_json = p_state, state_seq = state_seq + 1,
      setup_json = jsonb_set(setup_json, '{bot_backlog}', v_backlog - 0, true),
      status = case when jsonb_typeof(p_state->'over') = 'object' then 'FINISHED' else status end,
      updated_at = clock_timestamp() where id = v_row.id returning * into v_row;
    return to_jsonb(v_row);
  end if;
  raise exception 'Actualización del tablero no admitida';
end $$;

grant execute on function public.fn_hf_v5_contact(text, text) to anon, authenticated;
grant execute on function public.fn_hf_v5_claim_host(text, text) to anon, authenticated;
grant execute on function public.fn_hf_v5_heartbeat(text, text) to anon, authenticated;
grant execute on function public.fn_hf_v5_publish_initial_state(text, text, jsonb) to anon, authenticated;
grant execute on function public.fn_hf_v5_commit_engine(text, text, integer, text, integer, text, jsonb) to anon, authenticated;
notify pgrst, 'reload schema';
