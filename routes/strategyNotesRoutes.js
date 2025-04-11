const express = require("express");
const {
    createStrategyNote,
    getStrategyNotes,
    updateStrategyNote,
    deleteStrategyNote
} = require("../controllers/strategyNotesController");

const router = express.Router();

router
    .route("/")
    .post(createStrategyNote)
    .get(getStrategyNotes)
    .patch(updateStrategyNote)
    .delete(deleteStrategyNote);

module.exports = router; 