#!/usr/bin/env node
/**
 * tester_qa/short_map_link_test.js
 *
 * Enlaces cortos de mapas del editor: federati.org/?m=X9K2A
 *   · SQL: tabla, RLS, sin acceso directo, dedupe, colisiones, límites
 *   · cliente: forma de la URL, parseo del enlace, RPC y caché offline
 *   · arranque: resolveShortMap → openSharedMap; y camino de error → menú
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
const wait = ms => new Promise(r => setTimeout(r, ms));

console.log('=== short_map_link_test · mapas del editor ===');

// ---------------------------------------------------------------------------
// 1. SQL
// ---------------------------------------------------------------------------
console.log('\n[SQL]');
const sql = fs.readFileSync(path.join(ROOT, 'sql/short_links.sql'), 'utf8');
ok(/create table if not exists public\.hf_map_links/.test(sql), 'tabla hf_map_links');
ok(/code\s+text primary key/.test(sql), 'código como clave primaria (sin duplicados)');
ok(/map_code\s+text not null/.test(sql), 'guarda el código completo del mapa');
ok(/alter table public\.hf_map_links enable row level security/.test(sql), 'RLS activado');
ok(/create policy hf_map_links_none[\s\S]{0,80}using \(false\) with check \(false\)/.test(sql), 'política que niega todo al cliente');
ok(/revoke all on public\.hf_map_links from anon, authenticated/.test(sql), 'sin acceso directo a la tabla');
ok(/fn_hf_auth\(p_player, p_secret\)/.test(sql), 'crear enlace exige identidad válida');
ok(/fn_hf_rate_limit\('short:' \|\| p_player, 20, 3600\)/.test(sql), 'rate limit al crear (20/h)');
ok(/fn_hf_rate_limit\('resolve:' \|\| v_code, 600, 3600\)/.test(sql), 'rate limit al resolver (600/h por código)');
ok(/l\.player_id = p_player and l\.map_code = p_code/.test(sql), 'dedupe: mismo jugador + mismo mapa → mismo enlace');
ok(/exception when unique_violation/.test(sql), 'reintenta si el código está ocupado');
ok(/for v_try in 1\.\.12 loop/.test(sql), '12 intentos con 5 caracteres');
ok(/fn_hf_short_code\(6\)/.test(sql), 'y 6 caracteres como último recurso');
ok(/0123456789ABCDEFGHJKMNPQRSTVWXYZ/.test(sql), 'alfabeto sin caracteres ambiguos');
ok(/grant execute on function public\.fn_hf_shorten_map\(text, text, text, text\) to anon/.test(sql), 'RPC de creación expuesta');
ok(/grant execute on function public\.fn_hf_resolve_map\(text\) to anon/.test(sql), 'RPC de resolución expuesta');
ok(/revoke all on function public\.fn_hf_short_code/.test(sql), 'generador cerrado al cliente');
ok(/upper\(regexp_replace/.test(sql), 'resolución tolerante a minúsculas y guiones');

// ---------------------------------------------------------------------------
// 2. URL y parseo
// ---------------------------------------------------------------------------
console.log('\n[URL]');
const lsData = {};
global.window = {
  HF: {},
  localStorage: {
    getItem: k => (Object.prototype.hasOwnProperty.call(lsData, k) ? lsData[k] : null),
    setItem: (k, v) => { lsData[k] = String(v); },
    removeItem: k => { delete lsData[k]; }
  },
  location: { protocol: 'https:', hostname: 'federati.org', href: 'https://federati.org/', search: '', hash: '' },
  console
};
Object.defineProperty(global, 'navigator', { value: {}, configurable: true, writable: true });

function load(p) { eval(fs.readFileSync(path.join(ROOT, p), 'utf8')); }
load('js/config.js');
load('js/data.js');
load('js/util.js');
load('js/links.js');
const HF = global.window.HF;

const url = HF.shareUrl('m', 'X9K2A');
ok(url === 'https://federati.org/?m=X9K2A', 'url corta: ' + url);
ok(url.length <= 32, 'longitud total ' + url.length + ' caracteres');
ok(HF.links.shortMapUrl('x9k2a') === url, 'normaliza a mayúsculas al construir la url');

function withUrl(search, hash) {
  global.location = { protocol: 'https:', hostname: 'federati.org', href: 'https://federati.org/' + (search || hash), search: search || '', hash: hash || '' };
  global.window.location = global.location;
}
withUrl('?m=X9K2A');
ok(HF.links.shortMapFromUrl() === 'X9K2A', 'lee ?m=XXXXX');
withUrl('', '#m=X9K2A');
ok(HF.links.shortMapFromUrl() === 'X9K2A', 'lee #m=XXXXX');
withUrl('?m=x9k2a');
ok(HF.links.shortMapFromUrl() === 'X9K2A', 'normaliza minúsculas');
withUrl('?mapa=ABC123');
ok(HF.links.shortMapFromUrl() === 'ABC123', 'acepta ?mapa=');
withUrl('?seed=ABCDEFGH');
ok(HF.links.shortMapFromUrl() === null, 'no confunde ?seed= con ?m=');
withUrl('?m=AB');
ok(HF.links.shortMapFromUrl() === null, 'rechaza códigos demasiado cortos');
withUrl('');
ok(HF.links.shortMapFromUrl() === null, 'sin parámetro devuelve null');

// ---------------------------------------------------------------------------
// 3. cloud.js: RPC y caché
// ---------------------------------------------------------------------------
console.log('\n[cliente]');
let calls = [];
let rpcReply = { ok: true, status: 200, text: async () => JSON.stringify({ ok: true, code: 'X9K2A' }) };
function setFetch(fn) { global.fetch = fn; global.window.fetch = fn; }
setFetch(async (u, o) => {
  calls.push({ url: String(u), body: o && o.body ? JSON.parse(o.body) : null });
  return rpcReply;
});
global.AbortController = function () { this.abort = () => { }; };
global.window.AbortController = global.AbortController;
global.setTimeout = setTimeout;
global.clearTimeout = clearTimeout;
global.window.setTimeout = setTimeout;
global.window.clearTimeout = clearTimeout;

global.window.HF = Object.assign({}, HF, {
  CFG: HF.CFG,
  security: { locked: false },
  store: HF.store,
  loadTribe: () => ({ name: 'Test', color: '#fff', crest: 'c1' }),
  getStats: () => ({}),
  genTribeName: () => 'Test'
});
global.window.HF.CFG.security = { strictServerValidation: true };
eval(fs.readFileSync(path.join(ROOT, 'js/cloud.js'), 'utf8'));
const C = global.window.HF.cloud;

(async () => {
  calls = []; rpcReply = { ok: true, status: 200, text: async () => JSON.stringify({ ok: true, code: 'x9k2a' }) };
  const short = await C.shortenMap('v1:7:123:abc', 'Mi mapa');
  ok(short.ok === true && short.code === 'X9K2A', 'shortenMap devuelve el código en mayúsculas');
  ok(calls.length === 1 && calls[0].url.indexOf('/rpc/fn_hf_shorten_map') >= 0, 'llama a fn_hf_shorten_map');
  ok(calls[0].body.p_code === 'v1:7:123:abc' && calls[0].body.p_name === 'Mi mapa', 'envía el código y el nombre');
  ok(typeof calls[0].body.p_player === 'string' && typeof calls[0].body.p_secret === 'string', 'envía identidad');

  const bad = await C.shortenMap('no-es-un-mapa');
  ok(bad.ok === false, 'rechaza códigos que no son v1:');

  // Resolución + caché
  calls = []; rpcReply = { ok: true, status: 200, text: async () => JSON.stringify({ ok: true, code: 'v1:9:55:zzz', name: 'Compartido' }) };
  const r1 = await C.resolveShortMap('x9k2a');
  ok(r1.ok && r1.code === 'v1:9:55:zzz', 'resolveShortMap devuelve el código completo');
  ok(calls[0].body.p_code === 'X9K2A', 'normaliza el código antes de resolver');

  // Ahora sin red: debe salir de la caché local
  calls = [];
  setFetch(async () => { throw new Error('offline'); });
  const r2 = await C.resolveShortMap('X9K2A');
  ok(r2.ok && r2.code === 'v1:9:55:zzz' && r2.cached === true, 'el segundo intento funciona sin red (caché)');
  ok(calls.length === 0, 'no se llamó a la red');

  setFetch(async (u, o) => {
    calls.push({ url: String(u), body: o && o.body ? JSON.parse(o.body) : null });
    return rpcReply;
  });

  // -------------------------------------------------------------------------
  // 4. Arranque con ?m=
  // -------------------------------------------------------------------------
  console.log('\n[arranque]');
  withUrl('?m=X9K2A');
  global.document = { getElementById: () => null, addEventListener: () => { }, body: { classList: { add() { }, remove() { } } } };
  global.setTimeout = setTimeout;
  global.addEventListener = () => { };
  global.window.addEventListener = () => { };

  let opened = null, hub = 0;
  global.window.HF = Object.assign({}, HF, {
    settings: () => ({ showLoreIntro: true }),
    go: () => { hub++; },
    openSharedMap: code => { opened = code; },
    startGame: () => { },
    makeGame: () => ({}),
    loadTribe: () => ({ name: 'Test' }),
    store: HF.store,
    links: HF.links,
    toast: () => { },
    cloud: { resolveShortMap: () => Promise.resolve({ ok: true, code: 'v1:9:55:zzz' }) }
  });
  eval(fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8'));
  await wait(30);
  ok(hub === 0, 'con ?m= no se abre el menú');
  ok(opened === 'v1:9:55:zzz', 'abre la ficha del mapa con el código resuelto');

  // Camino de error: enlace inexistente → menú
  hub = 0; opened = null;
  global.window.HF = Object.assign({}, HF, {
    settings: () => ({ showLoreIntro: true }),
    go: () => { hub++; },
    openSharedMap: code => { opened = code; },
    startGame: () => { },
    makeGame: () => ({}),
    loadTribe: () => ({ name: 'Test' }),
    store: HF.store,
    links: HF.links,
    toast: () => { },
    cloud: { resolveShortMap: () => Promise.resolve({ ok: false, msg: 'no encontrado' }) }
  });
  withUrl('?m=ZZZZZ');
  eval(fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8'));
  await wait(30);
  ok(opened === null && hub === 1, 'un código inexistente vuelve al menú');

  console.log('\n' + (fails ? '=== CON FALLOS: ' + fails + ' ===' : '=== OK · enlaces cortos de mapas del editor ==='));
  process.exitCode = fails ? 1 : 0;
})();
