-- ============================================================================
-- DIAGNÓSTICO DE SOLO LECTURA · encuestas dinámicas
-- ----------------------------------------------------------------------------
-- Ejecuta cada bloque en Supabase → SQL Editor y compara los resultados.
-- No modifica nada.
-- ============================================================================

-- 1. Lo que recibe exactamente el cliente para MATCH_OVER.
--    Si active = false o questions = [], el problema es de configuración.
--    Si campaign_event_id es el de una campaña vieja, el RPC está eligiendo
--    otra campaña (revisa el bloque 2).
SELECT public.get_active_event_questions('MATCH_OVER') AS respuesta_rpc;


-- 2. Todas las campañas con evento MATCH_OVER, una fila por campaña/evento.
--    `elegible` = cumple las mismas condiciones que el RPC.
SELECT
    c.campaign_id,
    c.name,
    c.start_date,
    c.end_date,
    c.is_active,
    ce.campaign_event_id,
    ce.is_active AS evento_activo,
    (c.start_date <= NOW() AND c.end_date >= NOW()) AS en_fecha,
    (c.is_active AND ce.is_active AND c.start_date <= NOW() AND c.end_date >= NOW()) AS elegible,
    COUNT(eq.question_id) AS preguntas,
    ce.collect_user_info,
    ce.allow_comments
FROM public.hf_campaigns c
JOIN public.hf_campaign_events ce ON ce.campaign_id = c.campaign_id
LEFT JOIN public.hf_event_questions eq ON eq.campaign_event_id = ce.campaign_event_id
WHERE ce.event_type = 'MATCH_OVER'
GROUP BY c.campaign_id, c.name, c.start_date, c.end_date, c.is_active,
         c.created_at, ce.campaign_event_id, ce.is_active,
         ce.collect_user_info, ce.allow_comments
ORDER BY c.start_date DESC, c.created_at DESC;


-- 2b. La que gana entre las elegibles. `el_rpc_elige_esta = true` debe coincidir
--     con el campaign_event_id del bloque 1.
WITH candidatas AS (
    SELECT
        c.campaign_id,
        c.name,
        c.start_date,
        c.created_at,
        ce.campaign_event_id,
        COUNT(eq.question_id) AS preguntas,
        ROW_NUMBER() OVER (
            ORDER BY c.start_date DESC, c.created_at DESC, c.campaign_id
        ) AS orden
    FROM public.hf_campaigns c
    JOIN public.hf_campaign_events ce ON ce.campaign_id = c.campaign_id
    LEFT JOIN public.hf_event_questions eq ON eq.campaign_event_id = ce.campaign_event_id
    WHERE ce.event_type = 'MATCH_OVER'
      AND c.is_active
      AND ce.is_active
      AND NOW() BETWEEN c.start_date AND c.end_date
    GROUP BY c.campaign_id, c.name, c.start_date, c.created_at, ce.campaign_event_id
)
SELECT
    orden,
    (orden = 1) AS el_rpc_elige_esta,
    campaign_id,
    name,
    start_date,
    preguntas,
    campaign_event_id
FROM candidatas
ORDER BY orden;


-- 3. Respuestas recientes (para ver si el jugador ya respondió el evento nuevo).
SELECT
    pr.response_id,
    pr.created_at,
    c.name AS campana,
    ce.campaign_event_id,
    pr.player_email,
    pr.player_alias,
    pr.general_comment
FROM public.hf_player_responses pr
JOIN public.hf_campaign_events ce ON ce.campaign_event_id = pr.campaign_event_id
JOIN public.hf_campaigns c ON c.campaign_id = ce.campaign_id
ORDER BY pr.created_at DESC
LIMIT 20;


-- 4. Preguntas de la campaña que el RPC elige, en orden.
--    Si `preguntas` del bloque 2 es 0, aquí no habrá filas.
WITH elegida AS (
    SELECT ce.campaign_event_id
    FROM public.hf_campaigns c
    JOIN public.hf_campaign_events ce ON ce.campaign_id = c.campaign_id
    WHERE c.is_active
      AND ce.is_active
      AND ce.event_type = 'MATCH_OVER'
      AND NOW() BETWEEN c.start_date AND c.end_date
    ORDER BY c.start_date DESC, c.created_at DESC, c.campaign_id
    LIMIT 1
)
SELECT q.display_order, q.question_type, q.question_text, q.is_required, q.options
FROM public.hf_event_questions q
JOIN elegida e ON e.campaign_event_id = q.campaign_event_id
ORDER BY q.display_order, q.question_id;
