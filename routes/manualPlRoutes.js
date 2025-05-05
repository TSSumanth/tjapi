const express = require('express');
const router = express.Router();
const manualPlController = require('../controllers/manualPlController');

// Create
router.post('/', manualPlController.createManualPl);
// Get (by id or AssetName)
router.get('/', manualPlController.getManualPl);
// Update (by id or AssetName)
router.patch('/', manualPlController.updateManualPl);
// Delete (by id or AssetName)
router.delete('/', manualPlController.deleteManualPl);

module.exports = router; 