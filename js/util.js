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

  HF.settings = () => Object.assign({ sound: true, vibrate: true, grid: true, speed: 1 }, HF.store.get('settings', {}));
  HF.vibrate = ms => { if (HF.settings().vibrate && G.navigator && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) { } };
  let ac = null;
  HF.sfx = kind => {
    if (!HF.settings().sound) return;
    try {
      ac = ac || new (G.AudioContext || G.webkitAudioContext)();
      const T = { click: [[440, .05]], error: [[160, .12]], good: [[520, .06], [660, .08]], win: [[523, .1], [659, .1], [784, .2]], lose: [[300, .15], [200, .3]], star: [[880, .1]] }[kind] || [];
      let t = ac.currentTime;
      for (const [f, d] of T) {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'square'; o.frequency.value = f; g.gain.value = 0.04;
        o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d); t += d;
      }
    } catch (e) { }
  };
})(typeof window !== 'undefined' ? window : globalThis);
