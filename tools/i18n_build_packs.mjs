#!/usr/bin/env node
/* Construye los packs de idioma de Federati a partir de las traducciones
 * producidas en D:\Agente\_gen.
 *
 *   node tools/i18n_build_packs.mjs
 *
 * Genera:
 *   js/i18n/en-keys.js          claves inglesas que faltaban en i18n.js
 *   js/i18n/phrases.<lang>.js   catálogo HF.PHRASES (español → idioma)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GEN = 'D:/Agente/_gen';
const OUT = process.env.I18N_OUT || path.join(ROOT, 'js/i18n');
const LANGS = ['en', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi', 'bn'];

fs.mkdirSync(OUT, { recursive: true });

/* 1. Claves inglesas nuevas */
const enFragPath = path.join(GEN, 'frag_en_existing.json');
if (fs.existsSync(enFragPath)) {
  const frag = JSON.parse(fs.readFileSync(enFragPath, 'utf8'));
  const en = frag.en || {};
  const body = JSON.stringify(en, null, 2);
  const js = `/* Federati · claves inglesas que faltaban en i18n.js (generado). */\n` +
    `(function (G) {\n  const HF = G.HF = G.HF || {};\n  HF.LOCALES = HF.LOCALES || {};\n` +
    `  HF.LOCALES.en = Object.assign({}, HF.LOCALES.en || {}, ${body});\n` +
    `})(typeof window !== 'undefined' ? window : globalThis);\n`;
  fs.writeFileSync(path.join(OUT, 'en-keys.js'), js, 'utf8');
  console.log(`en-keys.js: ${Object.keys(en).length} claves`);
}

/* 2. Catálogos de frases por idioma */
const source = JSON.parse(fs.readFileSync(path.join(GEN, 'phrases_es.json'), 'utf8'));
const extraSrcPath = path.join(GEN, 'chunk_c.json');
if (fs.existsSync(extraSrcPath)) {
  for (const s of JSON.parse(fs.readFileSync(extraSrcPath, 'utf8'))) {
    if (!source.includes(s)) source.push(s);
  }
}
// Delta de cadenas que el filtro "solo español" dejó fuera (banners, kickers,
// fragmentos sin acentos, nombres del diario...).
const deltaPath = path.join(GEN, 'delta_es.json');
if (fs.existsSync(deltaPath)) {
  for (const s of JSON.parse(fs.readFileSync(deltaPath, 'utf8'))) {
    if (!source.includes(s)) source.push(s);
  }
}
// Etiquetas sueltas de UI (Empezar, Nombre, Color...) que el extractor HTML
// descartaba por ser palabras simples.
const extra4Path = path.join(GEN, 'extra4_es.json');
if (fs.existsSync(extra4Path)) {
  for (const s of JSON.parse(fs.readFileSync(extra4Path, 'utf8'))) {
    if (!source.includes(s)) source.push(s);
  }
}
// Traducciones cortas multilingües escritas a mano (barks que el extractor
// automático no detectó por no llevar acentos).
let extra = {}, extra2 = {};
for (const [name, target] of [['trans_extra.json', extra], ['trans_extra2.json', extra2]]) {
  const p = path.join(GEN, name);
  if (!fs.existsSync(p)) continue;
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    for (const [k, v] of Object.entries(data)) target[k] = v;
    for (const map of Object.values(data)) for (const es of Object.keys(map)) if (!source.includes(es)) source.push(es);
  } catch (e) { console.warn(`[packs] ${name} inválido`); }
}
const sourceSet = new Set(source);

for (const lang of LANGS) {
  const merged = {};
  const files = fs.readdirSync(GEN).filter(f => f.startsWith(`trans_${lang}_`) && f.endsWith('.json'));
  for (const f of files) {
    let data;
    try { data = JSON.parse(fs.readFileSync(path.join(GEN, f), 'utf8')); }
    catch (e) { console.error(`[packs] ${f}: JSON inválido (${e.message})`); continue; }
    const map = data.map || data;
    for (const [es, tr] of Object.entries(map)) {
      if (typeof tr !== 'string' || !tr) continue;
      if (!sourceSet.has(es)) continue;
      merged[es] = tr;
    }
  }
  for (const src of [extra, extra2]) {
    for (const [es, tr] of Object.entries(src[lang] || {})) {
      if (typeof tr === 'string' && tr && sourceSet.has(es)) merged[es] = tr;
    }
  }
  const covered = Object.keys(merged).length;
  if (!covered) { console.warn(`[packs] ${lang}: sin traducciones todavía`); continue; }

  // Orden estable y JSON seguro para incrustar en JS.
  const ordered = {};
  for (const es of source) if (merged[es] != null) ordered[es] = merged[es];
  const body = JSON.stringify(ordered, null, 1);
  const js = `/* Federati · catálogo de frases ${lang} (generado por tools/i18n_build_packs.mjs). */\n` +
    `(function (G) {\n  const HF = G.HF = G.HF || {};\n  HF.PHRASES = HF.PHRASES || {};\n` +
    `  HF.PHRASES[${JSON.stringify(lang)}] = ${body};\n` +
    `})(typeof window !== 'undefined' ? window : globalThis);\n`;
  fs.writeFileSync(path.join(OUT, `phrases.${lang}.js`), js, 'utf8');
  console.log(`${lang}: ${covered}/${source.length} frases (${(covered / source.length * 100).toFixed(1)}%)`);
}
