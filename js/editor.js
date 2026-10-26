(function (G) {
  const HF = G.HF, T = HF.T, B = HF.B;

  // Capa 6 compacta: <t><res><b><o><cap> + '0' (sin unidad) o <TIPO><tier><dueño>
  // Ej.: 11201I20 = llano, sin recurso, camino, dueño 1, capital 0, INF N2 de J0.
  const UCODE = { INF: 'I', CAB: 'C', ARC: 'A', SIE: 'S', BAR: 'B' };
  const UFROM = { I: 'INF', C: 'CAB', A: 'ARC', S: 'SIE', B: 'BAR' };
  const tok = c => '' + c.t + c.res + c.b + (c.o < 0 ? 9 : c.o) + (c.cap ? 1 : 0) +
    (c.u && UCODE[c.u.type] ? UCODE[c.u.type] + (Math.max(1, Math.min(9, c.u.tier || 1))) + (c.u.owner >= 0 ? c.u.owner : 0) : '0');
  HF.exportMap = (R, cells, seed) => {
    const list = HF.makeGrid(R).list, parts = [];
    let last = null, n = 0;
    for (const d of list) {
      const t = tok(cells[d.i]);
      if (t === last) n++; else { if (last) parts.push(n + 'x' + last); last = t; n = 1; }
    }
    parts.push(n + 'x' + last);
    return `v1:${R}:${seed || 0}:${btoa(parts.join(','))}`;
  };
  HF.importMap = code => {
    try {
      const [v, Rs, seed, b64] = code.trim().split(':');
      if (v !== 'v1') throw 0;
      const R = +Rs; if (!(R >= 3 && R <= 20)) throw 0;
      const grid = HF.makeGrid(R), cells = grid.cells.map(c => c && HF.newCell(c));
      const toks = [];
      for (const p of atob(b64).split(',')) { const [n, t] = p.split('x'); for (let k = 0; k < +n; k++) toks.push(t); }
      if (toks.length !== grid.list.length) throw 0;
      grid.list.forEach((d, k) => {
        const t = toks[k], c = cells[d.i];
        // Formatos aceptados: 6 dígitos (mapas antiguos, sin unidades) u 8 caracteres
        // con el bloque de unidad Tipo+tier+dueño (p. ej. I20).
        if (/^\d{6}$/.test(t)) {
          c.t = +t[0]; c.res = +t[1]; c.b = +t[2]; c.o = t[3] === '9' ? -1 : +t[3]; c.cap = +t[4];
        } else if (/^\d{5}[ICASB]\d\d$/.test(t)) {
          c.t = +t[0]; c.res = +t[1]; c.b = +t[2]; c.o = t[3] === '9' ? -1 : +t[3]; c.cap = +t[4];
          const type = UFROM[t[5]], tier = +t[6], owner = +t[7];
          if (!type || !(tier >= 1 && tier <= 4) || !(owner >= 0 && owner <= 9)) throw 0;
          c.u = { type, tier, owner, mv: 1, at: 1 };
        } else throw 0;
        if (c.t > 4 || c.b > 7) throw 0;
      });
      return { R, cells, seed: +seed };
    } catch (e) { return { error: 'E04: código de mapa corrupto' }; }
  };
  HF.validateMap = (R, cells) => {
    const grid = HF.makeGrid(R), caps = grid.list.map(d => cells[d.i]).filter(c => c.cap && c.o >= 0);
    if (caps.length < 2) return 'E01: se necesitan al menos 2 capitales';
    if (caps.some(c => c.t === T.MAR || c.t === T.MONTANA)) return 'E02: capital sobre terreno intransitable';
    const seen = new Set([caps[0].i]), q = [caps[0].i];
    while (q.length) { const x = q.pop(); for (const y of grid.nb[x]) if (!seen.has(y) && cells[y].t !== T.MAR && cells[y].t !== T.MONTANA) { seen.add(y); q.push(y); } }
    if (caps.some(c => !seen.has(c.i))) return 'E03: hay capitales desconectadas por tierra';
    return null;
  };

  HF.mapError = (msg, retry) => HF.modal(`<h3>Mapa no válido</h3><p class="neg">${msg}</p><button class="pri" id="x">Entendido</button>`, m => m.querySelector('#x').onclick = HF.closeModal);
  // Valida y arranca una partida con un mapa del editor/guardado. Devuelve false si no es jugable.
  HF.playMap = (R, cells, seed) => {
    const err = HF.validateMap(R, cells);
    if (err) { HF.sfx('error'); HF.mapError(err); return false; }
    const owners = [...new Set(cells.filter(c => c && c.cap && c.o >= 0).map(c => c.o))].sort();
    if (!owners.includes(0)) { HF.sfx('error'); HF.mapError('Falta la capital del jugador (🏙0)'); return false; }
    const remap = {}; owners.forEach((o, k) => remap[o] = k);
    const data = cells.filter(Boolean).map(c => {
      const u = c.u && UCODE[c.u.type] ? Object.assign({}, c.u, {
        owner: remap[c.u.owner] != null ? remap[c.u.owner] : (remap[0] != null ? remap[0] : 0),
        mv: 1, at: 1
      }) : null;
      return { i: c.i, t: c.t, res: c.res, b: c.b, o: c.o >= 0 ? (remap[c.o] != null ? remap[c.o] : -1) : -1, cap: c.cap, u };
    });
    HF.startGame(HF.makeGame({ mode: 'community', seed, size: 'large', n: owners.length, R, biome: 'plains', fog: 'FULL', difficulty: 'normal', goal: { type: 'conquer' }, customCells: data }, HF.loadTribe()));
    return true;
  };
  HF.savedMaps = () => HF.store.get('maps', []);
  HF.mapsModal = (onOpen) => {
    const render = () => {
      const ms = HF.savedMaps();
      HF.modal(`<h3>Mis mapas</h3>${ms.map((m, i) => `<div class="card row"><span class="grow">${HF.esc(m.name)}</span>${onOpen ? '<button data-l="' + i + '">Abrir</button>' : ''}<button class="pri" data-p="${i}">▶</button><button data-d="${i}">🗑</button></div>`).join('') || '<div class="dim">Sin mapas guardados</div>'}<br><button id="x">Cerrar</button>`, m => {
        m.querySelector('#x').onclick = HF.closeModal;
        m.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { const r = HF.importMap(ms[+b.dataset.l].code); if (!r.error) { HF.closeModal(); onOpen(r, ms[+b.dataset.l].name); } });
        m.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { const r = HF.importMap(ms[+b.dataset.p].code); if (r.error) return HF.toast(r.error); HF.closeModal(); HF.playMap(r.R, r.cells, r.seed); });
        m.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { const a = HF.savedMaps(); a.splice(+b.dataset.d, 1); HF.store.set('maps', a); render(); });
      });
    };
    render();
  };

  HF.edIcon = t => {
    if (t[0] === 'b' && t[1] >= 2) { const h = HF.art.html('build', t[1], t[2], 26); return h; }
    if (t[0] === 'u') {
      const tier = String(t[1]).split(':')[1] || 1;
      return `<span class="utool">${t[2]}<small>N${tier}</small></span>`;
    }
    return t[2];
  };

  HF.screen('editor', (el, arg) => {
    const maps = () => HF.store.get('maps', []);
    let R = 7, seed = 1, curName = '', cells = HF.makeGrid(R).cells.map(c => c && HF.newCell(c));
    const blank = () => { cells = HF.makeGrid(R).cells.map(c => c && HF.newCell(c)); curName = ''; };
    let tool = { k: 't', v: 0 }, unitOwner = 0;
    const TOOLS = [
      ['t', 0, '🟩', 'Llano'], ['t', 1, '🟫', 'Colina'], ['t', 2, '⛰', 'Montaña'], ['t', 3, '🌊', 'Río'], ['t', 4, '🟦', 'Mar'],
      ['r', 1, '💰', 'Oro'], ['r', 2, '🌾', 'Trigo'], ['r', 3, '🧱', 'Madera'],
      ['b', 1, '🌲', 'Árbol'], ['b', 2, '🛤', 'Camino'], ['b', 3, '⛺', 'Campamento'], ['b', 4, '🏠', 'Pueblo'], ['b', 5, '🏙', 'Ciudad'], ['b', 6, '🏰', 'Bastión'],
      ['c', 0, '🏙0', 'Capital jugador'], ['c', 1, '🏙1', 'Capital rival 1'], ['c', 2, '🏙2', 'Capital rival 2'], ['c', 3, '🏙3', 'Capital rival 3'],
      ['o', 0, '🚩0', 'Territorio J'], ['o', 1, '🚩1', 'Territorio R1'], ['o', 2, '🚩2', 'Territorio R2'], ['o', 3, '🚩3', 'Territorio R3'],
      ['b', 0, '🚫', 'Quitar edificio'],
      ['f', 0, '👤0', 'Unidades J0'], ['f', 1, '👤1', 'Unidades R1'], ['f', 2, '👤2', 'Unidades R2'], ['f', 3, '👤3', 'Unidades R3'],
      ['u', 'INF:1', '🛡', 'Infantería N1'], ['u', 'INF:2', '🛡', 'Infantería N2'], ['u', 'INF:3', '🛡', 'Infantería N3'],
      ['u', 'CAB:1', '🐎', 'Caballería N1'], ['u', 'CAB:2', '🐎', 'Caballería N2'], ['u', 'CAB:3', '🐎', 'Caballería N3'],
      ['u', 'ARC:1', '🏹', 'Arqueros N1'], ['u', 'ARC:2', '🏹', 'Arqueros N2'], ['u', 'ARC:3', '🏹', 'Arqueros N3'],
      ['u', 'SIE:1', '💣', 'Asedio N1'], ['u', 'SIE:2', '💣', 'Asedio N2'], ['u', 'SIE:3', '💣', 'Asedio N3'],
      ['u', 'BAR:1', '⛵', 'Barco N1'], ['u', 'BAR:2', '⛵', 'Barco N2'], ['u', 'BAR:3', '⛵', 'Barco N3'],
      ['e', 0, '🧽', 'Borrar todo']
    ];
    el.innerHTML = `<div class="screen" style="padding-bottom:0">${HF.header(HF.t('EDITOR_TITLE', 'Editor de mapas'))}
      <div class="tools" id="tools">${TOOLS.map((t, i) => `<button data-i="${i}" title="${t[3]}" class="${i === 0 ? 'sel' : ''}">${HF.edIcon(t)}</button>`).join('')}</div>
      <div class="boardwrap"><canvas id="cv"></canvas><div class="info" id="info">${HF.lang() === 'en' ? 'Tap or drag to paint' : 'Toca o arrastra para pintar'}</div></div>
      <div class="drawer edbar" style="padding-bottom:calc(var(--sab) + 6px)"><button id="size">R${R}</button><button id="gen">${HF.t('EDITOR_RANDOM', '🎲 Aleatorio')}</button><button id="clr">${HF.t('EDITOR_CLEAR', '🧹 Vaciar')}</button><button id="exp">${HF.t('EDITOR_EXPORT', '📤 Exportar')}</button><button id="imp">${HF.t('EDITOR_IMPORT', '📥 Importar')}</button><button id="sav">${HF.t('EDITOR_SAVE', '💾 Guardar')}</button><button id="lst">${HF.t('EDITOR_LOAD', '📂 Abrir')}</button><button id="play" class="pri">${HF.t('EDITOR_PLAY', '▶ Probar')}</button></div></div>`;
    HF.wireBack(el);
    const q = s => el.querySelector(s);
    const board = new HF.Board(q('#cv'), {});
    board.mode = 'paint';
    const fit = () => { board.setMap(R, cells); };
    const paint = i => {
      const c = cells[i], [k, v] = [tool.k, tool.v];
      if (k === 't') {
        c.t = v;
        if (v === T.MAR || v === T.MONTANA) { c.b = 0; c.res = 0; c.o = -1; c.cap = 0; c.u = null; }
      }
      else if (k === 'r') { if (c.t !== T.MAR && c.t !== T.MONTANA) c.res = v; }
      else if (k === 'b') {
        if (c.t === T.MAR || c.t === T.MONTANA) return;
        if (v === 0) { c.b = B.NINGUNO; c.cap = 0; }   // borrar edificio conserva terreno, dueño y unidad
        else if (!c.cap) c.b = v;
      }
      else if (k === 'c') {
        if (c.t === T.MAR || c.t === T.MONTANA) { HF.toast('Terreno intransitable'); return; }
        for (const d of cells) if (d && d.cap && d.o === v) { d.cap = 0; d.b = 0; }
        c.b = B.CIUDAD; c.cap = 1; c.o = v; c.res = 0;
        for (const j of HF.nbs({ R, _grid: HF.makeGrid(R) }, i)) { const n = cells[j]; if (n.t !== T.MAR && n.t !== T.MONTANA && n.o < 0) n.o = v; }
      }
      else if (k === 'o') { if (c.t !== T.MAR && c.t !== T.MONTANA) c.o = c.o === v ? -1 : v; }
      else if (k === 'u') {
        const [type, ts] = String(v).split(':'), tier = Math.max(1, Math.min(3, +ts || 1));
        if (c.t === T.MONTANA) { HF.sfx('error'); return HF.toast('Terreno intransitable'); }
        const water = c.t === T.MAR || c.t === T.RIO;
        if (type === 'BAR' && !water) { HF.sfx('error'); return HF.toast('Los barcos se colocan en agua'); }
        if (type !== 'BAR' && water) { HF.sfx('error'); return HF.toast('Esa unidad es terrestre'); }
        if (c.o >= 0 && c.o !== unitOwner) { HF.sfx('error'); return HF.toast('Ese hexágono pertenece a otra facción'); }
        c.u = { type, tier, owner: unitOwner, mv: 1, at: 1 };
        if (c.o < 0 && type !== 'BAR') c.o = unitOwner;   // los barcos pueden estar en agua neutral
        c.tomb = 0;
      }
      else if (k === 'e') { c.res = 0; c.b = 0; c.o = -1; c.cap = 0; c.u = null; c.tomb = 0; }
      board.draw();
    };
    board.h.onTap = paint; board.h.onPaint = paint;
    board.colors = HF.COLORS;
    q('#tools').querySelectorAll('button').forEach(b => b.onclick = () => {
      const t = TOOLS[+b.dataset.i];
      if (t[0] === 'f') {
        unitOwner = t[1];
        q('#tools').querySelectorAll('button').forEach(x => x.classList.remove('sel')); b.classList.add('sel');
        q('#info').textContent = 'Unidades de J' + unitOwner + ' · elige tipo';
        return;
      }
      tool = { k: t[0], v: t[1] };
      q('#tools').querySelectorAll('button').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); q('#info').textContent = t[3];
    });
    q('#size').onclick = () => { R = R === 7 ? 12 : R === 12 ? 18 : 7; q('#size').textContent = 'R' + R; blank(); fit(); };
    q('#clr').onclick = () => { blank(); fit(); };
    q('#gen').onclick = () => {
      seed = Math.floor(Math.random() * 1e9);
      const m = HF.generateMap({ R, seed, biome: 'plains', factions: 2 }); cells = m.cells; fit();
    };
    q('#exp').onclick = () => {
      const code = HF.exportMap(R, cells, seed);
      HF.modal(`<h3>Código del mapa</h3><textarea readonly id="t">${code}</textarea><br><br><div class="row"><button id="cp">Copiar</button><button id="x" class="pri grow">Cerrar</button></div>`, m => {
        m.querySelector('#cp').onclick = () => { m.querySelector('#t').select(); try { navigator.clipboard.writeText(code); } catch (e) { document.execCommand('copy'); } HF.toast('Copiado'); };
        m.querySelector('#x').onclick = HF.closeModal;
      });
    };
    const doImport = () => HF.modal(`<h3>Importar mapa</h3><textarea id="t" placeholder="v1:7:123:..."></textarea><div id="err" class="neg small"></div><br><div class="row"><button id="no">Cancelar</button><button class="pri grow" id="ok">Cargar</button></div>`, m => {
      m.querySelector('#no').onclick = HF.closeModal;
      m.querySelector('#ok').onclick = () => {
        const r = HF.importMap(m.querySelector('#t').value);
        if (r.error) { m.querySelector('#err').textContent = r.error; HF.sfx('error'); return; }
        R = r.R; cells = r.cells; seed = r.seed; q('#size').textContent = 'R' + R; HF.closeModal(); fit();
      };
    });
    q('#imp').onclick = doImport;
    q('#sav').onclick = () => {
      HF.modal(`<h3>Guardar mapa</h3><input type="text" id="nm" maxlength="30" value="${HF.esc(curName || 'Mapa ' + (maps().length + 1))}"><div class="dim small" id="w" style="margin-top:6px"></div><br><div class="row"><button id="no">Cancelar</button><button class="pri grow" id="ok">Guardar</button></div>`, m => {
        const inp = m.querySelector('#nm'); inp.select();
        const warn = HF.validateMap(R, cells); if (warn) m.querySelector('#w').textContent = 'Aviso: ' + warn + ' (no se podrá jugar hasta corregirlo)';
        m.querySelector('#no').onclick = HF.closeModal;
        m.querySelector('#ok').onclick = () => {
          const name = inp.value.trim() || 'Mapa';
          const ms = maps(), code = HF.exportMap(R, cells, seed), k = ms.findIndex(x => x.name === name);
          if (k >= 0) ms[k].code = code; else ms.push({ name, code });
          HF.store.set('maps', ms); curName = name; HF.closeModal(); HF.toast((k >= 0 ? 'Actualizado: ' : 'Guardado: ') + name, 2500);
        };
      });
    };
    q('#lst').onclick = () => HF.mapsModal((r, name) => { R = r.R; cells = r.cells; seed = r.seed; curName = name; q('#size').textContent = 'R' + R; fit(); });
    q('#play').onclick = () => HF.playMap(R, cells, seed);
    fit();
    if (arg && arg.importFirst) doImport();
  });
})(window);
