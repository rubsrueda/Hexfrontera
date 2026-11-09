# Federati
Juego de Hexágonos 4X

## Módulos

- **Pago Premium con PayPal (web)** — pago único de 4.99 USD con el botón
  oficial. La Edge Function `paypal` crea/captura la orden, registra el cobro en
  `hf_payments` y activa `hf_players.is_premium`. Ver
  [`supabase/README.md`](supabase/README.md), el esquema
  [`sql/paypal_payments.sql`](sql/paypal_payments.sql) y el cliente
  [`js/payment.js`](js/payment.js).
- **Encuestas y eventos dinámicos** — la base de datos decide si hay encuesta,
  qué se pregunta y cómo se pinta. Ver
  [`sql/EVENT_FEEDBACK.md`](sql/EVENT_FEEDBACK.md), el esquema
  [`sql/event_feedback.sql`](sql/event_feedback.sql) y el modal
  [`js/event-feedback.js`](js/event-feedback.js).
