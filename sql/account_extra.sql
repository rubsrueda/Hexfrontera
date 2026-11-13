-- =============================================================================
-- FEDERATI · Identidad: editar llave, recuperar credenciales por correo y
-- limpiar la cuenta temporal al restaurar en otro dispositivo.
-- -----------------------------------------------------------------------------
-- REQUIERE haber ejecutado antes:
--   1) sql/account_identity.sql (crea fn_hf_auth, fn_hf_rate_limit,
--      fn_hf_register, fn_hf_profile, fn_hf_license, RLS y grants)
--   2) sql/paypal_payments.sql  (hf_payments y fn_hf_paypal_grant)
--   (Si ya aplicaste sql/security_hardening.sql, también sirve: incluye esas
--    funciones y es compatible.)
--
-- Este archivo añade:
--   · fn_hf_set_secret          → el jugador cambia su secret_key.
--   · fn_hf_delete_player       → borra la cuenta temporal al vincular otra.
--   · fn_hf_recover_credentials → sólo service_role; la Edge Function la usa
--                                 para enviar por correo el ID y la llave.
--
-- Ejecutar UNA vez en el SQL Editor. Es idempotente.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Cambiar la llave secreta (requiere la llave actual)
-- -----------------------------------------------------------------------------
create or replace function public.fn_hf_set_secret(
  p_player     text,
  p_secret     text,
  p_new_secret text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.fn_hf_auth(p_player, p_secret) then
    return jsonb_build_object('ok', false, 'msg', 'no autorizado');
  end if;

  -- La llave es la contraseña de la cuenta: 6-40 caracteres seguros.
  if p_new_secret is null or p_new_secret !~ '^[A-Za-z0-9_-]{6,40}$' then
    return jsonb_build_object('ok', false, 'msg', 'llave invalida');
  end if;
  if p_new_secret = p_secret then
    return jsonb_build_object('ok', false, 'msg', 'llave sin cambios');
  end if;
  if not public.fn_hf_rate_limit('secret:' || p_player, 5, 3600) then
    return jsonb_build_object('ok', false, 'msg', 'demasiados intentos');
  end if;

  update public.hf_players
     set secret_key = p_new_secret,
         updated_at = now()
   where player_id = p_player
     and secret_key = p_secret;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.fn_hf_set_secret(text, text, text) from public;
grant execute on function public.fn_hf_set_secret(text, text, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. Borrar la cuenta temporal al restaurar otra cuenta
-- -----------------------------------------------------------------------------
-- Sólo borra cuentas SIN licencia y SIN pagos. Si tienen datos vinculados que
-- impiden el borrado, devuelve ok:false y la cuenta se conserva.
create or replace function public.fn_hf_delete_player(
  p_player text,
  p_secret text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_premium boolean;
  v_paid    boolean := false;
begin
  if not public.fn_hf_auth(p_player, p_secret) then
    return jsonb_build_object('ok', false, 'msg', 'no autorizado');
  end if;
  if not public.fn_hf_rate_limit('delete:' || p_player, 3, 3600) then
    return jsonb_build_object('ok', false, 'msg', 'demasiados intentos');
  end if;

  select coalesce(is_premium, false) into v_premium
    from public.hf_players where player_id = p_player;
  if v_premium then
    return jsonb_build_object('ok', false, 'msg', 'cuenta con licencia');
  end if;

  if to_regclass('public.hf_payments') is not null then
    select exists(select 1 from public.hf_payments where player_id = p_player) into v_paid;
    if v_paid then
      return jsonb_build_object('ok', false, 'msg', 'cuenta con pagos');
    end if;
  end if;

  begin
    -- Se limpian las marcas de la cuenta temporal. Si alguna tabla no existe,
    -- la comprobación previa evita ejecutar el DELETE.
    if to_regclass('public.hf_map_scores') is not null then
      delete from public.hf_map_scores where player_id = p_player;
    end if;
    if to_regclass('public.hf_daily_scores') is not null then
      delete from public.hf_daily_scores where player_id = p_player;
    end if;
    if to_regclass('public.hf_map_votes') is not null then
      delete from public.hf_map_votes where player_id = p_player;
    end if;
    delete from public.hf_players where player_id = p_player;
  exception when foreign_key_violation then
    return jsonb_build_object('ok', false, 'msg', 'datos vinculados');
  end;

  return jsonb_build_object('ok', true, 'deleted', true);
end;
$$;

revoke all on function public.fn_hf_delete_player(text, text) from public;
grant execute on function public.fn_hf_delete_player(text, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. Recuperar credenciales (sólo Edge Function / service_role)
-- -----------------------------------------------------------------------------
-- Devuelve el player_id y la secret_key para que la Edge Function los envíe
-- al correo de respaldo. NUNCA se expone a anon/authenticated.
create or replace function public.fn_hf_recover_credentials(
  p_email text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player text;
  v_secret text;
  v_email  text;
begin
  if p_email is null or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('ok', false, 'msg', 'correo invalido');
  end if;
  if not public.fn_hf_rate_limit('recover:' || lower(p_email), 3, 3600) then
    return jsonb_build_object('ok', false, 'msg', 'demasiados intentos');
  end if;

  select player_id, secret_key, recovery_email
    into v_player, v_secret, v_email
    from public.hf_players
   where lower(recovery_email) = lower(p_email)
   limit 1;

  if v_player is null then
    return jsonb_build_object('ok', false, 'msg', 'no encontrado');
  end if;

  return jsonb_build_object(
    'ok', true,
    'player_id', v_player,
    'secret_key', v_secret,
    'recovery_email', v_email
  );
end;
$$;

revoke all on function public.fn_hf_recover_credentials(text) from public;
revoke all on function public.fn_hf_recover_credentials(text) from anon, authenticated;
grant execute on function public.fn_hf_recover_credentials(text) to service_role;

-- -----------------------------------------------------------------------------
-- 4. Comprobación rápida
-- -----------------------------------------------------------------------------
select 'fn_hf_set_secret' as funcion,
       to_regprocedure('public.fn_hf_set_secret(text,text,text)') is not null as ok
union all
select 'fn_hf_delete_player',
       to_regprocedure('public.fn_hf_delete_player(text,text)') is not null
union all
select 'fn_hf_recover_credentials',
       to_regprocedure('public.fn_hf_recover_credentials(text)') is not null
union all
select 'anon sin acceso a recover_credentials',
       not has_function_privilege('anon', 'public.fn_hf_recover_credentials(text)', 'EXECUTE');
