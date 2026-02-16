const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3002/api';
const ADMIN_EMAIL = 'admin@taxi.com';
const ADMIN_PASS = 'admin123';

const logFile = path.join(__dirname, 'verify_log.txt');
function log(msg) {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
}

async function runVerification() {
    try {
        log('1. Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASS
        });

        const token = loginRes.data.data.token;
        log('✓ Login successful. Token obtained.');

        // 2a. Create Driver
        log('2a. Creating a new driver...');
        const uniqueSuffix = Date.now();
        const driverData = {
            firstName: 'Test',
            lastName: 'Driver',
            email: `driver${uniqueSuffix}@test.com`,
            phone: `+1${uniqueSuffix}`, // simple unique phone
            password: 'password123',
            licensePlate: `TEST-${uniqueSuffix.toString().slice(-4)}`,
            make: 'Toyota',
            model: 'Prius',
            year: 2023,
            vehicleType: 'sedan',
            licenseNumber: `LIC-${uniqueSuffix}`
        };

        const createDriverRes = await axios.post(`${API_URL}/drivers`, driverData, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const driverId = createDriverRes.data.data.driver.id;
        log(`✓ Driver created. ID: ${driverId}`);

        // 2b. Create dummy file
        const filePath = path.join(__dirname, 'test_doc.pdf');
        fs.writeFileSync(filePath, '%PDF-1.4\n%µµµµ\nThis is a fake PDF content to bypass mime check if simple.');
        log('✓ Test file created.');

        // 3. Upload Document
        // Use the created driverId


        log(`3. Uploading document for Driver ID ${driverId}...`);
        const form = new FormData();
        form.append('document', fs.createReadStream(filePath), { filename: 'test_doc.pdf' });
        form.append('driverId', driverId);
        form.append('documentType', 'cv');
        form.append('notes', 'Automated verification upload');

        const uploadRes = await axios.post(`${API_URL}/documents/upload`, form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });

        log('✓ Upload successful: ' + uploadRes.data.message);
        const docId = uploadRes.data.data.id;

        // 4. Verify in List
        log(`4. Verifying document ${docId} exists in driver's list...`);
        const listRes = await axios.get(`${API_URL}/documents/driver/${driverId}?documentType=cv`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const found = listRes.data.data.find(d => d.id === docId);

        if (found) {
            log('✓ PASS: Document found in list.');
            log('  - Status: ' + found.status);
            log('  - URL: ' + found.file_url);
        } else {
            log('✗ FAIL: Document not found in list.');
        }

        // Cleanup
        fs.unlinkSync(filePath);

    } catch (error) {
        log('❌ Verification Failed!');
        if (error.response) {
            log('Status: ' + error.response.status);
            log('Data: ' + JSON.stringify(error.response.data, null, 2));
        } else {
            log('Error: ' + error.message);
        }
    }
}

runVerification();
