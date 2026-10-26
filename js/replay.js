(function (G) {
  const HF = G.HF;
  const b64 = s => (typeof G.btoa === 'function' ? G.btoa(s) : Buffer.from(s, 'binary').toString('base64'));
  const unb64 = s => (typeof G.atob === 'function' ? G.atob(s) : Buffer.from(s, 'base64').toString('binary'));
  const url64 = s => s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  const pack = s => url64(b64(unescape(encodeURIComponent(s))));
  const unpack = s => {
    let x = String(s || '').replace(/-/g, '+').replace(/_/g, '/');
    while (x.length % 4) x += '=';
    return decodeURIComponent(escape(unb64(x)));
  };
  const bytes64 = u8 => {
    let s = '';
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return url64(b64(s));
  };
  const unbytes64 = s => {
    let x = String(s || '').replace(/-/g, '+').replace(/_/g, '/');
    while (x.length % 4) x += '=';
    const bin = unb64(x), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  };

  // Estado mínimo y reproducible de una partida. Las tribus incluyen sus rutas
  // de credo para que newGame recompile exactamente los mismos tags.
  HF.replayPayload = g => ({
    v: 1,
    setup: {
      mode: g.mode, seed: g.seed, R: g.R, biome: g.biome, fog: g.fog, difficulty: g.difficulty,
      goal: g.goal, meta: g.meta, startRes: g.startRes, customCells: g._customCells || null,
      factions: g.f.map(f => ({
        name: f.name, color: f.color, crest: f.crest, human: f.human,
        tags: f.tags, alma_path: f.alma_path, arma_path: f.arma_path, victoria_path: f.victoria_path
      }))
    },
    log: (g.replayLog || []).slice()
  });
  // JSON + deflate-raw cuando el navegador lo permite (links de ~1 KB en vez
  // de varios KB); prefijo 'z'. Fallback JSON base64 con prefijo 'j'.
  HF.encodeReplay = async function (payload) {
    const json = JSON.stringify(payload);
    try {
      if (typeof G.CompressionStream === 'function' && typeof G.DecompressionStream === 'function' && typeof G.Blob === 'function' && typeof G.Response === 'function') {
        const stream = new G.Blob([json]).stream().pipeThrough(new G.CompressionStream('deflate'));
        const buf = await new G.Response(stream).arrayBuffer();
        return 'z' + bytes64(new Uint8Array(buf));
      }
    } catch (e) { }
    return 'j' + pack(json);
  };
  HF.decodeReplay = async function (code) {
    code = String(code || '');
    let json;
    if (code[0] === 'z') {
      const bytes = unbytes64(code.slice(1));
      const stream = new G.Blob([bytes]).stream().pipeThrough(new G.DecompressionStream('deflate'));
      json = await new G.Response(stream).text();
    } else if (code[0] === 'j') {
      json = unpack(code.slice(1));
    } else {
      json = unpack(code);   // enlaces antiguos sin prefijo
    }
    const p = JSON.parse(json);
    if (!p || p.v !== 1 || !p.setup || !Array.isArray(p.log)) throw new Error('Repetición no válida');
    return p;
  };

  HF.playReplayFromCode = async function (code) {
    try { HF.playReplay(await HF.decodeReplay(code)); }
    catch (e) { console.error(e); HF.go('hub'); HF.toast('Repetición no válida'); }
  };

  HF.replayCodePrompt = function () {
    HF.modal(`<h3>🎬 Ver repetición</h3><p class="dim small">Pega el código o el enlace completo que te compartieron.</p>
      <textarea id="repInput" placeholder="#replay=… o https://…#replay=…" style="min-height:90px"></textarea>
      <div id="repErr" class="neg small"></div><br>
      <div class="row"><button id="repNo">Cancelar</button><button id="repGo" class="pri grow">Reproducir</button></div>`, m => {
      m.querySelector('#repNo').onclick = HF.closeModal;
      m.querySelector('#repGo').onclick = () => {
        const raw = m.querySelector('#repInput').value.trim();
        const code = raw.includes('#replay=') ? raw.split('#replay=').pop() : raw;
        if (!code) { m.querySelector('#repErr').textContent = 'Pega un código o enlace.'; return; }
        HF.closeModal(); HF.playReplayFromCode(code);
      };
    });
  };

  HF.playReplay = function (payload) {
    HF.closeModal();
    if (HF.onLeave) { HF.onLeave(); HF.onLeave = null; }
    if (HF.bgm) HF.bgm.stop();
    let g;
    try {
      g = HF.newGame(Object.assign({}, payload.setup, { isReplay: true }));
    } catch (e) {
      console.error(e); HF.go('hub'); HF.toast('No se pudo reconstruir la repetición'); return;
    }
    // Vista de ajedrez: ambos bandos visibles.
    g.fog = 'NONE'; g.fogMap = null; HF.updateFog(g);
    const el = HF.$('#app');
    el.innerHTML = `<div class="screen game replay">
      <div class="hud-top"><span style="font-size:16px">${HF.t('REPLAY_TITLE')}</span><span id="repTurn">T1</span><button id="repExit">${HF.t('REPLAY_EXIT')}</button></div>
      <div class="boardwrap"><canvas id="cv"></canvas><div class="info" id="info"></div></div>
      <div class="hud-bot replay-controls">
        <button id="repReset">⏮</button><button id="repPlayPause" class="pri">⏸</button><button id="repStep">⏩</button>
        <button id="repSpeed">2x</button><div class="grow small dim" id="repCounter">${HF.t('REPLAY_ACTION')} 0 / ${payload.log.length}</div>
      </div></div>`;
    const q = s => el.querySelector(s);
    const board = new HF.Board(q('#cv'), {});
    board.colors = g.f.map(f => f.color); board.game = g; board.mode = 'play'; board.viewMode = 'normal';
    board.bubbles = []; board.cells = g.cells; board.R = g.R; board.fogMap = null;
    board.fit(); board.startAnim();
    HF.onLeave = () => { board.stopAnim(); if (HF.bgm) HF.bgm.stop(); };
    const repTurn = q('#repTurn'), repCounter = q('#repCounter'), playBtn = q('#repPlayPause'), speedBtn = q('#repSpeed');
    const log = payload.log || [];
    const SPEEDS = [['1x', 300], ['2x', 150], ['4x', 60]];
    let cursor = 0, timer = 0, speed = 1, playing = true, done = false;
    const render = () => {
      board.cells = g.cells; board.R = g.R; board.fogMap = null;
      board.draw();
      repTurn.textContent = 'T' + g.turn + (g.f[g.cur] ? ' · ' + g.f[g.cur].crest : '');
      repCounter.textContent = `${HF.t('REPLAY_ACTION')} ${cursor} / ${log.length}`;
      playBtn.textContent = playing ? '⏸' : '▶';
      speedBtn.textContent = SPEEDS[speed][0];
    };
    const apply = t => {
      let r = { ok: true };
      if (t[0] === 1) r = HF.act(g, t[1], t[2], t[3] || undefined);
      else if (t[0] === 2) r = HF.build(g, t[1], t[2]);
      else if (t[0] === 3) r = HF.recruit(g, t[1], t[2], t[3], t[4]);
      else if (t[0] === 4) { HF.replayPhase(g, t[1]); }
      else if (t[0] === 5) r = HF.loan(g, t[1]);
      if (r && !r.ok) throw new Error(r.msg || 'acción no válida');
    };
    const stopTimer = () => { if (timer) { clearInterval(timer); timer = 0; } };
    const finish = () => {
      if (done) return; done = true; playing = false; stopTimer(); render();
      HF.modal(`<h3 style="text-align:center">🏆 Partida Concluida</h3>
        <p style="text-align:center">La repetición terminó en el turno <b>${g.turn}</b>${g.over ? (g.over.won ? ' · Victoria de ' + HF.esc(g.f[0].name) : ' · Derrota') : ''}.</p>
        <div class="row"><button id="btnReplayRestart">🔄 Repetir</button><button id="btnPlayThisMap" class="pri grow">⚔️ ¿Puedes superarlo? Jugar este mapa</button></div>`, m => {
        m.querySelector('#btnReplayRestart').onclick = () => HF.playReplay(payload);
        m.querySelector('#btnPlayThisMap').onclick = () => {
          HF.closeModal();
          try { history.replaceState(null, '', location.pathname); } catch (e) { }
          const setup = Object.assign({}, payload.setup, { mode: 'skirmish', isReplay: false });
          try { HF.startGame(HF.newGame(setup)); } catch (e) { console.error(e); HF.go('hub'); }
        };
      });
    };
    const stepOnce = () => {
      if (done) return;
      if (cursor >= log.length) return finish();
      const t = log[cursor++];
      try { apply(t); }
      catch (e) { console.error('Replay', e); playing = false; stopTimer(); HF.toast('Repetición detenida: ' + e.message); render(); return; }
      HF.sfx('click');
      render();
      if (cursor >= log.length) finish();
    };
    const pulse = () => { if (!playing || done) return; stepOnce(); };
    const schedule = () => {
      stopTimer(); if (!playing || done) return;
      timer = setInterval(pulse, SPEEDS[speed][1]);
    };
    playBtn.onclick = () => { if (done) return; playing = !playing; render(); schedule(); };
    q('#repStep').onclick = () => { if (done) return; playing = false; stopTimer(); stepOnce(); render(); };
    speedBtn.onclick = () => { speed = (speed + 1) % SPEEDS.length; render(); schedule(); };
    q('#repReset').onclick = () => HF.playReplay(payload);
    q('#repExit').onclick = () => {
      stopTimer(); if (HF.onLeave) { HF.onLeave(); HF.onLeave = null; }
      try { history.replaceState(null, '', location.pathname); } catch (e) { }
      HF.go('hub');
    };
    render();
    schedule();
  };
})(typeof window !== 'undefined' ? window : globalThis);
