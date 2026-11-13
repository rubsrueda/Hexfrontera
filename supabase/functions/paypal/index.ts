/**
 * ============================================================================
 * FEDERATI · Supabase Edge Function `paypal`
 * ----------------------------------------------------------------------------
 * Crea y captura órdenes de PayPal para la licencia Premium de pago único.
 *
 * Secretos (NUNCA en el cliente):
 *   PAYPAL_CLIENT_ID     Client ID de PayPal (sandbox o live)
 *   PAYPAL_SECRET_KEY    Secret de PayPal (sandbox o live)
 *   PAYPAL_API_BASE      Opcional. Por defecto:
 *                        https://api-m.sandbox.paypal.com
 *                        En producción: https://api-m.paypal.com
 *   ALLOWED_ORIGINS      Opcional. Lista separada por comas. Por defecto "*".
 *
 * Supabase inyecta automáticamente:
 *   SUPABASE_URL, SUPABASE_SECRET_KEYS (claves nuevas) o la legacy
 *   SUPABASE_SERVICE_ROLE_KEY.
 *
 * Endpoints (POST JSON):
 *   { action: "create-order",  player_id: "HF-..." }
 *      -> { ok, id, status }                 id = order id de PayPal
 *   { action: "capture-order", order_id: "ORDER-ID", player_id: "HF-..." }
 *      -> { ok, payment_id, payer_email, amount, currency, is_premium, already,
 *           email_sent, email_error? }
 *   { action: "recover-request", email: "jugador@ejemplo.com" }
 *      -> { ok, sent }   (envía ID + llave al correo de respaldo)
 *   { action: "health" }
 *      -> { ok, configured, sandbox, email, email_mode, email_missing }
 *
 * Secretos de correo (uno de los dos modos):
 *   SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS   (Porkbun: smtp.porkbun.com:50587)
 *   RESEND_API_KEY                                  (alternativa HTTP)
 *   EMAIL_FROM       Remitente, ej. "Federati <no-reply@tudominio>"
 *   EMAIL_REPLY_TO   Opcional
 *
 * Seguridad:
 *   · El importe (4.99 USD) lo pone el servidor; el cliente no lo envía.
 *   · Se exige que la orden pertenezca al player_id (custom_id/reference_id).
 *   · Se exige status COMPLETED, moneda USD e importe 4.99 en la captura.
 *   · La escritura en Supabase va por la RPC `fn_hf_paypal_grant`, que es
 *     idempotente y sólo puede ejecutar la service_role.
 * ============================================================================
 */

import nodemailer from "npm:nodemailer@^9";

const AMOUNT = "4.99";
const CURRENCY = "USD";
const DEFAULT_API_BASE = "https://api-m.sandbox.paypal.com";

type Json = Record<string, unknown>;

class HttpError extends Error {
  status: number;
  detail?: unknown;

  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.detail = detail;
  }
}

/** Cabeceras CORS. Si ALLOWED_ORIGINS está definido, sólo se permite esa lista. */
function corsHeaders(req: Request): Record<string, string> {
  const raw = (Deno.env.get("ALLOWED_ORIGINS") || "*").trim();
  const allowed = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const origin = req.headers.get("Origin") || "";
  const allow = allowed.includes("*")
    ? "*"
    : (allowed.includes(origin) ? origin : "");

  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, prefer",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (allow) headers["Access-Control-Allow-Origin"] = allow;
  return headers;
}

function json(req: Request, body: Json, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: Object.assign({ "Content-Type": "application/json; charset=utf-8" }, corsHeaders(req)),
  });
}

/** Timeout compatible con versiones antiguas de Deno. */
function timeoutSignal(ms: number): AbortSignal {
  const anySignal = AbortSignal as unknown as { timeout?: (n: number) => AbortSignal };
  if (typeof anySignal.timeout === "function") return anySignal.timeout(ms);
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

// ---------------------------------------------------------------------------
// Correo transaccional: SMTP (Porkbun u otro) o Resend
// ---------------------------------------------------------------------------
// SMTP:   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
// Resend: RESEND_API_KEY, EMAIL_FROM
// Se usa SMTP si SMTP_HOST está definido; si no, Resend.
//
// Importante: Supabase/Deno bloquea los puertos salientes 25 y 587. Para
// Porkbun usa el puerto alternativo 50587 (STARTTLS) o 465 (TLS implícito).

const RESEND_ENDPOINT = "https://api.resend.com/emails";

type EmailMode = "smtp" | "resend" | "none";
type EmailInput = { to: string; subject: string; text: string; html: string };
type EmailResult = { ok: boolean; error?: string };

function emailMode(): EmailMode {
  if ((Deno.env.get("SMTP_HOST") || "").trim()) return "smtp";
  if ((Deno.env.get("RESEND_API_KEY") || "").trim()) return "resend";
  return "none";
}

function emailMissing(): string[] {
  const mode = emailMode();
  const missing: string[] = [];
  const has = (name: string) => !!(Deno.env.get(name) || "").trim();

  if (!has("EMAIL_FROM")) missing.push("EMAIL_FROM");
  if (mode === "smtp") {
    if (!has("SMTP_USER")) missing.push("SMTP_USER");
    if (!has("SMTP_PASS")) missing.push("SMTP_PASS");
  } else if (mode === "none") {
    missing.push("SMTP_HOST (+SMTP_USER/SMTP_PASS) o RESEND_API_KEY");
  }
  return missing;
}

function emailConfigured(): boolean {
  return emailMissing().length === 0;
}

function escapeHtml(value: string): string {
  const map: Record<string, string> = {
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  };
  return String(value).replace(/[&<>"']/g, (c) => map[c] || c);
}

async function sendResendEmail(input: EmailInput): Promise<EmailResult> {
  const apiKey = (Deno.env.get("RESEND_API_KEY") || "").trim();
  const from = (Deno.env.get("EMAIL_FROM") || "").trim();
  if (!apiKey || !from) return { ok: false, error: "email_no_configurado" };

  const payload: Json = {
    from,
    to: [input.to],
    subject: input.subject,
    text: input.text,
    html: input.html,
  };
  const replyTo = (Deno.env.get("EMAIL_REPLY_TO") || "").trim();
  if (replyTo) payload.reply_to = replyTo;

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: timeoutSignal(20000),
    });
    const data = await res.json().catch(() => ({})) as Json;
    if (!res.ok) {
      return { ok: false, error: String(data.message || data.name || "email_error") };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: String((error as Error)?.message || "email_error") };
  }
}

async function sendSmtpEmail(input: EmailInput): Promise<EmailResult> {
  const host = (Deno.env.get("SMTP_HOST") || "").trim();
  const port = Number(Deno.env.get("SMTP_PORT") || 50587);
  const user = (Deno.env.get("SMTP_USER") || "").trim();
  const pass = Deno.env.get("SMTP_PASS") || "";
  const from = (Deno.env.get("EMAIL_FROM") || "").trim();
  if (!host || !user || !pass || !from) return { ok: false, error: "email_no_configurado" };

  try {
    const transport = nodemailer.createTransport({
      host,
      port,
      // 465 = TLS implícito. 50587/587 = STARTTLS (requireTLS).
      secure: port === 465,
      requireTLS: port !== 465,
      auth: { user, pass },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    });

    try {
      const replyTo = (Deno.env.get("EMAIL_REPLY_TO") || "").trim();
      await transport.sendMail({
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
        ...(replyTo ? { replyTo } : {}),
      });
      return { ok: true };
    } finally {
      transport.close();
    }
  } catch (error) {
    return { ok: false, error: String((error as Error)?.message || "smtp_error") };
  }
}

async function sendEmail(input: EmailInput): Promise<EmailResult> {
  const mode = emailMode();
  if (mode === "smtp") return sendSmtpEmail(input);
  if (mode === "resend") return sendResendEmail(input);
  return { ok: false, error: "email_no_configurado" };
}

function credentialsEmail(input: {
  playerId: string;
  secretKey: string;
  kind: "purchase" | "recovery";
}): { subject: string; text: string; html: string } {
  const isPurchase = input.kind === "purchase";
  const subject = isPurchase
    ? "Tu licencia Premium de Federati — credenciales"
    : "Tus credenciales de Federati";
  const intro = isPurchase
    ? "Gracias por tu compra. Tu licencia Premium ya está activa."
    : "Has solicitado recuperar el acceso a tu cuenta de Federati.";

  const player = input.playerId;
  const key = input.secretKey;
  const text = [
    intro,
    "",
    "ID de jugador: " + player,
    "Llave secreta: " + key,
    "",
    "Guarda estos datos. Para jugar en otro dispositivo:",
    "Ajustes → Cuenta y licencia → Restaurar compra, e introduce tu ID y tu llave.",
    "",
    "También puedes cambiar la llave desde Ajustes → Cuenta y licencia.",
    "No compartas tu llave: quien la tenga puede usar tu cuenta.",
    "",
    "— Federati",
  ].join("\n");

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.55;color:#1b2436;max-width:560px;margin:0 auto">
    <h2 style="color:#b7791f;margin:0 0 8px">Federati</h2>
    <p>${escapeHtml(intro)}</p>
    <table style="border-collapse:collapse;margin:14px 0;width:100%">
      <tr><td style="padding:8px 10px;background:#faf3e3;border:1px solid #eadfc6"><b>ID de jugador</b></td>
          <td style="padding:8px 10px;border:1px solid #eadfc6;font-family:monospace">${escapeHtml(player)}</td></tr>
      <tr><td style="padding:8px 10px;background:#faf3e3;border:1px solid #eadfc6"><b>Llave secreta</b></td>
          <td style="padding:8px 10px;border:1px solid #eadfc6;font-family:monospace">${escapeHtml(key)}</td></tr>
    </table>
    <p><b>Guarda estos datos.</b> Para jugar en otro dispositivo entra en
    <b>Ajustes → Cuenta y licencia → Restaurar compra</b> e introduce tu ID y tu llave.</p>
    <p>También puedes cambiar la llave desde <b>Ajustes → Cuenta y licencia</b>.</p>
    <p style="color:#8a4b08"><b>No compartas tu llave:</b> quien la tenga puede usar tu cuenta.</p>
    <p style="color:#6b7280;font-size:13px">— Federati</p>
  </div>`;

  return { subject, text, html };
}

function paypalBase(): string {
  const raw = Deno.env.get("PAYPAL_API_BASE") || DEFAULT_API_BASE;
  return raw.replace(/\/+$/, "");
}

function requireEnv(name: string): string {
  const value = (Deno.env.get(name) || "").trim();
  if (!value) throw new HttpError(500, "paypal_no_configurado", { missing: name });
  return value;
}

function validPlayerId(value: unknown): string {
  const id = String(value || "").trim();
  if (!/^[A-Za-z0-9_-]{6,40}$/.test(id)) {
    throw new HttpError(400, "player_id_invalido");
  }
  return id;
}

function validOrderId(value: unknown): string {
  const id = String(value || "").trim();
  if (!/^[A-Za-z0-9-]{6,64}$/.test(id)) {
    throw new HttpError(400, "order_id_invalido");
  }
  return id;
}

// ---------------------------------------------------------------------------
// PayPal REST API
// ---------------------------------------------------------------------------

let tokenCache: { token: string; expiresAt: number } = { token: "", expiresAt: 0 };

async function paypalToken(): Promise<string> {
  if (tokenCache.token && Date.now() < tokenCache.expiresAt) return tokenCache.token;

  const clientId = requireEnv("PAYPAL_CLIENT_ID");
  const secret = requireEnv("PAYPAL_SECRET_KEY");

  const res = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": "Basic " + btoa(`${clientId}:${secret}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: timeoutSignal(15000),
  });

  const data = await res.json().catch(() => ({})) as Json;
  if (!res.ok || !data.access_token) {
    throw new HttpError(502, "paypal_autenticacion", {
      status: res.status,
      issue: (data as Json).error,
      description: (data as Json).error_description,
    });
  }

  const expiresIn = Number(data.expires_in) || 3600;
  tokenCache = {
    token: String(data.access_token),
    // Se renueva un minuto antes de caducar.
    expiresAt: Date.now() + Math.max(60, expiresIn - 60) * 1000,
  };
  return tokenCache.token;
}

async function paypalRequest(path: string, init: RequestInit = {}): Promise<Json> {
  const token = await paypalToken();
  const res = await fetch(`${paypalBase()}${path}`, Object.assign({}, init, {
    headers: Object.assign({
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    }, (init.headers as Record<string, string>) || {}),
    signal: init.signal || timeoutSignal(20000),
  }));

  const text = await res.text();
  let data: Json = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

  if (!res.ok) {
    const details = (data.details as Array<Json> | undefined) || [];
    throw new HttpError(502, "paypal_api", {
      status: res.status,
      issue: details[0]?.issue || data.name || data.error,
      description: details[0]?.description || data.message,
      debug_id: data.debug_id,
    });
  }
  return data;
}

async function getOrder(orderId: string): Promise<Json> {
  return paypalRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}`);
}

async function createPayPalOrder(playerId: string): Promise<Json> {
  const body = {
    intent: "CAPTURE",
    purchase_units: [{
      reference_id: playerId,
      custom_id: playerId,
      description: "Federati · Licencia Premium (pago único)",
      amount: { currency_code: CURRENCY, value: AMOUNT },
    }],
    application_context: {
      brand_name: "Federati",
      shipping_preference: "NO_SHIPPING",
      user_action: "PAY_NOW",
    },
  };

  const data = await paypalRequest("/v2/checkout/orders", {
    method: "POST",
    body: JSON.stringify(body),
    // Idempotencia de PayPal si el cliente reintenta la misma petición.
    headers: { "PayPal-Request-Id": `${playerId}-${Date.now()}` },
  });

  if (!data.id) throw new HttpError(502, "paypal_orden_sin_id");
  return data;
}

async function capturePayPalOrder(orderId: string): Promise<Json> {
  try {
    return await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
      method: "POST",
      body: "{}",
    });
  } catch (error) {
    // Reintento tras una respuesta perdida: PayPal ya capturó la orden.
    const detail = error instanceof HttpError ? error.detail as Json | undefined : undefined;
    const issue = String(detail?.issue || "");
    if (issue === "ORDER_ALREADY_CAPTURED" || issue === "PAYMENT_ALREADY_DONE") {
      return await getOrder(orderId);
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Supabase (service_role): comprobar jugador y activar Premium
// ---------------------------------------------------------------------------

// Supabase inyecta las claves nuevas en SUPABASE_SECRET_KEYS (JSON) y, por
// compatibilidad, la legacy en SUPABASE_SERVICE_ROLE_KEY. Se prefieren las
// nuevas; si no están, se usa la legacy.
function supabaseServiceKey(): string {
  const raw = (Deno.env.get("SUPABASE_SECRET_KEYS") || "").trim();
  if (raw) {
    try {
      const keys = JSON.parse(raw) as Record<string, string>;
      const key = keys.default || Object.values(keys)[0];
      if (key) return key;
    } catch {
      // JSON inválido: se intenta la clave legacy.
    }
  }
  const legacy = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "").trim();
  if (legacy) return legacy;
  throw new HttpError(500, "supabase_no_configurado");
}

function serviceHeaders(): Record<string, string> {
  const key = supabaseServiceKey();
  const headers: Record<string, string> = {
    "apikey": key,
    "Content-Type": "application/json",
  };
  // Las claves nuevas (sb_secret_…) no son JWT: se envían sólo en `apikey`.
  // La legacy service_role sí es un JWT y PostgREST espera el Bearer.
  if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) {
    headers["Authorization"] = `Bearer ${key}`;
  }
  return headers;
}

function supabaseUrl(): string {
  return (Deno.env.get("SUPABASE_URL") || "").replace(/\/+$/, "") || requireEnv("SUPABASE_URL");
}

async function playerExists(playerId: string): Promise<boolean> {
  const url = `${supabaseUrl()}/rest/v1/hf_players` +
    `?player_id=eq.${encodeURIComponent(playerId)}&select=player_id&limit=1`;
  const res = await fetch(url, {
    headers: serviceHeaders(),
    signal: timeoutSignal(10000),
  });
  if (!res.ok) {
    throw new HttpError(502, "supabase_consulta", { status: res.status });
  }
  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) && rows.length > 0;
}

async function getPlayerRow(playerId: string): Promise<{ secret_key?: string; recovery_email?: string }> {
  const url = `${supabaseUrl()}/rest/v1/hf_players` +
    `?player_id=eq.${encodeURIComponent(playerId)}&select=secret_key,recovery_email&limit=1`;
  const res = await fetch(url, {
    headers: serviceHeaders(),
    signal: timeoutSignal(10000),
  });
  if (!res.ok) {
    throw new HttpError(502, "supabase_consulta", { status: res.status });
  }
  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) ? (rows[0] || {}) : {};
}

async function grantPremium(input: {
  playerId: string;
  paymentId: string;
  payerEmail: string;
  amount: number;
  currency: string;
  status: string;
}): Promise<Json> {
  const res = await fetch(`${supabaseUrl()}/rest/v1/rpc/fn_hf_paypal_grant`, {
    method: "POST",
    headers: serviceHeaders(),
    body: JSON.stringify({
      p_player: input.playerId,
      p_payment_id: input.paymentId,
      p_payer_email: input.payerEmail,
      p_amount: input.amount,
      p_currency: input.currency,
      p_status: input.status,
    }),
    signal: timeoutSignal(15000),
  });

  const data = await res.json().catch(() => ({})) as Json;
  if (!res.ok) {
    throw new HttpError(502, "supabase_activacion", {
      status: res.status,
      message: data.message || data.error,
    });
  }
  return data;
}

// ---------------------------------------------------------------------------
// Flujo de negocio
// ---------------------------------------------------------------------------

async function handleCreateOrder(playerId: string): Promise<Json> {
  if (!(await playerExists(playerId))) {
    throw new HttpError(404, "jugador_no_encontrado");
  }

  const order = await createPayPalOrder(playerId);
  return { ok: true, id: order.id, status: order.status || "CREATED" };
}

async function handleCaptureOrder(orderId: string, playerId: string): Promise<Json> {
  const order = await capturePayPalOrder(orderId);

  if (String(order.status || "").toUpperCase() !== "COMPLETED") {
    throw new HttpError(409, "pago_no_completado", { status: order.status });
  }

  const units = Array.isArray(order.purchase_units) ? order.purchase_units as Json[] : [];
  const unit = units[0] || {};
  const owner = String(unit.custom_id || unit.reference_id || "");
  if (!owner || owner !== playerId) {
    throw new HttpError(409, "jugador_no_coincide", {
      expected: playerId,
      received: owner,
    });
  }

  const payments = (unit.payments || {}) as Json;
  const captures = Array.isArray(payments.captures) ? payments.captures as Json[] : [];
  const capture = captures[0] || {};
  const captureId = String(capture.id || "");
  const captureStatus = String(capture.status || "").toUpperCase();
  const amount = (capture.amount || {}) as Json;
  const value = Number(amount.value || 0);
  const currency = String(amount.currency_code || "").toUpperCase();

  if (!captureId) throw new HttpError(502, "captura_sin_id");
  if (captureStatus !== "COMPLETED") {
    throw new HttpError(409, "captura_no_completada", { status: captureStatus });
  }
  if (currency !== CURRENCY || Math.abs(value - Number(AMOUNT)) > 0.001) {
    throw new HttpError(409, "importe_no_coincide", { value, currency });
  }

  const payer = (order.payer || {}) as Json;
  const payerEmail = String(payer.email_address || "");

  const granted = await grantPremium({
    playerId,
    paymentId: captureId,
    payerEmail,
    amount: value,
    currency,
    status: captureStatus,
  });

  if (granted.ok === false) {
    throw new HttpError(500, "activacion_rechazada", {
      message: granted.error || granted.message,
    });
  }

  // Correo de bienvenida con el ID y la llave. Si falla, la compra sigue
  // siendo válida: nunca se pierde la licencia por un problema de correo.
  let emailSent = false;
  let emailError = "";
  try {
    const player = await getPlayerRow(playerId);
    const secretKey = String(player.secret_key || "");
    const to = payerEmail || String(player.recovery_email || "");
    if (!secretKey) {
      emailError = "sin_llave";
    } else if (!to) {
      emailError = "sin_correo";
    } else {
      const mail = credentialsEmail({ playerId, secretKey, kind: "purchase" });
      const sent = await sendEmail({ to, ...mail });
      emailSent = sent.ok;
      if (!sent.ok) emailError = sent.error || "email_error";
    }
  } catch (error) {
    emailError = "email_error";
    console.warn("[paypal] no se pudo preparar el correo:", (error as Error)?.message);
  }
  if (!emailSent) console.warn("[paypal] correo no enviado:", emailError);

  return {
    ok: true,
    payment_id: captureId,
    payer_email: payerEmail,
    amount: value.toFixed(2),
    currency,
    is_premium: true,
    already: !!granted.already,
    email_sent: emailSent,
    email_error: emailSent ? undefined : emailError,
  };
}

async function handleRecoverRequest(email: string): Promise<Json> {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new HttpError(400, "correo_invalido");
  }
  if (!emailConfigured()) {
    throw new HttpError(503, "email_no_configurado", { missing: emailMissing() });
  }

  const res = await fetch(`${supabaseUrl()}/rest/v1/rpc/fn_hf_recover_credentials`, {
    method: "POST",
    headers: serviceHeaders(),
    body: JSON.stringify({ p_email: email }),
    signal: timeoutSignal(15000),
  });
  const data = await res.json().catch(() => ({})) as Json;
  if (!res.ok) {
    throw new HttpError(502, "supabase_consulta", { status: res.status });
  }

  if (data.ok !== true) {
    if (String(data.msg || "").includes("demasiados")) {
      throw new HttpError(429, "demasiados_intentos");
    }
    // No se revela si el correo existe: misma respuesta para todos.
    return { ok: true, sent: true };
  }

  const playerId = String(data.player_id || "");
  const secretKey = String(data.secret_key || "");
  const to = String(data.recovery_email || email);
  if (!playerId || !secretKey) {
    throw new HttpError(500, "credenciales_incompletas");
  }

  const mail = credentialsEmail({ playerId, secretKey, kind: "recovery" });
  const sent = await sendEmail({ to, ...mail });
  if (!sent.ok) {
    throw new HttpError(502, "email_error", { error: sent.error });
  }
  return { ok: true, sent: true };
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }
  if (req.method !== "POST") {
    return json(req, { ok: false, error: "metodo_no_permitido" }, 405);
  }

  let body: Json;
  try {
    body = await req.json() as Json;
  } catch {
    return json(req, { ok: false, error: "json_invalido" }, 400);
  }

  const action = String(body.action || "");

  try {
    if (action === "health") {
      const configured = !!Deno.env.get("PAYPAL_CLIENT_ID") && !!Deno.env.get("PAYPAL_SECRET_KEY");
      return json(req, {
        ok: true,
        configured,
        sandbox: paypalBase().includes("sandbox"),
        email: emailConfigured(),
        email_mode: emailMode(),
        email_missing: emailMissing(),
      });
    }

    if (action === "recover-request") {
      const email = String(body.email || "").trim();
      return json(req, await handleRecoverRequest(email));
    }

    const playerId = validPlayerId(body.player_id);

    if (action === "create-order") {
      return json(req, await handleCreateOrder(playerId));
    }

    if (action === "capture-order") {
      const orderId = validOrderId(body.order_id);
      return json(req, await handleCaptureOrder(orderId, playerId));
    }

    return json(req, { ok: false, error: "accion_desconocida" }, 400);
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === "AbortError";
    const status = aborted ? 504 : (error instanceof HttpError ? error.status : 500);
    const message = aborted ? "paypal_timeout" : (error instanceof Error ? error.message : "error_interno");
    const detail = error instanceof HttpError ? error.detail : undefined;

    // El secreto nunca se registra: sólo el mensaje y el detalle de PayPal.
    console.error("[paypal]", action, message, detail || "");
    return json(req, { ok: false, error: message, detail }, status);
  }
});
