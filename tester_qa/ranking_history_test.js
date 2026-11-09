'use strict';
// Ranking unificado en Stats + posición real aunque el jugador quede fuera del Top 100.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function FakeEl(html) {
  this._html = '';
  this._nodes = new Map();
  this._fc = null;
  this.classList = { add() { }, remove() { }, toggle() { } };
  this.style = {};
  this.dataset = {};
  this.isConnected = true;
  this.innerHTML = html || '';
}
Object.defineProperty(FakeEl.prototype, 'innerHTML', {
  get() { return this._html; },
  set(v) { this._html = String(v); this._nodes.clear(); this._fc = null; }
});
Object.defineProperty(FakeEl.prototype, 'firstChild', {
  get() { if (!this._fc) this._fc = new FakeEl(this._html); return this._fc; }
});
FakeEl.prototype._node = function (id) {
  if (!this._nodes.has(id)) {
    const n = new FakeEl();
    n.id = id;
    n.onclick = null;
    n.onchange = null;
    n.oninput = null;
    n.onkeydown = null;
    n.value = '';
    n.textContent = '';
    n.disabled = false;
    n.clientWidth = 160;
    n.getContext = () => ({
      setTransform() { }, clearRect() { }, beginPath() { }, arc() { }, stroke() { },
      fill() { }, fillText() { }, measureText() { return { width: 10 }; },
      set lineWidth(v) { }, set lineCap(v) { }, set strokeStyle(v) { },
      set fillStyle(v) { }, set textAlign(v) { }, set textBaseline(v) { }, set font(v) { }
    });
    n.focus = function () { };
    this._nodes.set(id, n);
  }
  return this._nodes.get(id);
};
FakeEl.prototype.querySelector = function (sel) {
  if (sel === '[data-back]') return this._node('back');
  if (sel.charAt(0) === '#' && this._html.indexOf('id="' + sel.slice(1) + '"') >= 0) return this._node(sel.slice(1));
  if (sel.charAt(0) === '.') {
    const cls = sel.slice(1);
    if (new RegExp('class="[^"]*\\b' + cls + '\\b[^"]*"').test(this._html)) return this._node('.' + cls);
  }
  return null;
};
FakeEl.prototype.querySelectorAll = function () { return []; };
FakeEl.prototype.addEventListener = function () { };
FakeEl.prototype.removeEventListener = function () { };

const appEl = new FakeEl();
const modalEl = new FakeEl();
const toastEl = new FakeEl();
const doc = {
  querySelector(sel) {
    if (sel === '#app') return appEl;
    if (sel === '#modal') return modalEl;
    if (sel === '#toast') return toastEl;
    return null;
  },
  querySelectorAll() { return []; },
  getElementById(id) {
    if (id === 'app') return appEl;
    if (id === 'modal') return modalEl;
    if (id === 'toast') return toastEl;
    return null;
  },
  createElement() { return new FakeEl(); },
  addEventListener() { }, removeEventListener() { },
  documentElement: { lang: 'es', dir: 'ltr' },
  body: { classList: { add() { }, remove() { }, toggle() { } }, style: {} },
  visibilityState: 'visible', hidden: false
};

const sandbox = {
  console, document: doc, window: null,
  navigator: { onLine: false, language: 'es' },
  localStorage: null, setTimeout, clearTimeout, setInterval, clearInterval,
  performance: { now: () => Date.now() },
  confirm: () => false,
  fetch: () => Promise.resolve({ ok: false, status: 0, text: () => Promise.resolve(''), json: () => Promise.resolve({}) })
};
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ['util.js', 'config.js', 'data.js', 'i18n.js', 'names.js', 'cloud.js', 'progress.js', 'screens.js', 'replays.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox);
}
const HF = sandbox.HF;

let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  HF.store.set('settings', { lang: 'es' });

  // ---------------------------------------------------------------------------
  // 1. Hub: sin botón Ranking; Stats sigue siendo la entrada.
  // ---------------------------------------------------------------------------
  console.log('\n[hub]');
  HF.go('hub');
  let html = appEl.innerHTML;
  ok(html.indexOf('id="ranking"') < 0, 'el Hub ya no duplica el botón Ranking');
  ok(html.indexOf('id="stats"') >= 0 && html.indexOf('art/boton-estadisticas.png') >= 0, 'Stats sigue en el dock');
  ok(html.indexOf('id="hist"') < 0 && html.indexOf('id="standing"') < 0, 'sin historial ni tarjeta «Tu posición» en el Hub');

  // ---------------------------------------------------------------------------
  // 2. Stats contiene el ranking y el historial.
  // ---------------------------------------------------------------------------
  console.log('\n[stats]');
  sandbox.navigator.onLine = true;
  const rows = [
    { player_id: 'otro', tribe_name: 'Otro', crest: 'c01', map_key: 'm1', turns: 10, score: 9000, won: true },
    { player_id: 'otro2', tribe_name: 'Otro 2', crest: 'c02', map_key: 'm2', turns: 12, score: 8000, won: true }
  ];
  HF.cloud.getGlobalTop = () => Promise.resolve(rows);
  HF.cloud.getPlayerStanding = () => Promise.resolve({
    ok: true, rank: 0, total: 500, capped: true,
    best: { score: 1234 }, maps: 2
  });
  HF.go('stats');
  await wait(10);
  html = appEl.innerHTML;
  ok(html.indexOf('id="statsRanking"') >= 0, 'Stats inclúe a tarxeta de Ranking');
  ok(html.indexOf('id="statsRankBody"') >= 0 && html.indexOf('id="statsRankMe"') >= 0, 'Stats ten corpo e «Tu posición»');
  ok(html.indexOf('id="statsHistory"') >= 0 && html.indexOf('art/boton-mapa.png') >= 0, 'Stats inclúe o botón de historial co icono');
  ok(appEl.querySelector('#statsRankBody').innerHTML.indexOf('Otro') >= 0, 'pinta o Top mundial dentro de Stats');
  const me = appEl.querySelector('#statsRankMe').innerHTML;
  ok(me.indexOf('Mejor marca') >= 0 && me.indexOf('1,234') >= 0, 'amosa a mellor marca aínda que quede fóra do Top 100');
  ok(me.indexOf('Juega una partida') < 0, 'non di «Juega una partida» se xa ten marca');

  // Historial desde Stats.
  appEl.querySelector('#statsHistory').onclick();
  ok(modalEl.innerHTML.indexOf('📜 Historial de partidas') >= 0, 'o botón de Stats abre o historial real');
  HF.closeModal();

  // ---------------------------------------------------------------------------
  // 3. Se xogou pero a marca non chegou: mensaxe distinta.
  // ---------------------------------------------------------------------------
  console.log('\n[sen marca]');
  HF.store.set('player_statistics', { games: 3 });
  HF.cloud.getPlayerStanding = () => Promise.resolve({ ok: true, rank: 0, total: 500, best: null, maps: 0 });
  HF.go('stats');
  await wait(10);
  let msg = appEl.querySelector('#statsRankMe').innerHTML;
  ok(msg.indexOf('Tu marca no aparece') >= 0 && msg.indexOf('Juega una partida') < 0, 'se xogou pero non hai marca, avisa do envío');

  HF.store.set('last_score_error', { at: Date.now(), msg: 'no autorizado' });
  HF.go('stats');
  await wait(10);
  msg = appEl.querySelector('#statsRankMe').innerHTML;
  ok(msg.indexOf('no autorizado') >= 0, 'se o servidor rexeitou a marca, amosa o motivo');
  HF.store.del('last_score_error');

  HF.store.set('last_score_error', { at: Date.now(), msg: '', status: 403 });
  HF.go('stats');
  await wait(10);
  msg = appEl.querySelector('#statsRankMe').innerHTML;
  ok(msg.indexOf('permisos') >= 0 && msg.indexOf('conexión') < 0, 'un 403 fala de permisos, non de conexión');
  HF.store.del('last_score_error');

  // Reintento desde Stats.
  HF.store.set('last_score_payload', { map_key: 'm1', player_id: 'me', turns: 10, score: 1234 });
  HF.cloud.submitMapScore = () => Promise.resolve({ ok: true });
  HF.go('stats');
  await wait(10);
  const retry = appEl.querySelector('#statsRetry');
  ok(!!retry && retry.style.display !== 'none', 'Stats amosa «Reintentar envío» se hai unha marca pendente');
  retry.onclick();
  await wait(10);
  ok(!HF.store.get('last_score_payload', null), 'o reintento Borra a marca pendente ao enviarse');

  HF.store.set('player_statistics', { games: 0 });
  HF.go('stats');
  await wait(10);
  msg = appEl.querySelector('#statsRankMe').innerHTML;
  ok(msg.indexOf('Juega una partida') >= 0, 'sen partidas si invita a xogar');

  // ---------------------------------------------------------------------------
  // 4. Ranking segue dispoñible como modal (compatibilidade).
  // ---------------------------------------------------------------------------
  console.log('\n[modal]');
  HF.store.set('player_statistics', { games: 0 });
  HF.rankingModal();
  ok(modalEl.innerHTML.indexOf('id="rkBody"') >= 0 && modalEl.innerHTML.indexOf('id="rkHistory"') >= 0, 'o modal antigo segue funcionando');
  HF.closeModal();

  // ---------------------------------------------------------------------------
  // 5. Tradución.
  // ---------------------------------------------------------------------------
  HF.store.set('settings', { lang: 'en' });
  HF.go('stats');
  await wait(10);
  html = appEl.innerHTML;
  ok(html.indexOf('Ranking') >= 0 && html.indexOf('Match history') >= 0, 'Stats traduce Ranking e Match history');
  HF.store.set('settings', { lang: 'es' });

  console.log('\n' + (fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK'));
  process.exit(fail ? 1 : 0);
})().catch(e => {
  console.error('FAIL: excepción', e);
  process.exit(1);
});
