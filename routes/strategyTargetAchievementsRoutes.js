const express = require('express');
const router = express.Router();
const strategyTargetAchievementsController = require('../controllers/strategyTargetAchievementsController');

// Check if target has been achieved
router.get('/check', strategyTargetAchievementsController.checkTargetAchievement);

// Create a new target achievement
router.post('/create', strategyTargetAchievementsController.createTargetAchievement);

// Reset a target achievement
router.post('/reset', strategyTargetAchievementsController.resetTargetAchievement);

// Update target value for a strategy
router.put('/update', strategyTargetAchievementsController.updateTargetValue);

// Get target value for a strategy
router.get('/target/:strategy_id', strategyTargetAchievementsController.getStrategyTarget);

// Get all achievements for a strategy
router.get('/:strategy_id', strategyTargetAchievementsController.getStrategyAchievements);

module.exports = router;
