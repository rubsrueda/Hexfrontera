#!/usr/bin/env node
/* i18n_audit.mjs — Auditoría de cobertura de traducción de Federati.
 *
 * Uso:
 *   node tools/i18n_audit.mjs            Informe resumido
 *   node tools/i18n_audit.mjs --json     Informe completo en JSON
 *   node tools/i18n_audit.mjs --strict   Sale con código 1 si hay huecos
 *
 * Comprueba:
 *   1. Claves de HF.LOCALES por idioma y las que faltan respecto al español.
 *   2. Claves usadas con HF.t('KEY') en js/ que no existen en el diccionario.
 *   3. Claves usadas con HF.t('KEY', 'texto') cuyo fallback es español.
 *   4. Cadenas visibles hardcodeadas en español (heurística) fuera de i18n.js.
 *   5. Cadenas del banco de mensajes de unidades (banter_data.js).
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JS = path.join(ROOT, 'js');
const ARGS = new Set(process.argv.slice(2));

const LANGS = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'bn', name: 'বাংলা', flag: '🇧🇩' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', rtl: true }
];

/* ---------- 1. Cargar i18n.js + packs de idioma en un sandbox ---------- */
const settings = { lang: 'es' };
const sandbox = {
  console,
  navigator: { languages: ['es'], language: 'es' },
  document: { documentElement: {}, getElementById: () => null, body: null, dispatchEvent() {} },
  requestAnimationFrame: fn => fn(),
  setTimeout,
  CustomEvent: class { constructor(t, o) { this.type = t; this.detail = o && o.detail; } },
  HF: {
    LANGS,
    settings: () => settings,
    store: { get: () => null, set() {}, del() {} },
    t: undefined
  }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const FILES = ['i18n.js', 'event-feedback-langs.js', 'replay-caster-langs.js'];
// Packs generados por tools/i18n_build_packs.mjs
const PACK_DIR = path.join(JS, 'i18n');
if (fs.existsSync(PACK_DIR)) {
  const packs = fs.readdirSync(PACK_DIR).filter(f => /^(en-keys|phrases\.[a-z]{2})\.js$/.test(f)).sort();
  FILES.push(...packs.map(f => path.join('i18n', f)));
}
for (const f of FILES) {
  const p = path.join(JS, f);
  if (!fs.existsSync(p)) continue;
  try {
    vm.runInContext(fs.readFileSync(p, 'utf8'), sandbox, { filename: f });
  } catch (e) {
    console.error(`[audit] No se pudo evaluar ${f}: ${e.message}`);
  }
}
const HF = sandbox.HF;
const LOCALES = HF.LOCALES || {};

const localeKeys = {};
for (const { code } of LANGS) localeKeys[code] = new Set(Object.keys(LOCALES[code] || {}));
const esKeys = [...localeKeys.es];
const enKeys = localeKeys.en;

/* ---------- 2. Claves usadas en el código ---------- */
const SOURCE_FILES = fs.readdirSync(JS).filter(f => f.endsWith('.js'));
const used = new Map();        // key -> Set(files)
const withFallback = [];       // { key, fallback, file, line }
for (const f of SOURCE_FILES) {
  if (f === 'i18n.js') continue;
  const text = fs.readFileSync(path.join(JS, f), 'utf8');
  const re = /HF\.t\(\s*'([A-Z0-9_]+)'\s*(?:,\s*(['"`])([\s\S]*?)\2)?\s*\)/g;
  let m;
  while ((m = re.exec(text))) {
    const key = m[1];
    if (!used.has(key)) used.set(key, new Set());
    used.get(key).add(f);
    if (m[3] != null) {
      const line = text.slice(0, m.index).split('\n').length;
      withFallback.push({ key, fallback: m[3].slice(0, 120), file: f, line });
    }
  }
}
const usedKeys = [...used.keys()];
const missingInEs = usedKeys.filter(k => !localeKeys.es.has(k));
const missingInEn = usedKeys.filter(k => !localeKeys.en.has(k));

/* ---------- 3. Cadenas visibles en español hardcodeadas ---------- */
const SPANISH = /[áéíóúÁÉÍÓÚñÑ¿¡üÜ]|\b(el|la|los|las|un|una|del|que|para|con|sin|por|tu|tus|más|nuevo|nueva|jugar|partida|ajustes|cerrar|cancelar|guardar|volver|nivel|reto|mapa|turno|unidad|ciudad|oro|madera|trigo|victoria|derrota|ranking|historial|capítulo|acto)\b/;
const CODEISH = /^[\w.$#@:/\\-]+$|^[a-z][\w-]*$|px|rgba?\(|var\(--|\.(js|css|png|webp|json|svg|mp3|wav)$/i;
const hardcoded = [];
const SKIP_FILES = new Set(['i18n.js', 'i18n_new_keys.json', 'artdata.js', 'banter_data.js', 'names.js', 'event-feedback-langs.js', 'replay-caster-langs.js']);
for (const f of SOURCE_FILES) {
  if (SKIP_FILES.has(f)) continue;
  const lines = fs.readFileSync(path.join(JS, f), 'utf8').split('\n');
  lines.forEach((line, i) => {
    const raw = line.trim();
    if (!raw || raw.startsWith('//') || raw.startsWith('*') || raw.startsWith('/*')) return;
    if (/^\s*(import|export)\b/.test(raw)) return;
    // Toda cadena entre comillas simples, dobles o backticks.
    const re = /(['"`])((?:\\.|(?!\1)[^\\])*)\1/g;
    let m;
    while ((m = re.exec(line))) {
      const s = m[2].trim();
      if (s.length < 3 || s.length > 220) continue;
      if (!/[a-záéíóúñ]{2}/i.test(s)) continue;
      if (!SPANISH.test(s)) continue;
      if (/^(https?:|\/|\.\/|#|data:|--)/.test(s)) continue;
      if (CODEISH.test(s)) continue;
      if (/[{}`]/.test(s) && !/\s/.test(s)) continue; // identificadores interpolados
      // Descarta HTML/CSS puro sin texto natural.
      if (/^[<>/]?[\w\s="':;,.%()#-]+$/.test(s) && !/\s[a-záéíóúñ]{3,}\s/.test(' ' + s + ' ')) continue;
      hardcoded.push({ file: f, line: i + 1, text: s.slice(0, 160) });
    }
  });
}

/* ---------- 4. Banco de mensajes de las unidades ---------- */
let banter = { strings: 0, chars: 0, groups: {} };
try {
  const bsandbox = { console, HF: {} };
  bsandbox.window = bsandbox;
  vm.createContext(bsandbox);
  vm.runInContext(fs.readFileSync(path.join(JS, 'banter_data.js'), 'utf8'), bsandbox, { filename: 'banter_data.js' });
  const D = bsandbox.HF.BANTER_DATABASE || {};
  const walk = (v, key) => {
    if (typeof v === 'string') {
      banter.strings++;
      banter.chars += v.length;
      banter.groups[key] = (banter.groups[key] || 0) + 1;
    } else if (Array.isArray(v)) v.forEach(x => walk(x, key));
    else if (v && typeof v === 'object') for (const k in v) walk(v[k], k);
  };
  for (const k in D) walk(D[k], k);
} catch (e) {
  banter.error = e.message;
}

/* ---------- 5. Cobertura del catálogo de frases ---------- */
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
let phraseSource = null;
const PHRASE_SRC = 'D:/Agente/_gen/phrases_es.json';
if (fs.existsSync(PHRASE_SRC)) {
  try { phraseSource = JSON.parse(fs.readFileSync(PHRASE_SRC, 'utf8')); } catch (e) { }
}
const phraseCoverage = {};
let hardcodedCovered = 0;
if (phraseSource) {
  hardcodedCovered = hardcoded.filter(h =>
    phraseSource.some(p => p.length >= 3 && h.text.includes(p))).length;
  for (const { code } of LANGS) {
    if (code === 'es') { phraseCoverage[code] = { translated: phraseSource.length, missing: 0, pct: 100 }; continue; }
    const table = (HF.PHRASES && HF.PHRASES[code]) || {};
    phraseCoverage[code] = {
      translated: Object.keys(table).length,
      missing: phraseSource.filter(s => !Object.prototype.hasOwnProperty.call(table, s)).length,
      pct: pct(Object.keys(table).length, phraseSource.length)
    };
  }
}

/* ---------- 6. Informe ---------- */
const coverage = {};
for (const { code } of LANGS) {
  const n = localeKeys[code].size;
  const table = (HF.PHRASES && HF.PHRASES[code]) || null;
  const effective = esKeys.filter(k => {
    if (localeKeys[code].has(k)) return true;
    const esVal = LOCALES.es && LOCALES.es[k];
    return typeof esVal === 'string' && table && Object.prototype.hasOwnProperty.call(table, esVal);
  }).length;
  coverage[code] = {
    keys: n,
    missingVsEs: esKeys.filter(k => !localeKeys[code].has(k)).length,
    missingVsEn: [...enKeys].filter(k => !localeKeys[code].has(k)).length,
    pctOfEs: pct(n, localeKeys.es.size),
    effective,
    effectivePct: pct(effective, esKeys.length)
  };
}

const report = {
  locales: Object.fromEntries(LANGS.map(l => [l.code, l.name])),
  totalEsKeys: localeKeys.es.size,
  totalEnKeys: localeKeys.en.size,
  coverage,
  phraseCoverage,
  usedKeys: usedKeys.length,
  usedMissingInEs: missingInEs,
  usedMissingInEn: missingInEn,
  fallbacks: withFallback,
  hardcodedCount: hardcoded.length,
  hardcodedCovered,
  hardcoded,
  banter
};

const outFlag = process.argv.find(a => a.startsWith('--out='));
if (outFlag) fs.writeFileSync(outFlag.slice(6), JSON.stringify(report, null, 2), 'utf8');

if (ARGS.has('--json')) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('=== Federati · auditoría i18n ===\n');
  console.log(`Claves en español: ${localeKeys.es.size} · inglés: ${localeKeys.en.size}`);
  console.log(`Claves usadas por el código: ${usedKeys.length} · faltan en es: ${missingInEs.length} · faltan en en: ${missingInEn.length}\n`);
  console.log('Cobertura por idioma:');
  for (const { code, name } of LANGS) {
    const c = coverage[code];
    console.log(`  ${code.padEnd(3)} ${name.padEnd(9)} ${String(c.keys).padStart(4)} claves dict. · efectiva ${String(c.effective).padStart(3)}/${esKeys.length} (${String(c.effectivePct).padStart(3)}%) · faltan ${c.missingVsEs}`);
  }
  console.log(`\nCadenas hardcodeadas (heurística): ${hardcoded.length} · cubiertas por el catálogo: ${hardcodedCovered}`);
  if (phraseSource) {
    console.log(`\nCatálogo de frases (${phraseSource.length} cadenas visibles):`);
    for (const { code, name } of LANGS) {
      const c = phraseCoverage[code];
      console.log(`  ${code.padEnd(3)} ${name.padEnd(9)} ${String(c.translated).padStart(4)} traducidas  ${String(c.pct).padStart(3)}%  faltan ${c.missing}`);
    }
  }
  const byFile = {};
  for (const h of hardcoded) byFile[h.file] = (byFile[h.file] || 0) + 1;
  Object.entries(byFile).sort((a, b) => b[1] - a[1]).forEach(([f, n]) => console.log(`  ${String(n).padStart(4)}  ${f}`));
  console.log(`\nBanter: ${banter.strings} cadenas · ${banter.chars} caracteres`);
  if (missingInEs.length) console.log(`\nClaves usadas sin entrada en es:\n  ${missingInEs.join(', ')}`);
  if (missingInEn.length) console.log(`\nClaves usadas sin entrada en en:\n  ${missingInEn.join(', ')}`);
}

// Criterio de idioma completo: el diccionario inglés tiene todas las claves y
// cada idioma cubre al menos el 95 % del catálogo de frases visibles.
const incomplete = coverage.en.missingVsEs > 0;
const phrasesIncomplete = phraseSource && LANGS.some(l => phraseCoverage[l.code] && phraseCoverage[l.code].pct < 95);
if (ARGS.has('--strict') && (incomplete || missingInEs.length || missingInEn.length || phrasesIncomplete)) process.exit(1);
