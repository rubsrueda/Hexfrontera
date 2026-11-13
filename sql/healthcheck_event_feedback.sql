-- ============================================================================
-- CHEQUEO DE SALUD · encuestas dinámicas (solo lectura)
-- ----------------------------------------------------------------------------
-- Ejecuta los bloques en Supabase → SQL Editor y revisa:
--   1. ¿Existe la tabla de traducciones y tiene 156 filas?
--   2. ¿Qué firmas de función hay? Debe existir la de 2 argumentos.
--   3. ¿El RPC devuelve la campaña, las preguntas y las etiquetas?
--   4. ¿Hay campaña MATCH_OVER elegible y con preguntas?
--   5. ¿El helper de traducción resuelve una clave?
-- ============================================================================

-- 1. Tabla de traducciones y filas por idioma.
SELECT to_regclass('public.hf_survey_translations') AS tabla_traducciones;

SELECT locale, COUNT(*) AS claves
FROM public.hf_survey_translations
GROUP BY locale
ORDER BY locale;

-- 2. Firmas reales de las funciones. Si get_active_event_questions solo tiene
--    p_event_type, el SQL nuevo no está aplicado (o PostgREST no lo ve).
SELECT
    p.proname,
    pg_get_function_identity_arguments(p.oid) AS argumentos,
    p.prosecdef AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
      'get_active_event_questions',
      'hf_survey_label',
      'hf_survey_option_labels',
      'fn_ef_submit_response'
  )
ORDER BY p.proname, argumentos;

-- 3. Permiso de anon sobre la RPC nueva.
SELECT has_function_privilege(
    'anon',
    'public.get_active_event_questions(varchar,varchar)',
    'EXECUTE'
) AS anon_puede_ejecutar;

-- 4. Lo que recibe el cliente para español, inglés y alemán.
SELECT public.get_active_event_questions('MATCH_OVER', 'es') AS rpc_es;
SELECT public.get_active_event_questions('MATCH_OVER', 'en') AS rpc_en;
SELECT public.get_active_event_questions('MATCH_OVER', 'de') AS rpc_de;

-- 5. Resolución de una clave (si devuelve la clave, falta el seed o la fila).
SELECT public.hf_survey_label('survey.match_over.q1_lost', 'es') AS etiqueta_es;
SELECT public.hf_survey_label('survey.match_over.q1_lost', 'ja') AS etiqueta_ja;

-- 6. Campañas MATCH_OVER una por fila: la que gana debe ser la de
--    start_date/created_at más reciente y tener preguntas > 0.
WITH candidatas AS (
    SELECT
        c.campaign_id,
        c.name,
        c.start_date,
        c.end_date,
        c.is_active,
        c.created_at,
        ce.campaign_event_id,
        ce.is_active AS evento_activo,
        (c.is_active AND ce.is_active
         AND NOW() BETWEEN c.start_date AND c.end_date) AS elegible,
        COUNT(eq.question_id) AS preguntas,
        ROW_NUMBER() OVER (
            ORDER BY
                (c.is_active AND ce.is_active
                 AND NOW() BETWEEN c.start_date AND c.end_date) DESC,
                c.start_date DESC, c.created_at DESC, c.campaign_id
        ) AS orden
    FROM public.hf_campaigns c
    JOIN public.hf_campaign_events ce ON ce.campaign_id = c.campaign_id
    LEFT JOIN public.hf_event_questions eq ON eq.campaign_event_id = ce.campaign_event_id
    WHERE ce.event_type = 'MATCH_OVER'
    GROUP BY c.campaign_id, c.name, c.start_date, c.end_date, c.is_active,
             c.created_at, ce.campaign_event_id, ce.is_active
)
SELECT
    orden,
    elegible,
    (elegible AND orden = 1) AS el_rpc_deberia_elegir_esta,
    campaign_id,
    name,
    start_date,
    end_date,
    preguntas,
    campaign_event_id
FROM candidatas
ORDER BY orden;

-- 7. Preguntas crudas del evento MATCH_OVER. Si label_de sale en español,
--    question_text es texto literal y no una clave traducible.
SELECT
    ce.campaign_event_id,
    q.display_order,
    q.question_text,
    public.hf_survey_label(q.question_text, 'de') AS label_de,
    q.options,
    public.hf_survey_option_labels(q.options, 'de') AS option_labels_de
FROM public.hf_event_questions q
JOIN public.hf_campaign_events ce ON ce.campaign_event_id = q.campaign_event_id
WHERE ce.event_type = 'MATCH_OVER'
ORDER BY ce.campaign_event_id, q.display_order;

-- 8. Respuestas recientes del evento (para descartar que el jugador nuevo ya
--    haya respondido o que esté reutilizando un campaign_event_id anterior).
SELECT
    pr.response_id,
    pr.created_at,
    c.name AS campana,
    ce.campaign_event_id,
    pr.player_email,
    pr.player_alias
FROM public.hf_player_responses pr
JOIN public.hf_campaign_events ce ON ce.campaign_event_id = pr.campaign_event_id
JOIN public.hf_campaigns c ON c.campaign_id = ce.campaign_id
ORDER BY pr.created_at DESC
LIMIT 20;
