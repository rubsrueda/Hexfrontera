'use strict';
// Pruebas de wrappers/electron/saves.js (Node puro, sin Electron):
// validación de claves, escritura atómica, listado y reparación de .tmp.
const fs = require('fs');
const os = require('os');
const path = require('path');

const { createStore, KEY_RE, MAX_BLOB } = require('../wrappers/electron/saves.js');

let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };
const throws = fn => { try { fn(); return false; } catch (e) { return true; } };

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hf-saves-'));
const store = createStore(() => dir);
const fileOf = key => path.join(dir, 'hf_' + key + '.json');

try {
  // --- 1. Round-trip y carpeta creada bajo demanda ---
  ok(store.readKey('settings') === null, 'una clave inexistente devuelve null');
  store.writeKey('savegame_active', JSON.stringify({ turn: 12 }));
  ok(store.readKey('savegame_active') === '{"turn":12}', 'lee exactamente lo escrito');
  ok(JSON.parse(store.readKey('savegame_active')).turn === 12, 'el JSON es válido');

  // --- 2. Escritura atómica: no quedan temporales ---
  store.writeKey('savegame_active', JSON.stringify({ turn: 13 }));
  const names = fs.readdirSync(dir);
  ok(!names.some(n => n.endsWith('.tmp')), 'tras escribir no queda ningún .tmp');
  ok(JSON.parse(store.readKey('savegame_active')).turn === 13, 'la segunda escritura reemplaza a la primera');

  // --- 3. Validación de claves (el renderer no puede construir rutas) ---
  ok(throws(() => store.writeKey('../evil', 'x')), 'rechaza ../evil');
  ok(throws(() => store.writeKey('a/b', 'x')), 'rechaza separadores');
  ok(throws(() => store.writeKey('', 'x')), 'rechaza la clave vacía');
  ok(throws(() => store.writeKey('x'.repeat(200), 'x')), 'rechaza claves demasiado largas');
  ok(throws(() => store.writeKey(null, 'x')), 'rechaza claves no textuales');
  ok(throws(() => store.writeKey('ok', { a: 1 })), 'rechaza valores no textuales');
  ok(KEY_RE.test('savegame_active') && KEY_RE.test('replay_data') && KEY_RE.test('cloud-standing'), 'acepta claves reales del juego');
  ok(!KEY_RE.test('..'), 'la lista blanca no admite puntos');
  ok(MAX_BLOB === 64 * 1024 * 1024, 'límite de tamaño declarado');

  // --- 4. Lote: unas entradas válidas y otras no ---
  const err0 = console.error;
  console.error = () => { };            // la entrada inválida se registra a propósito
  const applied = store.writeEntries([['maps', JSON.stringify([{ name: 'A' }])], ['../x', 'no'], ['settings', null], ['replay_history', '[]']]);
  console.error = err0;
  ok(applied === 3, `aplica solo las entradas válidas (${applied}/4)`);
  ok(store.readKey('maps') === '[{"name":"A"}]', 'escribe la clave válida del lote');
  ok(store.readKey('replay_history') === '[]', 'escribe la segunda clave válida');
  ok(store.listKeys().sort().join(',') === 'maps,replay_history,savegame_active', 'lista solo los archivos de guardado');

  // --- 5. Borrado ---
  ok(store.deleteKey('replay_history') === true, 'borra una clave existente');
  ok(store.readKey('replay_history') === null, 'la clave borrada ya no se lee');
  ok(store.deleteKey('replay_history') === false, 'borrar dos veces no lanza');

  // --- 6. Reparación de .tmp huérfanos ---
  // 6a. Definitivo sano: el temporal se descarta.
  fs.writeFileSync(fileOf('sana') + '.tmp', '{"viejo":true}');
  fs.writeFileSync(fileOf('sana'), '{"nuevo":true}');
  // 6b. Definitivo corrupto: el temporal lo reemplaza.
  fs.writeFileSync(fileOf('rota') + '.tmp', '{"salvada":true}');
  fs.writeFileSync(fileOf('rota'), '{"truncado"');
  // 6c. Definitivo inexistente: el temporal se promociona.
  fs.writeFileSync(fileOf('huerfana') + '.tmp', '{"recuperada":true}');
  const fixed = store.repairOrphans();
  ok(fixed === 3, `repara los tres casos (${fixed})`);
  ok(JSON.parse(store.readKey('sana')).nuevo === true, 'conserva el definitivo sano');
  ok(JSON.parse(store.readKey('rota')).salvada === true, 'promociona el .tmp sobre un JSON corrupto');
  ok(JSON.parse(store.readKey('huerfana')).recuperada === true, 'promociona el .tmp sin definitivo');
  ok(!fs.readdirSync(dir).some(n => n.endsWith('.tmp')), 'no deja temporales tras la reparación');

  // --- 7. La carpeta se crea si no existe ---
  const dir2 = path.join(dir, 'nueva');
  const store2 = createStore(() => dir2);
  store2.writeKey('settings', '{}');
  ok(fs.existsSync(path.join(dir2, 'hf_settings.json')), 'crea la carpeta de guardado al vuelo');
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}

console.log(fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK');
process.exit(fail ? 1 : 0);
