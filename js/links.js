/* ===========================================================================
 * links.js — Enlaces cortos de mapa (Federati)
 * ---------------------------------------------------------------------------
 * Una partida de escaramuza es determinista: con estos datos se reconstruye el
 * mapa idéntico sin base de datos.
 *
 *     semilla (30 bits) + tamaño (3) + bioma (4) + facciones (5) + niebla (3)
 *     + dificultad (3)  =  ~40 bits
 *
 * Se empaqueta con radix mixto, se le añade una firma de 5 bits (detecta ~97%
 * de las erratas) y se escribe en Base32 estilo Crockford (sin I, L, O, U para
 * no confundirlas con 1, 1, 0, V). Resultado: 9 caracteres.
 *
 *     https://federati.org/?seed=7K2M9QXAB
 *
 * Sin red, sin filas en la nube y sin códigos de 400 caracteres.
 * =========================================================================== */
(function (G) {
  var HF = G.HF = G.HF || {};

  // Crockford Base32: sin I, L, O, U.
  var ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  var BASE = ALPHABET.length;            // 32
  var CHARS = 9;                         // 45 bits
  var PAYLOAD_BITS = 40;
  var SEED_BITS = 30;
  var SEED_MAX = Math.pow(2, SEED_BITS); // 1 073 741 824

  var FOG = ['FULL', 'EXPLORED', 'NONE'];
  var DIFF = ['easy', 'normal', 'hard'];

  // Índices estables a partir de las claves de configuración (orden de CFG).
  function sizeKeys() { return Object.keys(HF.SIZES || { small: 1, medium: 1, large: 1 }); }
  function biomeKeys() { return Object.keys(HF.BIOMES || { plains: 1, forest: 1, archipelago: 1, mountains: 1 }); }
  function idxOf(list, value, dflt) {
    var i = list.indexOf(value);
    return i < 0 ? (dflt || 0) : i;
  }
  function clamped(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // ---------- firma de 5 bits (CRC-5, detecta erratas) ----------
  // Polinomio x^5 + x^2 + 1 (0x05) sobre los 40 bits del payload, MSB primero.
  // Un carácter del token son 5 bits contiguos, así que cualquier errata de un
  // carácter es una ráfaga de longitud <= 5 y el CRC la detecta siempre.
  function signature(payload) {
    var crc = 0x1F;                       // init todo a 1
    for (var i = PAYLOAD_BITS - 1; i >= 0; i--) {
      var bit = Math.floor(payload / Math.pow(2, i)) % 2;
      var top = (crc >> 4) & 1;
      crc = (crc << 1) & 0x1F;
      if (top ^ bit) crc ^= 0x05;
    }
    return crc & 0x1F;
  }

  // ---------- codificación ----------
  /** Empaqueta una spec de partida en 40 bits. */
  function pack(spec) {
    spec = spec || {};
    var seed = (Number(spec.seed) >>> 0) % SEED_MAX;
    var v = seed;
    v = v * 3 + idxOf(sizeKeys(), spec.size);                 // 3 tamaños
    v = v * 4 + idxOf(biomeKeys(), spec.biome);               // 4 biomas
    v = v * 5 + clamped((Number(spec.n) | 0) - 2, 0, 4);      // 2..6 facciones
    v = v * 3 + idxOf(FOG, spec.fog);                         // 3 nieblas
    v = v * 3 + idxOf(DIFF, spec.difficulty);                 // 3 dificultades
    return v;
  }

  /** Desempaqueta 40 bits en una spec. */
  function unpack(v) {
    var diffI = v % 3; v = (v - diffI) / 3;
    var fogI = v % 3; v = (v - fogI) / 3;
    var nI = v % 5; v = (v - nI) / 5;
    var biomeI = v % 4; v = (v - biomeI) / 4;
    var sizeI = v % 3; v = (v - sizeI) / 3;
    var seed = v;
    var sk = sizeKeys(), bk = biomeKeys();
    return {
      seed: seed >>> 0,
      size: sk[sizeI] || 'small',
      biome: bk[biomeI] || 'plains',
      n: nI + 2,
      fog: FOG[fogI] || 'FULL',
      difficulty: DIFF[diffI] || 'normal'
    };
  }

  /** Spec → token de 9 caracteres. */
  function encode(spec) {
    var payload = pack(spec);
    var value = payload + signature(payload) * Math.pow(2, PAYLOAD_BITS);
    var out = '';
    for (var i = 0; i < CHARS; i++) {
      out += ALPHABET.charAt(value % BASE);
      value = Math.floor(value / BASE);
    }
    return out;
  }

  /** Normaliza lo que escribe el usuario: mayúsculas y alias I/L→1, O→0. */
  function normalize(token) {
    return String(token || '')
      .toUpperCase()
      .replace(/[\s\-_]/g, '')
      .replace(/[IL]/g, '1')
      .replace(/O/g, '0')
      .replace(/U/g, 'V');
  }

  /** Token → spec, o null si no es válido (longitud, alfabeto o firma). */
  function decode(token) {
    var t = normalize(token);
    if (t.length !== CHARS) return null;
    var value = 0;
    for (var i = CHARS - 1; i >= 0; i--) {
      var d = ALPHABET.indexOf(t.charAt(i));
      if (d < 0) return null;
      value = value * BASE + d;
    }
    var payload = value % Math.pow(2, PAYLOAD_BITS);
    var sig = Math.floor(value / Math.pow(2, PAYLOAD_BITS));
    if (sig !== signature(payload)) return null;
    return unpack(payload);
  }

  /** Token a partir de una partida viva (g). */
  function fromGame(g) {
    if (!g) return null;
    var sizes = sizeKeys(), size = 'medium';
    for (var i = 0; i < sizes.length; i++) {
      if (HF.SIZES[sizes[i]].R === g.R) { size = sizes[i]; break; }
    }
    return {
      seed: g.seed >>> 0,
      size: size,
      biome: g.biome,
      n: (g.f && g.f.length) || 2,
      fog: g.fog,
      difficulty: g.difficulty
    };
  }

  /** URL corta lista para compartir. Devuelve '' si no hay dominio público. */
  function url(spec) {
    var token = encode(spec);
    if (HF.shareUrl) return HF.shareUrl('seed', token);
    var base = HF.shareBase ? HF.shareBase() : '';
    return base ? base + '?seed=' + token : '';
  }
  function urlFromGame(g) {
    var spec = fromGame(g);
    return spec ? url(spec) : '';
  }

  /** ¿La URL actual trae un enlace de semilla? Devuelve la spec o null. */
  function fromUrl() {
    var loc = G.location || {};
    var search = String(loc.search || '');
    var hash = String(loc.hash || '');
    var m = /[?&](?:seed|s)=([A-Za-z0-9_-]{6,20})/.exec(search) ||
            /^#(?:seed|s)=([A-Za-z0-9_-]{6,20})$/.exec(hash);
    if (!m) return null;
    return decode(m[1]);
  }

  // ---------------------------------------------------------------------------
  // Enlaces cortos de mapas del editor: federati.org/?m=X9K2A
  // El código se resuelve contra la nube (sql/short_links.sql).
  // ---------------------------------------------------------------------------
  function shortMapFromUrl() {
    var loc = G.location || {};
    var search = String(loc.search || '');
    var hash = String(loc.hash || '');
    var m = /[?&](?:m|mapa)=([A-Za-z0-9]{4,10})/.exec(search) ||
            /^#(?:m|mapa)=([A-Za-z0-9]{4,10})$/.exec(hash);
    return m ? normalize(m[1]) : null;
  }
  function shortMapUrl(code) {
    var c = normalize(code);
    if (!c) return '';
    if (HF.shareUrl) return HF.shareUrl('m', c);
    var base = HF.shareBase ? HF.shareBase() : '';
    return base ? base + '?m=' + c : '';
  }

  HF.links = {
    ALPHABET: ALPHABET,
    CHARS: CHARS,
    encode: encode,
    decode: decode,
    pack: pack,
    unpack: unpack,
    normalize: normalize,
    fromGame: fromGame,
    url: url,
    urlFromGame: urlFromGame,
    fromUrl: fromUrl,
    shortMapFromUrl: shortMapFromUrl,
    shortMapUrl: shortMapUrl,
    signature: signature
  };
})(window);
