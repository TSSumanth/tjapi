const express = require('express');
const {
    getPositions,
    getHoldings,
    getLoginUrl,
    handleLogin,
    getOrders,
    getAccount,
    placeRegularOrder,
    cancelRegularOrder,
    modifyRegularOrder,
    placeAmoOrder,
    cancelAmoOrder,
    modifyAmoOrder,
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

router.route('/orders/:order_id')
    .get(getOrderById);

// Regular Order routes
router.route('/orders/regular')
    .post(placeRegularOrder);

router.route('/orders/regular/:order_id')
    .delete(cancelRegularOrder)
    .put(modifyRegularOrder);

// AMO Order routes
router.route('/orders/amo')
    .post(placeAmoOrder);

router.route('/orders/amo/:order_id')
    .delete(cancelAmoOrder)
    .put(modifyAmoOrder);

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

module.exports = router; 