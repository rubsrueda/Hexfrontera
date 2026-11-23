-- Reglas aisladas del reloj de la actividad 04.
-- No modifica partidas ni activa todavía los turnos nuevos.
-- La integración debe llamar hf_v5_accept_action únicamente después de que
-- el motor haya aceptado la acción y confirmado el estado de forma atómica.

create or replace function public.hf_v5_start_player_turn(p_player jsonb, p_started_at timestamptz)
returns jsonb language plpgsql stable set search_path = public as $$
begin
  if jsonb_typeof(p_player) is distinct from 'object' or p_started_at is null then
    raise exception 'No se puede iniciar el reloj del jugador';
  end if;
  return (p_player - 'finished_at' - 'carried_actions' - 'carried_seconds') || jsonb_build_object(
    'turn_started_at', p_started_at,
    'time_bank_seconds', coalesce((p_player->>'carried_seconds')::bigint, 210),
    'actions_this_turn', coalesce((p_player->>'carried_actions')::bigint, 0),
    'is_ready', false
  );
end $$;

create or replace function public.hf_v5_accept_action(p_player jsonb, p_at timestamptz)
returns jsonb language plpgsql stable set search_path = public as $$
declare
  v_start timestamptz;
  v_bank bigint;
  v_actions bigint;
begin
  if jsonb_typeof(p_player) is distinct from 'object' or p_at is null then
    raise exception 'Acción o reloj inválido';
  end if;
  if coalesce((p_player->>'is_bot')::boolean, false) or
     coalesce((p_player->>'is_ready')::boolean, false) then
    raise exception 'El jugador no tiene un turno abierto';
  end if;
  v_start := (p_player->>'turn_started_at')::timestamptz;
  v_bank := (p_player->>'time_bank_seconds')::bigint;
  v_actions := (p_player->>'actions_this_turn')::bigint;
  if v_start is null or v_bank is null or v_bank < 0 or v_actions is null or v_actions < 0 then
    raise exception 'Reloj del jugador incompleto';
  end if;
  if p_at < v_start or extract(epoch from (p_at - v_start)) >= v_bank then
    raise exception 'Tu turno ha terminado';
  end if;
  return p_player || jsonb_build_object(
    'time_bank_seconds', v_bank + 10,
    'actions_this_turn', v_actions + 1
  );
end $$;

create or replace function public.hf_v5_finish_player_turn(p_player jsonb)
returns jsonb language plpgsql immutable set search_path = public as $$
declare
  v_inactive bigint;
  v_actions bigint;
  v_seat integer;
begin
  if jsonb_typeof(p_player) is distinct from 'object' then
    raise exception 'Jugador inválido';
  end if;
  if coalesce((p_player->>'is_ready')::boolean, false) then
    raise exception 'El turno del jugador ya terminó';
  end if;
  v_actions := (p_player->>'actions_this_turn')::bigint;
  v_inactive := coalesce((p_player->>'inactive_turns')::bigint, 0);
  if v_actions is null or v_actions < 0 or v_inactive < 0 then
    raise exception 'Actividad del jugador incompleta';
  end if;
  if coalesce((p_player->>'is_bot')::boolean, false) then
    return p_player || '{"is_ready":true}'::jsonb;
  end if;
  v_inactive := case when v_actions = 0 then v_inactive + 1 else 0 end;
  p_player := p_player || jsonb_build_object('inactive_turns', v_inactive, 'is_ready', true);
  if v_inactive >= 2 then
    v_seat := (p_player->>'seat')::integer;
    if v_seat is null or v_seat < 1 or nullif(p_player->>'player_id', '') is null then
      raise exception 'No se puede reemplazar un jugador sin asiento o identidad';
    end if;
    p_player := p_player || jsonb_build_object(
      'replaced_player_id', p_player->>'player_id',
      'player_id', 'BOT-' || v_seat::text,
      'is_bot', true
    );
  end if;
  return p_player;
end $$;
