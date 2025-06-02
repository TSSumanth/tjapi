const db = require('../db');

// Create a new algo strategy
exports.createAlgoStrategy = async (req, res) => {
    try {
        const {
            instruments_details,
            underlying_instrument,
            automated_order_ids,
            status,
            strategy_type
        } = req.body;

        if (!instruments_details || !underlying_instrument || !status || !strategy_type) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const [result] = await db.pool.query(
            `INSERT INTO algo_strategies (instruments_details, underlying_instrument, automated_order_ids, status, strategy_type)
            VALUES (?, ?, ?, ?, ?)`,
            [
                JSON.stringify(instruments_details),
                underlying_instrument,
                automated_order_ids ? JSON.stringify(automated_order_ids) : null,
                status,
                strategy_type
            ]
        );
        const [strategy] = await db.pool.query('SELECT * FROM algo_strategies WHERE strategyid = ?', [result.insertId]);
        // Parse JSON fields before sending
        if (strategy[0]) {
            strategy[0].instruments_details = typeof strategy[0].instruments_details === 'string'
                ? JSON.parse(strategy[0].instruments_details)
                : strategy[0].instruments_details;
            if (strategy[0].automated_order_ids && typeof strategy[0].automated_order_ids === 'string') {
                strategy[0].automated_order_ids = JSON.parse(strategy[0].automated_order_ids);
            }
        }
        res.status(201).json(strategy[0]);
    } catch (error) {
        console.error('Error creating algo strategy:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get all algo strategies
exports.getAlgoStrategies = async (req, res) => {
    try {
        const { status } = req.query;
        let query = 'SELECT * FROM algo_strategies';
        const values = [];
        if (status) {
            query += ' WHERE status = ?';
            values.push(status);
        }
        query += ' ORDER BY created_at DESC';
        const [strategies] = await db.pool.query(query, values);
        // Parse JSON fields
        strategies.forEach(s => {
            if (typeof s.instruments_details === 'string') {
                s.instruments_details = JSON.parse(s.instruments_details);
            }
            if (s.automated_order_ids && typeof s.automated_order_ids === 'string') {
                s.automated_order_ids = JSON.parse(s.automated_order_ids);
            }
        });
        res.status(200).json(strategies);
    } catch (error) {
        console.error('Error fetching algo strategies:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get a single algo strategy by ID
exports.getAlgoStrategyById = async (req, res) => {
    try {
        const { id } = req.params;
        const [strategies] = await db.pool.query('SELECT * FROM algo_strategies WHERE strategyid = ?', [id]);
        if (strategies.length === 0) {
            return res.status(404).json({ error: 'Strategy not found' });
        }
        // Parse JSON fields
        strategies[0].instruments_details = typeof strategies[0].instruments_details === 'string'
            ? JSON.parse(strategies[0].instruments_details)
            : strategies[0].instruments_details;
        if (strategies[0].automated_order_ids && typeof strategies[0].automated_order_ids === 'string') {
            strategies[0].automated_order_ids = JSON.parse(strategies[0].automated_order_ids);
        }
        res.status(200).json(strategies[0]);
    } catch (error) {
        console.error('Error fetching algo strategy:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update an algo strategy
exports.updateAlgoStrategy = async (req, res) => {
    try {
        const { id } = req.params;
        const fields = req.body;
        const allowedFields = [
            'instruments_details', 'underlying_instrument', 'automated_order_ids', 'status', 'strategy_type'
        ];
        const updates = [];
        const values = [];
        for (const key of allowedFields) {
            if (fields[key] !== undefined) {
                if (key === 'instruments_details' || key === 'automated_order_ids') {
                    updates.push(`${key} = ?`);
                    values.push(JSON.stringify(fields[key]));
                } else {
                    updates.push(`${key} = ?`);
                    values.push(fields[key]);
                }
            }
        }
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        values.push(id);
        await db.pool.query(`UPDATE algo_strategies SET ${updates.join(', ')} WHERE strategyid = ?`, values);
        const [strategies] = await db.pool.query('SELECT * FROM algo_strategies WHERE strategyid = ?', [id]);
        if (strategies[0]) {
            strategies[0].instruments_details = typeof strategies[0].instruments_details === 'string'
                ? JSON.parse(strategies[0].instruments_details)
                : strategies[0].instruments_details;
            if (strategies[0].automated_order_ids && typeof strategies[0].automated_order_ids === 'string') {
                strategies[0].automated_order_ids = JSON.parse(strategies[0].automated_order_ids);
            }
        }
        res.status(200).json(strategies[0]);
    } catch (error) {
        console.error('Error updating algo strategy:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete an algo strategy
exports.deleteAlgoStrategy = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.pool.query('DELETE FROM algo_strategies WHERE strategyid = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Strategy not found' });
        }
        res.status(200).json({ message: 'Strategy deleted successfully' });
    } catch (error) {
        console.error('Error deleting algo strategy:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}; 