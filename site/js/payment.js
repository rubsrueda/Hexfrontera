/* ===========================================================================
 * payment.js — Licencia completa y registro de la cuenta (Federati)
 * ---------------------------------------------------------------------------
 * La verdad de la licencia vive SIEMPRE en el servidor (Supabase):
 *   · El cliente nunca activa `is_premium` por su cuenta (ver js/security.js).
 *   · `HF.cloud.verifyLicense()` pregunta al servidor y actualiza la caché.
 *
 * En la WEB el pago es con PayPal (pago único de 4.99 USD):
 *   1. `openPurchase()` monta el botón oficial dentro del modal.
 *   2. `createOrder` pide a la Edge Function `paypal` que cree la orden.
 *   3. `onApprove` pide a la Edge Function que capture el dinero; si todo
 *      cuadra, el servidor activa `is_premium` y registra el cobro. Al volver,
 *      la UI se refresca al instante (sin reiniciar).
 *
 * En escritorio/móvil se mantiene el flujo de tienda o la solicitud manual.
 * El pago manual (Web3Forms) sigue disponible como respaldo: el autor activa
 * la licencia en Supabase y el jugador pulsa «Comprobar licencia».
 *
 * No se envía jamás la llave secreta (`secret_key`) al buzón: solo el ID
 * público, que no permite suplantar la cuenta.
 * =========================================================================== */
(function (G) {
  const HF = G.HF = G.HF || {};

  const t = (k, f) => (HF.t ? HF.t(k, f) : (f != null ? f : k));
  const esc = s => (HF.esc ? HF.esc(s) : String(s == null ? '' : s));

  const PRICES = {
    web: { base: '$4.99 USD', promo: '$4.99 USD' },
    android: { base: '$5.99 USD', promo: '$2.99 USD' },
    ios: { base: '$6.99 USD', promo: '$2.99 USD' },
    steam: { base: '$5.99 USD', promo: '$4.49 USD' }
  };
  const STORES = { web: 'PayPal', android: 'Google Play', ios: 'App Store', steam: 'Steam' };

  const payCfg = () => (HF.CFG && HF.CFG.payment) || {};
  const paypalCfg = () => payCfg().paypal || {};

  const PAYPAL_SDK = 'https://www.paypal.com/sdk/js';
  const PAYPAL_SCRIPT_ID = 'paypal-sdk';
  const PENDING_KEY = 'paypal_pending_order';
  const PENDING_TTL = 24 * 60 * 60 * 1000;

  function getPlatform() {
    try {
      if (HF.platform && HF.platform.kind === 'electron') return 'steam';
      if (HF.platform && HF.platform.kind === 'capacitor') {
        const p = G.Capacitor && G.Capacitor.getPlatform ? String(G.Capacitor.getPlatform()) : '';
        return p === 'ios' ? 'ios' : 'android';
      }
      if (G.Capacitor && G.Capacitor.getPlatform) {
        const p = String(G.Capacitor.getPlatform());
        if (p === 'ios') return 'ios';
        if (p === 'android') return 'android';
      }
    } catch (e) { }
    return 'web';
  }

  function isPromo() { return !!payCfg().promo; }

  function getPrices(promo) {
    const platform = getPlatform();
    const table = PRICES[platform] || PRICES.web;
    const isP = promo == null ? isPromo() : !!promo;
    // En web el precio que se muestra sale de la misma configuración que usa
    // el flujo de PayPal; así no se separa de lo que se cobra.
    const amount = platform === 'web'
      ? '$' + paypalAmount() + ' ' + paypalCurrency()
      : (isP ? table.promo : table.base);
    return {
      platform: platform,
      store: STORES[platform] || STORES.web,
      amount: amount,
      base: table.base,
      promo: isP
    };
  }

  function checkoutUrl(promo) {
    const c = payCfg();
    const isP = promo == null ? isPromo() : !!promo;
    return String((isP ? c.checkoutPromo : c.checkout) || '').trim();
  }

  function playerId() {
    try { return HF.cloud && HF.cloud.playerId ? String(HF.cloud.playerId()) : ''; } catch (e) { return ''; }
  }

  function isPremium() {
    try { return !!(HF.cloud && HF.cloud.isPremium && HF.cloud.isPremium()); } catch (e) { return false; }
  }

  function withClientRef(url) {
    const id = playerId();
    if (!id) return url;
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'client_reference_id=' + encodeURIComponent(id);
  }

  // ---------------------------------------------------------------------------
  // PayPal (sólo web)
  // ---------------------------------------------------------------------------
  function paypalAmount() {
    const raw = paypalCfg().amount != null ? paypalCfg().amount : '4.99';
    return String(raw).replace(',', '.').trim();
  }

  function paypalCurrency() {
    return String(paypalCfg().currency || 'USD').trim().toUpperCase();
  }

  function isPayPal() {
    if (getPlatform() !== 'web') return false;
    const c = paypalCfg();
    if (c.enabled === false) return false;
    return !!String(c.clientId || '').trim() && !!(HF.cloud && HF.cloud.callFunction);
  }

  // Orden creada pero aún no confirmada: sirve para recuperar el pago si se
  // pierde la respuesta de red justo después de capturar en PayPal.
  function pendingOrder() {
    try {
      const p = HF.store.get(PENDING_KEY, null);
      if (!p || !p.orderId) return null;
      if (Date.now() - (+p.at || 0) > PENDING_TTL) return null;
      return p;
    } catch (e) { return null; }
  }

  function setPendingOrder(orderId, pid) {
    try {
      if (!orderId) HF.store.del(PENDING_KEY);
      else HF.store.set(PENDING_KEY, { orderId: String(orderId), playerId: String(pid || ''), at: Date.now() });
    } catch (e) { }
  }

  let sdkPromise = null;
  function loadPayPalSdk() {
    if (G.paypal && G.paypal.Buttons) return Promise.resolve(G.paypal);
    if (sdkPromise) return sdkPromise;

    const clientId = String(paypalCfg().clientId || '').trim();
    if (!clientId) return Promise.reject(new Error('paypal_sin_client_id'));

    sdkPromise = new Promise((resolve, reject) => {
      const doc = G.document;
      if (!doc || !doc.createElement) { reject(new Error('paypal_sin_dom')); return; }

      let timer = 0;
      const ok = () => {
        if (timer) G.clearTimeout(timer);
        if (G.paypal && G.paypal.Buttons) resolve(G.paypal);
        else reject(new Error('paypal_sdk_incompleto'));
      };
      const fail = () => { if (timer) G.clearTimeout(timer); reject(new Error('paypal_sdk_error')); };

      const existing = doc.getElementById ? doc.getElementById(PAYPAL_SCRIPT_ID) : null;
      if (existing) {
        // El script pudo cargarse en un modal anterior.
        if (G.paypal && G.paypal.Buttons) return resolve(G.paypal);
        timer = G.setTimeout(() => reject(new Error('paypal_timeout')), 20000);
        if (existing.addEventListener) {
          existing.addEventListener('load', ok);
          existing.addEventListener('error', fail);
        }
        return;
      }

      const src = PAYPAL_SDK +
        '?client-id=' + encodeURIComponent(clientId) +
        '&currency=' + encodeURIComponent(paypalCurrency()) +
        '&intent=capture&components=buttons';
      const script = doc.createElement('script');
      script.id = PAYPAL_SCRIPT_ID;
      script.src = src;
      script.async = true;
      script.onload = ok;
      script.onerror = fail;
      timer = G.setTimeout(() => reject(new Error('paypal_timeout')), 20000);
      (doc.head || doc.body).appendChild(script);
    }).catch(err => { sdkPromise = null; throw err; });

    return sdkPromise;
  }

  // Traduce los códigos de la Edge Function a mensajes para el jugador.
  function paypalErrorText(error) {
    const code = String((error && error.message) || error || '').trim();
    if (/funcion_no_desplegada/i.test(code)) return t('PAY_PAYPAL_NOT_DEPLOYED');
    if (/funcion_no_autorizada/i.test(code)) return t('PAY_PAYPAL_UNAUTHORIZED');
    if (/servidor_pago_error/i.test(code)) return t('PAY_PAYPAL_SERVER');
    if (/timeout/i.test(code)) return t('PAY_PAYPAL_TIMEOUT');
    if (/offline|network|failed to fetch/i.test(code)) return t('PAY_PAYPAL_OFFLINE');
    if (/jugador_no_encontrado|registro/i.test(code)) return t('PAY_PAYPAL_NO_PLAYER');
    if (/no_configurado|autenticacion|sdk|sin_dom|client_id/i.test(code)) return t('PAY_PAYPAL_UNAVAILABLE');
    if (/no_completado|pendiente|captura_no_completada/i.test(code)) return t('PAY_PAYPAL_PENDING');
    if (/importe_no_coincide|moneda/i.test(code)) return t('PAY_PAYPAL_AMOUNT');
    if (/jugador_no_coincide/i.test(code)) return t('PAY_PAYPAL_PLAYER_MISMATCH');
    return t('PAY_PAYPAL_ERROR');
  }

  // Convierte la respuesta de la Edge Function en un error accionable. La
  // diferencia importante: un 404 significa "función no desplegada", no "sin
  // conexión"; y un fallo de CORS/red también apunta a revisar el despliegue.
  function paymentError(r) {
    try { console.warn('[paypal] respuesta de la Edge Function:', r); } catch (e) { }
    if (r && r.timeout) return new Error('timeout');
    if (r && r.offline) return new Error('offline');
    const status = r && r.status;
    const bodyCode = r && r.data && (r.data.code || r.data.error);
    if (status === 404 || bodyCode === 'NOT_FOUND') return new Error('funcion_no_desplegada');
    if (status === 401 || status === 403) return new Error('funcion_no_autorizada');
    // Códigos concretos de la función (paypal_autenticacion, pago_no_completado,
    // importe_no_coincide…) tienen prioridad sobre el 5xx genérico.
    if (r && r.data && r.data.error) return new Error(String(r.data.error));
    if (status >= 500) return new Error('servidor_pago_error');
    return new Error((r && r.msg) || (r && r.data && (r.data.error || r.data.msg)) || 'paypal_error');
  }

  // Se llama sólo cuando la Edge Function confirmó la captura y la activación.
  function applyPremium(data) {
    try { HF.store.set('is_premium', true); } catch (e) { }

    const email = String((data && data.payer_email) || '').trim();
    if (email && validEmail(email)) {
      try {
        // El correo de PayPal ayuda a recuperar la licencia, pero no pisa uno
        // que el jugador ya haya registrado.
        if (!String(HF.store.get('recovery_email', '') || '').trim()) HF.store.set('recovery_email', email);
      } catch (e) { }
    }

    setPendingOrder(null);
    // La verdad ya está en Supabase; refrescar el perfil en segundo plano.
    if (HF.cloud && HF.cloud.refreshProfile) HF.cloud.refreshProfile().catch(() => { });
    try {
      if (G.dispatchEvent && typeof G.CustomEvent === 'function') {
        G.dispatchEvent(new G.CustomEvent('hf:premium', { detail: data || {} }));
      }
    } catch (e) { }

    if (HF.closeModal) HF.closeModal();
    let notice = t('PAY_PAYPAL_SUCCESS');
    if (data && data.email_sent === true) notice += ' ' + t('PAY_PAYPAL_EMAIL_SENT');
    else if (data && data.email_sent === false) notice += ' ' + t('PAY_PAYPAL_EMAIL_FAILED');
    if (HF.toast) HF.toast(notice, 5200);
    // Re-pinta la pantalla actual: la insignia/menú Premium se desbloquea ya,
    // sin reiniciar el juego.
    const screen = HF.currentScreen || 'settings';
    if (HF.go) HF.go(screen);
  }

  function openPayPal() {
    if (!HF.modal) return;
    const p = getPrices();
    let pending = pendingOrder();
    // Si el dispositivo se vinculó a otra cuenta, la orden pendiente ya no
    // pertenece al jugador actual: se descarta para no acreditar a quien no es.
    if (pending && pending.playerId && pending.playerId !== playerId()) {
      setPendingOrder(null);
      pending = null;
    }

    HF.modal(`<h3>👑 ${t('PAY_TITLE', 'Licencia completa')}</h3>
      <p class="dim small">${t('PAY_INTRO')}</p>
      <div class="card" style="margin:6px 0">
        <div class="row"><span class="grow">${t('PAY_PRODUCT')}</span><b>${esc(p.amount)}</b></div>
        <div class="row"><span class="grow">${t('PAY_STORE')}</span><b>PayPal</b></div>
      </div>
      <div class="dim small">${t('PAY_SUPPORT')}</div>
      <div class="dim small" style="margin-top:4px">${t('PAY_PAYPAL_EMAIL_NOTE')}</div>
      ${pending ? `<div class="card" style="margin:8px 0;border-color:var(--acc)">
        <div class="small">${t('PAY_PAYPAL_PENDING_ORDER')}</div>
        <button id="paypalRecover" class="pri" style="width:100%;margin-top:6px">${t('PAY_PAYPAL_RECOVER')}</button>
      </div>` : ''}
      <div id="paypalButton" style="margin-top:8px;min-height:50px"></div>
      <div class="dim small" id="paypalMsg" style="margin-top:6px">${t('PAY_PAYPAL_SECURE')}</div>
      <div class="neg small" id="paypalErr"></div>
      <button id="paypalFallback" style="display:none;width:100%;margin-top:6px">${t('PAY_REQUEST')}</button>
      <button id="payCheck" style="width:100%;margin-top:8px">${t('PAY_CHECK')}</button>
      <button id="payClose" style="width:100%;margin-top:6px">${t('CLOSE', 'Cerrar')}</button>`, m => {
      const slot = m.querySelector('#paypalButton');
      const err = m.querySelector('#paypalErr');
      const msg = m.querySelector('#paypalMsg');
      const fallback = m.querySelector('#paypalFallback');
      const check = m.querySelector('#payCheck');
      const close = m.querySelector('#payClose');
      const recover = m.querySelector('#paypalRecover');

      if (close) close.onclick = HF.closeModal;
      if (check) check.onclick = () => checkLicense();
      if (fallback) fallback.onclick = () => openLegacyPurchase();

      const status = text => { if (msg) msg.textContent = text; };
      const showError = error => {
        const text = paypalErrorText(error);
        const code = String((error && error.message) || '');
        if (err) err.textContent = text;
        if (msg) msg.textContent = '';
        // El pago manual sólo se ofrece si PayPal/servidor no están
        // disponibles; si el cobro ya se hizo, no se invita a pagar otra vez.
        const manual = /offline|timeout|network|failed to fetch|sdk|no_configurado|autenticacion|client_id|sin_dom|paypal_api|supabase|desplegada|autorizada|servidor_pago/i.test(code);
        if (fallback) fallback.style.display = manual ? 'block' : 'none';
        if (HF.toast) HF.toast(text, 3400);
      };

      const capture = (orderId, pid) => {
        if (!orderId) return Promise.reject(new Error('order_id_invalido'));
        status(t('PAY_PAYPAL_CAPTURING'));
        return HF.cloud.callFunction('paypal', {
          action: 'capture-order', order_id: orderId, player_id: pid || playerId()
        }).then(r => {
          if (!r || !r.ok || !r.data || r.data.ok === false) throw paymentError(r);
          applyPremium(r.data);
          return r.data;
        });
      };

      if (recover && pending) {
        recover.onclick = () => {
          if (recover.disabled) return;
          recover.disabled = true;
          status(t('PAY_PAYPAL_CAPTURING'));
          capture(pending.orderId, pending.playerId || playerId()).catch(error => {
            recover.disabled = false;
            // Sólo se descarta si la orden ya no puede servir; un fallo de red
            // o un pago aún pendiente deben poder reintentarse.
            const code = String((error && error.message) || '');
            if (/order_id_invalido|jugador_no_coincide/i.test(code)) setPendingOrder(null);
            showError(error);
          });
        };
      }

      if (slot) slot.textContent = t('PAY_PAYPAL_LOADING');
      loadPayPalSdk().then(sdk => {
        if (!slot || slot.isConnected === false) return;
        slot.innerHTML = '';
        if (!sdk || typeof sdk.Buttons !== 'function') throw new Error('paypal_sdk_incompleto');

        const buttons = sdk.Buttons({
          style: { layout: 'vertical', color: 'gold', shape: 'pill', label: 'paypal', height: 45 },
          createOrder: () => {
            if (err) err.textContent = '';
            status(t('PAY_PAYPAL_CREATING'));
            const create = () => HF.cloud.callFunction('paypal', { action: 'create-order', player_id: playerId() });
            const ensure = (HF.cloud && HF.cloud.ensureRegistered)
              ? HF.cloud.ensureRegistered()
              : Promise.resolve({ ok: true });
            return ensure.then(reg => {
              if (!reg || !reg.ok) throw new Error((reg && (reg.offline ? 'offline' : reg.msg)) || 'registro');
              return create();
            }).then(r => {
              // Identidad local antigua sin fila en hf_players: se fuerza el
              // registro y se reintenta una sola vez.
              const code = String((r && r.msg) || (r && r.data && r.data.error) || '');
              if (r && !r.ok && r.status === 404 && /jugador_no_encontrado/i.test(code)) {
                try { HF.store.del('cloud_registered'); } catch (e) { }
                return HF.cloud.ensureRegistered().then(() => create());
              }
              return r;
            }).then(r => {
              if (!r || !r.ok || !r.data || !r.data.id) throw paymentError(r);
              status(t('PAY_PAYPAL_APPROVE'));
              return r.data.id;
            });
          },
          onApprove: data => {
            if (err) err.textContent = '';
            const saved = pendingOrder();
            const pid = (saved && saved.playerId) || playerId();
            // Se guarda justo antes de capturar: si la respuesta se pierde,
            // el jugador puede confirmar el pago sin volver a pagar.
            setPendingOrder(data && data.orderID, pid);
            return capture(data && data.orderID, pid).catch(error => {
              const code = String((error && error.message) || '');
              if (/order_id_invalido|jugador_no_coincide/i.test(code)) setPendingOrder(null);
              showError(error);
            });
          },
          onCancel: () => {
            status(t('PAY_PAYPAL_CANCEL'));
            if (HF.toast) HF.toast(t('PAY_PAYPAL_CANCEL'));
          },
          onError: error => { showError(error); }
        });

        return buttons.render(slot);
      }).catch(error => { showError(error); });
    });
  }

  // Abre el enlace de pago. En Electron/WebView `location.href` sacaría la app
  // del bundle, así que se prefiere una pestaña nueva cuando exista.
  function openExternal(url) {
    if (!url) return false;
    try {
      if (typeof G.open === 'function') { G.open(url, '_blank', 'noopener'); return true; }
    } catch (e) { }
    try { if (G.location) { G.location.href = url; return true; } } catch (e) { }
    return false;
  }

  // ---------- buzón de solicitudes (mismo Web3Forms que los comentarios) -----
  function mailbox() {
    const fc = (HF.CFG && HF.CFG.feedback) || {};
    let device = '';
    try { device = String(HF.store.get('feedback_key', '') || ''); } catch (e) { }
    return {
      key: (device || String(fc.accessKey || '')).trim(),
      endpoint: fc.endpoint || 'https://api.web3forms.com/submit'
    };
  }

  function validEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim()); }

  function pendingRequest() {
    try { return HF.store.get('license_request', null); } catch (e) { return null; }
  }

  /**
   * Registra la solicitud de licencia.
   * Devuelve { ok, sent?, queued?, msg? }. Nunca lanza.
   */
  function requestLicense(info) {
    info = info || {};
    const email = String(info.email || '').trim();
    if (!validEmail(email)) return Promise.resolve({ ok: false, msg: t('PAY_ERR_EMAIL', 'Escribe un correo válido') });

    const kind = info.kind === 'buy' ? 'buy' : 'paid';
    const record = {
      at: Date.now(),
      kind: kind,
      email: email,
      reference: String(info.reference || '').trim(),
      player_id: playerId(),
      platform: getPlatform()
    };
    try { HF.store.set('license_request', record); } catch (e) { }

    const box = mailbox();
    const offline = (typeof navigator !== 'undefined' && navigator.onLine === false) || typeof G.fetch !== 'function';
    if (!box.key || offline) return Promise.resolve({ ok: true, queued: true });

    const title = kind === 'buy' ? 'solicitud de compra' : 'registro de licencia';
    const body = {
      access_key: box.key,
      subject: 'Federati · ' + title,
      from_name: 'Federati',
      name: record.player_id || 'Jugador',
      email: email,
      message: 'Federati · ' + title + '\n' +
        'Jugador: ' + (record.player_id || '(sin ID)') + '\n' +
        'Correo: ' + email + '\n' +
        (kind === 'paid' ? 'Referencia de pago: ' + (record.reference || '(sin referencia)') + '\n' : '') +
        'Plataforma: ' + record.platform,
      language: HF.lang ? HF.lang() : 'es',
      app: 'Federati'
    };

    return G.fetch(box.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body)
    }).then(res => {
      if (!res || !res.ok) return { ok: true, queued: true };
      return res.json().catch(() => ({ success: true })).then(j =>
        (j && j.success === false) ? { ok: true, queued: true } : { ok: true, sent: true });
    }).catch(() => ({ ok: true, queued: true }));
  }

  // ---------- comprobación de licencia ----------
  function checkLicense(onDone) {
    if (!HF.cloud || !HF.cloud.verifyLicense) {
      if (HF.toast) HF.toast(t('LICENSE_OFFLINE'));
      return Promise.resolve({ ok: false, offline: true });
    }
    if (HF.toast) HF.toast(t('LICENSE_CHECKING'));
    return Promise.resolve(HF.cloud.verifyLicense(true)).then(r => {
      if (r && r.ok && r.is_premium) {
        if (HF.toast) HF.toast(t('LICENSE_ACTIVE'));
        if (HF.closeModal) HF.closeModal();
        if (HF.go) HF.go('settings');
      } else if (r && r.offline) {
        if (HF.toast) HF.toast(t('LICENSE_OFFLINE'));
      } else {
        if (HF.toast) HF.toast(t('LICENSE_NOT_FOUND'));
      }
      if (onDone) onDone(r);
      return r;
    }).catch(() => {
      if (HF.toast) HF.toast(t('LICENSE_OFFLINE'));
      return { ok: false, offline: true };
    });
  }

  function saveEmail(email) {
    const value = String(email || '').trim();
    if (!validEmail(value)) return Promise.resolve({ ok: false, msg: t('LICENSE_EMAIL_BAD') });
    if (!HF.cloud || !HF.cloud.setRecoveryEmail) {
      return Promise.resolve({ ok: false, offline: true, msg: t('LICENSE_OFFLINE') });
    }
    return Promise.resolve(HF.cloud.setRecoveryEmail(value)).catch(() => ({ ok: false, offline: true }));
  }

  // ---------- modal de compra ----------
  function openPurchase() {
    if (!HF.modal) return;
    if (isPremium()) { openEmail(); return; }
    // En web manda PayPal; en escritorio/móvil se conserva el flujo de tienda
    // o la solicitud manual de siempre.
    if (isPayPal()) { openPayPal(); return; }
    openLegacyPurchase();
  }

  function openLegacyPurchase() {
    if (!HF.modal) return;
    if (isPremium()) { openEmail(); return; }

    const p = getPrices();
    // En la web no se usan enlaces de tienda externos: PayPal o solicitud
    // manual. Los enlaces de tienda son para escritorio/móvil.
    const url = getPlatform() === 'web' ? '' : checkoutUrl();
    const hasUrl = !!url;

    HF.modal(`<h3>👑 ${t('PAY_TITLE', 'Licencia completa')}</h3>
      <p class="dim small">${t('PAY_INTRO')}</p>
      <div class="card" style="margin:6px 0">
        <div class="row"><span class="grow">${t('PAY_PRODUCT')}</span><b>${esc(p.amount)}</b></div>
        <div class="row"><span class="grow">${t('PAY_STORE')}</span><b>${esc(p.store)}</b></div>
      </div>
      <div class="dim small">${t('PAY_SUPPORT')}</div>
      ${hasUrl ? '' : `<div class="dim small" style="margin-top:4px">${t('PAY_MANUAL_NOTE')}</div>`}
      <button id="payGo" class="pri" style="width:100%;margin-top:8px">${hasUrl ? t('PAY_BUY') : t('PAY_REQUEST')}</button>
      <button id="payAlready" style="width:100%;margin-top:6px">${t('PAY_ALREADY')}</button>
      <button id="payCheck" style="width:100%;margin-top:6px">${t('PAY_CHECK')}</button>
      <div class="row" style="margin-top:6px"><button id="payClose" style="width:100%">${t('CLOSE', 'Cerrar')}</button></div>`, m => {
      const close = m.querySelector('#payClose');
      if (close) close.onclick = HF.closeModal;

      const go = m.querySelector('#payGo');
      if (go) go.onclick = () => {
        if (hasUrl) {
          openExternal(withClientRef(url));
          if (HF.toast) HF.toast(t('PAY_GO_DESC', 'Completa el pago en la pestaña que se ha abierto.'), 3200);
          return;
        }
        openRegister({ kind: 'buy' });
      };

      const already = m.querySelector('#payAlready');
      if (already) already.onclick = () => openRegister({ kind: 'paid' });

      const check = m.querySelector('#payCheck');
      if (check) check.onclick = () => checkLicense();
    });
  }

  // ---------- registro / solicitud manual ----------
  function openRegister(opts) {
    if (!HF.modal) return;
    opts = opts || {};
    const kind = opts.kind === 'buy' ? 'buy' : 'paid';
    const rec = pendingRequest();
    const email = opts.email || (rec && rec.email) || (HF.cloud && HF.cloud.recoveryEmail ? HF.cloud.recoveryEmail() : '');
    const ref = opts.reference || (rec && rec.reference) || '';
    const intro = kind === 'buy' ? t('PAY_REG_BUY') : t('PAY_REG_PAID');

    HF.modal(`<h3>✉️ ${t('PAY_REG_TITLE')}</h3>
      <p class="dim small">${intro}</p>
      <label>${t('PAY_REG_EMAIL')}</label>
      <input id="payMail" type="email" autocomplete="email" placeholder="tu_correo@ejemplo.com" value="${esc(email)}">
      ${kind === 'paid' ? `<label>${t('PAY_REG_REF')}</label>
        <input id="payRef" autocomplete="off" placeholder="${t('PAY_REG_REF_PH')}" value="${esc(ref)}">` : ''}
      <div class="dim small" style="margin-top:4px">${t('PAY_REG_ID')}: <b>${esc(playerId() || '—')}</b></div>
      <div class="dim small" style="margin-top:2px">${t('PAY_REG_PRIVACY')}</div>
      <div class="neg small" id="payErr"></div>
      <div class="row"><button id="payBack">${t('CLOSE', 'Cerrar')}</button><button id="paySend" class="pri grow">${t('PAY_SEND')}</button></div>`, m => {
      const mail = m.querySelector('#payMail');
      const reference = m.querySelector('#payRef');
      const err = m.querySelector('#payErr');
      const send = m.querySelector('#paySend');
      const back = m.querySelector('#payBack');
      if (back) back.onclick = () => openPurchase();

      const submit = () => {
        if (send && send.disabled) return;
        const value = mail ? String(mail.value || '').trim() : '';
        if (!validEmail(value)) {
          if (err) err.textContent = t('PAY_ERR_EMAIL');
          if (mail && mail.focus) mail.focus();
          return;
        }
        if (err) err.textContent = '';
        if (send) { send.disabled = true; send.textContent = t('PAY_SENDING'); }

        const registration = requestLicense({ email: value, reference: reference ? reference.value : '', kind: kind });
        // El correo de respaldo se guarda en paralelo: así la cuenta queda
        // localizable aunque la solicitud aún esté en cola.
        const saving = saveEmail(value).catch(() => null);
        Promise.all([registration, saving]).then(([r]) => {
          if (!r || r.ok === false) {
            if (send) { send.disabled = false; send.textContent = t('PAY_SEND'); }
            if (err) err.textContent = (r && r.msg) || t('PAY_ERR_SEND');
            return;
          }
          showSent(!!r.sent, kind);
        }).catch(() => {
          if (send) { send.disabled = false; send.textContent = t('PAY_SEND'); }
          if (err) err.textContent = t('PAY_ERR_SEND');
        });
      };

      if (send) send.onclick = submit;
      if (mail) mail.onkeydown = e => { if (e.key === 'Enter') submit(); };
    });
  }

  function showSent(sent, kind) {
    const detail = sent
      ? (kind === 'buy' ? t('PAY_SENT_BUY') : t('PAY_SENT_DESC'))
      : t('PAY_SENT_QUEUED');
    HF.modal(`<h3>✅ ${t('PAY_SENT_TITLE')}</h3>
      <p class="dim small">${detail}</p>
      ${kind === 'buy' ? '' : `<button id="payDoneCheck" class="pri" style="width:100%">${t('PAY_CHECK')}</button>`}
      <button id="payDoneClose" style="width:100%;margin-top:6px">${t('CLOSE', 'Cerrar')}</button>`, m => {
      const check = m.querySelector('#payDoneCheck');
      if (check) check.onclick = () => checkLicense();
      const close = m.querySelector('#payDoneClose');
      if (close) close.onclick = HF.closeModal;
    });
  }

  // ---------- correo de respaldo (usuario Premium) ----------
  function openEmail() {
    if (!HF.modal) return;
    const cur = (HF.cloud && HF.cloud.recoveryEmail) ? HF.cloud.recoveryEmail() : '';
    HF.modal(`<h3>✉️ ${t('LICENSE_EMAIL')}</h3>
      <p class="dim small">${t('LICENSE_EMAIL_DESC')}</p>
      <input id="emMail" type="email" autocomplete="email" placeholder="tu_correo@ejemplo.com" value="${esc(cur)}">
      <div class="neg small" id="emErr"></div>
      <div class="row"><button id="emNo">${t('CLOSE', 'Cerrar')}</button><button id="emGo" class="pri grow">${t('LICENSE_SAVE')}</button></div>`, m => {
      const input = m.querySelector('#emMail');
      const err = m.querySelector('#emErr');
      const save = m.querySelector('#emGo');
      const no = m.querySelector('#emNo');
      if (no) no.onclick = HF.closeModal;
      const submit = () => {
        const value = input ? String(input.value || '').trim() : '';
        if (!validEmail(value)) {
          if (err) err.textContent = t('LICENSE_EMAIL_BAD');
          if (input && input.focus) input.focus();
          return;
        }
        if (err) err.textContent = '';
        if (save) { save.disabled = true; save.textContent = t('PAY_SENDING'); }
        saveEmail(value).then(r => {
          if (r && r.ok) {
            HF.closeModal();
            if (HF.toast) HF.toast(t('LICENSE_EMAIL_OK'));
            if (HF.go) HF.go('settings');
            return;
          }
          if (save) { save.disabled = false; save.textContent = t('LICENSE_SAVE'); }
          if (err) err.textContent = (r && r.offline) ? t('LICENSE_OFFLINE') : ((r && r.msg) || t('LICENSE_EMAIL_ERR'));
        });
      };
      if (save) save.onclick = submit;
      if (input) input.onkeydown = e => { if (e.key === 'Enter') submit(); };
    });
  }

  HF.payment = {
    PRICES: PRICES,
    getPlatform: getPlatform,
    getPrices: getPrices,
    checkoutUrl: checkoutUrl,
    isPromo: isPromo,
    isPremium: isPremium,
    isPayPal: isPayPal,
    paypalAmount: paypalAmount,
    paypalCurrency: paypalCurrency,
    loadPayPalSdk: loadPayPalSdk,
    pendingOrder: pendingOrder,
    applyPremium: applyPremium,
    playerId: playerId,
    openPurchase: openPurchase,
    openLegacyPurchase: openLegacyPurchase,
    openRegister: openRegister,
    openEmail: openEmail,
    requestLicense: requestLicense,
    pendingRequest: pendingRequest,
    checkLicense: checkLicense,
    saveEmail: saveEmail,
    validEmail: validEmail,
    _withClientRef: withClientRef
  };
})(typeof window !== 'undefined' ? window : globalThis);
