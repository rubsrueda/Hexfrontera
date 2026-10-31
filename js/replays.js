(function (G) {
  const HF = G.HF = G.HF || {};
  const LIST = 'replay_history', DATA = 'replay_data', MAX = 50;
  let timer = 0, pending = null;

  const now = () => Date.now();
  const list = () => HF.store.get(LIST, []);
  const all = () => HF.store.get(DATA, {});
  const modeName = m => ({ campaign: 'Campaña', daily: 'Desafío diario', community: 'Mapa comunitario' }[m] || 'Escaramuza');
  const playersOf = g => (g.f || []).map(x => (HF.crestEmoji(x.crest) || '🛡') + ' ' + (x.name || 'Tribu')).join(' vs ');
  // Misma partida reanudada: coincide modo, semilla, radio y tribus.
  const sameGame = (e, g) => !e.over && e.mode === (g.mode || 'skirmish') && e.seed === g.seed &&
    e.radius === g.R && e.players === playersOf(g);
  const isPrefix = (a, b) => a.length <= b.length && a.every((x, i) => JSON.stringify(x) === JSON.stringify(b[i]));

  function makeId() {
    return 'R' + now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  function ensure(g) {
    if (!g) return null;
    if (!g.replayId) g.replayId = makeId();
    return g.replayId;
  }
  function persist(ls, data) {
    try {
      HF.store.set(LIST, ls);
      HF.store.set(DATA, data);
      return true;
    } catch (e) {
      // Cuota llena: conservar las partidas más recientes.
      try {
        const cut = Math.max(1, Math.floor(ls.length / 2));
        const keep = ls.slice(0, cut), kd = {};
        for (const e of keep) if (data[e.id]) kd[e.id] = data[e.id];
        HF.store.set(LIST, keep); HF.store.set(DATA, kd);
        return true;
      } catch (e2) { return false; }
    }
  }
  function meta(g, id, created, prev) {
    const label = (g.meta && (g.meta.name || (g.meta.act != null ? 'Campaña ' + (g.meta.act + 1) + '-' + (g.meta.level + 1) : ''))) ||
      modeName(g.mode) + (g.mode === 'skirmish' ? ' · semilla ' + g.seed : '');
    const ended = !!g.over;
    return {
      id, createdAt: created || now(), updatedAt: now(),
      mode: g.mode || 'skirmish', label, turn: g.turn || 1,
      over: ended, won: ended ? !!g.over.won : null,
      reason: ended ? g.over.reason : '',
      players: playersOf(g),
      radius: g.R, seed: g.seed,
      // Resultado para el historial: puntuación, mapa y puesto en su Top.
      score: ended && HF.calculateScore ? HF.calculateScore(g) : (prev && prev.score != null ? prev.score : null),
      mapKey: HF.cloud && HF.cloud.getMapKey ? HF.cloud.getMapKey(g) : (prev && prev.mapKey ? prev.mapKey : ''),
      rank: prev && prev.rank ? prev.rank : null
    };
  }
  function write(g) {
    if (!g || g.isReplay) return;
    let id = ensure(g), data = all(), ls = list();
    let old = ls.find(e => e.id === id);
    // Si el guardado antiguo perdió el replayId, reutiliza la entrada en curso
    // de la misma partida en vez de crear otra.
    if (!old && g._resumed) {
      const same = ls.filter(e => e.id !== id && sameGame(e, g));
      const exact = g.replayCreatedAt ? same.filter(e => e.createdAt === g.replayCreatedAt) : same;
      const match = (exact.length ? exact : same)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
      if (match) {
        id = match.id; g.replayId = id; g.replayCreatedAt = match.createdAt; old = match;
      }
    }
    const entry = meta(g, id, old && old.createdAt, old);
    g.replayCreatedAt = entry.createdAt;
    const at = ls.findIndex(e => e.id === id);
    if (at >= 0) ls[at] = entry; else ls.unshift(entry);
    ls.sort((a, b) => b.updatedAt - a.updatedAt);
    while (ls.length > MAX) {
      const drop = ls.pop();
      if (drop && drop.id !== id) delete data[drop.id];
    }
    data[id] = { at: now(), payload: HF.replayPayload(g), code: (data[id] && data[id].code) || '' };
    persist(ls, data);
  }
  // Limpia duplicados de una misma partida en curso. Solo fusiona entradas
  // cuando el registro de una es prefijo del de la otra (misma partida más
  // avanzada); dos partidas distintas con la misma semilla se conservan.
  function prune(keepId) {
    const ls = list(), data = all(), groups = new Map();
    for (const e of ls) {
      if (e.over) continue;
      const fp = [e.mode, e.seed, e.radius, e.players].join('::');
      const arr = groups.get(fp) || []; arr.push(e); groups.set(fp, arr);
    }
    const drop = new Set();
    for (const arr of groups.values()) {
      if (arr.length < 2) continue;
      const logs = arr.map(e => {
        const d = data[e.id];
        return d && d.payload && Array.isArray(d.payload.log) ? { e, log: d.payload.log } : null;
      });
      if (logs.some(x => !x)) continue;
      logs.sort((a, b) => (a.e.id === keepId ? -1 : b.e.id === keepId ? 1 : 0) ||
        (b.log.length - a.log.length) || ((b.e.updatedAt || 0) - (a.e.updatedAt || 0)));
      const kept = [];
      for (const x of logs) {
        if (kept.some(k => isPrefix(x.log, k.log))) drop.add(x.e.id);
        else kept.push(x);
      }
    }
    if (!drop.size) return 0;
    const next = ls.filter(e => !drop.has(e.id));
    for (const id of drop) delete data[id];
    persist(next, data);
    return drop.size;
  }

  function touch(g, immediate) {
    if (!g || g.isReplay) return;
    ensure(g);
    if (timer) { clearTimeout(timer); timer = 0; }
    if (immediate) { write(g); pending = null; return; }
    pending = g;
    timer = G.setTimeout(() => { timer = 0; const p = pending; pending = null; if (p) write(p); }, 420);
  }
  function flush(g) {
    if (timer) { clearTimeout(timer); timer = 0; }
    if (g) write(g);
    pending = null;
  }
  function init(g) {
    if (!g || g.isReplay) return null;
    ensure(g); touch(g, true); if (g._resumed) prune(g.replayId);
    return g.replayId;
  }
  function finish(g) { if (g && !g.isReplay) touch(g, true); }
  function remove(id) {
    const ls = list().filter(e => e.id !== id), data = all();
    delete data[id]; persist(ls, data);
  }
  function entry(id) { return list().find(e => e.id === id) || null; }
  // Puesto en el Top del mapa, cuando el envío a la nube termina.
  function setRank(id, rank) {
    if (!id || !rank) return;
    const ls = list(), e = ls.find(x => x.id === id);
    if (!e) return;
    e.rank = rank;
    persist(ls, all());
  }
  function payload(id) {
    const d = all()[id];
    return d && d.payload ? d.payload : null;
  }
  async function saveCode(g) {
    if (!g || g.isReplay) return null;
    flush(g);
    const id = ensure(g);
    const code = await HF.encodeReplay(HF.replayPayload(g));
    const data = all();
    if (data[id]) { data[id].code = code; persist(list(), data); }
    return code;
  }
  function copy(txt, msg, m) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => HF.toast(msg)).catch(() => { if (m) m.querySelector('textarea') && m.querySelector('textarea').select(); });
      else if (m) { const t = m.querySelector('textarea'); if (t) t.select(); }
    } catch (e) { if (m) { const t = m.querySelector('textarea'); if (t) t.select(); } }
  }
  function shareModal(code, e) {
    const base = location.href.split('#')[0], url = base + '#replay=' + code;
    const host = location.hostname;
    const local = location.protocol === 'file:' || !host || host === 'localhost' || host === '127.0.0.1' ||
      /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
    HF.modal(`<h3>🎬 Código de la partida</h3>
      <div class="dim small">${HF.esc(e ? e.label : 'Partida')} · ${e ? 'T' + e.turn : ''}</div>
      ${local ? '<p class="neg small">Este enlace apunta a un archivo o servidor local: en otro dispositivo no abrirá. Comparte el código y usa 🎬 desde el Hub.</p>' : ''}
      <div class="dim small">Enlace</div><textarea readonly id="repUrl" style="min-height:80px">${HF.esc(url)}</textarea>
      <div class="dim small">Código</div><textarea readonly id="repCode" style="min-height:64px">${HF.esc(code)}</textarea>
      <div class="row"><button id="cpUrl">Copiar enlace</button><button id="cpCode" class="pri grow">Copiar código</button><button id="cx">Cerrar</button></div>`, m => {
      m.querySelector('#cpUrl').onclick = () => copy(url, 'Enlace copiado', m);
      m.querySelector('#cpCode').onclick = () => copy(code, 'Código copiado', m);
      m.querySelector('#cx').onclick = HF.closeModal;
    });
  }
  async function share(id, g) {
    try {
      if (g && g.replayId) id = g.replayId;
      let e = entry(id);
      let code;
      if (g && !g.isReplay) code = await saveCode(g);
      else {
        const d = all()[id];
        if (!d || !d.payload) return HF.toast('No hay repetición guardada');
        code = d.code || await HF.encodeReplay(d.payload);
        const data = all(); data[id].code = code; persist(list(), data);
      }
      if (!e) e = entry(id);
      shareModal(code, e);
    } catch (err) {
      HF.toast('No se pudo generar el código');
    }
  }
  function play(id) {
    const p = payload(id);
    if (!p) return HF.toast('No hay repetición guardada');
    HF.closeModal();
    HF.playReplay(p);
  }
  function openHistory() {
    const cleaned = prune();
    const draw = () => {
      const es = list();
      const body = es.length ? es.map(e => {
        const date = new Date(e.updatedAt).toLocaleString();
        const status = !e.over ? '⏳ En curso' : (e.won ? '🏆 Victoria' : '💀 Derrota');
        const extras = [];
        if (e.mapKey) extras.push(HF.cloud && HF.cloud.mapKeyLabel ? HF.cloud.mapKeyLabel(e.mapKey) : e.mapKey);
        if (e.score != null) extras.push((+e.score).toLocaleString() + ' pts');
        if (e.rank) extras.push('Puesto #' + e.rank);
        return `<div class="card"><div class="row"><b class="grow">${HF.esc(e.label || 'Partida')}</b><span class="chip">${status}</span></div>
          <div class="dim small">${date} · T${e.turn} · ${HF.esc(e.players || '')}</div>
          ${extras.length ? `<div class="small" style="color:var(--acc)">${extras.map(x => HF.esc(x)).join(' · ')}</div>` : ''}
          <div class="row" style="margin-top:6px"><button data-rv="${e.id}">▶ Ver</button>${e.mapKey ? `<button data-rt="${e.id}">🏆 Top</button>` : ''}<button data-rs="${e.id}" class="pri grow">📤 Compartir</button><button data-rd="${e.id}">🗑</button></div></div>`;
      }).join('') : '<div class="dim small">Todavía no hay partidas guardadas.</div>';
      HF.modal(`<h3>📜 Historial de partidas</h3>${body}<br><button id="rhx" style="width:100%">Cerrar</button>`, m => {
        m.querySelector('#rhx').onclick = HF.closeModal;
        m.querySelectorAll('[data-rv]').forEach(b => b.onclick = () => play(b.dataset.rv));
        m.querySelectorAll('[data-rt]').forEach(b => b.onclick = () => {
          const e = entry(b.dataset.rt);
          if (e && e.mapKey && HF.mapRankingModal) HF.mapRankingModal(e.mapKey, openHistory);
        });
        m.querySelectorAll('[data-rs]').forEach(b => b.onclick = () => share(b.dataset.rs));
        m.querySelectorAll('[data-rd]').forEach(b => b.onclick = () => {
          if (confirm('¿Eliminar esta repetición del historial?')) { remove(b.dataset.rd); draw(); }
        });
      });
    };
    draw();
    if (cleaned) HF.toast(cleaned === 1 ? 'Historial: eliminado 1 duplicado' : `Historial: eliminados ${cleaned} duplicados`);
  }

  HF.replays = { init, touch, flush, finish, list, entry, payload, share, play, remove, openHistory, saveCode, setRank, prune };
})(typeof window !== 'undefined' ? window : globalThis);
