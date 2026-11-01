# Arquitectura Técnica — HexFrontier

## 1. Diagnóstico del Sistema Actual

### 1.1 Resumen General

HexFrontier es un juego de estrategia hexagonal por turnos en el estilo 4X, implementado como una **PWA (Progressive Web App)** de un solo archivo HTML. El juego está escrito completamente en JavaScript vanilla (ES6+), sin Frameworks ni bundlers. Todo el código se ejecuta en el contexto del navegador, usando `canvas` para el renderizado del tablero y `localStorage` + Supabase para la persistencia. El juego funciona completamente offline hasta que el jugador elige acciones que requieren conectividad (rankings, mapas comunitarios).

### 1.2 Estado de Salud del Sistema

| Área | Estado | Observaciones |
|------|--------|---------------|
| Motor de juego (`engine.js`) | ✅ Funcional | 1517 líneas. Contiene TODO la lógica de negocio. |
| Sistema de pantallas (`screens.js`) | ✅ Funcional | 565 líneas. FSM de pantallas bien estructurado. |
| Renderizado (`board.js`) | ✅ Funcional | 705 líneas. Canvas 2D con zoom/pan animado. |
| IA (`ai.js`) | ✅ Funcional | 277 líneas. Utility AI de 4 fases, determinista. |
| Persistencia local | ✅ Funcional | `localStorage` con recovery atómico (`atomicSave`). |
| Persistencia en la nube | ✅ Funcional | Supabase REST API con fallback offline. |
| Repeticiones (replay) | ✅ Funcional | Codificación deflate + base64, reproducción determinista. |
| Editor UGC | ✅ Funcional | Export/import de mapas con formato compacto. |

### 1.3 Cuellos de Botella Detectados

#### CB-01: BFS de Suministro (Crítico)
- **`HF.supply()`** ejecuta una búsqueda en anchura (BFS) sobre todas las celdas para recalcular componentes de provincia y determinar aislamiento.
- Se llama **después de cada acción individual** del jugador (movimiento, ataque, construcción, talar, etc.).
- Complejidad: O(N) donde N = celdas del mapa. En mapas grandes (R=18), N ≈ 1027.
- **Impacto:** Cada clic del jugador desencadena una recálculo completo. En mapas grandes con muchas unidades, esto puede causar micro-stutters.

#### CB-02: Serialización de Undo con JSON.stringify (Moderado)
- **`snap()`** serializa TODO el estado del juego (celdas, facciones, fogMap) con `JSON.stringify` y lo almacena en un arreglo `undo` de hasta 30 entradas.
- Cada snapshot es una copia profunda del estado — consumo de memoria exponencial en mapas grandes.
- **Impacto:** GC (garbage collection) frecuente durante partidas largas. No hay serialización diferencial.

#### CB-03: Cálculo de Opciones de Unidad (Moderado-Alto)
- **`HF.options()`** calcula BFS de movimiento + BFS de ataque para una sola unidad.
- Se llama frecuentemente durante el renderizado de overlays de selección.
- La lógica de movimiento usa un sistema de "buckets" por coste (cuartos de PA) con iteraciones anidadas.
- **Impacto:** En unidades con alto movimiento (ej. Caballería R6), el BFS explora muchos nodos.

#### CB-04: IA Sincrónica en el Hilo Principal (Alto)
- **`HF.endTurn(g, HF.aiPlay)`** ejecuta la IA sincrónicamente en el hilo principal del browser.
- La visión documentada espera <500ms por facción, pero todos los cálculos bloquean el render.
- El `setTimeout(..., 40)` en `game.js` es un parche para permitir un frame de render entre el jugador y la IA.
- **Impacto:** Congelamiento momentáneo de la UI durante el turno de la IA. No hay Web Workers.

#### CB-05: Imágenes Embebidas en Base64 (Moderado)
- `artdata.js` contiene imágenes en base64 (~50KB+ cada una), como `data:image/webp;base64,...`.
- Duplican el peso del bundle JS y ralentizan el parsing del HTML.
- **Impacto:** Tiempo de carga inicial mayor. El Service Worker cachea todo, pero el parseo inicial es lento.

#### CB-06: Recálculo de Ruta Comercial por Turno (Moderado)
- **`tradeRoutes()`** ejecuta BFS desde cada par de asentamientos para encontrar rutas comerciales.
- Se cachea por turno (`g._trade`), pero se invalida al mover, construir, etc.
- **Impacto:** En mapas con muchas ciudades, el cálculo puede ser costoso.

### 1.4 Acoplamientos Detectados

| Acoplamiento | Módulos Involucrados | Descripción |
|---|---|---|
| **AC-01** | `engine.js` ↔ `ai.js` | `HF.endTurn(g, HF.aiPlay)` — el motor llama directamente a la función de IA como callback. |
| **AC-02** | `engine.js` ↔ `game.js` | `game.js` llama `HF.act`, `HF.endTurn`, `HF.serialize`, `HF.deserialize`. El engine expone `HF.checkEnd`, `HF.updateFog`, `HF.recordTimeline` que son llamados internamente. |
| **AC-03** | `board.js` ↔ `engine.js` | `Board` accede directamente al objeto `g` para leer `cells`, `f`, `fogMap`, `over`. |
| **AC-04** | `screens.js` ↔ `cloud.js` | `screens.js` llama directamente a `HF.cloud.*` para rankings, publicación, etc. |
| **AC-05** | `game.js` ↔ `replays.js` | `game.js` llama `HF.replays.flush`, `HF.replays.finish`, `HF.replays.share` directamente. |
| **AC-06** | Todos ↔ `HF` (namespace global) | Todos los módulos comparten el namespace `window.HF`. No hay aislamiento de dependencias. |

### 1.5 Deudas Técnicas y Riesgos

| ID | Riesgo | Descripción |
|---|---|---|
| DT-01 | Formato de guardado no versionado | `HF.deserialize` usa `Object.assign(HF.newCell(c), c)` sin validación de esquema. Un guardado corrupto o de versión anterior puede causar inconsistencias. |
| DT-02 | No hay pruebas unitarias | El `rules.md` define pruebas de aceptación, pero no hay un framework de testing automatizado. |
| DT-03 | Lógica de doctrinas dispersa | Las 81 doctrinas están implementadas como hooks esparcidos en `engine.js` y `ai.js`, usando checks `has(f, 'TAG')` en puntos específicos. |
| DT-04 | UI y lógica mezcladas | `game.js` contiene tanto lógica de renderizado como lógica de juego (ej. `nextIdleUnit` está en UI, no en engine). |
| DT-05 | Sin manejo de errores robusto | La IA usa `try/catch` amplio en `game.js:438` que puede enmascarar bugs. |
| DT-06 | Estado de partida no resumible | `HF.endTurn` no es reentrante ni pausable. No hay checkpoints intermedios durante la IA. |

## 2. Mapa del Sistema

### 2.1 Arquitectura de Módulos

```
┌─────────────────────────────────────────────────────────────────────┐
│                        index.html (Entry Point)                     │
│  Carga scripts en orden → inicializa window.HF → ejecuta main.js  │
└─────────────────────────────────────────────────────────────────────┘

  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
  │  util.js │ │ config.js│ │artdata.js│ │  art.js  │ │  data.js │
  │  (base)  │ │ (config) │ │(embedded)│ │ (loader) │ │ (doctrines)│
  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘
       │             │             │            │            │
       └─────────────┴─────────────┴────────────┴────────────┘
                                     │
                         ┌───────────┴────────────┐
                         │    engine.js            │
                         │  ← Game Core →          │
                         │  • newGame / serialize  │
                         │  • act / options        │
                         │  • supply / income      │
                         │  • endTurn / startTurn  │
                         │  • checkEnd / victory   │
                         │  • combat / defense     │
                         │  • fog / tradeRoutes    │
                         └───────────┬────────────┘
                                     │
         ┌──────────────────────────┼──────────────────────────┐
         │                          │                          │
  ┌──────┴─────┐    ┌──────────┐ ┌───┴────┐    ┌──────────┐ ┌───┴──────┐
  │  ai.js     │    │ board.js │ │ screens│    │ progress │ │  replay  │
  │ (AI 4-fase)│    │ (render) │ │  (FSM) │    │ (campaign)│ │ (replays)│
  └────────────┘    └──────────┘ └────────┘    └──────────┘ └──────────┘
         │                          │                          │
         │                          │                          │
  ┌──────┴─────┐    ┌──────────┐ ┌───┴────┐    ┌──────────┐ ┌───┴──────┐
  │ cloud.js   │    │ i18n.js  │ │ editor │    │ replays  │ │  game.js │
  │ (Supabase) │    │ (i18n)   │ │ (UGC)  │    │ (history)│ │ (game UI)│
  └────────────┘    └──────────┘ └────────┘    └──────────┘ └──────────┘
```

### 2.2 Responsabilidades por Módulo

| Módulo | Responsabilidad | Funciones Clave |
|---|---|---|
| `util.js` | Infraestructura base: RNG, grid hexagonal, storage, audio, vibración | `HF.rng`, `HF.makeGrid`, `HF.hexDist`, `HF.store`, `HF.sfx`, `HF.bgm` |
| `config.js` | Parámetros de balance: todas las constantes numéricas del juego | `HF.CFG` (inicio, income, units, combat, doctrine, win, sizes, biomes, mapgen, ai) |
| `artdata.js` | Imágenes de arte recortadas, embebidas como base64 data URIs | `HF.ARTDATA` |
| `art.js` | Cargador de imágenes: fondo removal (flood-fill), canvas processing, precaching | `HF.art.get`, `HF.art.draw`, `HF.art.html`, `HF.art.preload` |
| `data.js` | Datos de doctrinas: árbol de 81 nodos, tribu default, validación, crests, enums | `HF.DOCT`, `HF.PILLARS`, `HF.IMPL`, `HF.compileTribe`, `HF.validateProfile`, `HF.T`, `HF.B`, `HF.RES` |
| `mapgen.js` | Generación procedural de mapas: ruido FBM, ríos, recursos, capitales | `HF.generateMap`, `HF.newCell` |
| `engine.js` | **Núcleo del juego:** lógica de turnos, combate, economía, suministro, victoria, serialización | `HF.newGame`, `HF.act`, `HF.endTurn`, `HF.supply`, `HF.checkEnd`, `HF.serialize`/`deserialize` |
| `ai.js` | IA rival: Utility AI de 4 fases (auditoría, macro, micro, adaptación) | `HF.aiPlay`, `distField`, `scoreAtk`, `playUnits`, `macro`, `recruit`, `playShips` |
| `board.js` | Renderizado del tablero hexagonal en canvas: zoom, pan, partículas, animación | `HF.Board` (constructor, `draw`, `zoomAt`, `fit`, `startAnim`, `stopAnim`) |
| `cloud.js` | Integración con Supabase: identidad, rankings, mapas comunitarios, replays | `HF.cloud.*` (request, initIdentity, submitDailyScore, publishMap, getCommunityMaps, etc.) |
| `progress.js` | Progresión de campaña, generación de partidas, sistema de estrellas | `HF.buildFactions`, `HF.makeGame`, `HF.campaign`, `HF.dailySpec`, `HF.recordResult` |
| `i18n.js` | Sistema de internacionalización: diccionarios, traducción, selección de idioma | `HF.t`, `HF.lang`, `HF.setLang`, `HF.LOCALES`, `HF.LANGS` |
| `screens.js` | FSM de pantallas: hub, campaña, daily, newgame, settings, stats, tribe, editor | `HF.screen`, `HF.go`, `HF.modal`, `HF.toast`, `HF.codex` |
| `game.js` | Pantalla de partida activa: HUD, eventos, fin de turno, fin de partida, replay | `HF.startGame` |
| `editor.js` | Editor de mapas UGC: pintura 6 capas, validación pre-flight, export/import | `HF.exportMap`, `HF.importMap`, `HF.validateMap`, `HF.playMap` |
| `replay.js` | Codificación/decodificación de repeticiones: deflate, base64, URL-safe | `HF.encodeReplay`, `HF.decodeReplay`, `HF.playReplayFromCode` |
| `replays.js` | Historial de partidas: guardado, gestión, reproducción local | `HF.replays` (init, touch, flush, finish, list, play, remove, share) |
| `main.js` | Punto de arranque: recovery de guardados, detección de hash de replay, registro de SW | (entry point, 27 líneas) |
| `sw.js` | Service Worker: cacheo de todos los archivos para modo offline | install, activate, fetch (cache-first) |

### 2.3 Flujo de Datos

```
                    ┌────────────────────────────────────┐
                    │         Usuario (input)            │
                    │  click, tap, key, wheel, resize   │
                    └──────────────┬─────────────────────┘
                                   ▼
                    ┌────────────────────────────────────┐
                    │          board.js (input)         │
                    │  • zoomAt, pan, select, drag       │
                    └──────────────┬─────────────────────┘
                                   ▼
                    ┌────────────────────────────────────┐
                    │          game.js (eventos)        │
                    │  • act(from, to, kind)            │
                    │  • endTurn / undo / nextIdleUnit   │
                    └──────────────┬─────────────────────┘
                                   ▼
                    ┌────────────────────────────────────┐
                    │       engine.js (mutación g)      │
                    │  • HF.act() → actRaw()             │
                    │  • HF.endTurn(g, aiPlay)           │
                    │  • supply, income, combat          │
                    └──────────────┬─────────────────────┘
                                   │
                    ┌──────────────▼─────────────────────┐
                    │       engine.js → ai.js (turno)   │
                    │  • aiPlay(g, me)                    │
                    │  • Phase 1: audit (settle)        │
                    │  • Phase 2: macro (build/recruit) │
                    │  • Phase 3: micro (combat)        │
                    └──────────────┬─────────────────────┘
                                   ▼
                    ┌────────────────────────────────────┐
                    │       board.js (render)            │
                    │  • board.draw() / refresh()      │
                    │  • Reacciona a mutations de g     │
                    └──────────────┬─────────────────────┘
                                   │
                    ┌──────────────▼─────────────────────┐
                    │   util.js / engine.js (persist)    │
                    │  • HF.serialize → atomicSave       │
                    │  • HF.replays.flush                │
                    └──────────────┬─────────────────────┘
                                   ▼
                    ┌────────────────────────────────────┐
                    │   cloud.js (async background)     │
                    │  • submitMapScore (web)            │
                    │  • flushQueue (web)                │
                    └────────────────────────────────────┘
```

### 2.4 Principios de Diseño Detectados

1. **Todo-Ocurre-en-el-Tablero:** La UI mantiene el jugador en el tablero durante toda la partida. No hay pantallas de carga ni menús emergentes dentro del juego.
2. **Determinista:** El motor usa un RNG sembrado (`HF.rng(seed)`) para garantizar repeticibilidad. Las partidas pueden reproducirse exactamente.
3. **Offline-First:** Todo el juego funciona sin conexión. La nube es un complemento asíncrono que nunca bloquea.
4. **Hook Dispatcher de Doctrinas:** Las 81 doctrinas se integran mediante 5 hooks principales: `HOOK_MOVE`, `HOOK_COMBAT`, `HOOK_SUPPLY`, `HOOK_ECONOMY`, `HOOK_ECONOMY_VICTORY`.
5. **Configuración como Única Fuente de Verdad:** `HF.CFG` en `config.js` contiene todos los números de balance. El motor, la IA y la generación de mapas solo leen de allí.

## 3. Modelo de Datos

### 3.1 Entidades Principales

#### 3.1.1 Celda (Cell / Hexágono)

La unidad atómica del tablero. Cada hexágono es un objeto plano con 6 "capas":

```js
// HF.newCell(c) en mapgen.js:4
{
  i: number,        // Índice único en el arreglo de celdas
  q: number,        // Coordenada axial q
  r: number,        // Coordenada axial r
  // Capa 1: Terreno
  t: number,        // 0=LLANO, 1=COLINA, 2=MONTANA, 3=RIO, 4=MAR (HF.T)
  // Capa 2: Recurso natural
  res: number,      // 0=NINGUNO, 1=ORO, 2=TRIGO, 3=MADERA (HF.RES)
  // Capa 3: Asentamiento
  b: number,        // 0=NINGUNO, 1=ARBOL, 2=CAMINO, 3=CAMPAMENTO, 4=PUEBLO, 5=CIUDAD, 6=BASTION (HF.B)
  // Capa 4: Soberanía
  o: number,        // Dueño de la casilla: -1=neutral, 0..N=facción
  cap: number,      // 1 si es capital de facción (0 no)
  // Capa 5: Propiedad/Estado de edificio
  noCamp: number,  // Marcador: campamento fue empacado (no genera campamento automático)
  // Capa 6: Unidad y restos
  u: object|null,    // Unidad (si existe) { type, tier, owner, mv, at, retreat, cargo, debuff, debuffTurn }
  tomb: number,     // Contador de tumba (desaparece en N turnos)
  deg: number,      // Degradación de defensa (por arquero/asedio)
  degBy: number,    // Dueño que infligió la degradación
  // Estado de combate/especial
  conq: boolean,    // Marcador de conquista (para estadísticas)
  wonder: number,   // 1 si hay una maravilla (pirámide) en esta casilla
  wonderAt: number, // Turno en que se construyó la maravilla
  lastStand: number,// Marca "Último Bastión"
  lastStandTurn: number,
  builtTurn: number,// Turno de construcción (para FORTIFIED_ESTATE)
  firedTurn: number,// Turno de disparo de bastión (WALL_EMBRASURES)
  autoCampTurn: number, // Turno de campamento automático
  burn: number,     // Cenizas (SCORCHED_EARTH) - turnos restantes
  fire: number,     // Fuego (PHOSPHORUS_FIRE) - turnos restantes
  trap: number|null,// ID de facción que puso la trampa (CALTROP_SNARE)
  trapTurn: number, // Turno de la trampa
  // Cálculo de provincia (runtime)
  comp: number,     // Índice de la componente/provincia (celda raíz)
  sup: number,      // 1 si tiene suministro, 0 si no
  iso: number,      // Turno en que se aisló (0 = no aislada)
}
```

#### 3.1.2 Unidad (Unit)

```js
{
  type: string,   // 'INF'|'ENG'|'ARC'|'CAB'|'SIE'|'BAR'
  tier: number,   // 1..4 (4 = pretoriano con PRAETORIAN_GUARD)
  owner: number,  // Índice de facción
  mv: number,      // Puntos de movimiento restantes (1 = disponible)
  at: number,     // Puntos de acción/ataque restantes (1 = disponible)
  cargo: object|null, // Unidad transportada por Barco { type, tier, owner, mv, at }
  elite: number,  // 1 si es pretoriano
  retreat: number,// 1 si está en retirada Parthian
  debuff: number, // Penalización de ataque temporal (VANGUARD_SACRIFICE)
  debuffTurn: number, // Turno del debuff
}
```

#### 3.1.3 Facción (Faction)

```js
{
  id: number,        // Índice 0..N
  name: string,      // Nombre de la tribu
  color: string,     // Color HEX (6 caracteres)
  crest: string,     // ID del blasón ('c01'..'c12')
  human: boolean,    // True si es el jugador humano
  tags: string[],    // Tags de doctrina activos (compilados desde paths)
  alma_path: string[],    // ['A1', 'A1.1', 'A1.1.1'] - ruta de Alma
  arma_path: string[],    // ['B1', 'B1.1', 'B1.1.1'] - ruta de Arma
  victoria_path: string[], // ['C1', 'C1.3', 'C1.3.1'] - ruta de Victoria
  // Recursos
  gold: number,
  food: number,
  wood: number,
  stock: object,     // { [compId]: { gold, food, wood } } - almacén por provincia
  // Estado de partida
  alive: boolean,    // False cuando se elimina la facción
  grace: number,     // Turnos de gracia (ZEALOT_MARTYRDOM)
  wonderTurns: number, // Contador de protección de maravilla
  wonderCell: number,  // Celda de la maravilla
  starvationsInduced: number, // Contador para INDUCED_BANKRUPTCY
  goodStreak: number,  // Racha positiva para GOLDEN_ERA_STREAK
  deficit: boolean,    // True si tiene déficit de recursos
  loan: object|null,   // { comp, turns, perTurn, cell }
}
```

#### 3.1.4 Juego (Game State / `g`)

Ver sección 3.2 del Diagnóstico. El objeto `g` contiene:
- **Control:** `turn`, `cur` (facción actual), `over` (fin de partida), `goal` (condición de victoria), `mode` (skirmish/campaign/daily/community), `difficulty`.
- **Mapa:** `cells` (arreglo de Cell), `fogMap` (Int8Array), `_grid` (cache de grid hexagonal), `_customCells` (para mapas del editor).
- **Facciones:** `f` (arreglo de Facción).
- **Eventos:** `events` (log circular de 60 eventos), `timeline` (snapshot por turno para gráficos).
- **Replay:** `replayLog` (arreglo de acciones `[[0, from, to, kind], [1, b, ci, comp], [4, rng], [5, ci], ...]`), `isReplay`, `noReplay`.
- **Persistencia:** `undo` (stack de snapshots para deshacer).
- **RNG:** `rs` (estado del RNG sembrado), `_rng` (instancia cacheada).
- **Estadísticas:** `stat` (kills, lost, cuts, deserts, isolatedEver, built, captured, recruited).
- **Comercio:** `_trade` (cache de rutas comerciales por turno).
- **Meta:** `meta` (nombre, act, level, par, challenge, mapId).

### 3.2 Enumeraciones y Constantes

#### 3.2.1 Tipos de Terreno (T)
| Valor | Constante | Nombre | Característica |
|-------|-----------|--------|----------------|
| 0 | `LLANO` | Llano | Terreno base, transitable |
| 1 | `COLINA` | Colina | +1 defensa para infantería |
| 2 | `MONTANA` | Montaña | 2 PA coste, requiere camino/eng |
| 3 | `RIO` | Río | Agua dulce, navegable, cruces cuestan todo |
| 4 | `MAR` | Mar | Agua salada, requiere barco |

#### 3.2.2 Recursos (RES)
| Valor | Constante | Nombre |
|-------|-----------|--------|
| 0 | `NINGUNO` | Sin recurso |
| 1 | `ORO` | Oro |
| 2 | `TRIGO` | Trigo |
| 3 | `MADERA` | Madera |

#### 3.2.3 Asentamientos (B)
| Valor | Constante | Nombre | Nivel | Defensa | Producción [oro, comida] |
|-------|-----------|--------|-------|---------|--------------------------|
| 0 | `NINGUNO` | Vacío | 0 | 0 | — |
| 1 | `ARBOL` | Árbol | 0 | 0 | — |
| 2 | `CAMINO` | Camino | 1 | 0 | [0, 0] |
| 3 | `CAMPAMENTO` | Campamento | 2 | 1 | [1, 1] |
| 4 | `PUEBLO` | Pueblo | 3 | 1 | [2, 4] |
| 5 | `CIUDAD` | Ciudad | 4 | 2 | [4, 8] |
| 6 | `BASTION` | Bastión | 3 | 3 | [1, 2] |

#### 3.2.4 Unidades (UNITS)
| Tipo | Nombre | Costo | Comida (`up`) | Oro (`upGold`) | Movimiento | Rango Ataque | Especial |
|------|--------|-------|---------------|----------------|------------|-------------|----------|
| `INF` | Infantería | 10g, 5f | `[1, 3, 7]` | `[1, 2, 5]` | 3 PA | 1 | Fusión T1→T4, Pretoriano T4 |
| `ENG` | Ingeniero | 25g, 5f, 5m | `[1, 3, 7]` | `[1, 3, 6]` | 4 PA | 1 | Cruza montañas/ríos, SCORCHED_EARTH |
| `ARC` | Arquero | 15g, 5m | `[1, 3, 6]` | `[2, 4, 8]` | 3 PA | 1 | Dispara (rango 2/3), PHOSPHORUS_FIRE |
| `CAB` | Caballería | 20g, 10f | `[3, 6, 11]` | `[2, 5, 10]` | 6 PA | 2/3 | Carga +1 ataque, PARTHIAN_RETREAT |
| `SIE` | Asedio | 25g, 15m, 10f | `[2, 5, 8]` | `[3, 7, 13]` | 2 PA | 1 | Dispara edificios, 1 turno inmóvil |
| `BAR` | Barco | 30g, 25m | `[2, 4, 8]` | `[2, 4, 8]` | 5 PA | 2 | Transporta 1 unidad (embarcar/desembarcar) |

**Nota de balance económico (válido desde 2026-10-30):** La matriz de mantenimiento implementa una curva exponencial diferenciada por tipo de unidad. La Infantería N3 (7/5) es sostenible con una ciudad + granja; la Caballería N3 (11/10) requiere ~2 ciudades grandes y es el "terror del grano"; el Asedio N3 (8/13) es el mayor pozo de oro y requiere minas activas. El nodo de decisión de fusión a N3 implica un compromiso económico real sin colapsar la partida de 15 minutos. La doctrina `ASCETIC_COMMUNE` reduce el mantenimiento de INF/ENG a N2 máximo, ofreciendo ahorros significativos pero no rotos. `KNIGHTLY_ORDER` duplica el `upGold` de CAB, manteniendo la amenaza táctica sin volverla inutilizable.

### 3.3 Modelo de Datos: Árbol de Doctrinas

```
                    A (Alma)              B (Arma)              C (Victoria)
                  Raíz Terrestre       Fuerza Pesada        Dominación Total
                 ┌─────┬─────┐       ┌─────┬─────┐       ┌─────┬─────┐
            Burocracia  Teocracia  Casta     Enjambre    Choque    Maestría
                ┌─┼─┐   ┌─┼─┐   Feudal ├──────┐  Blindado ├───────┐ Balística
           ┌────┼──┼──┐ ┌───┼──┐ ┌──────┼────┐  ├─────┼──┐  ┌─────┼────┐
   Integración│Enclave│Sustitución  Devoción │Herejía│Ascetismo   Picas│Sacrificio│Marea
   Preser.vación│de Explo.│Demográfica Fanática Inquisitor. Agr.varia Comunales Vanguardia Campesina
   ... (81 nodos total)
```

- **3 Pilares:** Alma (A), Arma (B), Victoria (C). Cada pilar tiene 3 raíces de nivel 1, cada una con 3 ramas de nivel 2, cada una con 3 doctrinas de nivel 3 = 27 × 3 = 81 nodos.
- **Compilación:** `HF.compileTribe(t)` toma los 9 paths (3×3) del jugador y genera `active_rules` (lista de tags).
- **Hook Dispatcher:** Cada doctrina se aplica en el motor mediante checks `has(f, 'TAG')` en 5 puntos de inyección.

### 3.4 Serialización y Persistencia

#### 3.4.1 Save Game (Local)
- **Formato:** JSON serializado, almacenado en `localStorage` bajo la clave `hf_savegame_active`.
- **Mecanismo:** `HF.serialize(g)` crea un objeto plano con todas las celdas, facciones y metadatos. `HF.deserialize(o)` reconstruye el objeto `g` usando `Object.assign(HF.newCell(c), c)`.
- **Recovery atómico:** `HF.store.atomicSave` usa un archivo temporal (`_tmp`) para evitar corrupción por interrupciones.
- **Service Worker:** `sw.js` cachea todos los archivos estáticos para funcionamiento offline.

#### 3.4.2 Replay (Reproducción)
- **Log:** `g.replayLog` registra acciones como `[1, from, to, kind]` (acción), `[2, b, ci, comp]` (construcción), `[4]` (marca de fase/RNG), `[5, ci]` (préstamo).
- **Codificación:** `HF.encodeReplay` usa `CompressionStream('deflate')` si está disponible, con fallback a `JSON + base64 URL-safe`.
- **Payload:** `{ v:1, setup:{...}, log:[...] }` — incluye configuración del juego y log de acciones.
- **Reproducción:** `HF.replayPhase(g, rngState)` avanza fase por fase, restaurando el RNG para determinismo.

#### 3.4.3 Mapa UGC (Editor)
- **Formato:** `v1:{R}:{seed}:{base64}` — versión, radio, semilla, datos comprimidos.
- **Codificación de celdas:** Cada celda se codifica como una cadena de 6-8 caracteres: `t{res}{b}{owner}{cap}[{type}{tier}{owner}]` — ejemplo: `11201I20` = llano, trigo, camino, dueño 1, capital 0, Infantería N2 del J0.
- **Compresión RLE:** Las celdas consecutivas idénticas se comprimen como `N×token` (ej. `5x11201I20`).
- **Validación:** `HF.validateMap` verifica 2+ capitales, capitales en tierra transitable, conectividad de capitales.

#### 3.4.4 Nube (Supabase)
- **Base URL:** `https://wwafeitljxnlvmjtwsjz.supabase.co/rest/v1`
- **API Key:** Clave pública de lectura/escritura limitada.
- **Timeout:** 1500ms con `AbortController`.
- **Fallback:** Si falla la red, se activa el modo offline silenciosamente.
- **Datos sincronizados:** Perfil de tribu, estadísticas, puntuaciones diarias, mapas comunitarios, replays del Top.

### 3.5 Almacenamiento en Memoria (Runtime Caches)

| Cache | Propósito | Invalidación |
|-------|-----------|--------------|
| `g._grid` | Grid hexagonal con vecinos | Nunca (se crea una vez) |
| `g._rng` | Instancia de RNG sembrado | Al cambiar `g.rs` |
| `g._trade` | Rutas comerciales por facción | Al mover/construir/capturar |
| `g._customCells` | Celdas personalizadas del editor | Al cargar mapa |
| `board.parts` | Partículas de ambiente | Al cambiar bioma/estación |
| `board._pat` | Patrón de niebla | Al recargar arte |
| `f.stock` | Almacén por provincia | Al recalcular supply() |

## 4. FSM y Contratos de Integración

### 4.1 Máquina de Estados Finitos

#### 4.1.1 FSM de Pantallas (Screen State Machine)

```
                        ┌──────────────┐
                        │      HUB     │
                        │ (menú principal)│
                        └──────┬───────┘
                               │
        ┌────────────────┼───────────────────────┼──────────────────┐
        ▼                ▼                        ▼                  ▼
  ┌───────────┐  ┌───────────┐        ┌───────────┐    ┌───────────┐
  │ NEW GAME  │  │ CAMPAÑA   │        │  DAILY    │    │   STATS   │
  │(setup)    │  │(select)   │        │(challenge)│    │(stats)    │
  └────┬──────┘  └─────┬─────┘        └─────┬─────┘    └─────┬─────┘
       │               │                    │                │
       │         ┌─────▼─────┐              │                │
       │         │ LEVEL     │              │                │
       │         │ PREVIEW   │              │                │
       │         └─────┬─────┘              │                │
       │               │                    │                │
       └──────────►┌───▼───┐◄───────────────┘◄───────────────┘
                   │ IN GAME│  (game.js)
                   │ (play) │
                   └───┬───┘
                       │
          ┌─────────────┼──────────────┐
          │             │              │
          ▼             ▼              ▼
     ┌─────────┐  ┌──────────┐  ┌──────────┐
     │  PAUSE  │  │  END     │  │  BUILD   │
     │  MENU   │  │ (victory)│  │  /RECRUIT│
     │         │  │  MODAL   │  │  DRAWER  │
     └─────────┘  └──────────┘  └──────────┘

  ┌───────────┐    ┌──────────┐    ┌──────────┐
  │  TRIBE    │    │  EDITOR  │    │ SETTINGS │
  │ EDITOR    │    │ (MAP UGC)│    │          │
  └───────────┘    └──────────┘    └──────────┘

  ┌──────────┐    ┌──────────┐
  │REPLAY    │    │COMMUNITY │
  │VIEWER    │    │MAPS      │
  └──────────┘    └──────────┘
```

**Transiciones de pantalla:** Todo cambio de pantalla pasa por `HF.go(name, arg)` en `screens.js`:
1. `HF.closeModal()` — cierra modales.
2. Ejecuta `HF.onLeave()` si existe (cleanup de animaciones, audio, listeners).
3. Limpia `#app` y `#modal`.
4. Ejecuta el handler registrado con `HF.screen(name, fn)`.
5. Si hay error, muestra pantalla de error con botón "Volver al Hub".

#### 4.1.2 FSM de Turnos (Turn Phase Machine)

```
┌─────────────────────────────────────────────────────────────┐
│                    TURN PHASE FSM                          │
└─────────────────────────────────────────────────────────────┘

  [PHASE 0: PLAYER ACTION]
  │  Estado: g.cur = 0, player has mv/at
  │  Acciones: move, attack, shoot, siege, recruit, build, etc.
  │  Triggers: click en celda, click en botón End Turn
  │
  ├─► [END TURN BUTTON CLICKED]
  │     │
  │     ▼
  │  [PHASE 1: CLEAR DEGRADATION (player)]
  │  → clearDeg(g, 0) — limpia marca de degradación del jugador
  │  → noUndo(g) — borra stack de undo
  │  → markPhase(g) — [4] en replayLog (marca RNG)
  │     │
  │     ▼
  │  [PHASE 2: AI ROUND (loop i=1..N)]
  │  │  Para cada facción IA viva:
  │  │    a) g.cur = i
  │  │    b) startTurn(g, f) — supply + refresh mv/at + settle (economía)
  │  │    c) aiPlay(g, i) — 4 fases de IA
  │  │    d) clearDeg(g, i)
  │  │    e) checkElim(g)
  │  │    f) HF.checkEnd(g) — verifica condiciones de victoria
  │  │    g) markPhase(g) — [4, rng] en replayLog
  │  │
  │  └─► ¿Game Over? ──SÍ──► [FINISH]
  │       │
  │       NO
  │       │
  │       ▼
  │  [PHASE 3: ROUND END]
  │  → roundEnd(g)
  │    • Decrementa tumbas, cenizas, fuegos (tomb--, burn--, fire--)
  │    • Actualiza wonderTurns (PYRAMID_STAND_15T)
  │    • Propagación de árboles (treeSpreadChance)
  │    • g.turn++
  │    • startTurn(g, g.f[0]) — refresh player
  │    • updateFog, recordTimeline, checkEnd
  │    • save_rs(g) — persiste RNG state
  │
  └─► [BACK TO PHASE 0: PLAYER ACTION]
```

#### 4.1.3 FSM de Reproducción (Replay Mode)

```
[REPLAY START]
  │
  ├──► replayPhase(g, rngState) por cada [4, rng] en replayLog
  │     • Si who === 0: clearDeg + noUndo
  │     • Si who > 0: clearDeg + checkElim + checkEnd
  │     • Avanza a next player o roundEnd
  │
  └──► Reproduce acciones [1, from, to, kind] en orden
        • actRaw ejecuta la acción (sin snap, sin replayLog push)
        
[REPLAY END]
  → showEnd() o continue hasta g.over
```

#### 4.1.4 FSM de Economía por Provincia

```
[START TURN]
  │
  ├──► supply(g) — BFS de componentes
  │     • Recalcula comp, sup, iso por celda
  │     • Auto-crea campamento si provincia aislada ≥ isolatedCampMin
  │     • Cuenta cortes (cuts)
  │
  └──► settle(g, f) — Pago de mantenimiento
        • Para cada provincia (comp):
        │  1. Calcular income (terrain + recursos + edificios + trade routes)
        │  2. Calcular upkeep (oro y comida por unidades)
        │  3. Si aislada este turno:
        │     • Si recursos cubren upkeep → paga normal
        │     • Si no → MASS DEGRADE (todas las unidades pierden un nivel)
        │  4. Si no aislada:
        │     • Pagar oro (degradation si no alcanza)
        │     • Pagar comida (degradation si no alcanza)
        │     • Aplicar préstamo si existe
        │  5. Sincronizar totales (syncTotals)
        │
        └──► ¿Deficit?
              ├── Sí → ZEALOT_MARTYRDOM (gracia) / INTEGRATION_PRESERVE (rebelión)
              └── No → goodStreak++ (para GOLDEN_ERA_STREAK)
```

### 4.2 Contratos de Integración

#### 4.2.1 API Pública del Motor (`HF.*` en engine.js)

| Función | Entrada | Salida | Descripción |
|---------|---------|--------|-------------|
| `HF.newGame(o)` | `{ mode, seed, R, biome, fog, difficulty, goal, meta, factions, customCells, giveUnits, startRes, setup }` | `g` (Game State) | Crea una nueva partida, genera mapa, inicializa facciones, suministro, stock, niebla. |
| `HF.act(g, from, to, kind)` | `g`, índice de celda origen, índice destino, tipo de acción (`'move'`, `'atk'`, `'shoot'`, `'siege'`, `'fire'`, `'trap'`, `'pack_camp'`, `'takeover'`, `'wonder'`) | `{ ok: boolean, msg?: string, kind?: string }` | Ejecuta una acción de unidad. Registra en replayLog si es exitosa. |
| `HF.options(g, ci)` | `g`, índice de celda con unidad | `Map<to, {k, A?, D?, ok?, from?, cost?, lastStand?, alt? }>` | Calcula todas las acciones legales para la unidad en `ci`. |
| `HF.endTurn(g, aiPlay)` | `g`, callback de IA | void | Avanza el turno: ejecuta IA para facciones 1..N, luego roundEnd. |
| `HF.supply(g)` | `g` | `cuts` (number) | BFS de componentes de provincia. Recalcula `sup`, `comp`, `iso`, `cap`. |
| `HF.checkEnd(g)` | `g` | void | Verifica condiciones de victoria/derrota. Llama `finish()` si hay ganador. |
| `HF.serialize(g)` | `g` | Objeto plano (JSON-serializable) | Serializa el estado para guardado. |
| `HF.deserialize(o)` | Objeto plano | `g` (Game State) | Deserializa y reconstruye el estado. |
| `HF.canStep(u, c, f)` | Unidad, Celda, Facción | `boolean` | Determina si una unidad puede moverse a una celda. |
| `HF.isEncircled(g, ci)` | `g`, índice de celda | `boolean` | Verifica si una unidad está cercada sin escape. |
| `HF.updateFog(g)` | `g` | void | Actualiza el mapa de niebla de guerra. |
| `HF.tradeRoutes(g, f)` | `g`, Facción | Array de `{ a, b, d }` | Calcula rutas comerciales (cacheadas por turno). |
| `HF.income(g, f, comp)` | `g`, Facción, componente | `{ gold, food, wood }` | Calcula ingresos de una provincia. |
| `HF.buildCost(g, f, b)` | `g`, Facción, building | `{ gold, food, wood }` | Calcula costo de construcción. |
| `HF.recruitCost(g, f, type, tier)` | `g`, Facción, tipo, tier | `{ gold, food, wood }` | Calcula costo de reclutamiento. |
| `HF.build(g, b, ci)` | `g`, building, cell | `{ ok, msg }` | Construye un edificio. |
| `g.recruit(g, type, ci, comp, tier)` | `g`, tipo, cell, comp, tier | `{ ok, msg }` | Recluta una unidad. |
| `HF.undo(g)` | `g` | `boolean` | Deshace la última acción (pop de undo stack). |
| `HF.canUndo(g)` | `g` | `boolean` | Verifica si se puede deshacer. |
| `HF.preview(g, f, comp)` | `g`, Facción, comp | `{ inc, upkeep, upkeepGold, loan, netFood, netGold }` | Calcula balance económico para UI. |
| `HF.defenseAt(g, ci)` | `g`, cell index | `number` | Calcula defensa total de una casilla. |
| `HF.defenseBreakdown(g, ci)` | `g`, cell index | `{ total, detail, parts, override, deg }` | Desglose para tooltips. |
| `HF.unitStats(g, type, tier, owner)` | `g`, tipo, tier, owner | `{ atk, def, move, atkRange, shoot, shootHill, elite, naval }` | Stats resumidas para UI. |

#### 4.2.2 API de Pantallas (`HF.screen`, `HF.go`)

| Función | Contrato |
|---------|----------|
| `HF.screen(name, fn)` | Registra un handler de pantalla. `fn(el, arg)` recibe el contenedor `#app` y un argumento opcional. |
| `HF.go(name, arg)` | Transición de pantalla: cierra modal, ejecuta `onLeave`, limpia `#app`, ejecuta handler. |
| `HF.modal(html, bind)` | Muestra un modal. `bind(modalChild)` para eventos. |
| `HF.toast(msg, ms)` | Mensaje flotante temporal (2.2s por defecto). |
| `HF.closeModal()` | Cierra el modal actual. |

#### 4.2.3 API de Render (`HF.Board`)

| Función | Contrato |
|---------|----------|
| `new HF.Board(canvas, opts)` | Constructor. `board.cells`, `board.game`, `board.mode`, `board.colors`, `board.bubbles` se asignan externamente. |
| `board.startAnim()` | Inicia el loop de animación (`requestAnimationFrame`). |
| `board.stopAnim()` | Detiene el loop de animación. |
| `board.draw()` | Renderiza el tablero completo. |
| `board.fit()` | Ajusta cámara para mostrar todo el mapa. |
| `board.centerOn(i)` | Centra la cámara en una celda. |
| `board.zoomAt(nz, sx, sy)` | Zoom manteniendo el punto de pantalla fijo. |

#### 4.2.4 API de IA (`HF.aiPlay`)

| Función | Contrato |
|---------|----------|
| `HF.aiPlay(g, me)` | Ejecuta el turno completo de la IA para la facción `me`. No retorna nada; muta `g` directamente. |

#### 4.2.5 API de Persistencia (`HF.store`)

| Función | Contrato |
|---------|----------|
| `HF.store.get(k, d)` | Lee de localStorage (clave `hf_{k}`). Fallback a memoria si localStorage falla. |
| `HF.store.set(k, o)` | Escribe JSON en localStorage. |
| `HF.store.atomicSave(k, o)` | Escritura atómica con archivo temporal. |
| `HF.store.recover(k)` | Recupera de escritura interrumpida (tmp). |
| `HF.store.del(k)` | Elimina clave. |
| `HF.store.has(k)` | Verifica existencia. |

#### 4.2.6 API de Cloud (`HF.cloud`)

| Función | Contrato |
|---------|----------|
| `HF.cloud.initIdentity()` | Crea/recupera ID de jugador y secret key. |
| `HF.cloud.saveProfileCloud()` | Sincroniza perfil de tribu a Supabase. |
| `HF.cloud.submitDailyScore(data)` | Envía puntuación del desafío diario. |
| `HF.cloud.getDailyLeaderboard(k)` | Obtiene Top 20 del día. |
| `HF.cloud.publishMap(data)` | Publica mapa a la comunidad. |
| `HF.cloud.getCommunityMaps()` | Lista mapas de la comunidad. |
| `HF.cloud.getMapLeaderboard(mapKey)` | Top por mapa. |
| `HF.cloud.submitReplayCode(mapKey, playerId, code)` | Envía replay del Top. |
| `HF.cloud.online` | Getter: estado de conectividad. |

#### 4.2.7 API de Replays (`HF.replays`)

| Función | Contrato |
|---------|----------|
| `HF.replays.init(g)` | Inicializa el sistema de replays para una partida. |
| `HF.replays.touch(g)` | Marca la partida como activa (actualiza timestamp). |
| `HF.replays.flush(g)` | Persiste el estado de replay en localStorage. |
| `HF.replays.finish(g)` | Finaliza y guarda el replay al terminar la partida. |
| `HF.replays.play(code)` | Reproduce un replay por código. |
| `HF.replays.share(id, g)` | Comparte un replay (genera código URL). |
| `HF.replays.remove(id)` | Elimina un replay del historial. |
| `HF.replays.saveCode(g)` | Codifica el replay para compartir. |

### 4.3 Formatos de Datos

#### 4.3.1 Eventos de Replay Log

| Tag | Formato | Descripción |
|-----|---------|-------------|
| `[0, ...]` | `[0, from, to, kind]` | Acción de unidad (move, atk, shoot, etc.) |
| `[1, ...]` | `[1, b, ci, comp]` | Construcción de edificio |
| `[2, ...]` | (reservado) | |
| `[3, ...]` | (reservado) | |
| `[4]` o `[4, rng]` | `[4]` / `[4, rngState]` | Marca de fase: fin de fase de jugador/IA. Opcionalmente guarda estado RNG. |
| `[5, ci]` | `[5, ci]` | Préstamo de emergencia |

#### 4.3.2 Código de Mapa UGC

Formato: `v1:{R}:{seed}:{base64_encoded_RLE_cells}`

- **R:** Radio hexagonal (3-20).
- **seed:** Semilla numérica (0 = aleatoria).
- **base64:** RLE de celdas. Cada celda codifica 6-8 caracteres:
  - `t` (1 char): terreno 0-4
  - `res` (1 char): recurso 0-3
  - `b` (1 char): asentamiento 0-7
  - `o` (1 char): dueño 0-9, 9 = neutral
  - `cap` (1 char): capital 0-1
  - `[type][tier][owner]` (3 chars, opcional): unidad

#### 4.3.3 Eventos del Juego

```js
// HF.ev(g, i, txt, kind) en engine.js:66
g.events.push({ i, txt, kind, turn: g.turn })
// i: índice de celda (null para eventos globales)
// kind: 'info' | 'good' | 'bad'
// Máximo 60 eventos (cola circular)
```

#### 4.3.4 Timeline (Snapshot por Turno)

```js
// HF.recordTimeline(g) en engine.js:1358
g.timeline.push({
  t: g.turn,                           // número de turno
  terr: g.f.map(f => HF.territory(g, f.id)),   // casillas por facción
  gold: g.f.map(f => f.gold),           // oro por facción
  units: g.f.map(f => countUnits(f.id))  // unidades por facción
})
```

### 4.4 Diagrama de Secuencia: Fin de Turno

```
Jugador[game.js]         Engine[engine.js]          IA[ai.js]
       │                    │                         │
       │  bEnd click        │                         │
       │───────────────────►│                         │
       │                    │  endTurn(g, aiPlay)     │
       │                    │────────────────────────►│
       │                    │                         │  aiPlay(g, me)
       │                    │                         │  • distField
       │                    │                         │  • playUnits
       │                    │                         │  • macro
       │                    │                         │  • recruit
       │                    │                         │  • playUnits
       │                    │                         │  • playShips
       │                    │◄────────────────────────│
       │                    │  roundEnd(g)            │
       │                    │  • decrement counters   │
       │                    │  • tree spread          │
       │                    │  • g.turn++             │
       │                    │  • startTurn(g, f[0])   │
       │                    │  • checkEnd             │
       │                    │◄────────────────────────│
       │  refresh()         │                         │
       │◄───────────────────│                         │
       │  save()            │                         │
       │───────────────────►│                         │
       │                    │  serialize → atomicSave │
       │                    │◄────────────────────────│
```
