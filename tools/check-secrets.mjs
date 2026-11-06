#!/usr/bin/env node
/**
 * tools/check-secrets.mjs — Auditoría de credenciales.
 *
 * Uso:
 *   node tools/check-secrets.mjs            revisa el repositorio
 *   node tools/check-secrets.mjs --dist     revisa también dist/
 *
 * Sale con código 2 si encuentra algo. Pensado para CI y para ejecutarlo antes
 * de publicar: la service_role NUNCA debe viajar al navegador.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const withDist = process.argv.includes('--dist');

const SKIP_DIRS = new Set(['node_modules', '.git', 'tester_qa', 'wrappers', 'sql', 'tools', 'dist']);
const EXT = /\.(js|mjs|html|json|css|md|txt|yml|yaml|env|example)$/i;

const PATTERNS = [
  { name: 'service_role literal', re: /service_role/i, codeOnly: true },
  { name: 'clave secreta Supabase', re: /sb_secret_[A-Za-z0-9_-]{10,}/ },
  { name: 'variable de entorno de servicio', re: /SUPABASE_SERVICE_ROLE_KEY/, codeOnly: true },
  { name: 'cadena de conexión con contraseña', re: /postgres(ql)?:\/\/[^:\s"'/]+:[^@\s"']{6,}@/i, codeOnly: true },
  { name: 'JWT de servicio', re: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\./ }
];

/** Quita comentarios para no confundir documentación con código. */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1 ');
}

/** Un JWT es peligroso sólo si su payload dice role=service_role. */
function jwtIsServiceRole(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    return json && json.role === 'service_role';
  } catch (e) { return false; }
}

const findings = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = path.relative(ROOT, abs);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(abs);
      continue;
    }
    if (!EXT.test(entry.name)) continue;
    if (/\.(backup|orig|fixed)$/i.test(entry.name)) continue;
    let text;
    try { text = fs.readFileSync(abs, 'utf8'); } catch (e) { continue; }

    const isDoc = /\.(md|txt)$/i.test(entry.name);
    const scanned = isDoc ? text : stripComments(text);

    for (const p of PATTERNS) {
      if (isDoc && p.codeOnly) continue;      // la documentación puede nombrarlos
      const m = p.re.exec(scanned);
      if (!m) continue;
      if (p.name === 'JWT de servicio' && !jwtIsServiceRole(m[0])) continue;
      findings.push({ file: rel, pattern: p.name, sample: m[0].slice(0, 24) + '…' });
    }
  }
}

walk(ROOT);
if (withDist && fs.existsSync(path.join(ROOT, 'dist'))) walk(path.join(ROOT, 'dist'));

console.log('=== check-secrets ===');
console.log('alcance: repositorio' + (withDist ? ' + dist' : '') + ' (sql/tools/tester_qa excluidos)');
if (!findings.length) {
  console.log('OK · no se encontraron credenciales de servidor');
  process.exit(0);
}
console.error('✗ posibles secretos:');
for (const f of findings) console.error('  - ' + f.file + ' :: ' + f.pattern + ' :: ' + f.sample);
console.error('\nNota: la clave publicable (sb_publishable_…) sí puede estar en el cliente.');
process.exit(2);
