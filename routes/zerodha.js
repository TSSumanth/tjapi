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
            const allPositions = [
                ...(positions.net || []),
                ...(positions.day || [])
            ].filter(position => position.quantity !== 0);

            console.log('Processed positions:', allPositions);

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

module.exports = router;