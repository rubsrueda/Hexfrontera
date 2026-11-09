'use strict';
const fs = require('fs');
const file = process.argv[2];
const b = fs.readFileSync(file, 'latin1');
console.log('len', b.length);
const k = b.indexOf('hf_savegame_active');
console.log('key', k);
if (k >= 0) console.log(JSON.stringify(b.slice(k, k + 80)));
