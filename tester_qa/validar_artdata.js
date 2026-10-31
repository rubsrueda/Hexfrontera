/* Script de validación estática QA para js/artdata.js
   Uso: node tester_qa/validar_artdata.js
   Verifica: sintaxis, conteo de claves (12), formato Data URI, y que las claves
   coinciden con el mapeo esperado de art.js FILES. */
const fs = require('fs');
const path = require('path');

const ARTDATA_PATH = path.join(__dirname, '..', 'js', 'artdata.js');

// --- Claves esperadas (deben coincidir con art.js FILES: kind+key) ---
const EXPECTED_KEYS = [
  'unitINF', 'unitENG', 'unitARC', 'unitCAB', 'unitSIE', 'unitBAR',
  'build2', 'build3', 'build4', 'build5', 'build6',
  'miscfog'
];

const EXPECTED_KEY_SET = new Set(EXPECTED_KEYS);

let errors = [];
let warnings = [];
let passes = [];

function logPass(msg) { passes.push('  [PASS] ' + msg); }
function logFail(msg) { errors.push('  [FAIL] ' + msg); }
function logWarn(msg) { warnings.push('  [WARN] ' + msg); }

// ── 1. Existencia del archivo ──
if (!fs.existsSync(ARTDATA_PATH)) {
  logFail('js/artdata.js NO EXISTE en disco');
  console.log(formatReport());
  process.exit(1);
}
logPass('js/artdata.js existe en disco');

const content = fs.readFileSync(ARTDATA_PATH, 'utf8');

// ── 2. Sintaxis: verificar con new Function ──
// Envolvemos en una función que recibe HF como parámetro y ejecuta el archivo.
// Esto valida que el JS es sintácticamente correcto y que HF.ARTDATA se asigna.
let syntaxOk = true;
let syntaxError = '';
try {
  // El archivo contiene: HF.ARTDATA = { ... };
  // new Function compila sin ejecutar — si hay error de sintaxis, lanza.
  new Function('HF', content);
  logPass('Sintaxis válida (compilación con new Function)');
} catch (e) {
  syntaxOk = false;
  syntaxError = e.message;
  logFail('Error de sintaxis: ' + e.message);
}

// ── 3. Verificar que contiene "HF.ARTDATA = {" al inicio (después del comentario) ──
const trimmed = content.replace(/^\/\*.*?\*\/\s*/s, '').trim();
if (/^HF\.ARTDATA\s*=\s*\{/.test(trimmed)) {
  logPass('Comienza con HF.ARTDATA = {');
} else {
  logFail('No comienza con HF.ARTDATA = { — comienza con: ' + trimmed.slice(0, 60));
}

// ── 4. Verificar que termina con }; ──
const endTrimmed = content.trim();
if (/};\s*$/.test(endTrimmed)) {
  logPass('Termina con };');
} else {
  logFail('No termina con }; — termina con: ' + endTrimmed.slice(-60));
}

// ── 5. Extraer claves ──
// Regex: "clave":  (clave = alfanumérica)
const keyRegex = /"(\w+)":\s*"/g;
let keys = [];
let m;
while ((m = keyRegex.exec(content)) !== null) {
  keys.push(m[1]);
}

if (keys.length === 12) {
  logPass('Contador de claves: 12 (correcto)');
} else {
  logFail('Contador de claves: ' + keys.length + ' (esperadas 12)');
}

// ── 6. Verificar que todas las claves esperadas están presentes ──
const missing = EXPECTED_KEYS.filter(k => !keys.includes(k));
const extra = keys.filter(k => !EXPECTED_KEY_SET.has(k));

if (missing.length === 0) {
  logPass('Todas las 12 claves esperadas están presentes');
} else {
  logFail('Claves FALTANTES: ' + missing.join(', '));
}

if (extra.length === 0) {
  logPass('No hay claves extra inesperadas');
} else {
  logFail('Claves EXTRA inesperadas: ' + extra.join(', '));
}

// ── 7. Verificar no hay duplicados ──
const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
if (dupes.length === 0) {
  logPass('No hay claves duplicadas');
} else {
  logFail('Claves DUPLICADAS: ' + [...new Set(dupes)].join(', '));
}

// ── 8. Validar cada Data URI ──
if (syntaxOk) {
  // Ejecutar en un sandbox virtual para extraer HF.ARTDATA
  let artdata;
  try {
    const HF = { ARTDATA: {} };
    // Crear una función que ejecute el contenido con HF en scope
    const fn = new Function('HF', content);
    fn(HF);
    artdata = HF.ARTDATA;
  } catch (e) {
    logFail('Error al ejecutar artdata.js en sandbox: ' + e.message);
    artdata = null;
  }

  if (artdata) {
    let badUris = 0;
    for (const [key, val] of Object.entries(artdata)) {
      if (typeof val !== 'string') {
        logFail('Valor de "' + key + '" no es string: ' + typeof val);
        badUris++;
        continue;
      }
      if (!val.startsWith('data:image/')) {
        logFail('"' + key + '" no comienza con "data:image/"');
        badUris++;
        continue;
      }
      if (!val.includes(';base64,')) {
        logFail('"' + key + '" no contiene ";base64,"');
        badUris++;
        continue;
      }
      // Extraer la parte base64 y validar decodificación
      const b64Match = val.match(/;base64,(.+)$/);
      if (!b64Match) {
        logFail('"' + key + '" no tiene datos base64 después de ";base64,"');
        badUris++;
        continue;
      }
      const b64 = b64Match[1];
      // Validar que sea base64 decodable
      try {
        // En Node: validar que el base64 decodea a algo
        const decoded = Buffer.from(b64, 'base64');
        if (decoded.length === 0) {
          logFail('"' + key + '" base64 decodifica a 0 bytes');
          badUris++;
          continue;
        }
        // Verificar magic bytes de WebP (RIFF....WEBP)
        if (decoded.length >= 12 && decoded.slice(0, 4).toString() === 'RIFF' && decoded.slice(8, 12).toString() === 'WEBP') {
          logPass('"' + key + '" → Data URI WebP válido (' + decoded.length + ' bytes)');
        } else {
          // No es WebP pero podría ser otro formato de imagen — verificar magic bytes
          const header = decoded.slice(0, 4);
          const hex = header.toString('hex');
          if (hex === '89504e47') { // PNG
            logPass('"' + key + '" → Data URI PNG válido (' + decoded.length + ' bytes)');
          } else if (hex === 'ffd8ff') { // JPEG
            logPass('"' + key + '" → Data URI JPEG válido (' + decoded.length + ' bytes)');
          } else if (val.startsWith('data:image/svg+xml')) {
            logPass('"' + key + '" → Data URI SVG válido (' + decoded.length + ' bytes)');
          } else {
            logWarn('"' + key + '" → base64 decodable (' + decoded.length + ' bytes) pero formato de imagen no reconocido (header hex: ' + hex + ')');
          }
        }
      } catch (e) {
        logFail('"' + key + '" no se pudo decodificar: ' + e.message);
        badUris++;
      }
    }
    if (badUris === 0) {
      logPass('Todas las Data URIs son válidas y decodificables');
    } else {
      logFail(badUris + ' Data URI(s) tienen errores');
    }
  }
} else {
  logFail('Saltando validación de Data URIs por error de sintaxis');
}

// ── Reporte ──
function formatReport() {
  let r = '\n═══ REPORTE DE VALIDACIÓN ARTDATA.JS ═══\n\n';
  r += 'Archivo: js/artdata.js\n';
  r += 'Tamaño: ' + content.length + ' bytes\n';
  r += 'Claves encontradas: ' + keys.length + '\n';
  r += 'Claves: ' + keys.join(', ') + '\n\n';

  r += '-- PASS --\n';
  r += passes.map(p => p + '\n').join('');

  if (warnings.length > 0) {
    r += '\n-- WARNINGS --\n';
    r += warnings.map(w => w + '\n').join('');
  }

  if (errors.length > 0) {
    r += '\n-- FAIL --\n';
    r += errors.map(e => e + '\n').join('');
  }

  r += '\n═══ RESUMEN ═══\n';
  r += 'PASS: ' + passes.length + '\n';
  r += 'FAIL: ' + errors.length + '\n';
  r += 'WARN: ' + warnings.length + '\n';
  r += 'Resultado: ' + (errors.length === 0 ? '✅ PASS' : '❌ FAIL') + '\n';

  return r;
}

console.log(formatReport());
process.exit(errors.length === 0 ? 0 : 1);
