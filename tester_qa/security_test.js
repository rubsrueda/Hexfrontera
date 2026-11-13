#!/usr/bin/env node
/**
 * tester_qa/security_test.js
 *
 * Endurecimiento del cliente + garantías del backend:
 *   · domain lock (hosts oficiales / clones / apps empaquetadas)
 *   · política de almacenamiento local
 *   · el cliente ya no expone la clave de recuperación ni escribe tablas directo
 *   · la fórmula de puntuación del servidor coincide con la de JS
 *   · el build ofuscado sigue siendo código válido y ejecutable
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

// ---------- stub mínimo de window ----------
const docHandlers = {};
global.document = {
  body: { appendChild() { }, classList: { add() { }, remove() { } } },
  createElement: () => ({ style: {}, setAttribute() { }, appendChild() { }, classList: { add() { }, remove() { } }, innerHTML: '' }),
  getElementById: () => null,
  addEventListener: (t, fn) => { (docHandlers[t] = docHandlers[t] || []).push(fn); }
};
global.location = { protocol: 'https:', hostname: 'federati.org', href: 'https://federati.org/index.html' };
global.window = { HF: {}, document: global.document, location: global.location, console };
// En Node 24 `navigator` es un getter: se redefine en vez de asignarse.
Object.defineProperty(global, 'navigator', { value: undefined, configurable: true, writable: true });

function load(p) {
  eval(fs.readFileSync(path.join(ROOT, p), 'utf8'));
}

console.log('=== security_test · endurecimiento ===');

// ---------- 1. domain lock ----------
console.log('\n[domain lock]');
load('js/config.js');       // security.js lee HF.CFG.security
load('js/security.js');
const S = global.window.HF.security;
const CFG = { allowedHosts: ['federati.org', 'www.federati.org', 'rubsrueda.github.io'], hardBlock: false };

ok(S.check({ protocol: 'https:', hostname: 'federati.org' }, CFG).allowed === true, 'dominio oficial permitido');
ok(S.check({ protocol: 'https:', hostname: 'www.federati.org' }, CFG).allowed === true, 'subdominio oficial permitido');
ok(S.check({ protocol: 'https:', hostname: 'federati.org.evil.com' }, CFG).allowed === false, 'dominio que imita al oficial rechazado');
ok(S.check({ protocol: 'https:', hostname: 'clon.random.io' }, CFG).allowed === false, 'clon en dominio ajeno bloqueado');
ok(S.check({ protocol: 'file:', hostname: '' }, CFG).allowed === true, 'file:// permitido (juego offline)');
ok(S.check({ protocol: 'app:', hostname: '' }, CFG).allowed === true, 'app:// permitido (Electron)');
ok(S.check({ protocol: 'https:', hostname: 'localhost' }, CFG).allowed === true, 'localhost permitido (desarrollo)');
ok(S.check({ protocol: 'https:', hostname: 'FEDERATI.ORG.' }, CFG).allowed === true, 'normaliza mayúsculas y punto final');
ok(S.check({ protocol: 'https:', hostname: 'rubsrueda.github.io' }, CFG).allowed === true, 'GitHub Pages antiguo sigue permitido');
ok(S.hostAllowed('evil.federati.org', CFG.allowedHosts) === true, 'subdominio propio aceptado por hostAllowed');
ok(S.hostAllowed('notfederati.org', CFG.allowedHosts) === false, 'sufijo falso rechazado');

// init() con el location stub (federati.org) no debe bloquear
S.init();
ok(S.locked === false, 'init() no bloquea en el dominio oficial');
ok(S.reason === 'oficial', 'motivo registrado: ' + S.reason);

// ---------- 2. política de almacenamiento ----------
console.log('\n[almacenamiento local]');
ok(S.isCosmetic('settings') === true, 'settings es cosmético (permitido)');
ok(S.isCosmetic('share_base') === true, 'share_base es cosmético (permitido)');
ok(S.isUntrusted('player_statistics') === true, 'estadísticas marcadas como no fiables');
ok(S.isUntrusted('campaign_progress') === true, 'progreso de campaña marcado como no fiable');
ok(S.isUntrusted('is_premium') === true, 'licencia local marcada como no fiable');
ok(S.scoreIsServerValidated() === true, 'las puntuaciones las valida el servidor');

// ---------- 3. el cliente ya no filtra la clave ni escribe tablas ----------
console.log('\n[cliente]');
const cloud = fs.readFileSync(path.join(ROOT, 'js/cloud.js'), 'utf8');
// Los comentarios sí pueden hablar de service_role; lo que importa es el código.
const cloudCode = cloud.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
ok(!/recovery_email=eq/.test(cloudCode), 'ya no se busca la cuenta por correo (evitaba robar secret_key)');
ok(!/hf_players\?[^`'"]*select=\*/.test(cloudCode), 'ninguna consulta a hf_players usa select=*');
ok(/fn_hf_submit_map_score/.test(cloudCode), 'las marcas van por fn_hf_submit_map_score');
ok(/fn_hf_upvote_map/.test(cloudCode), 'los votos van por fn_hf_upvote_map');
ok(/fn_hf_license/.test(cloudCode), 'la licencia se consulta al servidor (fn_hf_license)');
ok(/recover-request/.test(cloudCode) && /callFunction\('paypal'/.test(cloudCode), 'la recuperación pide las credenciales por la Edge Function');
ok(!/service_role/.test(cloudCode), 'cloud.js no usa service_role');
ok(/p_score/.test(cloudCode) && /kills/.test(cloudCode) && /deserts/.test(cloudCode), 'envía hechos de la partida para que el servidor recalcule');
ok(/blocked: true/.test(cloudCode), 'la red se corta si el dominio no está autorizado');

const game = fs.readFileSync(path.join(ROOT, 'js/game.js'), 'utf8');
ok(/kills: s\.kills \|\| 0/.test(game) && /lost: s\.lost \|\| 0/.test(game) && /deserts: s\.deserts \|\| 0/.test(game),
  'game.js envía kills/lost/deserts al marcador');

// ---------- 4. fórmula servidor == cliente ----------
console.log('\n[paridad de la fórmula de puntuación]');
const sql = fs.readFileSync(path.join(ROOT, 'sql/security_hardening.sql'), 'utf8');
const progress = fs.readFileSync(path.join(ROOT, 'js/progress.js'), 'utf8');

const scoreFn = /create or replace function public\.fn_hf_score[\s\S]*?\$\$;/.exec(sql);
ok(!!scoreFn, 'fn_hf_score existe en el SQL');
const body = scoreFn ? scoreFn[0] : '';
[10000, 50, 200, 100, 150, 400].forEach(n => {
  ok(new RegExp('\\b' + n + '\\b').test(body), 'SQL usa la constante ' + n);
});
ok(/greatest\(0, 50 - p_turns\)/.test(body), 'SQL limita el bono de turnos a >= 0 (igual que Math.max)');
ok(/Math\.max\(0, \(50 - g\.turn\) \* 200\)/.test(progress), 'JS aplica el mismo límite de turnos');
ok(/score \+= 10000/.test(progress) && /s\.kills \|\| 0\) \* 100/.test(progress) && /s\.lost \|\| 0\) \* 150/.test(progress),
  'JS suma victoria, bajas y pérdidas con los mismos pesos');

// ---------- 5. RLS y privilegios declarados ----------
console.log('\n[SQL de seguridad]');
['hf_players', 'hf_map_scores', 'hf_daily_scores', 'hf_community_maps', 'hf_online_matches'].forEach(t => {
  ok(new RegExp('alter table if exists public\\.' + t + '\\s+enable row level security').test(sql), 'RLS activado en ' + t);
});
ok(/revoke insert, update, delete, truncate on public\.hf_map_scores\s+from anon, authenticated/.test(sql),
  'escrituras directas revocadas en hf_map_scores');
ok(/revoke select on public\.hf_players from anon, authenticated/.test(sql), 'hf_players no es legible');
ok(/create policy hf_players_no_direct on public\.hf_players\s+for select using \(false\)/.test(sql), 'política de no-lectura en hf_players');
ok(/fn_hf_rate_limit/.test(sql) && /hf_rate_limits/.test(sql), 'rate limiting en servidor');
ok(/create table if not exists public\.hf_map_votes/.test(sql), 'votos: una fila por jugador y mapa');

// ---------- 6. build ofuscado (si existe) ----------
console.log('\n[build]');
const dist = path.join(ROOT, 'dist');
if (!fs.existsSync(dist)) {
  console.log('  ·  dist/ no existe: ejecuta `npm run build` (se omite esta parte)');
} else {
  const forbidden = /service_role|sb_secret_|SUPABASE_SERVICE_ROLE_KEY/;
  let leaked = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!/\.(js|html|json|css)$/.test(e.name)) continue;
      if (forbidden.test(fs.readFileSync(p, 'utf8'))) leaked.push(path.relative(dist, p));
    }
  })(dist);
  ok(leaked.length === 0, 'dist/ sin credenciales de servidor' + (leaked.length ? ': ' + leaked.join(', ') : ''));

  const idx = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  ok(/name="hf-build"/.test(idx), 'index.html lleva sello de build');
  ok(!/sourceMappingURL/.test(idx), 'sin source maps en producción');

  // El código ofuscado debe seguir ejecutándose igual.
  global.window.HF = {};
  eval(fs.readFileSync(path.join(dist, 'js/config.js'), 'utf8'));
  eval(fs.readFileSync(path.join(dist, 'js/security.js'), 'utf8'));
  eval(fs.readFileSync(path.join(dist, 'js/util.js'), 'utf8'));
  const DHF = global.window.HF;
  ok(!!DHF.CFG && DHF.CFG.security.allowedHosts.indexOf('federati.org') >= 0, 'config ofuscado conserva allowedHosts');
  ok(DHF.security.check({ protocol: 'https:', hostname: 'clon.io' }, DHF.CFG.security).allowed === false,
    'security ofuscado sigue bloqueando clones');
  ok(DHF.normalizeShareBase('https://federati.org/') === 'https://federati.org/',
    'util ofuscado normaliza igual');
  ok(DHF.CFG.share.base === 'https://federati.org/', 'config ofuscado conserva el dominio público');
  const samples = ['js/screens.js', 'js/cloud.js', 'js/lore-screen/LoreScreen.js'].map(p => path.join(dist, p));
  samples.filter(p => fs.existsSync(p)).forEach(p => {
    const src = fs.readFileSync(p, 'utf8');
    ok(!/function LoreScreen|function submitMapScore/.test(src), 'sin nombres legibles en ' + path.basename(p));
  });
}

console.log('\n' + (fails ? '=== CON FALLOS: ' + fails + ' ===' : '=== OK · endurecimiento del cliente y del backend ==='));
process.exitCode = fails ? 1 : 0;
