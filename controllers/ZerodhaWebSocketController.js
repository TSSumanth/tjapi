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
    if (ticker) {
        ticker.disconnect();
        ticker = null;
    }

    if (!accessToken) {
        console.error('No access token available for KiteTicker');
        return null;
    }

    ticker = new KiteTicker({ api_key: apiKey, access_token: accessToken });

    ticker.on('ticks', (ticks) => {
        ticks.forEach(tick => {
            latestTicks[tick.instrument_token] = tick;
        });
    });

    ticker.on('connect', async () => {
        console.log('KiteTicker connected successfully');
        await loadTokensFromDBAndSubscribe();
    });

    ticker.on('disconnect', () => {
        console.warn('KiteTicker disconnected');
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
            console.log('Attempting to reconnect KiteTicker...');
            initTicker();
        }, 5000);
    });

    ticker.on('error', (err) => {
        console.error('KiteTicker error:', err);
        if (err.message.includes('400')) {
            console.error('Access token may be invalid or expired');
            // Disconnect and clear the ticker instance
            if (ticker) {
                ticker.disconnect();
                ticker = null;
            }
        }
    });

    ticker.on('noreconnect', () => {
        console.error('KiteTicker noreconnect');
    });

    ticker.on('reconnect', (reconnectAttempt, reconnectDelay) => {
        console.log(`KiteTicker reconnecting... Attempt: ${reconnectAttempt}, Delay: ${reconnectDelay}ms`);
    });

    try {
        ticker.connect();
    } catch (err) {
        console.error('Failed to connect KiteTicker:', err);
        return null;
    }

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
    if (!access_token) {
        return res.status(400).json({ error: 'access_token required' });
    }

    accessToken = access_token;
    console.log('Access token updated, reinitializing KiteTicker...');

    // Re-initialize ticker with new token
    if (ticker) {
        ticker.disconnect();
        ticker = null;
    }

    const newTicker = initTicker();
    if (!newTicker) {
        return res.status(500).json({ error: 'Failed to initialize KiteTicker with new token' });
    }

    res.json({ success: true, message: 'Access token updated and KiteTicker reinitialized' });
}; 