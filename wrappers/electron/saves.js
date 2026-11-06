'use strict';
/* Almacén de guardados de Hexfrontier para Electron (sin dependencias de
   Electron: se puede probar con Node puro).

   Diseño:
   - Una clave = un archivo `hf_<clave>.json` dentro de userData/saves.
   - Escritura atómica: se escribe `<clave>.json.tmp` y se renombra encima. El
     rename es atómico en el mismo volumen, así un corte de luz nunca deja un
     JSON a medias.
   - Al arrancar, `repairOrphans()` promociona un `.tmp` huérfano si el archivo
     definitivo no existe o no parsea, y lo descarta si el definitivo está sano.
   - Las claves se validan contra una lista blanca: el renderer nunca puede
     construir rutas (nada de `../` ni separadores).
*/
const fs = require('node:fs');
const path = require('node:path');

const KEY_RE = /^[a-z0-9][a-z0-9_-]{0,79}$/i;
const MAX_BLOB = 64 * 1024 * 1024;   // 64 MB por clave

// getDir() se evalúa siempre: app.getPath('userData') puede cambiar y las
// pruebas inyectan una carpeta temporal.
function createStore(getDir) {
  const dir = () => getDir();
  const file = key => {
    if (typeof key !== 'string' || !KEY_RE.test(key)) {
      throw new Error('clave de guardado inválida: ' + String(key).slice(0, 40));
    }
    return path.join(dir(), 'hf_' + key + '.json');
  };

  function ensure() { fs.mkdirSync(dir(), { recursive: true }); }

  function readKey(key) {
    try { return fs.readFileSync(file(key), 'utf8'); }
    catch (e) { return null; }
  }

  function writeKey(key, raw) {
    if (typeof raw !== 'string') throw new Error('valor no textual');
    if (raw.length > MAX_BLOB) throw new Error('guardado demasiado grande');
    ensure();
    const target = file(key);
    const tmp = target + '.tmp';
    fs.writeFileSync(tmp, raw, 'utf8');
    fs.renameSync(tmp, target);
    return raw.length;
  }

  function deleteKey(key) {
    try { fs.unlinkSync(file(key)); return true; }
    catch (e) { return false; }
  }

  // Lote de [clave, string|null]. Devuelve cuántas operaciones se aplicaron.
  function writeEntries(entries) {
    let n = 0;
    for (const entry of Array.isArray(entries) ? entries : []) {
      if (!Array.isArray(entry) || typeof entry[0] !== 'string') continue;
      try {
        if (entry[1] == null) deleteKey(entry[0]);
        else writeKey(entry[0], entry[1]);
        n++;
      } catch (e) { console.error('[saves] ' + entry[0] + ': ' + e.message); }
    }
    return n;
  }

  function listKeys() {
    try {
      return fs.readdirSync(dir())
        .filter(n => /^hf_.+\.json$/.test(n))
        .map(n => n.slice(3, -5));
    } catch (e) { return []; }
  }

  function repairOrphans() {
    let names;
    try { names = fs.readdirSync(dir()); } catch (e) { return 0; }
    let fixed = 0;
    for (const name of names) {
      if (!name.endsWith('.json.tmp')) continue;
      const tmp = path.join(dir(), name);
      const target = tmp.slice(0, -4);
      let healthy = false;
      try { JSON.parse(fs.readFileSync(target, 'utf8')); healthy = true; }
      catch (e) { healthy = false; }
      try {
        if (healthy) fs.unlinkSync(tmp);
        else fs.renameSync(tmp, target);
        fixed++;
      } catch (e) { /* otro proceso lo movió: se ignora */ }
    }
    return fixed;
  }

  return { dir, file, ensure, readKey, writeKey, deleteKey, writeEntries, listKeys, repairOrphans };
}

module.exports = { createStore, KEY_RE, MAX_BLOB };
