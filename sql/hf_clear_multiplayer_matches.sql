-- BORRADO DEFINITIVO de todas las salas y partidas multijugador actuales.
-- Las salas creadas después de esta limpieza no se eliminan automáticamente.
-- La única tabla borrada explícitamente es public.hf_online_matches.
begin;
lock table public.hf_online_matches in access exclusive mode;
with deleted as (
  delete from public.hf_online_matches
  returning id
)
select count(*) as partidas_eliminadas from deleted;
commit;
