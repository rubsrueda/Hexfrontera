// La version del cache debe subir en cada release: si no, el navegador sigue
// sirviendo el JS viejo y los cambios de arte/tamaños no llegan a la partida.
const C = 'hexfrontier-v94';
const FILES = [
  './', 'index.html', 'css/style.css', 'manifest.json', 'icon.svg',
  'fonts/plus-jakarta-sans-latin.woff2', 'fonts/plus-jakarta-sans-latin-ext.woff2', 'fonts/plus-jakarta-sans-cyrillic.woff2',
  'js/util.js', 'js/config.js', 'js/music.js', 'js/art.js', 'js/artdata.js', 'js/data.js', 'js/mapgen.js',
  'js/engine.js', 'js/ai.js', 'js/board.js', 'js/cloud.js', 'js/progress.js', 'js/i18n.js', 'js/names.js',
  'js/screens.js', 'js/game.js', 'js/editor.js', 'js/replay.js', 'js/replays.js', 'js/main.js',
  // arte que no va incrustado en artdata.js (el resto son data URIs)
  'art/nube.png', 'art/arbol.png',
  'assets/crests/c01.webp', 'assets/crests/c02.webp', 'assets/crests/c03.webp', 'assets/crests/c04.webp',
  'assets/crests/c05.webp', 'assets/crests/c06.webp', 'assets/crests/c07.webp', 'assets/crests/c08.webp',
  'assets/crests/c09.webp', 'assets/crests/c10.webp', 'assets/crests/c11.webp', 'assets/crests/c12.webp',
  'assets/ui/build.webp', 'assets/ui/recruit.webp', 'assets/ui/map.webp', 'assets/ui/campaign.webp',
  'assets/ui/history.webp', 'assets/ui/news.webp', 'assets/ui/stats.webp', 'assets/ui/gold.webp',
  'assets/ui/wheat.webp', 'assets/ui/wood.webp', 'assets/ui/codex.webp'
];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => { e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))); });
