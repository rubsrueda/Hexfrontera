/* Federati · Capa de traducción de la UI heredada.
 *
 * El juego creció con textos en español escritos directamente en el HTML y en
 * los mensajes del motor. Esta capa traduce en tiempo de renderizado cualquier
 * texto visible que no pase ya por HF.t(), usando el catálogo HF.PHRASES
 * (español → idioma activo). No requiere tocar las pantallas una a una.
 *
 * - Texto: nodos de texto y atributos visibles (title, placeholder, aria-label,
 *   alt y value de botones).
 * - Mensajes efímeros: HF.toast, confirm/alert/prompt y las burbujas del
 *   tablero (incluidos los barks de unidades y el banter).
 * - Cambio de idioma en caliente: reconstruye el catálogo y repinta el DOM.
 */
(function (G) {
  const HF = G.HF = G.HF || {};
  if (!G.document) return;

  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA', 'CANVAS', 'SVG', 'IFRAME']);
  const ATTRS = ['title', 'placeholder', 'aria-label', 'alt'];

  let table = null;
  let matcher = null;
  let matcherLang = null;
  let tableLang = null;

  const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  function build() {
    const lang = HF.lang ? HF.lang() : 'es';
    if (lang === tableLang) return;
    tableLang = lang;
    const packs = HF.PHRASES || {};
    table = lang === 'en' ? (packs.en || null)
      : (packs[lang] ? Object.assign({}, packs.en || {}, packs[lang]) : (packs.en || null));
    matcher = null;
    matcherLang = null;
    if (!table || lang === 'es') { table = null; return; }

    // El regex solo incluye frases cortas sin HTML: las páginas largas del
    // Códice se resuelven por coincidencia exacta (HF.t) y no deben engordar
    // el autómata de reemplazo.
    const keys = Object.keys(table).filter(k =>
      k && k.length >= 3 && k.length <= 200 && !/[<>]/.test(k) && k.trim() === k);
    keys.sort((a, b) => b.length - a.length);
    if (!keys.length) return;
    try {
      matcher = new RegExp(keys.map(escapeRe).join('|'), 'gu');
      matcherLang = lang;
    } catch (e) {
      // Sin flag unicode (navegadores antiguos): se pierde el límite de
      // palabras, pero la traducción sigue funcionando.
      try { matcher = new RegExp(keys.map(escapeRe).join('|'), 'g'); matcherLang = lang; }
      catch (e2) { matcher = null; }
    }
  }

  const isWord = ch => !!ch && /[\p{L}\p{N}]/u.test(ch);

  function core(s) {
    if (!table || !s) return s;
    if (Object.prototype.hasOwnProperty.call(table, s)) return table[s];
    if (!matcher) return s;
    matcher.lastIndex = 0;
    return s.replace(matcher, (m, offset) => {
      const before = s[offset - 1];
      const after = s[offset + m.length];
      if (isWord(before) && isWord(m[0])) return m;
      if (isWord(after) && isWord(m[m.length - 1])) return m;
      return Object.prototype.hasOwnProperty.call(table, m) ? table[m] : m;
    });
  }

  /** Traduce un texto conservando los espacios de los extremos. */
  HF.txDom = function (text) {
    if (!text || typeof text !== 'string') return text;
    build();
    if (!table) return text;
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(text);
    if (!m) return core(text);
    const body = m[2];
    if (!body) return text;
    const out = core(body);
    return out === body ? text : m[1] + out + m[3];
  };

  // --- Memoria de originales (permite cambiar de idioma sin perder el texto) ---
  const textRec = new WeakMap();   // Text -> { es, out }
  const attrRec = new WeakMap();   // Element -> { attr: { es, out } }

  function skipNode(node) {
    const el = node.nodeType === 1 ? node : node.parentElement;
    if (!el) return true;
    if (SKIP_TAGS.has(el.tagName)) return true;
    if (el.closest && el.closest('[data-i18n-skip],.no-i18n,#toast')) return true;
    if (el.isContentEditable) return true;
    return false;
  }

  function translateTextNode(node, force) {
    if (!node || node.nodeType !== 3 || skipNode(node)) return;
    const rec = textRec.get(node);
    let src;
    if (rec && (force || node.nodeValue === rec.out)) src = rec.es;
    else src = node.nodeValue;
    if (!src || !src.trim()) return;
    const out = HF.txDom(src);
    if (out === node.nodeValue) { if (!rec) textRec.delete(node); return; }
    textRec.set(node, { es: src, out });
    node.nodeValue = out;
  }

  function translateAttr(el, name, force) {
    if (!el || el.nodeType !== 1) return;
    const v = el.getAttribute(name);
    if (!v) return;
    const all = attrRec.get(el) || {};
    const rec = all[name];
    const src = (rec && (force || v === rec.out)) ? rec.es : v;
    const out = HF.txDom(src);
    if (out === src) { if (!rec) return; }
    all[name] = { es: src, out };
    attrRec.set(el, all);
    if (out !== v) el.setAttribute(name, out);
  }

  function translateElement(el, force) {
    if (!el || el.nodeType !== 1) return;
    if (SKIP_TAGS.has(el.tagName)) return;
    if (el.closest && el.closest('[data-i18n-skip],.no-i18n,#toast')) return;
    for (const a of ATTRS) translateAttr(el, a, force);
    if (el.tagName === 'INPUT' && /^(button|submit|reset)$/i.test(el.type || '')) translateAttr(el, 'value', force);
    for (const child of el.childNodes) translateNode(child, force);
  }

  function translateNode(node, force) {
    if (!node) return;
    if (node.nodeType === 3) { translateTextNode(node, force); return; }
    if (node.nodeType !== 1) return;
    if (skipNode(node)) {
      // Un contenedor puede estar excluido (p. ej. un input), pero sus
      // atributos visibles sí se traducen.
      for (const a of ATTRS) translateAttr(node, a, force);
      return;
    }
    translateElement(node, force);
  }

  /** Recorre y traduce todo el documento (o un subárbol). */
  HF.translateDom = function (root, force) {
    build();
    if (!table) return;
    const start = root || G.document.body;
    if (!start) return;
    if (start.nodeType === 3) { translateTextNode(start, force); return; }
    translateElement(start, force);
  };

  // --- Observador: traduce lo que se pinte después ---
  let observer = null;
  function observe() {
    if (!G.MutationObserver || !G.document.body) return;
    if (observer) observer.disconnect();
    observer = new G.MutationObserver(muts => {
      if (!table) return;
      for (const m of muts) {
        if (m.type === 'childList') {
          for (const n of m.addedNodes) translateNode(n, false);
        } else if (m.type === 'characterData') {
          translateTextNode(m.target, false);
        } else if (m.type === 'attributes') {
          translateAttr(m.target, m.attributeName, false);
        }
      }
    });
    observer.observe(G.document.body, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ATTRS
    });
  }

  // --- Mensajes efímeros ---
  function wrapToast() {
    if (!HF.toast || HF.toast._i18n) return;
    const orig = HF.toast;
    HF.toast = function (msg, ms) {
      try { msg = HF.txDom(msg); } catch (e) { }
      return orig.call(this, msg, ms);
    };
    HF.toast._i18n = true;
  }

  function wrapDialogs() {
    if (!G.confirm || G.confirm._i18n) return;
    const c = G.confirm, a = G.alert, p = G.prompt;
    G.confirm = function (msg) { return c.call(G, HF.txDom(msg)); };
    G.confirm._i18n = true;
    if (a) G.alert = function (msg) { return a.call(G, HF.txDom(msg)); };
    if (p) G.prompt = function (msg, def) { return p.call(G, HF.txDom(msg), def); };
  }

  // Las burbujas se dibujan en canvas: se traducen antes de cada frame,
  // guardando el original para poder cambiar de idioma.
  function wrapBoard() {
    const B = HF.Board;
    if (!B || !B.prototype || !B.prototype.draw || B.prototype.draw._i18n) return;
    const orig = B.prototype.draw;
    B.prototype.draw = function () {
      const arr = this.bubbles;
      if (arr && arr.length) {
        const lang = HF.lang ? HF.lang() : 'es';
        for (const b of arr) {
          if (!b || typeof b.txt !== 'string') continue;
          if (b.txtEs == null) b.txtEs = b.txt;
          // Solo se recalcula cuando cambia el idioma: el tablero redibuja a
          // 60 fps y no conviene pasar el regex en cada frame.
          if (b.txtLang !== lang) { b.txt = HF.txDom(b.txtEs); b.txtLang = lang; }
        }
      }
      return orig.apply(this, arguments);
    };
    B.prototype.draw._i18n = true;
  }

  // Los toasts pueden crearse antes que esta capa.
  function boot() {
    try { HF.translateDom(G.document.body, true); } catch (e) { console.warn('[i18n] translateDom', e); }
    observe();
    wrapToast();
    wrapDialogs();
    wrapBoard();
    if (HF.onLocaleChanged) {
      HF.onLocaleChanged(() => {
        table = null; tableLang = null; matcher = null;
        try { HF.translateDom(G.document.body, true); } catch (e) { }
        wrapToast(); wrapBoard(); wrapDialogs();
      });
    }
  }

  // Enganchar cuanto antes los mensajes y diálogos (main.js arranca en cuanto
  // termina de cargarse este archivo).
  wrapToast();
  wrapDialogs();
  wrapBoard();

  if (G.document.readyState === 'loading') G.document.addEventListener('DOMContentLoaded', boot, { once: true });
  else setTimeout(boot, 0);

  // Reintento por si el tablero se crea después del arranque.
  G.setTimeout(() => { wrapBoard(); wrapToast(); }, 1500);
})(typeof window !== 'undefined' ? window : globalThis);
