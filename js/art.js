/* Arte: carga las imagenes de art/, las deja listas para el mapa y la interfaz. */
(function () {
  const FILES = {
    unit: { INF: 'infanteria', ENG: 'ingeniero', ARC: 'arquero', CAB: 'caballeria', SIE: 'asedio', BAR: 'barco' },
    build: { 1: 'arbol', 2: 'camino', 3: 'campamento', 4: 'pueblo', 5: 'ciudad', 6: 'bastion' },
    misc: { fog: 'nube', tomb: 'tumba' },
    resource: { resMADERA: 'madera', resTRIGO: 'trigo', resORO_MONEDA: 'oro_moneda', resORO_ROCA: 'oro_roca' }
  };
  // textura: se recorta una zona sin la cruz central y se reduce, sin quitar fondo
  const RAW = { nube: { crop: [1090, 0, 318, 768], w: 160 } };
  function rawTile(img, o) {
    const [sx, sy, sw, sh] = o.crop, k = o.w / sw;
    const cv = document.createElement('canvas'); cv.width = o.w; cv.height = Math.round(sh * k);
    cv.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
    return cv;
  }
  const EXT = '.png';
  // Tope de memoria de las texturas. OJO: solo reduce, nunca amplia
  // (Math.min(1, ...)). El tamaño en pantalla lo fija board.js con UNIT_BOX,
  // BUILD_BOX y el suelo de recursos, no este valor.
  const MAXW = 2048;
  const OPTS = {
    // El arte del proyecto ya viene con fondo transparente y encuadre comun:
    // se respeta tal cual. Solo los recursos se recortan a su contenido para
    // poder cubrir el hexagono completo como suelo.
    madera: { trim: true },
    trigo: { trim: true },
    oro_moneda: { trim: true },
    oro_roca: { trim: true },
    // Material opaco heredado: si alguna imagen llega sin canal alfa se le
    // quita el fondo claro por difusion desde los bordes.
    camino: { maxBright: 250, minLight: 160 },
    campamento: { maxBright: 250, minLight: 160 },
    pueblo: { maxBright: 250, minLight: 160 },
    ciudad: { maxBright: 250, minLight: 160 },
    bastion: { maxBright: 250, minLight: 160 },
    tumba: { maxBright: 250, minLight: 160 }
  };
  const cache = {}, urls = {}, listeners = [];

  // Reduce al tope de memoria conservando el encuadre original.
  function scaled(img) {
    const s = Math.min(1, MAXW / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * s)), h = Math.max(1, Math.round(img.height * s));
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    cv.getContext('2d').drawImage(img, 0, 0, w, h);
    return cv;
  }

  // ¿La imagen ya trae fondo transparente? Se muestrea el alfa (1 de cada 16 px).
  function hasAlpha(cv) {
    try {
      const data = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, cv.width, cv.height).data;
      let clear = 0, total = 0;
      for (let k = 3; k < data.length; k += 64) { total++; if (data[k] < 250) clear++; }
      return total > 0 && clear / total > 0.02;
    } catch (e) { return false; }
  }

  // Recorta el canvas al contenido visible (alfa) sin deformarlo.
  function trim(cv) {
    try {
      const x = cv.getContext('2d', { willReadFrequently: true });
      const data = x.getImageData(0, 0, cv.width, cv.height).data;
      let x0 = cv.width, y0 = cv.height, x1 = -1, y1 = -1;
      for (let py = 0, k = 3; py < cv.height; py++) {
        for (let px = 0; px < cv.width; px++, k += 4) {
          if (data[k] <= 18) continue;
          if (px < x0) x0 = px; if (px > x1) x1 = px;
          if (py < y0) y0 = py; if (py > y1) y1 = py;
        }
      }
      if (x1 < x0 || y1 < y0) return cv;
      if (x0 === 0 && y0 === 0 && x1 === cv.width - 1 && y1 === cv.height - 1) return cv;
      const out = document.createElement('canvas');
      out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
      out.getContext('2d').drawImage(cv, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
      return out;
    } catch (e) { return cv; }
  }

  // Quita el fondo claro de imagenes opacas (difusion desde bordes + esquinas).
  function keyOut(cv, opts) {
    const x = cv.getContext('2d', { willReadFrequently: true });
    const w = cv.width, h = cv.height;
    const id = x.getImageData(0, 0, w, h); const px = id.data;

    // Detect background color from corners (assumes uniform background)
    const corners = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]];
    let bgR = 0, bgG = 0, bgB = 0, validCorners = 0;
    for (const [cx, cy] of corners) {
      const idx = (cy * w + cx) * 4;
      const r = px[idx], g = px[idx + 1], b = px[idx + 2], a = px[idx + 3];
      if (a > 128) { bgR += r; bgG += g; bgB += b; validCorners++; }
    }
    if (validCorners > 0) { bgR /= validCorners; bgG /= validCorners; bgB /= validCorners; }

    const cap = opts.maxBright || 256, lo = opts.minLight || 145;
    const isBg = p => {
      const r = px[p], g = px[p + 1], b = px[p + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      const nearWhite = mn > lo && mx < cap && mx - mn < 36;
      const nearCornerBg = validCorners > 0 && Math.abs(r - bgR) < 30 && Math.abs(g - bgG) < 30 && Math.abs(b - bgB) < 30;
      return nearWhite || nearCornerBg;
    };

    const seen = new Uint8Array(w * h), st = [];
    const push = (qx, qy) => { const k = qy * w + qx; if (!seen[k] && isBg(k * 4)) { seen[k] = 1; st.push(k); } };
    for (let i = 0; i < w; i++) { push(i, 0); push(i, h - 1); }
    for (let j = 0; j < h; j++) { push(0, j); push(w - 1, j); }
    // Also sample corners more aggressively
    const cornerSample = Math.min(15, Math.floor(Math.min(w, h) * 0.1));
    for (let cx = 0; cx < cornerSample; cx++) {
      for (let cy = 0; cy < cornerSample; cy++) {
        push(cx, cy); push(w - 1 - cx, cy); push(cx, h - 1 - cy); push(w - 1 - cx, h - 1 - cy);
      }
    }
    while (st.length) {
      const k = st.pop(), qx = k % w, qy = (k / w) | 0;
      if (qx > 0) push(qx - 1, qy); if (qx < w - 1) push(qx + 1, qy);
      if (qy > 0) push(qx, qy - 1); if (qy < h - 1) push(qx, qy + 1);
    }
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    let transparentCount = 0;
    for (let k = 0; k < w * h; k++) {
      if (seen[k]) { px[k * 4 + 3] = 0; transparentCount++; }
      else { const qx = k % w, qy = (k / w) | 0; if (qx < x0) x0 = qx; if (qx > x1) x1 = qx; if (qy < y0) y0 = qy; if (qy > y1) y1 = qy; }
    }
    x.putImageData(id, 0, 0);
    // If very few pixels were made transparent, background removal likely failed
    // Fall back to simple center-crop (assume subject is in center)
    if (transparentCount < (w * h * 0.05)) {
      console.warn('art: keyOut removed very few pixels, using center crop fallback', { w, h, transparentCount });
      const marginX = Math.floor(w * 0.15);
      const marginY = Math.floor(h * 0.15);
      x0 = marginX; y0 = marginY; x1 = w - marginX - 1; y1 = h - marginY - 1;
    }
    if (x1 < x0) { x0 = 0; y0 = 0; x1 = w - 1; y1 = h - 1; }
    const out = document.createElement('canvas'); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
    out.getContext('2d').drawImage(cv, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
    return out;
  }

  // Deja la imagen lista: las que ya traen alfa se respetan (el recorte por
  // color les comia bordes y el "center crop" cortaba cabezas, lanzas y bases).
  function prepare(img, opts) {
    opts = opts || {};
    try {
      const cv = scaled(img);
      if (hasAlpha(cv)) return opts.trim ? trim(cv) : cv;
      return keyOut(cv, opts);
    } catch (e) {
      console.warn('art: prepare() failed', e);
      return scaled(img);
    }
  }

  function load(kind, key) {
    const name = FILES[kind][key], id = kind + key;
    if (!name || id in cache) return;
    cache[id] = null;
    const img = new Image();
    // Las claves de ART DATA no siguen todas el mismo patron: unidades y
    // recursos usan la clave corta (INF, resMADERA) y edificios/niebla/tumba
    // la clave con prefijo (build2, miscfog). Antes solo se probaba kind+key,
    // asi que el arte incrustado nunca se usaba.
    const emb = (HF.ARTDATA && (HF.ARTDATA[key] || HF.ARTDATA[id])) || null;
    const done = () => { listeners.forEach(f => f()); };
    // Misma preparacion venga del data URI incrustado o del archivo art/*.png.
    const process = () => {
      try { cache[id] = RAW[name] ? rawTile(img, RAW[name]) : prepare(img, OPTS[name] || {}); }
      catch (e) { console.error(`[art] error loading ${id}:`, e); cache[id] = false; }
      done();
    };
    if (emb) {
      img.onload = process;
      img.onerror = () => { console.error(`[art] failed to load embedded ${id}`); cache[id] = false; };
      img.src = emb;
      return;
    }
    img.onload = process;
    img.onerror = () => { console.error(`[art] failed to load file ${id}`); cache[id] = false; };
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
    /* como draw(), pero multiplica la altura por sy dejando fija la base del
       dibujo. Sirve para compensar el aplastado del tablero inclinado. */
    drawStretched(ctx, kind, key, x, y, w, h, sy) {
      const im = this.get(kind, key); if (!im) return false;
      const k = Math.min(w / im.width, h / im.height);
      const dw = im.width * k, dh = im.height * k;
      const s = sy || 1;
      ctx.drawImage(im, x - dw / 2, y + dh / 2 - dh * s, dw, dh * s);
      return true;
    },
    /* dibuja la imagen cubriendo todo el recuadro w×h (recorta lo que sobra). Se usa
       para el suelo de recursos: la imagen llena el hexagono de borde a borde. */
    cover(ctx, kind, key, x, y, w, h) {
      const im = this.get(kind, key); if (!im) return false;
      const k = Math.max(w / im.width, h / im.height);
      const dw = im.width * k, dh = im.height * k;
      ctx.drawImage(im, x - dw / 2, y - dh / 2, dw, dh);
      return true;
    },
    /* etiqueta <img> para botones HTML; cae al emoji mientras carga */
    html(kind, key, fallback, px) {
      const id = kind + key, im = this.get(kind, key);
      if (!im) return fallback;
      if (!(id in urls)) {
        // Generar el icono nunca puede romper un cajón o una pantalla: si el
        // canvas no permite exportar (p. ej. contaminado) se usa el archivo
        // original o, en ultimo caso, el emoji.
        try { urls[id] = trim(im).toDataURL('image/png'); }
        catch (e) {
          const name = FILES[kind] && FILES[kind][key];
          console.warn('[art] no se pudo exportar el icono de ' + id, e);
          urls[id] = name ? 'art/' + name + EXT : null;
        }
      }
      const src = urls[id];
      if (!src) return fallback;
      return `<img class="ico" src="${src}" alt="" style="height:${px || 28}px">`;
    },
    /* patrón de nubes anclado al mundo (se mueve y escala con la cámara); null si no ha cargado */
    fogPattern(ctx, cam, W, H, scale, tilt) {
      const im = this.get('misc', 'fog'); if (!im) return null;
      const p = this._pat || (this._pat = ctx.createPattern(im, 'repeat'));
      if (!p || !p.setTransform) return p;
      const k = cam.z * scale, ty = (tilt || 1);
      p.setTransform(new DOMMatrix().translate(W / 2 - cam.x * cam.z, H / 2 - cam.y * cam.z * ty).scale(k, k * ty));
      return p;
    },
    preload() { for (const k in FILES) for (const key in FILES[k]) load(k, key); }
  };
})();
