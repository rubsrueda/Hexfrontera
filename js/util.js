(function (G) {
  const HF = G.HF = G.HF || {};

  HF.rng = function (seed) {
    let s = seed >>> 0;
    const f = () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.get = () => s;
    f.set = v => { s = v >>> 0; };
    f.int = n => Math.floor(f() * n);
    f.pick = a => a[Math.floor(f() * a.length)];
    return f;
  };

  function hash(x, y, seed) {
    let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function vnoise(x, y, seed) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed), c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  HF.fbm = function (x, y, seed, oct) {
    let a = 0.5, f = 1, s = 0, n = 0;
    for (let i = 0; i < (oct || 4); i++) { s += a * vnoise(x * f, y * f, seed + i * 17); n += a; a *= 0.5; f *= 2; }
    return s / n;
  };

  HF.DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  HF.makeGrid = function (R) {
    const W = 2 * R + 1, cells = new Array(W * W).fill(null), list = [];
    const idx = (q, r) => (q + R) * W + (r + R);
    for (let q = -R; q <= R; q++) for (let r = -R; r <= R; r++) {
      if (Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) > R) continue;
      const c = { i: idx(q, r), q, r };
      cells[c.i] = c; list.push(c);
    }
    const nb = {};
    for (const c of list) {
      nb[c.i] = [];
      for (const d of HF.DIRS) {
        const n = cells[idx(c.q + d[0], c.r + d[1])];
        if (n && Math.max(Math.abs(c.q + d[0]), Math.abs(c.r + d[1]), Math.abs(c.q + c.r + d[0] + d[1])) <= R) nb[c.i].push(n.i);
      }
    }
    return { R, W, cells, list, nb, idx };
  };
  HF.hexDist = (a, b) => Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(a.q + a.r - b.q - b.r));
  HF.circleCount = R => 3 * R * R + 3 * R + 1;

  const mem = {};
  let ls = null;
  try { ls = G.localStorage; ls.setItem('hf__t', '1'); ls.removeItem('hf__t'); } catch (e) { ls = null; }
  HF.store = {
    get(k, d) {
      try { const v = ls ? ls.getItem('hf_' + k) : mem['hf_' + k]; return v == null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set(k, o) { const v = JSON.stringify(o); if (ls) { try { ls.setItem('hf_' + k, v); } catch (e) { return false; } } else mem['hf_' + k] = v; return true; },
    del(k) { if (ls) ls.removeItem('hf_' + k); else delete mem['hf_' + k]; },
    has(k) { return ls ? ls.getItem('hf_' + k) != null : ('hf_' + k) in mem; },
    atomicSave(k, o) {
      const v = JSON.stringify(o);
      try {
        this.set(k + '_tmp', o);
        JSON.parse(v);
        this.set(k, o);
        this.del(k + '_tmp');
        return true;
      } catch (e) { return false; }
    },
    recover(k) {
      if (!this.has(k + '_tmp')) return;
      try {
        const raw = ls ? ls.getItem('hf_' + k + '_tmp') : mem['hf_' + k + '_tmp'];
        const o = JSON.parse(raw);
        if (o && typeof o === 'object') this.set(k, o);
      } catch (e) { /* tmp corrupto: se descarta */ }
      this.del(k + '_tmp');
    }
  };

  HF.settings = () => Object.assign({ sound: true, vibrate: true, grid: true, speed: 1, lang: 'es' }, HF.store.get('settings', {}));
  HF.vibrate = ms => { if (HF.settings().vibrate && G.navigator && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) { } };
  let ac = null;
  // Crea o reanuda el AudioContext. Las políticas de autoplay lo dejan en
  // 'suspended' hasta que se invoca dentro de un gesto del usuario.
  function audioCtx() {
    try {
      if (!ac) ac = new (G.AudioContext || G.webkitAudioContext)();
      if (ac && (ac.state === 'suspended' || ac.state === 'interrupted') && ac.resume) {
        const p = ac.resume();
        if (p && p.catch) p.catch(() => { });
      }
      return ac;
    } catch (e) { return null; }
  }
  // Desbloqueo global de primer gesto (iOS Safari / Chrome Android). Se registra
  // en captura para que el contexto ya esté en marcha cuando corra el handler.
  let audioReady = false;
  function unlockAudio() {
    if (audioReady) return;
    try {
      const a = audioCtx();
      if (!a) return;
      // buffer mudo de 1 frame: algunos navegadores necesitan un source real
      const b = a.createBuffer(1, 1, a.sampleRate || 22050);
      const s = a.createBufferSource();
      s.buffer = b; s.connect(a.destination); s.start(0);
      audioReady = true;
    } catch (e) { }
  }
  HF.unlockAudio = unlockAudio;
  if (G.addEventListener) {
    for (const ev of ['pointerdown', 'touchstart', 'keydown']) {
      try { G.addEventListener(ev, unlockAudio, { once: true, capture: true, passive: true }); } catch (e) { }
    }
  }
  // también sobre document (algunos WebViews no propagan el primer gesto al window)
  if (G.document && G.document.addEventListener) {
    for (const ev of ['pointerdown', 'touchstart']) {
      try { G.document.addEventListener(ev, unlockAudio, { once: true, capture: true, passive: true }); } catch (e) { }
    }
  }
  // ---------- música ambiental procedural ----------
  // Progresión pentatónica lenta con delay; se activa durante la partida.
  let bgmOn = false, bgmTimer = 0, bgmNext = 0, bgmStep = 0, bgmTension = false;
  let bgmMaster = null, bgmCtx = null;
  const BGM_ROOTS = [45, 48, 43, 50];   // A2, C3, G2, D3
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function bgmEnsure() {
    const a = audioCtx();
    if (!a) return null;
    bgmCtx = a;
    if (!bgmMaster) {
      try {
        bgmMaster = a.createGain();
        bgmMaster.gain.value = 0;
        const delay = a.createDelay(1);
        delay.delayTime.value = .32;
        const fb = a.createGain(); fb.gain.value = .22;
        const wet = a.createGain(); wet.gain.value = .18;
        bgmMaster.connect(a.destination);
        bgmMaster.connect(delay);
        delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(a.destination);
      } catch (e) { bgmMaster = null; return null; }
    }
    return a;
  }
  function bgmNote(a, freq, t, dur, type, vol) {
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(.0001, t);
    g.gain.linearRampToValueAtTime(vol || .4, t + Math.min(.8, dur * .35));
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(bgmMaster);
    o.start(t); o.stop(t + dur + .05);
  }
  function bgmSchedule() {
    if (!bgmOn || !HF.settings().sound) return;
    const a = bgmEnsure();
    if (!a || a.state !== 'running' || !bgmMaster) return;
    try { bgmMaster.gain.setTargetAtTime(.02, a.currentTime, .35); } catch (e) { }
    const now = a.currentTime;
    if (bgmNext < now + .05) bgmNext = now + .05;
    while (bgmNext < now + 1.6) {
      const t = bgmNext, step = bgmStep++;
      const root = BGM_ROOTS[step % BGM_ROOTS.length];
      const dur = bgmTension ? 1.8 : 2.8;
      bgmNote(a, mtof(root), t, dur, 'sine', .42);
      bgmNote(a, mtof(root + 7), t + .08, dur * .9, 'triangle', .22);
      bgmNote(a, mtof(root + 12), t + .16, dur * .8, 'sine', .14);
      if (step % 4 === 3) bgmNote(a, mtof(root + 3), t + .4, dur * .55, 'triangle', .12);
      if (bgmTension) {
        bgmNote(a, mtof(root - 12), t, .55, 'sine', .55);
        bgmNote(a, mtof(root - 12), t + .9, .45, 'triangle', .3);
      }
      bgmNext += dur;
    }
  }
  function bgmTimerStart() {
    if (bgmTimer) return;
    bgmTimer = G.setInterval(bgmSchedule, 250);
    bgmSchedule();
  }
  function bgmSilence() {
    if (bgmTimer) { G.clearInterval(bgmTimer); bgmTimer = 0; }
    bgmNext = 0;   // al reactivar, la siguiente frase entra de inmediato
    if (bgmMaster && bgmCtx && bgmCtx.state === 'running') {
      try { bgmMaster.gain.setTargetAtTime(0, bgmCtx.currentTime, .25); } catch (e) { }
    }
  }
  function bgmRefresh() {
    if (!bgmOn || !HF.settings().sound) { bgmSilence(); return; }
    const a = bgmEnsure();
    if (!a) { bgmTimerStart(); return; }   // el desbloqueo creará el contexto y el timer reintentará
    if (a.state !== 'running') { bgmTimerStart(); return; }   // el desbloqueo la pondrá en marcha
    try { bgmMaster.gain.setTargetAtTime(.02, a.currentTime, .4); } catch (e) { }
    bgmTimerStart();
  }
  function threatNearCapital(g) {
    const B = HF.B;
    if (!g || !g.cells || !HF.nbs || !B) return false;
    for (const c of g.cells) {
      if (!c || c.o !== 0 || !c.cap || c.b !== B.CIUDAD) continue;
      for (const j of HF.nbs(g, c.i)) {
        const n = g.cells[j];
        if (n && n.u && n.u.owner !== 0) return true;
      }
    }
    return false;
  }
  HF.bgm = {
    start() { bgmOn = true; bgmRefresh(); },
    stop() { bgmOn = false; bgmSilence(); },
    refresh: bgmRefresh,
    update(g) { bgmTension = threatNearCapital(g); if (bgmOn) bgmRefresh(); },
    tension: () => bgmTension,
    playing: () => bgmOn
  };
  HF.sfx = kind => {
    if (!HF.settings().sound) return;
    try {
      const a = audioCtx();
      if (!a) return;
      const T = { click: [[440, .05]], error: [[160, .12]], good: [[520, .06], [660, .08]], win: [[523, .1], [659, .1], [784, .2]], lose: [[300, .15], [200, .3]], star: [[880, .1]] }[kind] || [];
      let t = a.currentTime;
      for (const [f, d] of T) {
        const o = a.createOscillator(), g = a.createGain();
        o.type = 'square'; o.frequency.value = f; g.gain.value = 0.04;
        o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d); t += d;
      }
    } catch (e) { }
  };
})(typeof window !== 'undefined' ? window : globalThis);
