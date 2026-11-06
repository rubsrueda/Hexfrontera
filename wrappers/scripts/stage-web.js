'use strict';
/* Empaqueta la carpeta web de Hexfrontier en wrappers/www SIN bundlers.

   Copia solo lo que el juego necesita en ejecución (shell, JS global, arte,
   fuentes y assets) y deja fuera pruebas, herramientas, fuentes de arte,
   documentación y los propios wrappers.

   Uso:
     node scripts/stage-web.js                 → wrappers/www (sin sw.js)
     node scripts/stage-web.js --web           → incluye sw.js (sitio web/PWA)
     node scripts/stage-web.js --out=DIR       → otra carpeta (relativa al cwd)
*/
const fs = require('node:fs');
const path = require('node:path');

const SRC = path.resolve(__dirname, '..', '..');        // PROYECTOS/hexfrontier
const args = process.argv.slice(2);
const argVal = name => {
  const hit = args.find(a => a.startsWith('--' + name + '='));
  return hit ? hit.split('=').slice(1).join('=') : null;
};
const WEB = args.includes('--web');
const outArg = argVal('out');
const OUT = outArg ? path.resolve(process.cwd(), outArg) : path.resolve(__dirname, '..', 'www');

// Raíces de runtime. Todo lo demás queda fuera del paquete.
const ENTRIES = ['index.html', 'manifest.json', 'icon.svg', 'css', 'js', 'art', 'assets', 'fonts'];
// El service worker solo tiene sentido en el sitio web publicado.
if (WEB) ENTRIES.push('sw.js');

// Ruido conocido del repositorio que nunca debe viajar al paquete.
const SKIP_NAMES = new Set(['sw.js', 'a', 'a.txt', '.DS_Store', 'Thumbs.db']);
const SKIP_REL = new Set(['art/old', 'js/a', 'css/a']);

let files = 0, bytes = 0;

function copy(src, dst, rel) {
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    if (SKIP_REL.has(rel)) return;
    fs.mkdirSync(dst, { recursive: true });
    for (const name of fs.readdirSync(src).sort()) {
      if (SKIP_NAMES.has(name) || name.startsWith('.')) continue;
      copy(path.join(src, name), path.join(dst, name), rel ? rel + '/' + name : name);
    }
    return;
  }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  files++;
  bytes += st.size;
}

function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function main() {
  const quiet = process.argv.includes('--quiet');
  if (!fs.existsSync(path.join(SRC, 'index.html'))) {
    console.error('No encuentro index.html en ' + SRC);
    process.exit(1);
  }
  rmrf(OUT);
  for (const name of ENTRIES) {
    const src = path.join(SRC, name);
    if (!fs.existsSync(src)) { console.warn('falta ' + name + ': se omite'); continue; }
    copy(src, path.join(OUT, name), name);
  }

  // Contrato mínimo: el shell debe cargar el puente de plataforma, la
  // telemetría y los módulos que estos esperan. Si falta algo, el paquete no
  // arranca bien.
  const html = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
  for (const need of ['js/telemetry.js', 'js/platform.js', 'js/engine.js', 'js/main.js']) {
    if (!html.includes(need)) {
      console.error('index.html no incluye ' + need + ': aborta el empaquetado');
      process.exit(1);
    }
  }

  const info = {
    app: 'hexfrontier',
    builtAt: new Date().toISOString(),
    files,
    bytes,
    sha: Math.abs([...html].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)).toString(16)
  };
  fs.writeFileSync(path.join(OUT, 'build-info.json'), JSON.stringify(info, null, 2));

  const mb = (bytes / (1024 * 1024)).toFixed(2);
  if (!quiet) console.log(`Sitio listo en ${OUT} · ${files} archivos · ${mb} MB · ${info.builtAt}`);
}

main();
