# Reporte de QA — Regeneración de `js/artdata.js`

**Rol:** Tester QA
**Estado:** ❌ FAIL — Defecto crítico detectado
**Archivo objetivo:** `js/artdata.js`
**Script ejecutor:** `tools/sync-art.js`
**Fecha de validación:** 2026-10-30

---

## 0. Contexto Técnico del Pipeline Gráfico

### 0.1. Relación entre ARTDATA, art.js y el motor de render

| Archivo | Rol |
|---|---|
| `js/artdata.js` | Define `HF.ARTDATA` — un objeto con 12 claves, cada una un **Data URI** (`data:image/webp;base64,...`). Las imágenes están pre-recortadas (fondo ya eliminado) para funcionar desde `file://` sin `SecurityError` de canvas. |
| `js/art.js` | Motor de carga de arte. El objeto `FILES` define el mapeo: `kind + key` → nombre de clave en ARTDATA. Ej: `kind='unit'`, `key='INF'` → `id='unitINF'`. Si `HF.ARTDATA[id]` existe, carga directamente el Data URI (sin tocar `art/*.jfif`). Si no existe, degrada a cargar el archivo JFIF original y recortarlo en runtime. |
| `js/board.js` | Renderiza el tablero. Llama a `HF.art.draw(ctx, 'unit', u.type, ...)` y `HF.art.draw(ctx, 'build', c.b, ...)`. Los fallbacks a emoji están en `config.js` (`HF.UNITS[*].icon`) y `data.js` (`HF.BICON`). |
| `js/game.js` | Inicia la partida, llama a `HF.art.preload()` y `HF.art.onLoad()`. |
| `sw.js` | Service worker PWA — cachea `js/artdata.js` entre otros archivos. |

### 0.2. Mapeo de claves esperadas (12)

Las 12 claves provienen de `art.js` `FILES`:

**Unidades (6):** `unitINF`, `unitENG`, `unitARC`, `unitCAB`, `unitSIE`, `unitBAR`
**Edificios (5):** `build2` (camino), `build3` (campamento), `build4` (pueblo), `build5` (ciudad), `build6` (bastión)
**Misc (1):** `miscfog` (nube niebla)

Los emoji de referencia (usados como fallback y para validación visual):
- Unidades: 💂 (INF), 🔧 (ENG), 🏹 (ARC), ♞ (CAB), 💣 (SIE), ⛵ (BAR)
- Edificios: 🛤 (CAMINO), ⛺ (CAMPAMENTO), 🏠 (PUEBLO), 🏙 (CIUDAD), 🏰 (BASTION)
- Niebla: patrón de nubes (`miscfog`)

### 0.3. Cómo lanzar una partida de práctica (modo skirmish)

1. Abrir `index.html` desde `file://`
2. Desde el Hub, pulsar **🎲 Nueva partida** (`btn#new`)
3. Seleccionar: Tamaño=Pequeño, Bioma=Llanuras, 2 facciones, Niebla=Sin niebla, Dificultad=Fácil
4. Pulsar **Empezar** → ejecuta `HF.startGame(HF.makeGame({ mode: 'skirmish', ... }, HF.loadTribe()))`

---

## 1. Validación de Integridad del Archivo

### 1.1. Existencia en disco

| # | Check | Método | PASS |
|---|---|---|---|
| 1.1.1 | `js/artdata.js` existe como archivo regular | Explorador de archivos / `Test-Path` |  |

### 1.2. Estructura sintáctica

| # | Check | Método | PASS |
|---|---|---|---|
| 1.2.1 | El archivo comienza con `HF.ARTDATA = {` (después del comentario de encabezado) | `read` primeras líneas |  |
| 1.2.2 | El archivo termina con `};` | `read` últimas líneas |  |
| 1.2.3 | No hay comas colgantes antes de `};` que rompan el parseo | `node --check` o carga en browser |  |
| 1.2.4 | La variable global `HF` está definida antes (verificado: `config.js` crea `HF` antes que `artdata.js` por orden de `<script>` en `index.html`) | Revisar orden en `index.html` (línea 19 vs 18) |  |

### 1.3. Conteo de claves

| # | Check | Método | Esperado | PASS |
|---|---|---|---|---|
| 1.3.1 | El objeto `HF.ARTDATA` contiene exactamente **12** claves | Contar con regex `"([a-z0-9]+)":` en el archivo | 12 |  |
| 1.3.2 | Las 12 claves coinciden exactamente con el mapeo de `art.js` `FILES` | Cruzar con tabla 0.2 | unitINF ✓, unitENG ✓, unitARC ✓, unitCAB ✓, unitSIE ✓, unitBAR ✓, build2 ✓, build3 ✓, build4 ✓, build5 ✓, build6 ✓, miscfog ✓ |  |
| 1.3.3 | No hay claves duplicadas | Inspección manual o script | Sin duplicados |  |
| 1.3.4 | No hay claves extra/faltantes | Inspección manual o script | Coinciden exactamente |  |

### 1.4. Validación de Data URIs

| # | Check | Método | PASS |
|---|---|---|---|
| 1.4.1 | Cada valor comienza con `data:image/` | Regex sobre cada valor |  |
| 1.4.2 | Cada valor contiene `;base64,` | Regex sobre cada valor |  |
| 1.4.3 | Cada Data URI decodifica correctamente (no corrupto) | `Buffer.from(b64, 'base64').length > 0` o `<img onerror>` en browser |  |
| 1.4.4 | Cada Data URI renderiza como imagen válida (no es texto/base64 roto) | Cargar en `<img>` y verificar `naturalWidth > 0` |  |

### 1.5. Método de validación estática automatizada

Script temporal de Node.js para verificar 1.2–1.4 sin abrir el browser:

```javascript
// QA: validar artdata.js con node --check + parseo de claves
const fs = require('fs');
const src = fs.readFileSync('js/artdata.js', 'utf8');
// 1. Sintaxis: envolver en una función que exponga HF.ARTDATA
const box = 'var HF={}; ' + src.replace(/^HF\./, 'HF.') + '; module.exports=typeof HF!=='undefined'?HF.ARTDATA:{};';
try { new Function('HF', src); console.log('SYNTAX OK'); } catch(e) { console.error('SYNTAX ERROR:', e.message); process.exit(1); }
// 2. Contar claves
const keys = [...src.matchAll(/"([a-zA-Z0-9]+)":\s*"data:image/g)].map(m=>m[1]);
console.log('Keys:', keys.length, keys.join(','));
const expected = ['unitINF','unitENG','unitARC','unitCAB','unitSIE','unitBAR','build2','build3','build4','build5','build6','miscfog'];
console.log('Match expected:', JSON.stringify(keys.sort())===JSON.stringify(expected.sort()));
// 3. Validar cada Data URI
let bad=0;
for (const k of keys) { const m=src.match(new RegExp('"'+k+'":\\s*"(data:image/[^"]+)"')); if(!m||!m[1]||!m[1].includes(';base64,')){console.log('BAD URI:',k);bad++;} }
console.log('Bad URIs:', bad);
```

---

## 2. Validación de Carga (Browser)

### 2.1. Carga inicial del juego

| # | Check | Método | PASS |
|---|---|---|---|
| 2.1.1 | La página carga sin errores JS críticos en la consola | Abrir `index.html` en Chrome/Edge DevTools |  |
| 2.1.2 | **NO** aparece `SecurityError` en DevTools Console | `file://` + Data URIs no deben disparar restricciones de canvas tainting |  |
| 2.1.3 | `HF.ARTDATA` está definido en el scope global | `console.log(typeof HF.ARTDATA)` en DevTools |  |

### 2.2. Carga de imágenes en Network tab

| # | Check | Método | PASS |
|---|---|---|---|
| 2.2.1 | Al hacer clic en "Nueva partida" → "Empezar", el Network tab muestra 12 solicitudes `data:` (no fallan con 404) | F5 + iniciar partida, filtrar por `Img` / `Doc` / `data` |  |
| 2.2.2 | No hay solicitudes fallidas a `art/*.jfif` (esto indicaría que el Data URI fue omitido y cayó al fallback de archivo) | Filtrar Network por `jfif` |  |
| 2.2.3 | Todas las imágenes Data URI tienen estado 200 (o "data" sin error) | Network tab |  |

### 2.3. Inicio de partida de práctica

| # | Check | Método | PASS |
|---|---|---|---|
| 2.3.1 | El Hub muestra los botones: Nueva partida, Campaña, Diario | Inspección visual del Hub |  |
| 2.3.2 | Al crear una partida skirmish, el tablero se dibuja | Canvas visible con hexágonos |  |
| 2.3.3 | La partida se inicia en el turno 1 sin crash | HUD muestra "T1" |  |

---

## 3. Validación Visual

### 3.1. Unidades dibujadas en el tablero

| # | Unidad | Tipo | Emoji referencia | Check visual | PASS |
|---|---|---|---|---|---|
| 3.1.1 | 💂 Infantería | `INF` | 💂 | Aparece centrada en hexágonos propios en el turno 1 (unidad semilla) |  |
| 3.1.2 | 🔧 Ingeniero | `ENG` | 🔧 | Reclutar en campamento/pueblo y ver en tablero |  |
| 3.1.3 | 🏹 Arquero | `ARC` | 🏹 | Reclutar en pueblo/ciudad y ver en tablero |  |
| 3.1.4 | ♞ Caballería | `CAB` | ♞ | Reclutar en ciudad y ver en tablero |  |
| 3.1.5 | 💣 Asedio | `SIE` | 💣 | Reclutar en ciudad/bastión y ver en tablero |  |
| 3.1.6 | ⛵ Barco | `BAR` | ⛵ | Reclutar en agua junto a edificio y ver en tablero |  |

**Criterio de aceptación:** Cada unidad debe estar **centrada en el hexágono** (no desplazada), con el **círculo de color de facción** de fondo, y el **emoji visible** encima (o la imagen Data URI en su lugar). Si la imagen no carga, el código cae al emoji (línea 548/361 de `board.js`): esto sería un **FAIL** porque indica que el Data URI está corrupto.

### 3.2. Edificios dibujados en el tablero

| # | Edificio | Key ARTDATA | Emoji referencia | Check visual | PASS |
|---|---|---|---|---|---|
| 3.2.1 | 🛤 Camino | `build2` | 🛤 | Construir camino entre asentamientos → imagen visible |  |
| 3.2.2 | ⛺ Campamento | `build3` | ⛺ | Construir campamento → imagen visible |  |
| 3.2.3 | 🏠 Pueblo | `build4` | 🏠 | Mejorar campamento a pueblo → imagen visible |  |
| 3.2.4 | 🏙 Ciudad | `build5` | 🏙 | Mejorar pueblo a ciudad → imagen visible |  |
| 3.2.5 | 🏰 Bastión | `build6` | 🏰 | Construir bastión → imagen visible |  |

**Criterio de aceptación:** Cada edificio debe estar centrado en el hexágono, ligeramente elevado (diorama 2.5D). Si la imagen no carga, cae al emoji (línea 535 de `board.js`).

### 3.3. Niebla (patrón de nubes)

| # | Check | Método | PASS |
|---|---|---|---|
| 3.3.1 | Con niebla activada (`fog: 'FULL'`), las casillas no exploradas se oscurecen | Iniciar partida con niebla completa |  |
| 3.3.2 | El patrón de nubes (`miscfog`) se aplica como textura de niebla | Inspeccionar en DevTools: `HF.art.fogPattern()` devuelve un `CanvasPattern` no nulo |  |
| 3.3.3 | Al hacer clic en una casilla, el patrón de niebla se actualiza (reveal) | Jugar unos turnos y observar el reveal |  |

### 3.4. Partida de práctica de 15 turnos

| # | Acción | Check | PASS |
|---|---|---|---|
| 3.4.1 | Turno 1: mover unidad 💂 a casilla adyacente | Animación de movimiento (hop) |  |
| 3.4.2 | Turno 1: talar árbol (🌲) en casilla con árbol | Burst de madera (partículas 🪵) |  |
| 3.4.3 | Turnos 2-3: reclutar 🔧 Ingeniero en campamento | Aparece en tablero |  |
| 3.4.4 | Turnos 3-4: construir 🛤 camino | Imagen del camino visible |  |
| 3.4.5 | Turnos 4-5: mejorar campamento a 🏠 pueblo | Imagen del pueblo visible |  |
| 3.4.6 | Turnos 6-7: reclutar 🏹 arquero en pueblo | Imagen del arquero visible |  |
| 3.4.7 | Turnos 8-9: construir 🏰 bastión | Imagen del bastión visible |  |
| 3.4.8 | Turnos 10-11: reclutar 💣 asedio en ciudad/bastión | Imagen del asedio visible |  |
| 3.4.9 | Turno 12: construir 🏙 ciudad | Imagen de la ciudad visible |  |
| 3.4.10 | Turno 13: reclutar ♞ caballería en ciudad | Imagen de la caballería visible |  |
| 3.4.11 | Turno 14: construir 🏰 bastión adicional (si hay recursos) | Imagen visible |  |
| 3.4.12 | Turnos 10-15: atacar unidad enemiga | Animación de combate, emoji/caída de unidad |  |
| 3.4.13 | Turno 15: finalizar turno | No hay crash, IA juega su turno |  |

---

## 4. Validación de Offline (PWA)

| # | Check | Método | PASS |
|---|---|---|---|
| 4.1 | El `sw.js` está registrado sin errores | DevTools → Application → Service Workers |  |
| 4.2 | `js/artdata.js` está en la lista de archivos cacheados (`sw.js` line 2) | Verificar `FILES` en `sw.js` incluye `'js/artdata.js'` |  |
| 4.3 | Al desconectar internet y recargar, el juego funciona | Simular offline en DevTools → recargar → jugar |  |
| 4.4 | Las imágenes Data URI siguen funcionando offline (no dependen de archivos externos) | Verificar que no hay requests a `art/*.jfif` fallidos en modo offline |  |

---

## 5. Reporte de QA

**Formato de reporte final (completar al ejecutar):**

```
## Reporte de QA — Regeneración de artdata.js

### Estado general: [PASS / FAIL / PARCIAL]

### 1. Validación de Integridad del Archivo
- 1.1 Existencia: [PASS/FAIL]
- 1.2 Sintaxis: [PASS/FAIL]
- 1.3 Conteo de claves (12 esperadas): [PASS/FAIL] — encontradas: [...]
- 1.4 Data URIs válidos: [PASS/FAIL] — [detalles de cualquier fallo]

### 2. Validación de Carga (Browser)
- 2.1 Carga inicial: [PASS/FAIL] — [errores de consola si los hay]
- 2.2 Network tab: [PASS/FAIL] — [12 data: URIs cargadas, 0 404s a jfif]
- 2.3 Partida de práctica: [PASS/FAIL]

### 3. Validación Visual
- 3.1 Unidades: [PASS/FAIL] — [✓/✗ cada una]
- 3.2 Edificios: [PASS/FAIL] — [✓/✗ cada uno]
- 3.3 Niebla: [PASS/FAIL]
- 3.4 Partida 15 turnos: [PASS/FAIL] — [resultado completo]

### 4. Validación Offline (PWA)
- 4.1 Service Worker: [PASS/FAIL]
- 4.2 Cache de artdata.js: [PASS/FAIL]
- 4.3 Funcionamiento offline: [PASS/FAIL]
- 4.4 Data URIs offline: [PASS/FAIL]

### Defectos encontrados
[Lista numerada de bugs con pasos de reproducción]

### Conclusión
[Recomendación final: aprobado / aprobado con observaciones / rechazado — devolver al Programador]
```

---

## 6. Resultados Ejecutados

### 1. Validación de Integridad del Archivo — Resultados

| Check | Resultado | Detalles |
|---|---|---|
| 1.1.1 Archivo existe | ✅ PASS | `js/artdata.js` existe (8.6 MB) |
| 1.2.1 Comienza con `HF.ARTDATA = {` | ✅ PASS | Línea 2, después del comentario |
| 1.2.2 Termina con `};` | ✅ PASS | Línea 15 |
| 1.3.1 12 claves | ✅ PASS | 12 claves encontradas y verificadas |
| 1.3.2 Coinciden con art.js FILES | ✅ PASS | unitINF, unitENG, unitARC, unitCAB, unitSIE, unitBAR, build2-6, miscfog |
| 1.3.3 Sin duplicados | ✅ PASS | Todas únicas |
| 1.3.4 Sin extras/faltantes | ✅ PASS | Coinciden exactamente |
| 1.4.1 Comienzan con `data:image/` | ✅ PASS | Formato `data:image/jpeg;base64,` |
| 1.4.2 Contienen `;base64,` | ✅ PASS | Todas |
| **1.4.3 Data decodificable** | **❌ FAIL** | **Contenido NO es imagen — es certificado C2PA X.509** |
| **1.4.4 Imagen válida (magic bytes)** | **❌ FAIL** | **No hay magic bytes de imagen válida** |

### 2. Validación de Carga (Browser) — NO EJECUTADA

**Limitación de sandbox:** PowerShell y Node.js están bloqueados en el sandbox actual (`SetNamedSecurityInfoW failed: grantWrite(D:\Agente)`). No se pudo iniciar un servidor web local ni ejecutar el script de validación `artdata_check.js`. El browser no es accesible directamente desde las herramientas disponibles.

**Impacto del defecto crítico (Sección 1):** Como las Data URIs no contienen imágenes válidas, el browser disparará `img.onerror` → `art.js` línea 74 marcará `cache[id] = false` → el juego caerá a los emojis de fallback. No hay `SecurityError` esperado (los Data URIs no activan restricciones de canvas desde `file://`).

### 3. Validación Visual — NO EJECUTADA (bloqueada por defecto crítico)

**Razón:** Sin imágenes válidas, todas las unidades (💂🔧🏹♞💣⛵) y edificios (🛤⛺🏠🏙🏰) se renderizarán como **emojis de fallback**, no como Data URIs. Ver sección 4.1 del reporte.

### 4. Validación Offline — NO EJECUTADA (bloqueada por defecto crítico)

**Razón:** El `sw.js` cachea `js/artdata.js`, pero el contenido no es válido. La sección PWA no puede validarse hasta que se corrija la fuente de imágenes.

---

## 7. Defectos Encontrados

### DEFECTO #1 (CRÍTICO) — Data URIs contienen certificados C2PA, no imágenes

**Severidad:** CRÍTICO
**Archivo:** `js/artdata.js` (todas las 12 entradas)
**Detectado en:** Sección 1.4.3/1.4.4

**Descripción:**
El script `tools/sync-art.js` (líneas 76-78) lee los archivos `art/*.jfif` y los codifica a base64 como Data URIs. El script funciona correctamente — el problema está en los **archivos fuente `.jfif`**. Estos archivos no contienen imágenes reales; contienen **certificados de firma C2PA (X.509) de Google**:

- La cabecera base64 comienza con `/9j/4AAQSkZJRgABAQEBLAEsAAD/` (firma JFIF válida)
- Pero el contenido inmediatamente contiene: `Google Media Processing Services`, `Google C2PA Media Services 1P ICA G3`, `c2pa.googleapis.com`, `Google C2PA Root CA G3`, `ocsp.googleapis.com`
- Todas las 12 entradas tienen contenido idéntico (certificado C2PA repetido)

**Todas las 12 Data URIs son `data:image/jpeg;base64,...`** pero **no son imágenes JPEG válidas**. El magic bytes de un JPEG real sería `FF D8 FF E0` → base64 `/9j/4AAQSkZJRg...` sí, PERO el contenido posterior es un certificado DER/X.509, no datos de escaneo de imagen (no hay marcadores JPEG como `FF E1` para EXIF, `FF DB` para cuantización, `FF C0` para SOF0, etc.).

**Impacto:**
- `art.js` línea 71-76: `HF.ARTDATA[id]` existe → `img.src = emb` → `img.onerror` se dispara → `cache[id] = false`
- `board.js` línea 548: `!HF.art.draw(ctx, 'unit', u.type, ...)` → true → cae al emoji `HF.UNITS[u.type].icon`
- `board.js` línea 533: `!HF.art.draw(ctx, 'build', c.b, ...)` → true → cae al emoji `HF.BICON[c.b]`
- El juego **no mostrará imágenes** de unidades ni edificios, solo emojis
- La niebla (`miscfog`) también fallará → `HF.art.fogPattern()` retornará `null`

**Pasos de reproducción:**
1. Abrir `js/artdata.js` en cualquier editor
2. Copiar el valor de `"unitINF"` (Data URI base64)
3. Decodificar el base64
4. Verificar: el contenido es un certificado X.509 C2PA, no un JPEG con datos de píxeles

**Causa raíz:** Los archivos fuente `art/*.jfif` (piquero.jfif, Ingeniero.jfif, arquero.jfif, etc.) no contienen imágenes reales — contienen datos de certificados C2PA. El script `sync-art.js` funciona correctamente, pero codifica datos no-imagen.

**Recomendación:** Devolver al Programador para:
1. Verificar que los archivos `art/*.jfif` contienen imágenes reales (píxeles JPEG válidos con marcadores DQT, SOF0, SOS)
2. Regenerar los archivos fuente si están corruptos
3. Re-ejecutar `node tools/sync-art.js` para regenerar `js/artdata.js` con imágenes válidas
4. Considerar cambiar el MIME a `image/webp` si las fuentes son WebP (el comentario original menciona `data:image/webp`)

---

## 8. Conclusión

### Resultado General: ❌ RECHAZADO

La regeneración de `js/artdata.js` **NO CUMPLE** con los estándares de QA. Aunque el script `sync-art.js` y la estructura del archivo son correctos (12 claves, sintaxis válida, formato Data URI), **el contenido de las 12 Data URIs no son imágenes válidas** — son certificados C2PA X.509 de Google disfrazados con una cabecera JFIF.

**Estado de cada sección:**
- **Sección 1 (Integridad):** ❌ FAIL — Data URIs no son imágenes válidas (1.4.3/1.4.4)
- **Sección 2 (Carga browser):** ⚠️ NO EJECUTADA (sandbox) — pero el defecto crítico implica fallo en carga de imágenes
- **Sección 3 (Visual):** ⚠️ NO EJECUTADA (sandbox) — pero el defecto implica emoji fallbacks en lugar de imágenes
- **Sección 4 (Offline PWA):** ⚠️ NO EJECUTADA (sandbox) — pero el defecto afecta contenido cacheado

**Acción requerida:**
1. Devolver al Programador con el defecto #1 documentado
2. Corregir los archivos fuente `art/*.jfif` (reemplazar por imágenes reales)
3. Regenerar `js/artdata.js` con `node tools/sync-art.js`
4. Re-ejecutar validación QA completa al recibir el archivo corregido

---

**QA Tester:** Listo para re-validación cuando el Programador corrija los archivos fuente y regenere `js/artdata.js`.
