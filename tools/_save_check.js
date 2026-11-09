'use strict';
// Diagnóstico: carga el autoguardado real (WAL de Edge, UTF-16LE) en el motor
// y muestra lo que la barra superior pinta antes y después de fusionar.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// --- 1. Autoguardado desde el WAL de LevelDB ---
const b = fs.readFileSync(process.argv[2], 'latin1');
const BLOCK = 32768;
const batches = [];
let pending = [], pos = 0;
while (pos < b.length) {
  const blockEnd = Math.min(b.length, (Math.floor(pos / BLOCK) + 1) * BLOCK);
  while (pos + 7 <= blockEnd) {
    const len = b.charCodeAt(pos + 4) | (b.charCodeAt(pos + 5) << 8);
    const type = b.charCodeAt(pos + 6);
    if (len === 0 && type === 0) { pos = blockEnd; break; }
    const data = b.slice(pos + 7, pos + 7 + len);
    pos += 7 + len;
    if (type === 1 || type === 2) pending = [data];
    else if (type === 3) pending.push(data);
    else if (type === 4) { pending.push(data); batches.push(pending.join('')); pending = []; }
  }
}
let save = null;
const all = [];
for (const batch of batches) {
  const k = batch.indexOf('hf_savegame_active');
  if (k < 0) continue;
  const j = batch.indexOf('{\u0000"\u0000v\u0000', k);
  if (j < 0) continue;
  let txt = '';
  for (let i = j; i + 1 < batch.length; i += 2) txt += batch[i];
  let d = 0, end = -1;
  for (let i = 0; i < txt.length; i++) {
    if (txt[i] === '{') d++;
    else if (txt[i] === '}') { d--; if (d === 0) { end = i + 1; break; } }
  }
  if (end < 0) continue;
  try { save = JSON.parse(txt.slice(0, end)); all.push(save); } catch (e) { /* parcial */ }
}
if (!save) { console.error('No se encontró autoguardado'); process.exit(1); }
console.log('autoguardados en el WAL:', all.length);
for (const s of all) {
  const u = {};
  for (const c of s.cells) if (c && c.u && c.u.owner === 0) { const k = c.u.type + 'N' + c.u.tier; u[k] = (u[k] || 0) + 1; }
  console.log('  turno', s.turn, JSON.stringify(u));
}

// --- 2. Motor real ---
const HF = {};
const sandbox = { console, HF, window: null };
sandbox.window = sandbox;
vm.createContext(sandbox);
const ROOT = path.resolve(__dirname, '..', 'js');
for (const f of ['util.js', 'config.js', 'data.js', 'mapgen.js', 'engine.js'])
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox);
HF.updateFog = () => {};
HF.checkEnd = () => {};

const g = HF.deserialize(save);
const f = g.f[0];
const pv = () => HF.preview(g, f, null);
const fmt = p => 'comida ' + p.upkeep + ' · oro ' + p.upkeepGold + ' (ingreso +' + p.inc.food + '/+' + p.inc.gold + ')';
const count = () => {
  const u = {};
  for (const c of g.cells) if (c && c.u && c.u.owner === 0) { const k = c.u.type + 'N' + c.u.tier; u[k] = (u[k] || 0) + 1; }
  return u;
};

console.log('turno', g.turn, '· unidades', JSON.stringify(count()));
console.log('BAR:', g.cells.filter(c => c && c.u && c.u.type === 'BAR').map(c => ({ i: c.i, t: HF.TNAME[c.t], o: c.o, sup: c.sup, comp: c.comp })));
console.log('provincias abastecidas', HF.provinces(g, f), '· stock keys', Object.keys(f.stock));
console.log('HUD antes:', fmt(pv()));

// Busca una fusión INF N1+N1 y la ejecuta como un toque real.
let done = false;
for (const c of g.cells) {
  if (!c || !c.u || c.u.owner !== 0 || c.u.type !== 'INF' || c.u.tier !== 1) continue;
  const opts = HF.options(g, c.i);
  for (const [to, o] of opts) {
    if (o.k !== 'fuse') continue;
    const r = HF.act(g, c.i, to);
    console.log('fusión', r, '· origen', c.i, '→ destino', to, '· tier', g.cells[to].u && g.cells[to].u.tier);
    done = true; break;
  }
  if (done) break;
}
if (!done) console.log('No hay fusión disponible');
console.log('HUD después:', fmt(pv()));
const ev = g.events.filter(e => /Fusión|Pretoriano/.test(e.txt)).slice(-1)[0];
console.log('aviso:', ev ? ev.txt : '(ninguno)');
console.log('unidades tras fusión', JSON.stringify(count()));
