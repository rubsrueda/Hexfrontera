#!/usr/bin/env node
/**
 * tester_qa/run_all.js
 *
 * Ejecuta toda la batería `tester_qa/*_test.js` en procesos aislados y
 * devuelve un código de salida agregado. Sin dependencias: sirve igual en
 * local y en el runner de CI (Node 18+).
 *
 * Uso:
 *   node tester_qa/run_all.js               ejecuta todo
 *   node tester_qa/run_all.js --list        solo lista los archivos
 *   node tester_qa/run_all.js --filter=art  filtra por nombre
 *   node tester_qa/run_all.js --verbose     muestra la salida de todos
 *   node tester_qa/run_all.js --timeout=60000
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const DIR = __dirname;
const ROOT = path.resolve(DIR, '..');
const args = process.argv.slice(2);
const opt = name => {
  const hit = args.find(a => a === '--' + name || a.startsWith('--' + name + '='));
  if (!hit) return null;
  const parts = hit.split('=');
  return parts.length > 1 ? parts[1] : true;
};
const filter = String(opt('filter') || '');
const timeout = Number(opt('timeout') || 120000);
const verbose = !!opt('verbose');
const listOnly = !!opt('list');

const files = fs.readdirSync(DIR)
  .filter(f => /_test\.js$/.test(f))
  .filter(f => !filter || f.indexOf(filter) >= 0)
  .sort();

if (!files.length) {
  console.error('No hay pruebas que ejecutar' + (filter ? ' con filtro "' + filter + '"' : ''));
  process.exit(1);
}
if (listOnly) { for (const f of files) console.log(f); process.exit(0); }

const rows = [];
let failed = 0;

console.log('=== Hexfrontier QA · ' + files.length + ' suites · Node ' + process.version + ' ===');
for (const file of files) {
  const started = Date.now();
  const res = spawnSync(process.execPath, [path.join(DIR, file)], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: timeout,
    env: Object.assign({}, process.env, { HF_CI: '1' })
  });
  const ms = Date.now() - started;
  const out = (res.stdout || '') + (res.stderr || '');
  const timedOut = res.error && res.error.code === 'ETIMEDOUT';
  const crashed = !!res.error && !timedOut;
  const explicitFail = /CON FALLOS/.test(out);
  const pass = !timedOut && !crashed && res.status === 0 && !explicitFail;

  if (!pass || verbose) {
    console.log('\n--- ' + file + ' ---');
    process.stdout.write(out.trimEnd() + '\n');
    if (timedOut) console.log('(tiempo agotado tras ' + timeout + ' ms)');
    if (crashed) console.log('(no se pudo lanzar: ' + res.error.message + ')');
  }
  console.log((pass ? 'ok   ' : 'FAIL ') + file.padEnd(28) + String(ms + ' ms').padStart(8));
  rows.push({ file, pass, ms });
  if (!pass) failed++;
}

const total = rows.reduce((a, r) => a + r.ms, 0);
console.log('-------------------------------------------------------------');
console.log((files.length - failed) + '/' + files.length + ' suites OK · ' + (total / 1000).toFixed(1) + ' s');
if (failed) {
  console.error('Suites con fallos: ' + rows.filter(r => !r.pass).map(r => r.file).join(', '));
}
process.exit(failed ? 1 : 0);
