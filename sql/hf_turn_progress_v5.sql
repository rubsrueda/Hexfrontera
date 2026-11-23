-- Progreso aislado para partidas v5. No activa v5 en salas existentes.
-- Requiere hf_multiplayer.sql y hf_turn_rules_v5.sql.
-- Las funciones internas no son RPC públicas.

create or replace function public.hf_v5_begin_players(p_players jsonb, p_started_at timestamptz)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(public.hf_v5_start_player_turn(e, p_started_at) order by ord), '[]'::jsonb)
  from jsonb_array_elements(p_players) with ordinality as x(e, ord)
$$;

-- Transforma el estado bajo el bloqueo de la sala; no ejecuta la IA.
create or replace function public.hf_v5_advance(
  p_players jsonb, p_phase text, p_active text, p_round integer, p_at timestamptz
) returns jsonb language plpgsql stable set search_path = public as $$
declare
  v_players jsonb := p_players;
  v_member jsonb;
  v_i integer;
  v_deadline timestamptz;
  v_round_started timestamptz;
  v_next jsonb;
  v_humans integer;
  v_changed boolean := false;
begin
  if jsonb_typeof(p_players) is distinct from 'array' or jsonb_array_length(p_players) = 0
      or p_phase not in ('SIMULTANEOUS', 'TURN_BASED') or p_round is null or p_at is null then
    raise exception 'Estado de turnos inválido';
  end if;
  if p_phase = 'SIMULTANEOUS' then
    for v_i in 0..jsonb_array_length(v_players)-1 loop
      v_member := v_players->v_i;
      if not coalesce((v_member->>'is_bot')::boolean, false)
         and not coalesce((v_member->>'is_ready')::boolean, false) then
        v_deadline := (v_member->>'turn_started_at')::timestamptz +
          make_interval(secs => (v_member->>'time_bank_seconds')::double precision);
        if v_deadline is null then raise exception 'Reloj del jugador incompleto'; end if;
        if p_at >= v_deadline then
          v_member := hf_v5_finish_player_turn(v_member) || jsonb_build_object('finished_at', v_deadline);
          if coalesce((v_member->>'is_bot')::boolean, false) then
            v_member := v_member || jsonb_build_object('bot_from_round', p_round + 1);
          end if;
          v_players := jsonb_set(v_players, array[v_i::text], v_member, false);
          v_changed := true;
        end if;
      end if;
    end loop;
    select count(*) into v_humans from jsonb_array_elements(v_players) e
      where not coalesce((e->>'is_bot')::boolean, false);
    if v_humans = 0 then
      return jsonb_build_object('players', v_players, 'phase', p_phase, 'active', p_active,
        'round', p_round, 'changed', true, 'empty', true);
    end if;
    if not exists (select 1 from jsonb_array_elements(v_players) e
      where not coalesce((e->>'is_bot')::boolean, false)
        and not coalesce((e->>'is_ready')::boolean, false)) then
      select max((e->>'finished_at')::timestamptz) into v_round_started
      from jsonb_array_elements(v_players) e;
      if v_round_started is null then raise exception 'Falta el cierre de la ronda'; end if;
      v_players := hf_v5_begin_players(v_players, v_round_started);
      p_round := p_round + 1;
      v_changed := true;
    end if;
  else
    v_i := hf_player_index(v_players, p_active);
    if v_i < 0 then raise exception 'Jugador activo no encontrado'; end if;
    v_member := v_players->v_i;
    if not coalesce((v_member->>'is_bot')::boolean, false)
       and not coalesce((v_member->>'is_ready')::boolean, false) then
      v_deadline := (v_member->>'turn_started_at')::timestamptz +
        make_interval(secs => (v_member->>'time_bank_seconds')::double precision);
      if v_deadline is null then raise exception 'Reloj del jugador incompleto'; end if;
      if p_at >= v_deadline then
        v_member := hf_v5_finish_player_turn(v_member) || jsonb_build_object('finished_at', v_deadline);
        if coalesce((v_member->>'is_bot')::boolean, false) then
          v_member := v_member || jsonb_build_object('bot_from_round', p_round + 1);
        end if;
        v_players := jsonb_set(v_players, array[v_i::text], v_member, false);
        v_changed := true;
      end if;
    end if;
    select count(*) into v_humans from jsonb_array_elements(v_players) e
      where not coalesce((e->>'is_bot')::boolean, false);
    if v_humans = 0 then
      return jsonb_build_object('players', v_players, 'phase', p_phase, 'active', p_active,
        'round', p_round, 'changed', true, 'empty', true);
    end if;
    if coalesce((v_member->>'is_ready')::boolean, false) then
      v_round_started := (v_member->>'finished_at')::timestamptz;
      if v_round_started is null then raise exception 'Falta el cierre del turno'; end if;
      select e into v_next from jsonb_array_elements(v_players) e
        where (e->>'seat')::int > (v_member->>'seat')::int
          and not coalesce((e->>'is_ready')::boolean, false)
        order by (e->>'seat')::int limit 1;
      if v_next is null then
        select e into v_next from jsonb_array_elements(v_players) e
          where not coalesce((e->>'is_ready')::boolean, false)
          order by (e->>'seat')::int limit 1;
      end if;
      if v_next is null then
        v_players := (select jsonb_agg(e || jsonb_build_object('is_ready', false) order by ord)
          from jsonb_array_elements(v_players) with ordinality as x(e, ord));
        select e into v_next from jsonb_array_elements(v_players) e order by (e->>'seat')::int limit 1;
        p_round := p_round + 1;
      end if;
      p_active := v_next->>'player_id';
      v_i := hf_player_index(v_players, p_active);
      v_players := jsonb_set(v_players, array[v_i::text], hf_v5_start_player_turn(v_next, v_round_started), false);
      v_changed := true;
    end if;
  end if;
  return jsonb_build_object('players', v_players, 'phase', p_phase, 'active', p_active,
    'round', p_round, 'changed', v_changed, 'empty', false);
end $$;

revoke all on function public.hf_v5_begin_players(jsonb, timestamptz) from public, anon, authenticated;
revoke all on function public.hf_v5_advance(jsonb, text, text, integer, timestamptz) from public, anon, authenticated;
