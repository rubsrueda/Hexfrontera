(function (G) {
  const HF = G.HF;
  HF.store.recover('savegame_active');
  HF.store.recover('tribe_profile');
  document.addEventListener('contextmenu', e => e.preventDefault());
  const hash = location.hash || '';
  if (hash.startsWith('#replay=')) {
    HF.playReplayFromCode(hash.slice(8));
    return;
  }
  HF.go('hub');
  // La identidad se genera en local y la red va en segundo plano: nunca
  // bloquea el Hub ni las pantallas locales.
  G.setTimeout(() => { try { HF.cloud.initIdentity(); HF.cloud.flushQueue(); } catch (e) { } }, 0);
  G.addEventListener('online', () => { try { HF.cloud.flushQueue(); } catch (e) { } });
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
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
