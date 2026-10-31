#!/usr/bin/env node
/**
 * tools/sync-art.js
 *
 * Lee los archivos .jfif de la carpeta art/ y genera js/artdata.js con
 * Data URIs incrustados, permitiendo la ejecucion offline bajo file://
 * sin bloqueos de CORS en el canvas.
 *
 * Uso:  node tools/sync-art.js
 *
 * CRITICAL: Nunca procesar ni emitir cadenas Base64 en stdout.
 * Todo se escribe directamente al archivo js/artdata.js en disco.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ARTE_DIR = path.join(PROJECT_ROOT, 'art');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'js', 'artdata.js');

// Mapeo de claves canonicas -> archivos en art/
// Proporcionado por el Arquitecto
// Mapeo actualizado con 17 claves (6 unidades + 5 edificios + 1 niebla + 4 recursos UI + 1 tumba)
const ASSET_MAP = [
  ["INF", "infanteria.png"],
  ["ENG", "ingeniero.png"],
  ["ARC", "arquero.png"],
  ["CAB", "caballeria.png"],
  ["SIE", "asedio.png"],
  ["BAR", "barco.png"],
  ["build1", "arbol.png"],
  ["build2", "camino.png"],
  ["build3", "campamento.png"],
  ["build4", "pueblo.png"],
  ["build5", "ciudad.png"],
  ["build6", "bastion.png"],
  ["miscfog", "nube.png"],
  ["misctomb", "tumba.png"],
  ["resMADERA", "madera.png"],
  ["resTRIGO", "trigo.png"],
  ["resORO_MONEDA", "oro_moneda.png"],
  ["resORO_ROCA", "oro_roca.png"]
];

function main() {
  const entries = [];
  for (const [key, filename] of ASSET_MAP) {
    const fullPath = path.join(ARTE_DIR, filename);
    if (!fs.existsSync(fullPath)) {
      console.error("FALTA: " + filename + " (clave: " + key + ")");
      continue;
    }
    const buf = fs.readFileSync(fullPath);
    const b64 = buf.toString("base64");
    entries.push('  "' + key + '": "data:image/jpeg;base64,' + b64 + '"');
    console.log("OK: " + filename + " -> " + key);
  }
  const content = '/* Imagenes incrustadas para funcionamiento offline file:// */\nHF.ARTDATA = {\n' + entries.join(",\n") + '\n};\n';
  fs.writeFileSync(OUTPUT_FILE, content, "utf8");
  console.log("Generado: " + OUTPUT_FILE + " (" + entries.length + " claves)");
}

main();

function mimeTypeFor(ext) {
  const e = ext.toLowerCase();
  if (e === '.webp') return 'image/webp';
  if (e === '.jfif' || e === '.jpg' || e === '.jpeg') return 'image/jpeg';
  if (e === '.png') return 'image/png';
  if (e === '.gif') return 'image/gif';
  if (e === '.avif') return 'image/avif';
  return null;
}

console.log('=== sync-art.js - Ingestion de assets HEXFRONTIER ===');
console.log('Fuente: ' + ARTE_DIR);
console.log('Destino: ' + OUTPUT_FILE);
console.log('----------------------------------------');

const entries = [];
const missing = [];

for (const [key, filename] of ASSET_MAP) {
  const fullPath = path.join(ARTE_DIR, filename);

  if (!fs.existsSync(fullPath)) {
    console.error('  ! FALTA: ' + filename + ' (clave: ' + key + ')');
    missing.push({ key: key, filename: filename });
    continue;
  }

  const ext = path.extname(filename);
  const mime = mimeTypeFor(ext);

  if (!mime) {
    console.error('  ? Ext. no soportada: ' + filename + ' (clave: ' + key + ')');
    missing.push({ key: key, filename: filename, reason: 'extension no soportada' });
    continue;
  }

  const buffer = fs.readFileSync(fullPath);
  const base64 = buffer.toString('base64');
  const dataUri = 'data:' + mime + ';base64,' + base64;

  entries.push({ key: key, dataUri: dataUri });
  console.log('  OK: ' + filename + ' -> ' + key + ' (' + mime + ', ' + buffer.length + ' bytes)');
}

console.log('----------------------------------------');

// Generar el archivo artdata.js
const lines = [];
lines.push('/* Imagenes de arte/ ya recortadas, incrustadas para que funcionen tambien desde file:// (sin leer pixeles del canvas). Regenerar si cambian las imagenes. */');
lines.push('HF.ARTDATA = {');

entries.forEach(function(entry, idx) {
  const comma = idx < entries.length - 1 ? ',' : '';
  lines.push('  "' + entry.key + '": "' + entry.dataUri + '"' + comma);
});

lines.push('};');
lines.push('');

const content = lines.join('\n');
fs.writeFileSync(OUTPUT_FILE, content, 'utf8');

console.log('Archivo generado: ' + OUTPUT_FILE);
console.log('Entradas escritas: ' + entries.length);
if (missing.length > 0) {
  console.log('Entradas faltantes: ' + missing.length);
  console.log('--- Archivos faltantes ---');
  for (const m of missing) {
    const reason = m.reason ? ' (' + m.reason + ')' : '';
    console.log('  - ' + m.filename + ' [clave: ' + m.key + ']' + reason);
  }
  process.exit(2);
}

console.log('Sincronizacion completada exitosamente.');
