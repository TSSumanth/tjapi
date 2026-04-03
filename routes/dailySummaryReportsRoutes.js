const express = require('express');
const router = express.Router();
const dailySummaryReportsController = require('../controllers/dailySummaryReportsController');

router.get('/sessions', dailySummaryReportsController.getSessions);
router.get('/sessions-in-range', dailySummaryReportsController.getSessionsInRange);
router.get('/preview', dailySummaryReportsController.getPreview);

module.exports = router;
