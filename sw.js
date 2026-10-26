const C = 'hexfrontier-v53';
const FILES = ['./', 'index.html', 'css/style.css', 'manifest.json', 'icon.svg', 'js/util.js', 'js/config.js', 'js/art.js', 'js/artdata.js', 'art/piquero.jfif', 'art/arquero.jfif', 'art/jinete.jfif', 'art/asedio.jfif', 'art/barco.jfif', 'art/camino.jfif', 'art/campamento.jfif', 'art/pueblo.jfif', 'art/ciudad.jfif', 'art/bastion.jfif', 'art/nube.jfif', 'js/data.js', 'js/mapgen.js', 'js/engine.js', 'js/ai.js', 'js/board.js', 'js/progress.js', 'js/i18n.js', 'js/screens.js', 'js/game.js', 'js/editor.js', 'js/replay.js', 'js/main.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => { e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))); });
