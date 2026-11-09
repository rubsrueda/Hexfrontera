# PayPal · licencia Premium web (Federati)

Pago único de **4.99 USD** con el botón oficial de PayPal. La verdad de la
licencia sigue viviendo en Supabase: el navegador **nunca** activa
`is_premium` por su cuenta.

```
Navegador (web)
  └─ SDK JS de PayPal → botón oficial
       ├─ create-order ──► Edge Function `paypal` ──► POST /v2/checkout/orders
       └─ onApprove ─────► Edge Function `paypal` ──► POST /v2/checkout/orders/{id}/capture
                                                        │
                                                        ├─ valida COMPLETED / 4.99 USD / player_id
                                                        └─ RPC fn_hf_paypal_grant
                                                             ├─ INSERT hf_payments
                                                             └─ UPDATE hf_players.is_premium = TRUE
```

## Archivos

| Archivo | Para qué |
|---|---|
| `sql/paypal_payments.sql` | Tabla `hf_payments`, RLS y RPC atómica `fn_hf_paypal_grant`. |
| `supabase/functions/paypal/index.ts` | Edge Function: crea/captura órdenes y activa Premium. |
| `supabase/config.toml` | `verify_jwt = false` para que el navegador pueda llamar a la función. |
| `supabase/.env.example` | Variables para desarrollo local (sin secretos reales). |
| `js/config.js` → `payment.paypal` | Client ID público, importe y moneda que pinta el juego. |
| `js/payment.js` | Carga el SDK, monta el botón y refresca la UI al terminar. |

## 1. Aplicar el SQL (una vez)

En **Supabase → SQL Editor**, ejecuta el contenido de
`sql/paypal_payments.sql`. Es idempotente. Al final muestra tres comprobaciones:
tabla creada, función creada y `anon` sin acceso.

Si prefieres CLI:

```bash
cd PROYECTOS/hexfrontier
supabase link --project-ref wwafeitljxnlvmjtwsjz
supabase db push          # si llevas las migraciones en supabase/migrations
```

## 2. Configurar los secretos

Los secretos **no** van en `js/config.js` ni en ningún archivo del repositorio.
Se configuran en Supabase:

### Panel web

**Project Settings → Edge Functions → Secrets** (o **Edge Functions → Secrets**)
y crea:

| Nombre | Sandbox | Live |
|---|---|---|
| `PAYPAL_CLIENT_ID` | Client ID de la app sandbox | Client ID de la app live |
| `PAYPAL_SECRET_KEY` | Secret de la app sandbox | Secret de la app live |
| `PAYPAL_API_BASE` | `https://api-m.sandbox.paypal.com` | `https://api-m.paypal.com` |
| `ALLOWED_ORIGINS` (opcional) | `https://federati.org,https://www.federati.org` | igual |

> `SUPABASE_URL` y las claves de servidor (`SUPABASE_SECRET_KEYS` o la legacy
> `SUPABASE_SERVICE_ROLE_KEY`) las inyecta Supabase automáticamente. No las
> configures a mano ni las pongas en el cliente.
>
> Referencias: [Environment variables](https://supabase.com/docs/guides/functions/secrets)
> y [migración a claves publishable/secret](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys).

### CLI

```bash
cd PROYECTOS/hexfrontier

# Sandbox
supabase secrets set \
  PAYPAL_CLIENT_ID=TU_CLIENT_ID_SANDBOX \
  PAYPAL_SECRET_KEY=TU_SECRET_SANDBOX \
  PAYPAL_API_BASE=https://api-m.sandbox.paypal.com

# Live (cuando toque)
supabase secrets set \
  PAYPAL_CLIENT_ID=TU_CLIENT_ID_LIVE \
  PAYPAL_SECRET_KEY=TU_SECRET_LIVE \
  PAYPAL_API_BASE=https://api-m.paypal.com
```

Para desarrollo local:

```bash
cp supabase/.env.example supabase/.env
# rellena supabase/.env
supabase functions serve paypal --env-file supabase/.env --no-verify-jwt
```

También puedes copiar el ejemplo a `supabase/functions/.env` (la ruta que lee
el stack local por defecto) y servir sin `--env-file`.

## 3. Desplegar la Edge Function

### Desde el panel (sin CLI)

1. En **Supabase → Edge Functions**, pulsa **Deploy a new function**.
2. Elige la opción de editor/pegado y ponle nombre **`paypal`**.
3. Pega el contenido completo de
   `supabase/functions/paypal/index.ts`.
4. Despliega y, en los ajustes de la función, **desactiva Verify JWT**
   (`verify_jwt = false`). Si lo dejas activo, el navegador recibirá 401/403.
5. En **Edge Functions → Secrets**, añade `PAYPAL_CLIENT_ID`,
   `PAYPAL_SECRET_KEY` y `PAYPAL_API_BASE` (ver sección 2).

### Con CLI

```bash
cd PROYECTOS/hexfrontier
supabase functions deploy paypal
```

`supabase/config.toml` ya declara `verify_jwt = false`. Si usas una CLI antigua:

```bash
supabase functions deploy paypal --no-verify-jwt
```

La URL queda así:

```
https://wwafeitljxnlvmjtwsjz.supabase.co/functions/v1/paypal
```

`js/cloud.js` ya apunta a esa base (`FUNCTIONS_BASE`). Si cambias de proyecto
Supabase, actualiza `FUNCTIONS_BASE` en `js/cloud.js`.

Comprueba que responde:

```bash
curl -s -X POST "https://wwafeitljxnlvmjtwsjz.supabase.co/functions/v1/paypal" \
  -H "apikey: sb_publishable_9jlzQGRdEZhBtbofd-poZw_pIG74t42" \
  -H "Content-Type: application/json" \
  -d '{"action":"health"}'
# {"ok":true,"configured":true,"sandbox":true}
```

Si devuelve `404 {"code":"NOT_FOUND","message":"Requested function was not
found"}`, la función **no está desplegada** en ese proyecto.

## 4. Configurar el cliente

En `js/config.js`:

```js
payment: {
  checkout: '',        // tiendas externas de escritorio/móvil (no web)
  checkoutPromo: '',
  promo: false,
  paypal: {
    enabled: true,
    clientId: 'BAAz...',       // Client ID PÚBLICO (sandbox por defecto)
    currency: 'USD',
    amount: '4.99'
  }
}
```

- El **Client ID** es público: es normal que viaje al navegador. El **Secret**
  nunca.
- La URL de la función vive en `js/cloud.js` (`FUNCTIONS_BASE`). Si cambias de
  proyecto Supabase, actualiza esa constante.
- El importe que se muestra es `amount`; el que se cobra lo fija la Edge
  Function (`AMOUNT = "4.99"`). Para cambiar el precio hay que tocar **tres**
  sitios: `js/config.js`, `supabase/functions/paypal/index.ts` y la validación
  de `sql/paypal_payments.sql`.

## 5. Probar en sandbox

1. Crea una cuenta de prueba en **developer.paypal.com → Sandbox → Accounts**
   (una `personal` compradora y una `business` vendedora).
2. Abre el juego en la web, entra en **Ajustes → Cuenta y licencia → Desbloquear
   versión completa**.
3. Pulsa el botón de PayPal, inicia sesión con la cuenta `personal` de sandbox y
   aprueba el pago.
4. La Edge Function captura la orden, actualiza `hf_players.is_premium` e
   inserta la fila en `hf_payments`.
5. El juego debe cerrar el modal y mostrar la insignia **PREMIUM** al instante,
   sin recargar.

Comprobaciones en SQL:

```sql
select * from public.hf_payments order by created_at desc limit 5;
select player_id, is_premium, recovery_email, updated_at
  from public.hf_players order by updated_at desc limit 5;
```

## 6. Pasar a producción (live)

1. En **PayPal Developer → Apps & Credentials**, cambia a **Live** y crea una
   app. Copia el **Client ID** y el **Secret** live.
2. Actualiza los secretos de Supabase (`PAYPAL_CLIENT_ID`, `PAYPAL_SECRET_KEY`,
   `PAYPAL_API_BASE=https://api-m.paypal.com`).
3. Cambia el `clientId` de `js/config.js` por el live.
4. Sube el `C` de `sw.js` (por ejemplo `federati-v175`) para que los jugadores
   reciban el JS nuevo.
5. Despliega la función y publica la web.
6. Haz una compra real de 4.99 USD y reembólsala desde PayPal para validar el
   flujo completo.

## Seguridad

- La `service_role` sólo existe dentro de la Edge Function. Supabase inyecta
  automáticamente `SUPABASE_SECRET_KEYS` (claves nuevas `sb_secret_…`) y, por
  compatibilidad, `SUPABASE_SERVICE_ROLE_KEY`. La función prefiere las nuevas y
  nunca las expone al navegador.
- La Edge Function no confía en el cliente: fija el importe, valida la captura
  real de PayPal y comprueba que el `custom_id` de la orden coincide con el
  `player_id`.
- `hf_payments` tiene RLS y no tiene políticas para `anon`/`authenticated`.
- `fn_hf_paypal_grant` es `SECURITY DEFINER`, idempotente por `payment_id` y sólo
  la puede ejecutar `service_role`. Un mismo cobro no puede acreditar a dos
  jugadores.
- Reintentos: si la respuesta se pierde después de capturar, el cliente guarda
  la orden pendiente y ofrece **«Confirmar pago pendiente»**. PayPal devuelve
  `ORDER_ALREADY_CAPTURED`, la función recupera la orden y activa Premium sin
  cobrar dos veces.

## Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `Requested function was not found` / 404 | La Edge Function `paypal` no está desplegada | Despliega `paypal` (sección 3) y comprueba `{"action":"health"}`. |
| «No se pudo contactar con el servidor de pago» | Función no desplegada, `verify_jwt` activo o CORS bloqueado | Despliega con `verify_jwt=false`; revisa el preflight y `ALLOWED_ORIGINS`. |
| `jugador_no_encontrado` | La cuenta aún no se registró en `hf_players` | El cliente espera a `ensureRegistered()`; revisa que `fn_hf_register` o el POST legacy funcionen. |
| `paypal_autenticacion` | Client ID/Secret no coinciden con el entorno | Sandbox usa `api-m.sandbox.paypal.com`; live usa `api-m.paypal.com`. |
| `importe_no_coincide` | Cambiaste el precio en un sitio y no en los otros | Actualiza config, Edge Function y SQL. |
| `jugador_no_coincide` | La orden se creó para otro `player_id` | Borra la orden pendiente y vuelve a comprar. |
| El botón no aparece | SDK bloqueado (adblock/CSP) o `clientId` vacío | El modal ofrece el método manual de respaldo. Revisa la consola. |
| CORS | `ALLOWED_ORIGINS` no incluye el dominio | Añade el dominio o deja `ALLOWED_ORIGINS` sin definir (`*`). |
| El pago queda `PENDING` | eCheck u otra confirmación diferida | No se activa hasta `COMPLETED`; revisa la orden en PayPal. |

## Reembolsos y facturación

`hf_payments.status` guarda el estado de la captura (`COMPLETED`). Si reembolsas
manualmente desde PayPal, actualiza la fila y decide si retirar `is_premium`:

```sql
update public.hf_payments set status = 'REFUNDED' where payment_id = 'CAPTURE-ID';
```

Un webhook de PayPal para sincronizar reembolsos automáticamente es una mejora
futura; no es necesario para el cobro puntual.
