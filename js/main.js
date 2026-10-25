(function (G) {
  const HF = G.HF;
  HF.store.recover('savegame_active');
  HF.store.recover('tribe_profile');
  document.addEventListener('contextmenu', e => e.preventDefault());
  HF.go('hub');
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
})(window);
