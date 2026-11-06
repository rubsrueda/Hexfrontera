-- =============================================================================
-- FEDERATI · Verificación de enlaces cortos (sólo lectura)
-- Ejecutar DESPUÉS de sql/short_links.sql. Devuelve PASS/FAIL.
-- =============================================================================
with checks as (

  select 'Tabla hf_map_links con RLS' as control,
         exists (
           select 1 from pg_class c
             join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relname = 'hf_map_links' and c.relrowsecurity
         ) as pass,
         'relrowsecurity debe ser true' as detalle

  union all

  select 'anon sin acceso directo a hf_map_links',
         not exists (
           select 1 from information_schema.role_table_grants g
            where g.table_schema = 'public' and g.grantee = 'anon'
              and g.table_name = 'hf_map_links'
         ),
         'sin grants de tabla'

  union all

  select 'Sin políticas permisivas en hf_map_links',
         not exists (
           select 1 from pg_policies p
            where p.schemaname = 'public' and p.tablename = 'hf_map_links'
              and (p.qual = 'true' or p.with_check = 'true')
         ),
         'revisar pg_policies'

  union all

  select 'RPCs de enlaces con SECURITY DEFINER',
         count(*) = 2,
         'encontradas ' || count(*)::text || ' de 2'
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prosecdef
     and p.proname in ('fn_hf_shorten_map', 'fn_hf_resolve_map')

  union all

  select 'Generador de códigos no ejecutable por el cliente',
         not exists (
           select 1 from information_schema.routine_privileges rp
            where rp.specific_schema = 'public' and rp.grantee = 'anon'
              and rp.routine_name = 'fn_hf_short_code'
         ),
         'fn_hf_short_code cerrada'
)
select control,
       case when pass then 'PASS' else 'FAIL' end as resultado,
       detalle
  from checks;
