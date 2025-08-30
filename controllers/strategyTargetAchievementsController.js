const db = require('../db');

// Check if target has been achieved for a strategy
exports.checkTargetAchievement = async (req, res) => {
    try {
        const { strategy_id, target_value } = req.query;
        
        if (!strategy_id || !target_value) {
            return res.status(400).json({ 
                success: false, 
                error: 'strategy_id and target_value are required' 
            });
        }

        const [rows] = await db.pool.query(
            `SELECT * FROM strategy_target_achievements 
             WHERE strategy_id = ? AND target_value = ? AND has_achieved = TRUE
             ORDER BY updated_at DESC LIMIT 1`,
            [strategy_id, target_value]
        );

        res.json({
            success: true,
            data: {
                hasAchieved: rows.length > 0,
                achievement: rows[0] || null
            }
        });
    } catch (error) {
        console.error('Error checking target achievement:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
};

// Create a new target achievement record or update existing one
exports.createTargetAchievement = async (req, res) => {
    try {
        const { strategy_id, target_value, achieved_value } = req.body;
        
        if (!strategy_id || !target_value) {
            return res.status(400).json({ 
                success: false, 
                error: 'strategy_id and target_value are required' 
            });
        }

        // Check if record already exists for this target
        const [existingRows] = await db.pool.query(
            `SELECT id FROM strategy_target_achievements 
             WHERE strategy_id = ? AND target_value = ?`,
            [strategy_id, target_value]
        );

        if (existingRows.length > 0) {
            // Update existing record to mark as achieved
            const [result] = await db.pool.query(
                `UPDATE strategy_target_achievements 
                 SET has_achieved = TRUE, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [existingRows[0].id]
            );

            const [updatedAchievement] = await db.pool.query(
                'SELECT * FROM strategy_target_achievements WHERE id = ?',
                [existingRows[0].id]
            );

            res.json({
                success: true,
                data: updatedAchievement[0]
            });
        } else {
            // Create new achievement record
            const [result] = await db.pool.query(
                `INSERT INTO strategy_target_achievements 
                 (strategy_id, target_value, has_achieved) 
                 VALUES (?, ?, TRUE)`,
                [strategy_id, target_value]
            );

            const [newAchievement] = await db.pool.query(
                'SELECT * FROM strategy_target_achievements WHERE id = ?',
                [result.insertId]
            );

            res.status(201).json({
                success: true,
                data: newAchievement[0]
            });
        }
    } catch (error) {
        console.error('Error creating target achievement:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
};

// Reset target achievement (mark as not achieved)
exports.resetTargetAchievement = async (req, res) => {
    try {
        const { strategy_id, target_value } = req.body;
        
        if (!strategy_id || !target_value) {
            return res.status(400).json({ 
                success: false, 
                error: 'strategy_id and target_value are required' 
            });
        }

        // Update existing achievement to mark as not achieved
        const [result] = await db.pool.query(
            `UPDATE strategy_target_achievements 
             SET has_achieved = FALSE, updated_at = CURRENT_TIMESTAMP
             WHERE strategy_id = ? AND target_value = ?`,
            [strategy_id, target_value]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'No target achievement found to reset' 
            });
        }

        res.json({
            success: true,
            message: 'Target achievement reset successfully'
        });
    } catch (error) {
        console.error('Error resetting target achievement:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
};

// Get all achievements for a strategy
exports.getStrategyAchievements = async (req, res) => {
    try {
        const { strategy_id } = req.params;
        
        if (!strategy_id) {
            return res.status(400).json({ 
                success: false, 
                error: 'strategy_id is required' 
            });
        }

        const [rows] = await db.pool.query(
            `SELECT * FROM strategy_target_achievements 
             WHERE strategy_id = ? 
             ORDER BY updated_at DESC`,
            [strategy_id]
        );

        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Error fetching strategy achievements:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
};

// Get target value for a strategy (new function)
exports.getStrategyTarget = async (req, res) => {
    try {
        const { strategy_id } = req.params;
        
        if (!strategy_id) {
            return res.status(400).json({ 
                success: false, 
                error: 'strategy_id is required' 
            });
        }

        const [rows] = await db.pool.query(
            `SELECT target_value, has_achieved FROM strategy_target_achievements 
             WHERE strategy_id = ? 
             ORDER BY target_value DESC LIMIT 1`,
            [strategy_id]
        );

        res.json({
            success: true,
            data: rows[0] || null
        });
    } catch (error) {
        console.error('Error fetching strategy target:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
};

// Update target value for a strategy
exports.updateTargetValue = async (req, res) => {
    try {
        const { strategy_id, target_value } = req.body;
        
        if (!strategy_id || !target_value) {
            return res.status(400).json({ 
                success: false, 
                error: 'strategy_id and target_value are required' 
            });
        }

        // Update existing target value
        const [result] = await db.pool.query(
            `UPDATE strategy_target_achievements 
             SET target_value = ?, has_achieved = FALSE, updated_at = CURRENT_TIMESTAMP
             WHERE strategy_id = ?`,
            [target_value, strategy_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'No target achievement found to update' 
            });
        }

        res.json({
            success: true,
            message: 'Target value updated successfully'
        });
    } catch (error) {
        console.error('Error updating target value:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
};
