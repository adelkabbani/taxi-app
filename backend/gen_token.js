require('dotenv').config();
const jwt = require('jsonwebtoken');

const token = jwt.sign(
    { id: 6 },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
);

console.log(token);
process.exit();
