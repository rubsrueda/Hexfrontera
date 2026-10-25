/* Arte: carga las imágenes de art/, les quita el fondo de cuadros y las deja listas para el mapa y la interfaz. */
(function () {
  const FILES = {
    unit: { INF: 'piquero', ARC: 'arquero', CAB: 'jinete', SIE: 'asedio', BAR: 'barco' },
    build: { 2: 'camino', 3: 'campamento', 4: 'pueblo', 5: 'ciudad', 6: 'bastion' },
    misc: { fog: 'nube' }
  };
  // textura: se recorta una zona sin la cruz central y se reduce, sin quitar fondo
  const RAW = { nube: { crop: [1090, 0, 318, 768], w: 160 } };
  function rawTile(img, o) {
    const [sx, sy, sw, sh] = o.crop, k = o.w / sw;
    const cv = document.createElement('canvas'); cv.width = o.w; cv.height = Math.round(sh * k);
    cv.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
    return cv;
  }
  const EXT = '.jfif', MAXW = 192;
  const OPTS = { barco: { maxBright: 244, minLight: 185, hull: true } };
  const cache = {}, urls = {}, listeners = [];

  function clean(img, opts) {
    const s = Math.min(1, MAXW / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * s)), h = Math.max(1, Math.round(img.height * s));
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const x = cv.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0, w, h);
    const id = x.getImageData(0, 0, w, h), d = id.data;
    const cap = opts.maxBright || 256, lo = opts.minLight || 145;
    const isBg = p => { const r = d[p], g = d[p + 1], b = d[p + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mn > lo && mx < cap && mx - mn < 36; };
    const seen = new Uint8Array(w * h), st = [];
    const push = (px, py) => { const k = py * w + px; if (!seen[k] && isBg(k * 4)) { seen[k] = 1; st.push(k); } };
    for (let i = 0; i < w; i++) { push(i, 0); push(i, h - 1); }
    for (let j = 0; j < h; j++) { push(0, j); push(w - 1, j); }
    while (st.length) {
      const k = st.pop(), px = k % w, py = (k / w) | 0;
      if (px > 0) push(px - 1, py); if (px < w - 1) push(px + 1, py);
      if (py > 0) push(px, py - 1); if (py < h - 1) push(px, py + 1);
    }
    if (opts.hull) {
      const pts = [];
      for (let k = 0; k < w * h; k++) if (!seen[k]) pts.push([k % w, (k / w) | 0]);
      pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
      const lo2 = [], up = [];
      for (const p of pts) { while (lo2.length > 1 && cr(lo2[lo2.length - 2], lo2[lo2.length - 1], p) <= 0) lo2.pop(); lo2.push(p); }
      for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
      const hull = lo2.slice(0, -1).concat(up.slice(0, -1));
      for (let k = 0; k < w * h; k++) {
        if (!seen[k]) continue;
        const p = [k % w, (k / w) | 0]; let inside = true;
        for (let i = 0; i < hull.length && inside; i++) if (cr(hull[i], hull[(i + 1) % hull.length], p) < 0) inside = false;
        if (inside) { seen[k] = 0; d[k * 4] = 238; d[k * 4 + 1] = 238; d[k * 4 + 2] = 232; }
      }
    }
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    for (let k = 0; k < w * h; k++) {
      if (seen[k]) d[k * 4 + 3] = 0;
      else { const px = k % w, py = (k / w) | 0; if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py; }
    }
    x.putImageData(id, 0, 0);
    if (x1 < x0) return cv;
    const out = document.createElement('canvas'); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
    out.getContext('2d').drawImage(cv, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
    return out;
  }

  function load(kind, key) {
    const name = FILES[kind][key], id = kind + key;
    if (!name || id in cache) return;
    cache[id] = null;
    const img = new Image();
    const emb = HF.ARTDATA && HF.ARTDATA[id];
    if (emb) {
      img.onload = () => { cache[id] = img; urls[id] = emb; listeners.forEach(f => f()); };
      img.onerror = () => { cache[id] = false; };
      img.src = emb;
      return;
    }
    img.onload = () => { try { cache[id] = RAW[name] ? rawTile(img, RAW[name]) : clean(img, OPTS[name] || {}); } catch (e) { cache[id] = false; } listeners.forEach(f => f()); };
    img.onerror = () => { cache[id] = false; };
    img.src = 'art/' + name + EXT;
  }

  HF.art = {
    onLoad(f) { listeners.push(f); },
    get(kind, key) { const id = kind + key; if (!(id in cache)) load(kind, key); return cache[id] || null; },
    /* dibuja la imagen ajustada a un recuadro w×h centrado en (x,y); devuelve false si no hay imagen */
    draw(ctx, kind, key, x, y, w, h) {
      const im = this.get(kind, key); if (!im) return false;
      const k = Math.min(w / im.width, h / im.height);
      ctx.drawImage(im, x - im.width * k / 2, y - im.height * k / 2, im.width * k, im.height * k);
      return true;
    },
    /* etiqueta <img> para botones HTML; cae al emoji mientras carga */
    html(kind, key, fallback, px) {
      const id = kind + key, im = this.get(kind, key);
      if (!im) return fallback;
      if (!urls[id]) urls[id] = im.toDataURL('image/png');
      return `<img class="ico" src="${urls[id]}" alt="" style="height:${px || 28}px">`;
    },
    /* patrón de nubes anclado al mundo (se mueve y escala con la cámara); null si no ha cargado */
    fogPattern(ctx, cam, W, H, scale) {
      const im = this.get('misc', 'fog'); if (!im) return null;
      const p = this._pat || (this._pat = ctx.createPattern(im, 'repeat'));
      if (!p || !p.setTransform) return p;
      const k = cam.z * scale;
      p.setTransform(new DOMMatrix().translate(W / 2 - cam.x * cam.z, H / 2 - cam.y * cam.z).scale(k));
      return p;
    },
    preload() { for (const k in FILES) for (const key in FILES[k]) load(k, key); }
  };
})();
