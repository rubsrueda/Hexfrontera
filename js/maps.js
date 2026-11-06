/* Mapas: pantalla intermedia entre el Hub y el editor.
   - Lista "Mis mapas" (HF.savedMaps) y "Comunidad" (hf_community_maps).
   - Al tocar un mapa se despliegan sus acciones: jugar, editar y compartir.
   - Compartir enlaza al mapa PUBLICADO en la comunidad (#map=<id>); si el mapa
     propio aún no se ha publicado, se publica antes de compartir.
   - Botón para abrir el editor de mapas (la función que antes tenía el dock).
   Sin módulos ES ni bundlers: un script global más.
*/
(function (G) {
  const HF = G.HF;
  const en = () => (HF.lang ? HF.lang() === 'en' : false);
  const tr = (es, other) => (en() ? other : es);
  const esc = s => HF.esc(s == null ? '' : s);

  // ---------------------------------------------------------------------------
  // Metadatos y lista de mapas propios
  // ---------------------------------------------------------------------------
  // Cabecera del código (v1:R:seed:base64): leer R y semilla no necesita decodificar.
  HF.mapCodeMeta = code => {
    const parts = String(code || '').split(':');
    if (parts.length !== 4 || parts[0] !== 'v1') return null;
    const R = +parts[1], seed = +parts[2];
    if (!(R >= 3 && R <= 20)) return null;
    return { R, seed: seed >>> 0 };
  };
  // Nº de facciones con capital; se decodifica solo cuando hace falta (y se cachea).
  const factionCache = Object.create(null);
  HF.mapCodeFactions = code => {
    if (factionCache[code] != null) return factionCache[code];
    let n = null;
    try {
      const r = HF.importMap(code);
      if (!r.error) n = new Set(r.cells.filter(c => c && c.cap && c.o >= 0).map(c => c.o)).size;
    } catch (e) { }
    factionCache[code] = n;
    return n;
  };
  HF.mapDate = ts => {
    if (!ts) return '';
    try { return new Date(ts).toLocaleDateString(); } catch (e) { return ''; }
  };
  HF.myMaps = () => ((HF.savedMaps && HF.savedMaps()) || []).map((m, index) => {
    const meta = HF.mapCodeMeta(m.code) || {};
    return {
      key: 'mine:' + index,
      index,
      name: m.name || tr('Mapa sin nombre', 'Untitled map'),
      code: m.code || '',
      R: m.R || meta.R || null,
      seed: m.seed != null ? m.seed : (meta.seed || 0),
      factions: m.factions != null ? m.factions : null,
      updatedAt: m.updatedAt || m.savedAt || 0,
      publishedId: m.publishedId || null
    };
  });
  const communityEntry = row => ({
    key: 'com:' + row.id,
    id: row.id,
    name: row.name || 'Mapa',
    author: row.author || tr('Anónimo', 'Anonymous'),
    votes: +row.upvotes || 0,
    R: +row.radius || (HF.mapCodeMeta(row.code) || {}).R || null,
    factions: +row.factions_count || null,
    code: row.code || ''
  });

  // ---------------------------------------------------------------------------
  // Enlaces
  // ---------------------------------------------------------------------------
  // URL pública del mapa publicado. Vacía en file://, app:// o localhost: en ese
  // caso se comparte el CÓDIGO (ver HF.mapShareModal), que es portátil.
  HF.mapShareUrl = id => HF.shareUrl('map', id);
  // Acepta lo que el jugador pegue: código v1:…, enlace con #map=… / ?map=…,
  // un id suelto de la comunidad, o (para avisar) un enlace de repetición.
  HF.parseMapRef = value => {
    const v = String(value || '').trim();
    if (!v) return null;
    if (/^v1:/i.test(v)) return { kind: 'code', code: v };
    const m = /[#?&]map=([^&\s#]+)/i.exec(v);
    if (m) return { kind: 'id', id: decodeURIComponent(m[1]) };
    if (/[#?&]replay=/i.test(v)) return { kind: 'replay' };
    if (/^\d{1,18}$/.test(v)) return { kind: 'id', id: v };
    return { kind: 'invalid' };
  };
  HF.copyText = (txt, msg) => {
    try {
      if (G.navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt)
          .then(() => HF.toast(msg))
          .catch(() => HF.toast(tr('No se pudo copiar automáticamente', 'Could not copy automatically')));
        return true;
      }
    } catch (e) { }
    HF.toast(tr('No se pudo copiar automáticamente', 'Could not copy automatically'));
    return false;
  };
  HF.mapShareModal = function (entry) {
    const id = entry && (entry.id || entry.publishedId);
    if (!id) return;
    const url = HF.mapShareUrl(id);
    const code = (entry && entry.code) || '';
    HF.modal(`<h3>🔗 ${tr('Compartir mapa', 'Share map')}</h3>
      <div class="dim small">${esc(entry.name || 'Mapa')}</div>
      ${url
        ? `<div class="dim small" style="margin-top:6px">${tr('Enlace', 'Link')}</div>
           <textarea readonly id="msUrl" style="min-height:64px">${esc(url)}</textarea>
           <p class="dim small">${tr('El enlace abre el mapa publicado en la comunidad.', 'The link opens the map published to the community.')}</p>`
        : `<p class="neg small">${tr('Esta copia del juego no tiene una dirección pública, así que un enlace apuntaría a tu equipo y solo se abriría ahí. No tiene que ver con tu conexión a internet: es la dirección desde la que se abre el juego.', 'This copy has no public address, so a link would point to your device and only open there. It is not about your internet connection: it is the address the game is opened from.')}</p>
           <button id="msSetup" style="width:100%;margin-top:6px">🔗 ${tr('Configurar dirección pública', 'Set public address')}</button>
           <p class="dim small">${tr('Mientras tanto puedes compartir el código (funciona sin red).', 'Meanwhile you can share the code (works offline).')}</p>`}
      <div class="dim small" style="margin-top:6px">${tr('Código del mapa', 'Map code')}</div>
      <textarea readonly id="msCode" style="min-height:64px">${esc(code)}</textarea>
      <div class="row">
        ${url ? `<button id="msCopy" class="pri grow">${tr('Copiar enlace', 'Copy link')}</button>` : ''}
        <button id="msCopyCode" class="${url ? '' : 'pri grow'}">${tr('Copiar código', 'Copy code')}</button>
        <button id="msClose">${tr('Cerrar', 'Close')}</button>
      </div>`, m => {
      const cp = m.querySelector('#msCopy');
      if (cp) cp.onclick = () => HF.copyText(url, tr('Enlace copiado', 'Link copied'));
      const setup = m.querySelector('#msSetup');
      if (setup) setup.onclick = () => { HF.closeModal(); HF.askShareBase(() => HF.mapShareModal(entry)); };
      m.querySelector('#msCopyCode').onclick = () => HF.copyText(code, tr('Código copiado', 'Code copied'));
      m.querySelector('#msClose').onclick = HF.closeModal;
    });
  };
  // Guarda el id de la fila publicada en el mapa local (creándolo si no existía).
  HF.rememberPublished = function (code, info) {
    if (!code || !info || !info.id) return null;
    const list = (HF.savedMaps && HF.savedMaps()) || [];
    let i = list.findIndex(m => m.code === code);
    if (i < 0) { list.push({ name: info.name || 'Mapa', code, updatedAt: Date.now() }); i = list.length - 1; }
    list[i].publishedId = info.id;
    list[i].publishedAt = Date.now();
    if (!list[i].name && info.name) list[i].name = info.name;
    HF.store.set('maps', list);
    return list[i];
  };
  // Publica un código y devuelve { id, name } o null. Compartido con el editor.
  HF.publishMapCode = function (opts) {
    return new Promise(resolve => {
      if (!HF.cloud || !HF.cloud.publishMap) {
        HF.toast(tr('Modo sin conexión', 'Offline mode'));
        return resolve(null);
      }
      const meta = HF.mapCodeMeta(opts.code) || {};
      const factions = opts.factions || HF.mapCodeFactions(opts.code) || 2;
      HF.cloud.publishMap({
        name: opts.name || 'Mapa',
        author: opts.author || (HF.loadTribe().name || tr('Anónimo', 'Anonymous')),
        author_id: HF.cloud.playerId(),
        code: opts.code,
        radius: opts.radius || meta.R || 7,
        factions_count: factions
      }).then(r => {
        if (!r || !r.ok) {
          HF.toast(r && r.offline ? tr('Modo sin conexión', 'Offline mode') : tr('No se pudo publicar', 'Could not publish'));
          return resolve(null);
        }
        const row = Array.isArray(r.data) ? r.data[0] : r.data;
        const info = row && row.id != null ? { id: row.id, name: opts.name || row.name || 'Mapa' } : null;
        if (info) HF.rememberPublished(opts.code, info);
        resolve(info);
      }).catch(() => {
        HF.toast(tr('No se pudo publicar', 'Could not publish'));
        resolve(null);
      });
    });
  };
  HF.publishMapDialog = function (opts) {
    opts = opts || {};
    if (!opts.code) return HF.toast(tr('No hay mapa que publicar', 'No map to publish'));
    const defName = opts.name || ('Mapa ' + (((HF.savedMaps && HF.savedMaps()) || []).length + 1));
    HF.modal(`<h3>🌐 ${tr('Publicar en la comunidad', 'Publish to the community')}</h3>
      <label>${tr('Nombre del mapa', 'Map name')}</label>
      <input id="pubName" maxlength="40" value="${esc(defName)}">
      <label>${tr('Autor', 'Author')}</label>
      <input id="pubAuthor" maxlength="24" value="${esc(HF.loadTribe().name || 'Anónimo')}"><br><br>
      <div class="row"><button id="pubNo">${tr('Cancelar', 'Cancel')}</button><button id="pubGo" class="pri grow">${tr('Publicar', 'Publish')}</button></div>`, m => {
      m.querySelector('#pubNo').onclick = HF.closeModal;
      m.querySelector('#pubGo').onclick = () => {
        const name = m.querySelector('#pubName').value.trim() || 'Mapa';
        const author = m.querySelector('#pubAuthor').value.trim() || tr('Anónimo', 'Anonymous');
        const btn = m.querySelector('#pubGo');
        btn.disabled = true;
        HF.publishMapCode({ name, author, code: opts.code, radius: opts.radius, factions: opts.factions }).then(info => {
          if (!info) { btn.disabled = false; return; }
          HF.closeModal();
          HF.toast(tr('¡Mapa publicado en la comunidad!', 'Map published to the community!'), 2600);
          if (opts.onDone) opts.onDone(info);
        });
      };
    });
  };
  // Compartir: fila de la comunidad → directo; mapa propio → publicar y compartir.
  HF.shareMapEntry = function (entry) {
    if (!entry) return;
    if (entry.id) return HF.mapShareModal(entry);
    if (entry.publishedId) return HF.mapShareModal({ id: entry.publishedId, name: entry.name });
    HF.modal(`<h3>🔗 ${tr('Compartir mapa', 'Share map')}</h3>
      <p class="dim small">${tr('El enlace comparte el mapa publicado en la comunidad. Este mapa aún no está publicado.', 'The link shares the map published to the community. This map is not published yet.')}</p>
      <div class="row"><button id="shNo">${tr('Cancelar', 'Cancel')}</button><button id="shGo" class="pri grow">🌐 ${tr('Publicar y compartir', 'Publish and share')}</button></div>
      <button id="shShort" style="width:100%;margin-top:8px">🔗 ${tr('Enlace corto de 5 letras (sin publicar)', 'Short 5-letter link (no publishing)')}</button>
      <p class="dim small" style="margin-top:4px">${tr('Un código corto guardado en la nube. Sirve para cualquier mapa editado, publicado o no.', 'A short code stored in the cloud. Works for any edited map, published or not.')}</p>`, m => {
      m.querySelector('#shNo').onclick = HF.closeModal;
      m.querySelector('#shGo').onclick = () => {
        HF.closeModal();
        HF.publishMapDialog({
          code: entry.code, name: entry.name, radius: entry.R, factions: entry.factions,
          onDone: info => HF.mapShareModal({ id: info.id, name: info.name || entry.name })
        });
      };
      m.querySelector('#shShort').onclick = () => { HF.closeModal(); HF.shareShortMapLink(entry); };
    });
  };

  // Enlace corto de un mapa del editor: crea (o recupera) el código en la nube
  // y muestra la URL lista para copiar. sql/short_links.sql.
  HF.shareShortMapLink = function (entry) {
    entry = entry || {};
    const code = entry.code || '';
    if (!/^v1:/i.test(code)) return HF.toast(tr('Este mapa no tiene código válido', 'This map has no valid code'));
    if (!HF.cloud || !HF.cloud.shortenMap) return HF.toast(tr('Enlaces cortos no disponibles', 'Short links unavailable'));

    HF.toast(tr('Creando enlace…', 'Creating link…'), 1200);
    HF.cloud.shortenMap(code, entry.name).then(r => {
      if (!r || !r.ok || !r.code) {
        return HF.toast((r && r.msg) || tr('No se pudo crear el enlace', 'Could not create the link'), 3600);
      }
      const url = HF.shareUrl('m', r.code);
      if (!url) {
        if (HF.askShareBase) HF.askShareBase(() => HF.shareShortMapLink(entry));
        return HF.toast(tr('Configura la dirección pública', 'Set the public address'));
      }
      HF.modal(`<h3>🔗 ${tr('Enlace corto del mapa', 'Short map link')}</h3>
        <div class="dim small">${esc(entry.name || tr('Mapa', 'Map'))} · ${tr('código', 'code')} <b>${esc(r.code)}</b></div>
        <textarea readonly id="slUrl" style="min-height:52px;margin-top:8px">${esc(url)}</textarea>
        <p class="dim small">${tr('Funciona sin publicar el mapa. El código se guarda en la nube y no expone tu cuenta.', 'Works without publishing. The code is stored in the cloud and does not expose your account.')}</p>
        <div class="row"><button id="slCp" class="pri grow">${tr('Copiar enlace', 'Copy link')}</button><button id="slX">${tr('Cerrar', 'Close')}</button></div>`, m => {
        m.querySelector('#slX').onclick = HF.closeModal;
        m.querySelector('#slCp').onclick = () => {
          const done = () => HF.toast(tr('Enlace copiado', 'Link copied'), 2400);
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(url).then(done).catch(() => { });
              return;
            }
          } catch (e) { }
          HF.toast(tr('Copia el enlace del cuadro', 'Copy the link from the box'), 2400);
        };
      });
    }).catch(() => HF.toast(tr('No se pudo crear el enlace', 'Could not create the link')));
  };

  // ---------------------------------------------------------------------------
  // Enlace compartido (#map=<id>) y ficha del mapa
  // ---------------------------------------------------------------------------
  HF.mapLanding = function (data) {
    data = data || {};
    const name = data.name || tr('Mapa compartido', 'Shared map');
    const factions = data.factions || HF.mapCodeFactions(data.code) || null;
    HF.modal(`<h3>🗺️ ${esc(name)}</h3>
      <div class="dim small">${data.author ? esc(data.author) + ' · ' : ''}R${data.R || '?'} · ${factions || '?'} ${tr('facciones', 'factions')}${data.votes ? ' · 👍 ' + data.votes : ''}</div>
      ${data.id ? `<div class="dim small" style="margin-top:4px">${tr('Publicado en la comunidad', 'Published to the community')}</div>` : ''}
      <br><div class="row"><button class="pri grow" id="mlGo">▶ ${tr('Jugar', 'Play')}</button><button id="mlSave">📥 ${tr('Guardar', 'Save')}</button><button id="mlClose">${tr('Cerrar', 'Close')}</button></div>`, m => {
      m.querySelector('#mlGo').onclick = () => {
        const r = HF.importMap(data.code || '');
        if (r.error) { HF.sfx('error'); return HF.toast(r.error); }
        HF.closeModal();
        HF.playMap(r.R, r.cells, r.seed, data.id ? { mapId: data.id, name } : { name });
      };
      m.querySelector('#mlSave').onclick = () => {
        const list = (HF.savedMaps && HF.savedMaps()) || [];
        if (list.some(x => x.code === data.code)) { HF.closeModal(); return HF.toast(tr('Ya está en tus mapas', 'Already in your maps')); }
        const meta = HF.mapCodeMeta(data.code) || {};
        list.push({
          name, code: data.code, R: data.R || meta.R || null, seed: meta.seed || 0,
          factions, updatedAt: Date.now(), publishedId: data.id || undefined
        });
        HF.store.set('maps', list);
        HF.closeModal();
        HF.toast(tr('Mapa guardado en tus mapas', 'Map saved to your maps'));
      };
      m.querySelector('#mlClose').onclick = HF.closeModal;
    });
  };
  // Tras abrir un enlace compartido se limpia el hash: recargar no debe volver
  // a abrir la ficha del mapa encima de la partida en curso.
  HF.clearShareHash = () => {
    try {
      if (!G.history || !G.history.replaceState) return;
      const loc = G.location || {};
      G.history.replaceState(null, '', (loc.pathname || '') + (loc.search || ''));
    } catch (e) { }
  };
  HF.openSharedMap = function (raw) {
    const val = String(raw || '').trim();
    if (!val) { HF.go('hub'); return; }
    if (/^v1:/.test(val)) {
      const r = HF.importMap(val);
      if (r.error) { HF.go('hub'); return HF.mapError(r.error); }
      HF.clearShareHash();
      HF.go('maps');
      return HF.mapLanding({ name: tr('Mapa compartido', 'Shared map'), code: val, R: r.R });
    }
    HF.go('maps', { tab: 'community' });
    if (!HF.cloud || !HF.cloud.getCommunityMap) { HF.toast(tr('Modo sin conexión', 'Offline mode')); return; }
    HF.toast(tr('Cargando mapa…', 'Loading map…'), 1200);
    HF.cloud.getCommunityMap(val).then(row => {
      if (!row) return HF.toast(tr('Mapa no encontrado', 'Map not found'));
      HF.clearShareHash();
      HF.mapLanding(communityEntry(row));
    }).catch(() => HF.toast(tr('No se pudo cargar el mapa', 'Could not load the map')));
  };

  // ---------------------------------------------------------------------------
  // Render de la lista (función pura para poder probarla sin DOM)
  // ---------------------------------------------------------------------------
  const metaLine = (m, full) => {
    const bits = [];
    if (m.R) bits.push('R' + m.R);
    const f = m.factions != null ? m.factions : (full ? HF.mapCodeFactions(m.code) : null);
    if (f) bits.push(f + ' ' + tr('facciones', 'factions'));
    const d = HF.mapDate(m.updatedAt);
    if (d) bits.push(d);
    return bits.join(' · ');
  };
  const actionRow = (m, acts) => `<div class="row" style="margin-top:8px">${acts.map(a =>
    `<button${a.pri ? ' class="pri grow"' : ''} data-act="${a.k}" data-key="${m.key}"${a.title ? ` title="${esc(a.title)}"` : ''}>${a.t}</button>`).join('')}</div>`;

  HF.mapsCardHTML = function (m, opts) {
    opts = opts || {};
    const selected = opts.sel === m.key;
    const community = opts.tab === 'community';
    const head = `<div class="row"><b class="grow">${esc(m.name)}</b>${
      community ? `<span class="dim small">👍 ${m.votes || 0}</span>` : (m.publishedId ? '<span class="chip">🌐</span>' : '')
    }</div>`;
    const sub = community
      ? `<div class="dim small">${esc(m.author)} · ${metaLine(m, true)}</div>`
      : `<div class="dim small">${metaLine(m, selected)}</div>`;
    let acts = '';
    if (selected) {
      acts = community
        ? actionRow(m, [
          { k: 'play', t: '▶ ' + tr('Jugar', 'Play'), pri: true },
          { k: 'edit', t: '✎ ' + tr('Editar', 'Edit') },
          { k: 'share', t: '🔗 ' + tr('Compartir', 'Share') },
          { k: 'vote', t: '👍', title: tr('Votar', 'Vote') }
        ])
        : actionRow(m, [
          { k: 'play', t: '▶ ' + tr('Jugar', 'Play'), pri: true },
          { k: 'edit', t: '✎ ' + tr('Editar', 'Edit') },
          { k: 'share', t: '🔗 ' + tr('Compartir', 'Share') },
          { k: 'del', t: '🗑', title: tr('Eliminar', 'Delete') }
        ]);
    }
    return `<div class="card${selected ? ' sel' : ''}" data-pick="${m.key}">${head}${sub}${acts || `<div class="dim small" style="margin-top:4px">${tr('Toca para ver sus acciones', 'Tap to see actions')}</div>`}</div>`;
  };
  HF.mapsListHTML = function (items, opts) {
    opts = opts || {};
    if (!items || !items.length) {
      return opts.tab === 'community'
        ? `<div class="card" style="text-align:center"><b>${tr('Sin mapas de la comunidad', 'No community maps')}</b><div class="dim small">${opts.offline ? tr('Modo sin conexión.', 'Offline mode.') : tr('Todavía no hay mapas publicados.', 'No maps published yet.')}</div></div>`
        : `<div class="card" style="text-align:center"><b>${tr('Aún no tienes mapas', 'No maps yet')}</b><div class="dim small">${tr('Crea uno en el editor y guárdalo.', 'Create one in the editor and save it.')}</div><button class="pri" id="emptyNew" style="margin-top:8px">✚ ${tr('Abrir editor', 'Open editor')}</button></div>`;
    }
    return items.map(m => HF.mapsCardHTML(m, opts)).join('');
  };

  // ---------------------------------------------------------------------------
  // Pantalla
  // ---------------------------------------------------------------------------
  HF.screen('maps', (el, arg) => {
    let tab = arg && arg.tab === 'community' ? 'community' : 'mine';
    let sel = null;
    let community = [];
    let loading = false, offline = false, loaded = false;

    const listNow = () => (tab === 'mine' ? HF.myMaps() : community);
    const findEntry = key => listNow().find(m => m.key === key) || null;

    const act = (kind, key) => {
      const m = findEntry(key);
      if (!m) return;
      if (kind === 'play') {
        const r = HF.importMap(m.code || '');
        if (r.error) { HF.sfx('error'); return HF.toast(r.error); }
        HF.playMap(r.R, r.cells, r.seed, m.id ? { mapId: m.id, name: m.name } : { name: m.name });
      } else if (kind === 'edit') {
        HF.go('editor', { code: m.code, name: m.name, from: 'maps' });
      } else if (kind === 'share') {
        HF.shareMapEntry(m);
      } else if (kind === 'vote') {
        if (!HF.cloud) return HF.toast(tr('Modo sin conexión', 'Offline mode'));
        HF.cloud.upvoteMap(m.id).then(r => {
          if (r && r.ok) { m.votes = (+m.votes || 0) + 1; HF.toast(tr('Voto registrado', 'Vote recorded')); draw(); }
          else HF.toast((r && r.msg) || tr('Modo sin conexión', 'Offline mode'));
        }).catch(() => { });
      } else if (kind === 'del') {
        if (!G.confirm || !G.confirm(tr('¿Eliminar este mapa?', 'Delete this map?'))) return;
        const ms = (HF.savedMaps && HF.savedMaps()) || [];
        ms.splice(m.index, 1);
        HF.store.set('maps', ms);
        sel = null;
        draw();
      }
    };

    const loadCommunity = () => {
      if (loaded || loading) return;
      loading = true;
      draw();
      const done = () => { loading = false; loaded = true; draw(); };
      if (!HF.cloud || !HF.cloud.getCommunityMaps) { offline = true; return done(); }
      HF.cloud.getCommunityMaps().then(rows => {
        community = (rows || []).map(communityEntry);
        offline = !!(HF.cloud.lastOffline && HF.cloud.lastOffline());
        done();
      }).catch(() => { offline = true; done(); });
    };

    const draw = () => {
      const items = listNow();
      const tabHint = tab === 'mine'
        ? tr('Toca un mapa para jugar, editar o compartir.', 'Tap a map to play, edit or share.')
        : tr('Mapas publicados por la comunidad · toca uno para jugar, editar o compartir.', 'Maps published by the community · tap one to play, edit or share.');
      el.innerHTML = `<div class="screen">
        ${HF.header('🗺️ ' + tr('Mapas', 'Maps'))}
        <div class="seg" id="mapTabs">
          <button data-tab="mine" class="${tab === 'mine' ? 'sel' : ''}">${tr('Mis mapas', 'My maps')} · ${HF.myMaps().length}</button>
          <button data-tab="community" class="${tab === 'community' ? 'sel' : ''}">${tr('Comunidad', 'Community')}${community.length ? ' · ' + community.length : ''}</button>
        </div>
        <div class="scroll" id="mapList">
          ${loading ? `<div class="dim small" style="padding:8px 0">${tr('Cargando mapas de la comunidad…', 'Loading community maps…')}</div>` : ''}
          ${!loading ? `<div class="dim small" style="margin:2px 0 6px">${tabHint}</div>` : ''}
          ${!loading ? HF.mapsListHTML(items, { tab, sel, offline }) : ''}
          ${tab === 'community' && !loading && !offline ? `<button id="reloadMaps" style="width:100%;margin-top:6px">🔄 ${tr('Actualizar', 'Refresh')}</button>` : ''}
        </div>
        <div class="drawer" style="padding-bottom:calc(var(--sab) + 6px)">
          <button id="newMap" class="pri">✚ ${tr('Editor de mapas', 'Map editor')}</button>
          <button id="manualCode">⌨️ ${tr('Tengo un código', 'I have a code')}</button>
        </div>
      </div>`;
      HF.wireBack(el);
      const on = (id, fn) => { const b = el.querySelector('#' + id); if (b) b.onclick = fn; };
      el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => {
        const next = b.dataset.tab;
        if (next === tab) return;
        tab = next; sel = null; draw();
        if (tab === 'community') loadCommunity();
      });
      el.querySelectorAll('[data-pick]').forEach(node => node.onclick = ev => {
        if (ev && ev.target && ev.target.closest && ev.target.closest('[data-act]')) return;
        const key = node.dataset.pick;
        sel = sel === key ? null : key;
        draw();
      });
      el.querySelectorAll('[data-act]').forEach(b => b.onclick = ev => {
        if (ev && ev.stopPropagation) ev.stopPropagation();
        act(b.dataset.act, b.dataset.key);
      });
      on('newMap', () => HF.go('editor'));
      on('manualCode', () => HF.manualMapModal());
      on('reloadMaps', () => { loaded = false; loadCommunity(); });
      on('emptyNew', () => HF.go('editor'));
    };

    draw();
    if (tab === 'community') loadCommunity();
  });
})(window);
