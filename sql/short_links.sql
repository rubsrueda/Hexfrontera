-- =============================================================================
-- FEDERATI · Enlaces cortos de mapa (mapas del editor)
-- -----------------------------------------------------------------------------
-- Los mapas del editor no se pueden reconstruir con una semilla: llevan casillas
-- pintadas a mano. Para compartirlos con 5 caracteres se guarda una fila
-- pequeña en la nube:
--
--     https://federati.org/?m=X9K2A   →   map_code (v1:… completo)
--
-- El cliente NO lee ni escribe la tabla: todo pasa por dos RPC validadas.
-- Ejecutar después de sql/security_hardening.sql (usa fn_hf_auth y
-- fn_hf_rate_limit). Es idempotente.
-- =============================================================================

create table if not exists public.hf_map_links (
  code       text primary key,           -- 5-6 caracteres Base32 Crockford
  map_code   text not null,              -- código completo v1:…
  player_id  text,                       -- quién creó el enlace
  name       text,
  created_at timestamptz not null default now(),
  hits       int not null default 0
);

create index if not exists idx_map_links_player on public.hf_map_links (player_id, created_at desc);

alter table public.hf_map_links enable row level security;
drop policy if exists hf_map_links_none on public.hf_map_links;
create policy hf_map_links_none on public.hf_map_links
  for all using (false) with check (false);

revoke all on public.hf_map_links from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Generador de códigos (sin pgcrypto: md5 + random son nativos)
-- -----------------------------------------------------------------------------
create or replace function public.fn_hf_short_code(p_len int default 5)
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';  -- Crockford
  n        int := greatest(4, least(8, coalesce(p_len, 5)));
  h        text := md5(random()::text || clock_timestamp()::text);
  out_txt  text := '';
  i        int;
  byte_val int;
begin
  for i in 0..(n - 1) loop
    byte_val := ('x' || substr(h, (i * 2) + 1, 2))::bit(8)::int;
    out_txt := out_txt || substr(alphabet, (byte_val % 32) + 1, 1);
  end loop;
  return out_txt;
end;
$$;

revoke all on function public.fn_hf_short_code(int) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Crear (o recuperar) el enlace corto de un mapa
-- -----------------------------------------------------------------------------
create or replace function public.fn_hf_shorten_map(
  p_player text,
  p_secret text,
  p_code   text,
  p_name   text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing text;
  v_code     text;
  v_try      int;
begin
  if not public.fn_hf_auth(p_player, p_secret) then
    return jsonb_build_object('ok', false, 'msg', 'no autorizado');
  end if;
  if p_code is null or length(p_code) < 8 or length(p_code) > 20000 then
    return jsonb_build_object('ok', false, 'msg', 'codigo de mapa invalido');
  end if;
  if not public.fn_hf_rate_limit('short:' || p_player, 20, 3600) then
    return jsonb_build_object('ok', false, 'msg', 'demasiados enlaces');
  end if;

  -- Mismo jugador + mismo mapa → mismo enlace (no gasta códigos nuevos).
  select l.code into v_existing
    from public.hf_map_links l
   where l.player_id = p_player and l.map_code = p_code
   limit 1;
  if v_existing is not null then
    return jsonb_build_object('ok', true, 'code', v_existing, 'existing', true);
  end if;

  for v_try in 1..12 loop
    v_code := public.fn_hf_short_code(5);
    begin
      insert into public.hf_map_links (code, map_code, player_id, name)
      values (v_code, p_code, p_player, left(coalesce(p_name, ''), 60));
      return jsonb_build_object('ok', true, 'code', v_code);
    exception when unique_violation then
      -- código ocupado: se prueba otro
    end;
  end loop;

  -- Último recurso: 6 caracteres (mucho menos probable que choque).
  for v_try in 1..8 loop
    v_code := public.fn_hf_short_code(6);
    begin
      insert into public.hf_map_links (code, map_code, player_id, name)
      values (v_code, p_code, p_player, left(coalesce(p_name, ''), 60));
      return jsonb_build_object('ok', true, 'code', v_code);
    exception when unique_violation then
    end;
  end loop;

  return jsonb_build_object('ok', false, 'msg', 'no se pudo generar el codigo');
end;
$$;

-- -----------------------------------------------------------------------------
-- Resolver un enlace corto (público, con límite por código)
-- -----------------------------------------------------------------------------
create or replace function public.fn_hf_resolve_map(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_row  public.hf_map_links%rowtype;
begin
  v_code := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if length(v_code) < 4 or length(v_code) > 10 then
    return jsonb_build_object('ok', false, 'msg', 'codigo invalido');
  end if;
  if not public.fn_hf_rate_limit('resolve:' || v_code, 600, 3600) then
    return jsonb_build_object('ok', false, 'msg', 'demasiadas peticiones');
  end if;

  select * into v_row from public.hf_map_links where code = v_code;
  if not found then
    return jsonb_build_object('ok', false, 'msg', 'no encontrado');
  end if;

  update public.hf_map_links set hits = coalesce(hits, 0) + 1 where code = v_code;
  return jsonb_build_object('ok', true, 'code', v_row.map_code, 'name', v_row.name);
end;
$$;

-- -----------------------------------------------------------------------------
-- Permisos
-- -----------------------------------------------------------------------------
grant execute on function public.fn_hf_shorten_map(text, text, text, text) to anon, authenticated;
grant execute on function public.fn_hf_resolve_map(text) to anon, authenticated;
