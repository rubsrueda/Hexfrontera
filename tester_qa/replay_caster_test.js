'use strict';
// Replay Audio Caster (catálogo obrigatorio): 9 fitos, 13 idiomas, voz,
// sincronización pausa/fala/reanuda, resumo final e ausencia de texto.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };
const wait = ms => new Promise(r => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Sandbox mínimo + TTS de proba
// ---------------------------------------------------------------------------
const spoken = [];
let canceled = 0;
const sandbox = {
  console, Date, Math, JSON, Promise,
  setTimeout, clearTimeout, setInterval, clearInterval,
  navigator: { onLine: false, language: 'es' },
  localStorage: null,
  location: { protocol: 'https:', hostname: 'federati.org', href: 'https://federati.org/', search: '', hash: '' },
  document: { addEventListener() { }, removeEventListener() { }, visibilityState: 'visible' },
  btoa: s => Buffer.from(String(s), 'binary').toString('base64'),
  atob: s => Buffer.from(String(s), 'base64').toString('binary'),
  speechSynthesis: {
    getVoices: () => [{ name: 'Jorge', lang: 'es-ES' }, { name: 'Samantha', lang: 'en-US' }],
    speak(u) { spoken.push(u); setTimeout(() => { if (u.onend) u.onend(); }, 0); },
    cancel() { canceled++; }
  }
};
sandbox.SpeechSynthesisUtterance = function (text) { this.text = text; };
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ['util.js', 'config.js', 'data.js', 'i18n.js', 'links.js', 'replay.js', 'replay-caster-langs.js', 'replay-caster.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'), sandbox);
}
const HF = sandbox.HF;

function mkF(name, extra) {
  return Object.assign({
    alive: true, name: name, terr: 0, units: 0, cities: 0, bastions: 0,
    gold: 0, food: 0, wood: 0, deficit: false, keyGold: 0, keyWood: 0
  }, extra || {});
}
function mkCell(o, extra) {
  return Object.assign({ o: o, b: 0, cap: false, res: 0, u: null }, extra || {});
}
function mkState(f, cells, extra) {
  return Object.assign({ turn: 1, cur: 0, over: null, encircled: [], f: f, cells: cells }, extra || {});
}
const clone = x => JSON.parse(JSON.stringify(x));

// ---------------------------------------------------------------------------
// 1. Banco de relato: 13 idiomas e os 9 fitos obrigatorios
// ---------------------------------------------------------------------------
console.log('\n[idiomas]');
const LANGS = ['es', 'en', 'zh', 'hi', 'fr', 'ar', 'bn', 'pt', 'ru', 'de', 'ja', 'ko', 'it'];
const TYPES = ['supply', 'expansion', 'keyPoints', 'siege', 'massacre', 'cityFall', 'rhythm', 'pyrrhic', 'finalSummary'];
ok(Object.keys(HF.replayCaster.tags).length === 13, '13 idiomas con etiqueta BCP-47');
for (const code of LANGS) {
  let okAll = true;
  for (const type of TYPES) {
    const line = HF.replayCaster.lineFor(code, {
      type: type, actor: 'Ana', victim: 'Boris', unitType: 'INF', placeType: 'city',
      turn: 7, at: 2, gain: 3, key: 2, lost: 2,
      hexes: 6, recursos: 150, perdidas: 4, perdidasFacción: 2,
      wcities: 3, lcities: 1, wgold: 100, wfood: 50, wwood: 20,
      lgold: 10, lfood: 5, lwood: 2, wunits: 9, lunits: 3
    });
    if (!line || /[{}]/.test(line) || line.length < 10) okAll = false;
  }
  ok(okAll, 'el ' + code + ' ten os 9 fitos completos e sen placeholders');
}
ok(HF.replayCaster.lineFor('xx', { type: 'supply', actor: 'A', victim: 'B', at: 1 }).length > 0, 'un idioma descoñecido cae a inglés');
ok(HF.replayCaster.places.es.city === 'la ciudad' && HF.replayCaster.places.en.bastion === 'the bastion', 'os lugares (cidade/bastión) están traducidos');
const expansionLine = HF.replayCaster.lineFor('es', {
  type: 'expansion', actor: 'Ana', gain: 4, cities: 2, gold: 80, food: 40, wood: 15, units: 6, hexes: 5, recursos: 135, perdidas: 4, at: 1
});
ok(/2 ciudades/.test(expansionLine) && /80/.test(expansionLine) && /40/.test(expansionLine) && /15/.test(expansionLine) && /6 tropas/.test(expansionLine), 'o relato de expansión di cidades e recursos ao peche');
ok(/5 hexágonos/.test(expansionLine) && /135 recursos/.test(expansionLine), 'o relato usa os totais de hexágonos e recursos');
ok(/4 bajas/.test(expansionLine), 'o relato de expansión di as unidades perdidas no turno');

// ---------------------------------------------------------------------------
// 2. Instantánea: recursos, cidades, puntos clave e unidades
// ---------------------------------------------------------------------------
console.log('\n[instantánea]');
const snapGame = mkState(
  [mkF('Ana', { gold: 40, food: 12, wood: 8, deficit: true }), mkF('Boris')],
  [
    mkCell(0, { b: HF.B.CIUDAD }),
    mkCell(0, { res: HF.RES.ORO }),
    mkCell(0, { b: HF.B.ARBOL, res: HF.RES.MADERA }),
    mkCell(0, { u: { owner: 0, type: 'INF', tier: 1 } }),
    mkCell(1, { b: HF.B.BASTION })
  ]
);
const snap = HF.replayCaster.snapshot(snapGame);
ok(snap.f[0].cities === 1 && snap.f[0].bastions === 0, 'conta cidades por facción');
ok(snap.f[0].keyGold === 1 && snap.f[0].keyWood === 1, 'conta yacimientos de ouro e bosque de madeira');
ok(snap.f[0].units === 1 && snap.f[0].gold === 40 && snap.f[0].food === 12 && snap.f[0].wood === 8, 'conta unidades e recursos');
ok(snap.f[0].recursos === 60 && snap.f[0].hexes === 4, 'suma recursos (ouro+trigo+madera) e hexágonos por xogador');
ok(snap.f[0].deficit === true, 'snapshot conserva o flag de déficit');

// ---------------------------------------------------------------------------
// 3. Detección militar: cidade/bastión, masacre, cerco e movemento rutineiro
// ---------------------------------------------------------------------------
console.log('\n[detección]');
const baseBefore = mkState([mkF('Ana'), mkF('Boris')], [mkCell(-1, {}), mkCell(1, { b: HF.B.CIUDAD, cap: true })]);

let after = mkState([mkF('Ana'), mkF('Boris')], [mkCell(-1, {}), mkCell(0, { b: HF.B.CIUDAD, cap: true })]);
let ev = HF.replayCaster.detect(baseBefore, after, [1, 0, 1], 1);
ok(ev && ev.type === 'cityFall' && ev.placeType === 'capital' && ev.actor === 'Ana' && ev.victim === 'Boris', 'detecta caída da capital');

const cityBefore = mkState([mkF('Ana'), mkF('Boris')], [mkCell(-1, {}), mkCell(1, { b: HF.B.CIUDAD, cap: false })]);
after = mkState([mkF('Ana'), mkF('Boris')], [mkCell(-1, {}), mkCell(0, { b: HF.B.CIUDAD, cap: false })]);
ev = HF.replayCaster.detect(cityBefore, after, [1, 0, 1], 2);
ok(ev && ev.type === 'cityFall' && ev.placeType === 'city', 'detecta caída de cidade');

const bastBefore = mkState([mkF('Ana'), mkF('Boris')], [mkCell(-1, {}), mkCell(1, { b: HF.B.BASTION })]);
after = mkState([mkF('Ana'), mkF('Boris')], [mkCell(-1, {}), mkCell(0, { b: HF.B.BASTION })]);
ev = HF.replayCaster.detect(bastBefore, after, [1, 0, 1], 3);
ok(ev && ev.type === 'cityFall' && ev.placeType === 'bastion', 'detecta caída de bastión');

const killBefore = mkState([mkF('Ana'), mkF('Boris')], [mkCell(-1, {}), mkCell(1, { u: { owner: 1, type: 'INF', tier: 1 } })]);
after = mkState([mkF('Ana'), mkF('Boris')], [mkCell(-1, {}), mkCell(0, { u: { owner: 0, type: 'INF', tier: 1 } })]);
ev = HF.replayCaster.detect(killBefore, after, [1, 0, 1], 4);
ok(ev && ev.type === 'massacre' && ev.actor === 'Ana' && ev.victim === 'Boris' && ev.unitType === 'INF', 'detecta masacre dunha unidade');

const moveBefore = mkState([mkF('Ana'), mkF('Boris')], [
  mkCell(0, { u: { owner: 0, type: 'INF', tier: 1 } }), mkCell(-1, {})
]);
after = mkState([mkF('Ana'), mkF('Boris')], [
  mkCell(0, {}), mkCell(0, { u: { owner: 0, type: 'INF', tier: 1 } })
]);
ev = HF.replayCaster.detect(moveBefore, after, [1, 0, 1], 5);
ok(ev === null, 'un movemento rutineiro non se relata');

const siegeBefore = mkState([mkF('Ana'), mkF('Boris')], [mkCell(-1, {}), mkCell(1, {})], { encircled: [] });
after = mkState([mkF('Ana'), mkF('Boris')], [mkCell(-1, {}), mkCell(1, {})], { encircled: [{ cell: 1, owner: 1, type: 'ARC', tier: 2 }] });
ev = HF.replayCaster.detect(siegeBefore, after, [1, 0, 1], 6);
ok(ev && ev.type === 'siege' && ev.victim === 'Boris' && ev.unitType === 'ARC', 'detecta cerco/ratonera');

const phaseBefore = mkState([mkF('Ana'), mkF('Boris')], [mkCell(-1, {}), mkCell(1, { u: { owner: 1, type: 'SIE', tier: 2 } })]);
after = mkState([mkF('Ana'), mkF('Boris')], [mkCell(-1, {}), mkCell(1, {})]);
ev = HF.replayCaster.detect(phaseBefore, after, [4], 7);
ok(ev && ev.type === 'massacre' && ev.unitType === 'SIE', 'detecta unidade borrada nunha fase');

// ---------------------------------------------------------------------------
// 4. Resumo de turno: suministro, expansión, puntos, ritmo e victoria pírrica
// ---------------------------------------------------------------------------
console.log('\n[resumo de turno]');
function phase(p0f, afterf, passive) {
  const p0 = mkState([mkF('Ana', p0f), mkF('Boris')], []);
  const af = mkState([mkF('Ana', afterf), mkF('Boris')], []);
  return HF.replayCaster.phaseSummary(p0, af, 0, passive, 10);
}
ev = phase({ terr: 2, units: 5, keyGold: 1 }, { terr: 2, units: 5, keyGold: 1, deficit: true });
ok(ev && ev.type === 'supply' && ev.victim === 'Ana', 'detecta bloqueo de suministros');
ev = phase({ terr: 2, units: 5, keyGold: 1 }, { terr: 5, units: 6, keyGold: 1, cities: 2, gold: 80, food: 40, wood: 15 });
ok(ev && ev.type === 'expansion' && ev.gain === 3, 'detecta expansión masiva');
ok(ev && ev.cities === 2 && ev.gold === 80 && ev.food === 40 && ev.wood === 15 && ev.units === 6, 'expansion inclúe cidades, recursos e tropas');
ok(ev && ev.recursos === 135 && ev.hexes === 5 && ev.hexesByPlayer[0] === 5 && ev.hexesByPlayer[1] === 0, 'expansion suma recursos e hexágonos por xogador');
const p0Loss = mkState([mkF('Ana', { terr: 2, units: 6, keyGold: 1 }), mkF('Boris', { units: 5 })], []);
const afterLoss = mkState([mkF('Ana', { terr: 5, units: 4, keyGold: 1, cities: 2, gold: 80, food: 40, wood: 15 }), mkF('Boris', { units: 3 })], []);
const lossEv = HF.replayCaster.phaseSummary(p0Loss, afterLoss, 0, 0, 13);
ok(lossEv && lossEv.type === 'expansion' && lossEv.perdidas === 4 && lossEv.perdidasFacción === 2 && lossEv.perdidasPorJugador[0] === 2 && lossEv.perdidasPorJugador[1] === 2, 'expansion suma as unidades perdidas no turno (total e por xogador)');
ok(lossEv && lossEv.unidadesPerdidas === 4 && lossEv.unidadesPerdidasPorJugador[0] === 2, 'a API expón o alias unidadesPerdidas');
ev = phase({ terr: 2, units: 5, keyGold: 1 }, { terr: 2, units: 5, keyGold: 3 });
ok(ev && ev.type === 'keyPoints' && ev.key === 2, 'detecta control de puntos clave');
ev = phase({ terr: 2, units: 5 }, { terr: 4, units: 6 }, 2);
ok(ev && ev.type === 'rhythm' && ev.gain === 2, 'detecta cambio de ritmo tras defensa pasiva');
ev = phase({ terr: 2, units: 6 }, { terr: 3, units: 2 });
ok(ev && ev.type === 'pyrrhic' && ev.lost === 4, 'detecta victoria pírrica');
ev = phase({ terr: 2, units: 5, keyGold: 1 }, { terr: 5, units: 6, keyGold: 3, deficit: true });
ok(ev && ev.type === 'supply', 'o suministro ten prioridade sobre expansión/puntos');

// ---------------------------------------------------------------------------
// 5. Bloque final con estatísticas
// ---------------------------------------------------------------------------
console.log('\n[resumo final]');
let finalState = mkState(
  [
    mkF('Ana', { terr: 9, cities: 3, gold: 120, food: 60, wood: 30, units: 10 }),
    mkF('Boris', { terr: 4, cities: 1, gold: 20, food: 10, wood: 5, units: 4 })
  ],
  [],
  { over: { winner: 0, won: true, reason: 'Dominación' }, turn: 18 }
);
let fin = HF.replayCaster.finalCue(finalState, 30);
ok(fin && fin.type === 'finalSummary' && fin.turn === 18, 'xera o bloque final co turno');
ok(fin.wcities === 3 && fin.lcities === 1 && fin.wunits === 10 && fin.lunits === 4, 'integra cidades e superioridade de tropas');
ok(fin.wgold === 120 && fin.wfood === 60 && fin.wwood === 30 && fin.lgold === 20, 'integra o balance de recursos');

// ---------------------------------------------------------------------------
// 6. buildCues: indexa unha caída e un final
// ---------------------------------------------------------------------------
console.log('\n[cues]');
function baseGame() {
  return mkState(
    [mkF('Ana'), mkF('Boris')],
    [mkCell(0, {}), mkCell(1, { b: HF.B.CIUDAD, cap: true })]
  );
}
HF.newGame = () => baseGame();
HF.replayApply = (g, t) => {
  if (t[0] === 1) g.cells[1] = mkCell(0, { b: HF.B.CIUDAD, cap: true, u: { owner: 0, type: 'INF', tier: 1 } });
};
let cues = HF.replayCaster.buildCues({ setup: {}, log: [[1, 0, 1]] });
ok(cues.length === 1 && cues[0].type === 'cityFall' && cues[0].at === 1, 'buildCues indexa a caída da cidade');

HF.newGame = () => baseGame();
HF.replayApply = (g, t) => { g.over = { winner: 0, won: true, reason: 'Dominación' }; g.turn = 18; };
cues = HF.replayCaster.buildCues({ setup: {}, log: [[1, 0, 1]] });
ok(cues.length === 1 && cues[0].type === 'finalSummary' && cues[0].at === 1, 'buildCues pecha co resumo final');

// ---------------------------------------------------------------------------
// 7. Voz sintética: idioma, ton, velocidade, mute e cancelamento
// ---------------------------------------------------------------------------
console.log('\n[voz]');
const voice = new HF.replayCaster.Voice({ lang: 'es', rate: 1.1, pitch: 1.2 });
voice.speak('hola', { rate: 1.2, pitch: 1.3 }).then(() => {
  const u = spoken[spoken.length - 1];
  ok(u && u.text === 'hola' && u.lang === 'es-ES', 'a voz usa o idioma activo');
  ok(Math.abs(u.rate - 1.32) < 0.01, 'a velocidade combina usuario + emoción');
  ok(Math.abs(u.pitch - 1.3) < 0.01, 'o ton é o do comentarista');
  voice.setRate(1.5);
  return voice.speak('ritmo', {});
}).then(() => {
  const u = spoken[spoken.length - 1];
  ok(Math.abs(u.rate - 1.5) < 0.01, 'o control de velocidade cambia a fala');
  voice.setMuted(true);
  return voice.speak('silencio', {});
}).then(r => {
  ok(r === false && voice.muted === true, 'mute impide a fala');
  voice.setMuted(false);
  voice.cancel();
  ok(canceled > 0, 'cancel detén a síntese');
}).then(() => {
  // ---------------------------------------------------------------------
  // 7b. Audio gateway remoto (JSON con URL de audio)
  // ---------------------------------------------------------------------
  console.log('\n[gateway]');
  sandbox.URL = { createObjectURL: () => 'blob:x', revokeObjectURL: () => { } };
  sandbox.Audio = function (src) {
    this.src = src; this.playbackRate = 1;
    const self = this;
    setTimeout(() => { if (self.onended) self.onended(); }, 0);
    this.play = () => Promise.resolve();
    this.pause = () => { };
  };
  sandbox.fetch = () => Promise.resolve({
    ok: true,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve({ url: 'https://cdn.test/gol.mp3' })
  });
  const remote = new HF.replayCaster.RemoteVoice({ endpoint: '/tts', lang: 'es', rate: 1.2, fallback: voice });
  return remote.speak('gol', {}).then(r => {
    ok(r === true && remote._audio === null, 'o gateway remoto reproduce e limpa o audio');
  });
}).then(() => {
  // ---------------------------------------------------------------------
  // 8. Caster: pausa, fala e reanuda; salto ao seguinte fito
  // ---------------------------------------------------------------------
  console.log('\n[caster]');
  HF.newGame = () => baseGame();
  HF.replayApply = (g, t) => {
    g.cells[1] = mkCell(0, { b: HF.B.CIUDAD, cap: true, u: { owner: 0, type: 'INF', tier: 1 } });
  };
  let pauses = 0, resumes = 0;
  const jumps = [];
  const c = HF.replayCaster.create({
    payload: { setup: {}, log: [[1, 0, 1]] },
    lang: 'es',
    onPause: () => { pauses++; },
    onResume: () => { resumes++; },
    onJump: target => { jumps.push(target); }
  });
  return wait(10).then(() => {
    ok(c._indexed === true && c.cues.length === 1, 'o caster indexa a partida ao arrancar');
    c.observe(1, null, null, null, [1, 0, 1]);
    return wait(10);
  }).then(() => {
    ok(pauses === 1, 'pausa o taboleiro ao comezar a fala');
    ok(resumes === 1, 'reanuda o taboleiro ao rematar a fala');
    ok(spoken.some(u => /Ana|Boris/.test(u.text)), 'o relato usa os nomes dos factions');
    const before = jumps.length;
    c._lastCueAt = 0;
    const cue = c.nextHighlight();
    return wait(10).then(() => {
      ok(cue && cue.at === 1 && jumps.length === before + 1 && jumps[jumps.length - 1] === 1, 'nextHighlight salta ao seguinte fito');
      ok(c.nextHighlight() === null, 'sen máis fitos devolve null');
      const muted = c.toggleMute();
      ok(muted === true && c.muted === true, 'toggleMute silencia o comentarista');
      c.setRate(1.4);
      ok(Math.abs(c.rate - 1.4) < 0.01, 'setRate garda a velocidade');
      c.destroy();
      ok(true, 'destroy limpa o caster');
    });
  });
}).then(() => {
  // ---------------------------------------------------------------------
  // 9. Sen texto na pantalla
  // ---------------------------------------------------------------------
  console.log('\n[sen texto]');
  const src = fs.readFileSync(path.join(ROOT, 'js/replay-caster.js'), 'utf8');
  ok(!/\.textContent\s*=/.test(src) && !/\.innerHTML\s*=/.test(src), 'o módulo non pinta texto no DOM');
  const rep = fs.readFileSync(path.join(ROOT, 'js/replay.js'), 'utf8');
  const block = /<div class="caster-bar"[\s\S]*?<\/div>/.exec(rep);
  ok(!!block && /casterPlay/.test(block[0]) && /casterMute/.test(block[0]) && /casterRate/.test(block[0]) && /casterNext/.test(block[0]), 'o visor inclúe os catro controis');
  ok(!!block && !/>\s*[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,}\s*</.test(block[0]), 'os controis non amosan etiquetas de texto');
  ok(/HF\.replayCaster\.create/.test(rep) && /caster\.observe/.test(rep), 'replay.js inxecta o caster no paso do log');

  console.log('\n' + (fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK'));
  process.exit(fail ? 1 : 0);
}).catch(e => {
  console.error('FAIL: excepción', e);
  process.exit(1);
});
