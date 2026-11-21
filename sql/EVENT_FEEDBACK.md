# Encuestas y eventos dinámicos

El cliente consulta una campaña activa en Supabase y presenta preguntas dinámicas. El envío se valida en servidor mediante una RPC; `sql/sqlserver/` contiene referencias SQL Server, no el backend usado por el runtime actual.

## Archivos principales

| Función | Archivo |
|---|---|
| Tablas, RLS, catálogo y RPC | [`event_feedback.sql`](event_feedback.sql) |
| Semilla de traducciones | [`survey_translations_seed.sql`](survey_translations_seed.sql) |
| Revisión transaccional SQL | [`verify_event_feedback.sql`](verify_event_feedback.sql) |
| Cliente y modal | [`../js/event-feedback.js`](../js/event-feedback.js) |
| Traducciones cliente/fallback | [`../js/i18n/survey-i18n.js`](../js/i18n/survey-i18n.js) |
| Pruebas automatizadas | [`../tester_qa/event_feedback_test.js`](../tester_qa/event_feedback_test.js), [`../tester_qa/survey_translations_test.js`](../tester_qa/survey_translations_test.js) |

## Configuración

1. En Supabase SQL Editor, aplica `event_feedback.sql` y después `survey_translations_seed.sql`.
2. Si ya hay tablas antiguas sin prefijo y quieres conservarlas, revisa y aplica primero `migrate_event_feedback_hf_prefix.sql`.
3. Configura campañas y preguntas en las tablas `hf_*`. Para traducir claves, actualiza `hf_survey_translations`; el SQL incluye fallback por locale base, inglés y clave.
4. Si PostgREST no reconoce una RPC recién aplicada, recarga el esquema. `verify_event_feedback.sql` es una comprobación transaccional opcional; requiere una base autorizada y no se ejecutó en esta revisión.

No es necesario cambiar el cliente para cambiar el contenido de una campaña existente. Añadir un tipo de evento requiere registrarlo en `hf_event_types`, vincularlo a una campaña y agregar un hook de cliente.

## Eventos conectados

El código llama a `HF.EventFeedbackModal.checkAndRender()` para `GAME_ENTRY`, `MATCH_OVER`, `TRIBE_MODIFIED`, `MAP_EDIT_COMPLETE` y `REPLAY_FINISHED` en `main.js`, `game.js`, `screens.js`, `editor.js` y `replay.js`, respectivamente. El catálogo de base de datos no dispara eventos por sí solo.

## Contrato de datos

- `get_active_event_questions(p_event_type, p_locale)` devuelve campaña, evento y preguntas; existe una firma de compatibilidad sin `p_locale`. El cliente reintenta con esa firma si la versión remota aún no acepta el locale.
- Preguntas/opciones admiten `RATING`, `SELECT`, `BOOLEAN` y `TEXT`. Las etiquetas pueden almacenarse como claves `survey.*`; la RPC resuelve las traducciones desde `hf_survey_translations`. El cliente también localiza literales existentes mediante `HF.tx` y `survey-i18n.js`.
- `fn_ef_submit_response` valida y guarda una respuesta en una sola operación. RLS impide lectura anónima directa de respuestas; el cliente usa la RPC.
- El servidor acepta reenvíos; la prevención de repreguntar es responsabilidad del cliente. No asumas una restricción de una respuesta por jugador en el esquema.

## Validación

Con Node.js disponible, desde la raíz:

```sh
node tester_qa/event_feedback_test.js
node tester_qa/survey_translations_test.js
```

No se ejecutaron pruebas ni se verificó una base remota en esta actualización (Node.js/npm no disponibles). Los archivos SQL describen el comportamiento esperado, no el estado aplicado del proyecto Supabase.
