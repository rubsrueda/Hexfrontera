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

  const screens = {};
  HF.screen = (name, fn) => { screens[name] = fn; };
  HF.go = (name, arg) => {
    HF.closeModal();
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
  };
  const header = title => `<div class="bar"><button data-back>◀</button><div class="title grow">${title}</div></div>`;
  HF.header = header;
  const wireBack = (el, to) => { const b = el.querySelector('[data-back]'); if (b) b.onclick = () => HF.go(to || 'hub'); };
  HF.wireBack = wireBack;

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
    el.innerHTML = `<div class="screen hub">
      <div class="bar"><button id="daily" class="badge">${HF.t('BTN_DAILY')}${doneToday ? ' ✔' : ' <b style="color:var(--acc)">!</b>'}</button><div class="grow"></div><button id="set2" data-nav="settings" title="${HF.t('DOCK_SETTINGS')}">⚙️</button><button id="rep" title="Ver repetición">🎬</button><button id="news">${HF.t('BTN_NEWS')}</button></div>
      <div class="hub-mid">
        <h1>${HF.t('HUB_TITLE')}</h1>
        <div class="dim" style="text-align:center">${HF.t('HUB_SUBTITLE')}</div>
        ${save ? `<button class="pri big" id="cont">${HF.t('BTN_CONTINUE')} <span class="dim">· T${save.turn} · ${HF.esc(save.mode)}</span></button>` : ''}
        <button class="big" id="camp">${HF.t('BTN_CAMPAIGN')} <span class="dim">★ ${HF.totalStars()}/90</span></button>
        <button class="big" id="new">${HF.t('BTN_NEW_GAME')}</button>
        <button class="big" id="online" disabled>${HF.t('BTN_ONLINE')} <span class="dim">(${HF.t('COMING_SOON')})</span></button>
      </div>
      <div class="dock">
        <button id="tribe"><span style="color:${tribe.color}">${tribe.crest}</span>${HF.t('DOCK_TRIBE')}</button>
        <button id="editor"><span>🗺️</span>${HF.t('DOCK_MAPS')}</button>
        <button id="stats"><span>📊</span>${HF.t('DOCK_STATS')}</button>
        <button id="set" data-nav="settings"><span>⚙️</span>${HF.t('DOCK_SETTINGS')}</button>
        <button id="wiki"><span>📖</span>${HF.t('DOCK_WIKI')}</button>
      </div></div>`;
    const on = (id, fn) => { const b = el.querySelector('#' + id); if (b) b.onclick = fn; };
    on('daily', () => HF.go('daily')); on('camp', () => HF.go('campaign')); on('new', () => HF.go('newgame'));
    on('tribe', () => HF.go('tribe')); on('editor', () => HF.go('editor')); on('stats', () => HF.go('stats'));
    // delegación: garantiza que Ajustes responda aunque otro handler reemplace el onclick
    el.addEventListener('click', e => {
      const b = e.target && e.target.closest ? e.target.closest('[data-nav]') : null;
      if (b && b.dataset.nav) { e.preventDefault(); HF.go(b.dataset.nav); }
    });
    on('wiki', () => HF.codex());
    on('rep', () => HF.replayCodePrompt());
    on('cont', () => { try { HF.startGame(HF.deserialize(save)); } catch (e) { console.error(e); HF.store.del('savegame_active'); HF.toast(HF.lang() === 'en' ? 'Corrupted save' : 'Guardado dañado'); HF.go('hub'); } });
    on('news', () => HF.modal(`<h3>📢 ${HF.lang() === 'en' ? 'News' : 'Noticias'}</h3><p class="dim">${HF.lang() === 'en' ? 'Version 1.0 · local offline mode.<br>Multiplayer and online games are coming in future versions.' : 'Versión 1.0 · modo local sin conexión.<br>Multijugador y partidas en línea llegarán en próximas versiones.'}</p>
      <div class="row"><button disabled>Discord</button><button disabled>Web</button><button disabled>${HF.lang() === 'en' ? 'Social' : 'Redes'}</button></div><br><button id="x" class="pri">${HF.lang() === 'en' ? 'Close (X)' : 'Cerrar (X)'}</button>`, m => m.querySelector('#x').onclick = HF.closeModal));
  });

  // ---------- TRIBU ----------
  HF.screen('tribe', el => {
    const t = HF.loadTribe();
    const persist = () => HF.store.set('tribe_profile', HF.compileTribe(t));
    const draw = () => {
      el.innerHTML = `<div class="screen">${header('Tribu')}
      <div class="scroll">
        <div class="card"><label>Nombre</label><input type="text" id="nm" maxlength="16" value="${HF.esc(t.name)}">
        <label>Color</label><div class="row">${HF.COLORS.map(c => `<button class="sw ${c === t.color ? 'sel' : ''}" data-c="${c}" style="background:${c}"></button>`).join('')}</div>
        <label>Blasón</label><div class="row">${HF.CRESTS.map(c => `<button class="sw ${c === t.crest ? 'sel' : ''}" data-r="${c}" style="background:#223;font-size:18px">${c}</button>`).join('')}</div></div>
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
      el.querySelector('#nm').oninput = e => { t.name = e.target.value.trim() || 'Mi Tribu'; persist(); };
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
    draw();
  });

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
        <label>Facciones (tú + IA)</label>${seg('n', Array.from({ length: sz.maxF - sz.minF + 1 }, (_, i) => [sz.minF + i, sz.minF + i]))}
        <label>Niebla de guerra</label>${seg('fog', [['FULL', 'Completa'], ['EXPLORED', 'Explorada'], ['NONE', 'Sin niebla']])}
        <label>Dificultad IA</label>${seg('difficulty', [['easy', 'Fácil'], ['normal', 'Normal'], ['hard', 'Difícil']])}
        <label>Semilla (vacío = aleatoria)</label><input type="text" id="seed" value="${HF.esc(o.seed || '')}">
        <div class="dim small" style="margin-top:6px">Los barcos se reclutan en agua junto a un campamento o edificio superior.</div>
        <br><button class="pri big" id="go" style="width:100%">Empezar</button>
        <br><br><button id="mine" style="width:100%">📂 Jugar un mapa guardado</button>
        <br><br><button id="code" style="width:100%">🗺️ Jugar un mapa de la comunidad (código)</button>
      </div></div>`;
      wireBack(el);
      el.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { const k = b.dataset.k; o[k] = (k === 'n') ? +b.dataset.v : b.dataset.v; o.seed = el.querySelector('#seed').value; draw(); });
      el.querySelector('#go').onclick = () => {
        const sv = el.querySelector('#seed').value.trim(); o.seed = sv;
        HF.store.set('newgame_opts', o);
        const seed = sv ? (/^\d+$/.test(sv) ? parseInt(sv, 10) >>> 0 : [...sv].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)) : Math.floor(Math.random() * 1e9);
        HF.startGame(HF.makeGame({ mode: 'skirmish', seed, size: o.size, n: o.n, biome: o.biome, fog: o.fog, difficulty: o.difficulty, goal: { type: 'conquer' } }, HF.loadTribe()));
      };
      el.querySelector('#mine').onclick = () => HF.mapsModal(null);
      el.querySelector('#code').onclick = () => HF.go('editor', { importFirst: true });
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
      <h3>Historial</h3>${d.history.length ? d.history.map(h => `<div class="small">${h.k} · T${h.turn} ${h.medal}</div>`).join('') : '<div class="dim small">Sin victorias aún</div>'}
    </div></div>`;
    wireBack(el);
    el.querySelector('#go').onclick = () => HF.startGame(HF.makeGame(spec, HF.loadTribe()));
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
        <div class="row"><span style="font-size:38px">${t.crest}</span><div class="grow"><b>${HF.esc(t.name)}</b><div class="dim small">Pasaporte de Estratega</div></div><div class="stars">${HF.totalStars()}/90</div></div>
        <canvas class="donut" id="passport"></canvas>
        <div class="medallero">🥇 ${medals.gold} · 🥈 ${medals.silver} · 🥉 ${medals.bronze}</div>
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
    x.font = `bold ${Math.round(size * .18)}px "Courier New", monospace`;
    x.fillText(pct + '%', cx, cy - 5);
    x.fillStyle = '#8aa0c8'; x.font = `${Math.round(size * .07)}px "Courier New", monospace`;
    x.fillText('VICTORIAS', cx, cy + size * .13);
  }

  // ---------- AJUSTES ----------
  HF.screen('settings', el => {
    const s = HF.settings();
    const row = (k, n) => `<div class="card row"><span class="grow">${n}</span><button data-k="${k}" class="${s[k] ? 'sel' : ''}">${s[k] ? HF.t('YES') : HF.t('NO')}</button></div>`;
    el.innerHTML = `<div class="screen">${header(HF.t('SETTINGS'))}<div class="scroll">
      ${row('sound', HF.t('SOUND'))}${row('vibrate', HF.t('VIBRATE'))}${row('grid', HF.t('GRID'))}
      <div class="card"><div class="row"><span class="grow">${HF.t('LANGUAGE')}</span></div>
        <div class="langs">${HF.LANGS.map(l => `<button data-lang="${l.code}" class="${HF.lang() === l.code ? 'sel' : ''}">${l.flag} ${l.name}</button>`).join('')}</div></div>
      <div class="card"><div class="dim small">${HF.t('LOCAL_DATA')}</div><br><button id="reset">${HF.t('RESET')}</button></div>
      <div class="dim small">HexFrontier v1.0 · build 53 · ${HF.t('NO_MULTIPLAYER')}</div></div></div>`;
    wireBack(el);
    el.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { s[b.dataset.k] = !s[b.dataset.k]; HF.store.set('settings', s); if (HF.bgm) HF.bgm.refresh(); HF.go('settings'); });
    el.querySelectorAll('[data-lang]').forEach(b => b.onclick = () => { HF.setLang(b.dataset.lang); HF.go('settings'); });
    el.querySelector('#reset').onclick = () => { if (confirm(HF.t('RESET_CONFIRM'))) { ['tribe_profile', 'campaign_progress', 'daily_challenge', 'player_statistics', 'savegame_active', 'maps', 'newgame_opts'].forEach(k => HF.store.del(k)); HF.go('hub'); } };
  });
})(window);
