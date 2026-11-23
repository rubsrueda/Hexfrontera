-- PENDIENTE DE VALIDACIÓN EN SUPABASE. No ejecutar hasta completar v5.
-- Requiere hf_turn_storage_v5.sql. Instala pg_cron si aún no está instalado.
begin;
create extension if not exists pg_cron;

do $$
declare v_job bigint;
begin
  for v_job in select jobid from cron.job where jobname = 'hf-v5-turns' loop
    perform cron.unschedule(v_job);
  end loop;
  perform cron.schedule('hf-v5-turns', '* * * * *', 'select public.hf_v5_tick_all()');
end $$;
commit;
