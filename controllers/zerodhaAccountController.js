const db = require('../db');

// Account Summary Operations
exports.getAccountSummary = async (req, res) => {
    try {
        const [rows] = await db.pool.query(
            'SELECT * FROM zerodha_account_summary'
        );
        res.json({ success: true, data: rows[0] || null });
    } catch (err) {
        console.error('Error fetching account summary:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch account summary' });
    }
};

exports.updateAccountSummary = async (req, res) => {
    try {
        const {
            client_id,
            name,
            email
        } = req.body;

        if (!client_id) {
            return res.status(400).json({ success: false, error: 'Client ID is required' });
        }

        // First check if client_id exists
        const [existingRows] = await db.pool.query(
            'SELECT * FROM zerodha_account_summary WHERE client_id = ?',
            [client_id]
        );

        if (existingRows.length > 0) {
            // Update existing record
            const [result] = await db.pool.query(
                `UPDATE zerodha_account_summary 
                SET name = ?, email = ?
                WHERE client_id = ?`,
                [name, email, client_id]
            );
            res.json({ success: true, message: 'Account summary updated successfully' });
        } else {
            // Create new record
            const [result] = await db.pool.query(
                `INSERT INTO zerodha_account_summary 
                (client_id, name, email)
                VALUES (?, ?, ?)`,
                [client_id, name, email]
            );
            res.json({ success: true, message: 'Account summary created successfully' });
        }
    } catch (err) {
        console.error('Error updating account summary:', err);
        res.status(500).json({ success: false, error: 'Failed to update account summary' });
    }
};

// Equity Margins Operations
exports.getEquityMargins = async (req, res) => {
    try {
        const [rows] = await db.pool.query(
            `SELECT * FROM zerodha_equity_margins 
            ORDER BY created_at DESC 
            LIMIT 1`
        );
        res.json({ success: true, data: rows[0] || null });
    } catch (err) {
        console.error('Error fetching equity margins:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch equity margins' });
    }
};

exports.updateEquityMargins = async (req, res) => {
    try {
        const {
            client_id,
            available,
            utilised,
            net,
            exposure,
            optionPremium
        } = req.body;

        if (!client_id) {
            return res.status(400).json({ success: false, error: 'Client ID is required' });
        }

        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];

        // First check if record exists for today
        const [existingRows] = await db.pool.query(
            'SELECT * FROM zerodha_equity_margins WHERE client_id = ? AND record_date = ?',
            [client_id, today]
        );

        if (existingRows.length > 0) {
            // Update existing record for today
            const [result] = await db.pool.query(
                `UPDATE zerodha_equity_margins 
                SET available = ?,
                    utilised = ?,
                    net = ?,
                    exposure = ?,
                    option_premium = ?
                WHERE client_id = ? AND record_date = ?`,
                [available, utilised, net, exposure, optionPremium, client_id, today]
            );
            res.json({ success: true, message: 'Equity margins updated for today' });
        } else {
            // Create new record for today
            const [result] = await db.pool.query(
                `INSERT INTO zerodha_equity_margins 
                (client_id, available, utilised, net, exposure, option_premium, record_date)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [client_id, available, utilised, net, exposure, optionPremium, today]
            );
            res.json({ success: true, message: 'Equity margins recorded for today' });
        }
    } catch (err) {
        console.error('Error updating equity margins:', err);
        res.status(500).json({ success: false, error: 'Failed to update equity margins' });
    }
};

// Mutual Funds Operations
exports.getMutualFunds = async (req, res) => {
    try {
        // First get the latest record_date
        const [dateRows] = await db.pool.query(
            `SELECT record_date 
            FROM zerodha_mutual_funds 
            ORDER BY record_date DESC 
            LIMIT 1`
        );

        if (dateRows.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const latestDate = dateRows[0].record_date;

        // Then get all records for that date
        const [rows] = await db.pool.query(
            `SELECT * FROM zerodha_mutual_funds 
            WHERE record_date = ?
            ORDER BY created_at DESC`,
            [latestDate]
        );

        res.json({
            success: true,
            data: rows,
            record_date: latestDate
        });
    } catch (err) {
        console.error('Error fetching mutual funds:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch mutual funds' });
    }
};

exports.updateMutualFunds = async (req, res) => {
    try {
        const { client_id, data } = req.body;

        if (!client_id || !data || !Array.isArray(data)) {
            return res.status(400).json({ success: false, error: 'Client ID and mutual fund data array are required' });
        }

        const today = new Date().toISOString().split('T')[0];

        // First delete existing records for today
        await db.pool.query(
            'DELETE FROM zerodha_mutual_funds WHERE client_id = ? AND record_date = ?',
            [client_id, today]
        );

        // Insert new records one by one to handle potential duplicates
        for (const fund of data) {
            try {
                await db.pool.query(
                    `INSERT INTO zerodha_mutual_funds 
                    (client_id, folio, scheme_name, units, average_cost, current_nav, pnl, pnl_percentage, record_date)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        client_id,
                        fund.folio,
                        fund.scheme_name,
                        fund.units,
                        fund.average_cost,
                        fund.current_nav,
                        fund.pnl,
                        fund.pnl_percentage,
                        today
                    ]
                );
            } catch (insertErr) {
                console.error(`Error inserting fund ${fund.scheme_name}:`, insertErr);
                // Continue with next fund even if one fails
                continue;
            }
        }

        res.json({ success: true, message: 'Mutual funds updated successfully' });
    } catch (err) {
        console.error('Error updating mutual funds:', err);
        res.status(500).json({ success: false, error: 'Failed to update mutual funds' });
    }
};

exports.deleteMutualFund = async (req, res) => {
    try {
        const { folio } = req.params;
        const { client_id } = req.body;

        if (!client_id) {
            return res.status(400).json({ success: false, error: 'Client ID is required' });
        }

        const [result] = await db.pool.query(
            'DELETE FROM zerodha_mutual_funds WHERE client_id = ? AND folio = ?',
            [client_id, folio]
        );

        res.json({ success: true, message: 'Mutual fund deleted successfully' });
    } catch (err) {
        console.error('Error deleting mutual fund:', err);
        res.status(500).json({ success: false, error: 'Failed to delete mutual fund' });
    }
}; 