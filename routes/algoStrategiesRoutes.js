const express = require('express');
const router = express.Router();
const algoStrategiesController = require('../controllers/algoStrategiesController');

// Create
router.post('/', algoStrategiesController.createAlgoStrategy);
// Get all
router.get('/', algoStrategiesController.getAlgoStrategies);
// Get by ID
router.get('/:id', algoStrategiesController.getAlgoStrategyById);
// Update
router.patch('/:id', algoStrategiesController.updateAlgoStrategy);
// Delete
router.delete('/:id', algoStrategiesController.deleteAlgoStrategy);

module.exports = router; 