/* ===========================================================================
 * security.js — Endurecimiento del cliente (Federati)
 * ---------------------------------------------------------------------------
 * 1) Domain lock: sólo los dominios oficiales pueden usar los servicios en
 *    línea. En dominios ajenos (clon/hotlink) el juego sigue siendo jugable en
 *    local, pero se desconecta de la nube y se avisa. `hardBlock:true` muestra
 *    además una pantalla de bloqueo.
 * 2) Política de almacenamiento: qué se puede guardar en localStorage. Nada de
 *    puntuaciones, inventario o progreso *autoritativo*: el servidor manda.
 * 3) Helpers puros (testeables sin DOM).
 *
 * Se carga después de js/config.js y antes que js/cloud.js.
 * =========================================================================== */
(function (G) {
  var HF = G.HF = G.HF || {};

  // Protocolos sin host (apps empaquetadas y desarrollo local).
  var LOCAL_PROTOCOLS = ['file:', 'app:', 'capacitor:', 'ionic:', 'chrome-extension:'];
  var LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0'];

  function normHost(h) {
    return String(h || '').trim().toLowerCase().replace(/\.$/, '');
  }

  /** ¿El host está en la lista? Acepta subdominios (www.federati.org ⊂ federati.org). */
  function hostAllowed(host, list) {
    var h = normHost(host);
    if (!h) return false;
    if (LOCAL_HOSTS.indexOf(h) >= 0) return true;
    var hosts = list || [];
    for (var i = 0; i < hosts.length; i++) {
      var allowed = normHost(hosts[i]);
      if (!allowed) continue;
      if (h === allowed) return true;
      if (h.length > allowed.length && h.slice(-(allowed.length + 1)) === '.' + allowed) return true;
    }
    return false;
  }

  /**
   * Evalúa la política de dominio.
   * @param {{hostname?:string, protocol?:string, host?:string}} loc
   * @param {{allowedHosts?:string[], hardBlock?:boolean}} cfg
   * @returns {{allowed:boolean, local:boolean, host:string, reason:string}}
   */
  function check(loc, cfg) {
    loc = loc || {};
    cfg = cfg || {};
    var protocol = String(loc.protocol || '');
    var host = normHost(loc.hostname || loc.host || '');
    if (LOCAL_PROTOCOLS.indexOf(protocol) >= 0) {
      return { allowed: true, local: true, host: host, reason: 'app-local' };
    }
    if (hostAllowed(host, cfg.allowedHosts)) {
      return { allowed: true, local: LOCAL_HOSTS.indexOf(host) >= 0, host: host, reason: 'oficial' };
    }
    return { allowed: false, local: false, host: host, reason: 'dominio-no-autorizado' };
  }

  // ---------------------------------------------------------------------------
  // Política de almacenamiento local: localStorage NO es de fiar.
  // Sólo preferencias cosméticas; el resto es caché local de una partida
  // single-player (nunca fuente de verdad para rankings).
  // ---------------------------------------------------------------------------
  var COSMETIC_KEYS = ['settings', 'lang', 'share_base', 'music_volume', 'ui_theme'];
  var UNTRUSTED_KEYS = [
    'player_statistics', 'campaign_progress', 'daily_challenge', 'savegame_active',
    'is_premium', 'daily_queue', 'newgame_opts', 'voted_maps'
  ];
  function isCosmetic(key) { return COSMETIC_KEYS.indexOf(String(key)) >= 0; }
  /** Las claves de progreso se pueden leer para jugar, pero jamás se envían como verdad. */
  function isUntrusted(key) { return UNTRUSTED_KEYS.indexOf(String(key)) >= 0; }
  /** El cliente nunca decide puntuaciones: lo garantiza el servidor. */
  function scoreIsServerValidated() { return true; }

  // ---------------------------------------------------------------------------
  // Estado en tiempo de ejecución
  // ---------------------------------------------------------------------------
  var security = {
    hostAllowed: hostAllowed,
    check: check,
    isCosmetic: isCosmetic,
    isUntrusted: isUntrusted,
    scoreIsServerValidated: scoreIsServerValidated,
    COSMETIC_KEYS: COSMETIC_KEYS,
    UNTRUSTED_KEYS: UNTRUSTED_KEYS,
    locked: false,        // true → sin servicios en línea
    host: '',
    reason: ''
  };
  HF.security = security;

  /** Aplica la política al arrancar (idempotente). */
  security.init = function () {
    if (security.checked) return security;
    security.checked = true;

    var cfg = (HF.CFG && HF.CFG.security) || {};
    var loc = (G.location || {});
    var res = check(loc, cfg);

    security.host = res.host;
    security.reason = res.reason;
    security.locked = !res.allowed;

    if (res.allowed) return security;

    // Dominio ajeno: se avisa y se corta la nube, nunca la partida local.
    try { console.warn('[security] dominio no autorizado:', res.host, '· servicios en línea desactivados'); } catch (e) { }

    if (cfg.hardBlock && G.document && G.document.body) {
      var d = G.document;
      var el = d.createElement('div');
      el.id = 'domainLock';
      el.setAttribute('role', 'alertdialog');
      el.setAttribute('aria-label', 'Dominio no autorizado');
      el.style.cssText = 'position:fixed;inset:0;z-index:4000;display:flex;align-items:center;justify-content:center;' +
        'padding:24px;background:#080d18;color:#F4EFEA;text-align:center;font-family:inherit;';
      el.innerHTML = '<div style="max-width:460px">' +
        '<div style="font-size:26px;letter-spacing:4px;color:#F5B942;font-weight:700;margin-bottom:10px">FEDERATI</div>' +
        '<p style="color:#AEB9C9;line-height:1.6">Esta copia del juego no está autorizada en este dominio.<br>' +
        'El original está en <b style="color:#F4EFEA">https://federati.org/</b>.</p>' +
        '</div>';
      d.body.appendChild(el);
    }
    return security;
  };

  // Aplicar en cuanto se carga (config.js ya está leído).
  try { security.init(); } catch (e) { }
})(window);
