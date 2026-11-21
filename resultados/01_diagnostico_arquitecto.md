# Diagnóstico técnico — Hexfrontier / Federati

**Fase:** 1 — diagnóstico únicamente  
**Fecha:** 2026-11-21  
**Alcance:** inspección de fuentes, documentación, pruebas y configuración. No se modificó código de juego ni se movió, archivó o borró ningún archivo. La partida y las builds no se ejecutaron.

## 1. Mapa real del proyecto

| Área | Estado observado |
|---|---|
| Shell y arranque | `index.html` carga 56 scripts secuencialmente en el espacio global `HF`. `js/main.js` espera `HF.platform.ready`, recupera guardados y luego resuelve enlace directo a mapa/replay, reanudación, introducción Lore o Hub. |
| Partida | `js/engine.js` crea/actualiza el estado y resuelve movimiento, combate, suministro, economía y turnos; `js/ai.js` y `js/diplomacy_ai.js` implementan IA y diplomacia. `js/game.js` integra el HUD y las acciones; `js/board.js` dibuja el tablero. |
| Mapas | `js/mapgen.js` genera terreno por elevación/ruido FBM, biomas, montañas/colinas, ríos, lagos, recursos, árboles y capitales. `js/maps.js`/`js/editor.js` manejan la experiencia y edición de mapas. El motor distingue mar, llano, colina, montaña y río; puentes/caminos cambian la transitabilidad. |
| Sistemas adicionales | Hay pantallas, tribus/doctrinas, campañas, partidas/replays, enlaces compartidos, modo en línea/cloud, autenticación/guardados, localización, telemetría, encuestas/eventos y configuración de pagos. La integración con Supabase vive en `js/cloud.js`, `sql/` y `supabase/`. |
| Plataforma web | `manifest.json`, `sw.js` (caché `federati-v224`), `index.html` y `.github/workflows/` componen el shell PWA/publicación web. |
| Escritorio/móvil | `wrappers/electron/` contiene el host Electron y guardado nativo; `wrappers/scripts/stage-web.js` prepara `wrappers/www/`. `wrappers/capacitor.config.json` y `wrappers/package.json` definen Capacitor y comandos Android/iOS. Son capas anfitrionas: el runtime sigue siendo web. |
| Pruebas/build | Hay 58 archivos `tester_qa/*_test.js` ejecutados por `tester_qa/run_all.js`. `tools/build.mjs` crea una build web; `wrappers/scripts/stage-web.js` prepara el runtime para wrappers. Ambos reemplazan recursivamente su carpeta de salida, por lo que no se ejecutaron durante este diagnóstico. |

### Flujo jugable inferido del código

`index.html` → inicialización de `HF` → espera/restauración de plataforma → Lore o Hub (salvo enlaces/reanudación) → configuración de partida → `HF.newGame()` → `HF.generateMap()` → tablero/acciones del jugador → fin de turno y acciones de IA → guardado, estadísticas/replay y pantallas de cierre. Los servicios en línea son adicionales al arranque local.

La presencia de módulos y pruebas acredita implementación, no certifica que el juego arranque o sea jugable en un dispositivo: esa verificación queda pendiente para `tester`.

## 2. Contradicciones y desviaciones

1. **Rutas del encargo frente al disco:** el proyecto real está en `PROYECTOS/hexfrontier/`; las actividades están en `Actividades/actividades_pendientes/` y `Actividades/actividades_terminadas/`. `resultados/` no existía y se creó para guardar este entregable. Las memorias están en `D:\Agente\agentes\`, no en `D:\Agente\agente\agentes\`. Las carpetas `PROGRAMADOR` y `TESTER` están en mayúsculas. No existe el directorio `.git` en la raíz y `git` no está disponible en este entorno.
2. **Arquetipos de mapas no implementados:** `Actividades/actividades_terminadas/mapas.md` contiene requisitos de seis arquetipos de relieve y cuellos de botella, pero `js/mapgen.js` no los construye. `tester_qa/mapgen_test.js` comprueba determinismo, terreno válido, capitales y variedad básica, no esos requisitos. La ubicación como actividad terminada no demuestra que esa funcionalidad esté hecha.
3. **Documentación de empaquetado desfasada:** `wrappers/README.md` anuncia 21 suites; hoy el runner descubre 58. También enlaza `../FASE4_CI_TELEMETRIA.md`, que no está en el proyecto. La memoria `PROGRAMADOR/MEMORIA/2026-11-03-empaquetado-fase3.md` describe 23 scripts y un stage de 86 archivos/17,97 MB; el shell actual declara 56 scripts y el `wrappers/www/build-info.json` registrado informa 132 archivos y ~28,3 MB.
4. **Documentación y memorias técnicas antiguas:** `I18N.md` afirma que el service worker está en `federati-v211`; el archivo actual usa `federati-v224`. `arquitecto/memoria/decisiones_clave.md` y `estados_clave.json` datan del 29-30 de octubre y contienen conteos/arquitectura de una versión anterior. Varias memorias son informes por tarea, no una síntesis del estado vigente.
5. **Visión de producto no equivale a capacidad actual:** `resumen conceptual.md` declara prestaciones, precios y alcance comercial que no deben usarse como ficha técnica. Por ejemplo, `js/config.js` deja PayPal en sandbox y los enlaces de checkout de tienda vacíos; el importe configurado también difiere del resumen.
6. **Pruebas no verificadas en esta ejecución:** aunque existe `node_modules/`, los ejecutables `node` y `npm` no están disponibles en el entorno; por ello no se pudo ejecutar el runner ni el chequeo de sintaxis. Tampoco se pudo confirmar una rama/commit de respaldo: faltan Git y metadatos `.git`.

## 3. Inventario propuesto de depuración y consolidación

Las acciones son propuestas para aprobación; no se ejecutó ninguna limpieza.

| Acción | Archivos/áreas | Propuesta |
|---|---|---|
| **MANTENER** | `index.html`, `js/` (runtime), `css/style.css`, `art/`, `art2/`, `assets/`, `fonts/`, `data/`, `manifest.json`, `sw.js`, `rules.md` | Fuente activa del juego; `art2/` y `rules.md` siguen referenciados por comentarios/herramientas y no deben moverse hasta corregir esas referencias en una fase autorizada. |
| **MANTENER** | `sql/`, `supabase/`, `wrappers/package.json`, `wrappers/capacitor.config.json`, `wrappers/electron/`, `wrappers/electron-builder.yml`, `wrappers/scripts/stage-web.js`, `tools/`, `package.json`, `pnpm-lock.yaml`, `.github/workflows/`, `tester_qa/*_test.js`, `tester_qa/run_all.js` | Esquemas, integraciones, configuración y herramientas operativas. `sql/sqlserver/` es documentación/referencia de migración, no backend usado por el runtime. |
| **MANTENER** | `Actividades/actividades_pendientes/auditoria.md`, `Actividades/actividades_terminadas/mapas.md` | Mantener la auditoría abierta. El archivo de mapas permanece como requisito no implementado; reabrirlo como tarea tras aprobación, no archivarlo como si estuviera resuelto. |
| **CONSOLIDAR** | `README.md`, `I18N.md`, `wrappers/README.md` | Una descripción breve del estado real y pasos reproducibles; corregir conteo de suites, referencia rota y versión de caché. Separar hechos verificados de requisitos/planes. |
| **CONSOLIDAR** | `arquitectura_diplomacia.md`, `especificacion_diplomacia_pacto_sagrado.md` | Contrastar con `js/diplomacy.js`, `js/diplomacy_ai.js`, `js/diplomacy_ui.js` y `tester_qa/diplomacy_test.js`; dejar un resumen vigente y preservar decisiones no implementadas como requisitos explícitos. |
| **CONSOLIDAR** | `agentes/arquitecto/memoria/*` (13 archivos), `agentes/PROGRAMADOR/MEMORIA/*` (38), `agentes/TESTER/memoria/2026-11-08-encuestas-eventos-dinamicos.md` | Extraer solo decisiones y estado aún vigentes; revisar cada afirmación contra código. Los registros de tareas ya completadas pueden pasar a archivo. No sobrescribir hasta aprobar inventario por archivo. |
| **CONSOLIDAR** | `agentes/orquestador/memoria/`, `agentes/empaquetado/memoria/`, `agentes/contenidos/memoria/` | Las carpetas existen vacías; completar en las fases/roles indicados, no inventar estado en esta auditoría. |
| **ARCHIVAR** | `federati_manual.html`, `mapas/`, `ui/` (raíz), `_hud_probe.html`, `css/a`, `js/a`, `tools/_save_probe.js`, `tools/_save_probe2.js` | Fuera del runtime; `ui/` es idéntico archivo por archivo a `assets/ui/`. Referencias revisadas en fuentes activas; archivos preservados, no eliminados. |
| **ARCHIVAR** | `site/`, `wrappers/www/`, `dist/` | Salidas regenerables, no fuentes. Sus marcas de build eran del 14-15 de noviembre; se respaldaron externamente antes de moverlas. |
| **MANTENER (fuera de alcance)** | `resumen conceptual.md`, `video scritps.xlsx`, `Redes/`, `agentes/marketing/memoria/*`, `tester_qa/_*` y `tools/_save_check.js` | Se conservan por pertenecer a materiales de marketing/QA o por referencias desde memorias; no forman parte de la consolidación arquitectónica de esta fase. |
| **ELIMINAR** | Ninguno propuesto en Fase 1 | No hay base de respaldo/Git para aprobar eliminaciones seguras. Reconsiderar solo tras archivo, búsqueda de referencias y confirmación explícita. |

### Ejecución aprobada de Fase 2

Tras la aprobación del inventario y la confirmación del respaldo, se movieron los elementos marcados **ARCHIVAR** a `D:\Agente\ARCHIVO\hexfrontier\`, conservando sus rutas relativas. No se eliminó ningún archivo. `art2/` y `rules.md` se dejaron en su sitio al detectar referencias desde código/herramientas; los materiales de marketing y QA se conservaron por alcance/propiedad del rol.

La búsqueda estática no encontró imports/rutas de runtime hacia los elementos movidos; las coincidencias restantes son reglas de exclusión del empaquetador y un nombre de archivo simulado en una prueba. `ui/` era duplicado exacto de `assets/ui/`, y las carpetas de build se regeneran desde sus scripts. La verificación dinámica queda pendiente: Node.js no está disponible en este entorno.

## 4. Bloqueos y riesgos para la beta

### Android (APK)

- Existe configuración Capacitor y un comando de incorporación de Android, pero no hay `wrappers/android/`, proyecto Gradle ni APK/AAB. La generación de APK requiere instalar/crear el proyecto nativo y disponer de Node/npm, JDK y Android SDK; su disponibilidad no está confirmada.
- No se encontró configuración de firma/release. Una APK de prueba y una APK firmada para distribución son entregables distintos y requieren verificación de empaquetado.

### Steam (Windows)

- El host Electron y el comando `npm run steam` están declarados, pero no se pudieron instalar dependencias ni ejecutar el empaquetador.
- `wrappers/electron-builder.yml` configura `build/icon.ico`, pero `wrappers/build/` no existe; resolver el recurso de icono antes de validar el instalador/directorio Steam.
- No se encontró proyecto Android/iOS ni manifiesto SteamPipe/depot en el proyecto. La configuración de Auto-Cloud descrita en documentación no sustituye la configuración de Steamworks y la validación del depot.

### Compartidos

- **Sin entorno de validación:** falta `node` (y Git), así que las 58 suites, `tools/check-syntax.js`, `npm run build` y el stage Electron/Capacitor quedan sin resultado verificable aquí. La existencia de `node_modules/` no reemplaza el runtime Node.
- **Backups/salidas:** los scripts de build/stage eliminan recursivamente la carpeta de salida antes de escribirla (`dist/` o el `--out` seleccionado). No ejecutarlos sobre salidas que deban preservarse sin respaldo aprobado.
- **Mapa:** los seis arquetipos en la actividad de mapas no forman parte del generador actual; si son criterio de beta, convertirlos en una tarea aprobada con criterios de aceptación y pruebas antes de declarar los mapas conformes.
- **Configuración externa:** revisar en el entorno de release que las credenciales de servidor permanezcan fuera del cliente y confirmar que las claves configuradas para servicios cliente son aptas para exposición pública. No se reproducen aquí valores de configuración.

## Siguiente decisión requerida

La Fase 3 está completa: `arquitectura.md` fija el estado técnico; `contenidos` actualizó README, i18n, wrappers, Supabase, encuestas y diplomacia; los roles actualizaron sus propias memorias y archivaron las memorias de tarea aprobadas. No se tocó gameplay ni se inició QA/build. La Fase 4 queda pendiente de Node.js/npm y de las verificaciones específicas de APK y Steam por `empaquetado` y `tester`; cualquier eliminación adicional requiere aprobación específica.
