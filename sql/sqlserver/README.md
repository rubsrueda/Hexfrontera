# Equivalente SQL Server

Este directorio es una **referencia de migración**, no la ruta que usa el juego
hoy. La app habla con **PostgreSQL/Supabase** mediante PostgREST y las RPC
`get_active_event_questions` / `fn_ef_submit_response`. SQL Server no tiene
PostgREST ni RLS equivalentes, así que migrar de motor implica cambiar también
la capa de datos/API.

## Qué incluye

- [`schema.sql`](schema.sql): las 5 tablas de encuestas + `hf_event_types` +
  traducciones con tipos SQL Server, FKs, checks, semillas de eventos e índices.
- [`survey_translations.sql`](survey_translations.sql): tabla
  `dbo.hf_survey_translations` + seed de 13 idiomas × 12 claves (156 filas).
  La tabla es la fuente de verdad; el seed solo carga el estado inicial.
- Tipos equivalentes y una consulta de resolución de etiquetas (abajo).

## Mapeo de tipos

| PostgreSQL (Supabase) | SQL Server |
|---|---|
| `UUID` | `UNIQUEIDENTIFIER` |
| `TIMESTAMPTZ` | `DATETIMEOFFSET(3)` (o `DATETIME2(3)` en UTC) |
| `BOOLEAN` | `BIT` |
| `TEXT` | `NVARCHAR(MAX)` |
| `VARCHAR(n)` | `NVARCHAR(n)` |
| `JSONB` | `NVARCHAR(MAX)` + `CHECK (ISJSON(col) = 1)` |
| `gen_random_uuid()` | `NEWID()` |
| `NOW()` | `SYSUTCDATETIME()` o `SYSDATETIMEOFFSET()` |
| `jsonb_array_length` | `OPENJSON` + `COUNT(*)` |
| RLS | no existe; usar permisos + stored procedures/API |

## Resolver una pregunta y sus opciones

```sql
DECLARE @locale NVARCHAR(10) = N'es';
DECLARE @base NVARCHAR(10) = LEFT(LOWER(@locale), CHARINDEX(N'-', @locale + N'-') - 1);

SELECT
    q.display_order,
    q.question_type,
    COALESCE(es.translation_text, en.translation_text, q.question_text) AS question_label,
    q.options
FROM dbo.hf_event_questions q
LEFT JOIN dbo.hf_survey_translations es
       ON es.translation_key = q.question_text AND es.locale = @base
LEFT JOIN dbo.hf_survey_translations en
       ON en.translation_key = q.question_text AND en.locale = N'en'
WHERE q.campaign_event_id = @campaign_event_id
ORDER BY q.display_order;
```

Para `options`, `OPENJSON(q.options)` devuelve cada clave; se resuelve con un
`LEFT JOIN` a `hf_survey_translations` y se reconstruye con `FOR JSON PATH` o en
la API.

## Lo que falta para una migración real

1. Crear las 5 tablas de encuestas con los tipos mapeados.
2. Portar `get_active_event_questions` a un stored procedure/API que devuelva el
   mismo JSON (`active`, `campaign`, `event`, `questions`, `*_label`).
3. Portar `fn_ef_submit_response` a un SP transaccional con las mismas
   validaciones.
4. Sustituir `HF.cloud.rpc` por llamadas a esa API.
5. Definir autorización (SQL Server no tiene RLS como Supabase): permisos por
   rol, SP con `EXECUTE AS`/firma, o una capa API que valide.

Si el objetivo es seguir en Supabase, usa
[`../survey_translations_seed.sql`](../survey_translations_seed.sql) y no este
directorio.
