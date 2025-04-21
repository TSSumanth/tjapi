const express = require('express');
const router = express.Router();
const { KiteConnect } = require('kiteconnect');
const db = require('../db');
require('dotenv').config();
const moment = require('moment');

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

        // Check if positions is an object with net, day properties
        if (positions && typeof positions === 'object') {
            // Create a map to deduplicate positions
            const positionMap = new Map();

            // Process net positions first (they take precedence)
            if (positions.net) {
                positions.net.forEach(position => {
                    // Only keep positions that have a non-zero quantity
                    if (position.quantity !== 0) {
                        // For overnight positions, check if they've been squared off
                        if (position.overnight_quantity !== 0) {
                            const isSquaredOff =
                                (position.overnight_quantity > 0 && position.day_sell_quantity === position.overnight_quantity) ||
                                (position.overnight_quantity < 0 && position.day_buy_quantity === Math.abs(position.overnight_quantity));

                            if (!isSquaredOff) {
                                positionMap.set(position.tradingsymbol, position);
                            }
                        }
                        // For day positions, only show if they're new positions
                        else {
                            const hasOnlyBuys = position.day_buy_quantity > 0 && position.day_sell_quantity === 0;
                            const hasOnlySells = position.day_sell_quantity > 0 && position.day_buy_quantity === 0;

                            if (hasOnlyBuys || hasOnlySells) {
                                positionMap.set(position.tradingsymbol, position);
                            }
                        }
                    }
                });
            }

            // Only add day positions if they don't exist in net
            if (positions.day) {
                positions.day.forEach(position => {
                    if (!positionMap.has(position.tradingsymbol) && position.quantity !== 0) {
                        // For overnight positions, check if they've been squared off
                        if (position.overnight_quantity !== 0) {
                            const isSquaredOff =
                                (position.overnight_quantity > 0 && position.day_sell_quantity === position.overnight_quantity) ||
                                (position.overnight_quantity < 0 && position.day_buy_quantity === Math.abs(position.overnight_quantity));

                            if (!isSquaredOff) {
                                positionMap.set(position.tradingsymbol, position);
                            }
                        }
                        // For day positions, only show if they're new positions
                        else {
                            const hasOnlyBuys = position.day_buy_quantity > 0 && position.day_sell_quantity === 0;
                            const hasOnlySells = position.day_sell_quantity > 0 && position.day_buy_quantity === 0;

                            if (hasOnlyBuys || hasOnlySells) {
                                positionMap.set(position.tradingsymbol, position);
                            }
                        }
                    }
                });
            }

            const allPositions = Array.from(positionMap.values());
            console.log('Processed positions:', {
                totalReceived: positions.net?.length + (positions.day?.length || 0),
                afterFiltering: allPositions.length,
                positions: allPositions.map(p => ({
                    symbol: p.tradingsymbol,
                    quantity: p.quantity,
                    overnight: p.overnight_quantity,
                    dayBuy: p.day_buy_quantity,
                    daySell: p.day_sell_quantity,
                    isSquaredOff: p.overnight_quantity !== 0 ?
                        (p.overnight_quantity > 0 && p.day_sell_quantity === p.overnight_quantity) ||
                        (p.overnight_quantity < 0 && p.day_buy_quantity === Math.abs(p.overnight_quantity))
                        :
                        !(p.day_buy_quantity > 0 && p.day_sell_quantity === 0) &&
                        !(p.day_sell_quantity > 0 && p.day_buy_quantity === 0)
                }))
            });

            res.json({
                success: true,
                data: allPositions
            });
        } else {
            res.json({
                success: true,
                data: positions || []
            });
        }
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

module.exports = router;