-- Cola y confirmación de acciones para salas marcadas explícitamente v5.
-- Requiere hf_turn_rules_v5.sql y las tablas de hf_multiplayer.sql.
-- No cambia las funciones actuales ni convierte salas existentes a v5.

create or replace function public.fn_hf_v5_enqueue_action(p_room text, p_player text, p_action jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_row hf_online_matches;
  v_players jsonb;
  v_i integer;
  v_member jsonb;
  v_start timestamptz;
  v_bank bigint;
  v_action jsonb;
begin
  select * into v_row from hf_online_matches where room_code = upper(trim(p_room)) for update;
  if not found then raise exception 'Sala no encontrada'; end if;
  if v_row.status <> 'ACTIVE' or v_row.setup_json->>'turns_version' is distinct from '5' then
    raise exception 'La partida no usa el nuevo sistema de turnos';
  end if;
  if v_row.state_json is null or (v_row.state_json->>'turn')::integer is distinct from v_row.current_turn then
    raise exception 'La partida aún está sincronizando la ronda';
  end if;
  if jsonb_array_length(coalesce(v_row.setup_json->'bot_backlog', '[]'::jsonb)) > 0 then
    raise exception 'La partida aún está sincronizando los turnos de bots';
  end if;
  if jsonb_typeof(p_action) is distinct from 'object' or
     coalesce(p_action->>'k', '') not in ('act', 'build', 'recruit', 'cargo', 'diplomacy') then
    raise exception 'Acción no admitida';
  end if;
  v_players := coalesce(v_row.players_data, '[]'::jsonb);
  v_i := hf_player_index(v_players, p_player);
  if v_i < 0 then raise exception 'No estás en la sala'; end if;
  v_member := v_players->v_i;
  if coalesce((v_member->>'is_bot')::boolean, false) or
     coalesce((v_member->>'is_ready')::boolean, false) then
    raise exception 'El jugador no tiene un turno abierto';
  end if;
  if v_row.game_phase = 'TURN_BASED' and v_row.active_player is distinct from p_player then
    raise exception 'No es tu turno';
  end if;
  if v_row.game_phase not in ('SIMULTANEOUS', 'TURN_BASED') then
    raise exception 'Fase no admitida';
  end if;
  v_start := (v_member->>'turn_started_at')::timestamptz;
  v_bank := (v_member->>'time_bank_seconds')::bigint;
  if v_start is null or v_bank is null or v_bank < 0 then raise exception 'Reloj del jugador incompleto'; end if;
  if clock_timestamp() < v_start or extract(epoch from (clock_timestamp() - v_start)) >= v_bank then
    raise exception 'Tu turno ha terminado';
  end if;
  if exists (select 1 from jsonb_array_elements(coalesce(v_row.actions, '[]'::jsonb)) e
             where e->>'player_id' = p_player and e->>'status' = 'pending') then
    raise exception 'Ya tienes una acción pendiente';
  end if;
  v_action := jsonb_build_object(
    'id', gen_random_uuid()::text, 'player_id', p_player, 'seat', (v_member->>'seat')::integer,
    'turn', v_row.current_turn, 'phase', v_row.game_phase, 'turn_started_at', v_start,
    'action', p_action, 'status', 'pending', 'submitted_at', clock_timestamp()
  );
  update hf_online_matches set actions = coalesce(actions, '[]'::jsonb) || jsonb_build_array(v_action),
    updated_at = clock_timestamp() where id = v_row.id;
  return v_action;
end $$;

create or replace function public.fn_hf_v5_commit_action(
  p_room text, p_host text, p_action_id text, p_state_seq integer,
  p_accepted boolean, p_state jsonb, p_message text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_row hf_online_matches;
  v_action jsonb;
  v_actions jsonb;
  v_players jsonb;
  v_action_i integer;
  v_player_i integer;
  v_member jsonb;
  v_accepted boolean := p_accepted;
  v_message text := p_message;
  v_at timestamptz;
begin
  select * into v_row from hf_online_matches where room_code = upper(trim(p_room)) for update;
  if not found then raise exception 'Sala no encontrada'; end if;
  if v_row.status <> 'ACTIVE' or v_row.setup_json->>'turns_version' is distinct from '5' then
    raise exception 'La partida no usa el nuevo sistema de turnos';
  end if;
  if v_row.host_id is distinct from p_host then raise exception 'Solo el anfitrión confirma acciones'; end if;
  if hf_player_index(v_row.players_data, p_host) < 0 or exists (
    select 1 from jsonb_array_elements(v_row.players_data) e
    where e->>'player_id' = p_host and coalesce((e->>'is_bot')::boolean, false)
  ) then raise exception 'El anfitrión ya no participa'; end if;
  if p_accepted is null then raise exception 'Falta el resultado de la acción'; end if;
  select (ord - 1)::integer, e into v_action_i, v_action
  from jsonb_array_elements(coalesce(v_row.actions, '[]'::jsonb)) with ordinality as x(e, ord)
  where e->>'id' = p_action_id limit 1;
  if v_action is null then raise exception 'Acción pendiente no encontrada'; end if;
  if v_action->>'status' <> 'pending' then return to_jsonb(v_row); end if;
  if coalesce(v_row.state_seq, 0) <> p_state_seq or p_state_seq is null then
    raise exception 'El estado de la partida cambió; vuelve a validar la acción';
  end if;
  if p_accepted and jsonb_typeof(p_state) is distinct from 'object' then
    raise exception 'Falta el estado resultante de la acción';
  end if;
  if p_accepted and (p_state->>'turn')::integer is distinct from (v_row.state_json->>'turn')::integer then
    raise exception 'La acción no puede cambiar la ronda';
  end if;
  v_players := coalesce(v_row.players_data, '[]'::jsonb);
  v_player_i := hf_player_index(v_players, v_action->>'player_id');
  if v_accepted then
    if v_player_i < 0 then
      v_accepted := false;
      v_message := 'El jugador ya no participa';
    else
      v_member := v_players->v_player_i;
    end if;
    if v_accepted and (v_row.current_turn <> (v_action->>'turn')::integer or
       v_row.game_phase <> v_action->>'phase' or
       (v_member->>'turn_started_at')::timestamptz is distinct from (v_action->>'turn_started_at')::timestamptz or
       (v_row.game_phase = 'TURN_BASED' and v_row.active_player is distinct from v_action->>'player_id') or
       coalesce((v_member->>'is_ready')::boolean, false) or
       coalesce((v_member->>'is_bot')::boolean, false)) then
      v_accepted := false;
      v_message := 'El turno cambió antes de confirmar la acción';
    end if;
    if v_accepted then
      v_at := clock_timestamp();
      if v_at >= (v_member->>'turn_started_at')::timestamptz +
          make_interval(secs => (v_member->>'time_bank_seconds')::double precision) then
        v_accepted := false;
        v_message := 'Tu turno ha terminado';
      end if;
    end if;
    if v_accepted then
      v_member := hf_v5_accept_action(v_member, v_at);
      v_players := jsonb_set(v_players, array[v_player_i::text], v_member, false);
    end if;
  end if;
  v_action := v_action || jsonb_build_object(
    'status', case when v_accepted then 'accepted' else 'rejected' end,
    'message', v_message, 'resolved_at', clock_timestamp()
  );
  v_actions := jsonb_set(v_row.actions, array[v_action_i::text], v_action, false);
  update hf_online_matches set actions = v_actions, players_data = v_players,
    state_json = case when v_accepted then p_state else state_json end,
    state_seq = case when v_accepted then coalesce(state_seq, 0) + 1 else state_seq end,
    status = case when v_accepted and jsonb_typeof(p_state->'over') = 'object'
      then 'FINISHED' else status end,
    updated_at = clock_timestamp()
  where id = v_row.id returning * into v_row;
  return to_jsonb(v_row);
end $$;

grant execute on function public.fn_hf_v5_enqueue_action(text, text, jsonb) to anon, authenticated;
grant execute on function public.fn_hf_v5_commit_action(text, text, text, integer, boolean, jsonb, text) to anon, authenticated;
notify pgrst, 'reload schema';
