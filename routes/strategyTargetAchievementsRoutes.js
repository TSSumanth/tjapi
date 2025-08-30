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

// Check if max loss has been triggered
router.get('/max-loss/check', strategyTargetAchievementsController.checkMaxLossTriggered);

// Update max loss value
router.put('/max-loss/update', strategyTargetAchievementsController.updateMaxLossValue);

// Mark max loss as triggered
router.post('/max-loss/trigger', strategyTargetAchievementsController.triggerMaxLoss);

// Get both target and max loss values
router.get('/target-maxloss/:strategy_id', strategyTargetAchievementsController.getStrategyTargetAndMaxLoss);

module.exports = router;
