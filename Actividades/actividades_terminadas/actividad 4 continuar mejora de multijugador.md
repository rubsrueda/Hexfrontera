# Actividad 04: Implementación del modelo de reglas multijugador y resolución de hallazgos en Federati

- **Proyecto:** `proyectos/hexfrontier/` (**Federati** / *Hexfrontier*)

- **Ruta de memorias de agentes:** `agente/agentes/<agente>/memoria/`

- **Rutas de control:** `proyectos/hexfrontier/actividades_pendientes/`, `proyectos/hexfrontier/actividades_terminadas/`, `proyectos/hexfrontier/resultados/`

- **Coordinación:** `orquestador` (coordinando a `arquitecto`, `programador`, `tester` y `contenidos`, consultando y actualizando sus memorias vigentes).

- **Objetivo:** Implementar directamente en `proyectos/hexfrontier/` el reglamento multijugador actualizado (límites de salas, temporizador de 3:30 min respetando turnos iniciales simultáneos, limpieza automática de partidas sin entrada y reemplazo por bot tras 2 turnos sin clic), junto con los bugs y mejoras de UX reportados por el tester, dejándolo probado y funcionando.

## Reglas obligatorias del modelo multijugador (implementar tal cual)
1. **Máximo 1 sala creada sin otro jugador:** impedir crear una nueva sala si el usuario ya tiene una abierta esperando rival, mostrándole acceso directo a esa sala o la opción de cerrarla.

2. **Máximo 3 salas activas por jugador:** se considera sala activa cualquier sala abierta esperando jugador **o** partida en curso donde el jugador siga siendo uno de los contrincantes activos.

3. El criterio de inactividad es **no hacer ningún clic** en 2 turnos seguidos.

4. El tiempo de un turno es un tope de **3:30 minutos (210 s)** por turno desde el primer turno + 10 segundos por Clic. 

5. Todo turno termina al pasar el tiempo de un turno.

6. **Turnos iniciales simultáneos + límite de 3:30 minutos:**
   - **NO romper** el sistema actual donde los primeros turnos son simultáneos todos a la vez.
   - Pero intergar las normas establecidas en los puntos 3,4,5 anteriores

7. **Reemplazo por bot tras 0 clics en 2 turnos seguidos (y cierre natural si quedan solo bots):**
   - Siguiendo los puntos anteriores 3,4,5,6... 

   - Si un jugador no hace ningún clic en 2 turnos seguidos, punto 3, **su espacio lo ocupa un bot y la partida continúa** (sin cortar la partida a los demás jugadores).

   - Mientras haya un humano, Si con el tiempo todos los espacios humanos menos 1 pasan a bots (por ejemplo, en partidas de múltiples jugadores donde todos caen o salen), **los bots pueden continuar hasta terminar la partida** de forma limpia sin dejar salas zombis.

8. **Eliminación automática de partidas sin entrada en 2 turnos seguidos:** si todo está inactivo (punto 3) **2 turnos seguidos** (ventana de **7 minutos por jugador**), y/o solo quedan bots en la partida eliminar la partida automáticamente y liberar el cupo.

9. **Limpieza de comunidad:** limpiar todas las partidas a este momento.

## Reparto por agente y entrega
- **`arquitecto`**: Valida cómo se aplican los temporizadores (3:30 min y 14 min/7 min por jugador), el contador de clics por turno, el relevo a bot tras 2 turnos sin clic y los límites de 1/3 salas sin romper los primeros turnos simultáneos ni la persistencia actual.
- **`programador`**: Implementa todo directamente en `proyectos/hexfrontier/`, manteniendo intacto lo que ya funciona (confirmación al copiar código, lista pública, bots, «Mis salas», persistencia al recargar).
- **`tester`**: Verifica cada regla y cada bug corregido (intentar crear 2ª sala en espera, superar 3 activas, expiración de 3:30 min, eliminación tras 14 min sin entrada, relevo a bot tras 2 turnos sin clic, filtros en búsqueda rápida).
- **`contenidos`**: Ajusta los textos de interfaz y actualiza las memorias vigentes en `agente/agentes/<agente>/memoria/` de forma breve y técnica.
- **`orquestador`**: Registra el cierre en `proyectos/hexfrontier/resultados/` y entrega un reporte final breve en español con: (1) qué quedó implementado y (2) cómo probar cada regla en pantalla ahora mismo.
