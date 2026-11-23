-- Ejecutar después de hf_room_limits.sql. La transacción se revierte al final.
begin;
do $$
declare
  suffix text := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10));
  player text := 'P-TEST-' || suffix;
  other_player text := 'P-OTHER-' || suffix;
  first_room text := 'A' || suffix;
  existing jsonb;
  failed boolean := false;
begin
  perform fn_hf_create_room(first_room, player, 'Prueba', 'c01', '#000000', '{}'::jsonb, 2);
  existing := fn_hf_create_room('B' || suffix, player, 'Prueba', 'c01', '#000000', '{}'::jsonb, 2);
  if existing->>'room_code' <> first_room then raise exception 'Se creó una segunda sala en espera'; end if;
  perform fn_hf_join_room(first_room, other_player, 'Rival', 'c01', '#000000');
  perform fn_hf_create_room('B' || suffix, player, 'Prueba', 'c01', '#000000', '{}'::jsonb, 2);
  perform fn_hf_join_room('B' || suffix, other_player, 'Rival', 'c01', '#000000');
  perform fn_hf_create_room('C' || suffix, player, 'Prueba', 'c01', '#000000', '{}'::jsonb, 2);
  -- Al existir una sala propia en espera, crear debe abrirla, no ocupar otra.
  existing := fn_hf_create_room('D' || suffix, player, 'Prueba', 'c01', '#000000', '{}'::jsonb, 2);
  if existing->>'room_code' <> 'C' || suffix then raise exception 'No se ofreció la sala en espera existente'; end if;
  perform fn_hf_close_waiting_room('C' || suffix, player);
  perform fn_hf_create_room('D' || suffix, other_player, 'Rival', 'c01', '#000000', '{}'::jsonb, 2);
  perform fn_hf_join_room('D' || suffix, player, 'Prueba', 'c01', '#000000');
  failed := false;
  begin
    perform fn_hf_create_room('E' || suffix, player, 'Prueba', 'c01', '#000000', '{}'::jsonb, 2);
  exception when others then
    if sqlerrm like '%3 salas%' then failed := true; else raise; end if;
  end;
  if not failed then raise exception 'No se aplicó el límite de tres salas'; end if;
  if (fn_hf_join_room(first_room, player, 'Prueba', 'c01', '#000000')->>'room_code') <> first_room then
    raise exception 'El límite impide volver a una sala propia';
  end if;
  raise notice 'Límites de sala verificados; la transacción se revertirá.';
end $$;
rollback;
