/* Música clásica dinámica (grabaciones de dominio público de Wikimedia Commons).
   Sustituye al sintetizador procedural de util.js, que queda como respaldo si
   no hay red o si el navegador no puede reproducir ninguna pista.

   - Inicio aleatorio entre las piezas de calma.
   - Reacciona a la estación (HF.season) con fundido cruzado.
   - Reacciona a la guerra: enemigos a 2 casillas o menos de la capital propia.
   - Respeta HF.settings().sound, la pestaña oculta y el desbloqueo por gesto. */
(function (G) {
  const HF = G.HF;
  const legacy = HF.bgm || null;              // sintetizador anterior (respaldo)
  const CFG = (HF.CFG && HF.CFG.music) || {};
  const ENABLED = CFG.enabled !== false;
  const VOL = typeof CFG.volume === 'number' ? CFG.volume : 0.3;
  const FADE = typeof CFG.fade === 'number' ? CFG.fade : 1.8;
  const WAR_RADIUS = typeof CFG.warRadius === 'number' ? CFG.warRadius : 2;

  // .oga/.ogg originales; el .mp3 es la transcodificación de Wikimedia, que se
  // ofrece primero para máxima compatibilidad (Safari/iOS). Si una falla, el
  // navegador prueba la siguiente fuente del mismo <audio>.
  const WIKI = 'https://upload.wikimedia.org/wikipedia/commons/';
  const TRACKS = {
    spring: WIKI + 'f/ff/Vivaldi_-_Four_Seasons_1_Spring_mvt_1_Allegro_-_John_Harrison_violin.oga',
    calm: WIKI + 'b/be/Clair_de_lune_%28Claude_Debussy%29_Suite_bergamasque.ogg',
    winter: WIKI + '2/2a/Vivaldi_-_Four_Seasons_4_Winter_mvt_1_Allegro_non_molto_-_John_Harrison_violin.oga',
    war: WIKI + '1/17/Antonin_Dvorak_-_symphony_no._9_in_e_minor_%27from_the_new_world%27%2C_op._95_-_iv._allegro_con_fuoco.ogg',
    summer: WIKI + 'd/d8/Johannes_Brahms_-_Ungarischer_Tanz_5_g-moll.ogg'
  };
  const TITLE = {
    spring: 'Vivaldi · La primavera',
    calm: 'Debussy · Clair de lune',
    winter: 'Vivaldi · El invierno',
    war: 'Dvořák · Sinfonía del Nuevo Mundo',
    summer: 'Brahms · Danza húngara n.º 5'
  };
  const PEACEFUL = ['spring', 'calm', 'summer'];

  const els = Object.create(null);   // key -> HTMLAudioElement
  const fades = new Map();           // element -> interval id
  const bad = new Set();             // pistas que el navegador no pudo cargar
  let on = false, game = null, curKey = null, curEl = null;
  let warOn = false, lastSeason = null, usingLegacy = false;
  let hiddenPaused = false, gestureArmed = false;

  const soundOn = () => { try { return HF.settings().sound !== false; } catch (e) { return true; } };
  const online = () => !(G.navigator && G.navigator.onLine === false);
  const season = () => (HF.season && game ? HF.season(game) : 0);

  // URL de la transcodificación MP3 de Wikimedia a partir del original.
  function mp3Of(u) {
    const m = /^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/([0-9a-f])\/([0-9a-f]{2})\/(.+)$/.exec(u);
    return m ? WIKI + 'transcoded/' + m[1] + '/' + m[2] + '/' + m[3] + '/' + m[3] + '.mp3' : null;
  }

  function addSource(a, src, type) {
    try {
      const s = G.document.createElement('source');
      s.src = src; s.type = type;
      a.appendChild(s);
    } catch (e) { }
  }

  function elFor(key) {
    if (els[key]) return els[key];
    let a;
    try { a = G.Audio ? new G.Audio() : G.document.createElement('audio'); } catch (e) { return null; }
    a.preload = 'none';
    a.loop = true;
    a.volume = 0;
    const mp3 = mp3Of(TRACKS[key]);
    if (mp3) addSource(a, mp3, 'audio/mpeg');
    addSource(a, TRACKS[key], 'audio/ogg');
    a.addEventListener('error', () => { bad.add(key); if (curKey === key) nextPeaceful(key); });
    try { a.load(); } catch (e) { }
    els[key] = a;
    return a;
  }

  function clearFade(el) {
    const id = fades.get(el);
    if (id) { G.clearInterval(id); fades.delete(el); }
  }

  function fade(el, to, secs, done) {
    if (!el) return;
    clearFade(el);
    const from = el.volume || 0, t0 = Date.now(), dur = Math.max(.05, secs || 1) * 1000;
    el.volume = Math.max(0, Math.min(1, from));
    const id = G.setInterval(() => {
      const k = Math.min(1, (Date.now() - t0) / dur);
      try { el.volume = Math.max(0, Math.min(1, from + (to - from) * k)); } catch (e) { }
      if (k >= 1) { clearFade(el); if (done) done(); }
    }, 60);
    fades.set(el, id);
  }

  function desiredKey() {
    if (warOn) return 'war';
    const s = season();
    return s === 3 ? 'winter' : s === 0 ? 'spring' : s === 1 ? 'summer' : 'calm';
  }

  function nextPeaceful(exclude) {
    const opts = PEACEFUL.filter(k => k !== exclude && !bad.has(k));
    if (!opts.length) { toLegacy('ninguna pista disponible'); return; }
    playKey(opts[Math.floor(Math.random() * opts.length)]);
  }

  function toLegacy(reason) {
    if (usingLegacy) return;
    usingLegacy = true;
    if (curEl) { try { curEl.pause(); } catch (e) { } }
    curEl = null; curKey = null;
    if (!legacy) return;
    console.warn('[music] ' + reason + '; se usa la música procedural');
    try { legacy.start(); if (game) legacy.update(game); } catch (e) { }
  }

  function playKey(key) {
    if (!ENABLED || usingLegacy || !on) return;
    if (bad.has(key)) {
      if (key === 'war') { toLegacy('pista de guerra no disponible'); return; }
      nextPeaceful(key); return;
    }
    const el = elFor(key);
    if (!el) { toLegacy('sin soporte de audio'); return; }
    if (curEl === el && !el.paused) return;
    const prev = curEl;
    curKey = key; curEl = el;
    try { el.volume = 0; } catch (e) { }
    let p = null;
    try { p = el.play(); } catch (e) { p = null; }
    if (p && p.catch) p.catch(err => onPlayError(key, err));
    fade(el, VOL, FADE);
    if (prev && prev !== el) fade(prev, 0, FADE, () => { try { prev.pause(); } catch (e) { } });
  }

  function onPlayError(key, err) {
    if (err && err.name === 'NotAllowedError') { waitGesture(); return; }
    bad.add(key);
    if (key === 'war') { toLegacy('no se pudo reproducir la pista de guerra'); return; }
    nextPeaceful(key);
  }

  function waitGesture() {
    if (gestureArmed || !G.addEventListener) return;
    gestureArmed = true;
    const fn = () => {
      gestureArmed = false;
      try { G.removeEventListener('pointerdown', fn, true); } catch (e) { }
      if (on) playKey(desiredKey());
    };
    try { G.addEventListener('pointerdown', fn, true); } catch (e) { }
  }

  // Enemigo a WAR_RADIUS casillas o menos de una capital propia.
  function threatNearCapital() {
    const B = HF.B;
    if (!game || !game.cells || !B || !HF.hexDist) return false;
    const caps = game.cells.filter(c => c && c.cap && c.o === 0 && c.b === B.CIUDAD);
    if (!caps.length) return false;
    for (const c of game.cells) {
      if (!c || !c.u || c.u.owner === 0) continue;
      for (const cap of caps) if (HF.hexDist(c, cap) <= WAR_RADIUS) return true;
    }
    return false;
  }

  function stopEls() {
    for (const k in els) { try { els[k].pause(); } catch (e) { } clearFade(els[k]); }
  }

  function start(g) {
    if (g) game = g;
    on = true;
    if (!ENABLED) return;
    if (!soundOn()) { stopEls(); return; }
    if (!online()) { toLegacy('sin conexión'); return; }
    if (usingLegacy) { try { legacy.start(); if (game) legacy.update(game); } catch (e) { } return; }
    warOn = threatNearCapital();
    lastSeason = season();
    // Arranque aleatorio entre las piezas de calma (o guerra si ya hay peligro).
    const key = warOn ? 'war' : PEACEFUL[Math.floor(Math.random() * PEACEFUL.length)];
    playKey(key);
  }

  function checkState(g) {
    if (g) game = g;
    if (!on) return;
    if (!ENABLED) return;
    if (!soundOn()) { stopEls(); if (usingLegacy && legacy) legacy.stop(); return; }
    if (usingLegacy) { try { if (legacy) legacy.update(game); } catch (e) { } return; }
    if (!online()) { toLegacy('sin conexión'); return; }
    const w = threatNearCapital(), s = season();
    if (w !== warOn) { warOn = w; playKey(desiredKey()); return; }
    if (s !== lastSeason) { lastSeason = s; if (!warOn) playKey(desiredKey()); }
  }

  function stop() {
    on = false; warOn = false;
    if (usingLegacy) { if (legacy) legacy.stop(); return; }
    for (const k in els) fade(els[k], 0, .5, () => { try { els[k].pause(); } catch (e) { } });
    curEl = null; curKey = null;
  }

  function refresh() {
    if (!on) return;
    if (!soundOn()) { stopEls(); if (usingLegacy && legacy) legacy.stop(); return; }
    if (usingLegacy) { try { legacy.start(); if (game) legacy.update(game); } catch (e) { } return; }
    if (!curEl || curEl.paused) playKey(desiredKey());
  }

  if (G.document && G.document.addEventListener) {
    G.document.addEventListener('visibilitychange', () => {
      if (!on || usingLegacy || !ENABLED) return;
      try {
        if (G.document.hidden) {
          hiddenPaused = true;
          stopEls();
        } else if (hiddenPaused) {
          hiddenPaused = false;
          if (!soundOn() || !curEl) return;
          const rp = curEl.play();
          if (rp && rp.catch) rp.catch(() => { });
          fade(curEl, VOL, .6);
        }
      } catch (e) { }
    });
  }

  HF.music = {
    init: start,
    start,
    checkState,
    stop,
    refresh,
    playing: () => !!on && !usingLegacy,
    tension: () => warOn,
    track: () => curKey,
    title: () => TITLE[curKey] || '',
    tracks: TRACKS
  };
  // El resto del juego ya invoca HF.bgm: se mantiene como fachada.
  HF.bgm = {
    start: () => start(),
    update: g => checkState(g),
    stop,
    refresh,
    tension: () => warOn,
    playing: () => !!on
  };
})(window);
