#!/usr/bin/env node
/**
 * tester_qa/share_base_test.js
 *
 * Enlaces para compartir: dominio público (HF.CFG.share) y migración de
 * dominios antiguos guardados en el dispositivo.
 * Sin navegador: se evalúan js/config.js y js/util.js con un window simulado.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const EXPECTED = 'https://federati.org/';
const LEGACY = 'https://rubsrueda.github.io/Hexfrontera/';

// ---------- almacenamiento simulado (localStorage) ---------------------------
const lsData = {};
const localStorage = {
  getItem: k => (Object.prototype.hasOwnProperty.call(lsData, k) ? lsData[k] : null),
  setItem: (k, v) => { lsData[k] = String(v); },
  removeItem: k => { delete lsData[k]; }
};

global.window = {
  HF: {},
  localStorage,
  location: { protocol: 'https:', href: EXPECTED + 'index.html' },
  navigator: {}
};

eval(fs.readFileSync(path.join(ROOT, 'js', 'config.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT, 'js', 'util.js'), 'utf8'));

const HF = global.window.HF;
let fails = 0;
const ok = (cond, msg) => {
  if (!cond) fails++;
  console.log((cond ? '  ok   ' : '  FAIL ') + msg);
};

console.log('=== share_base_test · enlaces para compartir ===');

console.log('\n[configuración]');
ok(!!HF.CFG && !!HF.CFG.share, 'HF.CFG.share existe');
ok(HF.CFG.share.base === EXPECTED, 'base = ' + EXPECTED + ' (leído: ' + HF.CFG.share.base + ')');
ok(Array.isArray(HF.CFG.share.legacy) && HF.CFG.share.legacy.indexOf(LEGACY) >= 0,
  'legacy incluye el dominio antiguo');

console.log('\n[normalización]');
ok(HF.CFG.share.base.charAt(HF.CFG.share.base.length - 1) === '/',
  'el base de config termina en "/" (enlaces: ' + HF.CFG.share.base + '#map=…)');
ok(HF.normalizeShareBase('https://federati.org/') === EXPECTED, 'normaliza el dominio nuevo');
ok(HF.normalizeShareBase('  https://federati.org/juego/  ') === 'https://federati.org/juego/', 'recorta espacios');
ok(HF.normalizeShareBase('https://federati.org/?x=1#y') === EXPECTED, 'quita query y hash');
ok(HF.normalizeShareBase('federati.org') === '', 'rechaza direcciones sin http(s)');
ok(HF.normalizeShareBase('') === '', 'rechaza vacío');

console.log('\n[dominio efectivo]');
HF.store.del('share_base');
ok(HF.shareBase() === EXPECTED, 'sin preferencia guardada usa el base de config');

console.log('\n[migración de dominio antiguo]');
HF.store.set('share_base', LEGACY);
ok(HF.migrateShareBase() === true, 'detecta la dirección antigua y migra');
ok(HF.shareBase() === EXPECTED, 'shareBase() devuelve el dominio nuevo');
ok(HF.store.get('share_base', '') === EXPECTED, 'la preferencia guardada queda actualizada');

HF.store.set('share_base', 'https://miespejo.example/juego/');
ok(HF.migrateShareBase() === false, 'una dirección propia (no legacy) NO se toca');
ok(HF.shareBase() === 'https://miespejo.example/juego/', 'se respeta la elección del jugador');

console.log('\n[enlaces generados]');
HF.store.del('share_base');
const mapUrl = HF.shareUrl('map', 'v1:7:123:abc');
ok(mapUrl === EXPECTED + '#map=v1%3A7%3A123%3Aabc', 'enlace de mapa: ' + mapUrl);
const repUrl = HF.shareUrl('replay', 'R1|X');
ok(repUrl.indexOf(EXPECTED + '#replay=') === 0, 'enlace de repetición: ' + repUrl);
ok(HF.shareUrl('map', '') === '', 'sin valor no genera enlace');

console.log('\n[ajustes: guardar la dirección desde la UI]');
HF.setShareBase('https://federati.org');
ok(HF.shareBase() === 'https://federati.org', 'setShareBase persiste lo que escribe el jugador (leído: ' + HF.shareBase() + ')');
HF.setShareBase('');
ok(HF.shareBase() === EXPECTED, 'al borrarla vuelve al base de config');

console.log('\n' + (fails ? '=== CON FALLOS: ' + fails + ' ===' : '=== OK · dominio público y migración correctos ==='));
process.exitCode = fails ? 1 : 0;
