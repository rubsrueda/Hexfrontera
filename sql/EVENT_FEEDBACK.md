# Módulo de encuestas y eventos dinámicos

Implementación del módulo descrito en el encargo: la base de datos decide **si**
hay encuesta, **qué** se pregunta y **cómo** se pinta; el juego solo dispara un
evento y envía la transacción.

| Pieza | Archivo |
|---|---|
| Esquema, catálogo de eventos, RLS y RPC | [`event_feedback.sql`](event_feedback.sql) |
| Listado de eventos configurados | [`list_event_feedback.sql`](list_event_feedback.sql) |
| Migración desde los nombres sin prefijo | [`migrate_event_feedback_hf_prefix.sql`](migrate_event_feedback_hf_prefix.sql) |
| Diagnóstico de solo lectura | [`diagnose_event_feedback.sql`](diagnose_event_feedback.sql), [`healthcheck_event_feedback.sql`](healthcheck_event_feedback.sql), [`list_event_feedback.sql`](list_event_feedback.sql) |
| Verificación transaccional (no deja datos) | [`verify_event_feedback.sql`](verify_event_feedback.sql) |
| Modal dinámico | [`../js/event-feedback.js`](../js/event-feedback.js) |
| Textos de interfaz en 13 idiomas | [`../js/event-feedback-langs.js`](../js/event-feedback-langs.js) |
| Tabla de traducciones (runtime) | [`survey_translations_seed.sql`](survey_translations_seed.sql) |
| Equivalente SQL Server | [`sqlserver/schema.sql`](sqlserver/schema.sql), [`sqlserver/survey_translations.sql`](sqlserver/survey_translations.sql) |
| Estilos | [`../css/style.css`](../css/style.css) (bloque `ef-`) |
| Pruebas | [`../tester_qa/event_feedback_test.js`](../tester_qa/event_feedback_test.js), [`../tester_qa/survey_translations_test.js`](../tester_qa/survey_translations_test.js) |

---

## 1. Puesta en marcha

1. **Aplicar el esquema** en Supabase → SQL Editor → pegar
   `sql/event_feedback.sql` → Run.
   - Si ya habías ejecutado la versión sin prefijo y quieres conservar datos,
     ejecuta antes `sql/migrate_event_feedback_hf_prefix.sql` y luego vuelve a
     ejecutar `event_feedback.sql`.
   - Todas las tablas llevan prefijo `hf_` (`hf_campaigns`,
     `hf_campaign_events`, `hf_event_questions`, `hf_player_responses`,
     `hf_response_details`, `hf_survey_translations`); los índices usan
     `idx_hf_*` y la vista `hf_v_event_feedback`.
2. **Cargar las traducciones**: ejecuta
   `sql/survey_translations_seed.sql` (13 idiomas × 12 claves).
3. **Verificar** (opcional, recomendado) pegando
   `sql/verify_event_feedback.sql`. Crea una campaña de prueba, comprueba
   lectura, orden, envío atómico y errores, y termina con `ROLLBACK`.
4. **Crear la primera campaña** (ejemplo al final de este documento).
5. **Recargar el esquema de PostgREST** si el RPC aún responde 404:
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```
6. En la build de producción, regenerar `dist/` con `npm run build` para que el
   nuevo JS/CSS entre en el empaquetado. Para Electron/Capacitor, regenerar
   `wrappers/www` con el script `stage` de `wrappers/` (no editar `www` a mano).

No hace falta tocar el cliente para cambiar preguntas: basta con editar filas de
`hf_event_questions` o crear otra campaña.

> Si ya habías creado las tablas sin prefijo, este script creará las `hf_*`
> nuevas (no renombra las antiguas). Usa
> `sql/migrate_event_feedback_hf_prefix.sql` para conservar los datos, o borra
> las antiguas si están vacías. `CREATE TABLE IF NOT EXISTS` no añade
> constraints a una tabla que ya exista: si vienes de una versión previa con
> prefijo, revisa que tenga los `CHECK`, el `UNIQUE` de `hf_response_details` y
> los índices.

---

## 2. Modelo de datos

```text
hf_event_types 1 ── N hf_campaign_events 1 ── N hf_event_questions
                            │
hf_campaigns 1 ─────────────┘
                            │
                            └── N hf_player_responses 1 ── N hf_response_details
```

- **`hf_event_types`**: catálogo de disparadores disponibles. `is_active` apaga
  el tipo para todas las campañas; `trigger_hint` documenta dónde se dispara en
  el cliente. Los 5 actuales se siembran en el esquema.
- **`hf_campaigns`**: ventana `[start_date, end_date]` inclusiva. `is_active`
  permite cerrar una campaña sin borrarla.
- **`hf_campaign_events`**: disparador (`GAME_ENTRY`, `MATCH_OVER`,
  `TRIBE_MODIFIED`, `MAP_EDIT_COMPLETE`, `REPLAY_FINISHED`, …). El formato se
  valida en servidor: `^[A-Z][A-Z0-9_]{2,49}$`. Un evento por campaña
  (`UNIQUE (campaign_id, event_type)`).
- **`hf_event_questions`**: set ordenado por `display_order`. Tipos:
  `RATING` (1..5), `SELECT` (2..20 opciones), `BOOLEAN`, `TEXT` (máx. 2000).
- **`hf_player_responses`**: cabecera con correo/alias/comentario opcionales y
  `created_at`.
- **`hf_response_details`**: una fila por pregunta; `UNIQUE (response_id,
  question_id)` impide duplicados.

### Decisiones relevantes

| Tema | Decisión |
|---|---|
| Campañas solapadas para el mismo evento | Se elige la de `start_date` más reciente (`created_at` y `campaign_id` como desempate). Determinista y una sola encuesta por disparador. |
| Valores | Se guardan como texto canónico: `"1".."5"`, `"true"/"false"`, la opción exacta de `SELECT` o el texto libre. |
| Duplicados de una misma persona | El servidor acepta envíos repetidos (no hay identidad de jugador en el modelo). El cliente evita repreguntar la misma `campaign_event_id`; si se necesita "una respuesta por jugador", añadir `player_ref` y un índice único por `(campaign_event_id, player_ref)`. |
| `collect_user_info = false` | El servidor **descarta** correo y alias aunque el cliente los mande. |
| `allow_comments = false` | El servidor **descarta** el comentario. |
| Encuesta vacía | Se rechaza salvo que haya un comentario voluntario. |
| PII | El cliente anónimo no puede leer `hf_player_responses` ni `hf_response_details`; solo escribe por la RPC validada. |

---

## 2b. Catálogo de eventos

`hf_event_types` es la lista consultable de disparadores. El esquema siembra los
5 actuales:

| event_type | label | trigger_hint |
|---|---|---|
| `GAME_ENTRY` | Entrada al juego | `main.js · openHub()` |
| `MATCH_OVER` | Fin de partida | `game.js · showEnd()` |
| `TRIBE_MODIFIED` | Tribu modificada | `screens.js · salir de Tribu` |
| `MAP_EDIT_COMPLETE` | Mapa guardado | `editor.js · guardar` |
| `REPLAY_FINISHED` | Repetición terminada | `replay.js · finish()` |

`hf_campaign_events.event_type` tiene FK al catálogo. Para añadir un evento
nuevo:

```sql
INSERT INTO public.hf_event_types
    (event_type, label, description, trigger_hint, sort_order)
VALUES
    ('NEW_EVENT', 'Nuevo evento', 'Qué lo dispara', 'archivo.js · función()', 60);

INSERT INTO public.hf_campaign_events
    (campaign_id, event_type, collect_user_info, allow_comments)
VALUES
    ('<campaign-id>', 'NEW_EVENT', TRUE, TRUE);
```

Y añadir el hook en el cliente:

```js
HF.EventFeedbackModal.checkAndRender('NEW_EVENT');
```

El catálogo por sí solo **no dispara** nada: el cliente sigue necesitando el
punto de llamada. Lo que sí consigue es que el tipo exista, se valide, se pueda
listar y se pueda activar/desactivar globalmente.

### Consultar uso y detectar huecos

[`list_event_feedback.sql`](list_event_feedback.sql) ejecuta
`hf_v_event_type_usage`, que devuelve por tipo: campañas configuradas, vigentes,
preguntas, respuestas y última respuesta. La segunda consulta muestra los tipos
del catálogo **sin ninguna campaña**, que son los candidatos a configurar o a
retirar.

```sql
SELECT * FROM public.hf_v_event_type_usage ORDER BY sort_order;
```

---

## 3. Contratos de las RPC

### 3.1 `get_active_event_questions(p_event_type VARCHAR)`

Pública (`anon`, `authenticated`). `STABLE`, `SECURITY DEFINER`,
`search_path = public, pg_temp`.

```json
{
  "active": true,
  "campaign": {
    "campaign_id": "…",
    "name": "Temporada 1",
    "description": "Cuéntanos qué tal la partida.",
    "start_date": "2026-11-01T00:00:00-06:00",
    "end_date": "2026-12-01T00:00:00-06:00"
  },
  "event": {
    "campaign_event_id": "…",
    "event_type": "MATCH_OVER",
    "collect_user_info": true,
    "allow_comments": true
  },
  "questions": [
    {
      "question_id": "…",
      "question_text": "¿Cómo fue la partida?",
      "question_type": "RATING",
      "options": null,
      "display_order": 1,
      "is_required": true
    }
  ]
}
```

Sin campaña activa devuelve `{"active": false, "campaign": null, "event": null,
"questions": []}`. El tipo se normaliza con `upper(btrim(...))`, así que
`match_over` también funciona.

### 3.2 `fn_ef_submit_response(...)`

Pública (`anon`, `authenticated`). `VOLATILE`, `SECURITY DEFINER`, atómica:
inserta cabecera y detalles o no inserta nada.

```sql
fn_ef_submit_response(
  p_campaign_event_id uuid,
  p_answers           jsonb,   -- [{"question_id":"…","value":"5"}, …]
  p_email             varchar, -- opcional
  p_alias             varchar, -- opcional
  p_comment           text     -- opcional
) returns jsonb
```

Éxito:

```json
{ "ok": true, "response_id": "…", "campaign_event_id": "…", "event_type": "MATCH_OVER", "answers": 3 }
```

Errores (siempre `{"ok": false, "error": "CÓDIGO"}`):

| Código | Significado |
|---|---|
| `EVENT_NOT_ACTIVE` | La campaña o el evento ya no están vigentes. |
| `INVALID_ANSWERS` | `p_answers` no es un array de objetos con UUID válido. |
| `TOO_MANY_ANSWERS` | Más de 50 respuestas. |
| `DUPLICATE_QUESTION` | La misma pregunta dos veces. |
| `UNKNOWN_QUESTION` | La pregunta no pertenece a ese evento. |
| `INVALID_RATING` | Fuera de 1..5. |
| `INVALID_BOOLEAN` | No es `true/false/1/0`. |
| `INVALID_OPTION` | Valor que no está en `options`. |
| `INVALID_TEXT` | Texto de más de 2000 caracteres. |
| `REQUIRED_MISSING` | Falta alguna pregunta obligatoria. |
| `INVALID_EMAIL` / `INVALID_ALIAS` / `INVALID_COMMENT` | Formato/longitud. |
| `EMPTY_RESPONSE` | Sin respuestas y sin comentario. |
| `INTERNAL` | Error inesperado (el detalle queda en el log del servidor). |

---

## 3.5. Contenido multiidioma

La fuente de verdad en runtime es la tabla **`hf_survey_translations`**. Las
preguntas/opciones guardan **claves**, no texto; la RPC
`get_active_event_questions(p_event_type, p_locale)` devuelve `question_label`,
`name_label`/`description_label` y `option_labels` ya resueltos para el idioma
del jugador. Fallback: locale base → inglés → clave.

Ventaja: cambiar copy es un `INSERT/UPDATE` en la tabla; **no hay que
recompilar ni desplegar el cliente**.

```sql
CREATE TABLE public.hf_survey_translations (
    translation_key  VARCHAR(160) NOT NULL,
    locale           VARCHAR(10)  NOT NULL,
    translation_text TEXT         NOT NULL,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (translation_key, locale),
    CHECK (translation_key ~ '^survey\.[a-z0-9_.-]+$'),
    CHECK (btrim(translation_text) <> '')
);
```

```sql
INSERT INTO public.hf_survey_translations (translation_key, locale, translation_text)
VALUES
    ('survey.match_over.q1_lost', 'en', 'Was there any moment where you felt lost...'),
    ('survey.match_over.q1_lost', 'es', '¿Hubo algún momento en el que te sentiste perdido...'),
    ('survey.match_over.q1_lost', 'ja', 'どこかで迷ったり、次に何をすればいいか分からないと感じた瞬間はありましたか？')
ON CONFLICT (translation_key, locale) DO UPDATE
SET translation_text = EXCLUDED.translation_text, updated_at = NOW();
```

El seed completo (13 idiomas × 12 claves) está en
[`survey_translations_seed.sql`](survey_translations_seed.sql). Para SQL Server,
la tabla + inserts equivalentes están en
[`sqlserver/survey_translations.sql`](sqlserver/survey_translations.sql).

### Preguntas y opciones

```sql
INSERT INTO public.hf_event_questions
    (question_id, campaign_event_id, question_text, question_type, options, display_order, is_required)
VALUES
    ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
     'survey.match_over.q1_lost', 'TEXT', NULL, 1, TRUE),
    ('c4eebc99-9c0b-4ef8-bb6d-6bb9bd380b44', 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
     'survey.match_over.q3_return', 'SELECT',
     '["survey.match_over.opt_yes","survey.match_over.opt_maybe","survey.match_over.opt_no"]'::jsonb,
     3, TRUE)
ON CONFLICT (question_id) DO UPDATE
SET question_text = EXCLUDED.question_text,
    options = EXCLUDED.options;
```

Si también cambias `question_type`, `display_order` o `is_required`, añádelos al
`DO UPDATE`; el ejemplo solo actualiza texto y opciones.

- `question_text` puede ser una clave (`survey.…`) o texto literal. Se admite
  contenido mixto; no hay migración obligatoria.
- En `SELECT`, cada opción es una clave. **La respuesta guarda la clave**
  (`response_value = 'survey.match_over.opt_yes'`), no la etiqueta traducida:
  así los informes son comparables entre idiomas.
- En `RATING`, `options` puede llevar 5 claves de etiqueta; el valor sigue
  siendo `1..5`.
- `TEXT` guarda el texto libre del jugador en su idioma; eso no se traduce.
- `hf_campaigns.name` y `description` también admiten claves (`survey.match_over.title`,
  `survey.match_over.intro`); el modal las resuelve igual. Si son texto literal,
  se muestran tal cual.
- Si `collect_user_info = TRUE`, el modal ya pide correo y alias (con validación
  de email). No añadas además una pregunta `TEXT` de correo: saldría dos veces.
  Si prefieres que el correo sea una pregunta más, pon `collect_user_info =
  FALSE` y usa una pregunta `TEXT`/`SELECT` propia.

### Seed y edición

La tabla es la única fuente de verdad. El seed inicial
[`survey_translations_seed.sql`](survey_translations_seed.sql) carga los 13
idiomas × 12 claves y se puede volver a ejecutar (`ON CONFLICT` actualiza el
texto). Para cambiar copy:

```sql
UPDATE public.hf_survey_translations
SET translation_text = 'Nuevo texto', updated_at = NOW()
WHERE translation_key = 'survey.match_over.q1_lost'
  AND locale = 'es';
```

El cliente **no carga ningún archivo de traducción de encuestas en runtime**:
la RPC devuelve `question_label`/`option_labels` desde la tabla. No hay JSON ni
generador que desplegar; `npm run build` solo empaqueta el juego.

### SQL Server

La app actual habla con **PostgreSQL/Supabase** (PostgREST + RPC). SQL Server no
es intercambiable sin cambiar la capa de datos: no hay PostgREST, RLS funciona
distinto y `JSONB`/`TIMESTAMPTZ` no existen con esos nombres.

El esquema completo equivalente está en
[`sqlserver/schema.sql`](sqlserver/schema.sql) y la tabla + 156 inserts en
[`sqlserver/survey_translations.sql`](sqlserver/survey_translations.sql)
(`UNIQUEIDENTIFIER`, `NVARCHAR`, `DATETIME2`, `OPENJSON`/`MERGE`). Para servir el
mismo JSON al cliente necesitas una API o un stored procedure; el resto del
esquema requiere la traducción de tipos (`UUID → UNIQUEIDENTIFIER`,
`JSONB → NVARCHAR(MAX)`, `TIMESTAMPTZ → DATETIMEOFFSET`, `BOOLEAN → BIT`).

### Reglas de las claves

- Formato: `survey.<evento>.<pregunta>` en minúsculas, `[a-z0-9_.-]`; el
  `CHECK` de `hf_survey_translations` rechaza cualquier otra cosa.
- Una clave es **inmutable** una vez que hay respuestas: en `SELECT`,
  `response_value` guarda la clave, no la etiqueta. Si renombras la clave,
  conserva la antigua o migra los datos para no romper la analítica.
- No reutilices la misma clave para preguntas con significados distintos.

### Añadir una pregunta o una campaña

1. Inserta la pregunta con su clave en `hf_event_questions` (como arriba).
2. Inserta sus traducciones en `hf_survey_translations` para los 13 locales
   (o edita las filas de `hf_survey_translations` directamente).
3. Comprueba:
   ```sql
   SELECT locale, translation_text
   FROM public.hf_survey_translations
   WHERE translation_key = 'survey.match_over.q1_lost'
   ORDER BY locale;
   ```
4. No hace falta tocar `event-feedback.js` ni recompilar el cliente: la RPC lee
   la tabla en cada carga.
5. `node tester_qa/survey_translations_test.js` valida que el seed PostgreSQL y
   el de SQL Server tengan las mismas 156 filas (13 idiomas × 12 claves).

### Diagnóstico de claves

- Si falta el locale del jugador, `hf_survey_label` usa inglés.
- Si también falta inglés, devuelve la clave; el modal la muestra y
  `event-feedback.js` deja un aviso en consola (`falta traducción para survey.…`).
- El catálogo actual de ejemplo tiene 12 claves por idioma para
  `survey.match_over`.
- El juego solo traduce lo que pasa por `HF.t`/la tabla. Los diálogos y pantallas
  con literales en español (`game.js`, `screens.js`, `maps.js`, `editor.js`,
  `replays.js`, etc.) son deuda de localización aparte; el idioma del survey
  depende de que `question_text`/`options` sean claves.
- Puedes probar la resolución sin abrir el juego:
  ```sql
  SELECT public.hf_survey_label('survey.match_over.q1_lost', 'ja');
  ```

---

## 4. Integración en el juego

API global:

```js
EventFeedbackModal.checkAndRender('MATCH_OVER');
// o HF.EventFeedbackModal.checkAndRender(...)
```

Opciones:

| Opción | Uso |
|---|---|
| `force: true` | Ignora la marca de "ya respondida/descartada" y la de sesión. Para soporte/pruebas. |
| `preview: true` | No lee ni escribe marcas locales; lo usa «Probar MATCH_OVER» del diagnóstico. Un envío real sigue siendo real. |
| `waitForIdle: true` | Espera a que se cierre el modal de fin de partida (o cualquier capa) antes de mostrarse. |
| `waitForIdleMs` | Límite de esa espera (por defecto `eventFeedback.waitForIdleMs`, 45 s). |
| `delay` | Retardo extra en ms tras estar libre la UI. |
| `guard()` | Se evalúa antes y después de consultar la BD; si devuelve `false`, no se muestra. |

Diagnóstico sin pintar nada:

```js
await EventFeedbackModal.debug('MATCH_OVER');
// { ok, status, active, campaign_event_id, questions, question_types,
//   seen, pending, session, payload }
```

Si no hay DevTools, en **Ajustes → Diagnóstico de encuesta** hay un panel
visible con el mismo resultado, botones para limpiar marcas locales y para
probar `MATCH_OVER` con `force`.

`seen` es la marca de «ya respondida/descartada» de ese
`campaign_event_id`; `session` es la marca en memoria de esta sesión. Si
`active: true`, `questions > 0`, `seen: null` y `session: false`, el modal debe
abrirse. Si `active: false`, revisa fechas/flags; si `questions: 0`, faltan
preguntas; si `seen` tiene `status: "answered"`, esa campaña ya se respondió.

Disparadores conectados:

| Evento | Punto | Comportamiento |
|---|---|---|
| `GAME_ENTRY` | `js/main.js` → `openHub()` | Una vez por sesión, 2,6 s después, solo si el Hub sigue visible. |
| `MATCH_OVER` | `js/game.js` → `showEnd()` | Espera a cerrar el resumen; se omite si el jugador pulsa «Siguiente» o «Repetir». El bloqueo de sesión es por `campaign_event_id`: una campaña nueva del mismo tipo sí se muestra. |
| `TRIBE_MODIFIED` | `js/screens.js` → pantalla Tribu | Al salir de la pantalla, solo si hubo cambios y se vuelve al Hub. |
| `MAP_EDIT_COMPLETE` | `js/editor.js` → Guardar mapa | Tras guardar correctamente. |
| `REPLAY_FINISHED` | `js/replay.js` → `finish()` | Al cerrar el resumen; se omite si el jugador repite o juega el mapa. |

Cualquier evento futuro funciona sin tocar el cliente: crear la fila en
`hf_campaign_events` y llamar a `checkAndRender('NUEVO_EVENTO')` desde el punto
correspondiente del juego.

### Configuración (`js/config.js`)

```js
eventFeedback: {
  enabled: true,        // apaga el módulo sin tocar la BD
  dismissDays: 3,       // enfriamiento tras «Ahora no»
  waitForIdleMs: 45000  // espera máxima a que se cierre el modal de fin de partida
}
```

### Estado local

`HF.store` prefija las claves con `hf_`:

| Clave | Contenido |
|---|---|
| `hf_ef_seen` | `{ [campaign_event_id]: { at, status: 'answered' | 'dismissed' } }` |
| `hf_ef_outbox` | Respuestas pendientes de reintento (máx. 20). |

La marca de sesión en memoria también va por `campaign_event_id`, no por
`event_type`: si mañana creas otra campaña `MATCH_OVER`, se mostrará aunque el
jugador haya respondido la anterior sin recargar la página.

Para volver a ver una encuesta en un dispositivo de pruebas:

```js
HF.store.del('ef_seen');
HF.store.del('ef_outbox');
HF.EventFeedbackModal.reset();
```

Sin DevTools: **Ajustes → Diagnóstico de encuesta → Limpiar marcas** limpia solo
esas dos claves. El botón general **Borrar todos los datos** de Ajustes también
las incluye, pero borra además tribu, progreso, mapas, etc.

La cola se reintenta al arrancar (3,5 s) y al recuperar `online`. Si el servidor
rechaza definitivamente (campaña cerrada, pregunta eliminada…), la entrada se
descarta y queda un aviso en consola; no se reintenta para siempre.

---

## 5. Crear una campaña de ejemplo

```sql
WITH c AS (
    INSERT INTO public.hf_campaigns (name, description, start_date, end_date)
    VALUES (
        'Temporada 1 · fin de partida',
        'Cuéntanos cómo fue tu experiencia. Un minuto.',
        NOW(),
        NOW() + INTERVAL '30 days'
    )
    RETURNING campaign_id
), e AS (
    INSERT INTO public.hf_campaign_events (campaign_id, event_type, collect_user_info, allow_comments)
    SELECT campaign_id, 'MATCH_OVER', TRUE, TRUE FROM c
    RETURNING campaign_event_id
)
INSERT INTO public.hf_event_questions
    (campaign_event_id, question_text, question_type, options, display_order, is_required)
SELECT e.campaign_event_id, q.text, q.type, q.options, q.ord, q.req
FROM e, (VALUES
    ('¿Cómo fue la partida?', 'RATING', NULL::jsonb, 1, TRUE),
    ('¿Qué dificultad elegiste?', 'SELECT', '["Fácil","Media","Difícil"]'::jsonb, 2, TRUE),
    ('¿Recomendarías el juego?', 'BOOLEAN', NULL::jsonb, 3, FALSE),
    ('¿Qué mejorarías?', 'TEXT', NULL::jsonb, 4, FALSE)
) AS q(text, type, options, ord, req);
```

Para cambiar el set más adelante: editar/insertar en `hf_event_questions` y ajustar
`display_order`. Para cerrar la campaña antes de tiempo: `UPDATE hf_campaigns SET
end_date = NOW()`. No borres una campaña/evento que ya tenga respuestas: las FK
son `RESTRICT` a propósito para conservar el histórico; desactívala con
`is_active = FALSE` o ajusta las fechas.

---

## 6. Analítica

La vista `hf_v_event_feedback` es plana (una fila por respuesta a pregunta) y está
revocada para `anon`/`authenticated`: se consulta con `service_role` o desde el
SQL Editor. `question_text` y `response_value` de un `SELECT` contienen la
**clave** (`survey.match_over.opt_yes`), no la etiqueta traducida; para informes
legibles, traduce esas claves con `hf_survey_translations` o con la función
`hf_survey_label(key, locale)`.

```sql
SELECT campaign_name, event_type, responded_at, player_email, player_alias,
       question_text, response_value, general_comment
FROM public.hf_v_event_feedback
WHERE event_type = 'MATCH_OVER'
  AND responded_at >= '2026-11-01 00:00:00-06'
  AND responded_at <  '2026-12-01 00:00:00-06'
ORDER BY responded_at DESC, display_order;
```

Agregado:

```sql
SELECT ce.event_type,
       COUNT(DISTINCT pr.response_id) AS encuestas,
       COUNT(*) FILTER (WHERE eq.question_type = 'RATING') AS valoraciones,
       ROUND(AVG(rd.response_value::NUMERIC)
             FILTER (WHERE eq.question_type = 'RATING'), 2) AS media_rating
FROM public.hf_player_responses pr
JOIN public.hf_campaign_events ce ON ce.campaign_event_id = pr.campaign_event_id
JOIN public.hf_response_details rd ON rd.response_id = pr.response_id
JOIN public.hf_event_questions eq ON eq.question_id = rd.question_id
WHERE pr.created_at >= NOW() - INTERVAL '30 days'
GROUP BY ce.event_type
ORDER BY encuestas DESC;
```

---

## 7. Diagnóstico rápido

Atajo: ejecuta [`healthcheck_event_feedback.sql`](healthcheck_event_feedback.sql)
para comprobar tabla/firmas/permisos/RPC, y
[`diagnose_event_feedback.sql`](diagnose_event_feedback.sql) para comparar el
JSON del RPC con la lista de campañas (`el_rpc_elige_esta = true`).

Lista las campañas **una por fila** (con id y nombre) para ver cuál elige el RPC:

```sql
SELECT c.campaign_id, c.name, c.start_date, c.end_date, c.is_active,
       ce.campaign_event_id, ce.is_active AS evento_activo,
       (c.start_date <= NOW() AND c.end_date >= NOW()) AS en_fecha,
       COUNT(eq.question_id) AS preguntas
FROM public.hf_campaigns c
JOIN public.hf_campaign_events ce ON ce.campaign_id = c.campaign_id
LEFT JOIN public.hf_event_questions eq ON eq.campaign_event_id = ce.campaign_event_id
WHERE ce.event_type = 'MATCH_OVER'
GROUP BY c.campaign_id, c.name, c.start_date, c.end_date, c.is_active,
         ce.campaign_event_id, ce.is_active
ORDER BY c.start_date DESC;
```

Y compara con lo que recibe el cliente:

```sql
SELECT public.get_active_event_questions('MATCH_OVER');
```

| Síntoma | Comprobación |
|---|---|
| No aparece el modal | `SELECT * FROM get_active_event_questions('MATCH_OVER');` → debe tener `active: true` y preguntas. Revisar `start_date`/`end_date`, `is_active` de campaña y evento, y que el evento tenga preguntas. |
| Ya respondió una y no sale la nueva | Ejecuta `await EventFeedbackModal.debug('MATCH_OVER')`. Si el `campaign_event_id` que devuelve es el mismo que ya está en `seen`, no es una campaña nueva: crea otra campaña/evento o limpia `hf_ef_seen`. Si `session: true`, recarga o llama a `EventFeedbackModal.reset()`. Si el jugador pulsó «Repetir»/«Siguiente» en el resumen, la encuesta se omitió a propósito; pulsa «Menú» para verla. |
| Hay dos campañas activas para el mismo evento | El RPC elige la de `start_date` más reciente. Cierra/desactiva la anterior (`is_active = FALSE` o `end_date = NOW()`) o asegúrate de que la nueva tenga `start_date` posterior. |
| La encuesta sale en el idioma equivocado | En Ajustes → Diagnóstico mira `Idioma del jugador`, `Locale de la RPC` y `Texto 1 (BD)`. Si el locale es el correcto pero `Texto 1 (BD)` es español literal, la pregunta no es una clave `survey.*`: cámbiala por clave y carga `hf_survey_translations`. Si `Locale de la RPC` es `es`, el jugador no tiene alemán seleccionado o la build es vieja. |
| El RPC responde 404 | Falta aplicar el SQL o PostgREST no ha recargado el esquema: `NOTIFY pgrst, 'reload schema';`. |
| No se guarda la respuesta | Revisar el retorno de `fn_ef_submit_response` y los `GRANT EXECUTE`. La tabla tiene RLS: el cliente **no** debe insertar directamente. |
| «Ya no está activa» | La campaña caducó entre la carga y el envío, o se desactivó. |
| El jugador dice que ya la respondió | `localStorage['hf_ef_seen']`; borrar esa clave o llamar con `{ force: true }` en soporte. |
| Se pregunta demasiado | Subir `dismissDays` o cerrar la campaña; el módulo limita a una respuesta/descarte por `campaign_event_id` y sesión. |

---

## 8. Seguridad

- Las cinco tablas tienen **RLS** y **no** conceden `SELECT/INSERT/UPDATE/DELETE`
  a `anon` ni a `authenticated`.
- Las dos RPC son `SECURITY DEFINER` con `search_path = public, pg_temp` y
  `EXECUTE` concedido solo a `anon`/`authenticated`.
- Toda la validación de tipo, pertenencia y obligatoriedad ocurre en PostgreSQL;
  el cliente es solo una ayuda de UX.
- El correo y el alias son opcionales y se descartan si el evento no los pide.
- Para un panel de administración se recomienda Supabase Auth + políticas para
  `authenticated` y una función `SECURITY DEFINER` que compruebe el rol; no
  conceder acceso directo a las tablas.
- Si el volumen de envíos anónimos crece, añadir rate limiting en una Edge
  Function o un `CHECK` de frecuencia por correo; el modelo actual no identifica
  jugadores.
