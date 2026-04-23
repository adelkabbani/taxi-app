const express = require('express');
const router = express.Router();
const pricingController = require('../controllers/pricingController');

// All pricing endpoints require auth (which is handled in server.js middleware mounting)
router.get('/', pricingController.getPricingRules);
router.put('/', pricingController.updatePricingRules);

module.exports = router;
