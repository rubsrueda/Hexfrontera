'use strict';
// Prólogo cinematográfico: claves en los 13 idiomas y preferencia por defecto.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HF = {};
const sandbox = { console, HF, window: null, navigator: { onLine: false }, localStorage: null };
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ['util.js', 'config.js', 'i18n.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox);

let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };

ok(HF.settings().showIntroCrawl === true, 'la introducción se muestra por defecto');
const langs = HF.LANGS.map(l => l.code);
ok(langs.length === 13, `13 idiomas (${langs.length})`);
const keys = ['CRAWL_TITLE', 'CRAWL_PROLOGUE', 'CRAWL_SEC1_TITLE', 'CRAWL_SEC1_DESC', 'CRAWL_SEC2_TITLE', 'CRAWL_SEC2_DESC',
  'CRAWL_SEC3_TITLE', 'CRAWL_SEC3_DESC', 'CRAWL_SEC4_TITLE', 'CRAWL_SEC4_DESC', 'CRAWL_SEC5_CTA',
  'CRAWL_DONT_SHOW', 'CRAWL_SKIP', 'CRAWL_SETTING'];
for (const code of langs) {
  HF.setLang(code);
  const missing = keys.filter(k => { const v = HF.t(k); return !v || v === k; });
  ok(missing.length === 0, `${code}: ${missing.length ? 'faltan ' + missing.join(',') : 'traducción completa'}`);
}
HF.setLang('es');
ok(HF.t('CRAWL_TITLE') === 'CRÓNICAS DE LA FRONTERA', 'título en español');
ok(HF.t('CRAWL_SKIP') === 'Saltar ▶', 'botón saltar en español');

console.log(fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK');
process.exit(fail ? 1 : 0);
