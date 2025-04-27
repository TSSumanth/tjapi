const express = require('express');
const router = express.Router();
const { KiteConnect } = require('kiteconnect');
const db = require('../db');
require('dotenv').config();
const moment = require('moment');
const axios = require('axios');

// Add debug logging
console.log('Initializing Zerodha route with API Key:', process.env.ZERODHA_API_KEY);
console.log('Environment variables:', {
    ZERODHA_API_KEY: process.env.ZERODHA_API_KEY ? 'Present' : 'Missing',
    ZERODHA_API_SECRET: process.env.ZERODHA_API_SECRET ? 'Present' : 'Missing'
});

const kc = new KiteConnect({
    api_key: process.env.ZERODHA_API_KEY,
    api_secret: process.env.ZERODHA_API_SECRET
});

// Get positions
router.get('/positions', async (req, res) => {
    try {
        const accessToken = req.headers.authorization?.split(' ')[1];
        console.log('Fetching positions with token:', accessToken ? 'Present' : 'Missing');

        if (!accessToken) {
            return res.status(401).json({
                success: false,
                error: 'No access token provided'
            });
        }

        kc.setAccessToken(accessToken);
        console.log('Calling Zerodha API for positions...');
        const positions = await kc.getPositions();
        console.log('Positions received:', positions);

        // Just pass through the raw positions data
        res.json({
            success: true,
            data: positions || { net: [], day: [] }
        });
    } catch (error) {
        console.error('Error fetching positions:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get holdings
router.get('/holdings', async (req, res) => {
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
        res.json({
            success: true,
            data: holdings
        });
    } catch (error) {
        console.error('Error fetching holdings:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get login URL
router.get('/login-url', (req, res) => {
    try {
        const loginUrl = kc.getLoginURL();
        console.log('Generated login URL:', loginUrl);
        res.json({
            success: true,
            loginUrl: loginUrl
        });
    } catch (error) {
        console.error('Error generating login URL:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Handle Zerodha callback
router.get('/login', async (req, res) => {
    try {
        const { request_token } = req.query;
        console.log('Received request token:', request_token);

        if (!request_token) {
            return res.send(`
                <!DOCTYPE html>
                <html>
                    <head>
                        <title>Zerodha Authentication</title>
                    </head>
                    <body>
                        <script>
                            window.opener.postMessage({
                                type: 'ZERODHA_AUTH_ERROR',
                                error: 'No request token provided'
                            }, '*');
                            setTimeout(() => window.close(), 1000);
                        </script>
                        <p>Authentication failed: No request token provided</p>
                    </body>
                </html>
            `);
        }

        const session = await kc.generateSession(request_token, process.env.ZERODHA_API_SECRET);
        console.log('Session generated:', session);

        res.send(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Zerodha Authentication</title>
                </head>
                <body>
                    <script>
                        window.opener.postMessage({
                            type: 'ZERODHA_AUTH_SUCCESS',
                            data: {
                                access_token: '${session.access_token}',
                                public_token: '${session.public_token}'
                            }
                        }, '*');
                        window.close();
                    </script>
                    <p>Authentication successful! This window will close automatically.</p>
                </body>
            </html>
        `);
    } catch (error) {
        console.error('Error in login callback:', error);
        res.send(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Zerodha Authentication</title>
                </head>
                <body>
                    <script>
                        window.opener.postMessage({
                            type: 'ZERODHA_AUTH_ERROR',
                            error: '${error.message}'
                        }, '*');
                        setTimeout(() => window.close(), 1000);
                    </script>
                    <p>Authentication failed: ${error.message}</p>
                </body>
            </html>
        `);
    }
});

// Get orders
router.get('/orders', async (req, res) => {
    try {
        const accessToken = req.headers.authorization?.split(' ')[1];
        if (!accessToken) {
            return res.status(401).json({
                success: false,
                error: 'No access token provided'
            });
        }

        kc.setAccessToken(accessToken);

        // Get today's date in YYYY-MM-DD format
        const today = moment();
        const fromDate = today.format('YYYY-MM-DD');
        const toDate = today.format('YYYY-MM-DD');

        // Fetch orders for today
        const orders = await kc.getOrders({
            from_date: fromDate,
            to_date: toDate
        });

        // Filter out cancelled orders and process partially completed orders
        const processedOrders = orders.map(order => {
            if (order.status === 'CANCELLED') {
                return null;
            }

            // For partially completed orders, create a new order with filled quantity
            if (order.status === 'PARTIALLY COMPLETED') {
                return {
                    ...order,
                    quantity: order.filled_quantity,
                    price: order.average_price
                };
            }

            // For completed orders
            if (order.status === 'COMPLETE') {
                return {
                    ...order,
                    quantity: order.filled_quantity,
                    price: order.average_price
                };
            }

            return order;
        }).filter(order => order !== null);

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
});

// Get instruments
router.get('/instruments', async (req, res) => {
    try {
        const accessToken = req.headers.authorization?.split(' ')[1];
        if (!accessToken) {
            return res.status(401).json({
                success: false,
                error: 'No access token provided'
            });
        }

        kc.setAccessToken(accessToken);
        console.log('Fetching instruments for exchange: NFO');
        const instruments = await kc.getInstruments('NFO');
        console.log('Instruments fetched:', instruments?.length || 0);

        if (!instruments || instruments.length === 0) {
            console.warn('No instruments returned from KiteConnect API');
            return res.json({
                success: true,
                data: [],
                total: 0,
                page: 1,
                pageSize: 0
            });
        }

        // Get pagination and search parameters from query
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 100;
        const search = req.query.search?.toUpperCase();
        const strikePrice = parseFloat(req.query.strike);
        const expiry = req.query.expiry;
        const instrumentType = req.query.type?.toUpperCase();
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;

        console.log('Search parameters:', {
            search,
            strikePrice,
            expiry,
            instrumentType,
            page,
            pageSize
        });

        // Filter and sort instruments
        const sortedInstruments = instruments
            .filter(instrument => {
                if (!instrument) {
                    console.warn('Found null instrument in the list');
                    return false;
                }

                // First filter by instrument type
                const typeMatch = instrumentType
                    ? instrument.instrument_type === instrumentType
                    : instrument.instrument_type === 'FUT' ||
                    instrument.instrument_type === 'CE' ||
                    instrument.instrument_type === 'PE';

                // Then filter by search term if provided
                const searchMatch = search
                    ? instrument.tradingsymbol && instrument.tradingsymbol.includes(search)
                    : true;

                // Filter by strike price if provided (only for options)
                const strikeMatch = strikePrice
                    ? (instrument.instrument_type !== 'FUT' && instrument.strike === strikePrice)
                    : true;

                // Filter by expiry if provided
                const expiryMatch = expiry
                    ? instrument.expiry && moment(instrument.expiry).format('YYYY-MM-DD') === expiry
                    : true;

                const matches = typeMatch && searchMatch && strikeMatch && expiryMatch;

                if (matches) {
                    console.log('Matching instrument:', {
                        tradingsymbol: instrument.tradingsymbol,
                        type: instrument.instrument_type,
                        strike: instrument.strike,
                        expiry: instrument.expiry
                    });
                }

                return matches;
            })
            .sort((a, b) => {
                // Sort by expiry date first
                const dateA = new Date(a.expiry);
                const dateB = new Date(b.expiry);
                if (dateA - dateB !== 0) return dateA - dateB;

                // Then by strike price for options
                if (a.instrument_type !== 'FUT' && b.instrument_type !== 'FUT') {
                    return a.strike - b.strike;
                }

                return 0;
            });

        // Slice the instruments array based on pagination
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
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get account information
router.get('/account', async (req, res) => {
    try {
        console.log('Account endpoint called');
        const accessToken = req.headers.authorization?.split(' ')[1];
        const publicToken = req.headers['x-zerodha-public-token'];

        console.log('Access token present:', !!accessToken);
        console.log('Public token present:', !!publicToken);
        console.log('Current API Key:', process.env.ZERODHA_API_KEY);

        if (!accessToken || !publicToken) {
            console.log('Missing tokens:', {
                accessToken: !!accessToken,
                publicToken: !!publicToken
            });
            return res.status(401).json({
                success: false,
                error: 'Authentication tokens missing'
            });
        }

        // Use the same KiteConnect instance
        console.log('Setting access token and making API calls...');
        console.log('Access token being set:', accessToken);
        kc.setAccessToken(accessToken);

        try {
            console.log('Fetching profile...');
            const profile = await kc.getProfile();
            console.log('Profile fetched successfully');

            console.log('Fetching margins...');
            const margins = await kc.getMargins('equity');
            console.log('Margins fetched successfully:', JSON.stringify(margins, null, 2));

            // Format margins data
            const formattedMargins = {
                available: parseFloat(margins.available.cash || 0),
                utilised: parseFloat(margins.utilised.debits || 0),
                net: parseFloat(margins.net || 0),
                exposure: parseFloat(margins.utilised.exposure || 0),
                optionPremium: parseFloat(margins.utilised.option_premium || 0)
            };

            // Initialize response with basic data
            const response = {
                success: true,
                data: {
                    clientId: profile.user_id,
                    name: profile.user_name,
                    email: profile.email,
                    margins: {
                        equity: formattedMargins
                    },
                    mutualFunds: [] // Initialize empty array for mutual funds
                }
            };

            // Try to fetch mutual fund holdings
            try {
                console.log('Fetching mutual fund holdings...');

                // Make a direct HTTP request to Zerodha's MF holdings endpoint
                const mfResponse = await axios.get('https://api.kite.trade/mf/holdings', {
                    headers: {
                        'X-Kite-Version': '3',
                        'Authorization': `token ${process.env.ZERODHA_API_KEY}:${accessToken}`
                    }
                });

                console.log('MF holdings raw response:', JSON.stringify(mfResponse.data, null, 2));

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
                    console.log('Formatted MF holdings:', JSON.stringify(response.data.mutualFunds, null, 2));
                } else {
                    console.log('No mutual fund holdings found or invalid response format');
                }
            } catch (mfError) {
                console.error('Error fetching mutual fund holdings:', mfError.message);
                console.error('Error details:', mfError.response?.data || mfError);
                // Continue with empty mutual funds array
            }

            console.log('Sending response:', JSON.stringify(response, null, 2));
            res.json(response);
        } catch (apiError) {
            console.error('Zerodha API Error:', apiError);
            console.error('Error details:', {
                message: apiError.message,
                status: apiError.status_code,
                response: apiError.response?.data,
                apiKey: process.env.ZERODHA_API_KEY,
                accessToken: accessToken
            });

            // If we get a 403 or 401 from Zerodha, it means the token is invalid
            if (apiError.status_code === 403 || apiError.status_code === 401) {
                return res.status(401).json({
                    success: false,
                    error: 'Session expired. Please login again.'
                });
            }
            throw apiError;
        }
    } catch (error) {
        console.error('Error in account endpoint:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch account information'
        });
    }
});

// Place an order
router.post('/order', async (req, res) => {
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

        console.log('Placing order with params:', req.body);

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

        console.log('Order placed successfully:', order);
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
});

module.exports = router;