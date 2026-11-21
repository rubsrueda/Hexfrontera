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

Los valores de proyecto, URLs completas, Client IDs, claves, secretos y tokens se omiten intencionalmente de esta guía. Usa los valores guardados en la configuración autorizada del proyecto; no los copies a commits ni a logs.

## Estado de verificación

No se inspeccionó el estado remoto de Supabase/PayPal ni se ejecutaron despliegues o compras. La presencia de SQL y Edge Function solo acredita que hay código/configuración local. Para operaciones locales, copia `.env.example` a `.env` y guarda ese archivo fuera del control de versiones; no lo compartas.
