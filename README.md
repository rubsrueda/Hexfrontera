# Federati
Juego de Hexágonos 4X

## Módulos

- **IA estratégica** — [`js/ai.js`](js/ai.js) analiza amenazas, decide
  retiradas y guarniciones, construye calzadas/provincias/bastiones, gestiona
  árboles y banca, coordina operaciones anfibias (oleada, playa, tormentas y
  evacuación) y planifica incursiones de sacrificio para cortar las líneas de
  suministro enemigas. [`js/diplomacy_ai.js`](js/diplomacy_ai.js) firma
  PNA/treguas, comercio y préstamos según la amenaza y el objetivo de conquista.
  Regresión en [`tester_qa/ai_strategy_test.js`](tester_qa/ai_strategy_test.js).
- **Pago Premium con PayPal (web)** — pago único de 4.99 USD con el botón
  oficial. La Edge Function `paypal` crea/captura la orden, registra el cobro en
  `hf_payments` y activa `hf_players.is_premium`. Ver
  [`supabase/README.md`](supabase/README.md), el esquema
  [`sql/paypal_payments.sql`](sql/paypal_payments.sql) y el cliente
  [`js/payment.js`](js/payment.js).
- **Cuentas, llave y recuperación** — el jugador se identifica con `player_id`
  + `secret_key`, puede editar la llave, recuperar sus credenciales por correo y
  vincular otro dispositivo. Ver
  [`sql/account_identity.sql`](sql/account_identity.sql),
  [`sql/account_extra.sql`](sql/account_extra.sql) y
  [`js/cloud.js`](js/cloud.js).
- **Encuestas y eventos dinámicos** — la base de datos decide si hay encuesta,
  qué se pregunta y cómo se pinta. Ver
  [`sql/EVENT_FEEDBACK.md`](sql/EVENT_FEEDBACK.md), el esquema
  [`sql/event_feedback.sql`](sql/event_feedback.sql) y el modal
  [`js/event-feedback.js`](js/event-feedback.js).
  El contenido se guarda como claves (`survey.match_over.q1_lost`) y las
  traducciones viven en `hf_survey_translations`; la RPC devuelve las etiquetas
  ya resueltas. No hay archivos de traducción en runtime: el seed es
  [`sql/survey_translations_seed.sql`](sql/survey_translations_seed.sql).
  El catálogo de disparadores está en `hf_event_types` y se consulta con
  [`sql/list_event_feedback.sql`](sql/list_event_feedback.sql).
