const { KiteTicker } = require('kiteconnect');
const db = require('../db');

// Config: Set these appropriately
const apiKey = process.env.ZERODHA_API_KEY;
let accessToken = process.env.ZERODHA_ACCESS_TOKEN; // Should be refreshed if expired

// In-memory store for latest ticks and subscriptions
const latestTicks = {}; // { instrument_token: tick }
const subscribedTokens = new Set();

// Singleton KiteTicker instance
let ticker = null;

async function loadTokensFromDBAndSubscribe() {
    const [rows] = await db.pool.query('SELECT instrument_token FROM zerodha_subscribed_tokens');
    const tokens = rows.map(row => row.instrument_token);
    tokens.forEach(token => subscribedTokens.add(token));
    if (tokens.length > 0) {
        ticker.subscribe(tokens);
        ticker.setMode(ticker.modeFull, tokens);
    }
}

function initTicker() {
    if (ticker) return ticker;
    ticker = new KiteTicker({ api_key: apiKey, access_token: accessToken });
    ticker.connect();
    ticker.on('ticks', (ticks) => {
        ticks.forEach(tick => {
            latestTicks[tick.instrument_token] = tick;
        });
    });
    ticker.on('connect', async () => {
        await loadTokensFromDBAndSubscribe();
    });
    ticker.on('disconnect', () => {
        console.warn('KiteTicker disconnected');
    });
    ticker.on('error', (err) => {
        console.error('KiteTicker error:', err);
    });
    return ticker;
}

// API: Subscribe to instrument(s)
exports.subscribe = async (req, res) => {
    const { tokens } = req.body; // Array of instrument tokens
    if (!Array.isArray(tokens) || tokens.length === 0) {
        return res.status(400).json({ error: 'tokens (array) required' });
    }
    initTicker();
    for (const token of tokens) {
        subscribedTokens.add(token);
        await db.pool.query(
            'INSERT IGNORE INTO zerodha_subscribed_tokens (instrument_token) VALUES (?)',
            [token]
        );
    }
    ticker.subscribe(tokens);
    ticker.setMode(ticker.modeFull, tokens);
    res.json({ success: true, subscribed: Array.from(subscribedTokens) });
};

// API: Unsubscribe from instrument(s)
exports.unsubscribe = async (req, res) => {
    const { tokens } = req.body; // Array of instrument tokens
    if (!Array.isArray(tokens) || tokens.length === 0) {
        return res.status(400).json({ error: 'tokens (array) required' });
    }
    initTicker();
    for (const token of tokens) {
        subscribedTokens.delete(token);
        await db.pool.query(
            'DELETE FROM zerodha_subscribed_tokens WHERE instrument_token = ?',
            [token]
        );
    }
    ticker.unsubscribe(tokens);
    res.json({ success: true, subscribed: Array.from(subscribedTokens) });
};

// API: Get latest tick for an instrument
exports.getLatestTick = (req, res) => {
    const { instrument_token } = req.query;
    if (!instrument_token) return res.status(400).json({ error: 'instrument_token required' });
    const tick = latestTicks[instrument_token];
    if (!tick) return res.status(404).json({ error: 'No data for this instrument' });
    res.json({ success: true, tick });
};

// API: Get latest market depth for an instrument
exports.getMarketDepth = (req, res) => {
    const { instrument_token } = req.query;
    if (!instrument_token) return res.status(400).json({ error: 'instrument_token required' });
    const tick = latestTicks[instrument_token];
    if (!tick || !tick.depth) return res.status(404).json({ error: 'No depth data for this instrument' });
    res.json({ success: true, depth: tick.depth });
};

// API: List all currently subscribed instruments with details
exports.getSubscriptions = async (req, res) => {
    try {
        // Join with instruments table for details
        const [rows] = await db.pool.query(`
            SELECT t.instrument_token, i.tradingsymbol, i.name, i.exchange
            FROM zerodha_subscribed_tokens t
            LEFT JOIN zerodhainstruments i ON t.instrument_token = i.instrument_token
        `);
        // Add latest tick info
        const data = rows.map(row => {
            const tick = latestTicks[row.instrument_token];
            return {
                instrument_token: row.instrument_token,
                tradingsymbol: row.tradingsymbol,
                name: row.name,
                exchange: row.exchange,
                ltp: tick ? tick.last_price : null,
                tick_time: tick ? tick.timestamp : null
            };
        });
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch subscriptions' });
    }
};

// API: Health/status endpoint
exports.getStatus = (req, res) => {
    res.json({
        success: true,
        tickerConnected: !!(ticker && ticker.connected),
        numSubscriptions: subscribedTokens.size,
        subscriptions: Array.from(subscribedTokens)
    });
};

// API: Set/update the access token for KiteTicker
exports.setAccessToken = (req, res) => {
    const { access_token } = req.body;
    if (!access_token) return res.status(400).json({ error: 'access_token required' });
    accessToken = access_token;
    // Optionally: re-initialize ticker with new token
    if (ticker) {
        ticker.disconnect();
        ticker = null;
    }
    res.json({ success: true });
}; 