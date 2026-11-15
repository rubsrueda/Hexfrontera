'use strict';
// Prueba del generador de mapas: carga util/config/data/mapgen en Node y
// valida que HF.generateMap produzca tableros jugables, deterministas y con
// terreno bien formado. Sin dependencias.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// Carga los módulos en el mismo orden que index.html. Se usa el contexto
// global de este proceso (aislado por run_all.js) vía eval; los IIFE se
// anclan a `window`/`globalThis`.
global.window = global;
for (const f of ['util.js', 'config.js', 'data.js', 'mapgen.js']) {
  eval(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'));
}
const HF = global.HF;
if (!HF || typeof HF.generateMap !== 'function') {
  console.error('FAIL: HF.generateMap no está definido tras cargar los módulos');
  process.exit(1);
}

let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };

const VALID_T = [0, 1, 2, 3, 4];
const T = HF.T;

function analyze(m) {
  const counts = { sea: 0, plain: 0, hill: 0, mtn: 0, river: 0 };
  let bad = 0, nonNull = 0;
  for (const c of m.cells) {
    if (!c) continue;
    nonNull++;
    if (!VALID_T.includes(c.t)) bad++;
    if (c.t === T.MAR) counts.sea++;
    else if (c.t === T.LLANO) counts.plain++;
    else if (c.t === T.COLINA) counts.hill++;
    else if (c.t === T.MONTANA) counts.mtn++;
    else if (c.t === T.RIO) counts.river++;
  }
  const caps = m.caps.filter(ci => ci != null && m.cells[ci]);
  const capsOnLand = caps.every(ci => m.cells[ci].t !== T.MAR && m.cells[ci].t !== T.MONTANA);
  return { counts, bad, nonNull, caps, capsOnLand };
}

// ---- 1. Genera sin lanzar en varios tamaños/biomas/facciones ----
const cases = [
  { R: 8, seed: 1, biome: 'plains', factions: 2 },
  { R: 14, seed: 12345, biome: 'plains', factions: 4 },
  { R: 14, seed: 12345, biome: 'forest', factions: 3 },
  { R: 14, seed: 12345, biome: 'mountains', factions: 3 },
  { R: 14, seed: 12345, biome: 'archipelago', factions: 4 },
  { R: 21, seed: 999, biome: 'plains', factions: 6 },
];
for (const tc of cases) {
  let m = null, err = null;
  try { m = HF.generateMap(tc); } catch (e) { err = e; }
  ok(!err, `genera ${tc.biome} R${tc.R} F${tc.factions} sin excepción` + (err ? ': ' + err.message : ''));
  if (!m) continue;

  const hex = HF.circleCount(tc.R);
  const a = analyze(m);
  ok(a.nonNull === hex, `  ${tc.biome} R${tc.R}: ${hex} celdas hexagonales reales (${a.nonNull})`);
  ok(a.bad === 0, `  ${tc.biome} R${tc.R}: terreno válido (0 malos, ${a.bad})`);
  ok(m.cells.length >= hex, `  ${tc.biome} R${tc.R}: grid de ${hex} celdas (${m.cells.length})`);
  ok(a.caps.length === tc.factions, `  ${tc.biome} R${tc.R}: ${tc.factions} capitales (${a.caps.length})`);
  ok(a.capsOnLand, `  ${tc.biome} R${tc.R}: capitales en tierra transitable`);
  ok(a.counts.sea > 0, `  ${tc.biome} R${tc.R}: hay mar (${a.counts.sea})`);
  ok(a.counts.plain + a.counts.hill > 0, `  ${tc.biome} R${tc.R}: hay tierra (llano ${a.counts.plain} + colina ${a.counts.hill})`);
  if (tc.biome !== 'archipelago') ok(a.counts.river > 0, `  ${tc.biome} R${tc.R}: hay ríos (${a.counts.river})`);

  // presupuesto de jugabilidad: celdas construibles (llano+colina) ≥ mínimo por facción
  if (tc.biome !== 'archipelago') {
    const budget = (HF.CFG.mapgen.minPlayablePerFaction || 0) * tc.factions;
    const buildable = a.counts.plain + a.counts.hill;
    ok(buildable >= budget, `  ${tc.biome} R${tc.R}: presupuesto construible ${buildable} ≥ ${budget}`);
  }

  // distancia mínima entre capitales (informativa; detecta apiñamiento)
  let minDist = Infinity;
  for (let i = 0; i < m.caps.length; i++) for (let j = i + 1; j < m.caps.length; j++)
    minDist = Math.min(minDist, HF.hexDist(m.cells[m.caps[i]], m.cells[m.caps[j]]));
  console.log(`  info ${tc.biome} R${tc.R}: distancia mínima entre capitales ${minDist.toFixed(1)} hex`);

  // capitales nunca adyacentes al mar (≥1 casilla de la costa)
  const capAdjSea = m.caps.filter(ci => m.grid.nb[ci].some(j => m.cells[j] && m.cells[j].t === T.MAR)).length;
  ok(capAdjSea === 0, `  ${tc.biome} R${tc.R}: ninguna capital pegada al mar (${capAdjSea})`);

  // lagos interiores: hay al menos un cuerpo de agua no conectado al borde (continental)
  if (tc.biome !== 'archipelago') {
    const R = tc.R, isEdge = c => Math.max(Math.abs(c.q), Math.abs(c.r), Math.abs(c.q + c.r)) === R;
    const sea = new Set(), q = [];
    for (const c of m.cells) if (c && c.t === T.MAR && isEdge(c)) { sea.add(c.i); q.push(c.i); }
    let h = 0; while (h < q.length) { const x = q[h++]; for (const y of m.grid.nb[x]) { const nc = m.cells[y]; if (nc && nc.t === T.MAR && !sea.has(y)) { sea.add(y); q.push(y); } } }
    let lakes = 0; for (const c of m.cells) if (c && c.t === T.MAR && !sea.has(c.i)) lakes++;
    ok(lakes > 0, `  ${tc.biome} R${tc.R}: hay lagos interiores (${lakes})`);
  }
}

// ---- 2. Determinismo: misma semilla -> mismo mapa ----
const m1 = HF.generateMap({ R: 12, seed: 42, biome: 'plains', factions: 3 });
const m2 = HF.generateMap({ R: 12, seed: 42, biome: 'plains', factions: 3 });
const sameT = m1.cells.every((c, i) => !c ? !m2.cells[i] : m2.cells[i] && c.t === m2.cells[i].t);
const sameCaps = JSON.stringify(m1.caps) === JSON.stringify(m2.caps);
ok(sameT, 'determinismo: mismo terreno con misma semilla');
ok(sameCaps, 'determinismo: mismas capitales con misma semilla');

// ---- 3. Distintas semillas -> mapas distintos ----
const m3 = HF.generateMap({ R: 12, seed: 43, biome: 'plains', factions: 3 });
const diff = m1.cells.some((c, i) => c && m3.cells[i] && c.t !== m3.cells[i].t);
ok(diff, 'variedad: semillas distintas producen terreno distinto');

console.log(fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK');
process.exit(fail ? 1 : 0);
