#!/usr/bin/env node
'use strict';
/**
 * tester_qa/ai_strategy_test.js
 *
 * Regresión de la IA estratégica:
 *   1. La proyección de amenaza detecta lo que puede golpear cada rival.
 *   2. La IA no deja una unidad parada en una casilla sentenciada si tiene una
 *      salida segura (retirada/guarnición).
 *   3. Gestión de árboles: tala un árbol propio con recurso bloqueado.
 *   4. Banca: compra comida con oro cuando el granero está a cero.
 *   5. Construcción: funda/mejora asentamientos y calzadas con recursos.
 *   6. Plan anfibio: no invade su propia masa de tierra y elige playa.
 *   7. Diplomacia: firma tratados sin romper el turno ni el cierre de ronda.
 *   8. Simulación larga en varios biomas sin excepciones ni fallos internos.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = {
  console, HF: {}, Date, Math, JSON, Map, Set, Int8Array, Int16Array,
  Uint8Array, Float32Array, performance: { now: () => Date.now() }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const JS = path.join(__dirname, '..', 'js');
const FILES = ['util.js', 'config.js', 'data.js', 'names.js', 'mapgen.js',
  'engine.js', 'diplomacy.js', 'diplomacy_ai.js', 'ai.js', 'progress.js'];
for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(JS, f), 'utf8'), sandbox, { filename: f });

const HF = sandbox.HF;
HF.updateFog = () => { };
HF.checkEnd = () => { };
HF.recordTimeline = () => { };

let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };
const tribe = () => Object.assign({ name: 'Prueba', color: HF.COLORS[0], crest: HF.CRESTS[0] }, HF.PRESETS[0]);
function makeGame(spec) {
  return HF.makeGame(Object.assign({
    size: 'small', seed: 4242, biome: 'plains', fog: 'NONE', difficulty: 'normal', n: 2,
    startRes: { gold: 200, food: 200, wood: 200 }
  }, spec), tribe());
}
function aiCells(g, me) { return g.cells.filter(c => c && c.u && c.u.owner === me); }
function faults() { try { return Object.keys(HF.dipFaults()); } catch (e) { return ['dipFaults']; } }

// =====================================================================
// 1. Proyección de amenaza
// =====================================================================
console.log('--- 1. Amenaza proyectada ---');
{
  const g = makeGame({ seed: 1234 });
  g.cur = 1;
  let foe = g.cells.find(c => c && c.u && c.u.owner === 0);
  let own = g.cells.find(c => c && c.u && c.u.owner === 1);
  ok(!!foe && !!own, 'hay unidades de ambos bandos');
  if (foe && own) {
    foe.u.tier = 3;
    const th = HF.aiThreat(g, 1);
    const nb = HF.nbs(g, foe.i).filter(i => g.cells[i] && g.cells[i].t !== HF.T.MAR);
    const near = nb.map(i => th.danger[i] || 0);
    ok(Math.max.apply(null, near) >= 3, 'una infantería N3 proyecta ataque 3 en sus vecinos');
    ok((th.dangerNow[foe.i] || 0) === 0, 'la casilla del propio rival no se marca como amenaza propia');
  }
}

// =====================================================================
// 2. Retirada / guarnición
// =====================================================================
console.log('--- 2. La IA evita quedarse en una casilla letal ---');
{
  let verified = false;
  for (let seed = 1; seed <= 12 && !verified; seed++) {
    const g = makeGame({ seed, startRes: { gold: 400, food: 400, wood: 400 } });
    g.cur = 1;
    const foe = g.cells.find(c => c && c.u && c.u.owner === 0 && c.t !== HF.T.MAR);
    const unitCell = g.cells.find(c => c && c.u && c.u.owner === 1 && c.u.type !== 'BAR');
    if (!foe || !unitCell) continue;
    // Relocalizar la unidad de la IA en una casilla libre junto al rival N3.
    const spot = HF.nbs(g, foe.i).map(i => g.cells[i]).find(c => c && c.t !== HF.T.MAR && !c.u && !c.b);
    if (!spot) continue;
    foe.u.tier = 3;
    const unit = unitCell.u;
    unitCell.u = null;
    spot.u = unit; spot.o = 1; spot.cap = 0;
    unit.mv = 1; unit.at = 1;
    HF.supply(g);
    const start = spot.i;
    HF.aiPlay(g, 1);
    // Buscar la misma instancia de unidad; si cambió de casilla, se retiró.
    let moved = true;
    for (const c of g.cells) if (c && c.u === unit) moved = c.i !== start;
    ok(moved, 'la unidad no se queda clavada junto a un N3 (seed ' + seed + ')');
    verified = true;
  }
  ok(verified, 'se encontró un escenario de retirada');
}

// =====================================================================
// 3. Árboles
// =====================================================================
console.log('--- 3. Gestión de árboles ---');
{
  let done = false;
  for (let seed = 1; seed <= 20 && !done; seed++) {
    const g = makeGame({ seed, biome: 'forest', startRes: { gold: 200, food: 200, wood: 0 } });
    g.cur = 1;
    const unitCell = g.cells.find(c => c && c.u && c.u.owner === 1 && c.u.type !== 'BAR');
    if (!unitCell) continue;
    // Construir el escenario exacto: un árbol de MADERA propio junto a la tropa.
    const t = HF.nbs(g, unitCell.i).map(i => g.cells[i]).find(c =>
      c && c.t !== HF.T.MAR && !c.u && !HF.isSettle(c.b) && c.i !== unitCell.i);
    if (!t) continue;
    t.o = 1; t.cap = 0; t.b = HF.B.ARBOL; t.res = HF.RES.MADERA; t.u = null;
    unitCell.u.mv = 1; unitCell.u.at = 1;
    g.f[1].wood = 0;
    HF.supply(g);
    HF.aiPlay(g, 1);
    if (t.b !== HF.B.ARBOL || (g.f[1].wood || 0) > 0) {
      ok(true, 'la IA tala el árbol de madera propio (seed ' + seed + ')');
      done = true;
    }
  }
  ok(done, 'se observó al menos una tala');
}

// =====================================================================
// 4. Banca
// =====================================================================
console.log('--- 4. Banca de la capital ---');
{
  const g = makeGame({ seed: 777, startRes: { gold: 500, food: 0, wood: 100 } });
  g.cur = 1;
  const cap = g.cells.find(c => c && c.o === 1 && c.b === HF.B.CIUDAD);
  ok(!!cap, 'la IA tiene capital');
  if (cap) {
    const s = g.f[1].stock[cap.comp];
    s.food = 0; s.gold = 400; g.f[1].food = 0; g.f[1].gold = 400;
    HF.aiPlay(g, 1);
    const after = g.f[1].stock[cap.comp];
    ok((after.food || 0) > 0 || (g.f[1].loan && g.f[1].loan.turns > 0), 'compra comida (o pide préstamo) en vez de dejar el granero a cero');
  }
}

// =====================================================================
// 5. Construcción y provincias
// =====================================================================
console.log('--- 5. Construcción ---');
{
  const g = makeGame({ seed: 2026, startRes: { gold: 500, food: 500, wood: 500 } });
  g.cur = 1;
  const count = () => g.cells.filter(c => c && c.o === 1 && c.b > 0).length;
  const before = count();
  for (let t = 0; t < 5; t++) HF.endTurn(g, HF.aiPlay);
  ok(count() > before, 'la IA construye/mejora con recursos (' + before + ' → ' + count() + ')');
  ok((HF.provinces(g, g.f[1]) || []).length >= 1, 'mantiene al menos una provincia abastecida');
}

// =====================================================================
// 6. Plan anfibio
// =====================================================================
console.log('--- 6. Plan anfibio ---');
{
  const g = makeGame({ seed: 4242, biome: 'archipelago', startRes: { gold: 200, food: 200, wood: 200 } });
  g.cur = 1;
  const a = HF.aiAnalysis(g, 1);
  const homeComp = a.comp[a.capital ? a.capital.i : 0];
  const plan = HF.aiNavalPlan(g, 1);
  ok(!!plan && typeof plan.needTransport === 'boolean', 'el plan naval se calcula sin lanzar');
  ok(!plan || plan.targetComp < 0 || plan.targetComp !== homeComp, 'no planifica invadir su propia masa de tierra');
  if (plan && plan.targetComp >= 0) {
    ok(plan.beaches.length > 0 && plan.wf, 'si hay objetivo, define playa y campo de agua');
  } else {
    ok(true, 'sin isla rentable no fuerza una flota (evita el bloqueo económico)');
  }

  // Desembarco controlado: 3 transportes cargados junto a una isla objetivo.
  let landed = false;
  for (let seed = 1; seed <= 20 && !landed; seed++) {
    const g2 = makeGame({ seed, biome: 'archipelago', startRes: { gold: 300, food: 300, wood: 300 } });
    g2.cur = 1;
    const a2 = HF.aiAnalysis(g2, 1);
    if (!a2) continue;
    const home = a2.comp[a2.capital ? a2.capital.i : -1];
    const target = a2.naval.scores.find(s => s.comp !== home && s.wd < 999);
    if (!target) continue;
    const beaches = [];
    const usedWater = new Set();
    for (const c of g2.cells) {
      if (!c || a2.comp[c.i] !== target.comp || c.t === HF.T.MAR) continue;
      for (const nb of HF.nbs(g2, c.i)) {
        const w = g2.cells[nb];
        if (w && !w.u && !usedWater.has(nb) && (w.t === HF.T.MAR || w.t === HF.T.RIO)) { beaches.push(nb); usedWater.add(nb); break; }
      }
    }
    if (beaches.length < 3) continue;
    g2._aiNavalTarget = { comp: target.comp, beach: -1, until: g2.turn + 8 };
    g2._aiNavalSince = g2.turn;
    for (let k = 0; k < 3; k++) {
      g2.cells[beaches[k]].u = { type: 'BAR', tier: 1, owner: 1, mv: 1, at: 1, cargo: { type: 'INF', tier: 1, owner: 1, mv: 1, at: 1 } };
    }
    HF.aiPlay(g2, 1);
    const onTarget = g2.cells.filter(c => c && c.u && c.u.owner === 1 && c.u.type !== 'BAR' && a2.comp[c.i] === target.comp);
    if (onTarget.length) {
      ok(true, 'la IA desembarca una oleada en la isla objetivo (' + onTarget.length + ' unidades)');
      landed = true;
    }
  }
  ok(landed, 'se produjo al menos un desembarco real');
}

// =====================================================================
// 7. Diplomacia
// =====================================================================
console.log('--- 7. Diplomacia ---');
{
  const facs = [];
  for (let k = 0; k < 3; k++) {
    const p = HF.PRESETS[k % HF.PRESETS.length];
    facs.push({ name: 'F' + k, color: HF.COLORS[k], crest: HF.CRESTS[k], human: k === 0, alma_path: p.alma_path, arma_path: p.arma_path, victoria_path: p.victoria_path });
  }
  const g = HF.newGame({ R: 10, seed: 9090, biome: 'plains', fog: 'NONE', difficulty: 'normal', factions: facs, startRes: { gold: 200, food: 200, wood: 200 } });
  for (let t = 0; t < 60; t++) HF.endTurn(g, HF.aiPlay);
  const signed = (g.diplomacyLog || []).filter(e => e.type === 'signed').length;
  const proposals = (g.diplomacyLog || []).filter(e => e.type === 'proposal').length;
  ok(proposals > 0, 'la IA propone tratados (' + proposals + ' propuestas)');
  ok(signed > 0, 'la IA firma tratados (' + signed + ')');
  ok(faults().length === 0, 'la diplomacia no registra fallos internos (' + faults().join(',') + ')');
  ok(g.f.every(f => Array.isArray(f.treaties)), 'los tratados siguen siendo arrays válidos');
}

// =====================================================================
// 9. Corte de suministro y sacrificio
// =====================================================================
console.log('--- 9. Corte de líneas de suministro ---');
{
  let verified = false;
  for (let seed = 1; seed <= 12 && !verified; seed++) {
    const g = makeGame({ size: 'medium', seed, startRes: { gold: 200, food: 200, wood: 200 } });
    const cap1 = g.cells.find(c => c && c.o === 1 && c.b === HF.B.CIUDAD);
    const start = g.cells.find(c => c && c.t !== HF.T.MAR && c.o === -1 && !c.b &&
      HF.hexDist(c, cap1) > 6 && HF.nbs(g, c.i).every(i => !g.cells[i] || g.cells[i].o < 0));
    if (!start) continue;
    // Crear un corredor enemigo de 6 casillas con un pueblo en el extremo.
    const path = [];
    const seen = new Set([start.i]);
    let cur = start;
    while (path.length < 6) {
      path.push(cur);
      const nb = HF.nbs(g, cur.i).map(i => g.cells[i]).filter(c => c && c.t !== HF.T.MAR && c.o < 0 && !c.b && !seen.has(c.i));
      if (!nb.length) break;
      cur = nb[0]; seen.add(cur.i);
    }
    if (path.length < 5) continue;
    path.forEach(c => { c.o = 1; c.b = 0; c.res = 0; c.u = null; });
    path[path.length - 1].b = HF.B.PUEBLO;
    path[1].u = { type: 'INF', tier: 2, owner: 1, mv: 1, at: 1 };
    path[2].u = { type: 'INF', tier: 1, owner: 1, mv: 1, at: 1 };
    const spot = HF.nbs(g, path[0].i).map(i => g.cells[i]).find(c => c && c.t !== HF.T.MAR && !c.u && !c.b);
    if (!spot) continue;
    spot.o = 0; spot.u = { type: 'INF', tier: 1, owner: 0, mv: 1, at: 1 };
    HF.supply(g); HF.initStock(g);
    const mid = path[2];
    const cut = HF.aiCutValue(g, 0, mid.i);
    const a = HF.aiAnalysis(g, 0);
    const raid = Object.keys(a.raid || {}).length;
    if (cut > 0 && raid > 0) {
      ok(true, 'detecta el punto de corte (' + cut + ') y asigna una incursión');
      verified = true;
    }
  }
  ok(verified, 'la IA planifica sacrificar una unidad para cortar suministros');
}

// =====================================================================
// 10. Simulación larga
// =====================================================================
console.log('--- 10. Simulación larga sin excepciones ---');
{
  const biomes = ['plains', 'forest', 'mountains', 'archipelago'];
  let errors = 0, grew = 0;
  for (let k = 0; k < biomes.length; k++) {
    const g = makeGame({ seed: 100 + k * 37, biome: biomes[k], size: 'small' });
    const startTerr = g.cells.filter(c => c && c.o === 1).length;
    try {
      for (let t = 0; t < 15; t++) {
        HF.endTurn(g, HF.aiPlay);
        if (g.over) break;
      }
      const now = g.cells.filter(c => c && c.o === 1).length;
      if (now > startTerr) grew++;
    } catch (e) {
      errors++;
      console.error('  excepción en ' + biomes[k] + ': ' + e.message);
    }
  }
  ok(errors === 0, '15 rondas en 4 biomas sin excepciones');
  ok(grew >= 2, 'la IA expande territorio en varios biomas (' + grew + '/4)');
  ok(faults().length === 0, 'sin fallos internos de IA/diplomacia: ' + faults().join(','));
}

console.log(fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK');
process.exit(fail ? 1 : 0);
