'use strict';
// Banca de la capital: precio (producción oro / producción recurso) * 1.1,
// pago en oro y registro [10, recurso, cantidad, casilla] para repeticiones.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = {
  console, Date, Math, JSON, Promise,
  setTimeout, clearTimeout, setInterval, clearInterval,
  navigator: { onLine: false, language: 'es' },
  localStorage: null,
  location: { protocol: 'https:', hostname: 'federati.org', href: 'https://federati.org/' },
  document: { addEventListener() { }, removeEventListener() { }, visibilityState: 'visible' },
  btoa: s => Buffer.from(String(s), 'binary').toString('base64'),
  atob: s => Buffer.from(String(s), 'base64').toString('binary')
};
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ['util.js', 'config.js', 'data.js', 'i18n.js', 'engine.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox);
}
const HF = sandbox.HF;

let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };

// Ingreso de prueba: 45 oro, 22 comida, 24 madera.
HF.income = () => ({ gold: 45, food: 22, wood: 24 });
HF.updateFog = () => { };

const f = {
  id: 0, alive: true, human: false, loan: null,
  stock: { 0: { gold: 500, food: 10, wood: 5 } },
  gold: 0, food: 0, wood: 0
};
HF.syncTotals(f);
const c = { i: 0, o: 0, cap: true, b: HF.B.CIUDAD, sup: 1, comp: 0 };
const g = { turn: 1, cur: 0, over: null, f: [f], cells: [c], events: [], replayLog: [] };

console.log('[cotización]');
const qFood = HF.bankQuote(g, f, 'food');
const qWood = HF.bankQuote(g, f, 'wood');
const qGold = HF.bankQuote(g, f, 'gold');
ok(qFood && Math.abs(qFood.rate - 2.25) < 1e-9, 'comida: 45/22 × 1.1 = 2.25 oro/unidad');
ok(qWood && Math.abs(qWood.rate - 2.0625) < 1e-9, 'madera: 45/24 × 1.1 = 2.0625 oro/unidad');
ok(qGold && Math.abs(qGold.rate - 1.1) < 1e-9, 'oro: 45/45 × 1.1 = 1.1 oro/unidad');

console.log('\n[intercambio]');
let r = HF.bankExchange(g, 0, 'food', 50);
ok(r.ok && r.cost === 113 && Math.abs(r.exact - 112.5) < 1e-9, '50 comida cuesta 112.5 y se cobran 113');
ok(f.stock[0].gold === 387 && f.stock[0].food === 60 && f.gold === 387 && f.food === 60, 'descuenta oro y suma comida en la capital');
ok(g.replayLog.length === 1 && g.replayLog[0].join(',') === '10,food,50,0', 'registra [10, food, 50, capital] para la repetición');

r = HF.bankExchange(g, 0, 'wood', 50);
ok(r.ok && r.cost === 104, '50 madera cuesta 103.125 y se cobran 104');
ok(f.stock[0].gold === 283 && f.stock[0].wood === 55 && f.wood === 55, 'descuenta oro y suma madera');

r = HF.bankExchange(g, 0, 'gold', 50);
ok(r.ok && r.cost === 55, '50 oro cuesta 55 oro (1.1 × 50)');
ok(f.stock[0].gold === 278 && f.gold === 278, 'comprar oro deja 50 - 55 = -5 neto');

console.log('\n[límites]');
f.stock[0].gold = 50; HF.syncTotals(f);
r = HF.bankExchange(g, 0, 'food', 50);
ok(!r.ok && r.msg.indexOf('oro suficiente') >= 0 && f.stock[0].gold === 50, 'sin oro suficiente no cambia nada');

HF.income = () => ({ gold: 45, food: 0, wood: 24 });
ok(HF.bankQuote(g, f, 'food') === null, 'sin producción de comida no hay cotización');
r = HF.bankExchange(g, 0, 'food', 10);
ok(!r.ok && r.msg.indexOf('No produces') >= 0, 'no se puede comprar un recurso sin producción');

c.cap = false;
r = HF.bankExchange(g, 0, 'wood', 10);
ok(!r.ok && r.msg.indexOf('capital') >= 0, 'solo funciona en la ciudad capital');
c.cap = true;

console.log('\n[repetición]');
HF.income = () => ({ gold: 45, food: 22, wood: 24 });
f.stock[0] = { gold: 500, food: 10, wood: 5 }; HF.syncTotals(f);
g.replayLog = []; g.noReplay = true;
r = HF.bankExchange(g, 0, 'wood', 10);
ok(r.ok && g.replayLog.length === 0, 'en modo repetición no vuelve a registrar la acción');

console.log('\n' + (fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK'));
process.exit(fail ? 1 : 0);
