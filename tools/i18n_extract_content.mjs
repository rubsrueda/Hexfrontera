#!/usr/bin/env node
/* Extrae los textos de contenido (datos/config) y del corpus de unidades
 * que deben traducirse por catálogo HF.PHRASES.
 * Salida: D:\Agente\_gen\content_es.json y D:\Agente\_gen\banter_es.json
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JS = path.join(ROOT, 'js');
const OUT = 'D:/Agente/_gen';

function load(files) {
  const sandbox = {
    console,
    window: null,
    document: { documentElement: {}, getElementById: () => null },
    localStorage: null,
    setTimeout,
    clearTimeout,
    HF: {}
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(JS, f), 'utf8'), sandbox, { filename: f });
  return sandbox.HF;
}

const HF = load(['config.js', 'data.js', 'banter_data.js']);

const content = new Set();
const addStrings = v => {
  if (typeof v === 'string') {
    const s = v.trim();
    if (s.length > 1 && /[a-záéíóúñü]/i.test(s) && !/^[A-Z_0-9]{2,}$/.test(s)) content.add(s);
  } else if (Array.isArray(v)) v.forEach(addStrings);
  else if (v && typeof v === 'object') Object.values(v).forEach(addStrings);
};

if (HF.CFG) {
  for (const u of Object.values(HF.CFG.units || {})) addStrings(u.name);
  for (const s of Object.values(HF.CFG.sizes || {})) addStrings(s.name);
  for (const b of Object.values(HF.CFG.biomes || {})) addStrings(b.name);
}
addStrings(HF.TNAME);
addStrings(HF.BNAME);
addStrings(HF.CREST_NAMES);
addStrings(HF.AI_NAMES);
addStrings(HF.PILLARS);
addStrings(HF.IMPL);
addStrings(HF.CATALOG);
for (const d of Object.values(HF.DOCT || {})) addStrings(d.name);

const banter = new Set();
const walkBanter = v => {
  if (typeof v === 'string') {
    const s = v.trim();
    if (s.length > 2 && /[a-záéíóúñü¡¿]/i.test(s) && !/^(ANY|CITY|INF|ENG|ARC|CAB|SIE|BAR)$/.test(s)) banter.add(s);
  } else if (Array.isArray(v)) v.forEach(walkBanter);
  else if (v && typeof v === 'object') Object.values(v).forEach(walkBanter);
};
walkBanter(HF.BANTER_DATABASE);

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'content_es.json'), JSON.stringify([...content], null, 1), 'utf8');
fs.writeFileSync(path.join(OUT, 'banter_es.json'), JSON.stringify([...banter], null, 1), 'utf8');
console.log('content strings:', content.size, 'banter strings:', banter.size);
