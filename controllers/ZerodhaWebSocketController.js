const { KiteTicker } = require('kiteconnect');

// Config: Set these appropriately
const apiKey = process.env.ZERODHA_API_KEY;
let accessToken = process.env.ZERODHA_ACCESS_TOKEN; // Should be refreshed if expired

// In-memory store for latest ticks and subscriptions
const latestTicks = {}; // { instrument_token: tick }
const subscribedTokens = new Set();

// Singleton KiteTicker instance
let ticker = null;

function initTicker() {
    if (ticker) return ticker;
    ticker = new KiteTicker({ api_key: apiKey, access_token: accessToken });
    ticker.connect();
    ticker.on('ticks', (ticks) => {
        ticks.forEach(tick => {
            latestTicks[tick.instrument_token] = tick;
        });
    });
    ticker.on('connect', () => {
        if (subscribedTokens.size > 0) {
            ticker.subscribe(Array.from(subscribedTokens));
            ticker.setMode(ticker.modeFull, Array.from(subscribedTokens));
        }
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
exports.subscribe = (req, res) => {
    const { tokens } = req.body; // Array of instrument tokens
    if (!Array.isArray(tokens) || tokens.length === 0) {
        return res.status(400).json({ error: 'tokens (array) required' });
    }
    initTicker();
    tokens.forEach(token => subscribedTokens.add(token));
    ticker.subscribe(tokens);
    ticker.setMode(ticker.modeFull, tokens);
    res.json({ success: true, subscribed: Array.from(subscribedTokens) });
};

// API: Unsubscribe from instrument(s)
exports.unsubscribe = (req, res) => {
    const { tokens } = req.body; // Array of instrument tokens
    if (!Array.isArray(tokens) || tokens.length === 0) {
        return res.status(400).json({ error: 'tokens (array) required' });
    }
    initTicker();
    tokens.forEach(token => subscribedTokens.delete(token));
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

// API: List all currently subscribed instruments
exports.getSubscriptions = (req, res) => {
    res.json({ success: true, subscribed: Array.from(subscribedTokens) });
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