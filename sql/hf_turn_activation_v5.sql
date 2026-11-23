-- Activa v5 después de instalar los módulos y programar hf-v5-turns.
-- Requiere haber eliminado las partidas antiguas por separado.
begin;

do $$
begin
  lock table public.hf_online_matches in access exclusive mode;
  if exists (select 1 from public.hf_online_matches) then
    raise exception 'Antes de activar v5 elimina las partidas antiguas con hf_clear_multiplayer_matches.sql';
  end if;
  if to_regprocedure('public.hf_v5_tick_all()') is null
     or to_regprocedure('public.fn_hf_v5_publish_initial_state(text,text,jsonb)') is null
     or to_regprocedure('public.fn_hf_v5_commit_action(text,text,text,integer,boolean,jsonb,text)') is null
     or to_regprocedure('public.fn_hf_v5_commit_engine(text,text,integer,text,integer,text,jsonb)') is null then
    raise exception 'Faltan módulos del multijugador v5';
  end if;
  if to_regclass('cron.job') is null then
    raise exception 'Falta programar la tarea hf-v5-turns';
  end if;
  if not exists (select 1 from cron.job where jobname = 'hf-v5-turns' and active
    and schedule = '* * * * *' and command = 'select public.hf_v5_tick_all()') then
    raise exception 'Falta programar la tarea hf-v5-turns';
  end if;
end $$;

create or replace function public.hf_v5_mark_new_match()
returns trigger language plpgsql set search_path = public as $$
begin
  new.setup_json := coalesce(new.setup_json, '{}'::jsonb) || '{"turns_version":5}'::jsonb;
  return new;
end $$;

drop trigger if exists hf_v5_mark_new_match on public.hf_online_matches;
create trigger hf_v5_mark_new_match before insert on public.hf_online_matches
for each row execute function public.hf_v5_mark_new_match();

create or replace function public.fn_hf_turns_version()
returns integer language sql stable security definer set search_path = public as $$
  select 5
$$;

notify pgrst, 'reload schema';
commit;
