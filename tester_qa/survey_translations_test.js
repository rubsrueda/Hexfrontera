'use strict';
// Traducciones DB-first: el seed PostgreSQL y el de SQL Server deben tener las
// mismas 156 filas (13 idiomas × 12 claves) y coincidir entre sí.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PG = path.join(ROOT, 'sql', 'survey_translations_seed.sql');
const MSSQL = path.join(ROOT, 'sql', 'sqlserver', 'survey_translations.sql');
const LANGS = ['en', 'es', 'zh', 'hi', 'fr', 'ar', 'bn', 'pt', 'ru', 'de', 'ja', 'ko', 'it'];
const KEYS = [
  'survey.match_over.q1_lost',
  'survey.match_over.q2_feedback',
  'survey.match_over.q3_return',
  'survey.match_over.opt_yes',
  'survey.match_over.opt_maybe',
  'survey.match_over.opt_no',
  'survey.match_over.q4_miss',
  'survey.match_over.opt_miss_very',
  'survey.match_over.opt_miss_somewhat',
  'survey.match_over.opt_miss_no',
  'survey.match_over.opt_miss_stopped',
  'survey.match_over.q5_email'
];

let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };

function rowsFrom(text, re) {
  const out = [];
  let m;
  while ((m = re.exec(text))) {
    out.push({ key: m[1], locale: m[2], text: m[3].replace(/''/g, "'") });
  }
  return out;
}
const byId = rows => {
  const map = {};
  for (const r of rows) {
    const id = r.locale + '|' + r.key;
    if (map[id] !== undefined) return null;               // duplicado
    map[id] = r.text;
  }
  return map;
};

const pgText = fs.readFileSync(PG, 'utf8');
const pgRows = rowsFrom(pgText, /\('([^']+)', '([^']+)', '((?:[^']|'')*)'\)/g);
ok(pgRows.length === 156, 'el seed PostgreSQL tiene 156 filas (' + pgRows.length + ')');
ok(/ON CONFLICT \(translation_key, locale\) DO UPDATE/.test(pgText), 'el seed PostgreSQL es idempotente');
ok(/FROM public\.hf_survey_translations/.test(pgText), 'el seed PostgreSQL apunta a la tabla correcta');

const msText = fs.readFileSync(MSSQL, 'utf8');
const msRows = rowsFrom(msText, /\(N'([^']+)', N'([^']+)', N'((?:[^']|'')*)'\)/g);
ok(msRows.length === 156, 'el seed SQL Server tiene 156 filas (' + msRows.length + ')');
ok(/CREATE TABLE dbo\.hf_survey_translations/.test(msText), 'SQL Server crea dbo.hf_survey_translations');
ok(/MERGE dbo\.hf_survey_translations/.test(msText), 'SQL Server usa MERGE para el upsert');

const pg = byId(pgRows), ms = byId(msRows);
ok(pg !== null, 'no hay duplicados clave/idioma en PostgreSQL');
ok(ms !== null, 'no hay duplicados clave/idioma en SQL Server');

for (const lang of LANGS) {
  const n = pgRows.filter(r => r.locale === lang).length;
  ok(n === KEYS.length, lang + ' tiene las 12 claves (' + n + ')');
}
ok(KEYS.every(k => pgRows.some(r => r.key === k)), 'están todas las claves survey.match_over.*');
ok(pgRows.every(r => /^survey\.[a-z0-9_.-]+$/.test(r.key)), 'todas las claves cumplen el formato');
ok(pgRows.every(r => LANGS.indexOf(r.locale) >= 0), 'todos los locales son los 13 soportados');

let diff = 0;
for (const r of pgRows) if (!ms || ms[r.locale + '|' + r.key] !== r.text) diff++;
ok(diff === 0, 'PostgreSQL y SQL Server contienen exactamente los mismos textos');

console.log(fail ? '\nCON FALLOS (' + fail + ')' : '\nTODO OK');
process.exit(fail ? 1 : 0);
