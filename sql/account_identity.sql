-- =============================================================================
-- FEDERATI · Identidad mínima y recuperación de cuenta
-- -----------------------------------------------------------------------------
-- Crea las RPC que el juego necesita para registrar jugadores y validar
-- player_id + secret_key. Sin esto, «Restaurar compra» y «Recuperar cuenta»
-- fallan aunque la tabla hf_players exista.
--
-- Ejecutar DESPUÉS de sql/paypal_payments.sql y ANTES de sql/account_extra.sql.
-- Es idempotente. Si ya aplicaste sql/security_hardening.sql, también es
-- compatible: usa CREATE OR REPLACE y los mismos grants.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Contadores de rate limiting
-- -----------------------------------------------------------------------------
create table if not exists public.hf_rate_limits (
  bucket       text primary key,
  window_start timestamptz not null default now(),
  hits         int not null default 0
);

alter table public.hf_rate_limits enable row level security;
drop policy if exists hf_rate_limits_none on public.hf_rate_limits;
create policy hf_rate_limits_none on public.hf_rate_limits for all using (false) with check (false);
revoke all on public.hf_rate_limits from anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. Utilidades internas
-- -----------------------------------------------------------------------------
create or replace function public.fn_hf_rate_limit(
  p_bucket text,
  p_max    int,
  p_window int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_row public.hf_rate_limits%rowtype;
begin
  select * into v_row from public.hf_rate_limits where bucket = p_bucket for update;

  if not found then
    insert into public.hf_rate_limits(bucket, window_start, hits)
    values (p_bucket, v_now, 1)
    on conflict (bucket) do update set window_start = v_now, hits = 1;
    return true;
  end if;

  if v_now - v_row.window_start > make_interval(secs => p_window) then
    update public.hf_rate_limits set window_start = v_now, hits = 1 where bucket = p_bucket;
    return true;
  end if;

  if v_row.hits >= p_max then
    return false;
  end if;

  update public.hf_rate_limits set hits = v_row.hits + 1 where bucket = p_bucket;
  return true;
end;
$$;

revoke all on function public.fn_hf_rate_limit(text, int, int) from public;

create or replace function public.fn_hf_auth(p_player text, p_secret text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.hf_players
     where player_id = p_player
       and secret_key = p_secret
       and p_player is not null and p_secret is not null
  );
$$;

revoke all on function public.fn_hf_auth(text, text) from public;

-- -----------------------------------------------------------------------------
-- 3. Registro y perfil
-- -----------------------------------------------------------------------------
create or replace function public.fn_hf_register(
  p_player     text,
  p_secret     text,
  p_tribe_name text,
  p_tribe      jsonb,
  p_stats      jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_player is null or length(p_player) < 6 or p_secret is null or length(p_secret) < 4 then
    return jsonb_build_object('ok', false, 'msg', 'identidad invalida');
  end if;
  if not public.fn_hf_rate_limit('register:' || p_player, 5, 3600) then
    return jsonb_build_object('ok', false, 'msg', 'demasiados intentos');
  end if;

  insert into public.hf_players (player_id, secret_key, tribe_name, tribe_data, stats_data, updated_at)
  values (p_player, p_secret, left(coalesce(p_tribe_name, ''), 40), p_tribe, p_stats, now())
  on conflict (player_id) do nothing;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.fn_hf_save_profile(
  p_player     text,
  p_secret     text,
  p_tribe_name text,
  p_tribe      jsonb,
  p_stats      jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.fn_hf_auth(p_player, p_secret) then
    return jsonb_build_object('ok', false, 'msg', 'no autorizado');
  end if;
  if not public.fn_hf_rate_limit('profile:' || p_player, 60, 3600) then
    return jsonb_build_object('ok', false, 'msg', 'demasiadas peticiones');
  end if;

  update public.hf_players
     set tribe_name = left(coalesce(p_tribe_name, tribe_name), 40),
         tribe_data = coalesce(p_tribe, tribe_data),
         stats_data = coalesce(p_stats, stats_data),
         updated_at = now()
   where player_id = p_player and secret_key = p_secret;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.fn_hf_profile(p_player text, p_secret text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select jsonb_build_object(
        'player_id', p.player_id,
        'tribe_name', p.tribe_name,
        'tribe_data', p.tribe_data,
        'stats_data', p.stats_data,
        'is_premium', p.is_premium,
        'recovery_email', p.recovery_email,
        'updated_at', p.updated_at)
       from public.hf_players p
      where p.player_id = p_player and p.secret_key = p_secret),
    '{}'::jsonb);
$$;

create or replace function public.fn_hf_license(p_player text, p_secret text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'ok', true,
    'is_premium', coalesce(
      (select p.is_premium from public.hf_players p
        where p.player_id = p_player and p.secret_key = p_secret), false));
$$;

create or replace function public.fn_hf_set_recovery_email(
  p_player text, p_secret text, p_email text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.fn_hf_auth(p_player, p_secret) then
    return jsonb_build_object('ok', false, 'msg', 'no autorizado');
  end if;
  if p_email is null or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('ok', false, 'msg', 'correo invalido');
  end if;
  if not public.fn_hf_rate_limit('email:' || p_player, 5, 3600) then
    return jsonb_build_object('ok', false, 'msg', 'demasiados intentos');
  end if;

  update public.hf_players
     set recovery_email = lower(p_email), updated_at = now()
   where player_id = p_player and secret_key = p_secret;

  return jsonb_build_object('ok', true);
end;
$$;

-- Compatibilidad con el flujo antiguo. La recuperación real por correo la hace
-- la Edge Function con fn_hf_recover_credentials (sql/account_extra.sql).
create or replace function public.fn_hf_recover_request(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player text;
begin
  if p_email is null or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('ok', false, 'msg', 'correo invalido');
  end if;
  if not public.fn_hf_rate_limit('recover:' || lower(p_email), 3, 3600) then
    return jsonb_build_object('ok', false, 'msg', 'demasiados intentos');
  end if;

  select player_id into v_player
    from public.hf_players
   where lower(recovery_email) = lower(p_email)
   limit 1;

  if v_player is null then
    return jsonb_build_object('ok', false, 'msg', 'no encontrado');
  end if;

  return jsonb_build_object(
    'ok', true,
    'player_id', v_player,
    'hint', left(v_player, 3) || '••••',
    'msg', 'verificacion_pendiente'
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. Cerrar la lectura directa de hf_players (contiene secret_key)
-- -----------------------------------------------------------------------------
alter table if exists public.hf_players enable row level security;

drop policy if exists hf_players_no_direct on public.hf_players;
create policy hf_players_no_direct on public.hf_players
  for select using (false);

revoke insert, update, delete, truncate on public.hf_players from anon, authenticated;
revoke select on public.hf_players from anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5. Permisos de las RPC
-- -----------------------------------------------------------------------------
grant execute on function public.fn_hf_register(text, text, text, jsonb, jsonb)          to anon, authenticated;
grant execute on function public.fn_hf_save_profile(text, text, text, jsonb, jsonb)      to anon, authenticated;
grant execute on function public.fn_hf_profile(text, text)                               to anon, authenticated;
grant execute on function public.fn_hf_license(text, text)                               to anon, authenticated;
grant execute on function public.fn_hf_set_recovery_email(text, text, text)              to anon, authenticated;
grant execute on function public.fn_hf_recover_request(text)                             to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 6. Comprobación
-- -----------------------------------------------------------------------------
select 'fn_hf_profile' as funcion,
       to_regprocedure('public.fn_hf_profile(text,text)') is not null as ok
union all
select 'fn_hf_license',
       to_regprocedure('public.fn_hf_license(text,text)') is not null
union all
select 'fn_hf_register',
       to_regprocedure('public.fn_hf_register(text,text,text,jsonb,jsonb)') is not null
union all
select 'hf_players sin SELECT para anon',
       not has_table_privilege('anon', 'public.hf_players', 'SELECT');
