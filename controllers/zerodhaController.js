const { KiteConnect } = require('kiteconnect');
const moment = require('moment');
const axios = require('axios');
const fs = require('fs');
const csv = require('csv-parse');
const db = require('../db'); // Use shared DB connection

const kc = new KiteConnect({
    api_key: process.env.ZERODHA_API_KEY
});

const ZERODHA_API_URL = 'https://api.kite.trade';

// Get positions
const getPositions = async (req, res) => {
    try {
        const accessToken = req.headers.authorization?.split(' ')[1];
        if (!accessToken) {
            return res.status(401).json({
                success: false,
                error: 'No access token provided'
            });
        }

        kc.setAccessToken(accessToken);
        const positions = await kc.getPositions();

        // Process positions data
        // The positions object has 'net' and 'day' arrays
        const processedPositions = {
            net: positions.net.map(position => ({
                ...position,
                pnl: parseFloat(position.pnl),
                pnl_percentage: parseFloat(position.pnl_percentage)
            })),
            day: positions.day.map(position => ({
                ...position,
                pnl: parseFloat(position.pnl),
                pnl_percentage: parseFloat(position.pnl_percentage)
            }))
        };

        res.json({
            success: true,
            data: processedPositions
        });
    } catch (error) {
        console.error('Error fetching positions:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get holdings
const getHoldings = async (req, res) => {
    try {
        const accessToken = req.headers.authorization?.split(' ')[1];
        if (!accessToken) {
            return res.status(401).json({
                success: false,
                error: 'No access token provided'
            });
        }

        kc.setAccessToken(accessToken);
        const holdings = await kc.getHoldings();

        // Process holdings data
        const processedHoldings = holdings.map(holding => ({
            ...holding,
            pnl: parseFloat(holding.pnl),
            pnl_percentage: parseFloat(holding.pnl_percentage)
        }));

        res.json({
            success: true,
            data: processedHoldings
        });
    } catch (error) {
        console.error('Error fetching holdings:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get login URL
const getLoginUrl = (req, res) => {
    const loginUrl = kc.getLoginURL();
    res.json({
        success: true,
        url: loginUrl
    });
};

// Handle login callback
const handleLogin = async (req, res) => {
    try {
        const { request_token } = req.query;
        if (!request_token) {
            return res.status(400).json({
                success: false,
                error: 'Request token is required'
            });
        }

        const session = await kc.generateSession(request_token, process.env.ZERODHA_API_SECRET);

        // Return an HTML page that will handle the response and close the window
        const html = `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Zerodha Login Success</title>
                    <script>
                        window.onload = function() {
                            const response = {
                                type: 'ZERODHA_AUTH_SUCCESS',
                                data: {
                                    access_token: '${session.access_token}',
                                    public_token: '${session.public_token}'
                                }
                            };
                            window.opener.postMessage(response, '*');
                            window.close();
                        };
                    </script>
                </head>
                <body>
                    <h2>Login Successful</h2>
                    <p>You can close this window now.</p>
                </body>
            </html>
        `;

        res.send(html);
    } catch (error) {
        console.error('Error in login callback:', error);
        // Return an HTML page for error case
        const errorHtml = `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Zerodha Login Error</title>
                    <script>
                        window.onload = function() {
                            const response = {
                                type: 'ZERODHA_AUTH_ERROR',
                                error: '${error.message}'
                            };
                            window.opener.postMessage(response, '*');
                            window.close();
                        };
                    </script>
                </head>
                <body>
                    <h2>Login Failed</h2>
                    <p>${error.message}</p>
                    <p>You can close this window now.</p>
                </body>
            </html>
        `;
        res.send(errorHtml);
    }
};

// Get orders
const getOrders = async (req, res) => {
    try {
        const accessToken = req.headers.authorization?.split(' ')[1];
        if (!accessToken) {
            return res.status(401).json({
                success: false,
                error: 'No access token provided'
            });
        }

        kc.setAccessToken(accessToken);
        const orders = await kc.getOrders();

        // Process orders data - return all orders
        const processedOrders = Array.isArray(orders) ? orders.map(order => ({
            ...order,
            average_price: parseFloat(order.average_price),
            price: parseFloat(order.price),
            trigger_price: parseFloat(order.trigger_price)
        })) : [];

        res.json({
            success: true,
            data: processedOrders
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};


// Get account information
const getAccount = async (req, res) => {
    try {
        const accessToken = req.headers.authorization?.split(' ')[1];
        const publicToken = req.headers['x-zerodha-public-token'];

        if (!accessToken || !publicToken) {
            return res.status(401).json({
                success: false,
                error: 'Authentication tokens missing'
            });
        }

        kc.setAccessToken(accessToken);

        const profile = await kc.getProfile();
        const margins = await kc.getMargins('equity');

        const formattedMargins = {
            available: parseFloat(margins.available.cash || 0),
            utilised: parseFloat(margins.utilised.debits || 0),
            net: parseFloat(margins.net || 0),
            exposure: parseFloat(margins.utilised.exposure || 0),
            optionPremium: parseFloat(margins.utilised.option_premium || 0)
        };

        const response = {
            success: true,
            data: {
                clientId: profile.user_id,
                name: profile.user_name,
                email: profile.email,
                margins: {
                    equity: formattedMargins
                },
                mutualFunds: []
            }
        };

        try {
            const mfResponse = await axios.get('https://api.kite.trade/mf/holdings', {
                headers: {
                    'X-Kite-Version': '3',
                    'Authorization': `token ${process.env.ZERODHA_API_KEY}:${accessToken}`
                }
            });

            if (mfResponse.data && mfResponse.data.data && Array.isArray(mfResponse.data.data)) {
                response.data.mutualFunds = mfResponse.data.data.map(holding => {
                    const currentNav = parseFloat(holding.last_price || holding.current_nav || 0);
                    const avgCost = parseFloat(holding.average_price || holding.purchase_price || 0);
                    const units = parseFloat(holding.quantity || holding.units || 0);
                    const pnl = (currentNav - avgCost) * units;
                    const pnlPercentage = avgCost > 0 ? ((currentNav - avgCost) / avgCost) * 100 : 0;

                    return {
                        scheme_name: holding.fund || 'Unknown Scheme',
                        units: units,
                        average_cost: avgCost,
                        current_nav: currentNav,
                        pnl: pnl,
                        pnl_percentage: pnlPercentage,
                        folio: holding.folio || ''
                    };
                });
            }
        } catch (mfError) {
            console.error('Error fetching mutual fund holdings:', mfError.message);
        }

        res.json(response);
    } catch (error) {
        console.error('Error in account endpoint:', error);
        if (error.status_code === 403 || error.status_code === 401) {
            return res.status(401).json({
                success: false,
                error: 'Session expired. Please login again.'
            });
        }
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch account information'
        });
    }
};

// Place an order
const placeOrder = async (req, res) => {
    try {
        const accessToken = req.headers.authorization?.split(' ')[1];
        if (!accessToken) {
            return res.status(401).json({
                success: false,
                error: 'No access token provided'
            });
        }

        const {
            tradingsymbol,
            exchange,
            transaction_type,
            quantity,
            product,
            order_type,
            price,
            trigger_price
        } = req.body;

        kc.setAccessToken(accessToken);
        const order = await kc.placeOrder('regular', {
            tradingsymbol,
            exchange,
            transaction_type,
            quantity,
            product,
            order_type,
            price,
            trigger_price
        });
        res.json({
            success: true,
            order_id: order.order_id
        });
    } catch (error) {
        console.error('Error placing order:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to place order'
        });
    }
};

// Cancel an order
const cancelOrder = async (req, res) => {
    try {
        const accessToken = req.headers.authorization?.split(' ')[1];
        if (!accessToken) {
            return res.status(401).json({
                success: false,
                error: 'No access token provided'
            });
        }

        const { order_id } = req.params;
        if (!order_id) {
            return res.status(400).json({
                success: false,
                error: 'Order ID is required'
            });
        }

        kc.setAccessToken(accessToken);
        const response = await kc.cancelOrder('regular', order_id);

        res.json({
            success: true,
            order_id: response.order_id
        });
    } catch (error) {
        console.error('Error canceling order:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to cancel order'
        });
    }
};

// Modify an order
const modifyOrder = async (req, res) => {
    try {
        const accessToken = req.headers.authorization?.split(' ')[1];
        if (!accessToken) {
            return res.status(401).json({
                success: false,
                error: 'No access token provided'
            });
        }

        const { order_id } = req.params;
        const {
            quantity,
            price,
            order_type,
            trigger_price
        } = req.body;

        if (!order_id) {
            return res.status(400).json({
                success: false,
                error: 'Order ID is required'
            });
        }

        kc.setAccessToken(accessToken);
        const response = await kc.modifyOrder('regular', order_id, {
            quantity,
            price,
            order_type,
            trigger_price
        });
        res.json({
            success: true,
            order_id: response.order_id
        });
    } catch (error) {
        console.error('Error modifying order:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to modify order'
        });
    }
};

// Get order by ID (order history)
const getOrderById = async (req, res) => {
    try {
        const accessToken = req.headers.authorization?.split(' ')[1];
        if (!accessToken) {
            return res.status(401).json({
                success: false,
                error: 'No access token provided'
            });
        }
        const { order_id } = req.params;
        kc.setAccessToken(accessToken);
        const orderHistory = await kc.getOrderHistory(order_id);
        res.json({ success: true, data: orderHistory });
    } catch (error) {
        console.error('Error fetching order by id:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Refresh Zerodha Instruments
const refreshZerodhaInstruments = async (req, res) => {
    try {
        const url = 'https://api.kite.trade/instruments';
        const response = await axios.get(url, {
            responseType: 'stream',
            headers: {
                'X-Kite-Version': '3',
                'Authorization': `token ${process.env.ZERODHA_API_KEY}:${process.env.ZERODHA_ACCESS_TOKEN}`
            }
        });

        // Save to a temp file
        const tempFile = './instruments.csv';
        const writer = fs.createWriteStream(tempFile);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        // Parse CSV and store in DB
        const parser = fs.createReadStream(tempFile).pipe(csv.parse({ columns: true }));
        let count = 0;
        for await (const record of parser) {
            await db.pool.query(
                `REPLACE INTO zerodhainstruments 
                (exchange, tradingsymbol, instrument_token, exchange_token, name, last_price, expiry, strike, tick_size, lot_size, instrument_type, segment)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    record.exchange,
                    record.tradingsymbol,
                    record.instrument_token,
                    record.exchange_token,
                    record.name,
                    record.last_price,
                    record.expiry || null,
                    record.strike,
                    record.tick_size,
                    record.lot_size,
                    record.instrument_type,
                    record.segment
                ]
            );
            count++;
        }

        fs.unlinkSync(tempFile); // Clean up
        res.json({ success: true, message: `Instrument list refreshed! Total records: ${count}` });
    } catch (err) {
        console.error('Failed to update instruments:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// Updated controller function to fetch real-time LTP from Zerodha using KiteConnect
const getInstrumentsLtp = async (req, res) => {
    try {
        const { exchange, tradingsymbol } = req.query;
        if (!exchange || !tradingsymbol) {
            return res.status(400).json({ error: 'Exchange and tradingsymbol are required' });
        }

        const accessToken = req.headers.authorization?.split(' ')[1];
        if (!accessToken) {
            return res.status(401).json({ error: 'No access token provided' });
        }

        kc.setAccessToken(accessToken);
        const response = await kc.getLTP(`${exchange}:${tradingsymbol}`);

        res.json(response);
    } catch (error) {
        console.error('Error fetching LTP:', error);
        res.status(500).json({ error: 'Failed to fetch LTP' });
    }
};

module.exports = {
    getPositions,
    getHoldings,
    getLoginUrl,
    handleLogin,
    getOrders,
    getAccount,
    placeOrder,
    cancelOrder,
    modifyOrder,
    getOrderById,
    refreshZerodhaInstruments,
    getInstrumentsLtp
}; 