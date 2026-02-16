const API_URL = 'http://localhost:3002/api/auth/login';

async function testLogin() {
    console.log('🧪 Testing Login API with fetch...');

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@taxi.com',
                password: 'admin123'
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ Login SUCCESS!');
            console.log('Token:', data.data.token ? 'Received' : 'Missing');
            console.log('User Role:', data.data.user.role);
        } else {
            console.log('❌ Login FAILED');
            console.log('Status:', response.status);
            console.log('Data:', JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.log('❌ Network/Script Error:', error.message);
    }
}

testLogin();
