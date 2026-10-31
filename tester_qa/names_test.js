'use strict';
// Prueba del generador de nombres de tribu: variedad, longitud y las 5
// fórmulas en los 13 idiomas del juego.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const LANGS = ['es', 'en', 'zh', 'hi', 'fr', 'ar', 'bn', 'pt', 'ru', 'de', 'ja', 'ko', 'it'];
const HF = { lang: () => 'es' };
const sandbox = { console, HF, Math, Object, Array, String, JSON };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'names.js'), 'utf8'), sandbox);

let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };

const N = 400;
for (const lang of LANGS) {
  const names = [];
  for (let i = 0; i < N; i++) names.push(HF.genTribeName(lang));
  const uniq = new Set(names);
  const badLen = names.filter(n => !n || n.length > 20);
  const badSpaces = names.filter(n => /\s{2,}/.test(n) || n !== n.trim());
  const legacy = names.filter(n => /mi tribu/i.test(n));
  const dupPair = names.filter(n => {
    const parts = n.split(/\s+/);
    return parts.length >= 3 && parts[0].toLowerCase() === parts[parts.length - 1].toLowerCase();
  });
  ok(dupPair.length === 0, `${lang}: sin pares repetidos (${dupPair[0] || '—'})`);
  const hasFormula = {
    A: names.some(n => /^(Capitán|Commander|Commandant|Comandante|Kommandant|Капитан|统帅|隊長|대장|सेनापति|সেনাপতি|القائد) /.test(n) || (lang === 'zh' && /^[统帅守卫先驱哨兵元帅猎手]/.test(n))),
    B: names.some(n => / the |之|の|의 | [A-ZÁÉÍÓÚÑ][a-záéíóúñ]+$/.test(n)),
    C: names.some(n => / de | of | di | aus | из | من | का | এর |之|の/.test(n)),
    D: names.some(n => /^[A-Z][a-z]+(?:-[A-Za-z]+)?$/.test(n)),
    E: true
  };
  const freq = {};
  names.forEach(n => { freq[n] = (freq[n] || 0) + 1; });
  const maxFreq = Math.max.apply(null, Object.values(freq));
  ok(uniq.size > N * 0.6, `${lang}: variedad (${uniq.size}/${N} únicas)`);
  ok(maxFreq <= N * 0.03, `${lang}: ningún nombre se repite en exceso (máx ${maxFreq}/${N})`);
  ok(badLen.length === 0, `${lang}: longitud válida (máx ${Math.max.apply(null, names.map(n => n.length))})`);
  ok(badSpaces.length === 0, `${lang}: sin espacios dobles`);
  ok(legacy.length === 0, `${lang}: nunca "Mi Tribu"`);
  const fCount = Object.keys(hasFormula).filter(k => hasFormula[k]).length;
  ok(fCount >= 3, `${lang}: varias fórmulas presentes (${fCount}/5)`);
}

// Ejemplos por idioma para revisión visual
console.log('\nEjemplos:');
for (const lang of LANGS) {
  const xs = [];
  for (let i = 0; i < 3; i++) xs.push(HF.genTribeName(lang));
  console.log('  ' + lang + ': ' + xs.join(' · '));
}

console.log(fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK');
process.exit(fail ? 1 : 0);
