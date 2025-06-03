const express = require('express');
const router = express.Router();
const notesController = require('../controllers/algoStrategyNotesController');

router.post('/notes', notesController.createNote);
router.get('/notes/:strategyid', notesController.getNotesByStrategyId);
router.get('/notes/:id', notesController.getNoteById);
router.delete('/notes/:id', notesController.deleteNote);

module.exports = router; 