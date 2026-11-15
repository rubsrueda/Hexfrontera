'use strict';
// Ingeniero de nivel único y puente como mutación permanente del terreno.
// Cubre: estadísticas, movilidad, no conquista, construcción/demolición,
// tránsito, defensa anulada, carga de suministros y persistencia.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HF = {};
const sandbox = { console, HF, window: null };
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ['util.js', 'config.js', 'data.js', 'mapgen.js', 'engine.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox);

let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };
const T = HF.T, B = HF.B;

function makeGame() {
  const R = 4, g = {
    R, turn: 1, cur: 0, cells: [], f: [], events: [], _rng: null, rs: 1,
    stat: { kills: 0, lost: 0, cuts: 0, deserts: 0, isolatedEver: false, built: 0, captured: 0, recruited: 0 },
    supInit: true, _trade: null, undo: []
  };
  const f = {
    id: 0, name: 'Prueba', human: false, alive: true, tags: [], grace: 0, goodStreak: 0,
    deficit: false, loan: null, wonderTurns: 0, wonderCell: -1, starvationsInduced: 0,
    stock: { 0: { gold: 200, food: 200, wood: 200 } }, gold: 200, food: 200, wood: 200,
    economy: {
      income: { gold: 0, food: 0, wood: 0, iron: 0, population: 0 },
      expenses: { gold: 0, food: 0, wood: 0, iron: 0, population: 0 },
      net: { gold: 0, food: 0, wood: 0, iron: 0, population: 0 },
      activeLoans: [], loansGiven: [], creditScore: 70, defaultHistory: 0,
      strategicReserves: { gold: 0, food: 0, wood: 0 }
    },
    diplomacy: { threatMap: new Map(), preferredTargets: [], securedFlanks: [], tradePartners: [], trustScores: new Map() }
  };
  g.f = [f];
  const gr = HF.makeGrid(R);
  for (const d of gr.list) {
    const c = HF.newCell(d);
    c.t = T.LLANO; c.o = 0; c.sup = 1; c.comp = 0;
    g.cells[d.i] = c;
  }
  g._grid = gr;
  return g;
}
const at = (g, q, r) => g.cells[g._grid.idx(q, r)];
const f0 = g => g.f[0];
const eng = (g, q, r) => {
  const u = { type: 'ENG', tier: 1, owner: 0, mv: 1, at: 1, supply: HF.CFG.engineer.supplyTurns };
  at(g, q, r).u = u;
  return u;
};

// -------------------------------------------------------------------------
// 1. Ficha del ingeniero: nivel único, sin ataque, movimiento 1, defensa N1
// -------------------------------------------------------------------------
let g = makeGame();
const s = HF.unitStats(g, 'ENG', 1, 0);
ok(s.atk === 0, 'Ingeniero: ataque 0');
ok(s.def === 1, 'Ingeniero: defensa fija N1 = 1');
ok(s.move === 1, 'Ingeniero: movimiento base 1');
ok(s.atkRange === 0, 'Ingeniero: alcance de ataque 0');
ok(HF.recruitCost(g, f0(g), 'ENG', 3).gold === HF.UNITS.ENG.cost.gold,
  'Ingeniero: pedir N3 cuesta como N1 (no existe nivel 2/3)');
const cap = at(g, 0, 0);
cap.b = B.CAMPAMENTO;
let eu = eng(g, 1, 0);
ok(HF.unitRange(g, eu, cap) === 1, 'Ingeniero: el asentamiento NO le da alcance 3');

// 2. No puede atacar ni conquistar
g = makeGame();
eu = eng(g, 0, 0);
let opts = HF.options(g, eu && at(g, 0, 0).i);
ok(![...opts.values()].some(o => o.k === 'atk'), 'Ingeniero: sin opciones de ataque');
const neutralLand = at(g, 1, 0);
neutralLand.o = -1; neutralLand.sup = 0;
const neutralRiver = at(g, 0, 1);
neutralRiver.t = T.RIO; neutralRiver.o = -1; neutralRiver.sup = 0;
const eCell = at(g, 0, 0);
opts = HF.options(g, eCell.i);
ok(!opts.has(neutralLand.i), 'Ingeniero: no puede entrar en tierra neutral (no conquista)');
ok(opts.has(neutralRiver.i), 'Ingeniero: puede entrar en río neutral para su misión');
const rMove = HF.act(g, eCell.i, neutralRiver.i, 'move');
ok(rMove.ok, 'Ingeniero: se mueve al río neutral');
ok(neutralRiver.o === -1, 'Ingeniero: NO conquista el río al entrar');

// -------------------------------------------------------------------------
// 3. Construir puente: solo sobre río/montaña, consume recursos y acción
// -------------------------------------------------------------------------
g = makeGame();
const river = at(g, 0, 0);
river.t = T.RIO;
eu = eng(g, 0, 0);
const woodBefore = f0(g).stock[0].wood, goldBefore = f0(g).stock[0].gold;
opts = HF.options(g, river.i);
const bOpt = opts.get(river.i);
ok(bOpt && bOpt.k === 'bridge', 'Ingeniero sobre río: opción Construir puente');
let r = HF.act(g, river.i, river.i, 'bridge');
ok(r.ok && river.br === 1, 'Puente construido sobre el río');
ok(river.t === T.RIO, 'El puente no cambia el terreno base (sigue siendo río)');
ok(f0(g).stock[0].wood === woodBefore - HF.CFG.engineer.bridge.cost.wood,
  'Puente: descuenta madera');
ok(f0(g).stock[0].gold === goldBefore - HF.CFG.engineer.bridge.cost.gold,
  'Puente: descuenta oro');
ok(eu.mv === 0 && eu.at === 0, 'Puente: consume movimiento y acción');
ok(river.o === 0, 'Puente: no altera el dueño de la casilla');

// No se puede construir sobre llano
g = makeGame();
const plain = at(g, 0, 0);
eng(g, 0, 0);
ok(!HF.options(g, plain.i).has(plain.i), 'No se puede construir puente en llano');

// -------------------------------------------------------------------------
// 4. Tránsito: cualquier unidad terrestre cruza el puente como llano
// -------------------------------------------------------------------------
g = makeGame();
const bridge = at(g, 0, 0);
bridge.t = T.RIO; bridge.br = 1;
const inf = { type: 'INF', tier: 1, owner: 0, mv: 1, at: 1 };
at(g, 0, 1).u = inf;
ok(HF.canStep(inf, bridge, f0(g)) === true, 'Infantería puede pisar el río con puente');
const raw = at(g, 0, 2);
raw.t = T.MONTANA;
const inf2 = { type: 'INF', tier: 1, owner: 0, mv: 1, at: 1 };
at(g, 0, 3).u = inf2;
ok(HF.canStep(inf2, raw, f0(g)) === false, 'Sin puente, la montaña sigue siendo infranqueable');
raw.br = 1;
ok(HF.canStep(inf2, raw, f0(g)) === true, 'Con puente, la montaña es transitable');

// -------------------------------------------------------------------------
// 5. La defensa del terreno desaparece sobre el puente
// -------------------------------------------------------------------------
g = makeGame();
const mtn = at(g, 0, 0);
mtn.t = T.MONTANA;
mtn.u = { type: 'INF', tier: 1, owner: 0, mv: 1, at: 1 };
ok(HF.defenseAt(g, mtn.i) === 1 + HF.CFG.combat.mountainDef, 'Montaña: infantería N1 defiende 1+2');
mtn.br = 1;
ok(HF.defenseAt(g, mtn.i) === 1, 'Puente: la montaña deja de dar +2 de defensa');
mtn.u = { type: 'ENG', tier: 1, owner: 0, mv: 1, at: 1, supply: 3 };
mtn.br = 0;
ok(HF.defenseAt(g, mtn.i) === HF.CFG.engineer.defense + HF.CFG.combat.mountainDef,
  'Ingeniero en montaña: defensa N1 + montaña');
mtn.br = 1;
ok(HF.defenseAt(g, mtn.i) === HF.CFG.engineer.defense, 'Ingeniero sobre puente: solo defensa N1');

// -------------------------------------------------------------------------
// 6. Demolición: ingeniero encima o asedio a distancia
// -------------------------------------------------------------------------
g = makeGame();
const brCell = at(g, 0, 0);
brCell.t = T.RIO; brCell.br = 1;
eu = eng(g, 0, 0);
opts = HF.options(g, brCell.i);
ok(opts.get(brCell.i) && opts.get(brCell.i).k === 'unbridge', 'Ingeniero sobre puente: opción Demoler');
r = HF.act(g, brCell.i, brCell.i, 'unbridge');
ok(r.ok && !brCell.br, 'Ingeniero demuele el puente que pisa');
ok(eu.mv === 0 && eu.at === 0, 'Demolición: consume la acción');

g = makeGame();
const target = at(g, 0, 0);
target.t = T.RIO; target.br = 1;
const sie = at(g, 2, 0);
sie.u = { type: 'SIE', tier: 1, owner: 0, mv: 1, at: 1 };
opts = HF.options(g, sie.i);
const sOpt = opts.get(target.i);
ok(sOpt && (sOpt.k === 'unbridge' || (sOpt.alt && sOpt.alt.some(a => a.k === 'unbridge'))),
  'Asedio a 2 casillas: opción Demoler puente');
r = HF.act(g, sie.i, target.i, 'unbridge');
ok(r.ok && !target.br, 'Asedio demoledor destruye el puente a distancia');
ok(sie.u.at === 0, 'Demolición con asedio: consume ataque');

g = makeGame();
const far = at(g, 0, 0);
far.t = T.RIO; far.br = 1;
const sie2 = at(g, 3, 0);
sie2.u = { type: 'SIE', tier: 1, owner: 0, mv: 1, at: 1 };
ok(!HF.options(g, sie2.i).has(far.i), 'Asedio a 3 casillas: no alcanza el puente');

// -------------------------------------------------------------------------
// 7. Carga de suministros: 3 turnos incomunicado, luego colapso
// -------------------------------------------------------------------------
g = makeGame();
// capital abastecida para que settle tenga una provincia principal
const capital = at(g, 0, 0);
capital.b = B.CIUDAD; capital.cap = 1; capital.o = 0; capital.sup = 1; capital.comp = 0;
// ingeniero fuera del territorio, sin suministro de la provincia
const mission = at(g, 3, 0);
mission.o = -1; mission.sup = 0; mission.comp = null;
mission.u = { type: 'ENG', tier: 1, owner: 0, mv: 1, at: 1, supply: 3 };
for (let t = 0; t < 3; t++) {
  g.turn = t + 1;
  HF.startTurn(g, f0(g));
  ok(!!mission.u, 'Carga de suministros: el ingeniero sobrevive el turno ' + (t + 1));
}
ok(mission.u && mission.u.supply === 0, 'Carga de suministros: se agota tras 3 turnos');
g.turn = 4;
HF.startTurn(g, f0(g));
ok(!mission.u, 'Sin carga y sin suministro, el ingeniero perece en el 4.º turno');

// -------------------------------------------------------------------------
// 8. Persistencia: puente y carga viajan en el guardado
// -------------------------------------------------------------------------
g = makeGame();
const savedBridge = at(g, 0, 0);
savedBridge.t = T.RIO; savedBridge.br = 1; savedBridge.brOwner = 0; savedBridge.brTurn = 7;
const savedEng = eng(g, 1, 0);
savedEng.supply = 2;
const snap = HF.serialize(g);
const g2 = HF.deserialize(JSON.parse(JSON.stringify(snap)));
const b2 = g2.cells[g2._grid ? g2._grid.idx(0, 0) : 0];
const e2 = g2.cells.find(c => c && c.u && c.u.type === 'ENG');
ok(!!b2 && b2.br === 1, 'Guardado: el puente persiste');
ok(!!e2 && e2.u.supply === 2, 'Guardado: la carga de suministros persiste');

console.log(fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK');
process.exit(fail ? 1 : 0);
