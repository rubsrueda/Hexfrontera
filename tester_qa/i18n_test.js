#!/usr/bin/env node
/**
 * tester_qa/i18n_test.js
 *
 * Comprueba que Federati tiene traducción efectiva en los 13 idiomas:
 *   - El diccionario inglés cubre todas las claves del español.
 *   - Cada idioma carga su catálogo de frases y traduce claves, barks de
 *     unidades y el corpus de banter (no se queda en español ni en inglés).
 *   - Cambiar de idioma reconstruye el banter desde el original.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const JS = path.join(ROOT, 'js');
const I18N = path.join(JS, 'i18n');
const LANGS = ['es', 'en', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi', 'bn'];

let fail = 0;
const ok = (cond, msg, extra) => {
  if (!cond) fail++;
  console.log((cond ? 'ok   ' : 'FAIL ') + msg + (cond ? '' : ' :: ' + extra));
};

function boot(lang) {
  const settings = { lang };
  const sandbox = {
    console,
    navigator: { languages: [lang], language: lang },
    document: { documentElement: {}, getElementById: () => null, body: null },
    requestAnimationFrame: fn => fn(),
    setTimeout,
    HF: {
      LANGS: LANGS.map(code => ({ code })),
      settings: () => settings,
      store: { get: () => null, set() {}, del() {} }
    }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  const files = ['config.js', 'data.js', 'banter_data.js', 'i18n.js']
    .map(f => path.join(JS, f));
  const enKeys = path.join(I18N, 'en-keys.js');
  const enPhrases = path.join(I18N, 'phrases.en.js');
  if (fs.existsSync(enKeys)) files.push(enKeys);
  if (fs.existsSync(enPhrases)) files.push(enPhrases);
  const pack = path.join(I18N, `phrases.${lang}.js`);
  if (fs.existsSync(pack)) files.push(pack);
  for (const f of files) vm.runInContext(fs.readFileSync(f, 'utf8'), sandbox, { filename: f });
  sandbox.HF.setLang(lang);
  return sandbox.HF;
}

console.log('=== i18n_test · cobertura de los 13 idiomas ===');
if (!fs.existsSync(I18N)) {
  console.error('FAIL: falta js/i18n (ejecuta tools/i18n_build_packs.mjs)');
  process.exit(1);
}

const esKeys = Object.keys(boot('es').LOCALES.es || {}).length;
ok(esKeys > 600, 'el diccionario español tiene claves (' + esKeys + ')');

for (const lang of LANGS) {
  const HF = boot(lang);
  const enKeys = Object.keys(HF.LOCALES.en || {}).length;
  if (lang === 'en') ok(enKeys === esKeys, 'inglés cubre las ' + esKeys + ' claves', enKeys);

  if (lang === 'es') {
    ok(HF.t('NEWGAME_DIFF_EASY') === 'Fácil', 'español intacto');
    continue;
  }

  const easy = HF.t('NEWGAME_DIFF_EASY');
  // pt/it comparten "Fácil/Facile" con el español; en debe dar "Easy"; el resto
  // no debe quedarse ni en español ni en inglés.
  const cognate = lang === 'pt' || lang === 'it';
  ok(lang === 'en' ? easy === 'Easy' : (easy !== 'Easy' && (cognate || easy !== 'Fácil')),
    lang + ': clave traducida (' + easy + ')', easy);
  ok(easy !== 'NEWGAME_DIFF_EASY', lang + ': la clave existe', easy);

  const bark = HF.tx('Necesitamos provisiones.');
  ok(bark !== 'Necesitamos provisiones.', lang + ': bark de unidad traducido (' + bark + ')', bark);

  const banter = HF.BANTER_DATABASE.interruptions && HF.BANTER_DATABASE.interruptions[0];
  ok(banter && banter !== '¡Glup! ¡El Canciller nos mira!', lang + ': banter traducido (' + banter + ')', banter);

  const pack = HF.PHRASES[lang] || {};
  ok(Object.keys(pack).length > 1600, lang + ': catálogo completo (' + Object.keys(pack).length + ')');

  // Banner del Hub: kicker, nombre del diario y botón.
  ok(HF.tx('RETO DIARIO') !== 'RETO DIARIO', lang + ': kicker del banner traducido', HF.tx('RETO DIARIO'));
  ok(HF.tx('Asalto a la Brecha') !== 'Asalto a la Brecha', lang + ': nombre del diario traducido', HF.tx('Asalto a la Brecha'));
  ok(HF.tx('facciones') !== 'facciones', lang + ': fragmento «facciones» traducido', HF.tx('facciones'));
  ok(HF.tx('Empezar') !== 'Empezar', lang + ': botón «Empezar» traducido', HF.tx('Empezar'));
  ok(HF.tx('Nombre') !== 'Nombre', lang + ': etiqueta «Nombre» traducida', HF.tx('Nombre'));

  // Regresión de la pantalla de Tribu: los identificadores no se traducen y
  // doctrineInfo sigue encontrando el pilar por su nombre visible.
  ok(HF.PILLARS.map(p => p.key).join(',') === 'alma,arma,victoria',
    lang + ': claves de pilares intactas', HF.PILLARS.map(p => p.key).join(','));
  const doct = Object.values(HF.DOCT).find(d => d.tag === 'CIV_TYPE_SEDENTARY');
  ok(doct && HF.doctrineInfo(HF.PILLARS[0].name, doct).status === 'on',
    lang + ': doctrineInfo resuelve el pilar traducido');

  // Volver a español restaura el corpus original.
  HF.setLang('es');
  const back = HF.BANTER_DATABASE.interruptions && HF.BANTER_DATABASE.interruptions[0];
  ok(back === '¡Glup! ¡El Canciller nos mira!', lang + ': cambiar a es restaura el banter');
}

console.log(fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK');
process.exit(fail ? 1 : 0);
