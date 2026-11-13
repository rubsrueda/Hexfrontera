/* Federati · Módulo de encuestas y eventos dinámicos.
   ----------------------------------------------------------------------------
   La base de datos manda: el juego solo pregunta por un disparador y pinta lo
   que devuelve get_active_event_questions(event_type).

     EventFeedbackModal.checkAndRender('MATCH_OVER')

   - Si no hay campaña activa AHORA para ese evento, no se muestra nada.
   - El set de preguntas se renderiza según question_type:
       RATING → 5 estrellas · SELECT → botones/desplegable · BOOLEAN → switch ·
       TEXT → textarea.
   - collect_user_info añade correo y alias opcionales; allow_comments añade el
     comentario final.
   - El envío es una sola RPC atómica: fn_ef_submit_response (cabecera +
     detalles). Si no hay red, la respuesta queda en una cola local y se
     reintenta al reconectar.
   - Un mismo campaign_event no se vuelve a preguntar si ya se respondió, y
     respeta un enfriamiento tras «Ahora no».

   Script global, sin módulos ES. Depende de util.js, config.js, i18n.js,
   screens.js y cloud.js, que se cargan antes en index.html. */
(function (G) {
  const HF = G.HF;
  if (!HF) return;
  const doc = G.document;

  // ---------------------------------------------------------------------------
  // Constantes y configuración
  // ---------------------------------------------------------------------------
  const SEEN_KEY = 'ef_seen';
  const OUT_KEY = 'ef_outbox';
  const MAX_OUT = 20;
  const MAX_SEEN = 60;
  const SEEN_TTL = 180 * 864e5;          // 180 días
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const VALID_TYPES = { RATING: 1, SELECT: 1, BOOLEAN: 1, TEXT: 1 };
  const MAX_QUESTIONS = 20;

  const cfg = () => (HF.CFG && HF.CFG.eventFeedback) || {};
  const t = (key, fallback) => (HF.t ? HF.t(key, fallback) : (fallback != null ? fallback : key));
  // Una pregunta/opción puede guardarse como texto literal o como clave de
  // traducción (`survey.match_over.q1_lost`). Las claves se resuelven con el
  // idioma del jugador; si falta, HF.t cae a inglés y, por último, a la clave.
  const SURVEY_KEY_RE = /^survey\.[a-z0-9_.-]+$/i;
  function tr(value) {
    const s = String(value == null ? '' : value).trim();
    if (!SURVEY_KEY_RE.test(s)) return s;
    const out = t(s, null);
    if (!out || out === s) {
      warnOnce('i18n:' + s, 'falta traducción para ' + s);
      return s;
    }
    return out;
  }
  const storeGet = (k, d) => (HF.store ? HF.store.get(k, d) : d);
  const storeSet = (k, v) => { if (HF.store) HF.store.set(k, v); };
  const now = () => Date.now();
  const sleep = ms => new Promise(resolve => G.setTimeout(resolve, Math.max(0, ms | 0)));

  let current = null;                     // modal abierto: { overlay, key, … }
  let busy = false;                       // checkAndRender en vuelo
  let lastFocus = null;
  const sessionShown = Object.create(null);
  const warned = Object.create(null);

  // ---------------------------------------------------------------------------
  // Estado local: vistos/respondidos y cola de envío
  // ---------------------------------------------------------------------------
  function seen() {
    const raw = storeGet(SEEN_KEY, {});
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const cut = now() - SEEN_TTL;
    const out = {};
    for (const k in raw) {
      const rec = raw[k];
      if (!rec || typeof rec !== 'object') continue;
      if (!(+rec.at > cut)) continue;
      out[k] = { at: +rec.at || 0, status: rec.status === 'answered' ? 'answered' : 'dismissed' };
    }
    return out;
  }

  function saveSeen(map) {
    const keys = Object.keys(map);
    if (keys.length > MAX_SEEN) {
      keys.sort((a, b) => (+map[a].at || 0) - (+map[b].at || 0));
      for (const k of keys.slice(0, keys.length - MAX_SEEN)) delete map[k];
    }
    storeSet(SEEN_KEY, map);
  }

  function markSeen(key, status) {
    if (!key) return;
    const map = seen();
    map[key] = { at: now(), status: status === 'answered' ? 'answered' : 'dismissed' };
    saveSeen(map);
  }

  function pending() {
    const raw = storeGet(OUT_KEY, []);
    return Array.isArray(raw) ? raw.filter(x => x && x.payload && x.key) : [];
  }

  function savePending(list) {
    storeSet(OUT_KEY, list.slice(-MAX_OUT));
  }

  function queuePending(payload, key, eventType) {
    const list = pending().filter(x => x.key !== key);
    list.push({
      id: 'ef' + now().toString(36) + Math.random().toString(36).slice(2, 6),
      at: now(), key, event_type: eventType || '', payload
    });
    savePending(list);
    return list.length;
  }

  function dropPending(key) {
    savePending(pending().filter(x => x.key !== key));
  }

  function dismissDays() {
    const d = +cfg().dismissDays;
    return d >= 0 ? d : 3;
  }

  function shouldSkip(key) {
    const rec = seen()[key];
    if (rec) {
      if (rec.status === 'answered') return 'answered';
      if (now() - rec.at < dismissDays() * 864e5) return 'dismissed';
    }
    if (pending().some(x => x.key === key)) return 'pending';
    return '';
  }

  // ---------------------------------------------------------------------------
  // Normalización defensiva de la respuesta de la RPC
  // ---------------------------------------------------------------------------
  function normalizeType(value) {
    const s = String(value == null ? '' : value).trim().toUpperCase();
    return /^[A-Z][A-Z0-9_]{2,49}$/.test(s) ? s : '';
  }

  function parseMaybeJson(value) {
    if (typeof value !== 'string') return value;
    const s = value.trim();
    if (!s) return null;
    try { return JSON.parse(s); } catch (e) { return null; }
  }

  function normalizePayload(raw) {
    let d = parseMaybeJson(raw);
    if (Array.isArray(d)) d = d[0];
    if (!d || typeof d !== 'object') return null;
    d.questions = parseMaybeJson(d.questions);
    if (!Array.isArray(d.questions)) d.questions = [];
    return d;
  }

  function normalizeOptions(value, labels) {
    value = parseMaybeJson(value);
    labels = parseMaybeJson(labels);
    if (!Array.isArray(value)) return null;
    const out = [];
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      // La RPC nueva manda option_labels ya resueltos. Si no vienen (servidor
      // antiguo), se resuelven aquí con HF.t / fallback.
      const dbLabel = Array.isArray(labels) && labels[i] != null && String(labels[i]).trim()
        ? String(labels[i])
        : null;
      if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
        const s = String(item).trim();
        if (!s) continue;
        out.push({ value: s, label: dbLabel != null ? dbLabel : tr(s) });
      } else if (item && typeof item === 'object') {
        // Formato extendido tolerado: { value, label }. El valor es lo que se
        // guarda; la etiqueta es lo que ve el jugador.
        const v = item.value == null ? item.id : item.value;
        if (v == null) continue;
        const rawLabel = item.label == null ? v : item.label;
        out.push({ value: String(v), label: dbLabel != null ? dbLabel : tr(rawLabel) });
      }
    }
    return out.length ? out : null;
  }

  function normalizeQuestions(list) {
    const out = [];
    const seenIds = Object.create(null);
    const src = Array.isArray(list) ? list : [];
    for (const item of src) {
      if (!item || typeof item !== 'object') continue;
      const id = String(item.question_id || '').trim();
      if (!id || seenIds[id]) continue;
      const type = String(item.question_type || '').toUpperCase();
      if (!VALID_TYPES[type]) continue;
      const text = String(item.question_text || '').trim();
      if (!text) continue;
      const dbLabel = String(item.question_label || '').trim();
      let options = normalizeOptions(item.options, item.option_labels);
      if (type === 'SELECT' && !options) continue;      // sin opciones no es usable
      if (type !== 'SELECT') {
        // Para RATING solo interesan 5 etiquetas; el resto de tipos no usa options.
        options = type === 'RATING' && options && options.length === 5 ? options : null;
      }
      seenIds[id] = 1;
      out.push({
        question_id: id,
        question_text: text,
        question_label: dbLabel || tr(text),
        question_type: type,
        options,
        display_order: +item.display_order || 1,
        is_required: item.is_required === true
      });
    }
    out.sort((a, b) => (a.display_order - b.display_order) || (a.question_id < b.question_id ? -1 : 1));
    return out.slice(0, MAX_QUESTIONS);
  }

  function optionText(opt) {
    return tr(opt && typeof opt === 'object' ? opt.label : opt);
  }
  function optionValue(opt) {
    return opt && typeof opt === 'object' ? String(opt.value) : String(opt);
  }

  // ---------------------------------------------------------------------------
  // Validación pura (testeable sin DOM)
  // ---------------------------------------------------------------------------
  function validate(questions, values, meta) {
    const errors = Object.create(null);
    const answers = [];
    const src = Array.isArray(questions) ? questions : [];
    for (const q of src) {
      const raw = values ? values[q.question_id] : null;
      const value = raw == null ? '' : String(raw).trim();
      const required = q.is_required === true;
      if (!value) {
        if (required) errors[q.question_id] = t('EF_REQUIRED');
        continue;
      }
      if (q.question_type === 'RATING' && !/^[1-5]$/.test(value)) {
        errors[q.question_id] = t('EF_ERR_RATING');
        continue;
      }
      if (q.question_type === 'BOOLEAN' && value !== 'true' && value !== 'false') {
        errors[q.question_id] = t('EF_ERR_BOOLEAN');
        continue;
      }
      if (q.question_type === 'SELECT') {
        const opts = q.options || [];
        if (!opts.some(o => optionValue(o) === value)) {
          errors[q.question_id] = t('EF_ERR_SELECT');
          continue;
        }
      }
      if (q.question_type === 'TEXT' && value.length > 1000) {
        errors[q.question_id] = t('EF_ERR_TEXT');
        continue;
      }
      answers.push({ question_id: q.question_id, value });
    }

    const m = meta || {};
    const email = m.collect ? String(m.email || '').trim() : '';
    if (m.collect && email && !EMAIL_RE.test(email)) errors._email = t('EF_EMAIL_BAD');
    if (!answers.length && !(m.allowComments && String(m.comment || '').trim())) {
      errors._global = t('EF_ERR_EMPTY');
    }
    return { ok: !Object.keys(errors).length, errors, answers };
  }

  function buildPayload(data, answers, meta) {
    const m = meta || {};
    const event = (data && data.event) || {};
    return {
      p_campaign_event_id: event.campaign_event_id || null,
      p_answers: Array.isArray(answers) ? answers : [],
      p_email: m.collect ? (String(m.email || '').trim() || null) : null,
      p_alias: m.collect ? (String(m.alias || '').trim() || null) : null,
      p_comment: m.allowComments ? (String(m.comment || '').trim() || null) : null
    };
  }

  const ERROR_KEYS = {
    EVENT_NOT_ACTIVE: 'EF_ERROR_EVENT',
    EMPTY_RESPONSE: 'EF_ERR_EMPTY',
    REQUIRED_MISSING: 'EF_REQUIRED',
    INVALID_EMAIL: 'EF_EMAIL_BAD',
    INVALID_RATING: 'EF_ERR_RATING',
    INVALID_BOOLEAN: 'EF_ERR_BOOLEAN',
    INVALID_OPTION: 'EF_ERR_SELECT',
    INVALID_TEXT: 'EF_ERR_TEXT',
    INVALID_ANSWER: 'EF_ERROR_GENERIC',
    INVALID_ANSWERS: 'EF_ERROR_GENERIC',
    UNKNOWN_QUESTION: 'EF_ERROR_GENERIC',
    DUPLICATE_QUESTION: 'EF_ERROR_GENERIC',
    TOO_MANY_ANSWERS: 'EF_ERROR_GENERIC',
    INVALID_ALIAS: 'EF_ERROR_GENERIC',
    INVALID_COMMENT: 'EF_ERROR_GENERIC',
    INTERNAL: 'EF_ERROR_GENERIC'
  };

  function errorText(code) {
    return t(ERROR_KEYS[code] || 'EF_ERROR_GENERIC');
  }

  // ---------------------------------------------------------------------------
  // Red: lectura y envío
  // ---------------------------------------------------------------------------
  function online() {
    if (typeof G.navigator !== 'undefined' && G.navigator && G.navigator.onLine === false) return false;
    if (!HF.cloud || typeof HF.cloud.rpc !== 'function') return false;
    return HF.cloud.online !== false;
  }

  function warnOnce(key, message) {
    if (warned[key]) return;
    warned[key] = 1;
    if (G.console && G.console.warn) G.console.warn('[event-feedback] ' + message);
  }

  async function callSubmit(payload) {
    if (!HF.cloud || typeof HF.cloud.rpc !== 'function') return { ok: false, retry: false, error: 'RPC_MISSING' };
    let r;
    try {
      r = await HF.cloud.rpc('fn_ef_submit_response', payload);
    } catch (e) {
      return { ok: false, retry: true };
    }
    const data = normalizePayload(r && r.data);
    if (r && r.ok && data && data.ok === true) return { ok: true, data };
    if (data && data.ok === false) return { ok: false, retry: false, error: String(data.error || 'ERROR') };
    if (!r || r.offline || r.status === 0 || (r.status >= 500)) return { ok: false, retry: true };
    if (r.status === 404) return { ok: false, retry: false, error: 'RPC_MISSING' };
    return { ok: false, retry: false, error: 'ERROR' };
  }

  async function flush() {
    if (!online()) return 0;
    const list = pending();
    if (!list.length) return 0;
    const keep = [];
    let sent = 0;
    for (const item of list) {
      const r = await callSubmit(item.payload);
      if (r.ok) {
        sent++;
        markSeen(item.key, 'answered');
        continue;
      }
      if (r.retry) {
        keep.push(item);
        if (!online()) {                       // se cayó la red: conservar el resto
          const rest = list.slice(list.indexOf(item) + 1);
          for (const x of rest) keep.push(x);
          break;
        }
      } else {
        // Rechazo definitivo (campaña cerrada, pregunta eliminada…): no se
        // reintenta para siempre; queda constancia en consola.
        warnOnce('drop:' + item.key, 'se descarta una respuesta que el servidor rechazó (' + (r.error || 'ERROR') + ')');
      }
    }
    savePending(keep);
    return sent;
  }

  // ---------------------------------------------------------------------------
  // Utilidades de DOM
  // ---------------------------------------------------------------------------
  function el(tag, className, text) {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = String(text);
    return node;
  }

  function attr(node, name, value) {
    if (!node) return node;
    if (node.setAttribute) node.setAttribute(name, String(value));
    else node[name] = value;
    return node;
  }

  function addClass(node, name) {
    if (!node) return;
    if (node.classList) node.classList.add(name);
    else node.className = (node.className ? node.className + ' ' : '') + name;
  }

  function removeClass(node, name) {
    if (!node) return;
    if (node.classList) node.classList.remove(name);
    else node.className = String(node.className || '').split(/\s+/).filter(x => x && x !== name).join(' ');
  }

  function hasClass(node, name) {
    if (!node) return false;
    if (node.classList) return node.classList.contains(name);
    return (' ' + String(node.className || '') + ' ').indexOf(' ' + name + ' ') >= 0;
  }

  function toggleClass(node, name, on) {
    if (on) addClass(node, name); else removeClass(node, name);
  }

  function button(className, text, onClick) {
    const b = el('button', className, text);
    b.type = 'button';
    if (onClick) b.onclick = onClick;
    return b;
  }

  function metaFor(data) {
    const event = (data && data.event) || {};
    return {
      collect: event.collect_user_info === true,
      allowComments: event.allow_comments === true
    };
  }

  // ---------------------------------------------------------------------------
  // Render del modal
  // ---------------------------------------------------------------------------
  function progressText(answered, total) {
    return t('EF_ANSWERED').replace('{a}', String(answered)).replace('{b}', String(total));
  }

  function renderModal(data, questions, ctx) {
    return new Promise(resolve => {
      const campaign = data.campaign || {};
      const state = {
        values: Object.create(null),
        cards: Object.create(null),
        sending: false
      };

      const overlay = el('div', 'ef-overlay');
      attr(overlay, 'role', 'presentation');
      const sheet = el('div', 'ef-sheet');
      attr(sheet, 'role', 'dialog');
      attr(sheet, 'aria-modal', 'true');
      attr(sheet, 'aria-labelledby', 'efTitle');

      // Cabecera ---------------------------------------------------------------
      const head = el('div', 'ef-head');
      const headText = el('div', 'ef-head-text');
      const campaignName = String(campaign.name_label || '').trim() ||
        (campaign.name ? tr(campaign.name) : '');
      const campaignDesc = String(campaign.description_label || '').trim() ||
        (campaign.description ? tr(campaign.description) : '');
      headText.appendChild(el('div', 'ef-kicker', campaignName || t('EF_KICKER')));
      const title = el('h3', 'ef-title', t('EF_TITLE'));
      title.id = 'efTitle';
      headText.appendChild(title);
      headText.appendChild(el('p', 'ef-desc', campaignDesc || t('EF_INTRO')));
      head.appendChild(headText);
      const closeBtn = button('ef-close', '✕', () => dismiss());
      attr(closeBtn, 'aria-label', t('EF_CLOSE'));
      head.appendChild(closeBtn);
      sheet.appendChild(head);

      // Progreso ---------------------------------------------------------------
      const progress = el('div', 'ef-progress');
      const bar = el('div', 'ef-progress-bar');
      const fill = el('span', 'ef-progress-fill');
      bar.appendChild(fill);
      const progressLabel = el('div', 'ef-progress-label', progressText(0, questions.length));
      attr(progressLabel, 'aria-live', 'polite');
      progress.appendChild(bar);
      progress.appendChild(progressLabel);
      sheet.appendChild(progress);

      // Formulario -------------------------------------------------------------
      const form = el('form', 'ef-form');
      form.noValidate = true;
      const body = el('div', 'ef-body');
      form.appendChild(body);

      const errorNodes = Object.create(null);
      const fields = [];

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const card = el('section', 'ef-q');
        attr(card, 'data-qid', q.question_id);
        card.style.animationDelay = (i * 45) + 'ms';

        state.cards[q.question_id] = card;
        const qHead = el('div', 'ef-q-head');
        qHead.appendChild(el('span', 'ef-q-num', String(i + 1)));
        const label = el('div', 'ef-q-text', q.question_label || q.question_text);
        qHead.appendChild(label);
        const tag = el('span', 'ef-q-tag' + (q.is_required ? ' req' : ''), q.is_required ? '*' : t('EF_OPTIONAL'));
        if (q.is_required) attr(tag, 'aria-label', t('EF_REQUIRED'));
        qHead.appendChild(tag);
        card.appendChild(qHead);

        const control = el('div', 'ef-control');
        let first = null;

        if (q.question_type === 'RATING') {
          const stars = el('div', 'ef-stars');
          attr(stars, 'role', 'group');
          attr(stars, 'aria-label', q.question_label || q.question_text);
          const marks = [];
          for (let n = 1; n <= 5; n++) {
            const star = button('ef-star', '★', () => {
              state.values[q.question_id] = String(n);
              paintStars(marks, n);
              clearError(q.question_id);
              updateProgress();
              if (HF.sfx) HF.sfx('star');
            });
            attr(star, 'aria-label', t('EF_STAR').replace('{n}', String(n)));
            attr(star, 'aria-pressed', 'false');
            if (q.options && q.options[n - 1]) star.title = optionText(q.options[n - 1]);
            marks.push(star);
            stars.appendChild(star);
          }
          control.appendChild(stars);
          first = marks[0];

        } else if (q.question_type === 'SELECT') {
          const opts = q.options || [];
          if (opts.length <= 6) {
            const seg = el('div', 'ef-seg');
            attr(seg, 'role', 'group');
            attr(seg, 'aria-label', q.question_label || q.question_text);
            const marks = [];
            for (const opt of opts) {
              const value = optionValue(opt);
              const b = button('ef-opt', optionText(opt), () => {
                state.values[q.question_id] = value;
                marks.forEach(x => { toggleClass(x, 'sel', x === b); attr(x, 'aria-pressed', x === b ? 'true' : 'false'); });
                clearError(q.question_id);
                updateProgress();
                if (HF.sfx) HF.sfx('click');
              });
              attr(b, 'data-value', value);
              attr(b, 'aria-pressed', 'false');
              marks.push(b);
              seg.appendChild(b);
            }
            control.appendChild(seg);
            first = marks[0];
          } else {
            const select = el('select', 'ef-select');
            attr(select, 'aria-label', q.question_label || q.question_text);
            const ph = el('option', '', t('EF_SELECT_PH'));
            ph.value = '';
            select.appendChild(ph);
            for (const opt of opts) {
              const o = el('option', '', optionText(opt));
              o.value = optionValue(opt);
              select.appendChild(o);
            }
            select.onchange = () => {
              state.values[q.question_id] = select.value;
              clearError(q.question_id);
              updateProgress();
            };
            control.appendChild(select);
            first = select;
          }

        } else if (q.question_type === 'BOOLEAN') {
          const wrap = el('div', 'ef-bool');
          const sw = button('ef-switch', '', () => {
            const on = sw.getAttribute ? sw.getAttribute('aria-checked') === 'true' : sw._efOn === true;
            const next = !on;
            sw._efOn = next;
            attr(sw, 'aria-checked', next ? 'true' : 'false');
            toggleClass(sw, 'on', next);
            state.values[q.question_id] = next ? 'true' : 'false';
            if (swLabel) swLabel.textContent = next ? t('EF_YES') : t('EF_NO');
            clearError(q.question_id);
            updateProgress();
            if (HF.sfx) HF.sfx('click');
          });
          attr(sw, 'role', 'switch');
          attr(sw, 'aria-checked', 'false');
          sw.appendChild(el('span', 'ef-switch-track'));
          sw.appendChild(el('span', 'ef-switch-knob'));
          const swLabel = el('span', 'ef-switch-label', t('EF_NO'));
          wrap.appendChild(sw);
          wrap.appendChild(swLabel);
          control.appendChild(wrap);
          first = sw;

        } else { // TEXT
          const area = el('textarea', 'ef-text');
          attr(area, 'maxlength', '1000');
          attr(area, 'rows', '3');
          attr(area, 'placeholder', t('EF_TEXT_PH'));
          attr(area, 'aria-label', q.question_label || q.question_text);
          area.oninput = () => {
            state.values[q.question_id] = area.value;
            clearError(q.question_id);
            updateProgress();
          };
          control.appendChild(area);
          first = area;
        }

        if (q.is_required && first) attr(first, 'aria-required', 'true');
        card.appendChild(control);
        const err = el('div', 'ef-err');
        attr(err, 'role', 'alert');
        card.appendChild(err);
        errorNodes[q.question_id] = err;
        body.appendChild(card);
        fields.push(first);
      }

      // Datos opcionales del jugador ------------------------------------------
      const meta = metaFor(data);
      let emailInput = null, aliasInput = null, commentArea = null;
      if (meta.collect) {
        const box = el('div', 'ef-user');
        const emailLabel = el('label', 'ef-label', t('EF_EMAIL'));
        const email = el('input', 'ef-input');
        email.id = 'efEmail';
        emailLabel.htmlFor = 'efEmail';
        email.type = 'email';
        email.autocomplete = 'email';
        email.maxLength = 80;
        email.placeholder = t('EF_EMAIL_PH');
        emailInput = email;
        box.appendChild(emailLabel);
        box.appendChild(email);
        const emailErr = el('div', 'ef-err');
        attr(emailErr, 'role', 'alert');
        errorNodes._email = emailErr;
        box.appendChild(emailErr);

        const aliasLabel = el('label', 'ef-label', t('EF_ALIAS'));
        const alias = el('input', 'ef-input');
        alias.id = 'efAlias';
        aliasLabel.htmlFor = 'efAlias';
        alias.type = 'text';
        alias.autocomplete = 'nickname';
        alias.maxLength = 100;
        alias.placeholder = t('EF_ALIAS_PH');
        aliasInput = alias;
        box.appendChild(aliasLabel);
        box.appendChild(alias);
        body.appendChild(box);
      }

      if (meta.allowComments) {
        const box = el('div', 'ef-user');
        const label = el('label', 'ef-label', t('EF_COMMENT'));
        const area = el('textarea', 'ef-text ef-comment');
        area.id = 'efComment';
        label.htmlFor = 'efComment';
        attr(area, 'maxlength', '2000');
        attr(area, 'rows', '3');
        attr(area, 'placeholder', t('EF_COMMENT_PH'));
        commentArea = area;
        box.appendChild(label);
        box.appendChild(area);
        body.appendChild(box);
      }

      const globalErr = el('div', 'ef-err ef-global');
      attr(globalErr, 'role', 'alert');
      body.appendChild(globalErr);

      // Pies -------------------------------------------------------------------
      const foot = el('div', 'ef-foot');
      foot.appendChild(el('p', 'ef-privacy', t('EF_PRIVACY')));
      const actions = el('div', 'ef-actions');
      const later = button('ef-later', t('EF_LATER'), () => dismiss());
      const send = button('ef-send pri', t('EF_SEND'), () => submit());
      send.type = 'submit';
      actions.appendChild(later);
      actions.appendChild(send);
      foot.appendChild(actions);
      form.appendChild(foot);

      // Éxito ------------------------------------------------------------------
      const success = el('div', 'ef-success hidden');
      const successMark = el('div', 'ef-success-mark', '✓');
      const successTitle = el('h3', 'ef-success-title', t('EF_OK_TITLE'));
      const successDesc = el('p', 'ef-success-desc', t('EF_OK_DESC'));
      const successClose = button('ef-send pri', t('EF_CLOSE'), () => close(true));
      success.appendChild(successMark);
      success.appendChild(successTitle);
      success.appendChild(successDesc);
      success.appendChild(successClose);

      sheet.appendChild(form);
      sheet.appendChild(success);
      overlay.appendChild(sheet);

      // -------------------------------------------------------------------------
      // Lógica de la vista
      // -------------------------------------------------------------------------
      function paintStars(marks, n) {
        for (let i = 0; i < marks.length; i++) {
          toggleClass(marks[i], 'on', i < n);
          attr(marks[i], 'aria-pressed', i < n ? 'true' : 'false');
        }
      }

      function answeredCount() {
        let n = 0;
        for (const q of questions) if (state.values[q.question_id]) n++;
        return n;
      }

      function updateProgress() {
        const n = answeredCount();
        const pct = questions.length ? Math.round((n / questions.length) * 100) : 0;
        fill.style.width = pct + '%';
        progressLabel.textContent = progressText(n, questions.length);
      }

      function clearError(qid) {
        const node = errorNodes[qid];
        if (node) node.textContent = '';
        const card = state.cards[qid];
        if (card) removeClass(card, 'ef-q-error');
        if (globalErr) globalErr.textContent = '';
      }

      function showErrors(errors) {
        let focusTarget = null;
        for (const key in errorNodes) errorNodes[key].textContent = '';
        for (const qid in state.cards) removeClass(state.cards[qid], 'ef-q-error');
        for (const qid in errors) {
          if (qid === '_global' || qid === '_email') continue;
          if (errorNodes[qid]) errorNodes[qid].textContent = errors[qid];
          if (state.cards[qid]) addClass(state.cards[qid], 'ef-q-error');
          if (focusTarget == null) {
            focusTarget = (fields[questions.findIndex(q => q.question_id === qid)] || null);
          }
        }
        if (errors._email && errorNodes._email) errorNodes._email.textContent = errors._email;
        if (errors._global) globalErr.textContent = errors._global;
        if (focusTarget && focusTarget.focus) {
          try { focusTarget.focus(); } catch (e) { }
        }
      }

      function setSending(on) {
        state.sending = !!on;
        send.disabled = !!on;
        later.disabled = !!on;
        closeBtn.disabled = !!on;
        send.textContent = on ? t('EF_SENDING') : t('EF_SEND');
        toggleClass(sheet, 'is-sending', !!on);
      }

      function submit() {
        if (state.sending) return;
        const m = {
          collect: meta.collect,
          allowComments: meta.allowComments,
          email: emailInput ? emailInput.value : '',
          alias: aliasInput ? aliasInput.value : '',
          comment: commentArea ? commentArea.value : ''
        };
        const v = validate(questions, state.values, m);
        if (!v.ok) {
          showErrors(v.errors);
          if (HF.sfx) HF.sfx('error');
          return;
        }
        const payload = buildPayload(data, v.answers, m);
        if (!payload.p_campaign_event_id) {
          globalErr.textContent = t('EF_ERROR_GENERIC');
          return;
        }
        setSending(true);
        callSubmit(payload).then(r => {
          if (r.ok) {
            markSeen(ctx.key, 'answered');
            dropPending(ctx.key);
            showSuccess();
            return;
          }
          if (r.retry) {
            queuePending(payload, ctx.key, ctx.eventType);
            if (!ctx.preview) markSeen(ctx.key, 'dismissed');
            close(true);
            if (HF.toast) HF.toast(t('EF_QUEUED'), 4200);
            return;
          }
          setSending(false);
          globalErr.textContent = errorText(r.error);
          if (HF.sfx) HF.sfx('error');
        }).catch(() => {
          setSending(false);
          globalErr.textContent = t('EF_ERROR_GENERIC');
          if (HF.sfx) HF.sfx('error');
        });
      }

      function showSuccess() {
        setSending(false);
        addClass(sheet, 'ef-done');
        addClass(form, 'hidden');
        removeClass(success, 'hidden');
        if (HF.sfx) HF.sfx('good');
        const timer = G.setTimeout(() => close(true), 3200);
        state.closeTimer = timer;
      }

      // Eventos globales del modal ---------------------------------------------
      function dismiss() {
        if (state.sending) return;
        if (!ctx.preview) markSeen(ctx.key, 'dismissed');
        close(false);
      }

      function close(answered) {
        if (state.closeTimer) { G.clearTimeout(state.closeTimer); state.closeTimer = 0; }
        const c = current;
        if (!c || c.overlay !== overlay) return;
        current = null;
        if (!answered && !state.sending && !ctx.preview) markSeen(ctx.key, 'dismissed');
        addClass(overlay, 'ef-out');
        removeClass(doc.body, 'ef-open');
        const remove = () => {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
          resolve({ shown: true, key: ctx.key, submitted: !!answered });
        };
        G.setTimeout(remove, 240);
        if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { } }
      }

      form.onsubmit = e => {
        if (e && e.preventDefault) e.preventDefault();
        submit();
      };
      overlay.onclick = e => { if (e.target === overlay) dismiss(); };

      // Trampa de foco + Escape.
      overlay.onkeydown = e => {
        const key = e && (e.key || e.keyCode);
        if (key === 'Escape' || key === 27) {
          if (e.preventDefault) e.preventDefault();
          dismiss();
          return;
        }
        if (key !== 'Tab' && key !== 9) return;
        if (!sheet.querySelectorAll) return;
        const nodes = sheet.querySelectorAll('button, input, textarea, select');
        const list = [];
        for (const node of nodes) {
          if (node.disabled) continue;
          if (node.type === 'hidden') continue;
          if (node.closest && node.closest('.hidden')) continue;
          list.push(node);
        }
        if (!list.length) return;
        const first = list[0], last = list[list.length - 1];
        if (e.shiftKey && (e.target === first || !sheet.contains || !sheet.contains(e.target))) {
          if (e.preventDefault) e.preventDefault();
          if (last.focus) last.focus();
        } else if (!e.shiftKey && (e.target === last || !sheet.contains || !sheet.contains(e.target))) {
          if (e.preventDefault) e.preventDefault();
          if (first.focus) first.focus();
        }
      };

      // Montaje ----------------------------------------------------------------
      // El estado de los controles arranca vacío; los obligatorios se marcan
      // al intentar enviar, no antes (no regañar sin motivo).
      if (!questions.length) {
        resolve({ shown: false, reason: 'no_questions' });
        return;
      }

      lastFocus = doc.activeElement || null;
      doc.body.appendChild(overlay);
      addClass(doc.body, 'ef-open');
      current = {
        overlay, sheet, key: ctx.key, eventType: ctx.eventType,
        data, questions, state, els: { form, success, globalErr, send, later, closeBtn, fill, progressLabel }
      };
      updateProgress();
      G.setTimeout(() => {
        // El primer control recibe el foco cuando la animación ha entrado. En
        // táctil se enfoca el cierre para no abrir el teclado sobre el modal.
        const coarse = G.matchMedia && G.matchMedia('(pointer: coarse)').matches;
        const target = coarse ? closeBtn : (fields[0] || closeBtn);
        if (target && target.focus) { try { target.focus(); } catch (e) { } }
      }, 80);

      // La promesa se resuelve al cerrar (no al abrir): permite a los tests
      // esperar el flujo completo, pero checkAndRender no la espera.
    });
  }

  // La RPC nueva acepta p_locale y devuelve question_label/option_labels.
  // Si el servidor aún tiene la firma antigua, se reintenta sin p_locale.
  async function fetchActiveEvent(eventType) {
    const locale = HF.lang ? HF.lang() : 'en';
    let r = await HF.cloud.rpc('get_active_event_questions', {
      p_event_type: eventType,
      p_locale: locale
    });
    if (r && !r.ok && (r.status === 404 || r.status === 400)) {
      r = await HF.cloud.rpc('get_active_event_questions', { p_event_type: eventType });
    }
    return r;
  }

  // ---------------------------------------------------------------------------
  // Espera a que no haya otro modal/capa encima
  // ---------------------------------------------------------------------------
  function uiBusy() {
    if (current) return true;
    if (!doc) return false;
    const modal = doc.getElementById ? doc.getElementById('modal') : null;
    if (modal && !hasClass(modal, 'hidden')) return true;
    if (doc.querySelector) {
      if (doc.querySelector('.ef-overlay')) return true;
      if (doc.querySelector('.fb-overlay')) return true;
      if (doc.querySelector('.lore-overlay')) return true;
    }
    return false;
  }

  function waitForIdle(maxMs) {
    const limit = maxMs > 0 ? maxMs : 45000;
    const started = now();
    return new Promise(resolve => {
      const tick = () => {
        if (!uiBusy()) return resolve(true);
        if (now() - started >= limit) return resolve(false);
        G.setTimeout(tick, 450);
      };
      tick();
    });
  }

  // ---------------------------------------------------------------------------
  // API pública
  // ---------------------------------------------------------------------------
  async function checkAndRender(rawEventType, opts) {
    opts = opts || {};
    if (cfg().enabled === false) return { shown: false, reason: 'disabled' };
    const eventType = normalizeType(rawEventType);
    if (!eventType) return { shown: false, reason: 'bad_event' };
    if (busy || current) return { shown: false, reason: 'busy' };
    // No se apila sobre otro modal (noticias, compartir, comentarios…).
    // MATCH_OVER/REPLAY_FINISHED usan waitForIdle y esperan a que se cierre.
    if (!opts.waitForIdle && uiBusy()) return { shown: false, reason: 'busy_ui' };
    if (!online()) return { shown: false, reason: 'offline' };
    if (!HF.cloud || typeof HF.cloud.rpc !== 'function') return { shown: false, reason: 'no_cloud' };

    busy = true;
    try {
      if (opts.waitForIdle) {
        const idle = await waitForIdle(opts.waitForIdleMs);
        if (!idle) return { shown: false, reason: 'busy_ui' };
      }
      if (opts.delay) await sleep(opts.delay);
      if (opts.guard && !opts.guard()) return { shown: false, reason: 'guard' };
      if (current) return { shown: false, reason: 'busy' };

      const r = await fetchActiveEvent(eventType);
      if (!r || !r.ok) {
        if (r && r.status === 404) warnOnce('missing', 'falta aplicar sql/event_feedback.sql (RPC no encontrada)');
        return { shown: false, reason: 'rpc' };
      }
      const data = normalizePayload(r.data);
      if (!data) return { shown: false, reason: 'bad_payload' };
      if (data.active !== true) return { shown: false, reason: 'inactive' };
      const questions = normalizeQuestions(data.questions);
      if (!questions.length) return { shown: false, reason: 'no_questions' };
      const event = data.event || {};
      const key = String(event.campaign_event_id || (data.campaign && data.campaign.campaign_id) || '');
      if (!key) return { shown: false, reason: 'bad_payload' };
      // La marca de sesión va por campaign_event_id, no por tipo de evento:
      // así una campaña NUEVA de MATCH_OVER puede mostrarse en la misma sesión
      // aunque el jugador ya haya respondido otra campaña del mismo tipo.
      // `preview` (botón Probar del diagnóstico) no lee ni escribe marcas.
      const preview = opts.preview === true;
      if (!preview && !opts.force && sessionShown[key]) return { shown: false, reason: 'session' };
      if (!preview && !opts.force) {
        const skip = shouldSkip(key);
        if (skip) return { shown: false, reason: skip };
      }
      if (opts.guard && !opts.guard()) return { shown: false, reason: 'guard' };

      // renderModal resuelve al cerrar; no bloqueamos la llamada del juego.
      renderModal(data, questions, { eventType, key, preview }).catch(e => {
        if (G.console && G.console.error) G.console.error('[event-feedback] render:', e);
      });
      if (!preview) sessionShown[key] = true;
      return { shown: true, key, eventType, questions: questions.length };
    } catch (e) {
      if (G.console && G.console.error) G.console.error('[event-feedback] checkAndRender:', e);
      return { shown: false, reason: 'error' };
    } finally {
      busy = false;
    }
  }

  // Diagnóstico sin pintar nada: devuelve exactamente lo que ve el cliente,
  // incluidos los bloqueos locales (seen, outbox, sesión).
  async function debug(rawEventType) {
    const eventType = normalizeType(rawEventType);
    if (!eventType) return { ok: false, reason: 'bad_event' };
    if (!online()) {
      const sec = HF.security || null;
      return {
        ok: false,
        reason: sec && sec.locked ? 'security' : 'offline',
        security: sec ? { locked: !!sec.locked, host: sec.host || '', reason: sec.reason || '' } : null
      };
    }
    const r = await fetchActiveEvent(eventType);
    const data = normalizePayload(r && r.data);
    const questions = data ? normalizeQuestions(data.questions) : [];
    const event = (data && data.event) || {};
    const key = String(event.campaign_event_id || (data && data.campaign && data.campaign.campaign_id) || '');
    return {
      ok: !!(r && r.ok),
      status: r && r.status,
      active: !!(data && data.active === true),
      campaign_event_id: event.campaign_event_id || null,
      event_type: event.event_type || eventType,
      locale: HF.lang ? HF.lang() : 'en',
      payload_locale: (data && data.locale) || null,
      questions: questions.length,
      question_types: questions.map(q => q.question_type),
      seen: key ? (seen()[key] || null) : null,
      pending: key ? pending().some(x => x.key === key) : false,
      session: key ? !!sessionShown[key] : false,
      payload: data || null
    };
  }

  function debugSummary(d) {
    if (!d) return 'Sin respuesta del diagnóstico.';
    if (d.reason === 'security') {
      const host = (d.security && d.security.host) || 'este dominio';
      return 'Servicios en línea desactivados para ' + host +
        '. Añade el host a HF.CFG.security.allowedHosts o abre el juego desde federati.org.';
    }
    if (d.reason === 'offline') return 'Sin conexión: no se pudo consultar la RPC.';
    if (!d.ok) return 'La RPC no respondió correctamente' + (d.status ? ' (HTTP ' + d.status + ')' : '') + '. Revisa el SQL/PostgREST.';
    if (!d.active) return 'No hay una campaña activa para MATCH_OVER en este momento (fechas o is_active).';
    if (!d.questions) return 'La campaña activa no tiene preguntas cargadas.';
    if (d.seen && d.seen.status === 'answered') return 'Este dispositivo ya respondió esta misma campaña (hf_ef_seen = answered).';
    if (d.seen && d.seen.status === 'dismissed') return 'Esta campaña se descartó en este dispositivo; espera el enfriamiento o limpia las marcas.';
    if (d.pending) return 'Hay una respuesta pendiente de envío para esta campaña.';
    if (d.session) return 'Ya se mostró en esta sesión; recarga o limpia las marcas.';
    return 'Todo correcto: la encuesta debería mostrarse. Prueba con «Probar MATCH_OVER».';
  }

  // Panel visible (sin DevTools): Ajustes → Diagnóstico de encuesta.
  function openDebug() {
    if (!HF.modal) {
      if (HF.toast) HF.toast('Diagnóstico no disponible');
      return;
    }
    HF.modal('<h3>🔎 Diagnóstico de encuesta</h3><div id="efDiagBody" class="dim small">Consultando…</div>' +
      '<div class="row" style="margin-top:10px"><button id="efDiagClose">Cerrar</button>' +
      '<button id="efDiagClear">Limpiar marcas</button>' +
      '<button id="efDiagForce" class="pri grow">Probar MATCH_OVER</button></div>', m => {
      const body = m.querySelector('#efDiagBody');
      const close = m.querySelector('#efDiagClose');
      const clear = m.querySelector('#efDiagClear');
      const force = m.querySelector('#efDiagForce');
      if (close) close.onclick = HF.closeModal;
      if (clear) clear.onclick = () => {
        HF.store.del('ef_seen');
        HF.store.del('ef_outbox');
        api.reset();
        if (HF.toast) HF.toast('Marcas locales de encuesta limpiadas');
        if (body) body.innerHTML = '<div class="pos">Marcas limpiadas. Vuelve a terminar una partida y cierra el resumen con «Menú».</div>';
      };
      if (force) force.onclick = () => {
        HF.closeModal();
        G.setTimeout(() => {
          checkAndRender('MATCH_OVER', { force: true, preview: true, waitForIdle: true }).then(r => {
            if (!r || !r.shown) {
              if (HF.toast) HF.toast('No se mostró: ' + ((r && r.reason) || 'desconocido'), 4200);
            }
          });
        }, 120);
      };
      debug('MATCH_OVER').then(d => {
        if (!body) return;
        const firstQ = d.payload && d.payload.questions && d.payload.questions[0];
        const rows = [
          ['RPC', d.ok ? 'OK' : 'ERROR' + (d.status ? ' ' + d.status : '')],
          ['Campaña activa', d.active ? 'SÍ' : 'NO'],
          ['Idioma del jugador', d.locale || '—'],
          ['Locale de la RPC', d.payload_locale || '—'],
          ['Preguntas', String(d.questions == null ? 0 : d.questions)],
          ['Texto 1 (BD)', firstQ ? (firstQ.question_text || '—') : '—'],
          ['Etiqueta 1', firstQ ? (firstQ.question_label || firstQ.question_text || '—') : '—'],
          ['campaign_event_id', d.campaign_event_id || '—'],
          ['Ya respondida/descartada', d.seen ? (d.seen.status + ' · ' + new Date(d.seen.at).toLocaleString()) : 'no'],
          ['Pendiente de envío', d.pending ? 'sí' : 'no'],
          ['Mostrada en esta sesión', d.session ? 'sí' : 'no']
        ];
        const ok = d.ok && d.active && d.questions > 0 && !d.pending && !d.session &&
          !(d.seen && d.seen.status === 'answered');
        body.innerHTML = '<div class="card" style="margin:0 0 8px;padding:8px">' +
          rows.map(r => '<div class="row small" style="justify-content:space-between;gap:10px">' +
            '<span class="dim">' + HF.esc(r[0]) + '</span><b style="text-align:right">' + HF.esc(r[1]) + '</b></div>').join('') +
          '</div><div class="' + (ok ? 'pos' : 'neg') + '" style="margin-bottom:6px">' + HF.esc(debugSummary(d)) + '</div>' +
          '<details><summary class="dim small">Ver payload de la RPC</summary>' +
          '<pre style="white-space:pre-wrap;max-height:30vh;overflow:auto;font-size:10px;background:rgba(10,18,34,.6);padding:8px;border-radius:10px">' +
          HF.esc(JSON.stringify(d.payload, null, 2)) + '</pre></details>';
      }).catch(e => {
        if (body) body.innerHTML = '<div class="neg">Error al diagnosticar: ' + HF.esc(e && e.message || e) + '</div>';
      });
    });
  }

  const api = {
    checkAndRender,
    debug,
    openDebug,
    flush,
    pending: () => pending().length,
    seen: () => seen(),
    reset() {
      // Limpieza completa (pruebas/soporte): también retira capas cuya
      // animación de salida aún no había terminado.
      if (current) { try { current.overlay.parentNode.removeChild(current.overlay); } catch (e) { } current = null; }
      if (doc && doc.querySelectorAll) {
        const layers = doc.querySelectorAll('.ef-overlay');
        for (const layer of layers) {
          if (layer.parentNode) { try { layer.parentNode.removeChild(layer); } catch (e) { } }
        }
      }
      storeSet(SEEN_KEY, {});
      storeSet(OUT_KEY, []);
      for (const k in sessionShown) delete sessionShown[k];
      for (const k in warned) delete warned[k];
      if (doc && doc.body) removeClass(doc.body, 'ef-open');
    },
    _internals: {
      normalizeType, normalizePayload, normalizeQuestions, normalizeOptions,
      validate, buildPayload, errorText, shouldSkip, markSeen, queuePending,
      pending, callSubmit, online, uiBusy
    }
  };

  HF.EventFeedbackModal = api;
  // Nombre global exigido por el enunciado: EventFeedbackModal.checkAndRender().
  G.EventFeedbackModal = api;

  // Reintento de la cola al arrancar y al recuperar la conexión.
  if (G.setTimeout) G.setTimeout(() => { try { flush(); } catch (e) { } }, 3500);
  if (G.addEventListener) {
    G.addEventListener('online', () => { try { flush(); } catch (e) { } });
  }
})(typeof window !== 'undefined' ? window : globalThis);
