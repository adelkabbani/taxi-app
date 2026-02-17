const fs = require('fs');
const path = require('path');

console.log('STDOUT: Node is starting');
console.error('STDERR: Node is starting');

try {
    const filePath = path.join(__dirname, 'node_check.txt');
    fs.writeFileSync(filePath, 'Node file system write successful');
    console.log(`STDOUT: Wrote to ${filePath}`);
} catch (e) {
    console.error(`STDERR: Write failed: ${e.message}`);
}
