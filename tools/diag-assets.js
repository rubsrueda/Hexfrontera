const fs = require('fs');
const path = require('path');

const dirs = ['art', 'art2'];
const filesToCheck = [
  ['art', 'piquero.jfif'],
  ['art2', 'unidad Infanteria.jfif'],
];

for (const [dir, file] of filesToCheck) {
  const p = path.join('D:/Agente/proyectos/HEXFRONTIER', dir, file);
  if (!fs.existsSync(p)) { console.log(dir + '/' + file + ': MISSING'); continue; }
  const buf = fs.readFileSync(p);
  const hex = buf.slice(0, 4).toString('hex');
  const hasC2PA = buf.toString('latin1').includes('C2PA') || buf.toString('latin1').includes('Google');
  console.log(dir + '/' + file + ': ' + buf.length + ' bytes, header=' + hex + ', C2PA=' + hasC2PA);
}

// Listar todos los archivos en art2
console.log('\n=== art2/ contents ===');
const art2Dir = 'D:/Agente/proyectos/HEXFRONTIER/art2';
if (fs.existsSync(art2Dir)) {
  fs.readdirSync(art2Dir).forEach(f => {
    const p = path.join(art2Dir, f);
    const buf = fs.readFileSync(p);
    const hex = buf.slice(0, 4).toString('hex');
    const hasC2PA = buf.toString('latin1').includes('C2PA') || buf.toString('latin1').includes('Google');
    console.log(f + ': ' + buf.length + ' bytes, header=' + hex + ', C2PA=' + hasC2PA);
  });
}
