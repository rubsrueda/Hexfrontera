# Supabase: cuentas y pago web

Documentación de la integración presente en `js/cloud.js`, `js/payment.js` y `supabase/functions/paypal/`. El código configura el cliente y la función `paypal`; este documento no confirma que el esquema esté aplicado, que la función esté desplegada o que las compras funcionen en producción.

## Archivos

- `config.toml`: configuración local de Supabase; `verify_jwt = false` para la función `paypal`.
- `functions/paypal/index.ts`: creación/captura de órdenes, verificación de captura y alta de licencia mediante RPC.
- `.env.example`: nombres de variables para desarrollo; no contiene credenciales válidas.
- `../js/config.js`: estado, moneda, precio y Client ID público del SDK.
- `../js/cloud.js`: URL base de funciones y operaciones de cuenta.
- `../sql/paypal_payments.sql`, `../sql/account_identity.sql` y `../sql/account_extra.sql`: SQL de pagos e identidad.

## Preparación

1. En Supabase SQL Editor, aplica `../sql/account_identity.sql`, `../sql/account_extra.sql` y `../sql/paypal_payments.sql`. Confirma errores y permisos en el proyecto destino antes de usarlo.
2. Configura los secretos de Edge Functions en el panel o con Supabase CLI. La función usa `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET_KEY` y, opcionalmente, `PAYPAL_API_BASE`; el envío de correo puede requerir `RESEND_API_KEY` o los valores `SMTP_*` descritos en `.env.example`.
3. Configura `ALLOWED_ORIGINS` con los dominios permitidos. El código acepta cualquier origen si la variable no está definida; no dejes ese valor predeterminado abierto en producción.
4. Despliega `paypal` y verifica la respuesta de salud en el proyecto destino. El modo predeterminado del código PayPal es sandbox. Para live, alinea las credenciales privadas de Supabase, el endpoint API y el Client ID público del cliente; nunca pongas secretos privados en `js/config.js` ni en documentación.
5. Comprueba el flujo con cuentas sandbox antes de considerar producción. El precio configurado es **4.99 USD**; el importe del cliente debe coincidir con la constante del servidor y la validación SQL.

## Multijugador

El cliente ya usa el proyecto Supabase configurado en `js/cloud.js`; no se requiere una clave `service_role` ni un servidor de juego adicional. Para habilitar las salas en internet, abre el SQL Editor del mismo proyecto Supabase y ejecuta `../sql/hf_multiplayer.sql`. El script crea o actualiza `hf_online_matches`, las funciones RPC de salas, las partidas públicas y el relleno con bots, además de otorgar ejecución a `anon` y `authenticated`.

El script es aditivo y no elimina partidas existentes. Después de ejecutarlo, abre Federati y usa **Multijugador → Probar conexión**. Si Supabase indica que no encuentra una función recién creada, espera la recarga del esquema o ejecuta `NOTIFY pgrst, 'reload schema';` en SQL Editor y vuelve a probar. Si falla la comunicación, revisa el mensaje de diagnóstico en pantalla y la consola del navegador; “No hay salas” solo se muestra después de consultar la base con éxito.

Para la búsqueda rápida y la lista pública actualizadas, ejecuta después `../sql/hf_matchmaking_v2.sql` en el mismo proyecto. Esta migración no borra salas ni modifica partidas activas o privadas. La lista muestra salas públicas en espera cuyo anfitrión haya enviado una señal de presencia en los últimos 45 segundos; la búsqueda rápida marca como terminadas las salas públicas en espera abandonadas durante más de diez minutos. La señal se pausa cuando la página está oculta, de modo que una sala puede dejar de aparecer mientras su anfitrión tiene la pestaña en segundo plano.

La búsqueda rápida entra automáticamente cuando encuentra un rival; si no lo encuentra, crea una sala pública en espera. El anfitrión debe mantener el juego abierto para iniciar y dirigir la partida: esta migración no convierte el juego en un servidor autoritativo ni garantiza que los turnos progresen cuando todos cierran el navegador.

Ejecuta también `../sql/hf_turns_v3.sql` para el cliente actualizado. En turnos individuales, al vencer el reloj del jugador activo, el siguiente sondeo cede su turno sin convertirlo en bot. El relevo de anfitrión tampoco transforma automáticamente a un humano en IA. Si todos cierran el juego no hay sondeo y el turno no avanza hasta que alguien vuelva. La migración no modifica salas existentes al instalarse y no restaura automáticamente jugadores que ya se hubieran convertido en bots con versiones anteriores.

El servidor actualmente instalado usa `../sql/hf_turns_v4.sql`. En esa versión la partida empieza con turnos simultáneos y pasa a turnos individuales al primer contacto; cada turno empieza con 210 segundos. El movimiento, ataque, construcción y reclutamiento enviados al servidor añaden 15 segundos; el anfitrión solicita esa ampliación después de una acción local aceptada. Las demás acciones todavía no están integradas con este reloj, y una acción del invitado admitida por el servidor puede ser rechazada después por el anfitrión: la ampliación no garantiza aún que toda acción haya quedado aplicada. La IA solo dirige asientos identificados como bots; la señal de un jugador humano restablece su marca de control si una versión anterior la cambió. El nuevo cliente en preparación exige v5 y no funciona con este servidor v4.

La migración `../sql/hf_room_limits.sql`, posterior a las anteriores, limita a tres las salas abiertas de una identidad y reutiliza su sala propia en espera sin rival. La prueba `../tester_qa/online_room_limits_test.sql` revierte sus datos de prueba. El usuario informó que ambos archivos se ejecutaron sin errores en Supabase. Los filtros y el cierre de sala también requieren los cambios correspondientes del cliente.

La actividad 04 sigue en desarrollo y todavía no está desplegada en Supabase. Los módulos `../sql/hf_turn_rules_v5.sql`, `../sql/hf_action_commit_v5.sql`, `../sql/hf_turn_progress_v5.sql`, `../sql/hf_turn_storage_v5.sql` y `../sql/hf_turn_integration_v5.sql` se han probado localmente en PostgreSQL embebido. `../sql/hf_turn_activation_v5.sql` activa la creación de salas v5 solo cuando no quedan partidas antiguas y existe la tarea programada. El cliente modificado exige v5: no es compatible con el servidor v4. El usuario ya instaló `pg_cron`, pero `../sql/hf_turn_scheduler_v5.sql` aún no se ha ejecutado ni comprobado en Supabase. La activación y la programación deben validarse allí y en pantalla con dos jugadores antes de dar la actividad por terminada.

El usuario autorizó eliminar las partidas multijugador existentes. `../sql/hf_clear_multiplayer_matches.sql` las borra definitivamente de `hf_online_matches` y devuelve el número de registros eliminados; no contiene instrucciones de borrado de mapas comunitarios. Si se crean partidas nuevas después de la limpieza, la activación exigirá volver a limpiar la tabla. En el cliente v5, deshacer está deshabilitado para evitar que un jugador revierta acciones ajenas.

Los valores de proyecto, URLs completas, Client IDs, claves, secretos y tokens se omiten intencionalmente de esta guía. Usa los valores guardados en la configuración autorizada del proyecto; no los copies a commits ni a logs.

## Estado de verificación

No se inspeccionó el estado remoto de Supabase/PayPal ni se ejecutaron despliegues o compras. La presencia de SQL y Edge Function solo acredita que hay código/configuración local. Para operaciones locales, copia `.env.example` a `.env` y guarda ese archivo fuera del control de versiones; no lo compartas.
