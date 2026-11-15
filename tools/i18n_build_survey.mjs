#!/usr/bin/env node
/* Genera js/i18n/survey-i18n.js a partir de sql/survey_translations_seed.sql.
 *
 * - Añade las claves `survey.*` a HF.LOCALES de los 13 idiomas, para que
 *   HF.t('survey.match_over.q1_lost') funcione si el servidor devuelve claves.
 * - Añade a HF.PHRASES las variantes literales en español que puede devolver
 *   una base de datos sembrada con el ejemplo de EVENT_FEEDBACK.md, para que
 *   la capa de UI/HF.tx las traduzca aunque no sean claves.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEED = path.join(ROOT, 'sql/survey_translations_seed.sql');
const OUT = path.join(ROOT, 'js/i18n/survey-i18n.js');

const sql = fs.readFileSync(SEED, 'utf8');
const rowRe = /\('([^']+)'\s*,\s*'([a-z]{2})'\s*,\s*'((?:[^']|'')*)'\)/g;
const T = {};
let m;
while ((m = rowRe.exec(sql))) {
  const key = m[1], locale = m[2], text = m[3].replace(/''/g, "'");
  (T[key] = T[key] || {})[locale] = text;
}
const keys = Object.keys(T);
const locales = [...new Set(keys.flatMap(k => Object.keys(T[k])))].sort();
console.log('seed:', keys.length, 'claves ·', locales.length, 'locales');

// Literales que puede devolver la BD (preguntas del ejemplo y variantes).
const ALIAS = {
  'survey.match_over.q1_lost': [
    '¿Hubo algún momento en el que te sintieras perdido o no supieras qué hacer a continuación?',
    '¿Hubo algún momento en el que te sentiste perdido o no sabías qué hacer después?'
  ],
  'survey.match_over.q2_feedback': [
    '¿Qué fue lo que más y lo que menos te gustó de esta primera partida?',
    '¿Qué es lo que más y lo que menos te gustó de esta primera partida?'
  ],
  'survey.match_over.q3_return': ['¿Volverás a jugar?'],
  'survey.match_over.q4_miss': ['Si este juego no existiera mañana, ¿lo echarías de menos?'],
  'survey.match_over.q5_email': [
    'Agrega tu correo para avisarte cuando salga en Steam / iOS / Android:',
    'Añade tu correo para avisarte cuando salga en Steam / iOS / Android:'
  ],
  'survey.match_over.opt_yes': ['Sí, sin duda'],
  'survey.match_over.opt_maybe': ['Tal vez, depende de las mejoras'],
  'survey.match_over.opt_no': ['No'],
  'survey.match_over.opt_miss_very': ['Sí, muy decepcionado'],
  'survey.match_over.opt_miss_somewhat': ['Algo decepcionado'],
  'survey.match_over.opt_miss_no': ['No realmente'],
  'survey.match_over.opt_miss_stopped': ['Ya no juego']
};

// Opciones del ejemplo que no coinciden con la escala del seed
// ("Sí, muy decepcionado" no es "Mucho"): traducción propia por idioma.
const OPT = {
  'Sí, sin duda': { en: 'Yes, absolutely', fr: 'Oui, absolument', de: 'Ja, auf jeden Fall', it: 'Sì, senza dubbio', pt: 'Sim, sem dúvida', ru: 'Да, безусловно', zh: '是的，当然', ja: 'はい、もちろん', ko: '네, 물론입니다', ar: 'نعم، بالتأكيد', hi: 'हाँ, बिल्कुल', bn: 'হ্যাঁ, নিশ্চয়ই' },
  'Tal vez, depende de las mejoras': { en: 'Maybe, depending on the improvements', fr: 'Peut-être, selon les améliorations', de: 'Vielleicht, je nach Verbesserungen', it: 'Forse, dipende dai miglioramenti', pt: 'Talvez, dependa das melhorias', ru: 'Возможно, зависит от улучшений', zh: '也许，取决于改进', ja: 'たぶん、改善次第です', ko: '아마도 개선에 따라 다릅니다', ar: 'ربما، حسب التحسينات', hi: 'शायद, सुधारों पर निर्भर', bn: 'হয়তো, উন্নতির উপর নির্ভর করে' },
  'No': { en: 'No', fr: 'Non', de: 'Nein', it: 'No', pt: 'Não', ru: 'Нет', zh: '不', ja: 'いいえ', ko: '아니요', ar: 'لا', hi: 'नहीं', bn: 'না' },
  'Sí, muy decepcionado': { en: 'Yes, very disappointed', fr: 'Oui, très déçu', de: 'Ja, sehr enttäuscht', it: 'Sì, molto deluso', pt: 'Sim, muito desiludido', ru: 'Да, очень разочарован', zh: '是的，非常失望', ja: 'はい、とても残念です', ko: '네, 매우 실망했습니다', ar: 'نعم، خائب جدًا', hi: 'हाँ, बहुत निराश', bn: 'হ্যাঁ, খুব হতাশ' },
  'Algo decepcionado': { en: 'Somewhat disappointed', fr: 'Un peu déçu', de: 'Etwas enttäuscht', it: 'Un po\' deluso', pt: 'Um pouco desiludido', ru: 'Немного разочарован', zh: '有些失望', ja: 'やや残念です', ko: '다소 실망했습니다', ar: 'خائب بعض الشيء', hi: 'कुछ हद तक निराश', bn: 'কিছুটা হতাশ' },
  'No realmente': { en: 'Not really', fr: 'Pas vraiment', de: 'Nicht wirklich', it: 'Non proprio', pt: 'Não realmente', ru: 'Не особо', zh: '不太会', ja: 'あまりそうでもない', ko: '별로요', ar: 'ليس حقًا', hi: 'ज़्यादा नहीं', bn: 'খুব একটা না' },
  'Ya no juego': { en: 'I no longer play', fr: 'Je ne joue plus', de: 'Ich spiele nicht mehr', it: 'Non gioco più', pt: 'Já não jogo', ru: 'Я больше не играю', zh: '我已经不玩了', ja: 'もうプレイしていません', ko: '더 이상 하지 않습니다', ar: 'لم أعد ألعب', hi: 'मैं अब नहीं खेलता', bn: 'আমি আর খেলি না' }
};

// Descripción de la campaña de ejemplo (no viene del seed).
const DESC = {
  es: 'Feedback inicial de la comunidad de Reddit.',
  en: 'Initial feedback from the Reddit community.',
  fr: 'Retours initiaux de la communauté Reddit.',
  de: 'Erstes Feedback der Reddit-Community.',
  it: 'Feedback iniziale della community di Reddit.',
  pt: 'Feedback inicial da comunidade do Reddit.',
  ru: 'Первые отзывы сообщества Reddit.',
  zh: 'Reddit 社区的初步反馈。',
  ja: 'Redditコミュニティからの初期フィードバック。',
  ko: 'Reddit 커뮤니티의 초기 피드백.',
  ar: 'ملاحظات أولية من مجتمع Reddit.',
  hi: 'Reddit समुदाय से शुरुआती प्रतिक्रिया।',
  bn: 'Reddit সম্প্রদায়ের প্রাথমিক মতামত।'
};

const LOC = {};
const PHR = {};
for (const locale of locales) {
  LOC[locale] = {};
  PHR[locale] = {};
  for (const key of keys) {
    const text = T[key] && T[key][locale];
    if (!text) continue;
    LOC[locale][key] = text;
    for (const literal of (ALIAS[key] || [])) {
      if (locale !== 'es') PHR[locale][literal] = (OPT[literal] && OPT[literal][locale]) || text;
    }
  }
  if (locale !== 'es' && DESC[locale]) PHR[locale][DESC.es] = DESC[locale];
}
// El español conserva los literales tal cual (no necesita tabla de frases).

const js = `/* Federati · encuestas: claves survey.* y literales del seed (generado por
 * tools/i18n_build_survey.mjs a partir de sql/survey_translations_seed.sql). */
(function (G) {
  const HF = G.HF = G.HF || {};
  HF.LOCALES = HF.LOCALES || {};
  HF.PHRASES = HF.PHRASES || {};
  const LOCALES = ${JSON.stringify(LOC, null, 1)};
  const PHRASES = ${JSON.stringify(PHR, null, 1)};
  for (const lang in LOCALES) {
    HF.LOCALES[lang] = Object.assign({}, HF.LOCALES[lang] || {}, LOCALES[lang]);
  }
  for (const lang in PHRASES) {
    HF.PHRASES[lang] = Object.assign({}, HF.PHRASES[lang] || {}, PHRASES[lang]);
  }
})(typeof window !== 'undefined' ? window : globalThis);
`;
fs.writeFileSync(OUT, js, 'utf8');
console.log('escrito', path.relative(ROOT, OUT), '·', Object.keys(PHR.fr || {}).length, 'frases fr');
