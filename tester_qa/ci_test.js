'use strict';
// Contrato del pipeline de CI: el workflow debe existir y ejecutar siempre los
// mismos pasos (shell, arte, pruebas) sin empaquetadores ni instalaciones.
const fs = require('fs');
const path = require('path');

const WF = path.join(__dirname, '..', '.github', 'workflows', 'hex_ci.yml');
let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };

ok(fs.existsSync(WF), 'existe .github/workflows/hex_ci.yml');
const yml = fs.existsSync(WF) ? fs.readFileSync(WF, 'utf8') : '';

ok(/^name:\s*Hexfrontier CI/m.test(yml), 'el workflow tiene nombre propio');
ok(/push:\s*[\s\S]{0,120}?branches:\s*\[\s*main\s*\]/.test(yml), 'se dispara en push a main');
ok(/pull_request:\s*[\s\S]{0,120}?branches:\s*\[\s*main\s*\]/.test(yml), 'se dispara en pull_request a main');
ok(/workflow_dispatch:/.test(yml), 'permite lanzarlo a mano');
ok(/actions\/checkout@v4/.test(yml), 'hace checkout con actions/checkout@v4');
ok(/actions\/setup-node@v4/.test(yml), 'configura Node con actions/setup-node@v4');
ok(/node-version:\s*['"]?18\.x['"]?/.test(yml), 'usa Node 18.x');
ok(/run:\s*node tools\/check-syntax\.js/.test(yml), 'valida el shell de scripts globales');
ok(/run:\s*node tools\/sync-art\.js/.test(yml), 'ejecuta el pipeline de assets');
ok(/git diff --quiet -- js\/artdata\.js/.test(yml), 'verifica que artdata.js quedó sincronizado');
ok(/run:\s*node tester_qa\/validar_artdata\.js/.test(yml), 'valida las claves y data URIs del arte');
ok(/run:\s*node tester_qa\/run_all\.js/.test(yml), 'ejecuta la batería de pruebas');
ok(/runs-on:\s*ubuntu-latest/.test(yml), 'corre en ubuntu-latest');
ok(/timeout-minutes:\s*\d+/.test(yml), 'limita el tiempo del job');

// Restricciones arquitectónicas de la fase: nada de bundlers ni instalaciones.
ok(!/\b(vite|webpack|rollup|parcel|esbuild)\b/i.test(yml), 'no introduce bundlers en CI');
ok(!/npm (ci|install)/.test(yml), 'no instala dependencias (proyecto sin node_modules)');
ok(yml.indexOf('\t') < 0, 'usa indentación con espacios (YAML válido)');

// Los scripts que invoca el workflow existen de verdad.
const root = path.join(__dirname, '..');
for (const rel of ['tools/check-syntax.js', 'tools/sync-art.js', 'tester_qa/validar_artdata.js', 'tester_qa/run_all.js']) {
  ok(fs.existsSync(path.join(root, rel)), 'existe ' + rel);
}

console.log(fail ? 'CON FALLOS (' + fail + ')' : 'TODO OK');
process.exit(fail ? 1 : 0);
