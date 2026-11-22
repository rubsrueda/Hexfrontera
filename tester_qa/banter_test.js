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

  // 12. Descubrimientos: los avisos salen de datos existentes y no se repiten.
  const dg = {
    turn: 3, mySeat: 0, over: false, R: 2, seed: 11, biome: 'plains', meta: {},
    f: [{ id: 0, name: 'Federati', economy: { activeLoans: [] } }, { id: 1, name: 'Rivales' }],
    cells: [], treaties: [], diplomacyLog: []
  };
  for (let i = 0; i < 8; i++) dg.cells.push({ i, q: i, r: 0, u: null, b: 0, o: i === 0 ? 0 : -1 });
  dg.cells[0].u = mk('INF', 0);
  dg.cells[3].u = mk('INF', 1);
  HF.banter.stop(); HF.banter._g = dg; bubbles.length = 0;
  ok(HF.banter.triggerDiscoveries(dg) === true, 'avisa de las estadísticas de recursos tras varios turnos');
  ok(/ingresos, gastos y balance/.test(bubbles[0].txt), 'el aviso dirige al desglose real de recursos');
  ok(HF.banter.triggerDiscoveries(dg) === false, 'no repite un descubrimiento ya mostrado');

  // Las marcas de pantallas se guardan por partida; no se afirma que el
  // jugador omitió una pantalla después de haberla abierto.
  HF.banter.noteDiscovery(dg, 'resourcesViewed');
  dg.turn = 4;
  HF.banter.stop(); HF.banter._g = dg; bubbles.length = 0;
  ok(HF.banter.triggerDiscoveries(dg) === true, 'avisa de diplomacia si aún no se abrió');
  HF.banter.noteDiscovery(dg, 'diplomacyOpened');
  HF.banter.stop(); HF.banter._g = dg; bubbles.length = 0;
  ok(HF.banter.triggerDiscoveries(dg) === true && /vista del mapa/.test(bubbles[0].txt),
    'sugiere cambiar las vistas del mapa');
  HF.banter.noteDiscovery(dg, 'mapViewsChanged');
  dg._banterMapHistorySize = 2;
  dg.cells[0].b = HF.B.PUEBLO;
  dg.cells[1].o = 0; dg.cells[1].b = HF.B.CAMPAMENTO;
  dg.cells[0].city = 'Puerto Norte'; dg.cells[1].city = 'Isla Sur';
  HF.cargoDests = (game, faction, from) => from === 0 ? [game.cells[1]] : [];
  dg.turn = 4;
  HF.banter.stop(); HF.banter._g = dg; bubbles.length = 0;
  ok(HF.banter.triggerDiscoveries(dg) === true && /ruta marítima hasta Isla Sur/.test(bubbles[0].txt),
    'sugiere enviar carga solo si existe un destino marítimo aislado');
  dg.replayLog = [[9, 0, 1, 'food', 10]];
  HF.banter.stop(); HF.banter._g = dg; bubbles.length = 0;
  ok(HF.banter.triggerDiscoveries(dg) !== true || !/ruta marítima/.test(bubbles[0] && bubbles[0].txt || ''),
    'no sugiere un envío portuario si ya consta uno en la partida');
  HF.cargoDests = null;
  dg.replayLog = [];

  dg.turn = 5;
  HF.banter.stop(); HF.banter._g = dg; bubbles.length = 0;
  ok(HF.banter.triggerDiscoveries(dg) === true, 'avisa de préstamos cuando no constan solicitudes');
  ok(/No consta una solicitud/.test(bubbles[0].txt), 'el aviso de préstamo no inventa una petición previa');

  dg.turn = 6;
  dg.diplomacyLog = [{ type: 'loan_request', factions: [0] }];
  HF.banter.stop(); HF.banter._g = dg; bubbles.length = 0;
  ok(HF.banter.triggerDiscoveries(dg) === true, 'avisa de rutas cuando no hay envíos activos');
  ok(/No veo rutas comerciales activas/.test(bubbles[0].txt), 'el aviso describe solo las rutas que faltan');

  dg.treaties = [{ id: 7, type: 'non_aggression_pact', status: 'active', factions: [0, 1], expiryTurn: 7 }];
  HF.banter.stop(); HF.banter._g = dg; bubbles.length = 0;
  ok(HF.banter.triggerDiscoveries(dg) === true, 'detecta un tratado real próximo a vencer');
  ok(/vence en 2 turnos/.test(bubbles[0].txt), 'el aviso usa el vencimiento del tratado');

  // La concentración solo cuenta unidades rivales que la niebla deja ver.
  dg.treaties = [];
  dg.turn = 8;
  dg.cells[4].u = mk('INF', 1); dg.cells[5].u = mk('CAB', 1);
  dg.cells[3].q = 3; dg.cells[4].q = 4; dg.cells[5].q = 5;
  HF.visible = (game, i) => i !== 5;
  HF.banter.stop(); HF.banter._g = dg; bubbles.length = 0;
  ok(HF.banter.triggerDiscoveries(dg) !== true || !/concentradas/.test(bubbles[0] && bubbles[0].txt || ''),
    'no anuncia concentración con menos de tres enemigos visibles');
  HF.visible = () => true;
  HF.banter.stop(); HF.banter._g = dg; bubbles.length = 0;
  ok(HF.banter.triggerDiscoveries(dg) === true && /concentradas cerca/.test(bubbles[0].txt),
    'anuncia una concentración enemiga cuando hay tres unidades visibles');

  // Sin concentración, el termómetro compara tropas observadas y territorio.
  dg.cells[4].u = null; dg.cells[5].u = null;
  dg.cells[2].o = 1;
  dg.cells[3].u = mk('INF', 1);
  dg.turn = 9;
  HF.banter.stop(); HF.banter._g = dg; bubbles.length = 0;
  ok(HF.banter.triggerDiscoveries(dg) === true && /unidades/.test(bubbles[0].txt),
    'compara fuerzas usando enemigos visibles');

  const storeData = [];
  HF.store = {
    get: (key, fallback) => key === 'banter_seen_maps' ? storeData.slice() : fallback,
    set: (key, value) => { if (key === 'banter_seen_maps') storeData.splice(0, storeData.length, ...value); }
  };
  const mg = { seed: 44, R: 3, biome: 'plains', meta: {} };
  HF.banter.recordMap(mg);
  ok(mg._banterMapHistorySize === 1, 'registra el mapa actual en el historial local');
  HF.banter.recordMap({ seed: 45, R: 3, biome: 'plains', meta: {} });
  ok(storeData.length === 2, 'distingue mapas a partir de sus semillas reales');
  storeData.length = 0;
  const firstMap = { seed: 501, R: 2, biome: 'plains', meta: {} };
  HF.banter.recordMap(firstMap);
  dg.seed = firstMap.seed; dg.R = firstMap.R; dg.biome = firstMap.biome;
  HF.banter.recordMap(dg);
  dg.turn = 4;
  HF.banter.stop(); HF.banter._g = dg; bubbles.length = 0;
  ok(HF.banter.triggerDiscoveries(dg) === true && /único mapa anotado en el historial local/.test(bubbles[0].txt),
    'sugiere otro mapa solo cuando el historial local confirma uno');

  const waitingRoom = {
    status: 'ACTIVE', game_phase: 'SIMULTANEOUS', current_turn: 4,
    players_data: [
      { player_id: 'p0', is_ready: false },
      { player_id: 'p1', is_ready: true },
      { player_id: 'p2', is_ready: true }
    ]
  };
  HF.online = { room: () => waitingRoom, playerId: () => 'p0' };
  dg.online = true; dg.treaties = []; dg.turn = 10;
  HF.banter.stop(); HF.banter._g = dg; bubbles.length = 0;
  ok(HF.banter.triggerDiscoveries(dg) === true && /esperan a que termines/.test(bubbles[0].txt),
    'avisa cuando los demás están listos y el jugador aún no');
  waitingRoom.players_data[0].is_ready = true;
  waitingRoom.players_data[1].is_ready = false;
  waitingRoom.players_data[2].is_ready = true;
  HF.banter.stop(); HF.banter._g = dg; bubbles.length = 0;
  ok(HF.banter.triggerDiscoveries(dg) === true && /falta que un jugador/.test(bubbles[0].txt),
    'indica cuántos jugadores faltan después de terminar');

  waitingRoom.game_phase = 'TURN_BASED';
  waitingRoom.current_turn = 5;
  waitingRoom.players_data = [
    { player_id: 'p0', seat: 1 },
    { player_id: 'p1', seat: 2 },
    { player_id: 'p2', seat: 3 }
  ];
  waitingRoom.active_player = 'p1';
  dg.cells[3].u = null;
  dg._banterDiscoveryFlags.turnEnded = false;
  HF.banter.stop(); HF.banter._g = dg; bubbles.length = 0;
  ok(HF.banter.triggerDiscoveries(dg) === false, 'no atribuye espera al jugador antes de entregar su turno');
  dg._banterDiscoveryFlags.turnEnded = true;
  HF.banter.stop(); HF.banter._g = dg; bubbles.length = 0;
  ok(HF.banter.triggerDiscoveries(dg) === true && /2 jugadores deben jugar/.test(bubbles[0].txt),
    'cuenta los turnos pendientes solo después de entregar el turno');
  HF.online = null;

  console.log(fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK');
  process.exit(fail ? 1 : 0);
})();
