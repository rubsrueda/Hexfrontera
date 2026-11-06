'use strict';
// Pantalla de Mapas (js/maps.js): metadatos, lista, acciones por mapa, enlaces
// para compartir mapas publicados y enrutado de #map=<id>.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const JS = path.join(__dirname, '..', 'js');
let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };

function node() {
  return {
    innerHTML: '', textContent: '', isConnected: true,
    classList: { add() { }, remove() { }, toggle() { } },
    querySelector() { return null; }, querySelectorAll() { return []; },
    addEventListener() { }, removeEventListener() { }, dataset: {}
  };
}

function boot(opts) {
  opts = opts || {};
  const app = node(), toast = node();
  const store = new Map(Object.entries(opts.maps ? { hf_maps: JSON.stringify(opts.maps) } : {}));
  const doc = {
    querySelector(sel) {
      if (sel === '#app') return app;
      if (sel === '#modal') return node();
      if (sel === '#toast') return toast;
      return null;
    },
    querySelectorAll() { return []; },
    getElementById() { return null; },
    createElement() { return node(); },
    addEventListener() { }, removeEventListener() { },
    documentElement: { lang: 'es', dir: 'ltr', style: {} },
    body: { classList: { add() { }, remove() { }, toggle() { } }, appendChild() { } },
    visibilityState: 'visible', hidden: false
  };
  const sandbox = {
    console, HF: {}, document: doc, window: null,
    navigator: { onLine: false, language: 'es' },
    location: opts.loc || { href: 'https://hexfrontier.test/juego/index.html', protocol: 'https:', hostname: 'hexfrontier.test', hash: '' },
    localStorage: {
      getItem: k => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: k => store.delete(k),
      key: i => Array.from(store.keys())[i] || null,
      get length() { return store.size; }
    },
    setTimeout, clearTimeout, setInterval, clearInterval,
    Promise, Date, Math, JSON,
    btoa: s => Buffer.from(String(s), 'binary').toString('base64'),
    atob: s => Buffer.from(String(s), 'base64').toString('binary'),
    performance: { now: () => Date.now() },
    addEventListener() { }, removeEventListener() { }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const f of ['util.js', 'config.js', 'data.js', 'names.js', 'i18n.js', 'mapgen.js', 'engine.js', 'cloud.js', 'screens.js', 'editor.js', 'maps.js'])
    vm.runInContext(fs.readFileSync(path.join(JS, f), 'utf8'), sandbox);
  // Base neutra por defecto: el test no debe depender de la URL publicada que
  // el jugador tenga configurada en config.js.
  sandbox.HF.CFG.share.base = (opts && opts.base != null) ? opts.base : '';
  return { HF: sandbox.HF, sandbox, app, store };
}

// ---------------------------------------------------------------------------
// 1. Metadatos y lista de mapas propios
// ---------------------------------------------------------------------------
{
  const w = boot();
  const HF = w.HF;
  const R = 7;
  const cells = HF.makeGrid(R).cells.map(c => c && HF.newCell(c));
  const code = HF.exportMap(R, cells, 4242);
  const meta = HF.mapCodeMeta(code);
  ok(!!meta && meta.R === R && meta.seed === 4242, 'lee R y semilla de la cabecera del mapa');
  ok(HF.mapCodeMeta('basura') === null, 'un código inválido no tiene metadatos');

  HF.store.set('maps', [
    { name: 'Viejo', code },
    { name: 'Publicado', code, R, seed: 4242, factions: 2, updatedAt: 1700000000000, publishedId: 42 }
  ]);
  const mine = HF.myMaps();
  ok(mine.length === 2 && mine[0].key === 'mine:0' && mine[1].key === 'mine:1', 'normaliza "Mis mapas" con claves estables');
  ok(mine[0].R === R && mine[0].seed === 4242, 'un mapa antiguo (solo name+code) recupera R y semilla');
  ok(mine[1].publishedId === 42 && mine[1].factions === 2, 'conserva publicación y facciones guardadas');
}

// ---------------------------------------------------------------------------
// 2. Render de la lista (mis mapas / comunidad)
// ---------------------------------------------------------------------------
{
  const w = boot({ maps: [{ name: 'Cruce', code: 'v1:7:9:AAAA', R: 7 }] });
  const HF = w.HF;
  const [mine] = HF.myMaps();
  const collapsed = HF.mapsCardHTML(mine, { tab: 'mine', sel: null });
  ok(collapsed.includes('Cruce') && collapsed.includes('R7'), 'la tarjeta muestra nombre y tamaño');
  ok(collapsed.includes('Toca para ver sus acciones') && !collapsed.includes('data-act'), 'plegada no muestra acciones');
  ok(collapsed.includes('data-pick="mine:0"'), 'la tarjeta es seleccionable');

  const open = HF.mapsCardHTML(mine, { tab: 'mine', sel: 'mine:0' });
  ok(open.includes('class="card sel"'), 'la tarjeta seleccionada se resalta');
  ok(open.includes('data-act="play"') && open.includes('data-act="edit"') && open.includes('data-act="share"'), 'desplegada ofrece jugar, editar y compartir');
  ok(open.includes('data-act="del"'), 'mis mapas incluyen eliminar');

  const published = HF.mapsCardHTML(Object.assign({}, mine, { publishedId: 7 }), { tab: 'mine', sel: null });
  ok(published.includes('🌐'), 'un mapa publicado se marca con globo');

  const com = { key: 'com:55', id: 55, name: 'Valle', author: 'Ana', votes: 9, R: 12, factions: 3, code: 'v1:12:1:AAAA' };
  const cOpen = HF.mapsCardHTML(com, { tab: 'community', sel: 'com:55' });
  ok(cOpen.includes('Ana') && cOpen.includes('👍 9'), 'la tarjeta de comunidad muestra autor y votos');
  ok(cOpen.includes('data-act="vote"') && !cOpen.includes('data-act="del"'), 'la comunidad vota y no elimina');
  ok(cOpen.includes('data-act="share"') && cOpen.includes('data-act="edit"'), 'la comunidad también se comparte y se edita');

  ok(HF.mapsListHTML([], { tab: 'mine' }).includes('id="emptyNew"'), 'sin mapas propios ofrece abrir el editor');
  ok(HF.mapsListHTML([], { tab: 'community', offline: true }).includes('Modo sin conexión'), 'sin red la comunidad lo indica');
}

// ---------------------------------------------------------------------------
// 3. Enlaces para compartir
// ---------------------------------------------------------------------------
{
  const w = boot();
  const HF = w.HF;
  const base = 'https://hexfrontier.test/juego/index.html';
  ok(HF.mapShareUrl(12) === base + '#map=12', 'el enlace usa #map=<id>');
  ok(HF.mapShareUrl('a b').endsWith('#map=a%20b'), 'el id se codifica en el enlace');
  ok(HF.shareUrl('replay', 'v1abc', true) === base + '#replay=v1abc', 'las repeticiones viajan sin recodificar');

  // URL pública configurable (despliegues en GitHub Pages, dominio propio…).
  HF.CFG.share.base = 'https://juego.example/';
  ok(HF.shareBase() === 'https://juego.example/', 'respeta HF.CFG.share.base');
  ok(HF.mapShareUrl(3) === 'https://juego.example/#map=3', 'el enlace usa la base configurada');
  HF.CFG.share.base = '';

  // La dirección guardada por el jugador manda sobre la del código.
  HF.CFG.share.base = 'https://cfg.example/';
  HF.setShareBase('https://mi-sitio.example/juego/');
  ok(HF.shareBase() === 'https://mi-sitio.example/juego/', 'Ajustes manda sobre config.js');
  ok(HF.mapShareUrl(3) === 'https://mi-sitio.example/juego/#map=3', 'enlace con la dirección guardada');
  ok(HF.normalizeShareBase('javascript:alert(1)') === '', 'rechaza esquemas que no son http(s)');
  ok(HF.normalizeShareBase('  https://x.example/a#frag  ') === 'https://x.example/a', 'limpia espacios y hash');
  HF.setShareBase('ftp://nope');
  ok(HF.shareBase() === 'https://cfg.example/', 'una dirección inválida borra la guardada');
  HF.setShareBase('');
  ok(HF.shareBase() === 'https://cfg.example/', 'borrar vuelve a la configuración');
  HF.CFG.share.base = '';

  // Distinguir "red local" de dirección pública (no es cuestión de internet).
  ok(HF.isLocalAddress('http://localhost:8080/') && HF.isLocalAddress('http://192.168.1.5/'), 'detecta direcciones de red local');
  ok(!HF.isLocalAddress('https://juego.example/'), 'una dirección pública no es local');

  // En local no hay enlace automático… pero si el jugador configura una
  // dirección, el enlace se genera igual (la conexión no influye).
  const local = boot({ loc: { href: 'file:///D:/Agente/PROYECTOS/hexfrontier/index.html', protocol: 'file:', hostname: '', hash: '' } });
  const L = local.HF;
  ok(L.shareBase() === '', 'en file:// no hay URL pública automática');
  ok(L.mapShareUrl(3) === '', 'no se generan enlaces locales rotos');
  let modalHTML = '';
  L.modal = h => { modalHTML = h; };
  L.mapShareModal({ id: 3, name: 'Valle', code: 'v1:7:9:AAAA' });
  ok(!modalHTML.includes('id="msUrl"'), 'sin URL no se muestra un enlace inútil');
  ok(modalHTML.includes('id="msCode"') && modalHTML.includes('v1:7:9:AAAA'), 'se comparte el código del mapa');
  ok(modalHTML.includes('id="msSetup"'), 'ofrece configurar la dirección pública');
  ok(/conexión a internet/i.test(modalHTML), 'aclara que no es un problema de conexión');

  L.setShareBase('https://mi-sitio.example/');
  ok(L.mapShareUrl(3) === 'https://mi-sitio.example/#map=3', 'con dirección guardada, file:// también genera enlace');
  L.mapShareModal({ id: 3, name: 'Valle', code: 'v1:7:9:AAAA' });
  ok(modalHTML.includes('id="msUrl"') && modalHTML.includes('https://mi-sitio.example/#map=3'), 'el modal muestra el enlace público');

  // Lo que se pega en "Tengo un código": código, enlace, id o repetición.
  ok(L.parseMapRef('v1:7:9:AAAA').kind === 'code', 'reconoce un código de mapa');
  ok(L.parseMapRef('https://x/y#map=12').kind === 'id' && L.parseMapRef('https://x/y#map=12').id === '12', 'reconoce un enlace con #map=');
  ok(L.parseMapRef('file:///D:/index.html#map=3').kind === 'id' && L.parseMapRef('file:///D:/index.html#map=3').id === '3', 'reconoce el enlace local con #map=');
  ok(L.parseMapRef('?map=7').kind === 'id', 'reconoce ?map=');
  ok(L.parseMapRef('42').kind === 'id' && L.parseMapRef('42').id === '42', 'reconoce un id suelto');
  ok(L.parseMapRef('https://x/y#replay=abc').kind === 'replay', 'distingue un enlace de repetición');
  ok(L.parseMapRef('hola').kind === 'invalid', 'rechaza texto sin sentido');
  ok(L.parseMapRef('') === null, 'vacío no es una referencia');

  HF.store.set('maps', []);
  HF.rememberPublished('v1:7:1:AAAA', { id: 99, name: 'Nuevo' });
  const saved = HF.savedMaps();
  ok(saved.length === 1 && saved[0].publishedId === 99, 'publicar un mapa no guardado lo añade a "Mis mapas"');
  ok(saved[0].name === 'Nuevo', 'conserva el nombre publicado');
}

// ---------------------------------------------------------------------------
// 4. Publicar y compartir
// ---------------------------------------------------------------------------
(async () => {
  {
    const w = boot({ maps: [{ name: 'Cruce', code: 'v1:7:9:AAAA', R: 7 }] });
    const HF = w.HF;
    let published = null;
    HF.cloud.publishMap = body => { published = body; return Promise.resolve({ ok: true, data: [{ id: 123 }] }); };
    const info = await HF.publishMapCode({ name: 'Cruce', author: 'Yo', code: 'v1:7:9:AAAA', radius: 7, factions: 2 });
    ok(info && info.id === 123, 'publishMapCode devuelve el id de la fila publicada');
    ok(published && published.radius === 7 && published.factions_count === 2, 'publica con tamaño y facciones');
    ok(published.author_id === HF.cloud.playerId(), 'la publicación queda ligada al jugador');
    ok(HF.savedMaps()[0].publishedId === 123, 'el id publicado se recuerda en el mapa local');

    HF.cloud.publishMap = () => Promise.resolve({ ok: false, offline: true });
    const info2 = await HF.publishMapCode({ name: 'X', code: 'v1:7:9:BBBB' });
    ok(info2 === null, 'sin conexión publicar devuelve null');
  }

  // Compartir: publicado → modal de enlace; sin publicar → invita a publicar.
  {
    const w = boot({ maps: [{ name: 'Cruce', code: 'v1:7:9:AAAA' }, { name: 'Pub', code: 'v1:7:9:BBBB', publishedId: 5 }] });
    const HF = w.HF;
    let shareArg = null, modalHTML = '';
    HF.mapShareModal = entry => { shareArg = entry; };
    HF.modal = (html) => { modalHTML = html; };
    const [mine, pub] = HF.myMaps();
    HF.shareMapEntry(pub);
    ok(shareArg && shareArg.id === 5, 'un mapa publicado se comparte directamente');
    HF.shareMapEntry(mine);
    ok(modalHTML.includes('Publicar y compartir'), 'un mapa sin publicar pide publicarlo primero');
  }

  // Enlaces entrantes #map=<id> y #map=<código>
  {
    const w = boot();
    const HF = w.HF;
    let landing = null, goArg = null;
    HF.mapLanding = d => { landing = d; };
    HF.go = (name, arg) => { goArg = { name, arg }; };
    let fetched = null;
    HF.cloud.getCommunityMap = id => { fetched = id; return Promise.resolve({ id: '77', name: 'Compartido', author: 'Ana', upvotes: 3, radius: 12, factions_count: 2, code: 'v1:12:5:AAAA' }); };
    HF.openSharedMap('77');
    await new Promise(r => setTimeout(r, 10));
    ok(goArg && goArg.name === 'maps' && goArg.arg.tab === 'community', 'un enlace abre la pantalla de mapas en la comunidad');
    ok(fetched === '77', 'consulta la fila publicada por id');
    ok(landing && String(landing.id) === '77' && landing.name === 'Compartido', 'muestra la ficha del mapa compartido');

    landing = null;
    const code = HF.exportMap(7, HF.makeGrid(7).cells.map(c => c && HF.newCell(c)), 3);
    HF.openSharedMap(code);
    ok(landing && landing.code === code, 'un enlace con código directo abre la ficha sin red');
  }

  // -------------------------------------------------------------------------
  // 5. Enrutado de main.js para #map=
  // -------------------------------------------------------------------------
  {
    let opened = null, went = null, reloaded = 0;
    const box = {
      HF: {
        go: n => { went = n; },
        openSharedMap: v => { opened = v; },
        playReplayFromCode: () => { },
        cloud: { initIdentity() { }, flushQueue() { } },
        store: { recover() { }, get() { return null; }, set() { } },
        telemetry: { install() { } }
      },
      location: { hash: '#map=ABC123', protocol: 'http:', hostname: 'localhost', href: 'http://localhost/index.html' },
      navigator: { onLine: false },
      document: { addEventListener() { }, querySelector() { return null; } },
      setTimeout, clearTimeout, Promise, Date, Math, JSON,
      addEventListener() { }, removeEventListener() { }
    };
    box.window = box;
    vm.createContext(box);
    vm.runInContext(fs.readFileSync(path.join(JS, 'main.js'), 'utf8'), box);
    ok(opened === 'ABC123', 'main.js enruta #map=<id> a openSharedMap');
    ok(went === null, 'con un enlace de mapa no monta el Hub directamente');
  }

  // -------------------------------------------------------------------------
  // 5b. Código manual: jugar o editar (código, enlace o id)
  // -------------------------------------------------------------------------
  {
    const w = boot();
    const HF = w.HF;
    const code = HF.exportMap(7, HF.makeGrid(7).cells.map(c => c && HF.newCell(c)), 5);
    let played = null, went = null;
    HF.playMap = (R, cells, seed, meta) => { played = { R, seed, meta }; };
    HF.go = (name, arg) => { went = { name, arg }; };
    HF.closeModal = () => { };

    const play = await HF.manualMapUse(code, 'play');
    ok(play.ok && played && played.R === 7 && played.seed === 5, 'un código se puede jugar');
    const edit = await HF.manualMapUse(code, 'edit');
    ok(edit.ok && went && went.name === 'editor', 'un código se puede abrir en el editor');
    ok(went && went.arg.code === code && went.arg.from === 'maps', 'el editor recibe el código y vuelve a Mapas');

    played = null; went = null;
    const bad = await HF.manualMapUse('v1:99:0:AAAA', 'play');
    ok(!bad.ok && !!bad.msg && !played, 'un código corrupto no lanza una partida');
    const empty = await HF.manualMapUse('   ', 'edit');
    ok(!empty.ok && !went, 'sin código avisa y no navega');

    // Un enlace (o un id) se resuelve contra la comunidad y luego se juega/edita.
    let asked = null;
    HF.cloud.getCommunityMap = id => {
      asked = id;
      return Promise.resolve(id === '3' ? { id: 3, name: 'Valle', code, radius: 7, factions_count: 2 } : null);
    };
    const editUrl = await HF.manualMapUse('file:///D:/Agente/PROYECTOS/hexfrontier/index.html#map=3', 'edit');
    ok(asked === '3', 'extrae el id del enlace pegado');
    ok(editUrl.ok && went && went.name === 'editor' && went.arg.code === code, 'un enlace #map= abre el editor con el mapa');
    ok(went && went.arg.name === 'Valle', 'el editor recibe el nombre del mapa publicado');

    played = null; went = null;
    const playId = await HF.manualMapUse('3', 'play');
    ok(playId.ok && played && played.meta && played.meta.mapId === 3, 'un id suelto juega el mapa publicado');

    played = null;
    const missing = await HF.manualMapUse('999', 'play');
    ok(!missing.ok && !played, 'un id inexistente avisa y no juega');
    const rep = await HF.manualMapUse('https://x/y#replay=abc', 'play');
    ok(!rep.ok && /repetici/i.test(rep.msg), 'un enlace de repetición se rechaza con un aviso claro');

    let html = '';
    HF.modal = h => { html = h; };
    HF.manualMapModal();
    ok(html.includes('id="mmGo"') && html.includes('id="mmEdit"'), 'el modal ofrece Jugar y Editar');
    ok(html.includes('▶ Jugar') && html.includes('✎ Editar'), 'las dos acciones se rotulan');
    ok(html.includes('#map='), 'el modal menciona que acepta enlaces');
  }

  // -------------------------------------------------------------------------
  // 6. La pantalla se registra y pinta lo esperado
  // -------------------------------------------------------------------------
  {
    const w = boot({ maps: [{ name: 'Cruce', code: 'v1:7:9:AAAA', R: 7, factions: 2 }] });
    const HF = w.HF;
    HF.go('maps', { tab: 'mine' });
    const html = w.app.innerHTML;
    ok(html.includes('mapTabs') && html.includes('Mis mapas') && html.includes('Comunidad'), 'la pantalla ofrece las dos pestañas');
    ok(html.includes('Cruce'), 'lista los mapas propios');
    ok(html.includes('id="newMap"') && html.includes('Editor de mapas'), 'incluye el botón del editor de mapas');
    ok(html.includes('id="manualCode"'), 'permite abrir un mapa por código');
    ok(!html.includes('loading'), 'sin pestaña comunidad no consulta la red');

    HF.cloud.getCommunityMaps = () => Promise.resolve([{ id: 9, name: 'Valle', author: 'Ana', upvotes: 4, radius: 12, factions_count: 3, code: 'v1:12:1:AAAA' }]);
    HF.go('maps', { tab: 'community' });
    await new Promise(r => setTimeout(r, 10));
    ok(w.app.innerHTML.includes('Valle') && w.app.innerHTML.includes('Ana'), 'la pestaña comunidad carga y lista los mapas');
  }

  console.log(fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK');
  process.exit(fail ? 1 : 0);
})();
