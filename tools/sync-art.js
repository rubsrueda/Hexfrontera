#!/usr/bin/env node
/**
 * tools/sync-art.js
 *
 * Genera js/artdata.js incrustando como data URI el arte que debe viajar en el
 * HTML (unidades, edificios, tumba y recursos). El resto (árbol, niebla,
 * carreta y urca) se carga desde art/*.png: son texturas grandes o de capas y
 * así artdata.js no engorda 3,5 MB. Están listadas aquí igualmente para que el
 * pipeline verifique que los archivos existen.
 *
 * Uso:
 *   node tools/sync-art.js           regenera artdata.js (falla si falta arte)
 *   node tools/sync-art.js --check   no escribe: compara y devuelve 2 si difiere
 *   node tools/sync-art.js --all     incrusta también las de archivo (9,2 MB)
 *
 * CRITICAL: nunca emitir Base64 por stdout; todo se escribe en disco.
 * Este script no usa dependencias: Node puro, compatible con Node 18.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ARTE_DIR = path.join(PROJECT_ROOT, 'art');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'js', 'artdata.js');

// embed:true  → data URI dentro de artdata.js
// embed:false → se sirve como art/<archivo> (art.js ya lo resuelve y sw.js lo cachea)
const ASSETS = [
  { key: 'INF', file: 'infanteria.png', embed: true },
  { key: 'ENG', file: 'ingeniero.png', embed: true },
  { key: 'ARC', file: 'arquero.png', embed: true },
  { key: 'CAB', file: 'caballeria.png', embed: true },
  { key: 'SIE', file: 'asedio.png', embed: true },
  { key: 'BAR', file: 'barco.png', embed: true },
  { key: 'build1', file: 'arbol.png', embed: false },
  { key: 'build2', file: 'camino.png', embed: true },
  { key: 'build3', file: 'campamento.png', embed: true },
  { key: 'build4', file: 'pueblo.png', embed: true },
  { key: 'build5', file: 'ciudad.png', embed: true },
  { key: 'build6', file: 'bastion.png', embed: true },
  { key: 'miscfog', file: 'nube.png', embed: false },
  { key: 'misctomb', file: 'tumba.png', embed: true },
  { key: 'resMADERA', file: 'madera.png', embed: true },
  { key: 'resTRIGO', file: 'trigo.png', embed: true },
  { key: 'resORO_MONEDA', file: 'oro_moneda.png', embed: true },
  { key: 'resORO_ROCA', file: 'oro_roca.png', embed: true },
  { key: 'tradecart', file: 'carreta.png', embed: false },
  { key: 'tradeship', file: 'urca.png', embed: false }
];

const HEADER = '/* Imagenes de arte/ ya recortadas, incrustadas para que funcionen tambien desde file:// (sin leer pixeles del canvas). Regenerar si cambian las imagenes. */';

function mimeTypeFor(ext) {
  const e = ext.toLowerCase();
  if (e === '.webp') return 'image/webp';
  if (e === '.jfif' || e === '.jpg' || e === '.jpeg') return 'image/jpeg';
  if (e === '.png') return 'image/png';
  if (e === '.gif') return 'image/gif';
  if (e === '.avif') return 'image/avif';
  return null;
}

function main() {
  const args = process.argv.slice(2);  const check = args.includes('--check');
  const all = args.includes('--all');

  console.log('=== sync-art.js - Ingestion de assets HEXFRONTIER ===');
  console.log('Fuente:  ' + ARTE_DIR);
  console.log('Destino: ' + OUTPUT_FILE + (check ? ' (solo comprobación)' : ''));

  const missing = [];
  const entries = [];

  for (const asset of ASSETS) {
    const fullPath = path.join(ARTE_DIR, asset.file);
    if (!fs.existsSync(fullPath)) {
      console.error('  ! FALTA: ' + asset.file + ' (clave: ' + asset.key + ')');
      missing.push(asset.file);
      continue;
    }
    if (!asset.embed && !all) {
      console.log('  · archivo: ' + asset.file + ' -> ' + asset.key + ' (se sirve desde art/)');
      continue;
    }
    const ext = path.extname(asset.file);
    const mime = mimeTypeFor(ext);
    if (!mime) {
      console.error('  ? Extensión no soportada: ' + asset.file);
      missing.push(asset.file);
      continue;
    }
    const buffer = fs.readFileSync(fullPath);
    entries.push({ key: asset.key, dataUri: 'data:' + mime + ';base64,' + buffer.toString('base64') });
    console.log('  OK: ' + asset.file + ' -> ' + asset.key + ' (' + mime + ', ' + buffer.length + ' bytes)');
  }

  if (missing.length) {
    console.error('--- Faltan ' + missing.length + ' archivo(s) ---');
    for (const m of missing) console.error('  - ' + m);
    process.exit(1);
  }

  const lines = [HEADER, 'HF.ARTDATA = {'];
  entries.forEach((entry, idx) => {
    const comma = idx < entries.length - 1 ? ',' : '';
    lines.push('  "' + entry.key + '": "' + entry.dataUri + '"' + comma);
  });
  lines.push('};', '');
  const content = lines.join('\n');

  if (check) {
    let current = null;
    try { current = fs.readFileSync(OUTPUT_FILE, 'utf8'); } catch (e) { current = null; }
    if (current === content) {
      console.log('En sincronía: ' + entries.length + ' claves incrustadas.');
      process.exit(0);
    }
    console.error('DESINCRONIZADO: artdata.js no coincide con art/. Ejecuta `node tools/sync-art.js`.');
    process.exit(2);
  }

  fs.writeFileSync(OUTPUT_FILE, content, 'utf8');
  console.log('Archivo generado con ' + entries.length + ' claves incrustadas (' +
    (Buffer.byteLength(content) / 1048576).toFixed(2) + ' MB).');
}

// Se ejecuta solo si se invoca directamente: al requerirlo (por ejemplo desde
// tester_qa/validar_artdata.js) únicamente se exporta la tabla canónica.
if (require.main === module) main();

module.exports = { ASSETS, mimeTypeFor };
