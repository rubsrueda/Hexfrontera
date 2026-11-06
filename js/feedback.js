/* Comentarios de los jugadores (opcionales, en los 13 idiomas).
   - Formulario modal con nombre y correo OPCIONALES y mensaje obligatorio.
   - Envío a Web3Forms (config.feedback.accessKey). Si no hay clave o no hay
     red, el comentario se guarda en el dispositivo (feedback_outbox) y se
     reintenta al arrancar o al recuperar conexión: nada se pierde.
   - `HF.feedback.prompt('map')` muestra un aviso discreto (con enfriamiento)
     al guardar un mapa; el Hub tiene un botón flotante y el fin de partida un
     acceso directo.
   Script global: sin módulos ES ni bundlers. */
(function (G) {
  const HF = G.HF;
  if (!HF) return;

  const KEY_OUT = 'feedback_outbox';
  const KEY_PROMPT = 'feedback_prompt_at';
  const KEY_LAST = 'feedback_last_at';
  const MAX_OUT = 20;
  const PROMPT_GAP = 3 * 864e5;          // un aviso cada 3 días como mucho
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const get = (k, d) => HF.store.get(k, d);
  const set = (k, v) => HF.store.set(k, v);
  const t = k => HF.t(k);
  const cfg = () => (HF.CFG && HF.CFG.feedback) || {};
  const online = () => !(typeof navigator !== 'undefined' && navigator.onLine === false);
  // Clave del buzón: la del dispositivo (Ajustes → Comentarios) manda sobre la
  // que venga en config.js. Así se puede probar o configurar la APK sin
  // recompilar, y la build publicada sigue trayendo la clave para todos.
  const key = () => String(HF.store.get('feedback_key', '') || cfg().accessKey || '').trim();
  const keySource = () => HF.store.get('feedback_key', '') ? 'device' : (cfg().accessKey ? 'config' : 'none');

  function outbox() {
    const list = get(KEY_OUT, []);
    return Array.isArray(list) ? list : [];
  }
  function queue(entry) {
    const list = outbox();
    list.push(Object.assign({
      id: 'fb' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      at: Date.now(), lang: HF.lang()
    }, entry));
    while (list.length > MAX_OUT) list.shift();
    set(KEY_OUT, list);
    return list.length;
  }
  // Devuelve { ok, retry }: retry=true cuando tiene sentido reintentar después
  // (sin red, 5xx); false ante un rechazo definitivo (clave inválida, 4xx).
  function deliver(entry) {
    const c = cfg();
    if (!key() || !online() || typeof G.fetch !== 'function') {
      return Promise.resolve({ ok: false, retry: true });
    }
    const body = {
      access_key: key(),
      subject: c.subject || 'Hexfrontier · comentario',
      from_name: 'Hexfrontier',
      name: entry.name || '',
      email: entry.email || '',
      message: entry.message,
      language: entry.lang || HF.lang(),
      app: 'Hexfrontier'
    };
    return G.fetch(c.endpoint || 'https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body)
    }).then(res => {
      if (!res || !res.ok) {
        const status = res && res.status;
        return { ok: false, retry: !(status >= 400 && status < 500) };
      }
      return res.json().catch(() => ({ success: true }))
        .then(j => (j && j.success === false) ? { ok: false, retry: false } : { ok: true });
    }).catch(() => ({ ok: false, retry: true }));
  }

  // Formulario compartido por el modal normal (Hub) y la capa apilada
  // (fin de partida / aviso), para no destruir la pantalla que hay detrás.
  function formHTML(opts) {
    return `<h3>${t('FB_TITLE')}</h3>
      <p class="dim small">${t('FB_INTRO')}</p>
      ${key() ? '' : `<p class="small" style="color:var(--acc)">${t('FB_LOCAL')}</p>`}
      <label>${t('FB_NAME')}</label>
      <input id="fbName" maxlength="40" autocomplete="nickname" placeholder="${HF.esc(t('FB_NAME_PH'))}" value="${HF.esc(opts.name || '')}">
      <label>${t('FB_EMAIL')}</label>
      <input id="fbEmail" type="email" maxlength="80" autocomplete="email" placeholder="email@example.com" value="${HF.esc(opts.email || '')}">
      <label>${t('FB_MESSAGE')}</label>
      <textarea id="fbMsg" maxlength="2000" style="min-height:110px"></textarea>
      <input id="fbHp" type="text" name="botcheck" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0">
      <p class="dim small" style="margin-top:2px">${t('FB_PRIVACY')}</p>
      <div class="neg small" id="fbErr"></div>
      <div class="row"><button id="fbNo">${t('FB_LATER')}</button><button id="fbGo" class="pri grow">${t('FB_SEND')}</button></div>`;
  }

  function bindForm(root, opts, close) {
    const name = root.querySelector('#fbName');
    const email = root.querySelector('#fbEmail');
    const msg = root.querySelector('#fbMsg');
    const err = root.querySelector('#fbErr');
    const go = root.querySelector('#fbGo');
    const hp = root.querySelector('#fbHp');
    const fail = key => {
      HF.sfx('error');
      if (err) err.textContent = t(key);
      if (key === 'FB_REQUIRED' && msg && msg.focus) msg.focus();
    };
    const submit = () => {
      if (go && go.disabled) return;
      // Honeypot: un humano no rellena este campo oculto.
      if (hp && hp.value) { close(); HF.toast(t('FB_OK'), 2000); return; }
      const v = HF.feedback.validate({ message: msg ? msg.value : '', email: email ? email.value : '' });
      if (!v.ok) return fail(v.key);
      if (err) err.textContent = '';
      if (go) { go.disabled = true; go.textContent = t('FB_SENDING'); }
      HF.feedback.send({ name: name ? name.value.trim() : '', email: v.email, message: v.message })
        .then(r => {
          if (r.ok && !r.queued) { close(); HF.toast(t('FB_OK'), 3200); return; }
          if (r.ok && r.queued) {
            close();
            HF.toast(r.reason === 'config' ? t('FB_LOCAL') : t('FB_ERR'), 4200);
            return;
          }
          if (go) { go.disabled = false; go.textContent = t('FB_SEND'); }
          fail('FB_ERR');
        })
        .catch(() => {
          if (go) { go.disabled = false; go.textContent = t('FB_SEND'); }
          fail('FB_ERR');
        });
    };
    if (go) go.onclick = submit;
    const no = root.querySelector('#fbNo');
    if (no) no.onclick = close;
    if (msg) msg.onkeydown = e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(); };
  }

  HF.feedback = {
    // Validación pura (testeable): mensaje obligatorio, correo opcional válido.
    validate(entry) {
      const message = String((entry && entry.message) || '').trim();
      const email = String((entry && entry.email) || '').trim();
      if (!message) return { ok: false, key: 'FB_REQUIRED' };
      if (email && !EMAIL_RE.test(email)) return { ok: false, key: 'FB_EMAIL_BAD' };
      return { ok: true, message, email };
    },

    async send(entry) {
      if (!key()) {
        queue(entry);
        return { ok: true, queued: true, reason: 'config' };
      }
      const r = await deliver(entry);
      if (r.ok) { set(KEY_LAST, Date.now()); return { ok: true }; }
      if (r.retry) {
        queue(entry);
        return { ok: true, queued: true, reason: 'network' };
      }
      return { ok: false, reason: 'rejected' };
    },

    // Reintenta lo pendiente (arranque, evento `online`, tras configurar clave).
    async flush() {
      const list = outbox();
      if (!list.length || !key() || !online()) return 0;
      const rest = [];
      let sent = 0;
      for (const entry of list) {
        const r = await deliver(entry);
        if (r.ok) sent++;
        else rest.push(entry);          // se conserva también si el rechazo es definitivo
      }
      set(KEY_OUT, rest);
      if (sent) set(KEY_LAST, Date.now());
      return sent;
    },

    // `stack:true` abre la capa apilada (encima de otra pantalla, sin
    // destruirla); sin él usa el modal compartido de la app.
    open(opts) {
      opts = opts || {};
      if (opts.stack && G.document && G.document.body && G.document.createElement) {
        const doc = G.document;
        const overlay = doc.createElement('div');
        overlay.className = 'fb-overlay';
        const sheet = doc.createElement('div');
        sheet.className = 'card fb-sheet';
        sheet.innerHTML = formHTML(opts);
        overlay.appendChild(sheet);
        doc.body.appendChild(overlay);
        const remove = () => { try { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); } catch (e) { } };
        overlay.onclick = e => { if (e.target === overlay) remove(); };
        bindForm(sheet, opts, remove);
        return overlay;
      }
      HF.modal(formHTML(opts), m => bindForm(m, opts, HF.closeModal));
      return null;
    },

    // Aviso discreto y no bloqueante (p. ej. tras guardar un mapa). Con
    // enfriamiento para no insistir; nunca se apila más de uno.
    prompt(kind) {
      const last = +get(KEY_PROMPT, 0) || 0;
      if (Date.now() - last < PROMPT_GAP) return false;
      const doc = G.document;
      if (!doc || !doc.body || !doc.createElement || !doc.body.appendChild) return false;
      if (doc.getElementById && doc.getElementById('fbPrompt')) return false;
      const box = doc.createElement('div');
      box.id = 'fbPrompt';
      box.className = 'fb-prompt';
      if (box.setAttribute) box.setAttribute('data-kind', kind || '');
      box.innerHTML = `<div class="grow">💬 ${HF.esc(t('FB_PROMPT'))}</div>
        <button id="fbPromptGo" class="pri">${HF.esc(t('FB_CTA'))}</button>
        <button id="fbPromptNo" aria-label="${HF.esc(t('FB_LATER'))}">✕</button>`;
      doc.body.appendChild(box);
      const remove = () => { try { if (box.parentNode) box.parentNode.removeChild(box); } catch (e) { } };
      const go = box.querySelector && box.querySelector('#fbPromptGo');
      const no = box.querySelector && box.querySelector('#fbPromptNo');
      if (go) go.onclick = () => { remove(); HF.feedback.open({ stack: true }); };
      if (no) no.onclick = remove;
      if (G.setTimeout) G.setTimeout(remove, 14000);
      set(KEY_PROMPT, Date.now());
      return true;
    },

    pending: () => outbox().length,
    outbox: () => outbox(),
    clear: () => { set(KEY_OUT, []); return true; },
    lastSentAt: () => +get(KEY_LAST, 0) || 0,
    // Clave del buzón: la del dispositivo manda sobre config.js.
    hasKey: () => !!key(),
    keySource,
    setKey(value) {
      const v = String(value || '').trim();
      if (v) set('feedback_key', v); else HF.store.del('feedback_key');
      return key();
    }
  };

  // Reintento diferido al arrancar y al recuperar la conexión.
  if (G.setTimeout) G.setTimeout(() => { try { HF.feedback.flush(); } catch (e) { } }, 2500);
  if (G.addEventListener) {
    G.addEventListener('online', () => { try { HF.feedback.flush(); } catch (e) { } });
  }
})(typeof window !== 'undefined' ? window : globalThis);
