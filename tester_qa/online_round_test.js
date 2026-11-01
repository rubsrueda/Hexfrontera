'use strict';
// Cierre de ronda multijugador: sin IA, todas las facciones humanas reciben su
// turno (PA y cobro) y el turno avanza una vez.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HF = {};
const sandbox = { console, HF, window: null, navigator: { onLine: false }, localStorage: null, setTimeout, clearTimeout };
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ['util.js', 'config.js', 'data.js', 'mapgen.js', 'engine.js', 'progress.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox);

let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };

let g;
try {
  g = HF.makeGame({ mode: 'skirmish', seed: 42, size: 'small', n: 2, biome: 'plains', fog: 'NONE', difficulty: 'normal', goal: { type: 'conquer' } }, HF.loadTribe());
  ok(!!g && g.f.length === 2, 'partida de prueba creada');
} catch (e) { console.error('makeGame falló:', e.message); process.exit(1); }

// agotar PA de todas las unidades para comprobar que el cierre las repone
for (const c of g.cells) if (c && c.u) { c.u.mv = 0; c.u.at = 0; }
const t0 = g.turn;
const before = g.f.map(f => ({ gold: f.gold, food: f.food }));
HF.mpEndRound(g);
ok(g.turn === t0 + 1, `avanza un turno (${t0} -> ${g.turn})`);
let ready = 0, total = 0;
for (const c of g.cells) if (c && c.u) { total++; if (c.u.mv === 1 && c.u.at === 1) ready++; }
ok(total > 0 && ready === total, `todas las unidades recuperan PA (${ready}/${total})`);
ok(g.f.every((f, i) => f.gold >= before[i].gold), 'todas las facciones cobran ingresos');
ok(g.cur === 0, 'el cursor vuelve al jugador 0');

console.log(fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK');
process.exit(fail ? 1 : 0);
