const express = require("express");
const {
    createTradingNote,
    getTradingNotes,
    getTradingNoteById,
    updateTradingNote,
    deleteTradingNote
} = require("../controllers/tradingNotesController");

const router = express.Router();

// GET /api/trading-notes - Get all trading notes
router.get("/", getTradingNotes);

// GET /api/trading-notes/:id - Get a specific trading note by ID
router.get("/:id", getTradingNoteById);

// POST /api/trading-notes - Create a new trading note
router.post("/", createTradingNote);

// PUT /api/trading-notes/:id - Update a trading note
router.put("/:id", updateTradingNote);

// DELETE /api/trading-notes/:id - Delete a trading note
router.delete("/:id", deleteTradingNote);

module.exports = router;
