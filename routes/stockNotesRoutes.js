const express = require("express");
const {
    createStockNote,
    getStockNotes,
    getStockNotesBySymbol,
    getStockNoteById,
    updateStockNote,
    deleteStockNote,
    getStockNotesGrouped
} = require("../controllers/stockNotesController");

const router = express.Router();

// GET /api/stock-notes - Get all stock notes
router.get("/", getStockNotes);

// GET /api/stock-notes/grouped - Get stock notes grouped by symbol
router.get("/grouped", getStockNotesGrouped);

// GET /api/stock-notes/symbol/:symbol - Get stock notes by symbol
router.get("/symbol/:symbol", getStockNotesBySymbol);

// GET /api/stock-notes/:id - Get a specific stock note by ID
router.get("/:id", getStockNoteById);

// POST /api/stock-notes - Create a new stock note
router.post("/", createStockNote);

// PUT /api/stock-notes/:id - Update a stock note
router.put("/:id", updateStockNote);

// DELETE /api/stock-notes/:id - Delete a stock note
router.delete("/:id", deleteStockNote);

module.exports = router;
