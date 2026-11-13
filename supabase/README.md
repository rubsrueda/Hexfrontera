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
| `sql/account_identity.sql` | RPC de identidad: registrar, perfil, licencia y RLS de `hf_players`. |
| `sql/account_extra.sql` | Editar llave, borrar cuenta temporal y recuperar credenciales. |
| `supabase/functions/paypal/index.ts` | Edge Function: PayPal, correo de credenciales y recuperación. |
| `supabase/config.toml` | `verify_jwt = false` para que el navegador pueda llamar a la función. |
| `supabase/.env.example` | Variables para desarrollo local (sin secretos reales). |
| `js/config.js` → `payment.paypal` | Client ID público, importe y moneda que pinta el juego. |
| `js/payment.js` | Carga el SDK, monta el botón y refresca la UI al terminar. |
| `js/cloud.js` | Identidad, vinculación, edición de llave y recuperación por correo. |

## 1. Aplicar el SQL (una vez)

En **Supabase → SQL Editor**, ejecuta en este orden:

1. `sql/paypal_payments.sql` — tabla de cobros y activación Premium.
2. `sql/account_identity.sql` — RPC de identidad y cierre de `hf_players`.
3. `sql/account_extra.sql` — editar llave, borrar cuenta temporal y recuperar
   credenciales.

Los tres son idempotentes. Al final muestran comprobaciones con `ok = true`.

> Si ya aplicaste `sql/security_hardening.sql`, puedes ejecutar igualmente
> `account_identity.sql` y `account_extra.sql`: usan `CREATE OR REPLACE` y son
> compatibles.

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
| `RESEND_API_KEY` (alternativa) | API key de Resend para enviar credenciales | igual |
| `SMTP_HOST` (opción Porkbun) | `smtp.porkbun.com` | igual |
| `SMTP_PORT` | `50587` (STARTTLS alternativo) | igual |
| `SMTP_USER` | La dirección completa del buzón | igual |
| `SMTP_PASS` | Contraseña del buzón (no la de Porkbun) | igual |
| `EMAIL_FROM` | Remitente, ej. `Federati <tu@tudominio.com>` | igual |
| `EMAIL_REPLY_TO` (opcional) | Correo de respuesta | igual |

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
# {"ok":true,"configured":true,"sandbox":true,"email":true}
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
4. Sube el número de `C` en `sw.js` (por ejemplo, `federati-v189`) para que los
   jugadores reciban el JS nuevo.
5. Despliega la función y publica la web.
6. Haz una compra real de 4.99 USD y reembólsala desde PayPal para validar el
   flujo completo.

## 7. Cuentas: correo, llave y recuperación

### 7.1 SQL necesario

Además de `sql/paypal_payments.sql`, aplica en el SQL Editor:

1. `sql/account_identity.sql` — crea `fn_hf_register`, `fn_hf_profile`,
   `fn_hf_license`, `fn_hf_set_recovery_email`, `fn_hf_recover_request` y cierra
   la lectura pública de `hf_players`.
2. `sql/account_extra.sql` — crea `fn_hf_set_secret`,
   `fn_hf_delete_player` y `fn_hf_recover_credentials`.

Sin el primero, «Restaurar compra» responde «ID o clave incorrecta» y la compra
puede fallar con `jugador_no_encontrado` porque el registro no existe.

### 7.2 Configurar el correo

Puedes usar **tu cuenta de Porkbun** (recomendado si ya la tienes) o Resend.
El envío es independiente de PayPal.

#### Opción A: SMTP de Porkbun (sin proveedor nuevo)

Porkbun ofrece SMTP para los buzones de tu dominio. La función `paypal` ya
soporta SMTP.

1. En **Porkbun → Email**, asegúrate de que el buzón existe y tienes su
   contraseña (no la de tu cuenta de Porkbun, sino la del buzón).
2. En **Edge Functions → Secrets**, añade:

| Key | Value |
|---|---|
| `SMTP_HOST` | `smtp.porkbun.com` |
| `SMTP_PORT` | `50587` |
| `SMTP_USER` | La dirección completa del buzón, ej. `no-reply@tudominio.com` |
| `SMTP_PASS` | La contraseña del buzón |
| `EMAIL_FROM` | `Federati <no-reply@tudominio.com>` (el mismo buzón o un alias permitido) |
| `EMAIL_REPLY_TO` (opcional) | `soporte@tudominio.com` |

3. Vuelve a desplegar `paypal` para que cargue el código con SMTP.
4. Comprueba `health`: debe devolver `email_mode:"smtp"` y `email:true`.

> **Puertos:** Supabase/Deno bloquea los puertos salientes 25 y 587. Porkbun
> ofrece **50587** (STARTTLS alternativo) y **465** (TLS implícito). Usa 50587.
> Si tu proyecto no conecta, prueba 465. Si ninguno funciona, usa Resend.

#### Opción B: Resend (HTTP)

1. Crea una cuenta en [Resend](https://resend.com) y verifica un dominio.
2. Crea una **API Key**.
3. En **Edge Functions → Secrets**, añade:
   - `RESEND_API_KEY` = tu API key.
   - `EMAIL_FROM` = remitente verificado, por ejemplo
     `Federati <no-reply@tudominio.com>`.
   - `EMAIL_REPLY_TO` (opcional).
4. Vuelve a desplegar `paypal`.
5. Comprueba `health`: `email_mode:"resend"` y `email:true`.

```json
{"ok":true,"configured":true,"sandbox":true,"email":true,"email_mode":"smtp","email_missing":[]}
```

Si `email` es `false`, mira `email_missing`: indica exactamente qué secreto falta.
No hace falta configurar los dos modos: con SMTP o con Resend es suficiente.

### 7.3 Flujos

- **Compra:** al capturar el pago se activa `is_premium`, se registra
  `hf_payments` y se envía al correo del pagador de PayPal (o al
  `recovery_email`) el `player_id` y la `secret_key`. Si el correo falla, la
  compra sigue siendo válida; el juego avisa y las credenciales siguen en
  Ajustes.
- **Editar llave:** Ajustes → Cuenta y licencia → **Editar llave**. Pide la
  llave nueva; la actual viaja como prueba de identidad. Al guardar, la llave
  anterior deja de funcionar en otros dispositivos.
- **Recuperar cuenta:** Ajustes → **Recuperar cuenta** → correo de respaldo. Si
  el correo existe, la Edge Function envía el ID y la llave. Por privacidad, la
  respuesta es la misma exista o no el correo.
- **Cambiar de teléfono:** Ajustes → **Restaurar compra** → introduce el
  `player_id` y la `secret_key`. Se cargan la tribu, las estadísticas y la
  licencia. La cuenta temporal de este teléfono se borra si no tiene licencia ni
  pagos.

### 7.4 Problemas frecuentes de cuenta

| Síntoma | Causa probable | Solución |
|---|---|---|
| «ID o clave incorrecta» | Falta `account_identity.sql` o la llave no coincide | Aplica el SQL y usa el ID/llave del correo de compra. |
| `fn_hf_profile` 404 | No se aplicó `account_identity.sql` | Ejecútalo en el SQL Editor. |
| `fn_hf_recover_credentials` 404 | No se aplicó `account_extra.sql` | Ejecútalo en el SQL Editor. |
| `email_no_configurado` | Faltan los secretos de correo | Añade SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`) o Resend. |
| `smtp_error` / `Invalid login` | Usuario o contraseña del buzón incorrectos | `SMTP_PASS` es la contraseña del buzón, no la de la cuenta Porkbun. |
| `ETIMEDOUT` / `ECONNREFUSED` al enviar | Puerto SMTP bloqueado | Usa `50587` (STARTTLS) o `465` (TLS); evita 25/587. |
| La cuenta temporal no se borra | Tiene licencia, pagos o datos vinculados | Es intencional para no perder una compra. |
| La llave nueva no funciona en otro móvil | Allí sigue guardada la anterior | Restaura con el ID y la llave nueva. |

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
