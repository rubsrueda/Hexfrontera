# Actividad 03 — estado de implementación y pruebas

## Cambios

- La búsqueda rápida usa RPC v2, verifica la presencia del anfitrión, informa de la espera y abre automáticamente el tablero al emparejar. Las salas públicas en espera abandonadas se terminan al invocar búsqueda rápida; las partidas activas y privadas no se modifican por esa limpieza.
- Los avisos de unidades y edificios cubren vistas y mapas, recursos, diplomacia, tratados, banca, transporte, fuerzas visibles y espera de turnos. El historial de mapas es local y empieza con esta versión.
- El resultado online se determina por asiento; una facción eliminada puede ver su derrota antes de que termine una partida de varios jugadores. El anfitrión recibe el resultado después de publicar el estado, con reintento y aviso si falla la publicación.
- El diagnóstico de persistencia, asincronía y curación de mapas está en `04_arquitectura_actividad03.md`. Son propuestas, no funciones ya implantadas.

## Verificación

- El usuario ejecutó `sql/hf_matchmaking_v2.sql`; la RPC de listado v2 respondió HTTP 200 desde el cliente, con cero salas públicas en ese momento.
- Pasaron `online_fog_test.js`, `online_round_test.js`, `online_test.js`, `online_screen_test.js` y `banter_test.js`, con código de salida 0.
- En navegador se verificaron con datos simulados la espera y apertura automática, la victoria del asiento 1 y la derrota anticipada del anfitrión, incluido el aviso de relevo. La prueba de publicación comprueba fallo y reintento.
- Siete suites generales fallan: `city_names_test.js`, `deficit_global_test.js`, `diplomacy_test.js`, `replay_caster_test.js`, `trade_caravan_test.js`, `trade_raid_ai_test.js` y `upkeep_test.js`. No se ha establecido una línea base anterior, por lo que no se atribuyen ni descartan como regresiones.

## Pendiente de aceptación

Probar con dos jugadores reales la búsqueda rápida, apertura simultánea, intercambio de acciones, reentrada y resultado; comprobar el relevo de anfitrión si sale una facción eliminada. Revisar los fallos de las suites generales y determinar si afectan a esta actividad. Hasta entonces la actividad permanece en pendientes.

El anfitrión conectado sigue dirigiendo la partida; no hay motor servidor autónomo ni turnos asíncronos garantizados al cerrar todos los clientes. Steam Cloud y la moderación comunitaria quedan como propuestas.
