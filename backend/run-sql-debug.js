const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'taxi_dispatch'
};

async function runSql(filePath) {
    const client = new Client(config);
    const logFile = `sql-run-${path.basename(filePath)}.log`;
    fs.writeFileSync(logFile, `Starting run for ${filePath}\n`);

    try {
        await client.connect();
        let content = fs.readFileSync(filePath, 'utf8');

        // Simple split by ; - Note: this is naive and might fail if ; is inside a string or function
        // But for this schema it might work or I can just try the whole thing in a block again but with better error reporting

        console.log(`Running ${filePath}...`);
        try {
            await client.query(content);
            fs.appendFileSync(logFile, "SUCCESS: Full file applied.\n");
        } catch (e) {
            fs.appendFileSync(logFile, `FAILURE: ${e.message}\n${e.stack}\n`);

            // If full file fails, try splitting (very naive)
            fs.appendFileSync(logFile, "Attempting statement-by-statement...\n");
            const statements = content.split(';').map(s => s.trim()).filter(s => s.length > 0);
            for (let i = 0; i < statements.length; i++) {
                try {
                    await client.query(statements[i]);
                    fs.appendFileSync(logFile, `[${i}] SUCCESS: ${statements[i].substring(0, 50)}...\n`);
                } catch (err) {
                    fs.appendFileSync(logFile, `[${i}] ERROR: ${err.message}\nStatement: ${statements[i]}\n`);
                }
            }
        }

        await client.end();
        process.exit(0);
    } catch (err) {
        fs.appendFileSync(logFile, `FATAL: ${err.message}\n`);
        process.exit(1);
    }
}

const fileToRun = process.argv[2] || '../database/schema.sql';
runSql(path.resolve(__dirname, fileToRun));
