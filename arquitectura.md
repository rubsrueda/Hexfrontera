# Arquitectura actual — Hexfrontier / Federati

## 1. Diagnóstico del Sistema Actual

Federati es un juego táctico 4X por turnos implementado como aplicación web de página única. El runtime no usa módulos ES: `index.html` carga scripts clásicos en orden y estos comparten `window.HF`. `js/main.js` coordina el arranque; `js/engine.js` implementa las reglas; la interfaz y el tablero consumen y modifican el estado del motor.

El código incluye escaramuzas, campañas/desafíos, tribus/doctrinas, IA, diplomacia, editor/mapas, replays, modo en línea, almacenamiento, localización, telemetría y servicios opcionales. La presencia de esos sistemas en el código no certifica por sí sola el arranque o la jugabilidad de una build.

**Límites confirmados:**

- El estado global `HF` y la carga secuencial generan acoplamiento entre módulos; conservar el orden de `index.html` es requisito para el runtime.
- `js/mapgen.js` genera terreno por elevación y ruido, biomas, montañas/colinas, ríos/lagos, recursos, árboles y capitales. No implementa los seis arquetipos geomorfológicos de `Actividades/actividades_terminadas/mapas.md`; esos requisitos tampoco están cubiertos por `tester_qa/mapgen_test.js`.
- Android no tiene proyecto nativo generado (`wrappers/android/`); Electron configura un recurso `build/icon.ico` que no está presente. No se verificaron builds.
- No se pudieron ejecutar pruebas: `node`, `npm` y Git no están disponibles en PATH. Los resultados de `tester_qa/run_all.js` y de los comandos de build quedan pendientes.

## 2. Mapa del Sistema

### Capas y responsabilidades

| Capa | Archivos principales | Responsabilidad |
|---|---|---|
| Shell/arranque | `index.html`, `js/main.js` | Carga secuencial; arranque tras `HF.platform.ready`; resuelve deep links, reanudación, Lore y Hub. |
| Dominio | `js/config.js`, `js/data.js`, `js/engine.js` | Balance, catálogos y estado/reglas de partida. |
| Mapa y tablero | `js/mapgen.js`, `js/board.js`, `js/art.js`, `js/artdata.js` | Generación procedural, renderizado Canvas, arte y animaciones. |
| Interfaz | `js/screens.js`, `js/game.js`, `js/maps.js`, `js/editor.js` | Registro/navegación de pantallas, partida, mapas y edición. |
| Estrategia | `js/ai.js`, `js/diplomacy.js`, `js/diplomacy_ai.js`, `js/diplomacy_ui.js` | Turnos de facciones no humanas, tratados y presentación diplomática. |
| Persistencia/plataforma | `js/util.js`, `js/storage.js`, `js/platform.js`, `wrappers/electron/*` | Almacenamiento web/nativo, restauración, guardado y ciclo de vida. |
| Servicios | `js/cloud.js`, `js/auth.js`, `js/online.js`, `sql/`, `supabase/` | Identidad, datos en nube y funcionalidad en línea. |
| Sistemas transversales | `js/i18n.js`, `js/telemetry.js`, `js/feedback.js`, `js/event-feedback.js`, `js/replay.js`, `js/replays.js` | Idiomas, diagnóstico, feedback, encuestas y repeticiones. |
| Empaquetado | `tools/build.mjs`, `wrappers/scripts/stage-web.js`, `wrappers/package.json` | Build web y preparación del runtime para Electron/Capacitor. |

### Flujo de datos y ejecución

1. `index.html` carga utilidades, plataforma, almacenamiento/configuración, datos, motor/IA, interfaz, servicios y finalmente `js/main.js`. El HTML es la fuente del orden; `tools/check-syntax.js` verifica el shell y `sw.js` mantiene una lista de caché para web.
2. `main.js` espera la restauración de plataforma. Luego prioriza enlaces de mapa/replay, reanudación de partida, introducción y Hub.
3. Una partida nueva pasa por `HF.newGame()` y `HF.generateMap()`. `engine.js` crea el estado; `game.js` instancia el estado temporal de interfaz y un `HF.Board` para Canvas.
4. Las acciones del jugador llaman reglas del motor y refrescan la interfaz/tablero. Al terminar el turno, el motor actualiza facciones rivales mediante la IA y luego procesa el cierre de ronda.
5. Guardado y replay serializan el estado del motor; nube y modo en línea se integran como servicios aparte.

La aplicación de escritorio/móvil hospeda el mismo shell web. `stage-web.js` copia los recursos runtime a `wrappers/www/`; Electron los sirve bajo `app://` y usa IPC para guardados. Capacitor declara `webDir: "www"` y puente móvil.

## 3. Modelo de Datos

### Estado de partida (`g`)

`HF.newGame()` construye el estado mutable que comparten motor, interfaz e IA. Sus campos principales son:

- Identidad/reglas: `v`, `mode`, `seed`, `R`, `biome`, `fog`, `difficulty`, `goal`, `meta`.
- Progreso: `turn`, `cur`, `over`, `rs`.
- Mundo: `f` (facciones), `cells` (celdas hexagonales), `fogMap`, `timeline`, `events`.
- Historial/transitorios: `undo`, `replayLog`, flags de replay y caches internas con prefijo `_`.

Cada celda tiene coordenadas/índice (`i`, `q`, `r`), terreno (`t`), recurso (`res`), edificio (`b`), dueño (`o`), capital, unidad (`u`), suministro/estado de combate y campos opcionales para puentes, fuego, tumbas, diplomacia y otros eventos. Los valores canónicos se definen en los catálogos/configuración, no en la UI.

Las facciones guardan identidad, reglas activas de tribu, recursos, economía, estado de vida y progreso de victoria. La diplomacia mantiene tratados/mercado y los replays registran acciones/fases necesarias para reproducir una partida.

### Estado de interfaz (`st`)

`game.js` crea un estado efímero por vista de partida: selección, opciones disponibles, acción pendiente, drawer/modal, bloqueo de turno, foco, cursor de eventos y burbujas. No es el estado serializado de la partida. `screens.js` conserva el nombre de pantalla actual en `HF.currentScreen`.

### Persistencia y formatos

- `HF.serialize(g)` omite caches privadas, `undo` y flags internos; convierte `fogMap` en array y serializa celdas/diplomacia a estructuras JSON.
- `HF.deserialize()` acepta objeto o texto JSON, valida estructura básica y restaura valores por defecto/campos derivados.
- `HF.store.atomicSave()` protege la última partida con una escritura temporal. En Electron, `platform.js` sustituye el backend por IPC y `wrappers/electron/saves.js` escribe archivos atómicamente. En Capacitor se usa el almacenamiento local con espejo/restauración de Filesystem; `main.js` espera `platform.ready`.
- Los códigos de mapa/replay y los datos de nube son formatos separados; no deben confundirse con el savegame local.

## 4. FSM y Contratos de Integración

### Estados y transiciones

- `screens.js` registra y navega pantallas con `HF.screen(name, render)` y `HF.go(name, arg)`. Los estados registrados actualmente incluyen Hub, tribu, nueva partida, campaña, desafío diario, estadísticas, ajustes, mapas y online; editor/mapas se registran en sus módulos.
- `main.js` selecciona la ruta inicial según enlace (`seed`, mapa compartido o replay), sesión guardada, ajustes de introducción y estado de plataforma.
- `HF.startGame(g)` construye la vista de juego y asigna callbacks de salida/guardado. El botón de fin de turno local invoca `HF.endTurn(g, HF.aiPlay)`; las partidas online entregan/listan turnos mediante `HF.online`.

### Ciclo de turnos

`HF.endTurn()` cierra acciones del jugador, ejecuta `startTurn` y `aiPlay` para cada facción rival viva, revisa eliminación/fin de partida y termina con `roundEnd()`, que actualiza el turno y prepara de nuevo al jugador. El tablero mantiene un ciclo de render/animación independiente del ciclo de turnos.

### Contratos principales

| Contrato | Uso |
|---|---|
| `HF.newGame(options)` / `HF.generateMap(options)` | Crear partida y mapa determinista por semilla. |
| `HF.act`, `HF.endTurn`, `HF.startTurn`, `HF.checkEnd` | Aplicar acciones y avanzar las reglas de la partida. |
| `HF.startGame(g)` / `HF.go(name, arg)` | Montar la partida y navegar pantallas. |
| `HF.serialize(g)` / `HF.deserialize(data)` | Convertir/restaurar el estado persistente. |
| `HF.store` / `HF.platform.ready` | Persistencia síncrona/fachada de plataforma y señal de restauración inicial. |
| `HF.Board` | Renderizar el tablero y gestionar animación/interacción visual. |

Todo módulo nuevo debe respetar el orden de carga, usar los contratos existentes de `HF`, mantener persistencia compatible y añadir pruebas de regresión para cambios de reglas/serialización.
