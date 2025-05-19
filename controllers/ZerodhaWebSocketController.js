const { KiteTicker } = require('kiteconnect');
const db = require('../db');

// Config: Set these appropriately
const apiKey = process.env.ZERODHA_API_KEY;
let accessToken = process.env.ZERODHA_ACCESS_TOKEN; // Should be refreshed if expired
let publicToken = process.env.ZERODHA_PUBLIC_TOKEN; // Should be refreshed if expired
let isManuallyDisconnected = false;
// In-memory store for latest ticks and subscriptions
const latestTicks = {}; // { instrument_token: tick }
const subscribedTokens = new Set();

// Singleton KiteTicker instance
let ticker = null;
let reconnectTimer = null;

// Cleanup function to properly dispose resources
function cleanup() {
    try {
        isManuallyDisconnected = true;

        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }

        if (ticker) {
            try {
                if (ticker.connected) {
                    ticker.disconnect(); // safe even if already disconnected
                    console.log('Ticker disconnected.');
                }
            } catch (err) {
                console.error('Error during ticker.disconnect():', err);
            }
            ticker = null; // avoid reusing stale ticker
        }

        console.log('Cleanup completed.');
    } catch (err) {
        console.error('Error during cleanup():', err);
    }
}

// Handle process termination
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);


async function loadTokensFromDBAndSubscribe() {
    try {
        const [rows] = await db.pool.query('SELECT instrument_token FROM zerodha_subscribed_tokens');
        const tokens = rows.map(row => Number(row.instrument_token));
        console.log('Subscribing to tokens on connect:', tokens);
        tokens.forEach(token => subscribedTokens.add(token));
        if (tokens.length > 0 && ticker) {
            ticker.subscribe(tokens);
            ticker.setMode(ticker.modeFull, tokens);
            console.log('Subscribed  and mode set to FULL for:', tokens);
        }
    } catch (err) {
        console.error('Error loading tokens from DB:', err);
    }
}

function initTicker() {
    isManuallyDisconnected = false;
    try {
        if (ticker) {
            cleanup();
        }

        if (!accessToken) {
            console.error('No access token available for KiteTicker');
            return null;
        }
        // 🔸 Enable debug logging 
        KiteTicker.debug = true;

        ticker = new KiteTicker({ api_key: apiKey, access_token: accessToken, debug: true, reconnect: false });

        ticker.on('ticks', (ticks) => {
            // console.log('Received ticks:', ticks); 
            try {
                ticks.forEach(tick => {
                    latestTicks[tick.instrument_token] = tick;
                });
            } catch (err) {
                console.error('Error processing ticks:', err);
            }
        });

        ticker.on('connect', async () => {
            try {
                console.log('KiteTicker connected successfully');
                await loadTokensFromDBAndSubscribe();
            } catch (err) {
                console.error('Error during ticker connect:', err);
            }
        });

        ticker.on('disconnect', () => {
            console.warn('KiteTicker disconnected');
            if (isManuallyDisconnected) {
                console.log('KiteTicker disconnected manually');
                return
            };

            if (reconnectTimer) clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(() => {
                console.log('Attempting to reconnect KiteTicker...');
                initTicker();
            }, 5000);
        });

        ticker.on('noreconnect', () => {
            try {
                console.error('KiteTicker noreconnect: Will not attempt to reconnect.');
                if (!isManuallyDisconnected) {
                    console.log('KiteTicker noreconnect: Cleaning up...');
                    cleanup(); // clean existing ticker/timer state
                    console.log('Cleanup done after noreconnect.');
                }
            } catch (err) {
                console.error('Error handling noreconnect:', err);
            }
        });

        ticker.on('error', (err) => {
            console.error('KiteTicker error:', err);
            if (err.message && err.message.includes('400')) {
                console.error('Access token may be invalid or expired');
                cleanup();
            }
        });

        ticker.on('reconnect', (reconnectAttempt, reconnectDelay) => {
            console.log(`KiteTicker reconnecting... Attempt: ${reconnectAttempt}, Delay: ${reconnectDelay}ms`);
        });

        ticker.connect();
        return ticker;
    } catch (err) {
        console.error('Failed to initialize KiteTicker:', err);
        cleanup();
        return null;
    }
}

// Load latest access token from DB on startup
async function loadLatestAccessTokenFromDB() {
    try {
        const [rows] = await db.pool.query('SELECT access_token, public_token FROM zerodha_access_tokens ORDER BY updated_at DESC LIMIT 1');
        if (rows.length > 0) {
            accessToken = rows[0].access_token;
            publicToken = rows[0].public_token;
            console.log('Loaded access token from DB');
        } else {
            accessToken = null;
            publicToken = null;
            console.log('No access token found in DB');
        }
    } catch (err) {
        console.error('Failed to load access token from DB:', err);
        accessToken = null;
        publicToken = null;
    }
}

// Call on module load
loadLatestAccessTokenFromDB();

// API: Subscribe to instrument(s)
exports.subscribe = async (req, res) => {
    console.log('Subscribe endpoint called with tokens:', req.body.tokens);
    const { tokens } = req.body; // Array of instrument tokens
    if (!Array.isArray(tokens)) {
        return res.status(400).json({ error: 'tokens (array) required' });
    }
    if (tokens.length === 0) {
        // Just initialize ticker if not already started, and return status
        if (!ticker) {
            const newTicker = initTicker();
            if (!newTicker) {
                return res.status(500).json({ error: 'Failed to initialize WebSocket connection' });
            }
        }
        return res.json({ success: true, message: 'Ticker initialized (no tokens subscribed)' });
    }

    // Check if we have a valid access token
    if (!accessToken) {
        return res.status(401).json({ error: 'Token missing, please provide token' });
    }

    try {
        // Initialize ticker if not already initialized
        if (!ticker) {
            const newTicker = initTicker();
            if (!newTicker) {
                return res.status(500).json({ error: 'Failed to initialize WebSocket connection' });
            }
        }

        // Add to database first
        for (const token of tokens) {
            subscribedTokens.add(token);
            await db.pool.query(
                'INSERT IGNORE INTO zerodha_subscribed_tokens (instrument_token) VALUES (?)',
                [token]
            );
            loadTokensFromDBAndSubscribe()
            // cleanup()
            initTicker();
        }

        // Then subscribe to WebSocket
        // if (ticker && ticker.connected) {
        //     console.log('Subscribing to tokens via ticker:', tokens);
        //     ticker.subscribe(tokens);
        //     ticker.setMode(ticker.modeFull, tokens);
        // }
        res.json({ success: true, subscribed: Array.from(subscribedTokens) });
    } catch (error) {
        if (error.status === 401 || error.status === 403 || (error.message && error.message.toLowerCase().includes('token'))) {
            return res.status(401).json({ error: 'Session expired. Please login again.' });
        }
        console.error('Error in subscribe:', error);
        res.status(500).json({ error: 'Failed to subscribe tokens' });
    }
};

// API: Unsubscribe from instrument(s)
exports.unsubscribe = async (req, res) => {
    const { tokens } = req.body; // Array of instrument tokens
    if (!Array.isArray(tokens) || tokens.length === 0) {
        return res.status(400).json({ error: 'tokens (array) required' });
    }

    // Check if we have a valid access token
    if (!accessToken) {
        return res.status(401).json({ error: 'Session expired. Please login again.' });
    }

    try {
        // Initialize ticker if not already initialized
        if (!ticker) {
            const newTicker = initTicker();
            if (!newTicker) {
                return res.status(500).json({ error: 'Failed to initialize WebSocket connection' });
            }
        }

        // Remove from database first
        for (const token of tokens) {
            subscribedTokens.delete(token);
            await db.pool.query(
                'DELETE FROM zerodha_subscribed_tokens WHERE instrument_token = ?',
                [token]
            );
        }

        // Then unsubscribe from WebSocket
        safeUnsubscribe(tokens);

        res.json({ success: true, subscribed: Array.from(subscribedTokens) });
    } catch (error) {
        if (error.status === 401 || error.status === 403 || (error.message && error.message.toLowerCase().includes('token'))) {
            return res.status(401).json({ error: 'Session expired. Please login again.' });
        }
        console.error('Error in unsubscribe:', error);
        res.status(500).json({ error: 'Failed to unsubscribe tokens' });
    }
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
            console.log("Getting latest tick: " + JSON.stringify(tick));
            return {
                instrument_token: row.instrument_token,
                tradingsymbol: row.tradingsymbol,
                name: row.name,
                exchange: row.exchange,
                ltp: tick ? tick.last_price : null,
                tick_time: tick ? tick.last_trade_time : null,
                tick_last_traded_quantity: tick ? tick.last_traded_quantity : null,
                tick_current_bid_price: tick ? tick.depth.buy[0].price : null,
                tick_current_ask_price: tick ? tick.depth.sell[0].price : null,
                tick_current_bid_quantity: tick ? tick.depth.buy[0].quantity : null,
                tick_current_ask_quantity: tick ? tick.depth.sell[0].quantity : null,
                tick_current_bid_volume: tick ? tick.depth.buy[0].volume : null,
                tick_current_ask_volume: tick ? tick.depth.sell[0].volume : null,
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
exports.setAccessToken = async (req, res) => {
    try {
        const { access_token, public_token } = req.body;
        if (!access_token) {
            return res.status(400).json({ error: 'access_token required' });
        }

        accessToken = access_token;
        if (public_token) publicToken = public_token;
        console.log('Access token updated, saving to DB and reinitializing KiteTicker...');

        try {
            //DELETE ALL EXISTING TOKENS FROM DB
            await db.pool.query('DELETE FROM zerodha_access_tokens');
            await db.pool.query(
                'INSERT INTO zerodha_access_tokens (access_token, public_token) VALUES (?, ?)',
                [access_token, public_token || null]
            );
        } catch (err) {
            console.error('Failed to save access token to DB:', err);
            return res.status(500).json({ error: 'Failed to save access token to DB' });
        }

        cleanup(); // Clean up existing connection
        const newTicker = initTicker();
        if (!newTicker) {
            return res.status(500).json({ error: 'Failed to initialize KiteTicker with new token' });
        }

        res.json({ success: true, message: 'Access token updated, saved to DB, and KiteTicker reinitialized' });
    } catch (err) {
        console.error('Error in setAccessToken:', err);
        cleanup();
        res.status(500).json({ error: 'Internal server error' });
    }
};

// API: Provide access token from frontend if backend is missing it
exports.provideAccessToken = async (req, res) => {
    try {
        const { access_token, public_token } = req.body;
        if (!access_token) {
            return res.status(400).json({ error: 'access_token required' });
        }

        accessToken = access_token;
        if (public_token) publicToken = public_token;
        console.log('Access token provided by frontend, saving to DB and reinitializing KiteTicker...');

        // Save to DB
        try {
            await db.pool.query(
                'INSERT INTO zerodha_access_tokens (access_token, public_token) VALUES (?, ?)',
                [access_token, public_token || null]
            );
        } catch (err) {
            console.error('Failed to save access token to DB:', err);
            return res.status(500).json({ error: 'Failed to save access token to DB' });
        }

        // Re-initialize ticker with new token
        cleanup();
        const newTicker = initTicker();
        if (!newTicker) {
            return res.status(500).json({ error: 'Failed to initialize KiteTicker with new token' });
        }

        res.json({ success: true, message: 'Access token provided, saved to DB, and KiteTicker reinitialized' });
    } catch (err) {
        console.error('Error in provideAccessToken:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getAccessToken = () => accessToken;
exports.getPublicToken = () => publicToken;
exports.loadLatestAccessTokenFromDB = loadLatestAccessTokenFromDB;

function safeUnsubscribe(tokens) {
    if (ticker && ticker.connected) {
        try {
            ticker.unsubscribe(tokens);
        } catch (err) {
            console.error('Error in safeUnsubscribe:', err);
        }
    }
}

exports.disconnect = (req, res) => {
    try {
        isManuallyDisconnected = true;
        cleanup();
        res.json({ success: true, message: 'WebSocket disconnected' });
    } catch (err) {
        console.error('Manual disconnect failed:', err);
        res.status(500).json({ success: false, error: 'Failed to disconnect WebSocket' });
    }
};