#!/usr/bin/env node
/* Extrae segmentos de texto visible en español de js/*.js con acorn.
 * Salida: D:\Agente\_gen\ui_phrases.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JS = path.join(ROOT, 'js');
const OUT = 'D:/Agente/_gen/ui_phrases.json';
const require = createRequire(path.join(ROOT, 'package.json'));
const acornPath = path.join(ROOT, 'node_modules/.pnpm/acorn@8.15.0/node_modules/acorn/dist/acorn.js');
const acorn = require(acornPath);

const SKIP = new Set([
  'i18n.js', 'artdata.js', 'banter_data.js', 'names.js',
  'event-feedback-langs.js', 'replay-caster-langs.js', 'data.js', 'config.js',
  'lore-data.js', 'music.js', 'telemetry.js', 'security.js', 'platform.js'
]);

const SPANISH = /[áéíóúÁÉÍÓÚñÑ¿¡üÜ]|\b(el|la|los|las|un|una|del|que|para|con|sin|por|tu|tus|más|nuevo|nueva|jugar|partida|ajustes|cerrar|cancelar|guardar|volver|nivel|reto|mapa|turno|unidad|ciudad|oro|madera|trigo|victoria|derrota|ranking|historial|capítulo|acto|no|sí|ya|sobre|desde|hasta|entre|cada|todo|todos|este|esta|estos|estas)\b/i;
const CODEISH = /^(https?:|\/|\.\/|#|data:|--)|\.(js|css|png|webp|json|svg|mp3|wav|m4a)$|^[\w$.-]+$|^[A-Z0-9_]+$|px$|rgba?\(|var\(--|^[a-z-]+:[a-z-]+/i;
const HTML_ONLY = /^<[^>]+>$/;

function push(set, raw) {
  if (typeof raw !== 'string') return;
  let s = raw.replace(/\s+/g, ' ').trim();
  if (!s || s.length < 3 || s.length > 300) return;
  if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑ]{3}/.test(s)) return;
  if (!SPANISH.test(s)) return;
  if (CODEISH.test(s)) return;
  if (HTML_ONLY.test(s)) return;
  if (/^[.#][\w-]+/.test(s)) return;
  if (/^[\d\s.,:;%+\-*/×·★⚠✅❌🏆🥇🥈🥉💰🌾🪵🗑🌐🔊📳▦⌖💾🏳📖🔗🎬☰]+$/.test(s)) return;
  // Fragmentos que empiezan/terminan cortando una etiqueta o una interpolación
  // suelen ser HTML o código a medias: se limpian antes de guardar.
  set.add(s);
}

function extractHtml(raw, set) {
  // Atributos visibles.
  const attr = /\b(?:title|placeholder|aria-label|alt)="([^"]+)"/g;
  let m;
  while ((m = attr.exec(raw))) push(set, m[1]);
  // Texto entre etiquetas.
  const text = raw.replace(/<[^>]*>/g, '\n');
  for (const line of text.split('\n')) {
    let s = line.trim();
    if (!s) continue;
    // Recorta restos de llaves de plantilla.
    s = s.replace(/^[}\s]+|[{\s]+$/g, ' ').replace(/\s+/g, ' ').trim();
    push(set, s);
  }
}

function walk(node, set) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'Literal' && typeof node.value === 'string') {
    const s = node.value;
    if (/<[a-zA-Z/]/.test(s)) extractHtml(s, set);
    else push(set, s);
  } else if (node.type === 'TemplateElement') {
    const s = node.value.cooked || '';
    if (/<[a-zA-Z/]/.test(s)) extractHtml(s, set);
    else push(set, s);
  }
  for (const key in node) {
    if (key === 'start' || key === 'end' || key === 'loc' || key === 'range') continue;
    const v = node[key];
    if (Array.isArray(v)) for (const x of v) walk(x, set);
    else if (v && typeof v === 'object' && typeof v.type === 'string') walk(v, set);
  }
}

const phrases = new Set();
const files = fs.readdirSync(JS).filter(x => x.endsWith('.js') && !SKIP.has(x));
for (const f of files) {
  const src = fs.readFileSync(path.join(JS, f), 'utf8');
  let ast;
  try {
    ast = acorn.parse(src, { ecmaVersion: 2022, sourceType: 'script', allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true, allowHashBang: true });
  } catch (e) {
    console.warn('[extract] no parse', f, e.message);
    continue;
  }
  walk(ast, phrases);
}

// Limpieza final: fuera fragmentos que son claramente código o HTML roto.
const ASCII_ES = /\b(el|la|los|las|un|una|del|que|para|con|sin|por|tu|tus|su|sus|es|son|está|están|hay|pero|más|ya|se|lo|le|les|este|esta|estos|estas|todo|todos|toda|todas|nuevo|nueva|jugar|partida|mapa|turno|unidad|ciudad|oro|madera|trigo|victoria|derrota|ranking|historial|nivel|reto|campaña|ajustes|cerrar|cancelar|guardar|volver|desde|hasta|entre|cada|sobre|muy|sin)\b/gi;
const list = [...phrases].filter(s => {
  if (/^\[/.test(s)) return false;
  if (/console\.|HF\.|=>|querySelector|addEventListener|innerHTML|classList|document\.|localStorage|undefined|null/.test(s)) return false;
  if (/https?:|\.js\b|\.css\b|SQL|PostgREST/.test(s)) return false;
  if (/[=<>{};]/.test(s) && s.split(/\s+/).length > 6) return false;
  if (s.length > 140 && !/[.!?]$/.test(s)) return false;
  // Textos sin ningún rasgo español (acentos, ñ, ¿¡ o 2 palabras funcionales) se
  // descartan: suelen ser mensajes internos en inglés ya existentes.
  const accented = /[áéíóúÁÉÍÓÚñÑ¿¡üÜ]/.test(s);
  const hits = (s.match(ASCII_ES) || []).length;
  if (!accented && hits < 2) return false;
  return true;
}).sort((a, b) => a.localeCompare(b, 'es'));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(list, null, 1), 'utf8');
console.log('ui phrases:', list.length, 'chars:', list.reduce((a, b) => a + b.length, 0));
