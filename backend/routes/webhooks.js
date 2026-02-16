const express = require('express');
const router = express.Router();

/**
 * Webhook routes - placeholder
 * TODO: Implement webhook receivers
 */

router.post('/booking-com', (req, res) => {
    res.json({ success: true, message: 'Webhook received' });
});

module.exports = router;
