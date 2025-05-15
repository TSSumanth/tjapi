const express = require('express');
const router = express.Router();
const ZerodhaWebSocketController = require('../controllers/ZerodhaWebSocketController');

// Subscribe to instrument tokens
router.post('/subscribe', ZerodhaWebSocketController.subscribe);
// Unsubscribe from instrument tokens
router.post('/unsubscribe', ZerodhaWebSocketController.unsubscribe);
// Get latest tick for an instrument
router.get('/tick', ZerodhaWebSocketController.getLatestTick);
// Get latest market depth for an instrument
router.get('/depth', ZerodhaWebSocketController.getMarketDepth);
// List all currently subscribed tokens
router.get('/subscriptions', ZerodhaWebSocketController.getSubscriptions);
// Health/status endpoint
router.get('/status', ZerodhaWebSocketController.getStatus);
// Set access token
router.post('/set-access-token', ZerodhaWebSocketController.setAccessToken);

module.exports = router; 