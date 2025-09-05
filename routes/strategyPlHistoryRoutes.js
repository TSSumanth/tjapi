const express = require("express");
const {
  getStrategyPlHistory,
  saveStrategyPlHistory,
  getMultipleStrategiesPlHistory,
  cleanupOldPlHistory
} = require("../controllers/strategyPlHistoryController");

const router = express.Router();

// Get P/L history for a specific strategy
router.get("/:strategyId", getStrategyPlHistory);

// Save P/L history for a strategy
router.post("/", saveStrategyPlHistory);

// Get P/L history for multiple strategies
router.post("/multiple", getMultipleStrategiesPlHistory);

// Cleanup old P/L history data
router.delete("/cleanup", cleanupOldPlHistory);

module.exports = router;
