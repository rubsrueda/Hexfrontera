# Actividad 03: Resolución de hallazgos de tester (bugs, UX y arquitectura) en Federati

- **Proyecto:** `proyectos/hexfrontier/` (**Federati** / *Hexfrontier*)
- **Ruta de memorias de agentes:** `agente/agentes/<agente>/memoria/`
- **Rutas de control:** `proyectos/hexfrontier/actividades_pendientes/`, `proyectos/hexfrontier/actividades_terminadas/`, `proyectos/hexfrontier/resultados/`
- **Coordinación:** `orquestador` (respetando los roles y memorias de los 7 agentes: `orquestador`, `arquitecto`, `programador`, `empaquetado`, `tester`, `contenidos`, `marketing`).
- **Objetivo:** Atender el informe real de pruebas del juego en `proyectos/hexfrontier/`, corrigiendo primero los bugs y fricciones de UX verificables en pantalla, y definiendo/iniciando la arquitectura para persistencia en nube, turnos asíncronos y curación de comunidad sin romper lo que ya funciona.

---

## Reglas del sistema y memoria
- Consulta las memorias vigentes en `agente/agentes/<agente>/memoria/` y el estado real del código en `proyectos/hexfrontier/` antes de actuar.
- **El código manda sobre los documentos:** no confíes en descripciones desactualizadas si el código dice otra cosa.
- **Lo que ya funciona no se rompe:** conserva confirmación al copiar código («Código copiado: ...»), lista pública de salas, búsqueda rápida base, jugar/rellenar con bots, salas persistentes en «Mis salas», persistencia al recargar con reconocimiento del mismo jugador y manejo de error ante código inexistente.
- **Reportes breves y técnicos:** nada de diarios de batallas ni narraciones largas en `proyectos/hexfrontier/resultados/` ni en las memorias. Pide confirmación explícita vía `orquestador` antes de borrados destructivos o cambios estructurales mayores.

---

## Hallazgos del tester a resolver


### 1. Mejoras de UX y claridad (`programador` + `contenidos` + `tester`)

- **Salas que no funcionan:** hay salas disponibles que no funcionan, quizá porque el jugador ya se fue, pero la experiencia es terrible. el modelo actual debería tener alguna forma de validar si se puede jugar o no. y terminar salas que no se pueden jugar.

- **Visibilidad de estado en búsqueda rápida:** cuando no haya salas abiertas y se cree una sala pública en espera, indicarlo claramente en pantalla («No había partidas abiertas; se creó una sala pública y estamos esperando rival»).

- **asignar sala rápida:** la sala se asigna sin elegir, sin esperar, si hay una sala lanzarte y entrar sin tener que estar en botones ni nada lo que quiero es jugar contra un humano y ahora habrá pocas salas, y pocos humanos.

- **Mensajes de Descubrimiento de eventos que están sucediendo:** que las unidades y edificios nos hablen, ya existe el sistema de mensajes, pero ciertos avisos deben salir de las unidades: 
    * El jugador no ha cambiado entre los distintos mapas. 
    * El jugador no ha visto sus estadísticas de recursos. 
    * El jugador no ha entrado al menú de diplomacia. 
    * El tratado está a apunto de terminar.
    * El jugador no ha pedido préstamos bancarios. 
    * El jugador no ha enviado recursos entre puertos separados.
    * El jugador tiene menos unidades/casillas que el enemigo o más es un termometro que se habla entre las unidades. 
    * Se prepara una concentración enemiga en tal zona del mapa. 
    * Avisar que todos los jugadores están esperando que termines. 
    * Avisar que tu turno ya terminó y falta un jugador o dos o tres por finalizar turno.
    ... 
    Los mensajes adicionales a los actuales, esto no cambia nada de lo existente da información que si el jugador lee 
    le puede orientar mucho. 

- **Pantalla de derrota al perder:** debe haber una pantalla de tipos de mapas, rrota para regresar al menú principal en modo multijugador al terminar la partida.

### 2. Arquitectura a diagnosticar y encaminar (`arquitecto` + `programador` + `contenidos`)

- **Estado en cliente vs. persistencia/nube:** analizar el riesgo de tener campaña, tribu, licencia y salas solo en cliente y proponer/implementar el camino hacia guardado en nube / Steam Cloud sin pérdida de datos al cambiar de dispositivo o limpiar datos.

- **Multijugador más allá de broker en línea:** evaluar y sentar bases para persistencia de partida en servidor/turnos asíncronos cuando un jugador cierre la pestaña.

- **Curación de mapas en comunidad:** proponer reglas/filtros básicos (moderación/ocultar pruebas, votos o mapa destacado) para evitar listas sucias.

## Reparto de trabajo
- **`orquestador`**: Coordina el orden de ejecución (1. Bugs y UX inmediatos -> 2. Diagnóstico/bases de arquitectura -> 3. Pruebas y cierre), vigila reglas y registra el reporte en `proyectos/hexfrontier/resultados/`.
- **`arquitecto`**: Revisa los puntos de arquitectura (estado en cliente/nube, turnos/sesión cuando se cierra pestaña, curación de comunidad) y valida el diseño de los cambios antes de tocar piezas estructurales.
- **`programador`**: Implementa directamente en `proyectos/hexfrontier/` las correcciones de bugs y UX aprobadas y las bases técnicas acordadas.
- **`tester`**: Ejecuta pruebas sobre los cambios y verifica que no haya regresiones en las funciones ya validadas.
- **`contenidos`**: Ajusta textos de interfaz, etiquetas confusas y documentación/memorias vigentes de forma breve y fiel.
- **`empaquetado` y `marketing`**: Fuera de alcance en esta pasada salvo impacto directo de configuración/requisitos.

## Formato de respuesta al terminar los cambios:
0. Haber hecho todas las mejoras que apliquen. 
Entrega un resumen breve, directo y en español con:
1. **Qué se corrigió y qué quedó planteado/encaminado** en `proyectos/hexfrontier/`.
2. **Cómo probarlo ahora mismo** (qué abrir y qué pasos seguir para comprobar cada punto del informe del tester).