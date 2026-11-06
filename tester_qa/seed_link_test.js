#!/usr/bin/env node
/**
 * tester_qa/seed_link_test.js
 *
 * Enlaces cortos de mapa: federati.org/?seed=XXXXXXXXX
 *   · 9 caracteres, Base32 Crockford (sin I, L, O, U)
 *   · ida y vuelta exacta para todas las combinaciones de tamaño/bioma/
 *     facciones/niebla/dificultad y muchas semillas
 *   · firma de 5 bits: las erratas se rechazan (no abren un mapa equivocado)
 *   · integración con HF.shareUrl y con el arranque (js/main.js)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

let fails = 0;
const ok = (cond, msg) => {
  if (!cond) fails++;
  console.log((cond ? '  ok   ' : '  FAIL ') + msg);
};

// ---------- entorno mínimo ----------
const lsData = {};
const localStorage = {
  getItem: k => (Object.prototype.hasOwnProperty.call(lsData, k) ? lsData[k] : null),
  setItem: (k, v) => { lsData[k] = String(v); },
  removeItem: k => { delete lsData[k]; }
};

global.location = { protocol: 'https:', hostname: 'federati.org', href: 'https://federati.org/', search: '', hash: '' };
global.window = { HF: {}, localStorage, location: global.location, console, document: undefined };
Object.defineProperty(global, 'navigator', { value: undefined, configurable: true, writable: true });

function load(p) { eval(fs.readFileSync(path.join(ROOT, p), 'utf8')); }

load('js/config.js');
load('js/data.js');        // HF.SIZES / HF.BIOMES desde CFG
load('js/util.js');        // store, shareBase, shareUrl
load('js/links.js');

const HF = global.window.HF;
const L = HF.links;

console.log('=== seed_link_test · enlaces cortos de mapa ===');

// ---------- formato ----------
console.log('\n[formato]');
const spec = { seed: 987654321, size: 'large', biome: 'archipelago', n: 4, fog: 'EXPLORED', difficulty: 'hard' };
const token = L.encode(spec);
ok(typeof token === 'string' && token.length === 9, 'token de 9 caracteres (leído: "' + token + '")');
ok(/^[0-9A-HJKMNP-TV-Z]{9}$/.test(token), 'solo alfabeto Crockford (sin I, L, O, U)');
ok(!/[ILOU]/.test(token), 'sin caracteres ambiguos');

// ---------- ida y vuelta ----------
console.log('\n[iday vuelta]');
const sizes = Object.keys(HF.SIZES), biomes = Object.keys(HF.BIOMES);
const fogs = ['FULL', 'EXPLORED', 'NONE'], diffs = ['easy', 'normal', 'hard'];
let casos = 0, malos = 0;
for (const size of sizes) for (const biome of biomes) for (const n of [2, 3, 4, 5, 6])
  for (const fog of fogs) for (const difficulty of diffs) {
    for (const seed of [0, 1, 12345, 999999937, 1073741823, Math.floor(Math.random() * 1073741824)]) {
      casos++;
      const s = { seed, size, biome, n, fog, difficulty };
      const back = L.decode(L.encode(s));
      if (!back || back.seed !== seed || back.size !== size || back.biome !== biome ||
          back.n !== n || back.fog !== fog || back.difficulty !== difficulty) malos++;
    }
  }
ok(malos === 0, 'ida y vuelta exacta en ' + casos + ' combinaciones (' + malos + ' fallos)');

// ---------- semilla de 30 bits ----------
console.log('\n[semilla]');
const big = L.decode(L.encode({ seed: 4294967295, size: 'small', biome: 'plains', n: 2, fog: 'FULL', difficulty: 'normal' }));
ok(big && big.seed === (4294967295 % 1073741824), 'la semilla se recorta a 30 bits de forma estable');
ok(L.decode(L.encode({ seed: 0, size: 'small', biome: 'plains', n: 9, fog: 'FULL', difficulty: 'normal' })).n === 6,
  'las facciones se limitan a 2..6');

// ---------- firma: erratas rechazadas ----------
console.log('\n[firma de 5 bits]');
const base = L.encode({ seed: 42, size: 'medium', biome: 'forest', n: 3, fog: 'FULL', difficulty: 'normal' });
let mutaciones = 0, rechazadas = 0, mapaDistinto = 0;
for (let i = 0; i < base.length; i++) {
  for (const ch of L.ALPHABET) {
    if (ch === base[i]) continue;
    mutaciones++;
    const t = base.slice(0, i) + ch + base.slice(i + 1);
    const r = L.decode(t);
    if (r === null) rechazadas++;
    else mapaDistinto++;   // firma no detectó el cambio (~3%)
  }
}
const tasa = rechazadas / mutaciones;
ok(tasa > 0.9, 'erratas de 1 carácter rechazadas al ' + (tasa * 100).toFixed(1) + '% (mínimo esperado ~96,9%)');
ok(mapaDistinto < mutaciones * 0.1, 'solo ' + mapaDistinto + ' de ' + mutaciones + ' erratas pasarían la firma');

// ---------- normalización de entrada ----------
console.log('\n[entrada del usuario]');
ok(L.decode(token.toLowerCase()) !== null, 'acepta minúsculas');
ok(L.decode(token.slice(0, 4) + '-' + token.slice(4)) !== null, 'acepta guiones');
const withO = token.replace(/0/g, 'O');
ok(L.decode(withO) !== null, 'acepta O por 0 (error típico)');
ok(L.decode('12345') === null, 'rechaza tokens demasiado cortos');
ok(L.decode('') === null, 'rechaza vacío');

// ---------- URL ----------
console.log('\n[URL]');
HF.store.set('share_base', '');
const url = HF.shareUrl('seed', token);
ok(url === 'https://federati.org/?seed=' + token, 'url: ' + url);
ok(url.length <= 40, 'longitud total ' + url.length + ' caracteres (antes: códigos de cientos)');
HF.setShareBase('https://miespejo.example/juego/');
ok(HF.shareUrl('seed', token) === 'https://miespejo.example/juego/?seed=' + token, 'respeta la dirección guardada');
HF.store.del('share_base');

// ---------- URL → spec (como en el arranque) ----------
console.log('\n[arranque]');
global.location = { protocol: 'https:', hostname: 'federati.org', href: 'https://federati.org/?seed=' + token, search: '?seed=' + token, hash: '' };
global.window.location = global.location;
const spec2 = L.fromUrl();
ok(!!spec2, 'fromUrl() reconoce ?seed=');
ok(spec2.seed === spec.seed && spec2.size === spec.size && spec2.biome === spec.biome &&
   spec2.n === spec.n && spec2.fog === spec.fog && spec2.difficulty === spec.difficulty,
  'la spec reconstruida es idéntica a la compartida');

global.location = { protocol: 'https:', hostname: 'federati.org', href: 'https://federati.org/#seed=' + token, search: '', hash: '#seed=' + token };
global.window.location = global.location;
ok(!!L.fromUrl(), 'también acepta #seed= (enlaces antiguos)');

global.location = { protocol: 'https:', hostname: 'federati.org', href: 'https://federati.org/?seed=ZZZZZZZZZ', search: '?seed=ZZZZZZZZZ', hash: '' };
global.window.location = global.location;
ok(L.fromUrl() === null, 'un token corrupto no abre un mapa al azar');

// ---------- main.js: abre la partida sin pasar por el menú ----------
console.log('\n[main.js]');
global.location = { protocol: 'https:', hostname: 'federati.org', href: 'https://federati.org/?seed=' + token, search: '?seed=' + token, hash: '' };
global.window.location = global.location;
global.setTimeout = setTimeout;
global.addEventListener = () => { };
Object.defineProperty(global, 'navigator', { value: {}, configurable: true, writable: true });
global.document = { getElementById: () => null, addEventListener: () => { }, body: { classList: { add() { }, remove() { } } } };

let started = null, hub = 0;
global.window.HF = Object.assign({}, HF, {
  settings: () => ({ showLoreIntro: true }),
  go: () => { hub++; },
  startGame: g => { started = g; },
  makeGame: spec3 => ({ madeFrom: spec3 }),
  loadTribe: () => ({ name: 'Test' }),
  store: HF.store
});
global.window.HF.links = L;
eval(fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8'));
ok(hub === 0, 'no se abre el menú cuando hay un enlace de mapa');
ok(started && started.madeFrom && started.madeFrom.mode === 'skirmish', 'se inicia una escaramuza');
ok(started && started.madeFrom.seed === spec.seed, 'con la semilla del enlace (' + (started && started.madeFrom.seed) + ')');

console.log('\n' + (fails ? '=== CON FALLOS: ' + fails + ' ===' : '=== OK · enlaces cortos deterministas ==='));
process.exitCode = fails ? 1 : 0;
