#!/usr/bin/env node
/* Extrae cadenas visibles que el filtro "solo español" dejó fuera
 * (kickers en mayúsculas, fragmentos sin acentos, nombres del diario...).
 * Salida: D:\Agente\_gen\delta_es.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JS = path.join(ROOT, 'js');
const require = createRequire(path.join(ROOT, 'package.json'));
const acorn = require(path.join(ROOT, 'node_modules/.pnpm/acorn@8.15.0/node_modules/acorn/dist/acorn.js'));

const SKIP = new Set(['i18n.js', 'artdata.js', 'banter_data.js', 'names.js', 'event-feedback-langs.js',
  'replay-caster-langs.js', 'data.js', 'config.js', 'lore-data.js', 'music.js', 'telemetry.js',
  'security.js', 'platform.js', 'i18n_new_keys.json']);
const CODE = /^(https?:|\/|\.\/|#|data:|--)|\.(js|css|png|webp|json|svg|mp3|wav|m4a)$|console\.|HF\.|=>|querySelector|addEventListener|innerHTML|classList|document\.|localStorage|undefined|null|https?:|SQL|PostgREST|^[A-Z0-9_]+$|^[\w$.-]+$|^[.#][\w-]+/i;

function push(set, raw) {
  if (typeof raw !== 'string') return;
  let s = raw.replace(/\s+/g, ' ').trim();
  if (!s || s.length < 3 || s.length > 120) return;
  if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑ]{3}/.test(s)) return;
  if (CODE.test(s)) return;
  if (/[<>{}$;=]/.test(s)) return;
  if (!/\s/.test(s) && !/^[A-ZÁÉÍÓÚ¡¿]/.test(s)) return; // palabras sueltas: solo si empiezan por mayúscula
  if (/^[\d\s.,:;%+\-*/×·★⚠✅❌🏆🥇🥈🥉💰🌾🪵🗑🌐🔊📳▦⌖💾🏳📖🔗🎬☰]+$/.test(s)) return;
  set.add(s);
}

function html(raw, set) {
  const attr = /\b(?:title|placeholder|aria-label|alt)="([^"]+)"/g;
  let m; while ((m = attr.exec(raw))) push(set, m[1]);
  const txt = raw.replace(/<[^>]*>/g, '\n');
  for (const line of txt.split('\n')) push(set, line.trim());
}

function walk(node, set) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'Literal' && typeof node.value === 'string') {
    if (/<[a-zA-Z/]/.test(node.value)) html(node.value, set); else push(set, node.value);
  } else if (node.type === 'TemplateElement') {
    const s = node.value.cooked || '';
    if (/<[a-zA-Z/]/.test(s)) html(s, set); else push(set, s);
  }
  for (const k in node) {
    if (k === 'start' || k === 'end' || k === 'loc' || k === 'range') continue;
    const v = node[k];
    if (Array.isArray(v)) for (const x of v) walk(x, set);
    else if (v && typeof v === 'object' && typeof v.type === 'string') walk(v, set);
  }
}

const found = new Set();
for (const f of fs.readdirSync(JS).filter(x => x.endsWith('.js') && !SKIP.has(x))) {
  let ast;
  try { ast = acorn.parse(fs.readFileSync(path.join(JS, f), 'utf8'), { ecmaVersion: 2022, sourceType: 'script', allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true }); }
  catch (e) { continue; }
  walk(ast, found);
}
const known = new Set(JSON.parse(fs.readFileSync('D:/Agente/_gen/phrases_es.json', 'utf8')));
const delta = [...found].filter(s => !known.has(s)).sort((a, b) => a.localeCompare(b, 'es'));
fs.writeFileSync('D:/Agente/_gen/delta_es.json', JSON.stringify(delta, null, 1), 'utf8');
console.log('delta:', delta.length, 'chars:', delta.reduce((a, b) => a + b.length, 0));
console.log(delta.slice(0, 60).join('\n'));
