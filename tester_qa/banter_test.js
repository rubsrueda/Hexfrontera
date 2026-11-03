'use strict';
// Motor de banter: secuencias escalonadas, interrupción, inactividad,
// adyacencia, pánico logístico y voces de edificios. Sin navegador.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HF = {};
const sandbox = { console, HF, window: null, navigator: { onLine: false }, localStorage: null, setTimeout, clearTimeout };
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ['util.js', 'config.js', 'data.js', 'banter_data.js', 'banter.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox);

let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Captura de burbujas y ritmo acelerado para la prueba.
const bubbles = [];
HF.bubbleAt = (g, i, txt, kind, life) => bubbles.push({ i, txt, kind, life });
Object.assign(HF.CFG.banter, { idle: .05, cooldown: 0, perTurn: 99, delay: .05, life: .15, interruptLife: .1, enemyChance: 1, allyChance: 1, buildingChance: 1 });
vm.runInContext('Math.random = () => 0;', sandbox);

const mk = (type, owner) => ({ type, owner, tier: 1, mv: 1, at: 1 });
const g = { turn: 1, mySeat: 0, over: false, cells: [] };
for (let i = 0; i < 8; i++) g.cells.push({ i, u: null, b: 0 });
g.cells[0].u = mk('INF', 0);
g.cells[1].u = mk('INF', 1);
g.cells[2].u = mk('CAB', 0);
g.cells[3].b = HF.B.CAMPAMENTO;
g.cells[4].b = HF.B.CIUDAD; g.cells[4].cap = 1; g.cells[4].o = 0;
g.cells[3].u = mk('INF', 0);

(async () => {
  // 1. Secuencia escalonada.
  HF.banter.stop(); HF.banter._g = g; bubbles.length = 0;
  HF.banter.startSequence(g, [{ i: 0, text: 'A', kind: 'enemy' }, { i: 1, text: 'B', kind: 'enemy' }]);
  ok(bubbles.length === 1 && bubbles[0].txt === 'A', 'el primer paso sale ya');
  await sleep(90);
  ok(bubbles.length === 2 && bubbles[1].txt === 'B', 'el segundo paso sale tras el retardo');
  ok(bubbles[0].txt === 'A', 'la burbuja anterior no se borró');

  // 2. Interrupción "¡A callar!".
  HF.banter.stop(); HF.banter._g = g; bubbles.length = 0;
  HF.banter.startSequence(g, [{ i: 0, text: 'A', kind: 'enemy' }, { i: 1, text: 'B', kind: 'enemy' }]);
  await sleep(10);
  ok(HF.banter.isTalking(0) && HF.banter.isTalking(1), 'la casilla está hablando');
  ok(HF.banter.silence(0) === true, 'silence corta la conversación');
  HF.banter.stop();
  await sleep(90);
  ok(!bubbles.some(b => b.txt === 'B'), 'el paso pendiente se canceló');
  ok(bubbles.some(b => b.kind === 'interrupt'), 'suelta una burbuja de sumisión');
  ok(!HF.banter.isTalking(0), 'deja de estar hablando');

  // 3. Chisme por inactividad.
  HF.banter.stop(); bubbles.length = 0;
  HF.banter.init(g);
  await sleep(140);
  ok(bubbles.length >= 2, 'tras la inactividad dos unidades conversan');
  HF.banter.stop();

  // 4. Adyacencia: enemigo y aliado de otro cuerpo.
  HF.banter.stop(); HF.banter._g = g; bubbles.length = 0;
  ok(HF.banter.triggerAdjacent(g, 0, 1) === true, 'duelo con el enemigo adyacente');
  await sleep(70);
  ok(bubbles.some(b => b.kind === 'enemy'), 'burbujas carmesí de enemigo');
  HF.banter.stop(); HF.banter._g = g; bubbles.length = 0;
  ok(HF.banter.triggerAdjacent(g, 0, 2) === true, 'rencilla entre INF y CAB aliados');
  await sleep(70);
  ok(bubbles.some(b => b.kind === 'ally'), 'burbujas azules de aliado');
  HF.banter.stop(); HF.banter._g = g;
  ok(HF.banter.triggerAdjacent(g, 0, 3) === false, 'dos unidades del mismo tipo no discuten');

  // 5. Pánico logístico.
  HF.banter.stop(); HF.banter._g = g; bubbles.length = 0;
  ok(HF.banter.triggerSupplyPanic(g, 0) === true, 'pánico por suministro cortado');
  await sleep(90);
  ok(bubbles.length >= 2, 'la tropa se queja de la intendencia');
  HF.banter.stop();

  // 6. Voz de edificio.
  HF.banter.stop(); HF.banter._g = g; bubbles.length = 0;
  ok(HF.banter.triggerBuildingBanter(g, 3) === true, 'el campamento suelta su queja');
  await sleep(30);
  ok(bubbles.length === 1 && bubbles[0].i === 3, 'burbuja sobre el edificio');

  HF.banter.stop();
  // 7. Conversación ambiental inmediata.
  HF.banter.stop(); HF.banter._g = g; bubbles.length = 0;
  ok(HF.banter.triggerAmbient(g) === true, 'conversación ambiental entre unidades');
  await sleep(90);
  ok(bubbles.length >= 2, 'pregunta y respuesta ambientales');

  // 8. El temporizador ambiental dispara solo.
  HF.banter.stop(); bubbles.length = 0;
  Object.assign(HF.CFG.banter, { ambientStart: .05, ambientEvery: .08, idle: 999 });
  HF.banter.init(g);
  await sleep(320);
  ok(bubbles.length > 0, 'la charla ambiental corre sola cada pocos segundos');
  HF.banter.stop();

  // 9. Apertura capital + unidad.
  HF.banter.stop(); HF.banter._g = g; bubbles.length = 0;
  ok(HF.banter.triggerOpening(g) === true, 'diálogo de apertura capital-unidad');
  await sleep(100);
  ok(bubbles.length >= 2, 'la capital y la unidad hablan al empezar');

  // 10. Con una sola unidad, la ciudad le habla igualmente.
  const g3 = { turn: 1, mySeat: 0, over: false, cells: [] };
  for (let i = 0; i < 6; i++) g3.cells.push({ i, u: null, b: 0 });
  g3.cells[0].u = mk('INF', 0);
  g3.cells[1].b = HF.B.CIUDAD; g3.cells[1].cap = 1; g3.cells[1].o = 0;
  HF.banter.stop(); HF.banter._g = g3; bubbles.length = 0;
  ok(HF.banter.triggerAmbient(g3) === true, 'una sola unidad charla con la ciudad');
  await sleep(100);
  ok(bubbles.length >= 2, 'pregunta de la ciudad y respuesta de la unidad');

  // 11. Anti-repetición: no repite una frase hasta agotar el repertorio.
  HF.banter._used = {};
  const probe = [];
  for (let k = 0; k < 4; k++) probe.push(HF.banter.pickFresh('probe', ['a', 'b', 'c', 'd']));
  ok(new Set(probe).size === 4, 'pickFresh no repite hasta agotar el repertorio');

  console.log(fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK');
  process.exit(fail ? 1 : 0);
})();
