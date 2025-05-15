const express = require('express');
const {
    getPositions,
    getHoldings,
    getLoginUrl,
    handleLogin,
    getOrders,
    getAccount,
    placeOrder,
    cancelOrder,
    modifyOrder,
    getOrderById,
    refreshZerodhaInstruments,
    getInstrumentsLtp
} = require('../controllers/zerodhaController');
const { getInstruments } = require('../controllers/localInstrumentsController');

const router = express.Router();

// Positions routes
router.route('/positions')
    .get(getPositions);

// Holdings routes
router.route('/holdings')
    .get(getHoldings);

// Login routes
router.route('/login-url')
    .get(getLoginUrl);

router.route('/login')
    .get(handleLogin);

// Orders routes
router.route('/orders')
    .get(getOrders);

router.route('/order')
    .post(placeOrder);

router.route('/order/:order_id/cancel')
    .post(cancelOrder);

router.route('/order/:order_id/modify')
    .post(modifyOrder);

// Instruments routes
router.route('/instruments')
    .get(getInstruments);

// Refresh instruments (manual trigger)
router.route('/instruments/refresh')
    .post(refreshZerodhaInstruments);

// Updated route for fetching real-time LTP with query parameters
router.get('/instruments/ltp', getInstrumentsLtp);

// Account routes
router.route('/account')
    .get(getAccount);

router.get('/order/:order_id', getOrderById);

module.exports = router; 