const fs = require('fs');
const content = fs.readFileSync('force-output.txt', 'utf16le');
console.log(content.toString('utf8'));
