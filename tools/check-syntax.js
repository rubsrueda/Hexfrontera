#!/usr/bin/env node
/**
 * tools/check-syntax.js
 *
 * Guardián de la arquitectura de "shell único con scripts globales":
 *   1. Todo <script src="js/..."> de index.html existe en disco.
 *   2. Todo js/*.js está referenciado en index.html (nada huérfano).
 *   3. No hay scripts duplicados en el shell (se cargarían dos veces).
 *   4. Todo script referenciado está en la lista de caché de sw.js.
 *   5. Todos los JS compilan (vm.Script compila sin ejecutar).
 *
 * Uso: node tools/check-syntax.js
 * Salida: 0 si todo está bien; 1 con la lista de problemas.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const INDEX = path.join(ROOT, 'index.html');
const JS_DIR = path.join(ROOT, 'js');
const SW = path.join(ROOT, 'sw.js');

const problems = [];
const warn = msg => console.warn('  ! ' + msg);

function main() {
  if (!fs.existsSync(INDEX)) return fail('No existe index.html en ' + ROOT);

  const html = fs.readFileSync(INDEX, 'utf8');
  const refs = [];
  const dup = new Set();
  const scriptRe = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = scriptRe.exec(html))) {
    const src = m[1];
    if (/^https?:|^\/\//i.test(src)) { warn('script remoto no permitido: ' + src); problems.push('script remoto: ' + src); continue; }
    if (refs.indexOf(src) >= 0) dup.add(src); else refs.push(src);
  }
  if (!refs.length) problems.push('index.html no carga ningún script');
  for (const d of dup) problems.push('script duplicado en index.html: ' + d);

  // 1 y 5: existen y compilan (también los js/*.js no referenciados).
  const onDisk = fs.readdirSync(JS_DIR).filter(f => f.endsWith('.js')).sort();
  const referenced = new Set(refs.map(r => path.basename(r)));
  for (const f of onDisk) {
    const rel = 'js/' + f;
    const abs = path.join(JS_DIR, f);
    try {
      const src = fs.readFileSync(abs, 'utf8');
      new vm.Script(src, { filename: rel });     // compila, no ejecuta
    } catch (e) {
      problems.push('error de sintaxis en ' + rel + ': ' + e.message);
    }
    // 2: huérfano
    if (!referenced.has(f)) problems.push('js/' + f + ' no está cargado por index.html (¿script huérfano?)');
  }
  for (const r of refs) {
    if (!fs.existsSync(path.join(ROOT, r))) problems.push('index.html referencia un archivo inexistente: ' + r);
  }

  // 4: cobertura del service worker
  if (!fs.existsSync(SW)) {
    warn('no hay sw.js: se omite la comprobación de caché');
  } else {
    const sw = fs.readFileSync(SW, 'utf8');
    const cached = new Set();
    // Los scripts pueden vivir en subcarpetas (js/ui/components/...).
    const cacheRe = /["'](js\/(?:[\w.-]+\/)*[\w.-]+\.js)["']/g;
    while ((m = cacheRe.exec(sw))) cached.add(m[1]);
    const missing = refs.filter(r => /^js\//.test(r) && !cached.has(r));
    for (const r of missing) problems.push('sw.js no cachea ' + r + ' (quedaría sin soporte offline)');
  }

  if (problems.length) return fail(problems.length + ' problema(s) de integridad');
  console.log('Shell OK: ' + refs.length + ' scripts compilados, todos referenciados y cacheados (' +
    onDisk.length + ' archivos en js/).');
}

function fail(msg) {
  console.error('check-syntax: ' + msg);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}

main();
