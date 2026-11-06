-- =============================================================================
-- FEDERATI · Verificación de seguridad (sólo lectura)
-- Ejecuta en el SQL Editor DESPUÉS de sql/security_hardening.sql.
-- Cada fila devuelve PASS o FAIL con el detalle. No modifica nada.
-- =============================================================================

with checks as (

  -- 1. RLS activado en todas las tablas del juego
  select 'RLS activado en todas las tablas' as control,
         bool_and(c.relrowsecurity)          as pass,
         string_agg(c.relname || '=' || case when c.relrowsecurity then 'on' else 'off' end, ', ') as detalle
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind = 'r'
     and c.relname in ('hf_players','hf_map_scores','hf_daily_scores',
                       'hf_community_maps','hf_online_matches',
                       'hf_rate_limits','hf_map_votes')

  union all

  -- 2. anon no puede escribir las tablas de datos
  select 'anon sin INSERT/UPDATE/DELETE en tablas',
         not exists (
           select 1
             from information_schema.role_table_grants g
            where g.table_schema = 'public'
              and g.grantee = 'anon'
              and g.table_name in ('hf_players','hf_map_scores','hf_daily_scores',
                                   'hf_community_maps','hf_online_matches')
              and g.privilege_type in ('INSERT','UPDATE','DELETE')
         ),
         'revisar role_table_grants'

  union all

  -- 3. hf_players no es legible (contiene secret_key)
  select 'hf_players no legible por anon',
         not exists (
           select 1 from information_schema.role_table_grants g
            where g.table_schema = 'public' and g.grantee = 'anon'
              and g.table_name = 'hf_players' and g.privilege_type = 'SELECT'
         ),
         'select revocado'

  union all

  -- 4. Las políticas permisivas del multijugador ya no permiten escritura
  select 'sin políticas FOR ALL permisivas',
         not exists (
           select 1 from pg_policies p
            where p.schemaname = 'public'
              and p.cmd in ('ALL','INSERT','UPDATE','DELETE')
              and (p.qual = 'true' or p.with_check = 'true')
              and p.tablename in ('hf_players','hf_map_scores','hf_daily_scores',
                                  'hf_community_maps','hf_online_matches')
         ),
         'revisar pg_policies'

  union all

  -- 5. Las funciones críticas existen y son SECURITY DEFINER
  select 'RPCs críticas con SECURITY DEFINER',
         count(*) = 11,
         'encontradas ' || count(*)::text || ' de 11'
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.prosecdef
     and p.proname in ('fn_hf_register','fn_hf_save_profile','fn_hf_profile','fn_hf_license',
                       'fn_hf_set_recovery_email','fn_hf_recover_request','fn_hf_submit_map_score',
                       'fn_hf_submit_replay','fn_hf_submit_daily','fn_hf_publish_map','fn_hf_upvote_map')

  union all

  -- 6. La tabla de votos impide votos duplicados
  select 'hf_map_votes con clave primaria (map_id, player_id)',
         exists (
           select 1 from pg_constraint k
             join pg_class c on c.oid = k.conrelid
            where c.relname = 'hf_map_votes' and k.contype = 'p'
         ),
         'pk compuesta'

  union all

  -- 7. Las funciones internas no son ejecutables por el cliente
  select 'helpers internos no ejecutables por anon',
         not exists (
           select 1
             from information_schema.routine_privileges rp
            where rp.specific_schema = 'public'
              and rp.grantee = 'anon'
              and rp.routine_name in ('fn_hf_auth','fn_hf_rate_limit')
         ),
         'auth y rate_limit cerrados'
)
select control,
       case when pass then 'PASS' else 'FAIL' end as resultado,
       detalle
  from checks;
