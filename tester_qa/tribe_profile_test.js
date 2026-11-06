'use strict';
// Regresión: la tribu debe ser UN perfil persistente y ligado a la identidad.
// Antes, cada HF.loadTribe() sin perfil guardado generaba una tribu aleatoria
// nueva (el Hub y la pantalla de Tribu mostraban un usuario distinto cada vez).
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const JS = path.join(__dirname, '..', 'js');
let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };

function storage(seed) {
  const m = new Map(Object.entries(seed || {}));
  return {
    map: m,
    api: {
      getItem: k => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => m.set(k, String(v)),
      removeItem: k => m.delete(k),
      key: i => Array.from(m.keys())[i] || null,
      get length() { return m.size; }
    }
  };
}

// Un "arranque" completo del juego (mismos módulos que index.html hasta cloud).
function boot(store) {
  const sandbox = {
    console, HF: {}, window: null,
    localStorage: store.api,
    navigator: { onLine: false },
    setTimeout, clearTimeout, Promise, Date, Math, JSON,
    performance: { now: () => Date.now() }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const f of ['util.js', 'config.js', 'data.js', 'names.js', 'cloud.js'])
    vm.runInContext(fs.readFileSync(path.join(JS, f), 'utf8'), sandbox);
  return sandbox;
}

const profileOf = store => {
  const raw = store.api.getItem('hf_tribe_profile');
  return raw ? JSON.parse(raw) : null;
};

// --- 1. Primera carga: se crea UNA vez y se persiste en el acto ---
let st = storage();
let w = boot(st);
let names = [];
for (let i = 0; i < 5; i++) names.push(w.HF.loadTribe().name);
ok(names.every(n => n === names[0]), '5 cargas seguidas devuelven la misma tribu');
const first = w.HF.loadTribe();
ok(!!profileOf(st), 'la tribu se guarda en el almacén desde la primera carga');
ok(profileOf(st).name === first.name, 'lo guardado coincide con lo mostrado');
ok(+profileOf(st).createdAt > 0, 'el perfil guarda createdAt');
ok(profileOf(st).tribe_id === w.HF.cloud.playerId(), 'la tribu queda ligada al ID de jugador');

// --- 2. "Recargar el juego": misma tribu e identidad ---
const idBefore = w.HF.cloud.playerId(), keyBefore = w.HF.cloud.secretKey();
w = boot(st);
const afterReload = w.HF.loadTribe();
ok(afterReload.name === first.name, 'tras recargar se mantiene el nombre');
ok(afterReload.crest === first.crest && afterReload.color === first.color, 'tras recargar se mantiene color y blasón');
ok(afterReload.createdAt === first.createdAt, 'tras recargar se mantiene createdAt');
ok(w.HF.cloud.playerId() === idBefore, 'el ID de jugador sobrevive a la recarga');
ok(w.HF.cloud.secretKey() === keyBefore, 'la llave secreta sobrevive a la recarga');

// --- 3. Perfil corrupto: se repara conservando lo que el usuario eligió ---
st = storage({ hf_tribe_profile: JSON.stringify({ name: 'Los Cuervos', color: 'rojo', crest: '🦅', alma_path: 'A1' }) });
w = boot(st);
let repaired = w.HF.loadTribe();
ok(repaired.name === 'Los Cuervos', 'una tribu corrupta conserva su nombre');
ok(repaired.color === '#3b82f6', 'un color inválido cae al valor por defecto');
ok(repaired.crest === 'c01', 'un blasón antiguo (emoji) se migra a su id');
ok(w.HF.validPath(repaired.alma_path, 'A') && w.HF.validPath(repaired.arma_path, 'B'), 'las ramas inválidas se reparan');
ok(w.HF.loadTribe().name === 'Los Cuervos', 'la reparación es estable (no vuelve a cambiar)');
ok(profileOf(st).name === 'Los Cuervos', 'la reparación se persiste');

// --- 4. Perfil antiguo "Mi Tribu": se renombra una sola vez ---
st = storage({ hf_tribe_profile: JSON.stringify({ name: 'Mi Tribu', color: '#3b82f6', crest: 'c01', alma_path: ['A1', 'A1.1', 'A1.1.1'], arma_path: ['B1', 'B1.1', 'B1.1.1'], victoria_path: ['C1', 'C1.3', 'C1.3.1'] }) });
w = boot(st);
const renamed = w.HF.loadTribe().name;
ok(renamed && renamed !== 'Mi Tribu', 'el nombre genérico se sustituye una vez');
ok(w.HF.loadTribe().name === renamed, 'el nombre nuevo ya no cambia');
ok(profileOf(st).name === renamed, 'el nombre nuevo queda guardado');

// --- 5. Edición explícita: se guarda con fecha y sobrevive a la recarga ---
st = storage();
w = boot(st);
const t = w.HF.loadTribe();
const saved = w.HF.saveTribe(Object.assign({}, t, { color: '#ef4444', name: 'Cuervos del Alba' }));
ok(saved && saved.color === '#ef4444', 'saveTribe devuelve el perfil actualizado');
ok(+profileOf(st).updatedAt > 0, 'la edición marca updatedAt');
w = boot(st);
const edited = w.HF.loadTribe();
ok(edited.name === 'Cuervos del Alba' && edited.color === '#ef4444', 'la edición sobrevive a la recarga');
ok(edited.updatedAt === saved.updatedAt, 'updatedAt se conserva entre sesiones');

// --- 6. Nube: la copia más reciente gana, la local no se pisa sin motivo ---
st = storage();
w = boot(st);
w.HF.saveTribe(Object.assign({}, w.HF.loadTribe(), { name: 'Local', updatedAt: 300 }));
const localProfile = w.HF.loadTribe();
w.HF.cloud.restoreFromRow({
  player_id: 'HF-CLOUD01', secret_key: 'K-CLOUD1', is_premium: true, recovery_email: 'yo@ejemplo.com',
  tribe_data: { name: 'NubeAntigua', color: '#22c55e', crest: 'c05', updatedAt: 200,
    alma_path: localProfile.alma_path, arma_path: localProfile.arma_path, victoria_path: localProfile.victoria_path }
});
ok(w.HF.loadTribe().name === 'Local', 'una copia de nube más antigua no pisa la tribu local');
ok(w.HF.cloud.playerId() === 'HF-CLOUD01', 'la identidad se restaura desde la nube');
ok(w.HF.cloud.isPremium() === true && w.HF.cloud.recoveryEmail() === 'yo@ejemplo.com', 'premium y correo quedan ligados a la cuenta');

w.HF.cloud.restoreFromRow({
  player_id: 'HF-CLOUD02', secret_key: 'K-CLOUD2',
  tribe_data: { name: 'NubeNueva', color: '#22c55e', crest: 'c05', updatedAt: Date.now() + 1000,
    alma_path: localProfile.alma_path, arma_path: localProfile.arma_path, victoria_path: localProfile.victoria_path }
});
ok(w.HF.loadTribe().name === 'NubeNueva', 'una copia de nube más reciente sí se aplica');
ok(w.HF.loadTribe().tribe_id === 'HF-CLOUD02', 'la tribu aplicada se religa al ID restaurado');

// Vinculación explícita (force): manda la nube aunque lo local sea más nuevo.
w.HF.cloud.restoreFromRow({
  player_id: 'HF-CLOUD03', secret_key: 'K-CLOUD3',
  tribe_data: { name: 'Vinculada', color: '#eab308', crest: 'c07', updatedAt: 1,
    alma_path: localProfile.alma_path, arma_path: localProfile.arma_path, victoria_path: localProfile.victoria_path }
}, true);
ok(w.HF.loadTribe().name === 'Vinculada', 'vincular/recuperar fuerza la tribu de la cuenta');

// --- 7. Formato del ID: único de verdad (sin colisiones por 4 dígitos) ---
ok(/^HF-[A-Z0-9]{8,}$/.test(idBefore), 'el ID de jugador tiene entropía suficiente (' + idBefore + ')');
const ids = new Set();
for (let i = 0; i < 50; i++) ids.add(w.HF.cloud.playerId() === idBefore ? idBefore : w.HF.cloud.playerId());
ok(ids.size === 1, 'playerId() siempre devuelve el mismo valor en la sesión');

console.log(fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK');
process.exit(fail ? 1 : 0);
