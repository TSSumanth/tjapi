const { pool } = require('../db');

// Create a new portfolio value record
exports.createPortfolioValue = async (req, res) => {
    const { account_member_name, account_id, equity_holdings_value = 0, equity_positions_value = 0, equity_account_balance = 0, total_account_value = 0 } = req.body;
    if (!account_member_name || !account_id) {
        return res.status(400).json({ success: false, message: 'Account Member Name and Account Id are required.' });
    }
    try {
        const [result] = await pool.query(
            `INSERT INTO portfolio_value (account_member_name, account_id, equity_holdings_value, equity_positions_value, equity_account_balance, total_account_value) VALUES (?, ?, ?, ?, ?, ?)`,
            [account_member_name, account_id, equity_holdings_value, equity_positions_value, equity_account_balance, total_account_value]
        );
        res.status(201).json({ success: true, id: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ success: false, message: 'Duplicate account member name and account id.' });
        } else {
            res.status(500).json({ success: false, error: err.message });
        }
    }
};

// Get a portfolio value record by id and account_id (or just account_id)
exports.getPortfolioValue = async (req, res) => {
    const { id, account_id } = req.query;
    if (!account_id) {
        return res.status(400).json({ success: false, message: 'account_id is required.' });
    }
    try {
        let rows;
        if (id) {
            [rows] = await pool.query(
                `SELECT * FROM portfolio_value WHERE id = ? AND account_id = ?`,
                [id, account_id]
            );
        } else {
            [rows] = await pool.query(
                `SELECT * FROM portfolio_value WHERE account_id = ? ORDER BY created_at DESC LIMIT 1`,
                [account_id]
            );
        }
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Portfolio value not found.' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// Update a portfolio value record by id and account_id
exports.updatePortfolioValue = async (req, res) => {
    const { id, account_id } = req.body;
    const { equity_holdings_value, equity_positions_value, equity_account_balance, total_account_value } = req.body;
    if (!id || !account_id) {
        return res.status(400).json({ success: false, message: 'id and account_id are required.' });
    }
    try {
        const [result] = await pool.query(
            `UPDATE portfolio_value SET equity_holdings_value = ?, equity_positions_value = ?, equity_account_balance = ?, total_account_value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND account_id = ?`,
            [equity_holdings_value, equity_positions_value, equity_account_balance, total_account_value, id, account_id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Portfolio value not found.' });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// Delete a portfolio value record by id and account_id
exports.deletePortfolioValue = async (req, res) => {
    const { id, account_id } = req.body;
    if (!id || !account_id) {
        return res.status(400).json({ success: false, message: 'id and account_id are required.' });
    }
    try {
        const [result] = await pool.query(
            `DELETE FROM portfolio_value WHERE id = ? AND account_id = ?`,
            [id, account_id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Portfolio value not found.' });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// Get all portfolio value records
exports.getAllPortfolioValues = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM portfolio_value ORDER BY updated_at DESC');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}; 