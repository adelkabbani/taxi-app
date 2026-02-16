try {
    console.log('Loading bookingController...');
    const bc = require('./controllers/bookingController');
    console.log('Require success');
} catch (e) {
    console.error('Error requiring bookingController:', e);
}
