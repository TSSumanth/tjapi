const express = require('express');
const router = express.Router();
const {
    getMonthlyPerformance,
    upsertMonthlyPerformance,
    getCurrentMonthPerformance,
    getLast6MonthsPerformance
} = require('../controllers/monthlyPerformanceController');

/**
 * GET /api/monthly-performance
 * Get monthly performance data (current month by default, or specific year/month)
 */
router.get('/', getMonthlyPerformance);

/**
 * GET /api/monthly-performance/current
 * Get current month performance data
 */
router.get('/current', getCurrentMonthPerformance);

/**
 * POST /api/monthly-performance
 * Create or update monthly performance data
 */
router.post('/', upsertMonthlyPerformance);

/**
 * PUT /api/monthly-performance
 * Update monthly performance data (alias for POST)
 */
router.put('/', upsertMonthlyPerformance);

/**
 * GET /api/monthly-performance/last-6-months
 * Get last 6 months of performance data in descending order
 */
router.get('/last-6-months', getLast6MonthsPerformance);

module.exports = router;
