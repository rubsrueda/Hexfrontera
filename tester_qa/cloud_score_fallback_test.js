'use strict';
// Fallback de envío de marca cuando el RPC endurecido no está desplegado:
// la tabla antigua hf_map_scores no tiene kills/lost/deserts y el POST directo
// debe limitarse a sus columnas reales.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const calls = [];
const sandbox = {
  console, Date, Math, JSON, Promise,
  setTimeout, clearTimeout, setInterval, clearInterval,
  navigator: { onLine: true, language: 'es' },
  localStorage: null,
  location: { protocol: 'https:', hostname: 'federati.org', href: 'https://federati.org/' },
  document: { addEventListener() { }, removeEventListener() { }, visibilityState: 'visible' },
  btoa: s => Buffer.from(String(s), 'binary').toString('base64'),
  atob: s => Buffer.from(String(s), 'base64').toString('binary'),
  fetch(url, opts) {
    calls.push({ url: String(url), opts: opts || {}, body: opts && opts.body });
    if (/\/rpc\/fn_hf_submit_map_score/.test(url)) {
      // RPC no desplegado: PostgREST responde 400.
      return Promise.resolve({
        ok: false, status: 400,
        text: () => Promise.resolve(JSON.stringify({ message: 'Could not find the function public.fn_hf_submit_map_score' }))
      });
    }
    if (/\/hf_map_scores\?map_key=eq\./.test(url)) {
      // Consulta previa: todavía no hay fila.
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('[]') });
    }
    if (/\/hf_map_scores\?on_conflict=/.test(url)) {
      return Promise.resolve({ ok: true, status: 201, text: () => Promise.resolve(JSON.stringify([{ player_id: 'p1' }])) });
    }
    return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('{}') });
  }
};
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ['util.js', 'config.js', 'data.js', 'i18n.js', 'cloud.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox);
}
const HF = sandbox.HF;

let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };

HF.store.set('cloud_registered', true);
HF.store.set('player_id', 'p1');
HF.store.set('secret_key', 's1');

(async () => {
  const r = await HF.cloud.submitMapScore({
    map_key: 'm1', player_id: 'p1', tribe_name: 'Tótem de Llama', crest: 'c01',
    color_hex: '#3b82f6', turns: 12, score: 1234, surplus: 200, won: true,
    kills: 8, lost: 3, deserts: 1
  });
  ok(r && r.ok === true, 'el fallback directo guarda la marca sin RPC');
  const post = calls.find(c => /\/hf_map_scores\?on_conflict=/.test(c.url));
  ok(!!post, 'se hace el POST directo a hf_map_scores');
  const body = post && typeof post.body === 'string' ? JSON.parse(post.body) : (post && post.body) || {};
  ok(!('deserts' in body) && !('kills' in body) && !('lost' in body), 'el body no envía kills/lost/deserts');
  ok(body.map_key === 'm1' && body.player_id === 'p1' && body.score === 1234 && body.surplus === 200 && body.won === true, 'el body conserva las columnas reales de la tabla');
  ok(body.tribe_name === 'Tótem de Llama' && body.crest === 'c01' && body.color_hex === '#3b82f6' && body.turns === 12, 'el body conserva tribu, blasón, color y turnos');
  console.log('\n' + (fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK'));
  process.exit(fail ? 1 : 0);
})().catch(e => {
  console.error('FAIL: excepción', e);
  process.exit(1);
});
