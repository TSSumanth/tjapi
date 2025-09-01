const moment = require('moment');
const db = require('../db');

/**
 * Get instruments with advanced filtering
 * 
 * Query Parameters:
 * - search: Search in tradingsymbol (case-insensitive)
 * - name: Filter by instrument name (e.g., 'NIFTY', 'BANKNIFTY')
 * - exchange: Filter by exchange (e.g., 'NFO', 'NSE')
 * - type: Filter by instrument_type (e.g., 'CE', 'PE', 'FUT')
 * - strike: Filter by exact strike value
 * - strike_min & strike_max: Filter by strike range (BETWEEN)
 * - expiry: Filter by expiry date (YYYY-MM-DD)
 * - page: Pagination page number (default: 1)
 * - pageSize: Results per page (default: 100)
 * 
 * Example: /instruments?name=NIFTY&exchange=NFO&type=CE&expiry=2025-09-02&strike_min=24000&strike_max=25000
 */
const getInstruments = async (req, res) => {
    try {
        // Validate strike range parameters
        if (req.query.strike_min && req.query.strike_max) {
            const min = parseFloat(req.query.strike_min);
            const max = parseFloat(req.query.strike_max);
            
            if (isNaN(min) || isNaN(max)) {
                return res.status(400).json({
                    success: false,
                    error: 'strike_min and strike_max must be valid numbers'
                });
            }
            
            if (min > max) {
                return res.status(400).json({
                    success: false,
                    error: 'strike_min cannot be greater than strike_max'
                });
            }
        }

        // Build SQL query and params
        let sql = 'SELECT * FROM zerodhainstruments WHERE 1=1';
        let params = [];

        // Filtering
        if (req.query.search) {
            sql += ' AND UPPER(tradingsymbol) LIKE ?';
            params.push(`%${req.query.search.toUpperCase()}%`);
        }
        if (req.query.name) {
            sql += ' AND name = ?';
            params.push(req.query.name.toUpperCase());
        }
        if (req.query.exchange) {
            sql += ' AND exchange = ?';
            params.push(req.query.exchange.toUpperCase());
        }
        if (req.query.type) {
            sql += ' AND instrument_type = ?';
            params.push(req.query.type.toUpperCase());
        }
        if (req.query.strike) {
            sql += ' AND strike = ?';
            params.push(req.query.strike);
        }
        if (req.query.strike_min && req.query.strike_max) {
            sql += ' AND strike BETWEEN ? AND ?';
            params.push(parseFloat(req.query.strike_min), parseFloat(req.query.strike_max));
        }
        if (req.query.expiry) {
            sql += ' AND expiry = ?';
            params.push(req.query.expiry);
        }

        // Count total for pagination
        const [countRows] = await db.pool.query(
            `SELECT COUNT(*) as total FROM (${sql}) as countTable`, params
        );
        const total = countRows[0].total;

        // Pagination
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 100;
        const offset = (page - 1) * pageSize;
        sql += ' ORDER BY expiry, strike LIMIT ? OFFSET ?';
        params.push(pageSize, offset);

        // Log the query for debugging
        console.log('🔍 Instruments Query:', sql);
        console.log('📊 Query Parameters:', params);
        
        // Query paginated instruments
        const [instruments] = await db.pool.query(sql, params);

        // Format instruments for frontend
        const formattedInstruments = instruments.map(instrument => ({
            ...instrument,
            expiry: instrument.expiry ? moment(instrument.expiry).format('YYYY-MM-DD') : null,
            last_trade_time: instrument.last_trade_time ? moment(instrument.last_trade_time).format('YYYY-MM-DD HH:mm:ss') : null,
            strike: instrument.strike ? parseFloat(instrument.strike) : null,
            last_price: instrument.last_price ? parseFloat(instrument.last_price) : null,
            lot_size: instrument.lot_size ? parseInt(instrument.lot_size) : null,
            is_index: ['NIFTY', 'BANKNIFTY', 'FINNIFTY'].includes((instrument.tradingsymbol || '').split(' ')[0]),
            is_future: instrument.instrument_type === 'FUT',
            is_option: instrument.instrument_type === 'CE' || instrument.instrument_type === 'PE',
            days_to_expiry: instrument.expiry ? moment(instrument.expiry).diff(moment(), 'days') : null,
            display_name: instrument.name || instrument.tradingsymbol,
            display_type: instrument.instrument_type === 'CE' ? 'Call' :
                instrument.instrument_type === 'PE' ? 'Put' :
                    instrument.instrument_type === 'FUT' ? 'Future' : 'Stock',
            display_expiry: instrument.expiry ? moment(instrument.expiry).format('DD MMM YYYY') : null,
            display_strike: instrument.strike ? Number(instrument.strike).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }) : null,
            display_last_price: instrument.last_price ? Number(instrument.last_price).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }) : null
        }));

        res.json({
            success: true,
            data: formattedInstruments,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize)
        });
    } catch (error) {
        console.error('Error fetching instruments from local DB:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

module.exports = {
    getInstruments,
}; 