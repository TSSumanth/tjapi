const express = require('express');
const router = express.Router();
const algoStrategiesController = require('../controllers/algoStrategiesController');
const notesController = require('../controllers/algoStrategyNotesController');

router.post('/notes', notesController.createNote);
router.get('/notes', notesController.getNotesByStrategyId);
router.get('/notes/:id', notesController.getNoteById);
router.delete('/notes/:id', notesController.deleteNote);

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