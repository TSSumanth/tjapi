const express = require('express');
const router = express.Router();
const zerodhaAccountController = require('../controllers/zerodhaAccountController');


// Account Summary Routes
router.get('/summary', zerodhaAccountController.getAccountSummary);
router.post('/summary', zerodhaAccountController.updateAccountSummary);

// Equity Margins Routes
router.get('/margins', zerodhaAccountController.getEquityMargins);
router.post('/margins', zerodhaAccountController.updateEquityMargins);

// Mutual Funds Routes
router.get('/mutual-funds', zerodhaAccountController.getMutualFunds);
router.post('/mutual-funds', zerodhaAccountController.updateMutualFunds);
router.delete('/mutual-funds/:folio_number', zerodhaAccountController.deleteMutualFund);

module.exports = router; 