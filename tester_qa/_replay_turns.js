'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const sandbox = {
  console, HF: {}, Date, Math, JSON, Map, Set, Int8Array, Int16Array, Int32Array,
  Uint8Array, Float32Array, Array, Object, String, Number, Boolean, Error,
  performance: { now: () => Date.now() }, Blob, Response, CompressionStream, DecompressionStream,
  btoa: s => Buffer.from(s, 'binary').toString('base64'),
  atob: s => Buffer.from(s, 'base64').toString('binary')
};
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
const JS = path.join(__dirname, '..', 'js');
for (const f of ['util.js', 'config.js', 'data.js', 'names.js', 'mapgen.js', 'engine.js', 'diplomacy.js', 'diplomacy_ai.js', 'replay.js', 'progress.js', 'ai.js'])
  vm.runInContext(fs.readFileSync(path.join(JS, f), 'utf8'), sandbox, { filename: f });
const HF = sandbox.HF;
HF.updateFog = () => {};
// checkEnd/recordTimeline keep real for turn info, but avoid finish? fine.
const payload = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', '_gen', 'replay_payload.json'), 'utf8'));
const g = HF.newGame(Object.assign({}, payload.setup, { isReplay: true }));
g.fog = 'NONE'; g.fogMap = null; HF.updateFog(g);

function unitName(u) { return u ? (HF.UNITS[u.type] ? HF.UNITS[u.type].name : u.type) + ' N' + u.tier : '—'; }
function cellDesc(i) {
  const c = g.cells[i];
  if (!c) return '#' + i;
  return '#' + i + (c.city ? '(' + c.city + ')' : '') + ' ' + (c.b ? HF.BNAME[c.b] : HF.TNAME[c.t]) + (c.u ? ' [' + unitName(c.u) + ']' : '');
}
function describe(t) {
  const actor = g.cur, f = g.f[actor];
  const who = f ? f.name : 'F' + actor;
  if (t[0] === 1) {
    const from = g.cells[t[1]], u = from && from.u;
    const kind = t[3] || 'move';
    let s = who + ': ' + (u ? unitName(u) : 'unidad') + ' ' + cellDesc(t[1]) + ' → ' + cellDesc(t[2]) + ' [' + kind + ']';
    if (t[2] && g.cells[t[2]] && g.cells[t[2]].u) s += ' vs ' + unitName(g.cells[t[2]].u);
    return s;
  }
  if (t[0] === 2) return who + ': construye ' + HF.BNAME[t[1]] + ' en ' + cellDesc(t[2]);
  if (t[0] === 3) return who + ': recluta ' + (HF.UNITS[t[1]] ? HF.UNITS[t[1]].name : t[1]) + ' en ' + cellDesc(t[2]);
  if (t[0] === 5) return who + ': préstamo en ' + cellDesc(t[1]);
  if (t[0] === 10) return who + ': banca ' + t[2] + ' ' + t[1] + ' en ' + cellDesc(t[3]);
  return who + ': ' + JSON.stringify(t);
}
let idx = 0, stop = false;
for (; idx < payload.log.length && !stop; idx++) {
  const t = payload.log[idx];
  if (t[0] === 4) {
    // Reporte de la fase que acaba de terminar
    const f = g.f[g.cur];
    if (f && !f.human) {
      const r = HF.aiReport(g, g.cur);
      console.log('  --- fin fase IA ' + f.name + ' | ' + JSON.stringify({
        stance: r.stance, enemy: r.enemy, terr: r.territory, units: r.units,
        res: r.resources, naval: r.naval, cuts: r.cutTargets.slice(0, 2), raid: r.raid
      }));
    }
    try { HF.replayPhase(g, t[1]); } catch (e) { console.log('phase fail', idx, e.message); stop = true; }
    if (!stop) console.log('T' + g.turn + ' fase de ' + (g.f[g.cur] ? g.f[g.cur].name : '?'));
    continue;
  }
  const f = g.f[g.cur];
  console.log('  ' + describe(t));
  try { HF.replayApply(g, t); } catch (e) { console.log('  !! FALLO replay idx ' + idx + ': ' + e.message + ' | ' + JSON.stringify(t)); stop = true; }
}
console.log('stopped at', idx, 'turn', g.turn);
