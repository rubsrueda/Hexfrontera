-- ============================================================================
-- FEDERATI · MÓDULO DE ENCUESTAS Y EVENTOS DINÁMICOS
-- ----------------------------------------------------------------------------
-- Qué crea:
--   1. hf_campaigns             Campañas con ventana de vigencia.
--   2. hf_campaign_events       Evento del juego asociado a una campaña.
--   3. hf_event_questions       Set de preguntas configurable por evento.
--   4. hf_player_responses      Cabecera de cada respuesta (jugador + comentario).
--   5. hf_response_details      Respuesta concreta a cada pregunta.
--   6. get_active_event_questions(p_event_type)
--                            RPC pública: campaña activa AHORA + preguntas.
--   7. fn_ef_submit_response(...)
--                            RPC atómica y validada para guardar la encuesta.
--   8. hf_v_event_feedback      Vista plana para analítica (solo service_role).
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
COMMENT ON COLUMN public.hf_event_questions.question_type IS 'RATING (1..5) · SELECT · BOOLEAN · TEXT.';
COMMENT ON COLUMN public.hf_event_questions.options       IS 'Para SELECT: ["Fácil","Medio","Difícil"]. Para RATING: etiquetas opcionales de las 5 estrellas.';

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
-- 7. RPC · get_active_event_questions
-- ----------------------------------------------------------------------------
-- Devuelve SIEMPRE un objeto JSON (nunca NULL):
--   {
--     "active": true,
--     "campaign": { campaign_id, name, description, start_date, end_date },
--     "event":    { campaign_event_id, event_type, collect_user_info, allow_comments },
--     "questions": [ { question_id, question_text, question_type,
--                      options, display_order, is_required }, … ]
--   }
-- Sin campaña/evento activo devuelve { "active": false, … }.
--
-- Si hay varias campañas solapadas para el mismo evento se elige la de
-- start_date más reciente (y created_at como desempate): una sola encuesta
-- por disparador, determinista.
CREATE OR REPLACE FUNCTION public.get_active_event_questions(p_event_type VARCHAR)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
WITH chosen AS (
    SELECT
        c.campaign_id,
        c.name,
        c.description,
        c.start_date,
        c.end_date,
        ce.campaign_event_id,
        ce.event_type,
        ce.collect_user_info,
        ce.allow_comments
    FROM public.hf_campaigns c
    JOIN public.hf_campaign_events ce ON ce.campaign_id = c.campaign_id
    WHERE c.is_active
      AND ce.is_active
      AND NOW() BETWEEN c.start_date AND c.end_date
      AND ce.event_type = upper(btrim(coalesce(p_event_type, '')))
    ORDER BY c.start_date DESC, c.created_at DESC, c.campaign_id
    LIMIT 1
)
SELECT COALESCE(
    (
        SELECT jsonb_build_object(
            'active', TRUE,
            'campaign', jsonb_build_object(
                'campaign_id', c.campaign_id,
                'name', c.name,
                'description', c.description,
                'start_date', c.start_date,
                'end_date', c.end_date
            ),
            'event', jsonb_build_object(
                'campaign_event_id', c.campaign_event_id,
                'event_type', c.event_type,
                'collect_user_info', c.collect_user_info,
                'allow_comments', c.allow_comments
            ),
            'questions', COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'question_id', q.question_id,
                            'question_text', q.question_text,
                            'question_type', q.question_type,
                            'options', q.options,
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
        FROM chosen c
    ),
    jsonb_build_object(
        'active', FALSE,
        'campaign', NULL,
        'event', NULL,
        'questions', '[]'::jsonb
    )
);
$$;

COMMENT ON FUNCTION public.get_active_event_questions(VARCHAR)
    IS 'Campaña activa AHORA para un disparador y su set de preguntas ordenado por display_order.';

REVOKE ALL ON FUNCTION public.get_active_event_questions(VARCHAR) FROM PUBLIC;
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
    WHERE ce.campaign_event_id = p_campaign_event_id
      AND ce.is_active
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
ALTER TABLE public.hf_campaign_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hf_event_questions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hf_player_responses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hf_response_details  ENABLE ROW LEVEL SECURITY;

-- Las RPC SECURITY DEFINER son la única puerta pública. Si en el futuro se
-- quiere un panel de administración con Supabase Auth, se añaden políticas
-- para el rol `authenticated` y se conceden los GRANT correspondientes.
REVOKE ALL ON TABLE public.hf_campaigns        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.hf_campaign_events  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.hf_event_questions  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.hf_player_responses FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.hf_response_details FROM PUBLIC, anon, authenticated;

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
