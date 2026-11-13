-- ============================================================================
-- EVENTOS DE ENCUESTA CONFIGURADOS · solo lectura
-- ----------------------------------------------------------------------------
-- `event_type` no es un ENUM: es una fila de hf_campaign_events. Cualquier
-- tipo que cumpla ^[A-Z][A-Z0-9_]{2,49}$ se puede insertar.
--
-- Disparadores cableados hoy en el cliente:
--   GAME_ENTRY          main.js      (una vez por sesión, 2,6 s, Hub)
--   MATCH_OVER          game.js      (al cerrar el resumen; Menú)
--   TRIBE_MODIFIED      screens.js   (al salir de Tribu con cambios)
--   MAP_EDIT_COMPLETE   editor.js    (tras guardar un mapa)
--   REPLAY_FINISHED     replay.js    (al cerrar el resumen de replay)
--
-- Un tipo nuevo en la BD NO se dispara solo: hay que añadir la llamada
-- checkAndRender('NUEVO_EVENTO') en el punto del juego.
-- ============================================================================

-- 1. Catálogo completo + uso. Incluye tipos sin ninguna campaña.
SELECT
    event_type,
    label,
    description,
    trigger_hint,
    is_active,
    sort_order,
    eventos_configurados,
    eventos_vigentes,
    preguntas,
    respuestas,
    ultima_respuesta
FROM public.hf_v_event_type_usage
ORDER BY sort_order, event_type;

-- 1b. Tipos del catálogo que todavía no tienen ninguna campaña:
--     candidatos a configurar (o a retirar del catálogo si no se usan).
SELECT event_type, label, description, trigger_hint
FROM public.hf_event_types et
WHERE NOT EXISTS (
    SELECT 1 FROM public.hf_campaign_events ce WHERE ce.event_type = et.event_type
)
ORDER BY sort_order, event_type;

-- 2. Detalle por campaña/evento.
SELECT
    c.campaign_id,
    c.name AS campana,
    c.start_date,
    c.end_date,
    c.is_active AS campana_activa,
    ce.campaign_event_id,
    ce.event_type,
    et.label AS tipo_label,
    et.is_active AS tipo_activo,
    ce.is_active AS evento_activo,
    ce.collect_user_info,
    ce.allow_comments,
    (c.is_active
     AND ce.is_active
     AND et.is_active
     AND NOW() BETWEEN c.start_date AND c.end_date) AS vigente,
    COUNT(eq.question_id) AS preguntas
FROM public.hf_campaigns c
JOIN public.hf_campaign_events ce ON ce.campaign_id = c.campaign_id
JOIN public.hf_event_types et ON et.event_type = ce.event_type
LEFT JOIN public.hf_event_questions eq ON eq.campaign_event_id = ce.campaign_event_id
GROUP BY c.campaign_id, c.name, c.start_date, c.end_date, c.is_active,
         ce.campaign_event_id, ce.event_type, et.label, et.is_active,
         ce.is_active, ce.collect_user_info, ce.allow_comments
ORDER BY c.name, ce.event_type;
