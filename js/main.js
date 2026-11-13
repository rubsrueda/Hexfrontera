(function (G) {
  const HF = G.HF;

  // El interceptor ya se instala al cargar js/telemetry.js (antes que este
  // archivo). La llamada es idempotente y deja explícito el punto de arranque
  // exigido por la arquitectura: main.js garantiza la telemetría.
  if (HF.telemetry && HF.telemetry.install) HF.telemetry.install();

  document.addEventListener('contextmenu', e => e.preventDefault());

  // Quita la pantalla de carga (splash) que cubre la descarga de scripts.
  const dropBootSplash = () => {
    const b = (document.getElementById ? document.getElementById('boot') : null);
    if (!b) return;
    b.classList.add('is-out');
    G.setTimeout(() => { if (b.parentNode) b.parentNode.removeChild(b); }, 420);
  };

  // Hub: menú principal (y red en segundo plano, sin bloquear).
  let entrySurveyAsked = false;
  const openHub = () => {
    HF.go('hub');
    dropBootSplash();
    G.setTimeout(() => { try { HF.cloud.initIdentity(); HF.cloud.flushQueue(); } catch (e) { } }, 0);
    G.addEventListener('online', () => { try { HF.cloud.flushQueue(); } catch (e) { } });
    // GAME_ENTRY: una sola vez por sesión y solo si el Hub sigue delante.
    // Si el jugador entró por un enlace directo a partida/replay, no se pregunta.
    if (!entrySurveyAsked) {
      entrySurveyAsked = true;
      G.setTimeout(() => {
        if (HF.currentScreen !== 'hub') return;
        if (HF.EventFeedbackModal) {
          HF.EventFeedbackModal.checkAndRender('GAME_ENTRY', { delay: 700 });
        }
      }, 2600);
    }
  };

  // Arranque: restaurar guardados y decidir si toca la introducción.
  const boot = async () => {
    // Si el runtime i18n no está cargado (pruebas o build mínimo), no bloquea
    // el arranque: el idioma se queda en el de por defecto.
    if (HF.initFirstBootLanguage) await HF.initFirstBootLanguage();
    
    HF.store.recover('savegame_active');
    HF.store.recover('tribe_profile');

    const hash = location.hash || '';

    // Enlace corto de repetición: federati.org/?r=X9K2A
    // El código de la partida se guarda en la nube y se resuelve al abrirlo.
    const shortReplayCode = HF.links && HF.links.shortReplayFromUrl ? HF.links.shortReplayFromUrl() : null;
    if (shortReplayCode) {
      dropBootSplash();
      const fail = (msg) => { if (msg) HF.toast(msg, 3200); openHub(); };
      if (!HF.cloud || !HF.cloud.resolveShortMap) return fail('Enlaces cortos no disponibles');
      HF.toast('Abriendo repetición compartida…', 1200);
      HF.cloud.resolveShortMap(shortReplayCode).then(r => {
        if (!r || !r.ok || !r.code) return fail((r && r.msg) || 'Enlace de repetición no válido');
        HF.playReplayFromCode(r.code);
      }).catch(() => fail('No se pudo abrir el enlace'));
      return;
    }

    // Enlace corto de mapa del editor: federati.org/?m=X9K2A
    // El código se resuelve en la nube (tabla pequeña de enlaces).
    const shortMapCode = HF.links && HF.links.shortMapFromUrl ? HF.links.shortMapFromUrl() : null;
    if (shortMapCode) {
      dropBootSplash();
      const fail = (msg) => { if (msg) HF.toast(msg, 3200); openHub(); };
      if (!HF.cloud || !HF.cloud.resolveShortMap) return fail('Enlaces cortos no disponibles');
      HF.toast('Abriendo mapa compartido…', 1200);
      HF.cloud.resolveShortMap(shortMapCode).then(r => {
        if (!r || !r.ok || !r.code) return fail((r && r.msg) || 'Enlace no válido');
        HF.openSharedMap(r.code);
      }).catch(() => fail('No se pudo abrir el enlace'));
      return;
    }

    // Enlace corto de mapa: federati.org/?seed=XXXXXXXXX
    // Se resuelve sin red: la semilla reconstruye el mapa idéntico.
    const seedInUrl = /[?&](?:seed|s)=/.test(String(location.search || '')) || /^#(?:seed|s)=/.test(hash);
    if (seedInUrl) {
      const spec = HF.links && HF.links.fromUrl ? HF.links.fromUrl() : null;
      dropBootSplash();
      if (!spec) {
        HF.toast('Enlace de mapa no válido');
        openHub();
        return;
      }
      try {
        HF.startGame(HF.makeGame(Object.assign({ mode: 'skirmish', goal: { type: 'conquer' } }, spec), HF.loadTribe()));
      } catch (e) {
        console.error('[links] no se pudo abrir el mapa compartido:', e);
        openHub();
      }
      return;
    }

    if (hash.startsWith('#map=')) {
      // Enlace compartido de un mapa publicado en la comunidad.
      dropBootSplash();
      HF.openSharedMap(decodeURIComponent(hash.slice(5)));
      return;
    }
    if (hash.startsWith('#replay=')) {
      dropBootSplash();
      HF.playReplayFromCode(hash.slice(8));
      return;
    }

    // Pantalla de introducción (especificacion_pantalla_lore.md):
    // se muestra ANTES del menú principal y sólo si el jugador no la desactivó.
    // Escape: abrir con ?nolore=1 la salta sin tocar los ajustes.
    const settings = HF.settings();
    const skipLore = /[?&]nolore=1/.test(String(location.search || ''));
    const wantLore = !skipLore && settings.showLoreIntro !== false;

    if (!wantLore) { openHub(); return; }

    if (!HF.LoreScreen) {
      // Diagnóstico explícito: si falta el script, el fallo no pasa inadvertido.
      console.error('[lore] HF.LoreScreen no está cargado: revisa js/ui/components/lore-screen/*.js en index.html');
      openHub();
      return;
    }

    HF.LoreScreen.onComplete(() => { openHub(); });
    try {
      HF.LoreScreen.show('imperio');
      dropBootSplash();
    } catch (e) {
      console.error('[lore] no se pudo abrir la introducción:', e);
      openHub();
    }
  };

  const ready = HF.platform && HF.platform.ready;
  if (ready && typeof ready.then === 'function') ready.then(boot, boot);
  else boot();

  // El service worker solo tiene sentido en web: en Electron el protocolo es
  // app:// y en Capacitor el bundle ya es local. Cachearlo retrasaría las
  // actualizaciones de la app instalada.
  if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !(HF.platform && HF.platform.native)) {
    // al activarse una versión nueva, recargar una vez para no quedarse con JS viejo
    const reload = () => { if (!window.__hfSwReload) { window.__hfSwReload = true; location.reload(); } };
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (nw) nw.addEventListener('statechange', () => { if (nw.state === 'activated') reload(); });
      });
      navigator.serviceWorker.addEventListener('controllerchange', reload);
    }).catch(() => { });
  }
})(window);
