# Actividad 01: Auditoría, limpieza y consolidación previa a la beta (Android APK y Steam)

- **Proyecto:** `proyectos/hexfrontier/` (**Federati**)
- **Ruta de memorias de agentes:** `agente/agentes/<agente>/memoria/`
- **Objetivo:** Auditar, depurar y consolidar el proyecto en `proyectos/hexfrontier/` para que refleje ÚNICAMENTE la realidad actual del juego (capacidades vigentes, arquitectura real y pendientes reales) antes de tocar el código funcional de la beta para **Android (APK)** y **Steam**.
- **Agente asignado:** `arquitecto` (coordinado por `orquestador`).

---

## Contexto y estructura real del sistema
Este proyecto se ha desarrollado durante meses con apoyo de varias IAs y acumula archivos `.md`, memorias de agentes, pruebas antiguas, prototipos y rutas descartadas que ya no coinciden con el código vigente.

Rutas reales de trabajo:
- **Proyecto del juego:** `proyectos/hexfrontier/`
- **Cola de tareas:** `proyectos/hexfrontier/actividades_pendientes/` (y actividades en `proyectos/hexfrontier/actividades/`)
- **Reportes de cierre:** `proyectos/hexfrontier/resultados/` (reportes **breves, técnicos y accionables**; **prohibido** escribir narraciones largas, diarios de batallas o historiales de qué IA hizo qué)
- **Actividades cerradas:** `proyectos/hexfrontier/actividades_terminadas/`
- **Memorias por agente:** `agente/agentes/<agente>/memoria/` para cada uno de los 7 agentes:
  - `agente/agentes/orquestador/memoria/`
  - `agente/agentes/arquitecto/memoria/`
  - `agente/agentes/programador/memoria/`
  - `agente/agentes/empaquetado/memoria/`
  - `agente/agentes/tester/memoria/`
  - `agente/agentes/contenidos/memoria/`
  - `agente/agentes/marketing/memoria/`

---

## Reparto oficial de roles (no invadir responsabilidades)
- **`orquestador`**: Coordina el flujo de actividades y resultados, verifica el cumplimiento de las reglas de seguridad y solicita confirmación al usuario antes de ejecutar acciones destructivas.
- **`arquitecto`**: Analiza la estructura real de `proyectos/hexfrontier/`, detecta contradicciones/archivos muertos y define el inventario y plan de limpieza/consolidación. **No** modifica lógica de gameplay ni ejecuta borrados sin aprobación.
- **`programador`**: Implementa o corrige código activo de juego, UI o controles solo cuando exista una tarea aprobada tras la auditoría.
- **`empaquetado`**: Audita y prepara los requisitos, configuraciones, firmas y exportación para **Android (APK)** y **Steam**.
- **`tester`**: Verifica que lo que figura como funcional realmente arranque, sea jugable y no tenga fallos críticos en pruebas ni builds.
- **`contenidos`**: Reescribe y consolida la documentación general y ayuda a depurar/estandarizar las memorias dentro de `agente/agentes/<agente>/memoria/` una vez aprobado el diagnóstico técnico del `arquitecto`, manteniendo textos breves y fieles al estado actual.
- **`marketing`**: Fuera de alcance en esta actividad (intervendrá cuando la beta esté empaquetada y lista para presentación/tienda).

---

## Reglas de seguridad y memoria
1. **Cero borrados o sobrescrituras a ciegas:** Antes de eliminar, mover, consolidar o limpiar archivos o memorias, presenta un inventario clasificado por acción (`MANTENER`, `CONSOLIDAR`, `ARCHIVAR`, `ELIMINAR`) y espera confirmación explícita (salvo instrucción directa de aplicar todo). Sugiere trabajar sobre una rama o commit de respaldo en Git.
2. **El código manda sobre los documentos:** La verdad sobre qué funciona la dictan el código activo, la escena/flujo principal jugable y la configuración actual de build/exportación, no los `.md` ni las memorias antiguas.
3. **Distingue `ARCHIVAR` de `ELIMINAR`:** Separa lo que conviene conservar como referencia fuera del flujo activo (`ARCHIVAR`) de lo que es basura, duplicado sin valor o prueba rota (`ELIMINAR`).
4. **Cero nostalgia ni memorias infladas:** Las memorias en `agente/agentes/<agente>/memoria/` y la documentación consolidada deben reflejar **solo el estado actual, reglas vigentes y pendientes reales** de ese rol. Nada de diarios de batallas ni historial de qué IA hizo qué.
5. **Uso de memoria por agente:** Cada agente consulta su carpeta `agente/agentes/<agente>/memoria/` al recibir tarea y actualiza únicamente lo relevante a su rol cuando cierre su parte.

---

## Fases de ejecución

### Fase 1: Diagnóstico y mapa del proyecto (Ejecutar ahora — `arquitecto`)
Revisa `proyectos/hexfrontier/` (estructura de carpetas, código activo, flujo principal del juego, configuración de exportación/build, pruebas, `.md` existentes y memorias en `agente/agentes/<agente>/memoria/`) y entrega:
1. **Mapa real del proyecto:** qué sistemas/módulos están activos hoy y cuál es el flujo principal que realmente corre.
2. **Contradicciones detectadas:** discrepancias entre `.md`/memorias en `agente/agentes/<agente>/memoria/` y el código vigente.
3. **Inventario propuesto de depuración y memorias:** listado de archivos, `.md` y memorias clasificados en `MANTENER`, `CONSOLIDAR`, `ARCHIVAR` y `ELIMINAR`.
4. **Bloqueos técnicos para beta (Android APK y Steam):** configuraciones rotas, restos de enfoques descartados o dependencias conflictivas detectadas.

**Entregable de Fase 1:** Guardar resumen técnico en `proyectos/hexfrontier/resultados/01_diagnostico_arquitecto.md` y detenerse para pedir aprobación antes de modificar, mover o borrar archivos.

---

### Fase 2: Limpieza y depuración (Tras aprobación — `arquitecto` / `orquestador`)
- Ejecutar únicamente los movimientos, archivados y eliminaciones aprobados en el inventario de Fase 1.
- Verificar que el flujo principal en `proyectos/hexfrontier/` quede limpio y sin referencias rotas tras la depuración.

---

### Fase 3: Consolidación de documentación y memorias por agente (Tras Fase 2 — `arquitecto` + `contenidos` + agentes)
- El `arquitecto` fija la verdad técnica del proyecto; `contenidos` consolida los `.md` del proyecto y ayuda a limpiar/estructurar los archivos en `agente/agentes/<agente>/memoria/`:
  - **Estado actual del juego:** qué es jugable hoy, qué sistemas están activos y qué queda incompleto o fuera de alcance para esta beta.
  - **Arquitectura y puntos clave:** organización real de carpetas/módulos y dónde tocar cada sistema.
  - **Flujo de build y release (Android APK y Steam):** requisitos, configuraciones actuales, variables/claves necesarias y pasos para generar builds de prueba.
  - **Pendientes reales de beta:** bugs conocidos, ajustes de controles/UI/rendimiento y siguientes tareas.
- Cada agente (`orquestador`, `arquitecto`, `programador`, `empaquetado`, `tester`, `contenidos`, `marketing`) deja su memoria limpia en su carpeta `agente/agentes/<agente>/memoria/` con solo lo que le aplica hoy.

---

### Fase 4: Cierre y verificación inicial de beta (`empaquetado` + `tester` + `orquestador`)
- **Cerrada como revisión estática inicial:** `empaquetado` documentó configuración y bloqueos Android/Steam; `tester` dejó checklist post-migración; `orquestador` registró el cierre en `resultados/02_cierre_fase4.md`.
- El usuario reporta que el juego pasó prueba funcional manual en navegador sin errores aparentes. No se ejecutaron pruebas automatizadas ni builds.
- La PC corporativa no permite instalar Node.js/npm ni Android SDK por falta de privilegios administrativos; esto se registra como bloqueo temporal del entorno, no como fallo del código.
- La generación/instalación del APK y la build/prueba de Steam quedan para completar en otra computadora. Las tareas separadas están en `Actividades/actividades_pendientes/`; esta actividad no certifica que la beta nativa esté lista.