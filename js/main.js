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
  const openHub = () => {
    HF.go('hub');
    dropBootSplash();
    G.setTimeout(() => { try { HF.cloud.initIdentity(); HF.cloud.flushQueue(); } catch (e) { } }, 0);
    G.addEventListener('online', () => { try { HF.cloud.flushQueue(); } catch (e) { } });
  };

  // Arranque: restaurar guardados y decidir si toca la introducción.
  const boot = () => {
    HF.store.recover('savegame_active');
    HF.store.recover('tribe_profile');

    const hash = location.hash || '';
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
