const { KiteConnect } = require('kiteconnect');
const moment = require('moment');
const axios = require('axios');

const kc = new KiteConnect({
    api_key: process.env.ZERODHA_API_KEY
});

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
        const processedOrders = orders.map(order => ({
            ...order,
            average_price: parseFloat(order.average_price),
            price: parseFloat(order.price),
            trigger_price: parseFloat(order.trigger_price)
        }));

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

// Get instruments
const getInstruments = async (req, res) => {
    try {
        const accessToken = req.headers.authorization?.split(' ')[1];
        if (!accessToken) {
            return res.status(401).json({
                success: false,
                error: 'No access token provided'
            });
        }

        kc.setAccessToken(accessToken);
        const instruments = await kc.getInstruments();

        if (!instruments || instruments.length === 0) {
            return res.json({
                success: true,
                data: [],
                total: 0,
                page: 1,
                pageSize: 0
            });
        }

        // Get pagination and search parameters
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 100;
        const search = req.query.search?.toUpperCase();
        const strikePrice = parseFloat(req.query.strike);
        const expiry = req.query.expiry;
        const instrumentType = req.query.type?.toUpperCase();
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;

        // Filter and sort instruments
        const sortedInstruments = instruments
            .filter(instrument => {
                if (!instrument) return false;

                const typeMatch = instrumentType
                    ? instrument.instrument_type === instrumentType
                    : instrument.instrument_type === 'FUT' ||
                    instrument.instrument_type === 'CE' ||
                    instrument.instrument_type === 'PE';

                const searchMatch = search
                    ? instrument.tradingsymbol && instrument.tradingsymbol.includes(search)
                    : true;

                const strikeMatch = strikePrice
                    ? (instrument.instrument_type !== 'FUT' && instrument.strike === strikePrice)
                    : true;

                const expiryMatch = expiry
                    ? instrument.expiry && moment(instrument.expiry).format('YYYY-MM-DD') === expiry
                    : true;

                return typeMatch && searchMatch && strikeMatch && expiryMatch;
            })
            .sort((a, b) => {
                const dateA = new Date(a.expiry);
                const dateB = new Date(b.expiry);
                if (dateA - dateB !== 0) return dateA - dateB;
                if (a.instrument_type !== 'FUT' && b.instrument_type !== 'FUT') {
                    return a.strike - b.strike;
                }
                return 0;
            });

        const paginatedInstruments = sortedInstruments.slice(startIndex, endIndex);

        res.json({
            success: true,
            data: paginatedInstruments,
            total: sortedInstruments.length,
            page: page,
            pageSize: pageSize,
            totalPages: Math.ceil(sortedInstruments.length / pageSize)
        });
    } catch (error) {
        console.error('Error fetching instruments:', error);
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

module.exports = {
    getPositions,
    getHoldings,
    getLoginUrl,
    handleLogin,
    getOrders,
    getInstruments,
    getAccount,
    placeOrder,
    cancelOrder,
    modifyOrder,
    getOrderById
}; 