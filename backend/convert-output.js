const fs = require('fs');
const args = process.argv.slice(2);
if (args.length < 2) {
    console.log('Usage: node convert-output.js <input> <output>');
    process.exit(1);
}
try {
    const content = fs.readFileSync(args[0], 'utf16le');
    fs.writeFileSync(args[1], content);
} catch (e) {
    // If not utf16, try normal read
    const content = fs.readFileSync(args[0], 'utf8');
    fs.writeFileSync(args[1], content);
}
