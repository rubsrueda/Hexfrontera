'use strict';
// Prueba de integración: la IA saquea unidades comerciales usando el mismo
// camino que el jugador (HF.options -> HF.act con la acción 'raid').
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HF = {};
const store = {};
const sandbox = {
  console, HF, navigator: { onLine: false }, performance: { now: () => Date.now() },
  localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } }
};
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ['util.js', 'config.js', 'data.js', 'names.js', 'mapgen.js', 'engine.js', 'ai.js', 'progress.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox);

let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };
const totalGold = f => Object.keys(f.stock || {}).reduce((s, k) => s + (f.stock[k].gold || 0), 0);

// Partida real (mapa generado) con recursos holgados para que la IA actúe.
const tribe = Object.assign({ name: 'Prueba', color: '#E05C5C', crest: 'c01' },
  HF.PRESETS ? HF.PRESETS[0] : { alma_path: ['A1', 'A1.1', 'A1.1.1'], arma_path: ['B1', 'B1.1', 'B1.1.1'], victoria_path: ['C1', 'C1.3', 'C1.3.1'] });
const g = HF.makeGame({ size: 'small', seed: 4242, biome: 'plains', fog: 'NONE', difficulty: 'normal', n: 2, startRes: { gold: 400, food: 400, wood: 400 } }, tribe);

// Unidad de la IA con ataque disponible.
const unit = g.cells.find(c => c && c.u && c.u.owner === 1 && c.u.type !== 'BAR');
ok(!!unit, 'la IA tiene una unidad de tierra');
unit.u.at = 1; unit.u.mv = 1;

// Caravana del jugador justo en la casilla de esa unidad (caso límite: saqueo
// cuerpo a cuerpo sin desplazarse).
g.caravans.push({ key: 'land:test', owner: 0, kind: 'land', a: unit.i, b: unit.i, path: [unit.i], pos: 0, dir: 1, gold: 30 });
g.cur = 1;
const victim0 = totalGold(g.f[0]);

// Las opciones del motor ofrecen el saqueo también en la propia casilla.
const opt = HF.options(g, unit.i).get(unit.i);
ok(!!opt && opt.k === 'raid', 'el saqueo aparece sobre el comercio de la casilla');

HF.aiPlay(g, 1);
ok(!g.caravans.some(c => c.key === 'land:test'), 'la IA saquea la caravana');
ok(g.events.some(e => /Caravana saqueada: \+30 oro/.test(e.txt)), 'el botín íntegro se registra');
ok(totalGold(g.f[0]) === victim0, 'el comercio saqueado no entrega oro al rival');
ok((g.tradeBlocked['land:test'] || 0) > g.turn, 'la ruta saqueada queda bloqueada');

// La ronda completa sigue funcionando tras el saqueo.
HF.endTurn(g, HF.aiPlay);
ok(g.turn >= 2, 'la ronda posterior se resolvió sin excepciones');

console.log(fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK');
process.exit(fail ? 1 : 0);
