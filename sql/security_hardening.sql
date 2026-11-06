-- =============================================================================
-- FEDERATI · Endurecimiento de seguridad (Supabase / PostgreSQL)
-- -----------------------------------------------------------------------------
-- Objetivo: que NADA crítico se pueda escribir desde el navegador.
--   1) RLS activado en todas las tablas del juego.
--   2) Lectura pública sólo donde tiene sentido (rankings, mapas, salas).
--   3) Escrituras: privilegios directos REVOCADOS para anon/authenticated.
--      Todo pasa por funciones SECURITY DEFINER que validan en el servidor:
--        · identidad del jugador (player_id + secret_key)
--        · puntuación recalculada en servidor (el cliente no puede inventarla)
--        · límites de plausibilidad y rate limiting
--        · votos: uno por jugador y mapa
--        · licencia premium: la verdad vive en la nube
--   4) hf_players NO es legible: contiene secret_key. El perfil se entrega por
--      función y sin la clave.
--
-- Ejecutar UNA vez en el SQL Editor del proyecto. Es idempotente.
-- Requiere que las tablas ya existan (hf_players, hf_map_scores,
-- hf_daily_scores, hf_community_maps, hf_online_matches).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Columnas y tablas auxiliares
-- -----------------------------------------------------------------------------
alter table if exists public.hf_map_scores
  add column if not exists kills      int         not null default 0,
  add column if not exists lost       int         not null default 0,
  add column if not exists deserts    int         not null default 0,
  add column if not exists replay_code text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.hf_daily_scores
  add column if not exists created_at timestamptz not null default now();

alter table if exists public.hf_community_maps
  add column if not exists author_id  text,
  add column if not exists created_at timestamptz not null default now();

-- Contadores de rate limiting (ventana fija por jugador+acción).
create table if not exists public.hf_rate_limits (
  bucket      text primary key,
  window_start timestamptz not null default now(),
  hits        int not null default 0
);

-- Un voto por jugador y mapa.
create table if not exists public.hf_map_votes (
  map_id      bigint not null,
  player_id   text   not null,
  created_at  timestamptz not null default now(),
  primary key (map_id, player_id)
);

create index if not exists idx_map_scores_key_score on public.hf_map_scores (map_key, score desc, turns asc);
create index if not exists idx_daily_scores_key      on public.hf_daily_scores (date_key, turns asc);
create index if not exists idx_votes_player          on public.hf_map_votes (player_id);

-- -----------------------------------------------------------------------------
-- 1. RLS en todas las tablas
-- -----------------------------------------------------------------------------
alter table if exists public.hf_players        enable row level security;
alter table if exists public.hf_map_scores     enable row level security;
alter table if exists public.hf_daily_scores   enable row level security;
alter table if exists public.hf_community_maps enable row level security;
alter table if exists public.hf_online_matches enable row level security;
alter table if exists public.hf_rate_limits    enable row level security;
alter table if exists public.hf_map_votes      enable row level security;

-- hf_players: el dueño de la fila NO la lee desde el cliente (tiene secret_key).
drop policy if exists hf_players_no_direct on public.hf_players;
create policy hf_players_no_direct on public.hf_players
  for select using (false);

-- Rankings: lectura pública (los enlaces de compartir muestran el Top).
drop policy if exists hf_map_scores_read on public.hf_map_scores;
create policy hf_map_scores_read on public.hf_map_scores
  for select using (true);

drop policy if exists hf_daily_scores_read on public.hf_daily_scores;
create policy hf_daily_scores_read on public.hf_daily_scores
  for select using (true);

drop policy if exists hf_community_maps_read on public.hf_community_maps;
create policy hf_community_maps_read on public.hf_community_maps
  for select using (true);

-- Salas en línea: el estado se lee por sondeo; las escrituras van por RPC.
drop policy if exists hf_online_all    on public.hf_online_matches;
drop policy if exists hf_online_read   on public.hf_online_matches;
create policy hf_online_read on public.hf_online_matches
  for select using (true);

-- Nadie escribe las tablas de control desde el cliente.
drop policy if exists hf_rate_limits_none on public.hf_rate_limits;
create policy hf_rate_limits_none on public.hf_rate_limits for all using (false) with check (false);

drop policy if exists hf_map_votes_read on public.hf_map_votes;
create policy hf_map_votes_read on public.hf_map_votes for select using (false);

-- -----------------------------------------------------------------------------
-- 2. Privilegios: fuera escrituras directas del cliente
-- -----------------------------------------------------------------------------
revoke insert, update, delete, truncate on public.hf_players        from anon, authenticated;
revoke insert, update, delete, truncate on public.hf_map_scores     from anon, authenticated;
revoke insert, update, delete, truncate on public.hf_daily_scores   from anon, authenticated;
revoke insert, update, delete, truncate on public.hf_community_maps from anon, authenticated;
revoke insert, update, delete, truncate on public.hf_online_matches from anon, authenticated;
revoke all    on public.hf_rate_limits from anon, authenticated;
revoke all    on public.hf_map_votes   from anon, authenticated;

-- hf_players deja de ser legible en bloque (evita descargar secret_keys).
revoke select on public.hf_players from anon, authenticated;
grant  select on public.hf_map_scores, public.hf_daily_scores,
                 public.hf_community_maps, public.hf_online_matches to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. Utilidades internas
-- -----------------------------------------------------------------------------
-- Ventana fija: devuelve true si la acción está permitida (y consume un hueco).
create or replace function public.fn_hf_rate_limit(
  p_bucket text,
  p_max    int,
  p_window int   -- segundos
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now  timestamptz := now();
  v_row  public.hf_rate_limits%rowtype;
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

-- Comprueba player_id + secret_key. No filtra si el jugador existe.
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

-- Fórmula de puntuación (DEBE coincidir con HF.calculateScore de js/progress.js)
create or replace function public.fn_hf_score(
  p_turns int, p_kills int, p_lost int, p_deserts int, p_surplus int, p_won boolean
) returns int
language sql immutable
as $$
  select greatest(0,
      (case when p_won then 10000 else 0 end)
    + greatest(0, 50 - p_turns) * 200
    + p_kills * 100
    - p_lost * 150
    + p_surplus * 2
    - p_deserts * 400
  );
$$;

-- -----------------------------------------------------------------------------
-- 4. Identidad y perfil
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
  on conflict (player_id) do nothing;   -- jamás sobreescribe una cuenta existente

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

-- Perfil sin secret_key (sustituye al SELECT directo del cliente).
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

-- Verdad del servidor sobre la licencia (el flag local no cuenta).
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

-- Correo de rescate: requiere identidad válida. Marca premium sólo si ya lo era.
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

-- Recuperación: NUNCA devuelve secret_key. Sólo confirma si existe la cuenta.
-- El envío del código por correo queda fuera de esta función (Edge Function).
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
-- 5. Puntuaciones por mapa (validación en servidor)
-- -----------------------------------------------------------------------------
create or replace function public.fn_hf_submit_map_score(
  p_player  text,
  p_secret  text,
  p_map_key text,
  p_turns   int,
  p_kills   int,
  p_lost    int,
  p_deserts int,
  p_surplus int,
  p_won     boolean,
  p_tribe   text,
  p_crest   text,
  p_color   text,
  p_score   int default null      -- si viene, se compara; nunca se usa como verdad
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_score   int;
  v_prev    public.hf_map_scores%rowtype;
  v_rank    int;
  v_clean   text;
begin
  if not public.fn_hf_auth(p_player, p_secret) then
    return jsonb_build_object('ok', false, 'msg', 'no autorizado');
  end if;
  if p_map_key is null or length(p_map_key) > 80 then
    return jsonb_build_object('ok', false, 'msg', 'mapa invalido');
  end if;

  -- Límites de plausibilidad (anti bot / anti manipulación básica)
  if p_turns is null or p_turns < 1 or p_turns > 400
     or p_kills   is null or p_kills   < 0 or p_kills   > 2000
     or p_lost    is null or p_lost    < 0 or p_lost    > 2000
     or p_deserts is null or p_deserts < 0 or p_deserts > 2000
     or p_surplus is null or p_surplus < 0 or p_surplus > 100000 then
    return jsonb_build_object('ok', false, 'msg', 'datos fuera de rango');
  end if;

  -- El excedente no puede superar lo que el mapa puede producir.
  if p_surplus > 75 + p_turns * 40 then
    return jsonb_build_object('ok', false, 'msg', 'excedente imposible');
  end if;

  -- Frecuencia: como mucho 12 partidas por hora y jugador.
  if not public.fn_hf_rate_limit('score:' || p_player, 12, 3600) then
    return jsonb_build_object('ok', false, 'msg', 'demasiadas partidas');
  end if;

  -- La puntuación SIEMPRE la calcula el servidor.
  v_score := public.fn_hf_score(p_turns, p_kills, p_lost, p_deserts, p_surplus, coalesce(p_won, false));

  -- Si el cliente envió una puntuación distinta, se rechaza (no se "corrige").
  if p_score is not null and p_score <> v_score then
    return jsonb_build_object('ok', false, 'msg', 'puntuacion incoherente', 'score', v_score);
  end if;

  select * into v_prev from public.hf_map_scores
   where map_key = p_map_key and player_id = p_player
   for update;

  if found then
    if not (v_score > coalesce(v_prev.score, 0)
            or (v_score = coalesce(v_prev.score, 0) and p_turns < coalesce(v_prev.turns, 0))) then
      return jsonb_build_object('ok', true, 'skipped', true, 'score', v_prev.score);
    end if;
    update public.hf_map_scores
       set turns = p_turns, score = v_score, surplus = p_surplus, won = coalesce(p_won, false),
           kills = p_kills, lost = p_lost, deserts = p_deserts,
           tribe_name = left(coalesce(p_tribe, tribe_name), 40),
           crest = coalesce(p_crest, crest),
           color_hex = coalesce(p_color, color_hex),
           updated_at = now()
     where map_key = p_map_key and player_id = p_player;
  else
    insert into public.hf_map_scores
      (map_key, player_id, tribe_name, crest, color_hex, turns, score, surplus, won,
       kills, lost, deserts, created_at, updated_at)
    values
      (p_map_key, p_player, left(coalesce(p_tribe, 'Tribu'), 40), coalesce(p_crest, ''),
       coalesce(p_color, '#3b82f6'), p_turns, v_score, p_surplus, coalesce(p_won, false),
       p_kills, p_lost, p_deserts, now(), now());
  end if;

  select count(*) + 1 into v_rank
    from public.hf_map_scores
   where map_key = p_map_key
     and (score > v_score or (score = v_score and turns < p_turns));

  return jsonb_build_object('ok', true, 'score', v_score, 'rank', v_rank);
end;
$$;

-- Repetición: sólo el dueño de su fila, y con límite de tamaño.
create or replace function public.fn_hf_submit_replay(
  p_player text, p_secret text, p_map_key text, p_code text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.fn_hf_auth(p_player, p_secret) then
    return jsonb_build_object('ok', false, 'msg', 'no autorizado');
  end if;
  if p_code is null or length(p_code) > 60000 then
    return jsonb_build_object('ok', false, 'msg', 'repeticion invalida');
  end if;

  update public.hf_map_scores
     set replay_code = p_code, updated_at = now()
   where map_key = p_map_key and player_id = p_player;

  return jsonb_build_object('ok', true);
end;
$$;

-- -----------------------------------------------------------------------------
-- 6. Reto diario (primer intento = oficial, decidido en servidor)
-- -----------------------------------------------------------------------------
create or replace function public.fn_hf_submit_daily(
  p_player  text,
  p_secret  text,
  p_date    text,
  p_turns   int,
  p_surplus int,
  p_tribe   text,
  p_crest   text,
  p_color   text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exists boolean;
begin
  if not public.fn_hf_auth(p_player, p_secret) then
    return jsonb_build_object('ok', false, 'msg', 'no autorizado');
  end if;
  if p_date is null or p_date !~ '^\d{4}-\d{2}-\d{2}$' then
    return jsonb_build_object('ok', false, 'msg', 'fecha invalida');
  end if;
  if p_turns is null or p_turns < 1 or p_turns > 400
     or p_surplus is null or p_surplus < 0 or p_surplus > 100000 then
    return jsonb_build_object('ok', false, 'msg', 'datos fuera de rango');
  end if;
  if not public.fn_hf_rate_limit('daily:' || p_player, 6, 3600) then
    return jsonb_build_object('ok', false, 'msg', 'demasiados intentos');
  end if;

  select exists (
    select 1 from public.hf_daily_scores
     where date_key = p_date and player_id = p_player
  ) into v_exists;

  -- Sólo el primer envío del día cuenta; el resto es práctica y no entra.
  if v_exists then
    return jsonb_build_object('ok', false, 'practice', true, 'msg', 'intento no oficial');
  end if;

  insert into public.hf_daily_scores
    (date_key, player_id, tribe_name, turns, surplus, crest, color_hex, created_at)
  values
    (p_date, p_player, left(coalesce(p_tribe, 'Tribu'), 40), p_turns, p_surplus,
     coalesce(p_crest, ''), coalesce(p_color, '#888888'), now());

  return jsonb_build_object('ok', true, 'official', true);
end;
$$;

-- -----------------------------------------------------------------------------
-- 7. Mapas de la comunidad y votos
-- -----------------------------------------------------------------------------
create or replace function public.fn_hf_publish_map(
  p_player text, p_secret text, p_name text, p_code text,
  p_radius int, p_factions int
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin
  if not public.fn_hf_auth(p_player, p_secret) then
    return jsonb_build_object('ok', false, 'msg', 'no autorizado');
  end if;
  if p_code is null or length(p_code) < 8 or length(p_code) > 12000 then
    return jsonb_build_object('ok', false, 'msg', 'codigo invalido');
  end if;
  if not public.fn_hf_rate_limit('publish:' || p_player, 5, 3600) then
    return jsonb_build_object('ok', false, 'msg', 'demasiadas publicaciones');
  end if;

  insert into public.hf_community_maps (name, author, code, radius, factions_count, upvotes, author_id)
  values (left(coalesce(p_name, 'Mapa'), 60), left(coalesce(p_player, 'Anonimo'), 40),
          p_code, greatest(1, least(20, coalesce(p_radius, 7))),
          greatest(2, least(8, coalesce(p_factions, 2))), 0, p_player)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

create or replace function public.fn_hf_upvote_map(
  p_map_id bigint, p_player text, p_secret text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.fn_hf_auth(p_player, p_secret) then
    return jsonb_build_object('ok', false, 'msg', 'no autorizado');
  end if;
  if not public.fn_hf_rate_limit('vote:' || p_player, 60, 3600) then
    return jsonb_build_object('ok', false, 'msg', 'demasiados votos');
  end if;

  begin
    insert into public.hf_map_votes(map_id, player_id) values (p_map_id, p_player);
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'msg', 'ya votaste este mapa');
  end;

  update public.hf_community_maps
     set upvotes = coalesce(upvotes, 0) + 1
   where id = p_map_id;

  return jsonb_build_object('ok', true);
end;
$$;

-- -----------------------------------------------------------------------------
-- 8. Permisos de ejecución (sólo estas funciones, nada más)
-- -----------------------------------------------------------------------------
grant execute on function public.fn_hf_register(text, text, text, jsonb, jsonb)          to anon, authenticated;
grant execute on function public.fn_hf_save_profile(text, text, text, jsonb, jsonb)      to anon, authenticated;
grant execute on function public.fn_hf_profile(text, text)                               to anon, authenticated;
grant execute on function public.fn_hf_license(text, text)                               to anon, authenticated;
grant execute on function public.fn_hf_set_recovery_email(text, text, text)              to anon, authenticated;
grant execute on function public.fn_hf_recover_request(text)                             to anon, authenticated;
grant execute on function public.fn_hf_submit_map_score(text, text, text, int, int, int, int, int, boolean, text, text, text, int) to anon, authenticated;
grant execute on function public.fn_hf_submit_replay(text, text, text, text)             to anon, authenticated;
grant execute on function public.fn_hf_submit_daily(text, text, text, int, int, text, text, text) to anon, authenticated;
grant execute on function public.fn_hf_publish_map(text, text, text, text, int, int)     to anon, authenticated;
grant execute on function public.fn_hf_upvote_map(bigint, text, text)                    to anon, authenticated;

-- Nadie puede llamar a helpers internos desde el cliente.
revoke all on function public.fn_hf_auth(text, text)     from anon, authenticated, public;
revoke all on function public.fn_hf_rate_limit(text, int, int) from anon, authenticated, public;
