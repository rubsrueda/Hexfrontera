'use strict';
// Reproducción del fallo de diplomacia: "enemy.diplomacy.threatMap?.get is not a function"
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { console, HF: {}, Date, Math, JSON, Map, Set, Int8Array, Int16Array, Uint8Array, Float32Array };
sandbox.window = sandbox;
vm.createContext(sandbox);
const JS = path.join(__dirname, '..', 'js');
for (const f of ['util.js', 'config.js', 'data.js', 'names.js', 'mapgen.js', 'engine.js', 'diplomacy.js', 'diplomacy_ai.js', 'ai.js'])
  vm.runInContext(fs.readFileSync(path.join(JS, f), 'utf8'), sandbox, { filename: f });

const HF = sandbox.HF;
HF.updateFog = () => { };
HF.checkEnd = () => { };
HF.recordTimeline = () => { };

function makeFactions(n) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const preset = HF.PRESETS[k % HF.PRESETS.length];
    out.push({
      name: 'F' + k, color: HF.COLORS[k], crest: HF.CRESTS[k], human: k === 0,
      alma_path: preset.alma_path, arma_path: preset.arma_path, victoria_path: preset.victoria_path
    });
  }
  return out;
}

function newGame(seed) {
  return HF.newGame({ R: 8, seed, biome: 'plains', fog: 'NONE', difficulty: 'normal', factions: makeFactions(4) });
}

function play(g, turns) {
  const errors = [];
  for (let t = 0; t < turns; t++) {
    try { HF.endTurn(g, HF.aiPlay); } catch (e) { errors.push({ turn: g.turn, msg: e.message, stack: String(e.stack).split('\n')[1] }); break; }
  }
  return errors;
}

console.log('=== 1. Partida nueva, 30 turnos de IA ===');
let g = newGame(1234);
let e1 = play(g, 30);
console.log('errores:', e1.length);
e1.slice(0, 3).forEach(e => console.log('  T', e.turn, e.msg, '|', e.stack));
console.log('tratados totales:', g.treaties.size, 'por estado:',
  JSON.stringify([...g.treaties.values()].reduce((a, t) => (a[t.status] = (a[t.status] || 0) + 1, a), {})));
console.log('tipos de threatMap:', g.f.map(f => f.diplomacy && f.diplomacy.threatMap && f.diplomacy.threatMap.constructor.name).join(','));

console.log('\n=== 2. Guardar + cargar (v2) + 20 turnos ===');
const blob = JSON.parse(JSON.stringify(HF.serialize(g)));
console.log('facciones serializadas conservan treaties?', blob.f.every(f => f.treaties));
let g2;
try { g2 = HF.deserialize(blob); } catch (e) { console.log('deserialize ERROR:', e.message); }
if (g2) {
  const first = g2.treaties.values().next().value;
  console.log('factions es', first ? first.factions.constructor.name : 'n/a', '| includes?', first ? typeof first.factions.includes : 'n/a');
  console.log('threatMap tipos:', g2.f.map(f => f.diplomacy && f.diplomacy.threatMap && f.diplomacy.threatMap.constructor.name).join(','));
  let e2 = play(g2, 20);
  console.log('errores tras cargar:', e2.length);
  e2.slice(0, 3).forEach(e => console.log('  T', e.turn, e.msg, '|', e.stack));
}

console.log('\n=== 3. Undo (snap/JSON) y luego fin de turno ===');
let g3 = newGame(77);
play(g3, 3);
// forzamos un snapshot como el que hace la UI al mover
const snap = HF.serialize; // no-op
const before = g3.f.map(f => f.diplomacy.threatMap.constructor.name).join(',');
// replicamos snap() y HF.undo tal cual (no exportados): usamos el JSON del snapshot
const raw = JSON.stringify({ cells: g3.cells, f: g3.f, stat: g3.stat, fogMap: null, rl: null });
const s = JSON.parse(raw);
g3.f = s.f;
console.log('threatMap antes:', before, '| tras undo:', g3.f.map(f => f.diplomacy.threatMap.constructor.name).join(','));
let e3 = play(g3, 3);
console.log('errores tras undo:', e3.length);
e3.slice(0, 3).forEach(e => console.log('  T', e.turn, e.msg, '|', e.stack));
