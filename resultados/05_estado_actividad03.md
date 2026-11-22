# Actividad 03 — estado de implementación y pruebas

## Cambios

- La búsqueda rápida usa RPC v2, verifica la presencia del anfitrión, informa de la espera y abre automáticamente el tablero al emparejar. Las salas públicas en espera abandonadas se terminan al invocar búsqueda rápida; las partidas activas y privadas no se modifican por esa limpieza.

- Los avisos de unidades y edificios cubren vistas y mapas, recursos, diplomacia, tratados, banca, transporte, fuerzas visibles y espera de turnos. El historial de mapas es local y empieza con esta versión.

- El resultado online reutiliza el resumen completo por asiento; una facción eliminada puede ver su derrota antes de que termine una partida de varios jugadores. El anfitrión recibe el resultado después de publicar el estado, con reintento y aviso si falla la publicación. Las estadísticas compartidas no se envían como puntuación individual.

- El sondeo se redujo a 700 ms para disminuir la latencia. Sigue siendo un sistema de sondeo y no garantiza movimiento instantáneo.

- `sql/hf_turns_v3.sql` introduce RPC de relevo y turno vencido sin convertir automáticamente humanos en bots. Al vencer el reloj se cede el turno; no se fuerza una derrota tras un número fijo de turnos.

- El diagnóstico de persistencia, asincronía y curación de mapas está en `04_arquitectura_actividad03.md`. Son propuestas, no funciones ya implantadas.

## Verificación

- El usuario ejecutó `sql/hf_matchmaking_v2.sql`; la RPC de listado v2 respondió HTTP 200 desde el cliente, con cero salas públicas en ese momento.

- Pasaron `online_fog_test.js`, `online_round_test.js`, `online_test.js`, `online_screen_test.js` y `banter_test.js`, con código de salida 0.

- En navegador se verificaron con datos simulados la espera y apertura automática, la victoria del asiento 1 y la derrota anticipada del anfitrión, incluido el aviso de relevo. La prueba de publicación comprueba fallo y reintento.

- El usuario probó dos clientes reales: indicó que se conectaron, pero observó movimiento entrecortado, control tomado por IA y pérdida del resumen completo. Se hicieron los ajustes indicados arriba; falta repetir esa prueba tras desplegar la migración de turnos.

- Aunque se informó inicialmente que se ejecutó `hf_turns_v3.sql`, la consulta del cliente al proyecto seguía respondiendo PGRST202 para sus funciones. No está verificado el despliegue en el proyecto utilizado por el juego.

- Siete suites generales fallan: `city_names_test.js`, `deficit_global_test.js`, `diplomacy_test.js`, `replay_caster_test.js`, `trade_caravan_test.js`, `trade_raid_ai_test.js` y `upkeep_test.js`. No se ha establecido una línea base anterior, por lo que no se atribuyen ni descartan como regresiones.

## Pendiente de aceptación

Confirmar el despliegue de `hf_turns_v3.sql` y repetir con dos jugadores reales el movimiento, vencimiento de reloj, reentrada, resultado completo y relevo. Revisar los fallos de las suites generales y determinar si afectan a esta actividad. Hasta entonces la actividad permanece en pendientes.

El anfitrión conectado sigue dirigiendo la partida; no hay motor servidor autónomo ni turnos asíncronos garantizados al cerrar todos los clientes. Steam Cloud y la moderación comunitaria quedan como propuestas.
