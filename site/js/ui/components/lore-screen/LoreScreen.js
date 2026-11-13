/* ===========================================================================
 * LoreScreen.js — Pantalla de introducción / Lore (HexFrontier)
 * ---------------------------------------------------------------------------
 * Contrato de especificacion_pantalla_lore.md §6:
 *     HF.LoreScreen.show(chapterId)   → renderiza y arranca la secuencia
 *     HF.LoreScreen.hide()            → limpia el componente del DOM
 *     HF.LoreScreen.onComplete(cb)    → callback al cerrar: cb({ dontShowAgain })
 *
 * · Vanilla JS, script clásico (se carga antes que js/main.js).
 * · Namespace CSS propio (.lore-*) para no colisionar con style.css.
 * · 5 pantallas con navegación, puntos de progreso, "Saltar introducción",
 *   efecto máquina de escribir, fade-in + escala suave y opción
 *   "No volver a mostrar" persistida en HF.store('settings').
 * · Textos en los 13 idiomas de HF.LANGS según HF.lang(); si falta una
 *   traducción se usa el español.
 * · Maquetación por página: 'art' (ilustración lateral) o 'strip' (tira
 *   panorámica completa, sin recorte ni zoom).
 * =========================================================================== */
(function (G) {
  var HF = G.HF = G.HF || {};

  if (!HF.LORE || !HF.LORE.pages || !HF.LORE.langs) {
    if (G.console) G.console.warn('[LoreScreen] Falta HF.LORE: revisa el orden de los <script>.');
    return;
  }

  var META = HF.LORE.pages;
  var FALLBACK = 'es';
  var S = null;            // sesión activa
  var callbacks = [];      // esperan el cierre

  // ---------- idioma --------------------------------------------------------
  function langCode() {
    try { return (HF.lang && HF.lang()) || FALLBACK; } catch (e) { return FALLBACK; }
  }
  function dict() {
    var code = langCode();
    return HF.LORE.langs[code] || HF.LORE.langs[FALLBACK];
  }
  // Textos de una página, con respaldo al español si falta la traducción.
  function textsFor(meta) {
    var d = dict();
    var es = HF.LORE.langs[FALLBACK];
    var t = (d.pages && d.pages[meta.id]) || (es.pages && es.pages[meta.id]) || {};
    return {
      title: t.title || meta.id,
      blocks: t.blocks || [],
      layout: meta.layout || 'art'
    };
  }

  // ---------- utilidades -----------------------------------------------------
  function ce(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function reduceMotion() {
    try { return !!(G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    catch (e) { return false; }
  }
  function sfx(kind) { try { if (HF.sfx) HF.sfx(kind); } catch (e) { } }

  function clearTimer() {
    if (S && S.timer) { G.clearInterval(S.timer); S.timer = 0; }
  }

  // Recoge los nodos de texto del cuerpo y los vacía para escribirlos después.
  function collectText(root) {
    var out = [], walker, node;
    if (!root || !document.createTreeWalker) return out;
    try { walker = document.createTreeWalker(root, 4 /* SHOW_TEXT */, null, false); }
    catch (e) { return out; }
    while ((node = walker.nextNode())) {
      if (!node.nodeValue || !node.nodeValue.replace(/\s+/g, '')) continue;
      out.push({ node: node, full: node.nodeValue });
      node.nodeValue = '';
    }
    return out;
  }

  // Efecto máquina de escribir sobre los nodos ya vaciados.
  function typeText(items, done) {
    clearTimer();
    if (!items.length) { if (done) done(); return; }
    if (reduceMotion()) {
      for (var k = 0; k < items.length; k++) items[k].node.nodeValue = items[k].full;
      if (done) done();
      return;
    }
    var idx = 0, pos = 0, tick = 0;
    S.timer = G.setInterval(function () {
      var guard = 0;
      while (idx < items.length && guard < 8) {
        var it = items[idx];
        pos += 2;
        if (pos >= it.full.length) {
          it.node.nodeValue = it.full;
          idx += 1; pos = 0;
        } else {
          it.node.nodeValue = it.full.slice(0, pos);
        }
        guard += 1;
      }
      tick += 1;
      if (tick % 5 === 0) sfx('type');   // señal sutil (silenciosa si no existe el timbre)
      if (idx >= items.length) { clearTimer(); if (done) done(); }
    }, 16);
  }

  function completeText() {
    if (!S) return;
    clearTimer();
    (S.textItems || []).forEach(function (it) {
      if (it.node.nodeValue !== it.full) it.node.nodeValue = it.full;
    });
  }

  // ---------- construcción del DOM ------------------------------------------
  function build() {
    var d = dict();
    var overlay = ce('div', 'lore-overlay');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', d.kicker);

    overlay.innerHTML =
      '<div class="lore-panel" role="document">' +
        '<header class="lore-head">' +
          '<div class="lore-headText">' +
            '<div class="lore-kicker">' + d.kicker + '</div>' +
            '<div class="lore-chapter">' + d.chapter + '</div>' +
          '</div>' +
          '<div class="lore-step" aria-live="polite"></div>' +
          '<button type="button" class="lore-skip" data-act="skip">' + d.labels.skip + '</button>' +
        '</header>' +
        '<div class="lore-main">' +
          '<figure class="lore-figure">' +
            '<img class="lore-img" alt="" draggable="false">' +
            '<span class="lore-glow" aria-hidden="true"></span>' +
          '</figure>' +
          '<section class="lore-paper">' +
            '<h2 class="lore-title"></h2>' +
            '<div class="lore-body" tabindex="0"></div>' +
          '</section>' +
        '</div>' +
        '<div class="lore-dots" role="group" aria-label="' + d.kicker + '"></div>' +
        '<footer class="lore-foot">' +
          '<label class="lore-check"><input type="checkbox" id="loreDontShow"><span>' +
            d.dontShowAgain + '</span></label>' +
          '<div class="lore-actions">' +
            '<button type="button" class="lore-btn" data-act="prev">' + d.labels.prev + '</button>' +
            '<button type="button" class="lore-btn pri" data-act="next"></button>' +
          '</div>' +
        '</footer>' +
      '</div>';

    S.overlay = overlay;
    S.panel = overlay.querySelector('.lore-panel');
    S.step = overlay.querySelector('.lore-step');
    S.title = overlay.querySelector('.lore-title');
    S.body = overlay.querySelector('.lore-body');
    S.figure = overlay.querySelector('.lore-figure');
    S.img = overlay.querySelector('.lore-img');
    S.dots = overlay.querySelector('.lore-dots');
    S.check = overlay.querySelector('#loreDontShow');
    S.prev = overlay.querySelector('[data-act="prev"]');
    S.next = overlay.querySelector('[data-act="next"]');
    S.skip = overlay.querySelector('[data-act="skip"]');

    // Puntos de progreso (uno por pantalla)
    META.forEach(function (meta, i) {
      var dot = ce('button', 'lore-dot');
      dot.type = 'button';
      dot.setAttribute('aria-label', (i + 1) + '/' + META.length);
      dot.setAttribute('data-go', String(i));
      S.dots.appendChild(dot);
    });

    // La imagen que falte no rompe la pantalla: se oculta el marco.
    S.img.addEventListener('error', function () { S.figure.classList.add('is-empty'); });
    S.img.addEventListener('load', function () { S.figure.classList.remove('is-empty'); });

    // Delegación de clics (botones, puntos y "completar texto")
    overlay.addEventListener('click', function (e) {
      var t = e.target;
      var act = t && t.closest ? t.closest('[data-act]') : null;
      if (act) {
        var a = act.getAttribute('data-act');
        if (a === 'next') { go(1); return; }
        if (a === 'prev') { go(-1); return; }
        if (a === 'skip') { finish(); return; }
      }
      var dot = t && t.closest ? t.closest('[data-go]') : null;
      if (dot) { clearTimer(); S.index = +dot.getAttribute('data-go'); render(); return; }
      // Toque sobre el texto: completa la escritura de golpe.
      if (t && t.closest && t.closest('.lore-body')) completeText();
    });

    S.check.addEventListener('change', function () { sfx('click'); });

    document.body.appendChild(overlay);
    document.body.classList.add('lore-open');
    document.addEventListener('keydown', onKey, true);

    // Enfocar el botón principal para navegación por teclado.
    G.setTimeout(function () { try { if (S && S.next) S.next.focus(); } catch (e) { } }, 60);
  }

  // ---------- render de una pantalla ----------------------------------------
  function render() {
    if (!S) return;
    clearTimer();
    var meta = META[S.index];
    var t = textsFor(meta);
    var d = dict();
    var total = META.length;

    S.panel.setAttribute('data-page', meta.id);
    S.panel.setAttribute('data-layout', t.layout);   // 'art' | 'strip'
    S.step.textContent = (S.index + 1) + ' / ' + total;
    S.title.textContent = t.title;

    // Ilustración
    if (meta.art) {
      S.figure.classList.remove('is-empty');
      if (S.img.getAttribute('src') !== meta.art) S.img.setAttribute('src', meta.art);
      S.img.alt = t.title;
    } else {
      S.figure.classList.add('is-empty');
    }

    // Cuerpo
    S.body.innerHTML = '';
    (t.blocks || []).forEach(function (b) {
      if (b.p != null) S.body.appendChild(ce('p', 'lore-p', b.p));
      else if (b.lead != null) S.body.appendChild(ce('p', 'lore-lead', b.lead));
      else if (b.ul) {
        var ul = ce('ul', 'lore-ul');
        b.ul.forEach(function (li) {
          ul.appendChild(ce('li', 'lore-li', '<b>' + li.b + '</b> ' + li.t));
        });
        S.body.appendChild(ul);
      }
    });
    S.body.scrollTop = 0;

    // Puntos
    var dots = S.dots.children;
    for (var i = 0; i < dots.length; i++) {
      dots[i].classList.toggle('is-on', i === S.index);
      dots[i].setAttribute('aria-current', i === S.index ? 'true' : 'false');
    }

    // Botones y etiquetas del idioma activo
    S.prev.textContent = d.labels.prev;
    S.skip.textContent = d.labels.skip;
    var last = S.index === total - 1;
    S.prev.disabled = S.index === 0;
    S.next.textContent = last ? d.labels.start : d.labels.next;
    S.next.classList.toggle('is-last', last);

    // Animación de entrada del panel (fade-in + escala 0.96 → 1)
    S.panel.classList.remove('is-in');
    void S.panel.offsetWidth;
    S.panel.classList.add('is-in');

    // Máquina de escribir
    S.textItems = collectText(S.body);
    typeText(S.textItems);
  }

  // ---------- navegación ----------------------------------------------------
  function go(delta) {
    if (!S) return;
    clearTimer();
    var ni = S.index + delta;
    if (ni < 0) return;
    if (ni >= META.length) { finish(); return; }
    sfx('click');
    S.index = ni;
    render();
  }

  function onKey(e) {
    if (!S) return;
    var k = e.key;
    if (k === 'ArrowRight' || k === 'Enter' || k === ' ' || k === 'Spacebar') {
      e.preventDefault(); go(1); return;
    }
    if (k === 'ArrowLeft') { e.preventDefault(); go(-1); return; }
    if (k === 'Escape' || k === 'Esc') { e.preventDefault(); finish(); return; }
  }

  // ---------- cierre --------------------------------------------------------
  function finish(explicit) {
    if (!S) return;
    var s = S;
    S = null;
    clearTimer();
    document.removeEventListener('keydown', onKey, true);

    var dontShow = (typeof explicit === 'boolean') ? explicit : !!(s.check && s.check.checked);

    // Persistencia de la preferencia del jugador.
    try {
      var st = HF.settings();
      st.loreIntroSeen = true;
      if (dontShow) st.showLoreIntro = false;
      else if (st.showLoreIntro === undefined) st.showLoreIntro = true;
      HF.store.set('settings', st);
    } catch (e) { }

    document.body.classList.remove('lore-open');
    s.panel.classList.remove('is-in');
    s.overlay.classList.add('is-out');

    var done = function () {
      if (s.overlay.parentNode) s.overlay.parentNode.removeChild(s.overlay);
      var list = callbacks.slice(0);
      callbacks.length = 0;
      list.forEach(function (cb) {
        try { cb({ dontShowAgain: dontShow }); } catch (err) { if (G.console) G.console.error('[LoreScreen] callback', err); }
      });
    };

    if (reduceMotion()) done();
    else G.setTimeout(done, 280);
  }

  // ---------- API pública ---------------------------------------------------
  HF.LoreScreen = {
    /** Muestra la secuencia. chapterId: id ('imperio') o índice (0..4). */
    show: function (chapterId) {
      if (S) return;                        // ya visible
      var start = 0;
      if (typeof chapterId === 'number' && chapterId === chapterId) {
        start = chapterId;
      } else if (chapterId != null) {
        for (var i = 0; i < META.length; i++) {
          if (META[i].id === chapterId) { start = i; break; }
        }
      }
      S = { index: Math.max(0, Math.min(META.length - 1, start | 0)), timer: 0, textItems: [] };
      build();
      render();
    },

    /** Cierra y limpia el componente del DOM. */
    hide: function () { finish(); },

    /** Registra el callback de finalización. */
    onComplete: function (cb) {
      if (typeof cb === 'function') callbacks.push(cb);
    }
  };
})(window);
