-- ============================================================================
-- MIGRACIÓN · prefijo hf_ para el módulo de encuestas
-- ----------------------------------------------------------------------------
-- Úsalo SOLO si ya habías ejecutado la versión anterior del DDL, que creaba:
--   campaigns, campaign_events, event_questions, player_responses,
--   response_details
-- y quieres conservar las filas. Renombra las tablas a:
--   hf_campaigns, hf_campaign_events, hf_event_questions,
--   hf_player_responses, hf_response_details
--
-- Después de ejecutar esto, vuelve a ejecutar `event_feedback.sql` para que las
-- RPC y la vista apunten a los nombres nuevos. Si las tablas antiguas están
-- vacías, también puedes borrarlas y ejecutar solo `event_feedback.sql`.
--
-- No borra datos. Si ya existe una tabla con el nombre nuevo, no la toca.
-- Ejecútalo solo si esas tablas son de este módulo; si tu proyecto ya tenía
-- otras tablas `campaigns` ajenas, no las renombres.
-- ============================================================================
BEGIN;

DO $$
DECLARE
    r RECORD;
    v_old_exists BOOLEAN;
    v_new_exists BOOLEAN;
BEGIN
    FOR r IN
        SELECT *
        FROM (VALUES
            ('campaigns',        'hf_campaigns'),
            ('campaign_events',  'hf_campaign_events'),
            ('event_questions',  'hf_event_questions'),
            ('player_responses', 'hf_player_responses'),
            ('response_details', 'hf_response_details')
        ) AS t(old_name, new_name)
    LOOP
        v_old_exists := to_regclass('public.' || r.old_name) IS NOT NULL;
        v_new_exists := to_regclass('public.' || r.new_name) IS NOT NULL;

        IF v_old_exists AND NOT v_new_exists THEN
            EXECUTE format('ALTER TABLE public.%I RENAME TO %I', r.old_name, r.new_name);
            RAISE NOTICE 'Renombrada public.% → public.%', r.old_name, r.new_name;
        ELSIF v_old_exists AND v_new_exists THEN
            RAISE NOTICE 'Se omite public.%: ya existe public.% (revisa cuál conservar)', r.old_name, r.new_name;
        END IF;
    END LOOP;
END $$;

-- Índices de la versión sin prefijo: se sustituyen por idx_hf_* en
-- event_feedback.sql. Si no existían, IF EXISTS los ignora.
DROP INDEX IF EXISTS public.idx_campaigns_dates;
DROP INDEX IF EXISTS public.idx_campaigns_active_window;
DROP INDEX IF EXISTS public.idx_campaign_events_type;
DROP INDEX IF EXISTS public.idx_campaign_events_campaign;
DROP INDEX IF EXISTS public.idx_event_questions_order;
DROP INDEX IF EXISTS public.idx_player_responses_event_date;
DROP INDEX IF EXISTS public.idx_player_responses_date;
DROP INDEX IF EXISTS public.idx_response_details_question;

-- La vista antigua queda reemplazada por hf_v_event_feedback en event_feedback.sql.
DROP VIEW IF EXISTS public.v_event_feedback;

COMMIT;
