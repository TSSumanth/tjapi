const express = require('express');
const router = express.Router();
const { KiteConnect } = require('kiteconnect');
const db = require('../db');
require('dotenv').config();
const moment = require('moment');
const axios = require('axios');

// Add debug logging
console.log('Initializing Zerodha route with API Key:', process.env.ZERODHA_API_KEY);

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

        // Get pagination parameters from query
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 100;
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;

        // Filter and sort instruments
        const sortedInstruments = instruments
            .filter(instrument =>
                instrument.instrument_type === 'FUT' ||
                instrument.instrument_type === 'CE' ||
                instrument.instrument_type === 'PE'
            )
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
        const accessToken = req.headers.authorization?.split(' ')[1];
        if (!accessToken) {
            return res.status(401).json({
                success: false,
                error: 'No access token provided'
            });
        }

        kc.setAccessToken(accessToken);
        const profile = await kc.getProfile();
        const margins = await kc.getMargins('equity');

        // Initialize response with basic data
        const response = {
            success: true,
            data: {
                clientId: profile.user_id,
                name: profile.user_name,
                email: profile.email,
                margins: {
                    equity: {
                        available: parseFloat(margins.available?.cash || 0),
                        utilised: parseFloat(margins.utilised?.debits || 0),
                        net: parseFloat(margins.net || 0),
                        exposure: parseFloat(margins.utilised?.exposure || 0),
                        optionPremium: parseFloat(margins.utilised?.option_premium || 0)
                    }
                },
                mutualFunds: [] // Initialize empty array
            }
        };

        try {
            // Try to get mutual fund holdings if available
            console.log('Fetching mutual fund holdings...');

            // Make a raw HTTP request to the mutual fund holdings endpoint
            const mfResponse = await axios.get('https://api.kite.trade/mf/holdings', {
                headers: {
                    'X-Kite-Version': '3',
                    'Authorization': `token ${kc.api_key}:${kc.access_token}`
                }
            });

            console.log('Raw MF holdings response:', JSON.stringify(mfResponse.data, null, 2));

            // Check if we have valid holdings data
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
                        pnl_percentage: pnlPercentage
                    };
                });
                console.log('Formatted MF holdings:', JSON.stringify(response.data.mutualFunds, null, 2));
            } else {
                console.log('No mutual fund holdings found or invalid response format');
                console.log('Response structure:', JSON.stringify(mfResponse.data, null, 2));
            }
        } catch (mfError) {
            console.error('Error fetching mutual fund holdings:', mfError.message);
            console.error('Error stack:', mfError.stack);
            console.error('Error details:', JSON.stringify(mfError.response?.data || mfError, null, 2));
            // Continue with empty mutual funds array
        }

        res.json(response);
    } catch (error) {
        console.error('Error fetching account information:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;