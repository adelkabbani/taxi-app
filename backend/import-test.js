const fs = require('fs');
function test(name) {
    try {
        console.log(`Testing: ${name}`);
        require(name);
        console.log(`OK: ${name}`);
    } catch (e) {
        console.error(`FAILED: ${name}`);
        console.error(e);
        process.exit(1);
    }
}

test('dotenv');
require('dotenv').config();
test('express');
test('cors');
test('helmet');
test('morgan');
test('socket.io');
test('./config/database');
test('./config/redis');
test('./config/logger');
console.log('ALL IMPORTS PASSED');
