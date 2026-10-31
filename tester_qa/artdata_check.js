const fs = require('fs');
const ARTDATA_PATH = 'D:/Agente/PROYECTOS/hexfrontier/js/artdata.js';
const content = fs.readFileSync(ARTDATA_PATH, 'utf8');

// Extraer claves
const keyRegex = /"(\w+)":\s*"/g;
let keys = [];
let m;
while ((m = keyRegex.exec(content)) !== null) {
  keys.push(m[1]);
}
console.log('Numero de claves:', keys.length);
console.log('Claves:', keys.join(', '));

// Verificar sintaxis
let syntaxOk = true;
try {
  new Function('HF', content);
  console.log('Sintaxis: OK');
} catch(e) {
  console.log('Sintaxis: ERROR -', e.message);
  syntaxOk = false;
}

// Verificar Data URIs
if (syntaxOk) {
  try {
    const HF = { ARTDATA: {} };
    const fn = new Function('HF', content);
    fn(HF);
    const artdata = HF.ARTDATA;
    let bad = 0;
    for (const [key, val] of Object.entries(artdata)) {
      if (!val.startsWith('data:image/')) {
        console.log('BAD URI:', key, '- no empieza con data:image/');
        bad++;
      } else if (!val.includes(';base64,')) {
        console.log('BAD URI:', key, '- no tiene ;base64,');
        bad++;
      } else {
        const b64Match = val.match(/;base64,(.+)$/);
        if (!b64Match) {
          console.log('BAD URI:', key, '- no hay base64');
          bad++;
        } else {
          const decoded = Buffer.from(b64Match[1], 'base64');
          if (decoded.length === 0) {
            console.log('BAD URI:', key, '- 0 bytes');
            bad++;
          } else {
            const header = decoded.slice(0, 4).toString('hex');
            const headerStr = decoded.slice(0, 16).toString('latin1');
            // Verificar magic bytes de formatos de imagen válidos
            const isWebP = headerStr.startsWith('RIFF') && headerStr.slice(8, 12) === 'WEBP';
            const isJpeg = header === 'ffd8ff';
            const isPng = header === '89504e47';
            const isGif = headerStr.startsWith('GIF87a') || headerStr.startsWith('GIF89a');
            // Detectar certificado C2PA/X.509 (no imagen)
            const looksLikeC2PA = headerStr.includes('Google C2PA') || headerStr.includes('c2pa') || headerStr.includes('BEGIN CERTIFICATE') || (decoded.slice(4, 8).toString('hex') === '0000000c' && decoded.slice(8, 12).toString('hex') === '3230 0000'.replace(/ /g,''));
            if (isWebP) {
              console.log('OK:', key, '- Data URI WebP válido (' + decoded.length + ' bytes)');
            } else if (isJpeg) {
              // JPEG válido: verificar que tenga marcadores de imagen (SOS, DQT, SOF)
              const hasSos = decoded.indexOf(Buffer.from([0xFF, 0xDA])) >= 0;
              const hasDqt = decoded.indexOf(Buffer.from([0xFF, 0xDB])) >= 0;
              if (hasSos && hasDqt) {
                console.log('OK:', key, '- Data URI JPEG válido con píxeles (' + decoded.length + ' bytes)');
              } else if (looksLikeC2PA) {
                console.log('FAIL:', key, '- Contenido es certificado C2PA/X.509, NO imagen JPEG válida (' + decoded.length + ' bytes)');
                bad++;
              } else {
                console.log('WARN:', key, '- JPEG con magic bytes pero sin marcadores de píxeles (SOS/DQT) (' + decoded.length + ' bytes)');
                bad++;
              }
            } else if (isPng) {
              console.log('OK:', key, '- Data URI PNG válido (' + decoded.length + ' bytes)');
            } else if (isGif) {
              console.log('OK:', key, '- Data URI GIF válido (' + decoded.length + ' bytes)');
            } else {
              console.log('FAIL:', key, '- Magic bytes no reconocidos como imagen. Header hex:', header, 'Header str:', headerStr.slice(0, 40));
              bad++;
            }
          }
        }
      }
    }
    console.log('Total URIs malas:', bad);
  } catch(e) {
    console.log('Error ejecutando:', e.message);
  }
}
