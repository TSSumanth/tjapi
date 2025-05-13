const express = require('express');
const router = express.Router();
const orderPairsController = require('../controllers/orderPairsController');

// Create a new order pair
router.post('/', orderPairsController.createOrderPair);
// Get all order pairs
router.get('/', orderPairsController.getOrderPairs);
// Get completed order pairs
router.get('/completed', orderPairsController.getCompletedOrderPairs);
// Delete (cancel) an order pair by id
router.delete('/:id', orderPairsController.deleteOrderPair);
// Update status of an order pair
router.patch('/:id', orderPairsController.updateOrderPairStatus);

module.exports = router; 