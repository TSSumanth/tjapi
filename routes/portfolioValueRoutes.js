const express = require('express');
const router = express.Router();
const portfolioValueController = require('../controllers/portfolioValueController');

// Create
router.post('/', portfolioValueController.createPortfolioValue);
// Get by id and account_id
router.get('/', portfolioValueController.getPortfolioValue);
// Update by id and account_id
router.put('/', portfolioValueController.updatePortfolioValue);
// Delete by id and account_id
router.delete('/', portfolioValueController.deletePortfolioValue);

module.exports = router; 