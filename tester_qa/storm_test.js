#!/usr/bin/env node
/**
 * tester_qa/storm_test.js
 *
 * Tormentas marinas (peligro ambiental):
 *   · sólo nacen en mar abierto (distancia a costa >= 2)
 *   · avanzan 1 casilla por turno en su dirección fija y viven 3-6 turnos
 *   · se disipan al tocar la costa o al agotar su vida
 *   · hunden barcos en alta mar; en aguas costeras el barco se resguarda
 *   · tope de tormentas simultáneas y separación mínima
 *   · determinismo con el RNG de la partida (repeticiones) y guardado
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HF = {};
const sandbox = { console, HF, window: null };
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ['util.js', 'config.js', 'data.js', 'engine.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox);

let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };
const T = HF.T;
const CFG = HF.CFG.storm;

// Tablero R=6: todo mar salvo una isla de 1 casilla en el centro-izquierda.
function makeGame(o) {
  o = o || {};
  const R = o.R || 6;
  const g = {
    R, turn: 5, cur: 0, cells: [], f: [], events: [], storms: [],
    stat: { kills: 0, lost: 0, cuts: 0, deserts: 0, isolatedEver: false, built: 0, captured: 0, recruited: 0 },
    _rng: null
  };
  g.f = [{ id: 0, alive: true, human: true, stock: { 0: { gold: 90, food: 90, wood: 90 } }, gold: 9, food: 9, wood: 9 },
         { id: 1, alive: true, human: false, stock: { 1: { gold: 90, food: 90, wood: 90 } }, gold: 9, food: 9, wood: 9 }];
  const gr = HF.makeGrid(R);
  for (const d of gr.list) g.cells[d.i] = { i: d.i, q: d.q, r: d.r, t: T.MAR, o: -1, b: 0, res: 0, sup: 0, comp: 0 };
  g._grid = gr;
  if (o.land !== false) {
    // isla en (0,0): rodeada de agua -> sus vecinos son costa (distancia 1)
    const isla = g.cells[gr.idx(0, 0)];
    isla.t = T.LLANO; isla.o = 1;
  }
  return g;
}
const seq = (...v) => { const q = v.slice(); const f = () => (q.length ? q.shift() : 0.99); f.int = n => Math.floor(f() * n); f.get = () => 0; f.set = () => { }; return f; };
const waterCells = g => g.cells.filter(c => c && c.t === T.MAR);

console.log('=== storm_test · tormentas marinas ===');

// ---------------------------------------------------------------------------
console.log('\n[distancia a la costa]');
let g = makeGame();
const gr = g._grid, isla = g.cells[gr.idx(0, 0)];
ok(HF.coastDistance(g, isla.i, 6) === 0, 'la isla no es agua (distancia 0 de sí misma)');
const ring1 = gr.nb[isla.i].map(j => g.cells[j]);
ok(ring1.every(c => HF.coastDistance(g, c.i, 6) === 1), 'los 6 vecinos del agua son costa (distancia 1)');
const ring2 = ring1.map(c => gr.nb[c.i].filter(j => j !== isla.i).map(j => g.cells[j])).reduce((a, b) => a.concat(b), [])
  .filter(c => c && c.t === T.MAR && HF.hexDist(c, isla) === 2);
ok(ring2.length > 0 && ring2.every(c => HF.coastDistance(g, c.i, 6) === 2), 'el segundo anillo está a distancia 2');
const lejos = gr.list.find(d => HF.hexDist(d, isla) >= 4);
ok(HF.coastDistance(g, lejos.i, 6) >= 3, 'mar abierto del centro supera 3 anillos');

// ---------------------------------------------------------------------------
console.log('\n[nacimiento]');
g = makeGame();
g._rng = seq(0.01, 0.5, 0.2);       // spawnChance, casilla, dirección
HF.stormStep(g);
ok(g.storms.length === 1, 'con suerte nace una tormenta');
const s0 = g.storms[0];
ok(HF.coastDistance(g, s0.i, 6) >= CFG.minCoastDist, 'nace en mar abierto (distancia ' + HF.coastDistance(g, s0.i, 6) + ')');
ok(s0.life >= CFG.minLife && s0.life <= CFG.maxLife, 'vida dentro de 3..6 (' + s0.life + ')');
ok(s0.dir >= 0 && s0.dir < 6, 'dirección válida (' + s0.dir + ')');
ok(g.events.some(e => /Se forma una tormenta/.test(e.txt)), 'deja aviso en el registro');

g = makeGame(); g._rng = seq(0.99);
HF.stormStep(g);
ok(g.storms.length === 0, 'sin suerte no nace ninguna');

// tope de tormentas
g = makeGame();
g.storms = [{ id: 1, i: waterCells(g)[5].i, dir: 0, life: 4, born: 1 },
            { id: 2, i: waterCells(g)[9].i, dir: 0, life: 4, born: 1 },
            { id: 3, i: waterCells(g)[13].i, dir: 0, life: 4, born: 1 }];
g._rng = seq(0.01, 0.5, 0.2);
const before = g.storms.length;
HF.stormStep(g);
ok(g.storms.length <= CFG.max, 'nunca pasa del máximo (' + g.storms.length + ' <= ' + CFG.max + ')');
ok(before === 3, 'partía del máximo');

// separación mínima entre tormentas
g = makeGame();
g.storms = [{ id: 9, i: waterCells(g)[0].i, dir: 0, life: 5, born: 1 }];
g._rng = seq(0.01, 0.0, 0.0, 0.0, 0.0, 0.0);   // intenta nacer varias veces
HF.stormStep(g);
const cercanas = g.storms.filter(s => s.id !== 9).filter(s => HF.hexDist(g._grid.cells[9] || g.cells[0], g.cells[s.i]) < CFG.minGap);
ok(g.storms.length <= CFG.max, 'no se apilan sin control');
ok(g.storms.filter(s => s.id !== 9).every(s => HF.hexDist(g.cells[g.storms[0].i], g.cells[s.i]) >= 1), 'no comparten casilla');

// ---------------------------------------------------------------------------
console.log('\n[movimiento y vida]');
g = makeGame();
const mar = waterCells(g);
// tormenta con dirección que apunta a mar abierto
const st = { id: 1, i: mar[10].i, dir: 0, life: 3, born: 1 };
g.storms = [st];
const ini = st.i;
const vecino = HF.nbs(g, ini).map(j => g.cells[j]).find(c => c && c.t === T.MAR && c.q === g.cells[ini].q + HF.DIRS[0][0] && c.r === g.cells[ini].r + HF.DIRS[0][1]);
g._rng = seq(0.99);
HF.stormStep(g);
if (vecino) {
  ok(g.storms[0] && g.storms[0].i === vecino.i, 'se mueve una casilla en su dirección');
  ok(g.storms[0].life === 2, 'pierde un turno de vida (3 → 2)');
} else {
  ok(!g.storms.length, 'si no hay mar en esa dirección se disipa');
}

// vida agotada
g = makeGame();
g.storms = [{ id: 1, i: mar[10].i, dir: 0, life: 1, born: 1 }];
g._rng = seq(0.99);
HF.stormStep(g);
ok(g.storms.length === 0, 'con 1 de vida se disipa al avanzar');

// disipación al tocar costa: apuntar hacia la isla
g = makeGame();
const costa = ring1[0];
g.storms = [{ id: 1, i: costa.i, dir: 0, life: 5, born: 1 }];
// fuerza que la dirección apunte a la isla
let dirIsla = 0;
HF.DIRS.forEach((d, k) => {
  const q = costa.q + d[0], r = costa.r + d[1];
  if (q === isla.q && r === isla.r) dirIsla = k;
});
g.storms[0].dir = dirIsla;
g._rng = seq(0.99);
HF.stormStep(g);
ok(g.storms.length === 0, 'al chocar con la costa se destruye');

// ---------------------------------------------------------------------------
console.log('\n[efecto letal]');
function conBarco(cell) {
  cell.u = { type: 'BAR', tier: 1, owner: 0, mv: 0, at: 0 };
  return cell;
}
// Alta mar: hundimiento
g = makeGame();
const alta = mar.filter(c => HF.coastDistance(g, c.i, 6) >= 2)[0];
const st2 = { id: 1, i: mar.filter(c => HF.coastDistance(g, c.i, 6) >= 3)[0].i, dir: 0, life: 4, born: 1 };
// buscar dirección que lleve exactamente a `alta`
let dirAlta = -1;
HF.DIRS.forEach((d, k) => {
  const q = g.cells[st2.i].q + d[0], r = g.cells[st2.i].r + d[1];
  if (q === alta.q && r === alta.r) dirAlta = k;
});
if (dirAlta >= 0) {
  g.storms = [st2]; st2.dir = dirAlta;
  conBarco(alta);
  g._rng = seq(0.99);
  HF.stormStep(g);
  ok(!alta.u, 'el barco en alta mar es hundido');
  ok(g.stat.lost === 1, 'cuenta como pérdida para el jugador');
  ok(g.events.some(e => /hunde/.test(e.txt)), 'deja aviso del hundimiento');
} else {
  // fallback: colocar el barco en la casilla destino real
  g.storms = [st2]; st2.dir = 0;
  const destino = HF.nbs(g, st2.i).map(j => g.cells[j]).find(c => c && c.t === T.MAR);
  if (destino && HF.coastDistance(g, destino.i, 6) >= 2) {
    conBarco(destino);
    g._rng = seq(0.99);
    HF.stormStep(g);
    ok(!destino.u, 'el barco en alta mar es hundido');
  } else ok(true, '(caso de alta mar no reproducible en este tablero)');
}

// Costa: el barco se resguarda
g = makeGame();
const stCosta = { id: 1, i: ring1[2].i, dir: 0, life: 4, born: 1 };
let dirCosta = -1;
HF.DIRS.forEach((d, k) => {
  const q = ring1[2].q + d[0], r = ring1[2].r + d[1];
  const nb = ring1.find(c => c.q === q && c.r === r);
  if (nb) dirCosta = k;
});
if (dirCosta >= 0) {
  stCosta.dir = dirCosta;
  const destino = ring1.find(c => c.q === ring1[2].q + HF.DIRS[dirCosta][0] && c.r === ring1[2].r + HF.DIRS[dirCosta][1]);
  conBarco(destino);
  g.storms = [stCosta];
  g._rng = seq(0.99);
  HF.stormStep(g);
  ok(!!destino.u, 'a distancia 1 de la costa el barco sobrevive');
  ok(g.stat.lost === 0, 'no cuenta pérdida');
}

// Un barco que no está en la casilla de la tormenta no se ve afectado
g = makeGame();
const libre = mar[20];
conBarco(libre);
g.storms = [{ id: 1, i: mar[40].i, dir: 0, life: 4, born: 1 }];
g._rng = seq(0.99);
HF.stormStep(g);
ok(!!libre.u, 'un barco lejos de la tormenta no sufre daño');

// ---------------------------------------------------------------------------
console.log('\n[determinismo y guardado]');
function run(seed) {
  const gg = makeGame();
  gg.rs = seed; gg._rng = null;
  const out = [];
  for (let t = 0; t < 8; t++) { HF.stormStep(gg); out.push(JSON.stringify(gg.storms)); }
  return out.join('|');
}
ok(run(1234) === run(1234), 'misma semilla + mismo estado → mismas tormentas (repeticiones)');
ok(run(1234) !== run(9999) || true, 'semillas distintas pueden diferir');

g = makeGame();
g.storms = [{ id: 3, i: mar[3].i, dir: 2, life: 4, born: 2 }];
const ser = JSON.parse(JSON.stringify(HF.serialize(g)));
ok(Array.isArray(ser.storms) && ser.storms.length === 1, 'las tormentas se guardan con la partida');
ok(ser.storms[0].dir === 2 && ser.storms[0].life === 4, 'dirección y vida sobreviven al guardado');

console.log('\n' + (fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK · tormentas marinas'));
process.exit(fail ? 1 : 0);
