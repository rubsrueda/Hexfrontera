#!/usr/bin/env node
/**
 * tools/build.mjs — Build de producción de Federati (web).
 *
 * Qué hace:
 *   1. Lee index.html para conocer el ORDEN exacto de scripts y hojas de estilo.
 *   2. Minifica + ofusca cada JS con javascript-obfuscator (renameGlobals:false,
 *      porque los archivos comparten window.HF y se cargan en orden).
 *   3. Minifica el CSS.
 *   4. Copia sólo los assets que el juego usa (nada de originales ni backups).
 *   5. Verifica que NO haya secretos de servidor en el resultado.
 *
 * Uso:
 *   node tools/build.mjs              build de producción (ofuscado)
 *   node tools/build.mjs --no-obfuscate   sólo minificado (para depurar)
 *   node tools/build.mjs --out dist
 *
 * Requiere: npm i -D esbuild javascript-obfuscator
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import JavaScriptObfuscator from 'javascript-obfuscator';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const argv = process.argv.slice(2);
const flag = name => argv.includes('--' + name);
const optValue = (name, dflt) => {
  const hit = argv.find(a => a.startsWith('--' + name + '='));
  return hit ? hit.split('=')[1] : dflt;
};

const OUT = path.resolve(ROOT, optValue('out', 'dist'));
const OBFUSCATE = !flag('no-obfuscate');

// ---------------------------------------------------------------------------
// 1. Inventario desde index.html (fuente de verdad del orden de carga)
// ---------------------------------------------------------------------------
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m => m[1]);
const styles = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map(m => m[1]);

if (!scripts.length) {
  console.error('ERROR: index.html no declara scripts.');
  process.exit(1);
}

// Assets que el juego necesita en producción. Los originales de alta resolución
// y cualquier material de trabajo deben vivir FUERA del repositorio público.
const STATIC_FILES = [
  'manifest.json', 'icon.svg', 'sw.js'
];
const STATIC_DIRS = [
  'art', 'assets', 'fonts'
];
// Dentro de art/ no se publican carpetas de trabajo.
const SKIP = /(^|[\\/])(old|old[_-].*|backup|\.git)([\\/]|$)/i;

// ---------------------------------------------------------------------------
// 2. Utilidades
// ---------------------------------------------------------------------------
let copied = 0, bytesIn = 0, bytesOut = 0;

function ensure(dir) { fs.mkdirSync(dir, { recursive: true }); }

function copyFile(rel) {
  const src = path.join(ROOT, rel);
  if (!fs.existsSync(src) || !fs.statSync(src).isFile()) return false;
  const dst = path.join(OUT, rel);
  ensure(path.dirname(dst));
  fs.copyFileSync(src, dst);
  copied++;
  return true;
}

function copyDir(rel) {
  const src = path.join(ROOT, rel);
  if (!fs.existsSync(src)) return;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const childRel = path.join(rel, entry.name);
    if (SKIP.test(childRel)) continue;
    if (entry.isDirectory()) copyDir(childRel);
    else copyFile(childRel);
  }
}

// ---------------------------------------------------------------------------
// 3. Limpiar salida
// ---------------------------------------------------------------------------
fs.rmSync(OUT, { recursive: true, force: true });
ensure(OUT);

// ---------------------------------------------------------------------------
// 4. JS: minificar (+ ofuscar)
// ---------------------------------------------------------------------------
const OBF_OPTIONS = {
  compact: true,
  target: 'browser',
  // renameGlobals DEBE ser false: los archivos colaboran vía window.HF.
  renameGlobals: false,
  identifierNamesGenerator: 'hexadecimal',
  stringArray: true,
  stringArrayThreshold: 0.6,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  splitStrings: false,
  controlFlowFlattening: false,   // coste alto en el bucle de render
  deadCodeInjection: false,
  selfDefending: false,
  debugProtection: false,
  disableConsoleOutput: false,    // se conservan los logs de diagnóstico
  sourceMap: false,
  unicodeEscapeSequence: false
};

const jsReport = [];
// Datos puros (sprites en base64): se minifican pero NO se ofuscan. Ofuscarlos
// multiplicaría el tamaño y el tiempo de build sin proteger nada relevante.
const SKIP_OBF = [/artdata\.js$/i];

for (const rel of scripts) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    console.error('ERROR: falta el script declarado en index.html: ' + rel);
    process.exit(1);
  }
  const code = fs.readFileSync(abs, 'utf8');
  bytesIn += code.length;

  // 4.1 minificado (esbuild: rápido y seguro con sintaxis moderna)
  const min = await esbuild.transform(code, {
    minify: true,
    target: ['es2019'],
    legalComments: 'none',
    charset: 'utf8'
  });

  // 4.2 ofuscado (encima del minificado)
  let out = min.code;
  const skipObf = SKIP_OBF.some(re => re.test(rel));
  if (OBFUSCATE && !skipObf) {
    out = JavaScriptObfuscator.obfuscate(out, OBF_OPTIONS).getObfuscatedCode();
  }

  const dst = path.join(OUT, rel);
  ensure(path.dirname(dst));
  fs.writeFileSync(dst, out, 'utf8');
  bytesOut += out.length;
  jsReport.push({ rel, from: code.length, to: out.length, obfuscated: OBFUSCATE && !skipObf });
}

// ---------------------------------------------------------------------------
// 5. CSS: minificar
// ---------------------------------------------------------------------------
for (const rel of styles) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    console.error('ERROR: falta la hoja declarada en index.html: ' + rel);
    process.exit(1);
  }
  const css = fs.readFileSync(abs, 'utf8');
  bytesIn += css.length;
  const min = await esbuild.transform(css, { loader: 'css', minify: true, charset: 'utf8' });
  const dst = path.join(OUT, rel);
  ensure(path.dirname(dst));
  fs.writeFileSync(dst, min.code, 'utf8');
  bytesOut += min.code.length;
}

// ---------------------------------------------------------------------------
// 6. HTML + estáticos + assets
// ---------------------------------------------------------------------------
const buildStamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
let outHtml = html;
if (!/name="hf-build"/.test(outHtml)) {
  outHtml = outHtml.replace('</head>', `<meta name="hf-build" content="${buildStamp}">\n</head>`);
} else {
  outHtml = outHtml.replace(/name="hf-build" content="[^"]*"/, `name="hf-build" content="${buildStamp}"`);
}
fs.writeFileSync(path.join(OUT, 'index.html'), outHtml, 'utf8');

STATIC_FILES.forEach(f => copyFile(f));
STATIC_DIRS.forEach(d => copyDir(d));

// ---------------------------------------------------------------------------
// 7. Auditoría de secretos: la service_role JAMÁS puede acabar en dist/
// ---------------------------------------------------------------------------
const FORBIDDEN = [
  /service_role/i,
  /sb_secret_[A-Za-z0-9_-]{8,}/,
  /SUPABASE_SERVICE_ROLE_KEY/,
  /postgres(ql)?:\/\/[^"\s]+:[^"\s]+@/i
];

function scan(dir) {
  const hits = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) { hits.push(...scan(p)); continue; }
    if (!/\.(js|css|html|json|txt|svg)$/i.test(entry.name)) continue;
    const text = fs.readFileSync(p, 'utf8');
    for (const re of FORBIDDEN) {
      if (re.test(text)) hits.push({ file: path.relative(OUT, p), re: String(re) });
    }
  }
  return hits;
}
const leaks = scan(OUT);

// ---------------------------------------------------------------------------
// 8. Informe
// ---------------------------------------------------------------------------
const kb = n => (n / 1024).toFixed(1) + ' kB';
console.log('=== Federati build ===');
console.log('salida      : ' + path.relative(ROOT, OUT));
console.log('ofuscación  : ' + (OBFUSCATE ? 'ON (javascript-obfuscator)' : 'OFF (--no-obfuscate)'));
console.log('scripts     : ' + jsReport.length + ' · css: ' + styles.length + ' · copiados: ' + copied);
console.log('js  original: ' + kb(bytesIn) + ' → producción: ' + kb(bytesOut));
console.log('build       : ' + buildStamp);
if (leaks.length) {
  console.error('\n✗ SECRETOS DETECTADOS EN EL BUILD:');
  leaks.forEach(l => console.error('  - ' + l.file + '  (' + l.re + ')'));
  process.exit(2);
}
console.log('secretos    : OK (sin service_role, sin cadenas de conexión)');
