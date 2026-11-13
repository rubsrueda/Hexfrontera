(function (G) {
  const HF = G.HF;
  const $ = s => document.querySelector(s);
  const app = () => $('#app');
  HF.$ = $;
  HF.esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  HF.toast = (msg, ms) => {
    const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(HF._tt); HF._tt = setTimeout(() => t.classList.add('hidden'), ms || 2200);
  };
  HF.modal = (html, bind) => {
    const m = $('#modal'); m.innerHTML = '<div>' + html + '</div>'; m.classList.remove('hidden');
    if (bind) bind(m.firstChild);
    return m;
  };
  HF.closeModal = () => { const m = $('#modal'); m.classList.add('hidden'); m.innerHTML = ''; };

  // Dirección pública para los enlaces de compartir. No confundir con "tener
  // internet": una copia abierta como archivo o dentro de la app no tiene una
  // dirección que otros puedan abrir. Se guarda en 'share_base'.
  HF.askShareBase = function (onSaved) {
    const cur = HF.shareBase();
    const loc = G.location || {};
    const here = (loc.protocol === 'http:' || loc.protocol === 'https:')
      ? String(loc.href || '').split('#')[0].split('?')[0] : '';
    HF.modal(`<h3>🔗 Dirección pública del juego</h3>
      <p class="dim small">Para que un enlace funcione en otro teléfono, debe apuntar a la página donde publicas el juego. Abrirlo desde un archivo <b>no</b> cambia por tener conexión: esa copia simplemente no tiene una dirección que otros puedan abrir.</p>
      <label>Dirección pública</label>
      <input id="sbUrl" placeholder="https://federati.org/" value="${HF.esc(cur || '')}">
      <div class="neg small" id="sbErr"></div>
      <p class="dim small">Los enlaces quedarán así: <code id="sbPreview">…</code></p>
      <div class="row">${here ? '<button id="sbHere">Usar esta página</button>' : ''}<button id="sbNo">Cancelar</button><button id="sbGo" class="pri grow">Guardar</button></div>`, m => {
      const inp = m.querySelector('#sbUrl'), err = m.querySelector('#sbErr'), prev = m.querySelector('#sbPreview');
      const preview = () => {
        const v = HF.normalizeShareBase(inp.value);
        prev.textContent = v ? v + '#map=…' : '…';
        err.textContent = !inp.value.trim() ? ''
          : !v ? 'Escribe una dirección http(s) completa.'
            : HF.isLocalAddress(v) ? 'Aviso: esta dirección solo se abrirá en tu red local.'
              : '';
      };
      if (inp) { inp.oninput = preview; preview(); inp.focus(); }
      m.querySelector('#sbNo').onclick = HF.closeModal;
      const hb = m.querySelector('#sbHere');
      if (hb) hb.onclick = () => { inp.value = here; preview(); };
      m.querySelector('#sbGo').onclick = () => {
        const v = HF.normalizeShareBase(inp.value);
        if (!v) { HF.sfx('error'); err.textContent = 'Escribe una dirección http(s) completa.'; return; }
        HF.setShareBase(v);
        HF.closeModal();
        HF.toast(HF.isLocalAddress(v) ? 'Dirección guardada (solo red local)' : 'Dirección pública guardada');
        if (onSaved) onSaved(v);
      };
    });
  };

  const screens = {};
  HF.screen = (name, fn) => { screens[name] = fn; };
  HF.go = (name, arg) => {
    HF.closeModal();
    HF.currentScreen = name;
    if (G.document && document.body && document.body.classList) document.body.classList.toggle('hub-bg', name === 'hub');
    if (HF.onLeave) { const leave = HF.onLeave; HF.onLeave = null; try { leave(); } catch (e) { console.error('onLeave', e); } }
    app().innerHTML = '';
    HF.sfx('click');
    try { screens[name](app(), arg); }
    catch (e) {
      console.error('Pantalla ' + name + ':', e);
      app().innerHTML = `<div class="screen"><h2>⚠️ Error al abrir ${HF.esc(name)}</h2><p class="dim small">${HF.esc(e && e.message || e)}</p>
        <button id="backHub" class="pri" style="width:100%">Volver al menú</button></div>`;
      const b = app().querySelector('#backHub'); if (b) b.onclick = () => HF.go('hub');
    }
    // Traducción síncrona de la pantalla recién pintada: no depende de que el
    // MutationObserver llegue antes del primer frame.
    try { if (HF.translateDom) HF.translateDom(app(), true); } catch (e) { }
  };
  const header = title => `<div class="bar"><button data-back>◀</button><div class="title grow">${title}</div></div>`;
  HF.header = header;
  const wireBack = (el, to) => { const b = el.querySelector('[data-back]'); if (b) b.onclick = () => HF.go(to || 'hub'); };
  HF.wireBack = wireBack;

  // ---------------------------------------------------------------------------
  // PRÓLOGO CINEMATOGRÁFICO (opening crawl estilo Star Wars)
  // ---------------------------------------------------------------------------
  HF.introCrawl = function (g) {
    if (typeof document === 'undefined' || !document.body) return;
    if (!HF.settings().showIntroCrawl) return;
    if (g && (g.isReplay || g.mode === 'replay' || g.online)) return;
    if (document.querySelector('.crawl-overlay')) return;
    const el = document.createElement('div');
    el.className = 'crawl-overlay';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', HF.t('CRAWL_TITLE'));
    el.innerHTML = `
      <div class="crawl-viewport">
        <div class="crawl-content">
          <h2>${HF.t('CRAWL_TITLE')}</h2>
          <p><b>${HF.t('CRAWL_SEC1_TITLE')}:</b> ${HF.t('CRAWL_SEC1_DESC')}</p>
          <p><b>${HF.t('CRAWL_SEC2_TITLE')}:</b> ${HF.t('CRAWL_SEC2_DESC')}</p>
          <p><b>${HF.t('CRAWL_SEC3_TITLE')}:</b> ${HF.t('CRAWL_SEC3_DESC')}</p>
          <p><b>${HF.t('CRAWL_SEC4_TITLE')}:</b> ${HF.t('CRAWL_SEC4_DESC')}</p>
          ${(HF.t('CRAWL_PROLOGUE') || '').split(/\n\s*\n/).map((p, k) => `<p>${k === 0 ? '<b>' + HF.esc(p) + '</b>' : HF.esc(p)}</p>`).join('')}
          <h2 class="crawl-cta">${HF.t('CRAWL_SEC5_CTA')}</h2>
        </div>
      </div>
      <div class="crawl-footer">
        <label><input type="checkbox" id="chkDontShow"> ${HF.t('CRAWL_DONT_SHOW')}</label>
        <button class="pri" id="btnSkipCrawl">${HF.t('CRAWL_SKIP')}</button>
      </div>`;
    document.body.appendChild(el);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    let done = false;
    const onKey = e => { if (e.key === 'Escape' || e.key === 'Esc') close(); };
    const close = () => {
      if (done) return; done = true;
      const chk = el.querySelector('#chkDontShow');
      if (chk && chk.checked) {
        const s = HF.settings();
        s.showIntroCrawl = false;
        HF.store.set('settings', s);
      }
      document.removeEventListener('keydown', onKey);
      el.style.transition = 'opacity .6s ease';
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
      setTimeout(() => {
        el.remove();
        document.body.style.overflow = prevOverflow;
        // Al quedar el tablero a la vista, la capital saluda a la primera unidad.
        if (HF.banter && HF.banter.kick) HF.banter.kick(g);
      }, 620);
    };
    el.querySelector('#btnSkipCrawl').onclick = close;
    // Tocar el texto también sale (el jugador tiene prisa).
    el.querySelector('.crawl-viewport').onclick = close;
    el.addEventListener('click', e => { if (e.target === el) close(); });
    const content = el.querySelector('.crawl-content');
    if (content) content.addEventListener('animationend', () => setTimeout(close, 2500));
    document.addEventListener('keydown', onKey);
    if (HF.sfx) HF.sfx('click');
  };

  // ---------- CÓDICE ----------
  const CODEX_TABS = ['CODEX_TAB_LAYERS', 'CODEX_TAB_COMBAT', 'CODEX_TAB_SUPPLY', 'CODEX_TAB_SETTLEMENTS', 'CODEX_TAB_CREDO'];
  const CODEX_PAGES = ['CODEX_LAYERS', 'CODEX_COMBAT', 'CODEX_SUPPLY', 'CODEX_SETTLEMENTS', 'CODEX_CREDO'];
  HF.codex = function (start) {
    let idx = Math.max(0, Math.min(CODEX_TABS.length - 1, start || 0));
    const render = () => {
      HF.modal(`<h3>${HF.t('CODEX_TITLE')}</h3><div class="dim small" style="margin:-4px 0 8px">${HF.t('CODEX_INTRO')}</div>
        <div class="codex-tabs">${CODEX_TABS.map((k, i) => `<button data-cx="${i}" class="${i === idx ? 'sel' : ''}">${HF.t(k)}</button>`).join('')}</div>
        <div class="codex-body">${HF.t(CODEX_PAGES[idx])}</div>
        <button id="cxClose" class="pri" style="width:100%;margin-top:8px">${HF.t('CLOSE')}</button>`, m => {
        m.querySelectorAll('[data-cx]').forEach(b => b.onclick = () => { idx = +b.dataset.cx; render(); });
        m.querySelector('#cxClose').onclick = HF.closeModal;
      });
    };
    render();
  };

  // ---------- HUB ----------
  HF.screen('hub', el => {
    const tribe = HF.loadTribe(), save = HF.store.get('savegame_active', null);
    const d = HF.dailyState(), doneToday = d.date === HF.dailyKey() && d.attempts > 0;
    // Copia de emergencia escrita por js/telemetry.js tras un fallo crítico.
    const crash = HF.crash ? HF.crash.read() : null;
    const recoverable = !!(crash && crash.state);
    const crashWhen = recoverable && crash.at ? new Date(crash.at).toLocaleString() : '';
    const crashBanner = recoverable ? `<div class="card" id="crashCard" style="width:100%;max-width:560px;margin:6px auto 0;border-color:var(--acc)">
        <div class="row"><b class="grow">🛟 Partida recuperable</b><span class="chip">T${crash.turn != null ? crash.turn : '?'}</span></div>
        <div class="dim small" style="margin-top:2px">El juego se cerró por un error${crashWhen ? ' · ' + HF.esc(crashWhen) : ''}. Se guardó una copia automática antes de caer.</div>
        <div class="row" style="margin-top:6px"><button id="crashGo" class="pri grow">Restaurar</button><button id="crashNo">Descartar</button></div>
      </div>` : '';
    // Los textos de Campaña/Nueva partida traen un emoji delante; con la imagen
    // de arte ya no hace falta, así que se quita el símbolo inicial.
    const plain = s => String(s).replace(/^[^\p{L}\p{N}]+/u, '');
    el.innerHTML = `<div class="screen hub">
      <div class="bar">
        <button id="daily" class="art-btn" title="Diario"><img src="art/boton-reto-diario.png" alt="Diario">${doneToday ? '' : '<b class="art-dot">!</b>'}</button>
        <div class="grow"></div>
        <button id="rep" class="art-btn" title="Ver repetición"><img src="art/boton-reproducir.png" alt="Repetición"></button>
        <button id="news" class="art-btn" title="${HF.lang() === 'en' ? 'News' : 'Noticias'}" aria-label="${HF.lang() === 'en' ? 'News' : 'Noticias'}"><img src="art/boton-noticias.png" alt="Noticias"></button>
      </div>
      <div id="cta" style="width:100%;max-width:560px;margin:6px auto 0"></div>
      ${crashBanner}
      <div class="hub-mid">
        <h1>${HF.t('HUB_TITLE')}</h1>
        <div class="dim" style="text-align:center">${HF.t('HUB_SUBTITLE')}</div>
        ${save ? `<button class="pri big" id="cont">${HF.t('BTN_CONTINUE')} <span class="dim">· T${save.turn} · ${HF.esc(save.mode)}</span></button>` : ''}
        <button class="big art-big" id="camp"><img src="art/boton-reclutar.png" alt=""><span>${plain(HF.t('BTN_CAMPAIGN'))} <span class="dim">★ ${HF.totalStars()}/90</span></span></button>
        <button class="big art-big" id="new"><img src="art/boton-construir.png" alt=""><span>${plain(HF.t('BTN_NEW_GAME'))}</span></button>
      </div>
      <div class="dock">
        <button id="tribe" title="${HF.esc(tribe.name)}" aria-label="${HF.esc(tribe.name)}"><span class="dock-crest" style="border-color:${tribe.color}">${HF.crestHTML(tribe.crest, 30)}</span><span class="dock-name">${HF.esc(tribe.name)}</span></button>
        <button id="editor"><img class="dock-art" src="art/boton-campana.png" alt="">${HF.t('DOCK_MAPS')}</button>
        <button id="stats"><img class="dock-art" src="art/boton-estadisticas.png" alt="">${HF.t('DOCK_STATS')}</button>
        <button id="set" data-nav="settings"><img class="dock-art" src="art/boton-historial.png" alt="">${HF.t('DOCK_SETTINGS')}</button>
        <button id="wiki"><img class="dock-art" src="art/boton-codice.png" alt="">${HF.t('DOCK_WIKI')}</button>
      </div>
      <button id="fbFab" class="fb-fab" title="${HF.esc(HF.t('FB_CTA'))}" aria-label="${HF.esc(HF.t('FB_CTA'))}">💬</button>
    </div>`;
    const on = (id, fn) => { const b = el.querySelector('#' + id); if (b) b.onclick = fn; };
    on('crashGo', () => {
      const r = HF.crash.restore();
      if (!r.ok) { HF.sfx('error'); HF.toast(r.msg); }
    });
    on('crashNo', () => { HF.crash.clear(); HF.sfx('click'); HF.go('hub'); });
    on('daily', () => HF.go('daily')); on('camp', () => HF.go('campaign')); on('new', () => HF.go('newgame'));
    on('tribe', () => HF.go('tribe')); on('editor', () => HF.go('maps')); on('stats', () => HF.go('stats'));
    // delegación: garantiza que Ajustes responda aunque otro handler reemplace el onclick
    el.addEventListener('click', e => {
      const b = e.target && e.target.closest ? e.target.closest('[data-nav]') : null;
      if (b && b.dataset.nav) { e.preventDefault(); HF.go(b.dataset.nav); }
    });
    on('wiki', () => HF.codex());
    on('fbFab', () => { if (HF.feedback) HF.feedback.open(); });
    on('rep', () => HF.replayCodePrompt());
    on('cont', () => { try { HF.startGame(HF.deserialize(save)); } catch (e) { console.error(e); HF.store.del('savegame_active'); HF.toast(HF.lang() === 'en' ? 'Corrupted save' : 'Guardado dañado'); HF.go('hub'); } });
    on('news', () => HF.modal(`<h3><img class="modal-ico" src="assets/ui/news.webp" alt="" draggable="false"> ${HF.lang() === 'en' ? 'News' : 'Noticias'}</h3><p class="dim">${HF.lang() === 'en' ? 'Version 1.0 · local offline mode.<br>Multiplayer and online games are coming in future versions.' : 'Versión 1.0 · modo local sin conexión.<br>Multijugador y partidas en línea llegarán en próximas versiones.'}</p>
      <div class="row"><button disabled>Discord</button><button disabled>Web</button><button disabled>${HF.lang() === 'en' ? 'Social' : 'Redes'}</button></div><br><button id="x" class="pri">${HF.lang() === 'en' ? 'Close (X)' : 'Cerrar (X)'}</button>`, m => m.querySelector('#x').onclick = HF.closeModal));
    // Banner de acción rápida: reto diario → mapa de la comunidad → partida rápida.
    const cta = el.querySelector('#cta');
    if (cta) {
      const paint = (kicker, title, sub, icon, go) => {
        kicker = HF.tx ? HF.tx(kicker) : kicker;
        title = HF.tx ? HF.tx(title) : title;
        sub = HF.tx ? HF.tx(sub) : sub;
        const start = HF.tx ? HF.tx('▶ Iniciar') : '▶ Iniciar';
        cta.innerHTML = `<div class="cta-banner"><div class="cta-ico">${icon}</div><div class="grow"><div class="cta-kicker">${kicker}</div><b class="cta-title">${HF.esc(title)}</b><div class="cta-sub">${HF.esc(sub)}</div></div><button class="pri cta-go">${start}</button></div>`;
        cta.querySelector('.cta-go').onclick = () => { HF.sfx('click'); go(); };
      };
      const biomes = Object.keys(HF.BIOMES);
      const quick = () => {
        const spec = {
          mode: 'skirmish', seed: Math.floor(Math.random() * 1e9), size: 'small', n: 2,
          biome: biomes[Math.floor(Math.random() * biomes.length)],
          fog: 'FULL', difficulty: 'normal', goal: { type: 'conquer' }
        };
        HF.startGame(HF.makeGame(spec, HF.loadTribe()));
      };
      const daily = HF.dailySpec();
      if (!doneToday) {
        const factionWord = HF.tx ? HF.tx('facciones · niebla completa') : 'facciones · niebla completa';
        paint('RETO DIARIO', HF.dailyName ? HF.dailyName() : 'Reto diario',
          `${HF.BIOMES[daily.biome].name} · ${daily.n} ${factionWord}`, '📜',
          () => HF.startGame(HF.makeGame(daily, HF.loadTribe())));
      } else {
        paint('PARTIDA RÁPIDA', 'Un mapa en un toque', 'Mapa pequeño · 2 facciones', '⚡', quick);
        if (HF.cloud && HF.cloud.getCommunityMaps) {
          HF.cloud.getCommunityMaps().then(maps => {
            if (!maps || !maps.length || !cta.isConnected) return;
            const m = maps[Math.floor(Math.random() * Math.min(5, maps.length))];
            const factionWord = HF.tx ? HF.tx('facciones') : 'facciones';
            paint('MAPA DE LA COMUNIDAD', m.name || 'Mapa de la comunidad',
              `${m.author || 'Anónimo'} · R${m.radius || 7} · ${m.factions_count || 2} ${factionWord}`, '🌍', () => {
                const r = HF.importMap(m.code || '');
                if (r.error) { HF.sfx('error'); return HF.toast(r.error); }
                HF.playMap(r.R, r.cells, r.seed, { mapId: m.id, name: m.name });
              });
          }).catch(() => { });
        }
      }
    }
  });

  // ---------- TRIBU ----------
  HF.screen('tribe', el => {
    const t = HF.loadTribe();
    let tribeChanged = false;
    // Guarda siempre el mismo perfil (con fecha de cambio) y lo replica en la
    // nube con antirrebote: la tribu no puede "regenerarse" al volver a entrar.
    const persist = () => {
      const saved = HF.saveTribe(t);
      if (saved) Object.assign(t, saved);
      tribeChanged = true;
      if (HF.cloud && HF.cloud.saveProfileSoon) HF.cloud.saveProfileSoon();
    };
    const draw = () => {
      el.innerHTML = `<div class="screen">${header('Tribu')}
      <div class="scroll">
        <div class="card"><label>Nombre</label>
        <div class="row" style="gap:6px;flex-wrap:nowrap"><input type="text" id="nm" maxlength="20" value="${HF.esc(t.name)}" style="flex:1;min-width:0"><button id="rn" title="Nombre aleatorio" aria-label="Nombre aleatorio" style="min-width:44px">🎲</button></div>
        <label>Color</label><div class="row">${HF.COLORS.map(c => `<button class="sw ${c === t.color ? 'sel' : ''}" data-c="${c}" style="background:${c}"></button>`).join('')}</div>
        <label>Blasón</label>
        <div class="row" style="gap:12px;margin:2px 0 8px">
          <span class="crest-preview" style="border-color:${t.color}">${HF.crestHTML(t.crest, 58)}</span>
          <div class="grow"><b>${HF.crestName(t.crest)}</b><div class="dim small">Así se verá en tu Tribu</div></div>
        </div>
        <div class="crest-grid">${HF.CRESTS.map(c => `<button class="crest-pick ${c === t.crest ? 'sel' : ''}" data-r="${c}" title="${HF.crestName(c)}" aria-label="${HF.crestName(c)}" aria-pressed="${c === t.crest}">${HF.crestHTML(c, 60)}</button>`).join('')}</div></div>
        ${HF.PILLARS.map(p => {
          const path = t[p.key + '_path'];
          return `<div class="card"><div class="row"><b>${p.icon} ${p.name}</b><span class="dim grow">${p.q}</span><button data-p="${p.key}">Editar</button></div>
          ${path.map(id => {
            const d = HF.DOCT[id], inf = HF.doctrineInfo(p.name, d);
            const badge = inf.status === 'on' ? '✔ En juego' : inf.status === 'route' ? 'Ruta' : 'Catálogo';
            return `<div class="small">• <b>${d.id}</b> ${HF.esc(d.name)} <span class="${inf.status === 'on' ? 'pos' : 'dim'}">${badge}${inf.text ? ' — ' + HF.esc(inf.text) : ''}</span></div>`;
          }).join('')}</div>`;
        }).join('')}
      </div></div>`;
      wireBack(el);
      el.querySelector('#nm').oninput = e => { const v = e.target.value.trim(); if (v) { t.name = v.slice(0, 20); persist(); } };
      const dice = el.querySelector('#rn');
      if (dice) dice.onclick = () => { if (HF.genTribeName) { t.name = HF.genTribeName(); persist(); draw(); } };
      el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { t.color = b.dataset.c; persist(); draw(); });
      el.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { t.crest = b.dataset.r; persist(); draw(); });
      el.querySelectorAll('[data-p]').forEach(b => b.onclick = () => wizard(HF.PILLARS.find(p => p.key === b.dataset.p)));
    };
    const wizard = p => {
      const path = [];
      let showAll = false;
      const step = () => {
        const all = path.length ? HF.children(path[path.length - 1]) : HF.roots(p.root);
        const playable = all.filter(d => showAll || HF.doctrineInfo(p.name, d).status !== 'catalog');
        const fallback = !showAll && !playable.length && all.length > 0;
        const opts = showAll || fallback ? all : playable;
        const legend = fallback
          ? 'Esta rama solo tiene nodos de catálogo: se muestran para poder completar el nivel.'
          : showAll
            ? '✔ En juego = efecto de motor activo · Ruta = nodo intermedio · Catálogo = doctrina diseñada sin gancho aún.'
            : '✔ En juego = efecto de motor activo · Ruta = nodo intermedio hacia una doctrina en juego.';
        HF.modal(`<h3>${p.icon} ${p.name} — nivel ${path.length + 1}/3</h3>
          <div class="dim small" style="margin:-4px 0 8px">${legend}</div>
          <div class="row" style="margin:0 0 6px"><span class="dim small grow">${showAll ? 'Catálogo completo' : fallback ? 'Rama sin hijas con efecto' : 'Solo doctrinas jugables'}</span><button id="all">${showAll ? '◀ Solo jugables' : 'Ver catálogo'}</button></div>
          <div class="crumbs">${path.map(id => `<span class="chip">${id} ${HF.esc(HF.DOCT[id].name)}</span>`).join('')}</div>
          ${opts.length ? opts.map(d => {
            const inf = HF.doctrineInfo(p.name, d);
            const badge = inf.status === 'on' ? '<span class="pos">✔ En juego</span>' : inf.status === 'route' ? '<span class="dim">Ruta</span>' : '<span class="dim">Catálogo</span>';
            return `<button class="node" data-id="${d.id}" style="margin:5px 0"><b>[${d.id}] ${HF.esc(d.name)}</b><div class="t">${badge}${inf.text ? ' — ' + HF.esc(inf.text) : ''}</div></button>`;
          }).join('') : '<div class="dim small">No hay más doctrinas en esta rama.</div>'}
          <div class="row"><button id="bk">${path.length ? '◀ Atrás' : 'Cancelar'}</button></div>`, m => {
          m.querySelectorAll('[data-id]').forEach(b => b.onclick = () => {
            HF.sfx('click'); path.push(b.dataset.id);
            if (path.length === 3) { t[p.key + '_path'] = path.slice(); persist(); HF.closeModal(); draw(); HF.toast('Doctrina guardada'); } else step();
          });
          m.querySelector('#all').onclick = () => { showAll = !showAll; step(); };
          m.querySelector('#bk').onclick = () => { if (path.length) { path.pop(); step(); } else HF.closeModal(); };
        });
      };
      step();
    };
    // TRIBE_MODIFIED: se dispara al salir de la pantalla, no en cada tecla.
    // Solo si el jugador vuelve al Hub; si entra directo a jugar, se omite.
    HF.onLeave = () => {
      if (!tribeChanged) return;
      tribeChanged = false;
      if (HF.EventFeedbackModal) {
        HF.EventFeedbackModal.checkAndRender('TRIBE_MODIFIED', {
          delay: 500,
          guard: () => HF.currentScreen === 'hub'
        });
      }
    };
    draw();
  });

  // ---------- MAPAS POR CÓDIGO ----------
  // Acepta un código (v1:…), un enlace con #map=… o un id de la comunidad.
  // Devuelve una promesa {ok, msg}; el modal muestra el error sin cerrarse.
  function useMapCode(code, action, row) {
    const r = HF.importMap(code || '');
    if (r.error) return { ok: false, msg: r.error };
    const meta = row ? { mapId: row.id, name: row.name } : null;
    if (action === 'edit') {
      // El editor reimporta el código y su botón «volver» regresa a Mapas.
      HF.closeModal();
      HF.go('editor', { code: code, name: row ? (row.name || '') : '', from: 'maps' });
      return { ok: true };
    }
    HF.closeModal();
    HF.playMap(r.R, r.cells, r.seed, meta || undefined);
    return { ok: true };
  }
  HF.manualMapUse = (value, action) => {
    let ref = null;
    if (HF.parseMapRef) ref = HF.parseMapRef(value);
    else {
      const raw = String(value || '').trim();
      ref = raw ? { kind: 'code', code: raw } : null;
    }
    if (!ref) return Promise.resolve({ ok: false, msg: 'Pega un código o un enlace de mapa' });
    if (ref.kind === 'invalid') return Promise.resolve({ ok: false, msg: 'Código o enlace no válido' });
    if (ref.kind === 'shortReplay') return Promise.resolve({ ok: false, msg: 'Es un enlace corto de repetición: ábrelo con 🎬 Ver repetición' });
    if (ref.kind === 'replay') return Promise.resolve({ ok: false, msg: 'Es un enlace de repetición: ábrelo con 🎬 Ver repetición' });
    if (ref.kind === 'short') {
      if (!HF.cloud || !HF.cloud.resolveShortMap) return Promise.resolve({ ok: false, msg: 'Enlaces cortos no disponibles' });
      return HF.cloud.resolveShortMap(ref.code).then(r => {
        if (!r || !r.ok || !r.code) return { ok: false, msg: (r && r.msg) || 'Enlace corto no encontrado' };
        return useMapCode(r.code, action, null);
      }).catch(() => ({ ok: false, msg: 'No se pudo abrir el enlace corto' }));
    }
    if (ref.kind === 'seed') {
      if (action === 'edit') return Promise.resolve({ ok: false, msg: 'Un enlace de semilla no se puede editar' });
      const spec = HF.links && HF.links.decode ? HF.links.decode(ref.token) : null;
      if (!spec) return Promise.resolve({ ok: false, msg: 'Enlace de mapa no válido' });
      if (!HF.startGame || !HF.makeGame) return Promise.resolve({ ok: false, msg: 'Inicio de partida no disponible' });
      HF.closeModal();
      HF.startGame(HF.makeGame(Object.assign({ mode: 'skirmish', goal: { type: 'conquer' } }, spec), HF.loadTribe()));
      return Promise.resolve({ ok: true });
    }
    if (ref.kind === 'code') return Promise.resolve(useMapCode(ref.code, action, null));
    // Enlace o id de la comunidad: se resuelve contra la nube.
    if (!HF.cloud || !HF.cloud.getCommunityMap) return Promise.resolve({ ok: false, msg: 'Modo sin conexión' });
    return HF.cloud.getCommunityMap(ref.id).then(row => {
      if (!row) return { ok: false, msg: 'Mapa no encontrado en la comunidad' };
      return useMapCode(row.code || '', action, row);
    }).catch(() => ({ ok: false, msg: 'No se pudo cargar el mapa' }));
  };
  HF.manualMapModal = () => HF.modal(`<h3>🗺️ Mapa por código</h3><div class="dim small">Pega un código (<code>v1:…</code>) o el enlace de un mapa, incluido el enlace corto (<code>?m=…</code>); puedes jugarlo o abrirlo en el editor.</div>
    <textarea id="manualMap" style="min-height:100px" placeholder="v1:7:123:…, https://…#map=12 o https://…?m=X9K2A"></textarea>
    <div id="mmErr" class="neg small"></div><br>
    <div class="row"><button id="mmNo">Cancelar</button><button id="mmEdit">✎ Editar</button><button id="mmGo" class="pri grow">▶ Jugar</button></div>`, m => {
    const run = action => {
      const box = m.querySelector('#manualMap');
      const err = m.querySelector('#mmErr');
      if (!box) return;
      if (err) err.textContent = '';
      Promise.resolve(HF.manualMapUse(box.value, action)).then(r => {
        if (r && r.ok) return;
        HF.sfx('error');
        if (err) err.textContent = (r && r.msg) || 'No se pudo abrir el mapa';
        if (box.focus) box.focus();
      }).catch(() => {
        HF.sfx('error');
        if (err) err.textContent = 'No se pudo abrir el mapa';
      });
    };
    m.querySelector('#mmNo').onclick = HF.closeModal;
    m.querySelector('#mmEdit').onclick = () => run('edit');
    m.querySelector('#mmGo').onclick = () => run('play');
  });

  // Compatibilidad: la comunidad vive ahora en su propia pantalla (js/maps.js),
  // con listado, acciones por mapa y enlaces para compartir.
  HF.communityMapsModal = function () { HF.go('maps', { tab: 'community' }); };

  // ---------- RANKINGS Y REPETICIONES DEL TOP ----------
  // Descarga la repetición solo al pulsar ▶ (la lista no arrastra los códigos).
  HF.playCloudReplay = async function (mapKey, playerId) {
    if (!HF.cloud) return HF.toast('Modo sin conexión');
    HF.toast('Cargando repetición…', 1000);
    try {
      const code = await HF.cloud.getMapReplay(mapKey, playerId);
      if (!code) {
        if (HF.cloud.replayMissing && HF.cloud.replayMissing()) return HF.toast('Repeticiones no configuradas: ejecuta el SQL de replay_code');
        return HF.toast('Este jugador no compartió su repetición');
      }
      await HF.playReplayFromCode(code);
    } catch (e) { HF.toast('No se pudo cargar la repetición'); }
  };

  const lbTable = (rows, myId, showMap) => `<table style="width:100%;font-size:12px">
    <tr><th>#</th><th>Jugador</th><th>T</th><th>Puntos</th><th></th></tr>
    ${rows.map((r, i) => {
      const me = r.player_id === myId;
      return `<tr style="${me ? 'color:var(--acc);font-weight:bold' : ''}">
        <td>${i + 1}</td>
        <td>${HF.crestHTML(r.crest, 22)} ${HF.esc(r.tribe_name || '—')}${showMap ? `<div class="dim" style="font-size:10px;font-weight:600">${HF.esc(HF.cloud.mapKeyLabel(r.map_key))}</div>` : ''}</td>
        <td>T${+r.turns || 0}</td>
        <td>${(+r.score || 0).toLocaleString()}</td>
        <td>${r.won ? `<button data-rep="${i}" title="Ver repetición" style="min-height:26px;padding:2px 7px;font-size:11px">▶</button>` : ''}</td>
      </tr>`;
    }).join('')}
  </table>`;

  // Reintenta la última marca guardada (fallo de red, registro tardío, etc.).
  HF.retryMapScore = function () {
    const stored = HF.store.get('last_score_payload', null);
    if (!stored) return Promise.resolve({ ok: false, msg: 'sin marca pendiente' });
    if (!HF.cloud || !HF.cloud.submitMapScore) return Promise.resolve({ ok: false, msg: 'ranking no disponible' });
    // Usar a identidade actual (o secreto cambia co dispositivo, non coa marca).
    const p = Object.assign({}, stored, { player_id: HF.cloud.playerId() });
    return HF.cloud.submitMapScore(p).then(r => {
      if (r && r.ok) {
        HF.store.del('last_score_payload');
        HF.store.del('last_score_error');
      } else {
        HF.store.set('last_score_error', {
          at: Date.now(), msg: (r && r.msg) || '', status: (r && r.status) || 0,
          offline: !!(r && r.offline), timeout: !!(r && r.timeout)
        });
      }
      return r;
    }).catch(e => {
      HF.store.set('last_score_error', {
        at: Date.now(), msg: (e && e.message) || 'error de red', status: 0, offline: true
      });
      return { ok: false, msg: (e && e.message) || 'error de red' };
    });
  };

  // Top mundial: mejor marca de cada jugador. Reutilízase no modal antigo e na
  // pantalla de Stats, que agora é a única entrada visible.
  HF.renderRanking = function (box, meBox, opts) {
    opts = opts || {};
    if (!box) return;
    const gone = () => opts.isConnected && !opts.isConnected();
    const noMarkMessage = () => {
      const games = (HF.getStats && HF.getStats().games) || 0;
      const err = HF.store && HF.store.get ? HF.store.get('last_score_error', null) : null;
      if (games > 0 && err && err.at && (Date.now() - err.at) < 86400000) {
        if (err.status === 401 || err.status === 403) return 'El servidor rechazó tu marca por permisos (HTTP ' + err.status + ').';
        if (err.offline || err.timeout) return 'No se pudo contactar con el servidor de ranking. Si la conexión funciona, puede ser un bloqueo del navegador o de la URL del servidor.';
        if (err.status) return 'El servidor rechazó tu marca (HTTP ' + err.status + ')' + (err.msg ? ': ' + HF.esc(err.msg) : '.');
        if (err.msg) return 'Tu última marca no se pudo enviar: ' + HF.esc(err.msg) + '.';
        return 'Tu marca no aparece en el ranking. No se pudo completar el envío.';
      }
      return games > 0
        ? 'Tu marca no aparece en el ranking. Puede que el envío no se haya completado.'
        : 'Todavía no has registrado ninguna marca. Juega una partida para entrar en el ranking.';
    };
    if (!HF.cloud || !HF.cloud.getGlobalTop || !HF.cloud.online) {
      box.innerHTML = 'Modo sin conexión · no se puede consultar el ranking.';
      if (meBox) meBox.innerHTML = 'Sin conexión · no se pudo cargar tu posición.';
      return;
    }
    box.innerHTML = 'Consultando clasificación…';
    const myId = HF.cloud.playerId();
    // Tabla top + posición real del jugador (aínda que quede fóra do Top 100).
    const topP = HF.cloud.getGlobalTop(opts.limit || 100);
    const standingP = HF.cloud.getPlayerStanding
      ? Promise.resolve().then(() => HF.cloud.getPlayerStanding(myId)).catch(() => null)
      : Promise.resolve(null);
    Promise.all([topP, standingP]).then(([rows, st]) => {
      if (gone()) return;
      if (!rows || !rows.length) {
        box.innerHTML = 'Aún no hay marcas registradas.';
      } else {
        const top = rows.slice(0, opts.top || 10);
        box.innerHTML = lbTable(top, myId, true);
        box.querySelectorAll('[data-rep]').forEach(b => b.onclick = () => {
          const r = top[+b.dataset.rep];
          if (r) HF.playCloudReplay(r.map_key, r.player_id);
        });
      }
      if (!meBox) return;
      if (st && st.ok) {
        const best = st.best ? (+st.best.score || 0) : 0;
        const maps = +st.maps || 0;
        if (st.rank) {
          meBox.innerHTML = `Puesto <b style="color:var(--acc)">#${st.rank}</b> de ${st.total} jugadores · Mejor marca: <b>${best.toLocaleString()}</b> pts · ${maps} mapa(s)`;
        } else if (st.best) {
          meBox.innerHTML = `Mejor marca: <b style="color:var(--acc)">${best.toLocaleString()}</b> pts${st.capped ? ' · fuera del Top ' + st.total : ' · aún sin posición'}`;
        } else {
          meBox.innerHTML = noMarkMessage();
        }
      } else if (st && st.offline) {
        meBox.innerHTML = 'Sin conexión · no se pudo cargar tu posición.';
      } else if (rows && rows.length) {
        // Compatibilidade se o servidor non expón getPlayerStanding.
        const idx = rows.findIndex(r => r.player_id === myId);
        const myName = HF.esc(HF.loadTribe().name);
        meBox.innerHTML = idx >= 0
          ? `Puesto <b style="color:var(--acc)">#${idx + 1}</b> de ${rows.length} jugadores · <b>${myName}</b>`
          : noMarkMessage();
      }
    }).catch(() => {
      if (gone()) return;
      box.innerHTML = 'Sin conexión para cargar el ranking.';
      if (meBox) meBox.innerHTML = 'Sin conexión · no se pudo cargar tu posición.';
    });
  };

  // Modal antigo (compatibilidade). A entrada principal é Stats.
  HF.rankingModal = function () {
    HF.modal(`<h3>🌍 ${HF.t('RANKING')}</h3>
      <div id="rkBody" class="dim small">Consultando clasificación…</div>
      <div class="card" style="margin:10px 0 0">
        <div class="row"><b class="grow">🏅 Tu posición</b></div>
        <div id="rkMe" class="small" style="margin-top:3px">Consultando…</div>
        <button id="rkHistory" class="big art-big" style="width:100%;margin-top:8px">
          <img src="art/boton-mapa.png" alt="">
          <span>${HF.t('MATCH_HISTORY')}</span>
        </button>
      </div>
      <br><button id="rkClose" class="pri" style="width:100%">${HF.t('CLOSE')}</button>`, m => {
      const meBox = m.querySelector('#rkMe');
      m.querySelector('#rkClose').onclick = HF.closeModal;
      const hist = m.querySelector('#rkHistory');
      if (hist) hist.onclick = () => {
        HF.closeModal();
        if (HF.replays && HF.replays.openHistory) HF.replays.openHistory();
      };
      HF.renderRanking(m.querySelector('#rkBody'), meBox, { isConnected: () => m.isConnected });
    });
  };

  // Top de un mapa concreto (desde el historial o el final de partida).
  HF.mapRankingModal = function (mapKey, back) {
    const label = HF.cloud && HF.cloud.mapKeyLabel ? HF.cloud.mapKeyLabel(mapKey) : (mapKey || 'Mapa');
    HF.modal(`<h3>🏆 ${HF.esc(label)}</h3><div id="mrkBody" class="dim small">Consultando clasificación…</div><div id="mrkMe" class="small" style="margin-top:8px"></div><br><button id="mrkClose" class="pri" style="width:100%">Cerrar</button>`, m => {
      m.querySelector('#mrkClose').onclick = () => { HF.closeModal(); if (typeof back === 'function') back(); };
      const box = m.querySelector('#mrkBody');
      if (!HF.cloud || !HF.cloud.getMapLeaderboard || !HF.cloud.online) {
        box.innerHTML = 'Modo sin conexión · no se puede consultar el ranking.';
        return;
      }
      HF.cloud.getMapLeaderboard(mapKey).then(rows => {
        if (!m.isConnected) return;
        if (!rows || !rows.length) { box.innerHTML = 'Sin marcas en este mapa todavía.'; return; }
        const myId = HF.cloud.playerId();
        box.innerHTML = lbTable(rows, myId, false);
        box.querySelectorAll('[data-rep]').forEach(b => b.onclick = () => {
          const r = rows[+b.dataset.rep];
          if (r) HF.playCloudReplay(mapKey, r.player_id);
        });
        HF.cloud.getMapRank(mapKey, myId).then(rank => {
          const meBox = m.querySelector('#mrkMe');
          if (meBox) meBox.innerHTML = rank
            ? `Tu posición: <b style="color:var(--acc)">#${rank}</b>`
            : 'Todavía no tienes marca en este mapa.';
        }).catch(() => { });
      }).catch(() => { if (m.isConnected) box.innerHTML = 'Sin conexión para cargar el ranking.'; });
    });
  };

  // ---------- NUEVA PARTIDA ----------
  HF.screen('newgame', el => {
    const o = Object.assign({ size: 'medium', biome: 'plains', n: 2, fog: 'FULL', difficulty: 'normal' }, HF.store.get('newgame_opts', {}));
    const seg = (key, items) => `<div class="seg">${items.map(([v, n]) => `<button data-k="${key}" data-v="${v}" class="${String(o[key]) === String(v) ? 'sel' : ''}">${n}</button>`).join('')}</div>`;
    const draw = () => {
      const sz = HF.SIZES[o.size];
      o.n = Math.max(sz.minF, Math.min(sz.maxF, o.n));
      el.innerHTML = `<div class="screen">${header('Nueva partida')}<div class="scroll">
        <label>Tamaño</label>${seg('size', Object.entries(HF.SIZES).map(([k, v]) => [k, v.name]))}
        <label>Bioma</label>${seg('biome', Object.entries(HF.BIOMES).map(([k, v]) => [k, v.name]))}
        <label>Facciones (tú + IA; en línea, jugadores)</label>${seg('n', Array.from({ length: sz.maxF - sz.minF + 1 }, (_, i) => [sz.minF + i, sz.minF + i]))}
        <label>Niebla de guerra</label>${seg('fog', [['FULL', 'Completa'], ['EXPLORED', 'Explorada'], ['NONE', 'Sin niebla']])}
        <label>Dificultad IA</label>${seg('difficulty', [['easy', 'Fácil'], ['normal', 'Normal'], ['hard', 'Difícil']])}
        <label>Semilla (vacío = aleatoria)</label><input type="text" id="seed" value="${HF.esc(o.seed || '')}">
        <div class="dim small" style="margin-top:6px">Los barcos se reclutan en agua junto a un campamento o edificio superior.</div>
        <div class="card" style="margin-top:8px"><b>🌐 Partida en línea</b>
          <div class="dim small">Crea una sala con esta configuración: ${HF.SIZES[o.size].name} · ${HF.BIOMES[o.biome].name} · niebla ${({ FULL: 'completa', EXPLORED: 'explorada', NONE: 'sin niebla' })[o.fog]}, hasta ${o.n} jugadores.</div>
          <button class="pri" id="onlineHost" style="width:100%;margin-top:6px">🌐 Crear sala en línea</button>
          <button id="onlineJoin" style="width:100%;margin-top:6px">Unirse a una sala</button>
        </div>
        <br><button class="pri big" id="go" style="width:100%">Empezar</button>
        <br><br><button id="mine" style="width:100%">📂 Jugar un mapa guardado</button>
        <br><br><button id="code" style="width:100%">🌍 Mapas de la Comunidad</button>
      </div></div>`;
      wireBack(el);
      el.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { const k = b.dataset.k; o[k] = (k === 'n') ? +b.dataset.v : b.dataset.v; o.seed = el.querySelector('#seed').value; draw(); });
      el.querySelector('#go').onclick = () => {
        const sv = el.querySelector('#seed').value.trim(); o.seed = sv;
        HF.store.set('newgame_opts', o);
        const seed = sv ? (/^\d+$/.test(sv) ? parseInt(sv, 10) >>> 0 : [...sv].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)) : Math.floor(Math.random() * 1e9);
        HF.startGame(HF.makeGame({ mode: 'skirmish', seed, size: o.size, n: o.n, biome: o.biome, fog: o.fog, difficulty: o.difficulty, goal: { type: 'conquer' } }, HF.loadTribe()));
      };
      el.querySelector('#mine').onclick = () => HF.go('maps', { tab: 'mine' });
      el.querySelector('#code').onclick = () => HF.go('maps', { tab: 'community' });
      // Multijugador: la sala se crea con la configuración elegida arriba.
      const seedNow = () => {
        const sv = el.querySelector('#seed').value.trim(); o.seed = sv;
        return sv ? (/^\d+$/.test(sv) ? parseInt(sv, 10) >>> 0 : [...sv].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)) : Math.floor(Math.random() * 1e9);
      };
      el.querySelector('#onlineHost').onclick = async () => {
        const seed = seedNow();
        HF.store.set('newgame_opts', o);
        if (!HF.online) { HF.sfx('error'); return HF.toast('Multijugador no disponible'); }
        const btn = el.querySelector('#onlineHost');
        btn.disabled = true; btn.textContent = 'Creando sala…';
        try {
          const r = await HF.online.create({
            max: o.n,
            setup: { mode: 'skirmish', seed, size: o.size, n: o.n, biome: o.biome, fog: o.fog, difficulty: o.difficulty, goal: { type: 'conquer' } }
          });
          if (!r.ok) { btn.disabled = false; btn.textContent = '🌐 Crear sala en línea'; HF.sfx('error'); return HF.toast(r.msg); }
          HF.sfx('good');
          HF.go('online');
        } catch (e) {
          console.error('[online] crear sala', e);
          btn.disabled = false; btn.textContent = '🌐 Crear sala en línea';
          HF.toast(e.message || 'Error al crear la sala');
        }
      };
      el.querySelector('#onlineJoin').onclick = () => HF.go('online');
    };
    draw();
  });

  // ---------- CAMPAÑA ----------
  HF.screen('campaign', el => {
    const total = HF.totalStars();
    el.innerHTML = `<div class="screen">${header('Campaña · ★ ' + total + '/90')}<div class="scroll">${HF.ACTS.map((name, a) => {
      const gate = HF.GATES[a];
      return `<h3>Acto ${name} ${total < gate ? '🔒 ' + gate + '★' : ''}</h3><div class="levels">${[0, 1, 2, 3, 4, 5].map(l => {
        const idx = a * 6 + l, st = HF.levelState(idx);
        return `<button class="lvl ${st.locked ? 'locked' : ''}" data-i="${idx}"><b>${l + 1}</b><span class="stars">${st.locked ? '🔒' : '★'.repeat(st.stars) + '☆'.repeat(3 - st.stars)}</span></button>`;
      }).join('')}</div>`;
    }).join('')}</div></div>`;
    wireBack(el);
    el.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
      const idx = +b.dataset.i, st = HF.levelState(idx), s = HF.campaign[idx];
      if (st.locked) { HF.sfx('error'); HF.vibrate(50); return HF.toast('🔒 ' + st.why); }
      HF.modal(`<h3>${s.meta.act + 1}-${s.meta.level + 1} · ${HF.esc(s.name)}</h3><p>${HF.esc(s.desc)}</p>
        <div class="small dim">★ Ganar · ★ En ≤ ${s.par} turnos · ★ ${HF.CHTXT[s.meta.challenge]}</div><br>
        <div class="row"><button id="no">Volver</button><button class="pri grow" id="ok">Jugar</button></div>`, m => {
        m.querySelector('#no').onclick = HF.closeModal;
        m.querySelector('#ok').onclick = () => HF.startGame(HF.makeGame(s, HF.loadTribe()));
      });
    });
  });

  // ---------- DIARIO ----------
  HF.screen('daily', el => {
    const d = HF.dailyState(), k = HF.dailyKey(), spec = HF.dailySpec(), today = d.date === k;
    el.innerHTML = `<div class="screen">${header('Desafío diario')}<div class="scroll">
      <div class="card"><b>Reto ${k}</b><div class="dim small">${HF.BIOMES[spec.biome].name} · ${spec.n} facciones · Conquista total</div>
      <div class="dim small">Jugando en modo Desconexión</div>
      <p>Intentos hoy: ${today ? d.attempts : 0}<br>${today && d.best ? 'Resultado oficial: T' + d.best + ' ' + d.medal : 'Aún sin resultado oficial'}<br>🔥 Racha: ${d.streak}</p>
      <div class="dim small">El primer intento del día es el oficial; los siguientes son práctica.<br>Medallas: 🥇 ≤12 turnos · 🥈 ≤18 · 🥉 más.</div><br>
      <button class="pri big" id="go" style="width:100%">${today && d.attempts ? 'Jugar (práctica)' : 'Jugar'}</button></div>
      <div class="card"><b>🌍 Top 20 mundial del Diario</b><div class="dim small">Solo victorias del primer intento oficial de hoy. Los mapas se rankean en la Comunidad.</div><div id="dailyLB" class="dim small" style="margin-top:6px">${HF.cloud && HF.cloud.online ? 'Consultando ranking mundial…' : 'Modo sin conexión · historial local'}</div>
        <button id="dailyMaps" style="width:100%;margin-top:6px">🌍 Ver Top de Mapas de la Comunidad</button></div>
      <h3>Historial</h3>${d.history.length ? d.history.map(h => `<div class="small">${h.k} · T${h.turn} ${h.medal}</div>`).join('') : '<div class="dim small">Sin victorias aún</div>'}
    </div></div>`;
    wireBack(el);
    el.querySelector('#go').onclick = () => HF.startGame(HF.makeGame(spec, HF.loadTribe()));
    el.querySelector('#dailyMaps').onclick = () => HF.communityMapsModal();
    if (HF.cloud) HF.cloud.getDailyLeaderboard(k).then(rows => {
      const box = el.querySelector('#dailyLB');
      if (!box) return;
      if (!rows || !rows.length) {
        const off = !HF.cloud || (HF.cloud.lastOffline && HF.cloud.lastOffline());
        box.innerHTML = off
          ? '<div class="dim small">Modo sin conexión · historial local</div>'
          : '<div class="dim small">Aún no hay puntuaciones oficiales hoy. Juega el Desafío Diario para aparecer aquí.</div>';
        return;
      }
      box.innerHTML = `<table><tr><th>#</th><th>Blasón</th><th>Tribu</th><th>Turnos</th><th>Superávit</th></tr>${rows.map((r, i) => {
        const col = /^#[0-9a-f]{3,8}$/i.test(r.color_hex || '') ? r.color_hex : '#F4EFEA';
        return `<tr><td>${i + 1}</td><td>${HF.crestHTML(r.crest, 22)}</td><td style="color:${col}">${HF.esc(r.tribe_name || '—')}</td><td>${+r.turns || 0}</td><td>${+r.surplus || 0}</td></tr>`;
      }).join('')}</table>`;
    }).catch(() => { });
  });

  // ---------- STATS ----------
  HF.screen('stats', el => {
    const s = HF.getStats(), t = HF.loadTribe(), d = HF.dailyState();
    const medals = { gold: 0, silver: 0, bronze: 0 };
    for (const h of (d.history || [])) {
      if (h.medal === '🥇') medals.gold++;
      else if (h.medal === '🥈') medals.silver++;
      else if (h.medal === '🥉') medals.bronze++;
    }
    el.innerHTML = `<div class="screen">${header('Estadísticas')}<div class="scroll">
      <div class="card">
        <div class="row"><span class="passport-crest" style="border-color:${t.color}">${HF.crestHTML(t.crest, 54)}</span><div class="grow"><b>${HF.esc(t.name)}</b><div class="dim small">Pasaporte de Estratega</div></div><div class="stars">${HF.totalStars()}/90</div></div>
        <canvas class="donut" id="passport"></canvas>
        <div class="medallero">🥇 ${medals.gold} · 🥈 ${medals.silver} · 🥉 ${medals.bronze}</div>
      </div>
      <div class="card" id="statsRanking">
        <div class="row"><b class="grow">🌍 ${HF.t('RANKING')}</b></div>
        <div id="statsRankBody" class="dim small" style="margin-top:6px">Consultando clasificación…</div>
        <div class="row" style="margin-top:10px"><b class="grow">🏅 Tu posición</b></div>
        <div id="statsRankMe" class="small" style="margin-top:3px">Consultando…</div>
        <button id="statsRetry" class="pri" style="width:100%;margin-top:8px;display:none">Reintentar envío</button>
        <button id="statsHistory" class="big art-big" style="width:100%;margin-top:8px">
          <img src="art/boton-mapa.png" alt="">
          <span>${HF.t('MATCH_HISTORY')}</span>
        </button>
      </div>
      <div class="kpis">
        <div class="kpi"><span>🏆</span><b>${s.wins}</b><small>Victorias</small></div>
        <div class="kpi"><span>💀</span><b>${s.losses}</b><small>Derrotas</small></div>
        <div class="kpi"><span>🎲</span><b>${s.games}</b><small>Partidas</small></div>
        <div class="kpi"><span>🔥</span><b>${s.streak}</b><small>Racha actual</small><em>mejor ${s.bestStreak}</em></div>
        <div class="kpi"><span>⚡</span><b>${s.bestWinTurns ? 'T' + s.bestWinTurns : '—'}</b><small>Victoria rápida</small></div>
        <div class="kpi"><span>⏳</span><b>${s.turns}</b><small>Turnos jugados</small></div>
      </div>
      <div class="kpis">
        <div class="kpi"><span>⚔️</span><b>${s.kills}</b><small>Unidades eliminadas</small></div>
        <div class="kpi"><span>🚩</span><b>${s.captured}</b><small>Casillas conquistadas</small></div>
        <div class="kpi"><span>🏗️</span><b>${s.built}</b><small>Edificios construidos</small></div>
      </div>
      <h3>Recientes</h3>${(s.recent || []).map(r => `<div class="small">${r.won ? '🏆' : '💀'} ${r.mode} · T${r.turn} · ${new Date(r.date).toLocaleDateString()}</div>`).join('') || '<div class="dim small">Sin partidas</div>'}
    </div></div>`;
    wireBack(el);
    drawPassport(el.querySelector('#passport'), s);
    const statsRetry = el.querySelector('#statsRetry');
    if (statsRetry) {
      const pending = HF.store.get('last_score_payload', null);
      statsRetry.style.display = pending ? '' : 'none';
      statsRetry.onclick = () => {
        statsRetry.disabled = true;
        HF.retryMapScore().then(r => {
          HF.toast(r && r.ok ? 'Marca enviada al ranking' : 'No se pudo enviar: ' + ((r && r.msg) || 'error'), 3200);
          HF.go('stats');
        });
      };
    }
    const statsHistory = el.querySelector('#statsHistory');
    if (statsHistory) statsHistory.onclick = () => { if (HF.replays && HF.replays.openHistory) HF.replays.openHistory(); };
    HF.renderRanking(el.querySelector('#statsRankBody'), el.querySelector('#statsRankMe'), { isConnected: () => el.isConnected });
  });
  function drawPassport(cv, s) {
    if (!cv) return;
    const size = Math.min(180, Math.max(140, cv.clientWidth || 160));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = size * dpr; cv.height = size * dpr;
    cv.style.width = size + 'px'; cv.style.height = size + 'px';
    const x = cv.getContext('2d');
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cx = size / 2, cy = size / 2, r = size * .36, lw = size * .11;
    x.lineWidth = lw; x.lineCap = 'round';
    x.strokeStyle = '#263a66'; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.stroke();
    const total = Math.max(1, s.wins + s.losses);
    let a = -Math.PI / 2;
    const seg = (n, col) => {
      if (!n) return;
      const sw = Math.PI * 2 * n / total;
      x.strokeStyle = col; x.beginPath(); x.arc(cx, cy, r, a, a + sw); x.stroke(); a += sw;
    };
    seg(s.wins, '#4ade80'); seg(s.losses, '#f87171');
    const pct = s.wins + s.losses ? Math.round(100 * s.wins / (s.wins + s.losses)) : 0;
    x.fillStyle = '#e8eefc'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `700 ${Math.round(size * .18)}px "Plus Jakarta Sans", sans-serif`;
    x.fillText(pct + '%', cx, cy - 5);
    x.fillStyle = '#8aa0c8'; x.font = `600 ${Math.round(size * .07)}px "Plus Jakarta Sans", sans-serif`;
    x.fillText('VICTORIAS', cx, cy + size * .13);
  }

  // ---------- AJUSTES ----------
  HF.screen('settings', el => {
    const s = HF.settings();
    const row = (k, n) => `<div class="card row"><span class="grow">${n}</span><button data-k="${k}" class="${s[k] ? 'sel' : ''}">${s[k] ? HF.t('YES') : HF.t('NO')}</button></div>`;
    const hasCloud = !!HF.cloud;
    const cid = hasCloud ? HF.cloud.playerId() : '—';
    const ckey = hasCloud ? HF.cloud.secretKey() : '';
    const prem = hasCloud ? HF.cloud.isPremium() : false;
    const remail = hasCloud ? HF.cloud.recoveryEmail() : '';
    const pay = HF.payment;
    const price = pay ? pay.getPrices().amount : '$5.99 USD';
    const pending = pay && pay.pendingRequest ? pay.pendingRequest() : null;

    // «Cuenta y licencia»: el pago, la recuperación y el registro van aquí.
    // La recuperación también está en Free: un jugador que compró en otro
    // dispositivo entra como Free hasta que restaura su cuenta.
    const license = prem
      ? `<div class="card" id="licenseCard">
          <div class="row"><b class="grow">${HF.t('LICENSE_TITLE')}</b><span class="chip ok">${HF.t('LICENSE_PREMIUM_BADGE')}</span></div>
          <div class="dim small" style="margin-top:4px">${HF.t('LICENSE_PREMIUM_DESC')}</div>
          <div class="row" style="margin-top:6px"><span class="grow">${HF.t('LICENSE_EMAIL')}</span><b>${remail ? HF.esc(remail) : HF.t('LICENSE_EMAIL_NONE')}</b></div>
          <button id="licenseEmail" style="width:100%;margin-top:6px">✉️ ${remail ? HF.t('LICENSE_EMAIL_CHANGE') : HF.t('LICENSE_EMAIL_REGISTER')}</button>
          <div class="row" style="margin-top:6px">
            <button id="licenseSync">🔄 ${HF.t('LICENSE_SYNC')}</button>
            <button id="licenseLink">🔄 ${HF.t('LICENSE_LINK')}</button>
            <button id="licenseRecover">🔑 ${HF.t('LICENSE_RECOVER')}</button>
          </div>
          <div class="row" style="margin-top:6px"><span class="grow small dim">${HF.t('LICENSE_ID')}</span><code>${HF.esc(cid)}</code></div>
          <div class="row" style="margin-top:4px"><span class="grow small dim">${HF.t('LICENSE_KEY')}</span><code id="licenseSecret">••••••</code><button id="licenseKey">${HF.t('LICENSE_SHOW_KEY')}</button></div>
          <button id="licenseEditKey" style="width:100%;margin-top:6px">🔑 ${HF.t('LICENSE_EDIT_KEY')}</button>
          <button id="licenseCheck" style="width:100%;margin-top:6px">${HF.t('LICENSE_CHECK')}</button>
        </div>`
      : `<div class="card" id="licenseCard">
          <div class="row"><b class="grow">${HF.t('LICENSE_TITLE')}</b><span class="chip">${HF.t('LICENSE_FREE_BADGE')}</span></div>
          <div class="dim small" style="margin-top:4px">${HF.t('LICENSE_FREE_DESC')}</div>
          ${pending ? `<div class="small" style="margin-top:4px;color:var(--acc)">⏳ ${HF.t(pending.kind === 'buy' ? 'LICENSE_PENDING_BUY' : 'LICENSE_PENDING')}</div>` : ''}
          <div class="row" style="margin-top:6px"><span class="grow">${HF.t('LICENSE_PRODUCT')}</span><b>${HF.esc(price)}</b></div>
          <button id="licenseBuy" class="pri" style="width:100%;margin-top:6px">👑 ${HF.t('LICENSE_UNLOCK')}</button>
          <div class="row" style="margin-top:6px">
            <button id="licenseRegister">${HF.t('LICENSE_REGISTER')}</button>
            <button id="licenseCheck">${HF.t('LICENSE_CHECK')}</button>
          </div>
          <button id="licenseRestore" style="width:100%;margin-top:6px">🔄 ${HF.t('LICENSE_RESTORE_PURCHASE')}</button>
          <button id="licenseEmail" style="width:100%;margin-top:6px">✉️ ${remail ? HF.t('LICENSE_EMAIL_CHANGE') : HF.t('LICENSE_EMAIL_REGISTER')}</button>
          <button id="licenseRecover" style="width:100%;margin-top:6px">🔑 ${HF.t('LICENSE_RECOVER')}</button>
          <button id="licenseEditKey" style="width:100%;margin-top:6px">🔑 ${HF.t('LICENSE_EDIT_KEY')}</button>
        </div>`;

    el.innerHTML = `<div class="screen">${header(HF.t('SETTINGS'))}<div class="scroll">
      ${row('sound', HF.t('SOUND'))}${row('vibrate', HF.t('VIBRATE'))}${row('grid', HF.t('GRID'))}${row('nato', '🎖️ ' + HF.t('VIEW_NATO'))}${row('showIntroCrawl', '📜 ' + HF.t('CRAWL_SETTING'))}
      <div class="card"><div class="row"><span class="grow">${HF.t('LANGUAGE')}</span></div>
        <select id="langSel" class="lang-select" aria-label="${HF.t('LANGUAGE')}">
          ${HF.LANGS.map(l => `<option value="${l.code}"${HF.lang() === l.code ? ' selected' : ''}>${l.flag} ${l.name}</option>`).join('')}
        </select></div>
      <div class="card" id="loreCard">
        <div class="row"><b class="grow">📖 Introducción</b><button data-k="showLoreIntro" class="${s.showLoreIntro ? 'sel' : ''}">${s.showLoreIntro ? HF.t('YES') : HF.t('NO')}</button></div>
        <div class="dim small" style="margin-top:2px">Páginas de lore que explican el juego. Se muestran al abrir el juego, antes del menú, mientras no las desactives.</div>
        <button id="lorePreview" style="width:100%;margin-top:6px">▶ Ver la introducción ahora</button>
      </div>
      ${license}
      <div class="card" id="efDiagCard">
        <div class="row"><b class="grow">🔎 Diagnóstico de encuesta</b></div>
        <div class="dim small">Comprueba si hay campaña activa, preguntas y bloqueos locales sin abrir DevTools.</div>
        <button id="efDiag" style="width:100%;margin-top:6px">Abrir diagnóstico</button>
      </div>
      <div class="card"><div class="dim small">${HF.t('LOCAL_DATA')}</div><br><button id="reset">${HF.t('RESET')}</button></div>
      <div class="dim small">Federati v1.2 · build 208 · IA ${HF.aiBuild || '?'} · 🌐 Multijugador en línea</div></div></div>`;
    wireBack(el);
    el.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { s[b.dataset.k] = !s[b.dataset.k]; HF.store.set('settings', s); if (HF.bgm) HF.bgm.refresh(); HF.go('settings'); });
    const langSel = el.querySelector('#langSel');
    if (langSel) langSel.onchange = () => {
      const code = langSel.value;
      const done = () => HF.go('settings');
      if (HF.setLocale) HF.setLocale(code).then(done, done);
      else { HF.setLang(code); done(); }
    };
    // Vista previa de la pantalla de introducción (especificacion_pantalla_lore.md).
    const lorePreview = el.querySelector('#lorePreview');
    if (lorePreview) lorePreview.onclick = () => {
      if (!HF.LoreScreen) { HF.toast('Introducción no disponible'); return; }
      HF.LoreScreen.show('imperio');
    };
    const efDiag = el.querySelector('#efDiag');
    if (efDiag) efDiag.onclick = () => {
      if (HF.EventFeedbackModal && HF.EventFeedbackModal.openDebug) HF.EventFeedbackModal.openDebug();
      else HF.toast('Módulo de encuestas no disponible');
    };

    // ----- Cuenta y licencia ------------------------------------------------
    const toast = (msg, ms) => HF.toast(msg, ms);
    const copy = (txt, msg) => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(txt).then(() => toast(msg)).catch(() => toast(HF.t('LICENSE_COPY_FAIL')));
        } else toast(HF.t('LICENSE_COPY_FAIL'));
      } catch (e) { toast(HF.t('LICENSE_COPY_FAIL')); }
    };

    function openLinkDevice() {
      if (!HF.cloud) return;
      HF.modal(`<h3>🔄 ${HF.t('LICENSE_LINK')}</h3>
        <p class="dim small">${HF.t('LICENSE_LINK_DESC')}</p>
        <label>${HF.t('LICENSE_ID')}</label><input id="lkId" placeholder="HF-0000" autocomplete="off" spellcheck="false">
        <label>${HF.t('LICENSE_KEY')}</label><input id="lkKey" placeholder="K-XXXXXX" autocomplete="off" spellcheck="false">
        <div class="neg small" id="lkErr"></div>
        <div class="row"><button id="lkNo">${HF.t('CLOSE')}</button><button id="lkGo" class="pri grow">${HF.t('LICENSE_RESTORE')}</button></div>`, m => {
        const no = m.querySelector('#lkNo');
        if (no) no.onclick = HF.closeModal;
        const go = m.querySelector('#lkGo');
        if (go) go.onclick = () => {
          const id = String(m.querySelector('#lkId').value || '').trim();
          const key = String(m.querySelector('#lkKey').value || '').trim();
          if (!id || !key) { HF.toast(HF.t('LICENSE_ERR_CREDENTIALS')); return; }
          HF.cloud.linkDevice(id, key).then(r => {
            if (r && r.ok) {
              HF.closeModal();
              HF.toast(HF.cloud.isPremium() ? HF.t('LICENSE_ACTIVE') : HF.t('LICENSE_LINKED'));
              HF.go('settings');
            } else {
              HF.toast((r && r.msg) || HF.t('LICENSE_ERR_CREDENTIALS'));
            }
          }).catch(() => HF.toast(HF.t('LICENSE_ERR_CREDENTIALS')));
        };
      });
    }

    function openEditSecret() {
      if (!HF.cloud) return;
      const current = HF.cloud.secretKey();
      const suggested = HF.cloud.generateSecretKey();
      HF.modal(`<h3>🔑 ${HF.t('LICENSE_EDIT_KEY')}</h3>
        <p class="dim small">${HF.t('LICENSE_EDIT_KEY_DESC')}</p>
        <div class="card"><div class="row"><span class="grow small dim">${HF.t('LICENSE_KEY_CURRENT')}</span><code>${HF.esc(current)}</code></div></div>
        <label>${HF.t('LICENSE_KEY_NEW')}</label>
        <input id="skNew" maxlength="40" autocomplete="off" spellcheck="false" value="${HF.esc(suggested)}">
        <div class="row" style="margin-top:6px"><button id="skGen">🎲 ${HF.t('LICENSE_KEY_GENERATE')}</button></div>
        <div class="dim small" style="margin-top:6px">${HF.t('LICENSE_EDIT_KEY_WARN')}</div>
        <div class="neg small" id="skErr"></div>
        <div class="row"><button id="skNo">${HF.t('CLOSE')}</button><button id="skGo" class="pri grow">${HF.t('LICENSE_SAVE')}</button></div>`, m => {
        const input = m.querySelector('#skNew');
        const err = m.querySelector('#skErr');
        const gen = m.querySelector('#skGen');
        const no = m.querySelector('#skNo');
        const go = m.querySelector('#skGo');

        if (no) no.onclick = HF.closeModal;
        if (gen) gen.onclick = () => { if (input) input.value = HF.cloud.generateSecretKey(); };

        const submit = () => {
          const value = String(input ? input.value : '').trim();
          if (!/^[A-Za-z0-9_-]{6,40}$/.test(value)) {
            if (err) err.textContent = HF.t('LICENSE_KEY_BAD');
            return;
          }
          if (value === current) {
            if (err) err.textContent = HF.t('LICENSE_KEY_SAME');
            return;
          }
          if (err) err.textContent = '';
          if (go) { go.disabled = true; go.textContent = HF.t('PAY_SENDING'); }

          HF.cloud.setSecretKey(value).then(r => {
            if (r && r.ok) {
              HF.closeModal();
              HF.toast(HF.t('LICENSE_KEY_OK'), 4200);
              HF.go('settings');
              return;
            }
            if (go) { go.disabled = false; go.textContent = HF.t('LICENSE_SAVE'); }
            const msg = (r && r.msg) || '';
            if (err) {
              if (/no autorizado/i.test(msg)) err.textContent = HF.t('LICENSE_KEY_AUTH');
              else if (/llave sin cambios/i.test(msg)) err.textContent = HF.t('LICENSE_KEY_SAME');
              else if (/llave invalida/i.test(msg)) err.textContent = HF.t('LICENSE_KEY_BAD');
              else if (/demasiados/i.test(msg)) err.textContent = HF.t('LICENSE_TOO_MANY');
              else if (r && r.offline) err.textContent = HF.t('LICENSE_OFFLINE');
              else err.textContent = msg || HF.t('LICENSE_KEY_ERR');
            }
          }).catch(() => {
            if (go) { go.disabled = false; go.textContent = HF.t('LICENSE_SAVE'); }
            if (err) err.textContent = HF.t('LICENSE_OFFLINE');
          });
        };

        if (go) go.onclick = submit;
        if (input) input.onkeydown = e => { if (e.key === 'Enter') submit(); };
      });
    }

    function openRecoverAccount() {
      if (!HF.cloud) return;
      HF.modal(`<h3>🔑 ${HF.t('LICENSE_RECOVER')}</h3>
        <p class="dim small">${HF.t('LICENSE_RECOVER_DESC')}</p>
        <label>${HF.t('LICENSE_EMAIL')}</label>
        <input id="rcMail" type="email" autocomplete="email" placeholder="tu_correo@ejemplo.com" value="${HF.esc(remail || '')}">
        <div class="neg small" id="rcErr"></div>
        <div class="row"><button id="rcNo">${HF.t('CLOSE')}</button><button id="rcGo" class="pri grow">${HF.t('LICENSE_RECOVER_GO')}</button></div>
        <div class="dim small" style="margin-top:10px">${HF.t('LICENSE_RECOVER_ALT')}</div>
        <button id="rcLink" style="width:100%;margin-top:4px">🔄 ${HF.t('LICENSE_LINK')}</button>`, m => {
        const no = m.querySelector('#rcNo');
        if (no) no.onclick = HF.closeModal;
        const link = m.querySelector('#rcLink');
        if (link) link.onclick = () => { HF.closeModal(); openLinkDevice(); };
        const go = m.querySelector('#rcGo');
        if (go) go.onclick = () => {
          const email = String(m.querySelector('#rcMail').value || '').trim();
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { HF.toast(HF.t('LICENSE_EMAIL_BAD')); return; }
          HF.cloud.recoverByEmail(email).then(r => {
            if (r && r.ok) {
              HF.closeModal();
              HF.toast(HF.t('LICENSE_RECOVER_SENT'), 4600);
            } else if (r && r.offline) {
              HF.toast(HF.t('LICENSE_OFFLINE'), 3800);
            } else {
              HF.toast((r && r.msg) || HF.t('LICENSE_RECOVER_NOT_FOUND'), 4200);
            }
          }).catch(() => HF.toast(HF.t('LICENSE_OFFLINE')));
        };
      });
    }

    const buy = el.querySelector('#licenseBuy');
    if (buy) buy.onclick = () => { if (pay) pay.openPurchase(); else toast(HF.t('LICENSE_OFFLINE')); };
    const register = el.querySelector('#licenseRegister');
    if (register) register.onclick = () => { if (pay) pay.openRegister({ kind: 'paid' }); };
    const restore = el.querySelector('#licenseRestore');
    if (restore) restore.onclick = () => openLinkDevice();
    const check = el.querySelector('#licenseCheck');
    if (check) check.onclick = () => { if (pay) pay.checkLicense(); };
    const emailBtn = el.querySelector('#licenseEmail');
    if (emailBtn) emailBtn.onclick = () => { if (pay) pay.openEmail(); };
    const linkBtn = el.querySelector('#licenseLink');
    if (linkBtn) linkBtn.onclick = () => openLinkDevice();
    const recoverBtn = el.querySelector('#licenseRecover');
    if (recoverBtn) recoverBtn.onclick = () => openRecoverAccount();
    const editKeyBtn = el.querySelector('#licenseEditKey');
    if (editKeyBtn) editKeyBtn.onclick = () => openEditSecret();
    const syncBtn = el.querySelector('#licenseSync');
    if (syncBtn) syncBtn.onclick = () => {
      if (!HF.cloud) return;
      HF.cloud.saveProfileCloud().then(r => toast(r && r.ok ? HF.t('LICENSE_SYNC_OK') : HF.t('LICENSE_OFFLINE')));
    };
    const keyBtn = el.querySelector('#licenseKey');
    let shown = false;
    if (keyBtn) keyBtn.onclick = () => {
      shown = !shown;
      const target = el.querySelector('#licenseSecret');
      if (target) target.textContent = shown ? ckey : '••••••';
      keyBtn.textContent = shown ? HF.t('LICENSE_HIDE_KEY') : HF.t('LICENSE_SHOW_KEY');
      if (shown) copy(ckey, HF.t('LICENSE_KEY_COPIED'));
    };

    el.querySelector('#reset').onclick = () => { if (confirm(HF.t('RESET_CONFIRM'))) { ['tribe_profile', 'campaign_progress', 'daily_challenge', 'player_statistics', 'savegame_active', 'maps', 'newgame_opts', 'ef_seen', 'ef_outbox', 'paypal_pending_order'].forEach(k => HF.store.del(k)); HF.go('hub'); } };
  });
})(window);
