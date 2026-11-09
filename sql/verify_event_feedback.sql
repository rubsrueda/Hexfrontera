-- ============================================================================
-- VERIFICACIÓN DEL MÓDULO DE ENCUESTAS · se ejecuta y se deshace
-- ----------------------------------------------------------------------------
-- Uso: Supabase → SQL Editor → pegar todo → Run.
-- Crea datos de prueba dentro de una transacción, comprueba el RPC público,
-- los caminos de error y los flags collect_user_info / allow_comments, y
-- termina con ROLLBACK: no deja ninguna fila.
-- ============================================================================
BEGIN;

DO $$
DECLARE
    v_campaign   UUID;
    v_event      UUID;
    v_event2     UUID;
    v_q_rating   UUID;
    v_q_select   UUID;
    v_q_bool     UUID;
    v_q_text     UUID;
    v_q_other    UUID;
    v_json       JSONB;
    v_resp       JSONB;
    v_count      INT;
    v_email      TEXT;
    v_alias      TEXT;
    v_comment    TEXT;
BEGIN
    -- ------------------------------------------------------------------
    -- Datos de prueba
    -- ------------------------------------------------------------------
    INSERT INTO public.hf_campaigns (name, description, start_date, end_date)
    VALUES ('QA · Encuesta de fin de partida', 'Campaña temporal de verificación',
            NOW() - INTERVAL '1 hour', NOW() + INTERVAL '1 day')
    RETURNING campaign_id INTO v_campaign;

    INSERT INTO public.hf_campaign_events (campaign_id, event_type, collect_user_info, allow_comments)
    VALUES (v_campaign, 'MATCH_OVER', TRUE, TRUE)
    RETURNING campaign_event_id INTO v_event;

    INSERT INTO public.hf_campaign_events (campaign_id, event_type)
    VALUES (v_campaign, 'GAME_ENTRY')
    RETURNING campaign_event_id INTO v_event2;

    -- Se insertan en desorden a propósito: el RPC debe ordenar por display_order.
    INSERT INTO public.hf_event_questions (campaign_event_id, question_text, question_type, display_order, is_required)
    VALUES (v_event, '¿Cómo fue la partida?', 'RATING', 1, TRUE)
    RETURNING question_id INTO v_q_rating;

    INSERT INTO public.hf_event_questions (campaign_event_id, question_text, question_type, options, display_order, is_required)
    VALUES (v_event, '¿Qué dificultad elegiste?', 'SELECT', '["Fácil","Media","Difícil"]'::jsonb, 3, TRUE)
    RETURNING question_id INTO v_q_select;

    INSERT INTO public.hf_event_questions (campaign_event_id, question_text, question_type, display_order, is_required)
    VALUES (v_event, '¿Recomendarías el juego?', 'BOOLEAN', 2, FALSE)
    RETURNING question_id INTO v_q_bool;

    INSERT INTO public.hf_event_questions (campaign_event_id, question_text, question_type, display_order, is_required)
    VALUES (v_event, '¿Qué mejorarías?', 'TEXT', 4, FALSE)
    RETURNING question_id INTO v_q_text;

    INSERT INTO public.hf_event_questions (campaign_event_id, question_text, question_type, display_order)
    VALUES (v_event2, '¿Qué te trajo hoy?', 'TEXT', 1)
    RETURNING question_id INTO v_q_other;

    -- ------------------------------------------------------------------
    -- 1. RPC de lectura: activo, orden y flags
    -- ------------------------------------------------------------------
    v_json := public.get_active_event_questions('match_over');  -- minúsculas a propósito
    IF (v_json ->> 'active')::BOOLEAN IS NOT TRUE THEN
        RAISE EXCEPTION 'FALLO 1: la campaña debería estar activa: %', v_json;
    END IF;
    IF (v_json -> 'campaign' ->> 'campaign_id')::UUID <> v_campaign THEN
        RAISE EXCEPTION 'FALLO 1: campaign_id incorrecto: %', v_json;
    END IF;
    IF (v_json -> 'event' ->> 'campaign_event_id')::UUID <> v_event THEN
        RAISE EXCEPTION 'FALLO 1: campaign_event_id incorrecto: %', v_json;
    END IF;
    IF jsonb_array_length(v_json -> 'questions') <> 4 THEN
        RAISE EXCEPTION 'FALLO 1: se esperaban 4 preguntas: %', v_json;
    END IF;
    IF (v_json -> 'questions' -> 0 ->> 'display_order')::INT <> 1
       OR (v_json -> 'questions' -> 1 ->> 'display_order')::INT <> 2
       OR (v_json -> 'questions' -> 2 ->> 'display_order')::INT <> 3
       OR (v_json -> 'questions' -> 3 ->> 'display_order')::INT <> 4 THEN
        RAISE EXCEPTION 'FALLO 1: preguntas desordenadas: %', v_json;
    END IF;
    IF (v_json -> 'event' ->> 'collect_user_info')::BOOLEAN IS NOT TRUE
       OR (v_json -> 'event' ->> 'allow_comments')::BOOLEAN IS NOT TRUE THEN
        RAISE EXCEPTION 'FALLO 1: flags del evento incorrectos: %', v_json;
    END IF;

    -- Un tipo sin campaña devuelve active=false y no NULL.
    v_json := public.get_active_event_questions('REPLAY_FINISHED');
    IF v_json IS NULL OR (v_json ->> 'active')::BOOLEAN IS NOT FALSE THEN
        RAISE EXCEPTION 'FALLO 1: evento sin campaña debería devolver active=false: %', v_json;
    END IF;
    IF jsonb_array_length(v_json -> 'questions') <> 0 THEN
        RAISE EXCEPTION 'FALLO 1: evento sin campaña no debe traer preguntas: %', v_json;
    END IF;

    -- ------------------------------------------------------------------
    -- 2. Envío válido: cabecera + detalles
    -- ------------------------------------------------------------------
    v_resp := public.fn_ef_submit_response(
        v_event,
        jsonb_build_array(
            jsonb_build_object('question_id', v_q_rating, 'value', '5'),
            jsonb_build_object('question_id', v_q_select, 'value', 'Media'),
            jsonb_build_object('question_id', v_q_bool,   'value', 'true'),
            jsonb_build_object('question_id', v_q_text,   'value', 'Más tutoriales')
        ),
        'qa@example.com',
        'QA Bot',
        'Comentario final de la verificación'
    );

    IF (v_resp ->> 'ok')::BOOLEAN IS NOT TRUE THEN
        RAISE EXCEPTION 'FALLO 2: envío válido rechazado: %', v_resp;
    END IF;
    IF (v_resp ->> 'answers')::INT <> 4 THEN
        RAISE EXCEPTION 'FALLO 2: se esperaban 4 respuestas: %', v_resp;
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM public.hf_player_responses
    WHERE campaign_event_id = v_event;
    IF v_count <> 1 THEN
        RAISE EXCEPTION 'FALLO 2: cabecera no insertada (count=%)', v_count;
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM public.hf_response_details rd
    JOIN public.hf_player_responses pr ON pr.response_id = rd.response_id
    WHERE pr.response_id = (v_resp ->> 'response_id')::UUID;
    IF v_count <> 4 THEN
        RAISE EXCEPTION 'FALLO 2: detalles no insertados (count=%)', v_count;
    END IF;

    SELECT pr.player_email, pr.general_comment
    INTO v_email, v_comment
    FROM public.hf_player_responses pr
    WHERE pr.response_id = (v_resp ->> 'response_id')::UUID;
    IF v_email <> 'qa@example.com' OR v_comment <> 'Comentario final de la verificación' THEN
        RAISE EXCEPTION 'FALLO 2: datos de cabecera incorrectos (% / %)', v_email, v_comment;
    END IF;

    -- ------------------------------------------------------------------
    -- 3. Errores de validación
    -- ------------------------------------------------------------------
    -- 3.1 Falta una obligatoria.
    v_resp := public.fn_ef_submit_response(
        v_event,
        jsonb_build_array(jsonb_build_object('question_id', v_q_rating, 'value', '4')),
        NULL, NULL, NULL
    );
    IF v_resp ->> 'error' <> 'REQUIRED_MISSING' THEN
        RAISE EXCEPTION 'FALLO 3.1: se esperaba REQUIRED_MISSING: %', v_resp;
    END IF;

    -- 3.2 Rating fuera de 1..5.
    v_resp := public.fn_ef_submit_response(
        v_event,
        jsonb_build_array(
            jsonb_build_object('question_id', v_q_rating, 'value', '9'),
            jsonb_build_object('question_id', v_q_select, 'value', 'Media')
        ),
        NULL, NULL, NULL
    );
    IF v_resp ->> 'error' <> 'INVALID_RATING' THEN
        RAISE EXCEPTION 'FALLO 3.2: se esperaba INVALID_RATING: %', v_resp;
    END IF;

    -- 3.3 Opción que no existe.
    v_resp := public.fn_ef_submit_response(
        v_event,
        jsonb_build_array(
            jsonb_build_object('question_id', v_q_rating, 'value', '3'),
            jsonb_build_object('question_id', v_q_select, 'value', 'Imposible')
        ),
        NULL, NULL, NULL
    );
    IF v_resp ->> 'error' <> 'INVALID_OPTION' THEN
        RAISE EXCEPTION 'FALLO 3.3: se esperaba INVALID_OPTION: %', v_resp;
    END IF;

    -- 3.4 Pregunta de otro evento.
    v_resp := public.fn_ef_submit_response(
        v_event,
        jsonb_build_array(jsonb_build_object('question_id', v_q_other, 'value', 'x')),
        NULL, NULL, NULL
    );
    IF v_resp ->> 'error' <> 'UNKNOWN_QUESTION' THEN
        RAISE EXCEPTION 'FALLO 3.4: se esperaba UNKNOWN_QUESTION: %', v_resp;
    END IF;

    -- 3.5 Pregunta duplicada.
    v_resp := public.fn_ef_submit_response(
        v_event,
        jsonb_build_array(
            jsonb_build_object('question_id', v_q_rating, 'value', '3'),
            jsonb_build_object('question_id', v_q_rating, 'value', '4')
        ),
        NULL, NULL, NULL
    );
    IF v_resp ->> 'error' <> 'DUPLICATE_QUESTION' THEN
        RAISE EXCEPTION 'FALLO 3.5: se esperaba DUPLICATE_QUESTION: %', v_resp;
    END IF;

    -- 3.6 Correo inválido.
    v_resp := public.fn_ef_submit_response(
        v_event,
        jsonb_build_array(
            jsonb_build_object('question_id', v_q_rating, 'value', '4'),
            jsonb_build_object('question_id', v_q_select, 'value', 'Fácil')
        ),
        'no-es-un-correo', NULL, NULL
    );
    IF v_resp ->> 'error' <> 'INVALID_EMAIL' THEN
        RAISE EXCEPTION 'FALLO 3.6: se esperaba INVALID_EMAIL: %', v_resp;
    END IF;

    -- 3.7 Boolean no canónico.
    v_resp := public.fn_ef_submit_response(
        v_event,
        jsonb_build_array(
            jsonb_build_object('question_id', v_q_rating, 'value', '4'),
            jsonb_build_object('question_id', v_q_select, 'value', 'Fácil'),
            jsonb_build_object('question_id', v_q_bool, 'value', 'quizá')
        ),
        NULL, NULL, NULL
    );
    IF v_resp ->> 'error' <> 'INVALID_BOOLEAN' THEN
        RAISE EXCEPTION 'FALLO 3.7: se esperaba INVALID_BOOLEAN: %', v_resp;
    END IF;

    -- ------------------------------------------------------------------
    -- 4. Flags del evento
    -- ------------------------------------------------------------------
    UPDATE public.hf_campaign_events
    SET collect_user_info = FALSE, allow_comments = FALSE
    WHERE campaign_event_id = v_event;

    v_resp := public.fn_ef_submit_response(
        v_event,
        jsonb_build_array(
            jsonb_build_object('question_id', v_q_rating, 'value', '2'),
            jsonb_build_object('question_id', v_q_select, 'value', 'Difícil')
        ),
        'ignorado@example.com',
        'Ignorado',
        'Comentario que debe descartarse'
    );
    IF (v_resp ->> 'ok')::BOOLEAN IS NOT TRUE THEN
        RAISE EXCEPTION 'FALLO 4: envío sin datos personales rechazado: %', v_resp;
    END IF;
    SELECT pr.player_email, pr.player_alias, pr.general_comment
    INTO v_email, v_alias, v_comment
    FROM public.hf_player_responses pr
    WHERE pr.response_id = (v_resp ->> 'response_id')::UUID;
    IF v_email IS NOT NULL THEN
        RAISE EXCEPTION 'FALLO 4: collect_user_info=false debió descartar el correo: %', v_email;
    END IF;
    IF v_alias IS NOT NULL THEN
        RAISE EXCEPTION 'FALLO 4: collect_user_info=false debió descartar el alias: %', v_alias;
    END IF;
    IF v_comment IS NOT NULL THEN
        RAISE EXCEPTION 'FALLO 4: allow_comments=false debió descartar el comentario: %', v_comment;
    END IF;

    UPDATE public.hf_campaign_events
    SET collect_user_info = TRUE, allow_comments = TRUE
    WHERE campaign_event_id = v_event;

    -- ------------------------------------------------------------------
    -- 5. Evento inactivo por fecha
    -- ------------------------------------------------------------------
    UPDATE public.hf_campaigns
    SET start_date = NOW() - INTERVAL '2 days', end_date = NOW() - INTERVAL '1 day'
    WHERE campaign_id = v_campaign;

    v_json := public.get_active_event_questions('MATCH_OVER');
    IF (v_json ->> 'active')::BOOLEAN IS NOT FALSE THEN
        RAISE EXCEPTION 'FALLO 5: campaña caducada no debería estar activa: %', v_json;
    END IF;

    v_resp := public.fn_ef_submit_response(
        v_event,
        jsonb_build_array(jsonb_build_object('question_id', v_q_rating, 'value', '5')),
        NULL, NULL, NULL
    );
    IF v_resp ->> 'error' <> 'EVENT_NOT_ACTIVE' THEN
        RAISE EXCEPTION 'FALLO 5: se esperaba EVENT_NOT_ACTIVE: %', v_resp;
    END IF;

    RAISE NOTICE 'OK · módulo de encuestas verificado (lectura, orden, flags, envío atómico y 7 errores)';
END $$;

ROLLBACK;
