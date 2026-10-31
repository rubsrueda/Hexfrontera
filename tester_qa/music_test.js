'use strict';
// Prueba del motor de música (js/music.js) sin navegador: estado de pistas,
// reacción a estación/guerra, ajuste de sonido y respaldo procedural.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const AUDIOS = [];
class FakeAudio {
  constructor() { AUDIOS.push(this); this.volume = 1; this.paused = true; this.sources = []; this.handlers = {}; this.plays = 0; }
  appendChild(s) { this.sources.push(s); }
  addEventListener(k, fn) { (this.handlers[k] = this.handlers[k] || []).push(fn); }
  load() { }
  play() { this.plays++; this.paused = false; return this.failPlay(); }
  failPlay() { return Promise.resolve(); }
  pause() { this.paused = true; }
}
class FailingAudio extends FakeAudio {
  failPlay() { return Promise.reject(new Error('network')); }
}

const settings = { sound: true };
const legacy1 = {
  starts: 0, stops: 0, updates: 0,
  start() { this.starts++; }, stop() { this.stops++; }, update() { this.updates++; }, refresh() { }, tension: () => false
};
const HF = {
  CFG: { music: { enabled: true, volume: .3, fade: .05 } },
  settings: () => settings,
  season: g => (g ? g.season : 0),
  hexDist: (a, b) => Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(a.q + a.r - b.q - b.r)),
  B: { CIUDAD: 5 },
  bgm: legacy1
};

function boot(HFobj, AudioCls) {
  const sb = {
    console, HF: HFobj, Audio: AudioCls,
    document: { hidden: false, createElement: () => ({}), addEventListener() { } },
    navigator: { onLine: true },
    setInterval, clearInterval, setTimeout, clearTimeout
  };
  sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'music.js'), 'utf8'), sb);
  return sb;
}

let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };
const wait = ms => new Promise(r => setTimeout(r, ms));
const game = (season, extra) => ({ season, cells: [{ i: 0, q: 0, r: 0, cap: 1, o: 0, b: 5 }].concat(extra || []) });
const anyPlaying = () => AUDIOS.some(a => !a.paused);
const allPaused = () => AUDIOS.every(a => a.paused);

(async () => {
  boot(HF, FakeAudio);
  const M = HF.music;

  // 1. Arranque aleatorio entre las piezas de calma
  M.start(game(0));
  await wait(30);
  const first = M.track();
  ok(['spring', 'calm', 'summer'].indexOf(first) >= 0, 'inicio aleatorio pacífico (' + first + ')');
  ok(M.playing() && anyPlaying(), 'reproductor activo');
  const el = AUDIOS.find(a => !a.paused);
  ok(el && el.sources.length === 2, 'cada pista ofrece dos fuentes (mp3 + ogg)');
  ok(el && el.sources[0].src.indexOf('transcoded') >= 0 && el.sources[0].src.indexOf('.mp3') > 0, 'mp3 primero para Safari/iOS');
  ok(el && el.sources[1].src.indexOf('upload.wikimedia.org') >= 0, 'ogg original como respaldo');

  // 2. Estación: invierno y primavera
  M.checkState(game(3));
  await wait(30);
  ok(M.track() === 'winter', 'invierno -> pista de invierno (' + M.track() + ')');
  M.checkState(game(0));
  await wait(30);
  ok(M.track() === 'spring', 'primavera -> La primavera (' + M.track() + ')');

  // 3. Guerra: enemigo a 2 casillas de la capital
  M.checkState(game(0, [{ i: 1, q: 2, r: 0, u: { owner: 1, type: 'INF' } }]));
  await wait(30);
  ok(M.tension() === true && M.track() === 'war', 'enemigo cerca de la capital -> guerra');

  // 4. Al retirarse el enemigo vuelve la estación
  M.checkState(game(0, [{ i: 1, q: 6, r: 0, u: { owner: 1, type: 'INF' } }]));
  await wait(30);
  ok(M.tension() === false && M.track() === 'spring', 'al retirarse vuelve la música de la estación');

  // 5. Ajuste de sonido
  settings.sound = false;
  M.refresh();
  await wait(30);
  ok(allPaused(), 'sound=false pausa la música');
  settings.sound = true;
  M.refresh();
  await wait(30);
  ok(anyPlaying(), 'sound=true reanuda la música');

  // 6. Respaldo procedural cuando ninguna pista se puede reproducir
  AUDIOS.length = 0;
  const legacy2 = { starts: 0, start() { this.starts++; }, stop() { }, update() { }, refresh() { }, tension: () => false };
  const HF2 = {
    CFG: { music: { enabled: true, volume: .3, fade: .05 } },
    settings: () => settings, season: () => 0, hexDist: HF.hexDist, B: HF.B,
    bgm: legacy2
  };
  boot(HF2, FailingAudio);
  HF2.music.start(game(0));
  await wait(200);
  ok(legacy2.starts >= 1, 'sin pistas reproducibles se activa la música procedural');

  console.log(fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK');
  process.exit(fail ? 1 : 0);
})();
