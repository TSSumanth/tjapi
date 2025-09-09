const express = require("express");
const router = express.Router();
const slackController = require("../controllers/slackController");

// Send a simple message
router.post("/message", slackController.sendMessage);

// Send trade notification
router.post("/trade", slackController.sendTradeNotification);

// Send order notification
router.post("/order", slackController.sendOrderNotification);

// Send strategy notification
router.post("/strategy", slackController.sendStrategyNotification);

// Send error notification
router.post("/error", slackController.sendErrorNotification);

// Send daily summary
router.get("/daily-summary", slackController.sendDailySummary);

// Test daily summary (for development/testing)
router.get("/test-daily-summary", slackController.testDailySummary);


// Check Slack configuration status
router.get("/status", slackController.getStatus);

module.exports = router;
