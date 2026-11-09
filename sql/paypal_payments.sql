-- =============================================================================
-- FEDERATI · PayPal (web) — historial de cobros y activación de Premium
-- -----------------------------------------------------------------------------
-- Requisito: pago único de 4.99 USD. La Edge Function `paypal` captura la
-- orden con PayPal y, sólo si el cobro está COMPLETED y el importe/moneda
-- coinciden, llama a `fn_hf_paypal_grant`. Esa función hace en UNA sola
-- transacción:
--   1) inserta el cobro en hf_payments (payment_id = id de captura de PayPal);
--   2) pone is_premium = TRUE en hf_players.
--
-- Seguridad:
--   · hf_payments queda con RLS y SIN privilegios para anon/authenticated.
--     Sólo la service_role (Edge Function) puede leerla o escribirla.
--   · fn_hf_paypal_grant no se puede ejecutar desde el navegador.
--   · El importe se valida otra vez en la base de datos (4.99 USD), no se
--     confía en lo que mande el cliente.
--
-- Ejecutar UNA vez en el SQL Editor del proyecto. Es idempotente.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tabla de historial de cobros
-- -----------------------------------------------------------------------------
create table if not exists public.hf_payments (
  payment_id  text primary key,                       -- ID de captura de PayPal
  player_id   text references public.hf_players(player_id),
  payer_email text,                                   -- correo de la cuenta PayPal
  amount      numeric(10, 2) default 4.99,           -- monto cobrado
  currency    text default 'USD',                     -- moneda del cobro
  status      text,                                   -- COMPLETED, REFUNDED, etc.
  created_at  timestamptz default now()               -- fecha y hora del cobro
);

-- Compatibilidad si la tabla ya existía incompleta (no borra datos).
alter table public.hf_payments add column if not exists payment_id  text;
alter table public.hf_payments add column if not exists player_id   text;
alter table public.hf_payments add column if not exists payer_email text;
alter table public.hf_payments add column if not exists amount      numeric(10, 2) default 4.99;
alter table public.hf_payments add column if not exists currency    text default 'USD';
alter table public.hf_payments add column if not exists status      text;
alter table public.hf_payments add column if not exists created_at  timestamptz default now();

create index if not exists idx_hf_payments_player
  on public.hf_payments (player_id, created_at desc);
create index if not exists idx_hf_payments_created
  on public.hf_payments (created_at desc);

-- -----------------------------------------------------------------------------
-- 2. RLS: la facturación es privada; sólo la service_role la toca
-- -----------------------------------------------------------------------------
alter table public.hf_payments enable row level security;

-- Sin políticas = nadie con anon/authenticated puede leer ni escribir.
revoke all on public.hf_payments from anon, authenticated;
grant all on public.hf_payments to service_role;

-- -----------------------------------------------------------------------------
-- 3. Activación atómica de Premium + registro del cobro
-- -----------------------------------------------------------------------------
-- Devuelve un JSON:
--   { ok:true,  already:false, is_premium:true, payer_email:"..." }
--   { ok:true,  already:true,  is_premium:true, payer_email:"..." }  (reintento)
--   { ok:false, error:"..." }
create or replace function public.fn_hf_paypal_grant(
  p_player      text,
  p_payment_id  text,
  p_payer_email text,
  p_amount      numeric,
  p_currency    text,
  p_status      text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player   text;
  v_existing text;
  v_email    text := nullif(lower(trim(coalesce(p_payer_email, ''))), '');
  v_inserted boolean := false;
begin
  -- Identidad y datos mínimos del cobro.
  if p_player is null or length(trim(p_player)) < 6 then
    return jsonb_build_object('ok', false, 'error', 'player_id invalido');
  end if;
  if p_payment_id is null or length(trim(p_payment_id)) < 4 then
    return jsonb_build_object('ok', false, 'error', 'payment_id invalido');
  end if;

  -- Defensa en profundidad: el precio y la moneda son fijos.
  if p_amount is null or p_amount <> 4.99 then
    return jsonb_build_object('ok', false, 'error', 'importe no permitido');
  end if;
  if upper(coalesce(p_currency, '')) <> 'USD' then
    return jsonb_build_object('ok', false, 'error', 'moneda no permitida');
  end if;
  if upper(coalesce(p_status, '')) <> 'COMPLETED' then
    return jsonb_build_object('ok', false, 'error', 'pago no completado');
  end if;

  -- El jugador debe existir (la identidad la crea fn_hf_register).
  select player_id into v_player
    from public.hf_players
   where player_id = p_player;
  if v_player is null then
    return jsonb_build_object('ok', false, 'error', 'jugador no encontrado');
  end if;

  -- Un mismo payment_id (captura de PayPal) no puede acreditar a dos cuentas.
  select player_id into v_existing
    from public.hf_payments
   where payment_id = p_payment_id;
  if v_existing is not null and v_existing <> p_player then
    return jsonb_build_object('ok', false, 'error', 'pago ya registrado para otro jugador');
  end if;

  insert into public.hf_payments (payment_id, player_id, payer_email, amount, currency, status)
  values (p_payment_id, p_player, v_email, p_amount, upper(p_currency), upper(p_status))
  on conflict (payment_id) do nothing;

  v_inserted := found;   -- false si el pago ya estaba registrado (reintento)

  -- El correo de PayPal sirve para recuperar la licencia, pero jamás pisa un
  -- correo de respaldo que el jugador ya haya elegido. Si otro jugador ya usa
  -- ese correo (columna UNIQUE), la licencia se activa igualmente.
  begin
    update public.hf_players
       set is_premium = true,
           recovery_email = coalesce(nullif(recovery_email, ''), v_email),
           updated_at = now()
     where player_id = p_player;
  exception when unique_violation then
    update public.hf_players
       set is_premium = true,
           updated_at = now()
     where player_id = p_player;
  end;

  return jsonb_build_object(
    'ok', true,
    'already', not v_inserted,
    'is_premium', true,
    'payer_email', v_email
  );
end;
$$;

-- Sólo el servidor (service_role) puede activar Premium.
revoke all on function public.fn_hf_paypal_grant(text, text, text, numeric, text, text) from public;
revoke all on function public.fn_hf_paypal_grant(text, text, text, numeric, text, text) from anon, authenticated;
grant execute on function public.fn_hf_paypal_grant(text, text, text, numeric, text, text) to service_role;

-- -----------------------------------------------------------------------------
-- 4. Comprobación rápida (opcional)
-- -----------------------------------------------------------------------------
select 'hf_payments existe'        as comprobacion, to_regclass('public.hf_payments') is not null as ok
union all
select 'fn_hf_paypal_grant existe', to_regprocedure('public.fn_hf_paypal_grant(text,text,text,numeric,text,text)') is not null
union all
select 'anon sin acceso a hf_payments', not has_table_privilege('anon', 'public.hf_payments', 'SELECT');
