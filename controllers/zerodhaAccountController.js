const db = require('../db');

// Account Summary Operations
exports.getAccountSummary = async (req, res) => {
    try {
        const [rows] = await db.pool.query(
            'SELECT * FROM zerodha_account_summary WHERE user_id = ?',
            [req.user.id]
        );
        res.json({ success: true, data: rows });
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

        const [result] = await db.pool.query(
            `INSERT INTO zerodha_account_summary 
            (user_id, client_id, name, email)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            email = VALUES(email)`,
            [req.user.id, client_id, name, email]
        );

        res.json({ success: true, message: 'Account summary updated successfully' });
    } catch (err) {
        console.error('Error updating account summary:', err);
        res.status(500).json({ success: false, error: 'Failed to update account summary' });
    }
};

// Equity Margins Operations
exports.getEquityMargins = async (req, res) => {
    try {
        const [rows] = await db.pool.query(
            'SELECT * FROM zerodha_equity_margins WHERE user_id = ?',
            [req.user.id]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error fetching equity margins:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch equity margins' });
    }
};

exports.updateEquityMargins = async (req, res) => {
    try {
        const {
            account_id,
            available_cash,
            available_margin,
            available_withdrawal,
            opening_balance,
            net_balance,
            used_margin,
            used_span_margin,
            used_exposure_margin,
            used_option_premium,
            used_holdings_sales,
            used_holdings_margin,
            used_holdings_span_margin,
            used_holdings_exposure_margin,
            used_holdings_option_premium
        } = req.body;

        const [result] = await db.pool.query(
            `INSERT INTO zerodha_equity_margins 
            (user_id, account_id, available_cash, available_margin, available_withdrawal,
            opening_balance, net_balance, used_margin, used_span_margin, used_exposure_margin,
            used_option_premium, used_holdings_sales, used_holdings_margin, used_holdings_span_margin,
            used_holdings_exposure_margin, used_holdings_option_premium)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            available_cash = VALUES(available_cash),
            available_margin = VALUES(available_margin),
            available_withdrawal = VALUES(available_withdrawal),
            opening_balance = VALUES(opening_balance),
            net_balance = VALUES(net_balance),
            used_margin = VALUES(used_margin),
            used_span_margin = VALUES(used_span_margin),
            used_exposure_margin = VALUES(used_exposure_margin),
            used_option_premium = VALUES(used_option_premium),
            used_holdings_sales = VALUES(used_holdings_sales),
            used_holdings_margin = VALUES(used_holdings_margin),
            used_holdings_span_margin = VALUES(used_holdings_span_margin),
            used_holdings_exposure_margin = VALUES(used_holdings_exposure_margin),
            used_holdings_option_premium = VALUES(used_holdings_option_premium)`,
            [req.user.id, account_id, available_cash, available_margin, available_withdrawal,
                opening_balance, net_balance, used_margin, used_span_margin, used_exposure_margin,
                used_option_premium, used_holdings_sales, used_holdings_margin, used_holdings_span_margin,
                used_holdings_exposure_margin, used_holdings_option_premium]
        );

        res.json({ success: true, message: 'Equity margins updated successfully' });
    } catch (err) {
        console.error('Error updating equity margins:', err);
        res.status(500).json({ success: false, error: 'Failed to update equity margins' });
    }
};

// Mutual Funds Operations
exports.getMutualFunds = async (req, res) => {
    try {
        const [rows] = await db.pool.query(
            'SELECT * FROM zerodha_mutual_funds WHERE user_id = ?',
            [req.user.id]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error fetching mutual funds:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch mutual funds' });
    }
};

exports.updateMutualFunds = async (req, res) => {
    try {
        const {
            account_id,
            fund_name,
            fund_type,
            folio_number,
            scheme_code,
            isin,
            purchase_date,
            purchase_price,
            purchase_units,
            current_price,
            current_value,
            pnl,
            pnl_percentage
        } = req.body;

        const [result] = await db.pool.query(
            `INSERT INTO zerodha_mutual_funds 
            (user_id, account_id, fund_name, fund_type, folio_number, scheme_code, isin,
            purchase_date, purchase_price, purchase_units, current_price, current_value,
            pnl, pnl_percentage)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            fund_name = VALUES(fund_name),
            fund_type = VALUES(fund_type),
            scheme_code = VALUES(scheme_code),
            isin = VALUES(isin),
            purchase_date = VALUES(purchase_date),
            purchase_price = VALUES(purchase_price),
            purchase_units = VALUES(purchase_units),
            current_price = VALUES(current_price),
            current_value = VALUES(current_value),
            pnl = VALUES(pnl),
            pnl_percentage = VALUES(pnl_percentage)`,
            [req.user.id, account_id, fund_name, fund_type, folio_number, scheme_code, isin,
                purchase_date, purchase_price, purchase_units, current_price, current_value,
                pnl, pnl_percentage]
        );

        res.json({ success: true, message: 'Mutual fund updated successfully' });
    } catch (err) {
        console.error('Error updating mutual fund:', err);
        res.status(500).json({ success: false, error: 'Failed to update mutual fund' });
    }
};

exports.deleteMutualFund = async (req, res) => {
    try {
        const { folio_number } = req.params;
        await db.pool.query(
            'DELETE FROM zerodha_mutual_funds WHERE user_id = ? AND folio_number = ?',
            [req.user.id, folio_number]
        );
        res.json({ success: true, message: 'Mutual fund deleted successfully' });
    } catch (err) {
        console.error('Error deleting mutual fund:', err);
        res.status(500).json({ success: false, error: 'Failed to delete mutual fund' });
    }
}; 