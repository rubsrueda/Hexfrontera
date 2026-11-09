'use strict';
// Sonda temporal: reconstruye los registros del WAL de LevelDB (32 KB por
// bloque, cabecera CRC+len+type) y extrae el autoguardado de localStorage
// (UTF-16LE) para resumir ejército, doctrinas y tesorería. Solo diagnóstico.
const fs = require('fs');
const file = process.argv[2];
const b = fs.readFileSync(file, 'latin1');
const BLOCK = 32768;
const out = [];
let pending = [];
let pos = 0;
while (pos < b.length) {
  const blockEnd = Math.min(b.length, (Math.floor(pos / BLOCK) + 1) * BLOCK);
  while (pos + 7 <= blockEnd) {
    const len = b.charCodeAt(pos + 4) | (b.charCodeAt(pos + 5) << 8);
    const type = b.charCodeAt(pos + 6);
    if (len === 0 && type === 0) { pos = blockEnd; break; }        // relleno
    const data = b.slice(pos + 7, pos + 7 + len);
    pos += 7 + len;
    if (type === 1 || type === 2) pending = [data];
    else if (type === 3) pending.push(data);
    else if (type === 4) { pending.push(data); out.push(pending.join('')); pending = []; }
  }
}
const saves = [];
for (const batch of out) {
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
  try { saves.push(JSON.parse(txt.slice(0, end))); } catch (e) { /* registro parcial */ }
}
console.log('registros', out.length, '· autoguardados', saves.length);
if (saves.length) {
  const o = saves[saves.length - 1];
  const units = {};
  for (const c of o.cells) if (c && c.u) { const k = c.u.type + 'N' + c.u.tier; units[k] = (units[k] || 0) + 1; }
  const provs = [...new Set(o.cells.filter(c => c && c.o === 0 && c.sup).map(c => c.comp))];
  console.log(JSON.stringify({
    turn: o.turn, R: o.R, tags: o.f[0].tags, units, provs,
    stock: o.f[0].stock, gold: o.f[0].gold, food: o.f[0].food, wood: o.f[0].wood
  }, null, 1));
}
