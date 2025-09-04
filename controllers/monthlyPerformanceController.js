const { pool } = require('../db');

/**
 * Get monthly performance data for a specific year/month
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getMonthlyPerformance = async (req, res) => {
    try {
        const { year, month } = req.query;
        
        let query = 'SELECT * FROM monthly_performance';
        let params = [];
        
        if (year && month) {
            query += ' WHERE year = ? AND month = ?';
            params = [year, month];
        } else if (year) {
            query += ' WHERE year = ? ORDER BY month ASC';
            params = [year];
        } else {
            // Get current month if no year/month specified
            const currentDate = new Date();
            const currentYear = currentDate.getFullYear();
            const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
            
            query += ' WHERE year = ? AND month = ?';
            params = [currentYear, currentMonth];
        }
        
        try {
            const [rows] = await pool.execute(query, params);
            res.json({
                success: true,
                data: rows
            });
        } catch (err) {
            console.error('Error fetching monthly performance:', err);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to fetch monthly performance data' 
            });
        }
    } catch (error) {
        console.error('Error in getMonthlyPerformance:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
};

/**
 * Create or update monthly performance data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const upsertMonthlyPerformance = async (req, res) => {
    try {
        const { year, month, month_name, expected_return, actual_return, account_balance } = req.body;
        
        // Validation
        if (!year || !month || !month_name) {
            return res.status(400).json({
                success: false,
                error: 'Year, month, and month_name are required'
            });
        }
        
        // Validate numeric fields
        const expectedReturn = parseFloat(expected_return) || 0;
        const actualReturn = parseFloat(actual_return) || 0;
        const accountBalance = parseFloat(account_balance) || 0;
        
        // Check if record exists
        try {
            const [existingRows] = await pool.execute('SELECT id FROM monthly_performance WHERE year = ? AND month = ?', [year, month]);
            
            if (existingRows.length > 0) {
                // Update existing record
                const row = existingRows[0];
                const updateQuery = `
                    UPDATE monthly_performance 
                    SET expected_return = ?, actual_return = ?, account_balance = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE year = ? AND month = ?
                `;
                
                await pool.execute(updateQuery, [expectedReturn, actualReturn, accountBalance, year, month]);
                
                res.json({
                    success: true,
                    message: 'Monthly performance updated successfully',
                    data: {
                        id: row.id,
                        year,
                        month,
                        month_name,
                        expected_return: expectedReturn,
                        actual_return: actualReturn,
                        account_balance: accountBalance
                    }
                });
            } else {
                // Insert new record
                const insertQuery = `
                    INSERT INTO monthly_performance (year, month, month_name, expected_return, actual_return, account_balance)
                    VALUES (?, ?, ?, ?, ?, ?)
                `;
                
                const [insertResult] = await pool.execute(insertQuery, [year, month, month_name, expectedReturn, actualReturn, accountBalance]);
                
                res.json({
                    success: true,
                    message: 'Monthly performance created successfully',
                    data: {
                        id: insertResult.insertId,
                        year,
                        month,
                        month_name,
                        expected_return: expectedReturn,
                        actual_return: actualReturn,
                        account_balance: accountBalance
                    }
                });
            }
        } catch (err) {
            console.error('Error in database operation:', err);
            res.status(500).json({
                success: false,
                error: 'Failed to perform database operation'
            });
        }
    } catch (error) {
        console.error('Error in upsertMonthlyPerformance:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

/**
 * Get current month performance data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getCurrentMonthPerformance = async (req, res) => {
    try {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        
        try {
            const [rows] = await pool.execute('SELECT * FROM monthly_performance WHERE year = ? AND month = ?', [currentYear, currentMonth]);
            
            if (rows.length === 0) {
                // Create default record for current month if it doesn't exist
                const monthNames = [
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                ];
                
                const monthName = monthNames[currentMonth - 1];
                
                const insertQuery = `
                    INSERT INTO monthly_performance (year, month, month_name, expected_return, actual_return, account_balance)
                    VALUES (?, ?, ?, 0.00, 0.00, 0.00)
                `;
                
                const [insertResult] = await pool.execute(insertQuery, [currentYear, currentMonth, monthName]);
                
                res.json({
                    success: true,
                    data: {
                        id: insertResult.insertId,
                        year: currentYear,
                        month: currentMonth,
                        month_name: monthName,
                        expected_return: 0.00,
                        actual_return: 0.00,
                        account_balance: 0.00
                    }
                });
            } else {
                res.json({
                    success: true,
                    data: rows[0]
                });
            }
        } catch (err) {
            console.error('Error fetching current month performance:', err);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch current month performance'
            });
        }
    } catch (error) {
        console.error('Error in getCurrentMonthPerformance:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

/**
 * Get last 6 months of performance data in descending order
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getLast6MonthsPerformance = async (req, res) => {
    try {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        
        // Calculate the date 6 months ago
        const sixMonthsAgo = new Date(currentDate);
        sixMonthsAgo.setMonth(currentMonth - 6);
        const startYear = sixMonthsAgo.getFullYear();
        const startMonth = sixMonthsAgo.getMonth() + 1;
        
        try {
            const [rows] = await pool.execute(
                `SELECT * FROM monthly_performance 
                 WHERE (year > ?) OR (year = ? AND month >= ?)
                 ORDER BY year DESC, month DESC 
                 LIMIT 6`,
                [startYear, startYear, startMonth]
            );
            
            res.json({
                success: true,
                data: rows
            });
        } catch (err) {
            console.error('Error fetching last 6 months performance:', err);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to fetch last 6 months performance data' 
            });
        }
    } catch (error) {
        console.error('Error in getLast6MonthsPerformance:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
};

module.exports = {
    getMonthlyPerformance,
    upsertMonthlyPerformance,
    getCurrentMonthPerformance,
    getLast6MonthsPerformance
};
