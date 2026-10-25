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
    if (HF.onLeave) { HF.onLeave(); HF.onLeave = null; }
    app().innerHTML = '';
    HF.sfx('click');
    screens[name](app(), arg);
  };
  const header = title => `<div class="bar"><button data-back>◀</button><div class="title grow">${title}</div></div>`;
  HF.header = header;
  const wireBack = (el, to) => { const b = el.querySelector('[data-back]'); if (b) b.onclick = () => HF.go(to || 'hub'); };
  HF.wireBack = wireBack;

  // ---------- HUB ----------
  HF.screen('hub', el => {
    const tribe = HF.loadTribe(), save = HF.store.get('savegame_active', null);
    const d = HF.dailyState(), doneToday = d.date === HF.dailyKey() && d.attempts > 0;
    el.innerHTML = `<div class="screen hub">
      <div class="bar"><button id="daily" class="badge">🏆 Diario${doneToday ? ' ✔' : ' <b style="color:var(--acc)">!</b>'}</button><div class="grow"></div><button id="news">📢</button></div>
      <div class="hub-mid">
        <h1>HEXFRONTIER</h1>
        <div class="dim" style="text-align:center">Estrategia hexagonal por turnos</div>
        ${save ? `<button class="pri big" id="cont">▶ Continuar <span class="dim">· T${save.turn} · ${HF.esc(save.mode)}</span></button>` : ''}
        <button class="big" id="camp">⚔️ Campaña <span class="dim">★ ${HF.totalStars()}/90</span></button>
        <button class="big" id="new">🎲 Nueva partida</button>
        <button class="big" id="online" disabled>🌐 En línea <span class="dim">(próximamente)</span></button>
      </div>
      <div class="dock">
        <button id="tribe"><span style="color:${tribe.color}">${tribe.crest}</span>Tribu</button>
        <button id="editor"><span>🗺️</span>Mapas</button>
        <button id="stats"><span>📊</span>Stats</button>
        <button id="set"><span>⚙️</span>Ajustes</button>
      </div></div>`;
    const on = (id, fn) => { const b = el.querySelector('#' + id); if (b) b.onclick = fn; };
    on('daily', () => HF.go('daily')); on('camp', () => HF.go('campaign')); on('new', () => HF.go('newgame'));
    on('tribe', () => HF.go('tribe')); on('editor', () => HF.go('editor')); on('stats', () => HF.go('stats')); on('set', () => HF.go('settings'));
    on('cont', () => { try { HF.startGame(HF.deserialize(save)); } catch (e) { console.error(e); HF.store.del('savegame_active'); HF.toast('Guardado dañado'); HF.go('hub'); } });
    on('news', () => HF.modal(`<h3>📢 Noticias</h3><p class="dim">Versión 1.0 · modo local sin conexión.<br>Multijugador y partidas en línea llegarán en próximas versiones.</p>
      <div class="row"><button disabled>Discord</button><button disabled>Web</button><button disabled>Redes</button></div><br><button id="x" class="pri">Cerrar (X)</button>`, m => m.querySelector('#x').onclick = HF.closeModal));
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
          ${path.map(id => { const d = HF.DOCT[id], eff = HF.IMPL[p.name][d.tag]; return `<div class="small">• <b>${d.id}</b> ${HF.esc(d.name)} <span class="dim">${eff ? '— ' + HF.esc(eff) : '(en desarrollo)'}</span></div>`; }).join('')}</div>`;
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
      const step = () => {
        const opts = path.length ? HF.children(path[path.length - 1]) : HF.roots(p.root);
        HF.modal(`<h3>${p.icon} ${p.name} — nivel ${path.length + 1}/3</h3>
          <div class="crumbs">${path.map(id => `<span class="chip">${id} ${HF.esc(HF.DOCT[id].name)}</span>`).join('')}</div>
          ${opts.map(d => { const eff = HF.IMPL[p.name][d.tag]; return `<button class="node" data-id="${d.id}" style="margin:5px 0"><b>[${d.id}] ${HF.esc(d.name)}</b><div class="t">${eff ? HF.esc(eff) : 'En desarrollo: se guarda, sin efecto aún'}</div></button>`; }).join('')}
          <div class="row"><button id="bk">${path.length ? '◀ Atrás' : 'Cancelar'}</button></div>`, m => {
          m.querySelectorAll('[data-id]').forEach(b => b.onclick = () => {
            HF.sfx('click'); path.push(b.dataset.id);
            if (path.length === 3) { t[p.key + '_path'] = path.slice(); persist(); HF.closeModal(); draw(); HF.toast('Doctrina guardada'); } else step();
          });
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
    const s = HF.getStats(), t = HF.loadTribe();
    el.innerHTML = `<div class="screen">${header('Estadísticas')}<div class="scroll">
      <div class="card"><div class="row"><span style="font-size:32px">${t.crest}</span><b>${HF.esc(t.name)}</b></div>
      <table>
      <tr><td>Partidas</td><td>${s.games}</td></tr><tr><td>Victorias / derrotas</td><td>${s.wins} / ${s.losses}</td></tr>
      <tr><td>% victorias</td><td>${s.games ? Math.round(100 * s.wins / s.games) : 0}%</td></tr>
      <tr><td>Racha / mejor</td><td>${s.streak} / ${s.bestStreak}</td></tr>
      <tr><td>Victoria más rápida</td><td>${s.bestWinTurns ? 'T' + s.bestWinTurns : '—'}</td></tr>
      <tr><td>Turnos jugados</td><td>${s.turns}</td></tr><tr><td>Unidades eliminadas</td><td>${s.kills}</td></tr>
      <tr><td>Casillas conquistadas</td><td>${s.captured}</td></tr><tr><td>Edificios construidos</td><td>${s.built}</td></tr>
      <tr><td>Estrellas campaña</td><td>${HF.totalStars()}/90</td></tr></table></div>
      <h3>Recientes</h3>${s.recent.map(r => `<div class="small">${r.won ? '🏆' : '💀'} ${r.mode} · T${r.turn} · ${new Date(r.date).toLocaleDateString()}</div>`).join('') || '<div class="dim small">Sin partidas</div>'}
    </div></div>`;
    wireBack(el);
  });

  // ---------- AJUSTES ----------
  HF.screen('settings', el => {
    const s = HF.settings();
    const row = (k, n) => `<div class="card row"><span class="grow">${n}</span><button data-k="${k}" class="${s[k] ? 'sel' : ''}">${s[k] ? 'Sí' : 'No'}</button></div>`;
    el.innerHTML = `<div class="screen">${header('Ajustes')}<div class="scroll">
      ${row('sound', '🔊 Sonido')}${row('vibrate', '📳 Vibración')}${row('grid', '▦ Rejilla del mapa')}
      <div class="card"><div class="dim small">Todos los datos se guardan localmente en este dispositivo.</div><br><button id="reset">🗑 Borrar todos los datos</button></div>
      <div class="dim small">HexFrontier v1.0 · sin multijugador</div></div></div>`;
    wireBack(el);
    el.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { s[b.dataset.k] = !s[b.dataset.k]; HF.store.set('settings', s); HF.go('settings'); });
    el.querySelector('#reset').onclick = () => { if (confirm('¿Borrar todos los datos locales?')) { ['tribe_profile', 'campaign_progress', 'daily_challenge', 'player_statistics', 'savegame_active', 'maps', 'newgame_opts'].forEach(k => HF.store.del(k)); HF.go('hub'); } };
  });
})(window);
