const express = require('express');
const router = express.Router();
const holidaysController = require('../controllers/holidaysController');

// Add a holiday
router.post('/', holidaysController.addHoliday);
// Get all holidays
router.get('/', holidaysController.getHolidays);
// Delete a holiday
router.delete('/:id', holidaysController.deleteHoliday);
// Update holiday
router.patch('/:id', holidaysController.updateHoliday);

module.exports = router; 