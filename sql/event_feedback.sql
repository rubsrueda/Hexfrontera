-- ============================================================================
-- FEDERATI · MÓDULO DE ENCUESTAS Y EVENTOS DINÁMICOS
-- ----------------------------------------------------------------------------
-- Qué crea:
--   1. hf_campaigns             Campañas con ventana de vigencia.
--  1b. hf_event_types           Catálogo de disparadores disponibles.
--   2. hf_campaign_events       Evento del juego asociado a una campaña.
--   3. hf_event_questions       Set de preguntas configurable por evento.
--   4. hf_player_responses      Cabecera de cada respuesta (jugador + comentario).
--   5. hf_response_details      Respuesta concreta a cada pregunta.
--   6. hf_survey_translations   Traducciones por clave e idioma.
--   7. hf_survey_label / hf_survey_option_labels
--                            Helpers de resolución de claves.
--   8. get_active_event_questions(p_event_type, p_locale)
--                            RPC pública: campaña activa + preguntas + etiquetas.
--   9. fn_ef_submit_response(...)
--                            RPC atómica y validada para guardar la encuesta.
--  10. hf_v_event_feedback      Vista plana para analítica (solo service_role).
--
-- Cómo se aplica:
--   Supabase → SQL Editor → pegar este archivo → Run.
--   Es un script de instalación idempotente para las tablas hf_*; se puede
--   volver a ejecutar sin recrear datos (CREATE ... IF NOT EXISTS / CREATE OR
--   REPLACE). Si vienes de la versión sin prefijo, ejecuta antes
--   migrate_event_feedback_hf_prefix.sql.
--
-- Seguridad:
--   El cliente usa la clave anon/publishable. Las tablas tienen RLS y NO
--   conceden acceso directo a anon/authenticated: toda lectura pública pasa
--   por get_active_event_questions() y toda escritura por
--   fn_ef_submit_response(). Ambas funciones son SECURITY DEFINER con
--   search_path fijo y validan campaña, evento, pregunta y valor.
--   La analítica se consulta con service_role o desde el SQL Editor.
-- ============================================================================

-- gen_random_uuid() es nativo en PostgreSQL 13+; Supabase ya lo expone.
-- No se instala ninguna extensión para no exigir permisos extra.

-- ----------------------------------------------------------------------------
-- 1. CAMPAÑAS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hf_campaigns (
    campaign_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(100) NOT NULL,
    description  TEXT,
    start_date   TIMESTAMPTZ NOT NULL,
    end_date     TIMESTAMPTZ NOT NULL,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT campaigns_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT campaigns_window_valid   CHECK (end_date > start_date)
);

COMMENT ON TABLE  public.hf_campaigns IS 'Campaña de feedback: nombre, descripción y ventana temporal.';
COMMENT ON COLUMN public.hf_campaigns.start_date IS 'Inicio de vigencia (incluido).';
COMMENT ON COLUMN public.hf_campaigns.end_date   IS 'Fin de vigencia (incluido).';

-- ----------------------------------------------------------------------------
-- 1b. CATÁLOGO DE EVENTOS
-- ----------------------------------------------------------------------------
-- Valores actuales que el cliente sabe disparar. Un evento nuevo se da de alta
-- aquí primero; luego se inserta en hf_campaign_events y se añade el hook de
-- código correspondiente.
CREATE TABLE IF NOT EXISTS public.hf_event_types (
    event_type   VARCHAR(50) PRIMARY KEY,
    label        VARCHAR(120) NOT NULL,
    description  TEXT,
    trigger_hint VARCHAR(200),
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order   INT NOT NULL DEFAULT 100,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT hf_event_types_format CHECK (event_type ~ '^[A-Z][A-Z0-9_]{2,49}$'),
    CONSTRAINT hf_event_types_label_not_blank CHECK (btrim(label) <> ''),
    CONSTRAINT hf_event_types_order_valid CHECK (sort_order >= 0)
);

COMMENT ON TABLE  public.hf_event_types IS 'Catálogo de disparadores de encuesta disponibles.';
COMMENT ON COLUMN public.hf_event_types.label IS 'Nombre legible para el panel de administración.';
COMMENT ON COLUMN public.hf_event_types.trigger_hint IS 'Dónde se dispara en el cliente; informativo.';
COMMENT ON COLUMN public.hf_event_types.is_active IS 'Si FALSE, el RPC ignora las campañas de este tipo.';

INSERT INTO public.hf_event_types
    (event_type, label, description, trigger_hint, sort_order)
VALUES
    ('GAME_ENTRY', 'Entrada al juego',
     'Ingreso al juego / carga inicial del Hub.', 'main.js · openHub() · una vez por sesión', 10),
    ('MATCH_OVER', 'Fin de partida',
     'Al terminar una partida y cerrar el resumen.', 'game.js · showEnd() · al cerrar con Menú', 20),
    ('TRIBE_MODIFIED', 'Tribu modificada',
     'Al terminar de modificar la tribu.', 'screens.js · al salir de Tribu con cambios', 30),
    ('MAP_EDIT_COMPLETE', 'Mapa guardado',
     'Al guardar un mapa en el editor.', 'editor.js · tras guardar el mapa', 40),
    ('REPLAY_FINISHED', 'Repetición terminada',
     'Al terminar de ver una repetición.', 'replay.js · finish() · al cerrar el resumen', 50)
ON CONFLICT (event_type) DO NOTHING;
-- No se pisan labels/descripciones ni is_active de un catálogo ya editado.

-- ----------------------------------------------------------------------------
-- 2. EVENTOS DE CAMPAÑA
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hf_campaign_events (
    campaign_event_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id        UUID NOT NULL REFERENCES public.hf_campaigns(campaign_id) ON DELETE CASCADE,
    event_type         VARCHAR(50) NOT NULL,
    collect_user_info  BOOLEAN NOT NULL DEFAULT TRUE,
    allow_comments     BOOLEAN NOT NULL DEFAULT TRUE,
    is_active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_active_event_per_campaign UNIQUE (campaign_id, event_type),
    -- Los tipos son constantes de código: MAYÚSCULAS, dígitos y guion bajo.
    CONSTRAINT campaign_events_type_format CHECK (event_type ~ '^[A-Z][A-Z0-9_]{2,49}$')
);

COMMENT ON TABLE  public.hf_campaign_events IS 'Disparador del juego (GAME_ENTRY, MATCH_OVER, …) asociado a una campaña.';
COMMENT ON COLUMN public.hf_campaign_events.collect_user_info IS 'Si TRUE, el modal pide correo y alias (ambos opcionales).';
COMMENT ON COLUMN public.hf_campaign_events.allow_comments     IS 'Si TRUE, el modal muestra el comentario final.';

-- Los eventos que ya existieran en una instalación previa se dan de alta en el
-- catálogo antes de crear la FK, para no romper datos.
DO $$
BEGIN
    INSERT INTO public.hf_event_types (event_type, label)
    SELECT DISTINCT ce.event_type, ce.event_type
    FROM public.hf_campaign_events ce
    ON CONFLICT (event_type) DO NOTHING;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'hf_campaign_events'
          AND c.contype = 'f'
          AND pg_get_constraintdef(c.oid) LIKE '%hf_event_types%'
    ) THEN
        ALTER TABLE public.hf_campaign_events
            ADD CONSTRAINT hf_campaign_events_type_fk
            FOREIGN KEY (event_type) REFERENCES public.hf_event_types(event_type)
            ON DELETE RESTRICT;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. PREGUNTAS DEL EVENTO
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hf_event_questions (
    question_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_event_id  UUID NOT NULL REFERENCES public.hf_campaign_events(campaign_event_id) ON DELETE CASCADE,
    question_text      TEXT NOT NULL,
    question_type      VARCHAR(30) NOT NULL,
    options            JSONB NULL,
    display_order      INT NOT NULL DEFAULT 1,
    is_required        BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT event_questions_text_not_blank CHECK (btrim(question_text) <> ''),
    CONSTRAINT event_questions_type_valid CHECK (question_type IN ('RATING', 'SELECT', 'BOOLEAN', 'TEXT')),
    CONSTRAINT event_questions_order_valid CHECK (display_order >= 1),
    -- SELECT exige un array de 2..20 opciones; el resto puede omitirlo o
    -- usar un array (p. ej. etiquetas de las estrellas en RATING).
    CONSTRAINT event_questions_options_valid CHECK (
        CASE
            WHEN question_type = 'SELECT' THEN
                CASE
                    WHEN options IS NULL OR jsonb_typeof(options) <> 'array' THEN FALSE
                    ELSE jsonb_array_length(options) BETWEEN 2 AND 20
                END
            ELSE
                options IS NULL OR jsonb_typeof(options) = 'array'
        END
    )
);

COMMENT ON TABLE  public.hf_event_questions IS 'Preguntas del set, ordenadas por display_order.';
COMMENT ON COLUMN public.hf_event_questions.question_text IS 'Texto literal o clave de traducción tipo survey.match_over.q1_lost.';
COMMENT ON COLUMN public.hf_event_questions.question_type IS 'RATING (1..5) · SELECT · BOOLEAN · TEXT.';
COMMENT ON COLUMN public.hf_event_questions.options       IS 'Para SELECT: claves o etiquetas, p. ej. ["survey.match_over.opt_yes", …]. Para RATING: 5 etiquetas/claves opcionales.';

-- ----------------------------------------------------------------------------
-- 4. RESPUESTAS (CABECERA)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hf_player_responses (
    response_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_event_id   UUID NOT NULL REFERENCES public.hf_campaign_events(campaign_event_id) ON DELETE RESTRICT,
    player_email        VARCHAR(255) NULL,
    player_alias        VARCHAR(100) NULL,
    general_comment     TEXT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT player_responses_email_valid CHECK (
        player_email IS NULL
        OR player_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$'
    ),
    CONSTRAINT player_responses_alias_valid CHECK (player_alias IS NULL OR btrim(player_alias) <> ''),
    CONSTRAINT player_responses_comment_len CHECK (general_comment IS NULL OR char_length(general_comment) <= 4000)
);

COMMENT ON TABLE  public.hf_player_responses IS 'Cabecera de una encuesta enviada: evento, datos opcionales del jugador y fecha.';

-- ----------------------------------------------------------------------------
-- 5. DETALLE DE RESPUESTAS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hf_response_details (
    detail_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id     UUID NOT NULL REFERENCES public.hf_player_responses(response_id) ON DELETE CASCADE,
    question_id     UUID NOT NULL REFERENCES public.hf_event_questions(question_id) ON DELETE RESTRICT,
    response_value  TEXT NOT NULL,
    CONSTRAINT response_details_value_not_blank CHECK (btrim(response_value) <> ''),
    -- Una sola respuesta por pregunta y encuesta: evita duplicados y sesgos.
    CONSTRAINT response_details_once_per_question UNIQUE (response_id, question_id)
);

COMMENT ON TABLE public.hf_response_details IS 'Valor puntual de cada pregunta (siempre como texto canónico).';

-- ----------------------------------------------------------------------------
-- 5b. TRADUCCIONES DEL CONTENIDO
-- ----------------------------------------------------------------------------
-- Una fila por clave e idioma. Las preguntas/opciones guardan la clave; la RPC
-- resuelve la etiqueta para el idioma del jugador (fallback a inglés y a la
-- propia clave). No se cargan archivos JSON en runtime.
CREATE TABLE IF NOT EXISTS public.hf_survey_translations (
    translation_key  VARCHAR(160) NOT NULL,
    locale           VARCHAR(10)  NOT NULL,
    translation_text TEXT         NOT NULL,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT hf_survey_translations_pkey PRIMARY KEY (translation_key, locale),
    CONSTRAINT hf_survey_translations_key_format CHECK (translation_key ~ '^survey\.[a-z0-9_.-]+$'),
    CONSTRAINT hf_survey_translations_locale_format CHECK (locale ~ '^[a-z]{2}(-[A-Za-z]{2,})?$'),
    CONSTRAINT hf_survey_translations_text_not_blank CHECK (btrim(translation_text) <> '')
);

COMMENT ON TABLE  public.hf_survey_translations IS 'Traducciones de preguntas/opciones por clave e idioma.';
COMMENT ON COLUMN public.hf_survey_translations.translation_key IS 'Clave estable, p. ej. survey.match_over.q1_lost.';
COMMENT ON COLUMN public.hf_survey_translations.locale IS 'Código base: en, es, zh, hi, fr, ar, bn, pt, ru, de, ja, ko, it.';
COMMENT ON COLUMN public.hf_survey_translations.translation_text IS 'Texto que ve el jugador.';

CREATE INDEX IF NOT EXISTS idx_hf_survey_translations_locale
    ON public.hf_survey_translations (locale, translation_key);

-- ----------------------------------------------------------------------------
-- 6. ÍNDICES
-- ----------------------------------------------------------------------------
-- Ventana de campañas activas (la consulta principal del RPC).
CREATE INDEX IF NOT EXISTS idx_hf_campaigns_dates
    ON public.hf_campaigns (start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_hf_campaigns_active_window
    ON public.hf_campaigns (start_date, end_date) WHERE is_active;

-- Búsqueda del disparador por tipo y por campaña.
CREATE INDEX IF NOT EXISTS idx_hf_campaign_events_type
    ON public.hf_campaign_events (event_type);
CREATE INDEX IF NOT EXISTS idx_hf_campaign_events_campaign
    ON public.hf_campaign_events (campaign_id);

-- Set de preguntas en orden de presentación.
CREATE INDEX IF NOT EXISTS idx_hf_event_questions_order
    ON public.hf_event_questions (campaign_event_id, display_order);

-- Analítica por evento y fecha, y detalle por pregunta.
CREATE INDEX IF NOT EXISTS idx_hf_player_responses_event_date
    ON public.hf_player_responses (campaign_event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hf_player_responses_date
    ON public.hf_player_responses (created_at);
CREATE INDEX IF NOT EXISTS idx_hf_response_details_question
    ON public.hf_response_details (question_id);

-- ----------------------------------------------------------------------------
-- 6b. HELPERS · resolución de claves de traducción
-- ----------------------------------------------------------------------------
-- Si el valor es una clave `survey.…`, busca primero el locale base del
-- jugador, luego inglés y, por último, devuelve la propia clave. Si es texto
-- literal, lo devuelve sin tocar.
CREATE OR REPLACE FUNCTION public.hf_survey_label(
    p_key    TEXT,
    p_locale VARCHAR DEFAULT 'en'
)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT CASE
        WHEN p_key IS NULL OR btrim(p_key) = '' THEN ''
        WHEN p_key !~ '^survey\.[a-z0-9_.-]+$' THEN p_key
        ELSE COALESCE(
            (
                SELECT t.translation_text
                FROM public.hf_survey_translations t
                WHERE t.translation_key = p_key
                  AND t.locale = split_part(lower(btrim(coalesce(p_locale, 'en'))), '-', 1)
                LIMIT 1
            ),
            (
                SELECT t.translation_text
                FROM public.hf_survey_translations t
                WHERE t.translation_key = p_key
                  AND t.locale = 'en'
                LIMIT 1
            ),
            p_key
        )
    END;
$$;

-- Devuelve un array de etiquetas alineado con options. Acepta opciones
-- escalares (claves o texto) y objetos { value, label }.
CREATE OR REPLACE FUNCTION public.hf_survey_option_labels(
    p_options JSONB,
    p_locale  VARCHAR DEFAULT 'en'
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT CASE
        WHEN p_options IS NULL OR jsonb_typeof(p_options) <> 'array' THEN NULL
        ELSE (
            SELECT jsonb_agg(
                public.hf_survey_label(
                    CASE
                        WHEN jsonb_typeof(o) = 'object'
                            THEN coalesce(o ->> 'label', o ->> 'value')
                        ELSE o #>> '{}'
                    END,
                    p_locale
                )
                ORDER BY ord
            )
            FROM jsonb_array_elements(p_options) WITH ORDINALITY AS t(o, ord)
        )
    END;
$$;

REVOKE ALL ON FUNCTION public.hf_survey_label(TEXT, VARCHAR) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.hf_survey_option_labels(JSONB, VARCHAR) FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 7. RPC · get_active_event_questions
-- ----------------------------------------------------------------------------
-- Devuelve SIEMPRE un objeto JSON (nunca NULL):
--   {
--     "active": true,
--     "locale": "es",
--     "campaign": { campaign_id, name, name_label, description,
--                   description_label, start_date, end_date },
--     "event":    { campaign_event_id, event_type, collect_user_info, allow_comments },
--     "questions": [ { question_id, question_text, question_label, question_type,
--                      options, option_labels, display_order, is_required }, … ]
--   }
-- `question_text`/`options` son los valores canónicos de la BD; los `*_label`
-- son lo que se pinta en el idioma del jugador. Sin campaña/evento activo
-- devuelve { "active": false, … }.
--
-- Si hay varias campañas solapadas para el mismo evento se elige la de
-- start_date más reciente (y created_at como desempate): una sola encuesta
-- por disparador, determinista.
-- Se mantienen dos firmas:
--   1 arg  -> compatibilidad con clientes antiguos (locale inglés).
--   2 args -> cliente nuevo (locale del jugador).
DROP FUNCTION IF EXISTS public.get_active_event_questions(VARCHAR);
DROP FUNCTION IF EXISTS public.get_active_event_questions(VARCHAR, VARCHAR);

CREATE OR REPLACE FUNCTION public.get_active_event_questions(
    p_event_type VARCHAR,
    p_locale     VARCHAR
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
WITH params AS (
    SELECT split_part(lower(btrim(coalesce(p_locale, 'en'))), '-', 1) AS locale
),
chosen AS (
    SELECT
        c.campaign_id,
        c.name,
        c.description,
        c.start_date,
        c.end_date,
        ce.campaign_event_id,
        ce.event_type,
        ce.collect_user_info,
        ce.allow_comments,
        et.label AS event_label,
        et.description AS event_description
    FROM public.hf_campaigns c
    JOIN public.hf_campaign_events ce ON ce.campaign_id = c.campaign_id
    JOIN public.hf_event_types et ON et.event_type = ce.event_type
    WHERE c.is_active
      AND ce.is_active
      AND et.is_active
      AND NOW() BETWEEN c.start_date AND c.end_date
      AND ce.event_type = upper(btrim(coalesce(p_event_type, '')))
    ORDER BY c.start_date DESC, c.created_at DESC, c.campaign_id
    LIMIT 1
)
SELECT COALESCE(
    (
        SELECT jsonb_build_object(
            'active', TRUE,
            'locale', p.locale,
            'campaign', jsonb_build_object(
                'campaign_id', c.campaign_id,
                'name', c.name,
                'name_label', public.hf_survey_label(c.name, p.locale),
                'description', c.description,
                'description_label', public.hf_survey_label(c.description, p.locale),
                'start_date', c.start_date,
                'end_date', c.end_date
            ),
            'event', jsonb_build_object(
                'campaign_event_id', c.campaign_event_id,
                'event_type', c.event_type,
                'label', c.event_label,
                'description', c.event_description,
                'collect_user_info', c.collect_user_info,
                'allow_comments', c.allow_comments
            ),
            'questions', COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'question_id', q.question_id,
                            'question_text', q.question_text,
                            'question_label', public.hf_survey_label(q.question_text, p.locale),
                            'question_type', q.question_type,
                            'options', q.options,
                            'option_labels', public.hf_survey_option_labels(q.options, p.locale),
                            'display_order', q.display_order,
                            'is_required', q.is_required
                        )
                        ORDER BY q.display_order, q.question_id
                    )
                    FROM public.hf_event_questions q
                    WHERE q.campaign_event_id = c.campaign_event_id
                ),
                '[]'::jsonb
            )
        )
        FROM chosen c CROSS JOIN params p
    ),
    jsonb_build_object(
        'active', FALSE,
        'locale', (SELECT locale FROM params),
        'campaign', NULL,
        'event', NULL,
        'questions', '[]'::jsonb
    )
);
$$;

-- Compatibilidad: clientes anteriores que aún no envían p_locale.
CREATE OR REPLACE FUNCTION public.get_active_event_questions(p_event_type VARCHAR)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT public.get_active_event_questions(p_event_type, 'en');
$$;

COMMENT ON FUNCTION public.get_active_event_questions(VARCHAR, VARCHAR)
    IS 'Campaña activa AHORA, preguntas ordenadas y etiquetas resueltas para el locale.';
COMMENT ON FUNCTION public.get_active_event_questions(VARCHAR)
    IS 'Compatibilidad: delega en la versión con locale usando inglés.';

REVOKE ALL ON FUNCTION public.get_active_event_questions(VARCHAR, VARCHAR) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_active_event_questions(VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_event_questions(VARCHAR, VARCHAR) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_event_questions(VARCHAR) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 8. RPC · fn_ef_submit_response
-- ----------------------------------------------------------------------------
-- Guarda cabecera + detalles en UNA transacción (la función es atómica).
-- Valida que el evento siga activo, que cada pregunta pertenezca al evento,
-- que no haya duplicados, que las obligatorias estén respondidas y que cada
-- valor cumpla el tipo. Respeta collect_user_info y allow_comments.
--
-- p_answers: [ { "question_id": "<uuid>", "value": "<texto>" }, … ]
-- Devuelve: { ok: true, response_id, campaign_event_id, event_type, answers }
-- o         { ok: false, error: "CÓDIGO" }  (códigos abajo).
CREATE OR REPLACE FUNCTION public.fn_ef_submit_response(
    p_campaign_event_id UUID,
    p_answers           JSONB,
    p_email             VARCHAR DEFAULT NULL,
    p_alias             VARCHAR DEFAULT NULL,
    p_comment           TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_event           RECORD;
    v_i               INT;
    v_elem            JSONB;
    v_qid_text        TEXT;
    v_qid             UUID;
    v_val             TEXT;
    v_qtype           VARCHAR(30);
    v_qoptions        JSONB;
    v_clean           JSONB := '[]'::jsonb;
    v_answers         INT;
    v_missing         INT;
    v_email           VARCHAR(255);
    v_alias           VARCHAR(100);
    v_comment         TEXT;
    v_response_id     UUID;
BEGIN
    -- 8.1 Evento y campaña vigentes en este instante.
    SELECT
        ce.campaign_event_id,
        ce.campaign_id,
        ce.event_type,
        ce.collect_user_info,
        ce.allow_comments,
        c.name AS campaign_name
    INTO v_event
    FROM public.hf_campaign_events ce
    JOIN public.hf_campaigns c ON c.campaign_id = ce.campaign_id
    JOIN public.hf_event_types et ON et.event_type = ce.event_type
    WHERE ce.campaign_event_id = p_campaign_event_id
      AND ce.is_active
      AND et.is_active
      AND c.is_active
      AND NOW() BETWEEN c.start_date AND c.end_date;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', FALSE, 'error', 'EVENT_NOT_ACTIVE');
    END IF;

    -- 8.2 Forma básica del payload.
    IF p_answers IS NULL OR jsonb_typeof(p_answers) <> 'array' THEN
        RETURN jsonb_build_object('ok', FALSE, 'error', 'INVALID_ANSWERS');
    END IF;

    v_answers := jsonb_array_length(p_answers);
    IF v_answers > 50 THEN
        RETURN jsonb_build_object('ok', FALSE, 'error', 'TOO_MANY_ANSWERS');
    END IF;

    -- 8.3 Validación pregunta a pregunta.
    FOR v_i IN 0 .. v_answers - 1 LOOP
        v_elem := p_answers -> v_i;

        IF jsonb_typeof(v_elem) <> 'object' THEN
            RETURN jsonb_build_object('ok', FALSE, 'error', 'INVALID_ANSWERS');
        END IF;

        v_qid_text := btrim(coalesce(v_elem ->> 'question_id', ''));
        IF v_qid_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            RETURN jsonb_build_object('ok', FALSE, 'error', 'INVALID_ANSWERS');
        END IF;
        v_qid := v_qid_text::UUID;

        -- Duplicado dentro de la misma encuesta.
        IF EXISTS (
            SELECT 1
            FROM jsonb_array_elements(v_clean) AS a
            WHERE (a ->> 'question_id')::UUID = v_qid
        ) THEN
            RETURN jsonb_build_object('ok', FALSE, 'error', 'DUPLICATE_QUESTION');
        END IF;

        -- La pregunta debe pertenecer al evento (no vale de otra campaña).
        SELECT q.question_type, q.options
        INTO v_qtype, v_qoptions
        FROM public.hf_event_questions q
        WHERE q.question_id = v_qid
          AND q.campaign_event_id = p_campaign_event_id;

        IF NOT FOUND THEN
            RETURN jsonb_build_object('ok', FALSE, 'error', 'UNKNOWN_QUESTION');
        END IF;

        v_val := btrim(coalesce(v_elem ->> 'value', ''));
        IF v_val = '' OR char_length(v_val) > 4000 THEN
            RETURN jsonb_build_object('ok', FALSE, 'error', 'INVALID_ANSWER');
        END IF;

        -- Validación por tipo. El cliente envía siempre texto canónico.
        IF v_qtype = 'RATING' THEN
            IF v_val !~ '^[1-5]$' THEN
                RETURN jsonb_build_object('ok', FALSE, 'error', 'INVALID_RATING');
            END IF;

        ELSIF v_qtype = 'BOOLEAN' THEN
            IF lower(v_val) IN ('true', '1') THEN
                v_val := 'true';
            ELSIF lower(v_val) IN ('false', '0') THEN
                v_val := 'false';
            ELSE
                RETURN jsonb_build_object('ok', FALSE, 'error', 'INVALID_BOOLEAN');
            END IF;

        ELSIF v_qtype = 'SELECT' THEN
            -- Acepta opciones escalares (["Fácil", …]) y el formato extendido
            -- ({ "value": "facil", "label": "Fácil" }).
            IF v_qoptions IS NULL OR NOT EXISTS (
                SELECT 1
                FROM jsonb_array_elements(v_qoptions) AS opt
                WHERE CASE
                    WHEN jsonb_typeof(opt) = 'object' THEN opt ->> 'value' = v_val
                    ELSE opt #>> '{}' = v_val
                END
            ) THEN
                RETURN jsonb_build_object('ok', FALSE, 'error', 'INVALID_OPTION');
            END IF;

        ELSIF v_qtype = 'TEXT' THEN
            IF char_length(v_val) > 2000 THEN
                RETURN jsonb_build_object('ok', FALSE, 'error', 'INVALID_TEXT');
            END IF;

        ELSE
            -- El CHECK de la tabla lo impide, pero la función no confía en ello.
            RETURN jsonb_build_object('ok', FALSE, 'error', 'INVALID_QUESTION_TYPE');
        END IF;

        v_clean := v_clean || jsonb_build_array(
            jsonb_build_object('question_id', v_qid, 'value', v_val)
        );
    END LOOP;

    -- 8.4 Todas las preguntas obligatorias deben tener respuesta.
    SELECT COUNT(*)
    INTO v_missing
    FROM public.hf_event_questions q
    WHERE q.campaign_event_id = p_campaign_event_id
      AND q.is_required
      AND NOT EXISTS (
          SELECT 1
          FROM jsonb_array_elements(v_clean) AS a
          WHERE (a ->> 'question_id')::UUID = q.question_id
      );

    IF v_missing > 0 THEN
        RETURN jsonb_build_object('ok', FALSE, 'error', 'REQUIRED_MISSING', 'missing', v_missing);
    END IF;

    -- 8.5 Datos personales: solo si el evento los permite.
    IF v_event.collect_user_info THEN
        v_email := NULLIF(btrim(coalesce(p_email, '')), '');
        v_alias := NULLIF(btrim(coalesce(p_alias, '')), '');
        IF v_email IS NOT NULL AND v_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$' THEN
            RETURN jsonb_build_object('ok', FALSE, 'error', 'INVALID_EMAIL');
        END IF;
        IF v_alias IS NOT NULL AND char_length(v_alias) > 100 THEN
            RETURN jsonb_build_object('ok', FALSE, 'error', 'INVALID_ALIAS');
        END IF;
    ELSE
        v_email := NULL;
        v_alias := NULL;
    END IF;

    -- 8.6 Comentario: solo si el evento lo permite.
    IF v_event.allow_comments THEN
        v_comment := NULLIF(btrim(coalesce(p_comment, '')), '');
        IF v_comment IS NOT NULL AND char_length(v_comment) > 4000 THEN
            RETURN jsonb_build_object('ok', FALSE, 'error', 'INVALID_COMMENT');
        END IF;
    ELSE
        v_comment := NULL;
    END IF;

    -- 8.7 Una encuesta vacía no aporta nada (salvo comentario voluntario).
    IF jsonb_array_length(v_clean) = 0 AND v_comment IS NULL THEN
        RETURN jsonb_build_object('ok', FALSE, 'error', 'EMPTY_RESPONSE');
    END IF;

    -- 8.8 Inserción atómica: cabecera + detalles.
    INSERT INTO public.hf_player_responses (
        campaign_event_id, player_email, player_alias, general_comment
    )
    VALUES (p_campaign_event_id, v_email, v_alias, v_comment)
    RETURNING response_id INTO v_response_id;

    INSERT INTO public.hf_response_details (response_id, question_id, response_value)
    SELECT v_response_id, (a ->> 'question_id')::UUID, a ->> 'value'
    FROM jsonb_array_elements(v_clean) AS a;

    RETURN jsonb_build_object(
        'ok', TRUE,
        'response_id', v_response_id,
        'campaign_event_id', p_campaign_event_id,
        'event_type', v_event.event_type,
        'answers', jsonb_array_length(v_clean)
    );

EXCEPTION
    WHEN OTHERS THEN
        -- No se filtra el detalle interno al cliente anónimo.
        RAISE WARNING 'fn_ef_submit_response: %', SQLERRM;
        RETURN jsonb_build_object('ok', FALSE, 'error', 'INTERNAL');
END;
$$;

COMMENT ON FUNCTION public.fn_ef_submit_response(UUID, JSONB, VARCHAR, VARCHAR, TEXT)
    IS 'Guarda una encuesta validada (cabecera + detalles) de forma atómica.';

REVOKE ALL ON FUNCTION public.fn_ef_submit_response(UUID, JSONB, VARCHAR, VARCHAR, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_ef_submit_response(UUID, JSONB, VARCHAR, VARCHAR, TEXT) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 9. RLS · sin acceso directo desde el cliente
-- ----------------------------------------------------------------------------
ALTER TABLE public.hf_campaigns         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hf_event_types      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hf_campaign_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hf_event_questions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hf_player_responses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hf_response_details  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hf_survey_translations ENABLE ROW LEVEL SECURITY;

-- Las RPC SECURITY DEFINER son la única puerta pública. Si en el futuro se
-- quiere un panel de administración con Supabase Auth, se añaden políticas
-- para el rol `authenticated` y se conceden los GRANT correspondientes.
REVOKE ALL ON TABLE public.hf_campaigns        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.hf_event_types     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.hf_campaign_events  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.hf_event_questions  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.hf_player_responses FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.hf_response_details FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.hf_survey_translations FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 10. VISTA ANALÍTICA
-- ----------------------------------------------------------------------------
-- security_invoker = TRUE: la vista respeta los privilegios/RLS de quien
-- consulta. Se revoca a anon/authenticated; se usa con service_role o desde
-- el SQL Editor. Evita exponer correos y comentarios al cliente del juego.
CREATE OR REPLACE VIEW public.hf_v_event_feedback
WITH (security_invoker = TRUE)
AS
SELECT
    c.campaign_id,
    c.name                    AS campaign_name,
    ce.campaign_event_id,
    ce.event_type,
    pr.response_id,
    pr.created_at             AS responded_at,
    pr.player_email,
    pr.player_alias,
    pr.general_comment,
    eq.question_id,
    eq.question_text,
    eq.question_type,
    eq.display_order,
    rd.response_value
FROM public.hf_player_responses pr
JOIN public.hf_campaign_events ce ON ce.campaign_event_id = pr.campaign_event_id
JOIN public.hf_campaigns c       ON c.campaign_id = ce.campaign_id
JOIN public.hf_response_details rd ON rd.response_id = pr.response_id
JOIN public.hf_event_questions eq ON eq.question_id = rd.question_id;

COMMENT ON VIEW public.hf_v_event_feedback IS 'Vista plana de respuestas para analítica (solo service_role / SQL Editor).';

REVOKE ALL ON public.hf_v_event_feedback FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.hf_v_event_feedback TO service_role;

-- Catálogo + uso real: permite ver qué eventos están configurados, si están
-- vigentes y si ya generan preguntas/respuestas.
CREATE OR REPLACE VIEW public.hf_v_event_type_usage
WITH (security_invoker = TRUE)
AS
SELECT
    et.event_type,
    et.label,
    et.description,
    et.trigger_hint,
    et.is_active,
    et.sort_order,
    COUNT(DISTINCT ce.campaign_event_id) AS eventos_configurados,
    COUNT(DISTINCT ce.campaign_event_id) FILTER (
        WHERE c.is_active
          AND ce.is_active
          AND NOW() BETWEEN c.start_date AND c.end_date
    ) AS eventos_vigentes,
    COUNT(DISTINCT eq.question_id) AS preguntas,
    COUNT(DISTINCT pr.response_id) AS respuestas,
    MAX(pr.created_at) AS ultima_respuesta
FROM public.hf_event_types et
LEFT JOIN public.hf_campaign_events ce ON ce.event_type = et.event_type
LEFT JOIN public.hf_campaigns c ON c.campaign_id = ce.campaign_id
LEFT JOIN public.hf_event_questions eq ON eq.campaign_event_id = ce.campaign_event_id
LEFT JOIN public.hf_player_responses pr ON pr.campaign_event_id = ce.campaign_event_id
GROUP BY et.event_type, et.label, et.description, et.trigger_hint,
         et.is_active, et.sort_order;

COMMENT ON VIEW public.hf_v_event_type_usage
    IS 'Catálogo de eventos con uso: campañas, vigentes, preguntas y respuestas.';

REVOKE ALL ON public.hf_v_event_type_usage FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.hf_v_event_type_usage TO service_role;

-- ----------------------------------------------------------------------------
-- 11. CONSULTA ANALÍTICA DE REFERENCIA
-- ----------------------------------------------------------------------------
-- Respuestas por evento en un rango de fechas (equivale al ejemplo del
-- enunciado, ya ordenado por pregunta). Sustituye los valores entre <>.
/*
SELECT
    v.campaign_name        AS campana,
    v.event_type           AS evento,
    v.responded_at         AS fecha_respuesta,
    v.player_email,
    v.player_alias,
    v.question_text        AS pregunta,
    v.response_value       AS respuesta,
    v.general_comment      AS comentario_final
FROM public.hf_v_event_feedback v
WHERE v.event_type = 'MATCH_OVER'
  AND v.responded_at >= '2026-11-01 00:00:00-06'
  AND v.responded_at <  '2026-12-01 00:00:00-06'
ORDER BY v.responded_at DESC, v.display_order ASC;
*/

-- Agregado rápido (media de RATING y participación):
/*
SELECT
    ce.event_type,
    COUNT(DISTINCT pr.response_id) AS encuestas,
    COUNT(*) FILTER (WHERE eq.question_type = 'RATING') AS valoraciones,
    ROUND(AVG(rd.response_value::NUMERIC) FILTER (WHERE eq.question_type = 'RATING'), 2) AS media_rating
FROM public.hf_player_responses pr
JOIN public.hf_campaign_events ce ON ce.campaign_event_id = pr.campaign_event_id
JOIN public.hf_response_details rd ON rd.response_id = pr.response_id
JOIN public.hf_event_questions eq ON eq.question_id = rd.question_id
WHERE pr.created_at >= NOW() - INTERVAL '30 days'
GROUP BY ce.event_type
ORDER BY encuestas DESC;
*/
