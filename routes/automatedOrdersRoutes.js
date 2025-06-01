const express = require('express');
const router = express.Router();
const automatedOrdersController = require('../controllers/automatedOrdersController');

// Create
router.post('/', automatedOrdersController.createAutomatedOrder);
// Get all
router.get('/', automatedOrdersController.getAutomatedOrders);
// Get by ID
router.get('/:id', automatedOrdersController.getAutomatedOrderById);
// Update
router.patch('/:id', automatedOrdersController.updateAutomatedOrder);
// Delete
router.delete('/:id', automatedOrdersController.deleteAutomatedOrder);

module.exports = router; 