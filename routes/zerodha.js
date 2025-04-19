const express = require('express');
const router = express.Router();
const { KiteConnect } = require('kiteconnect');
require('dotenv').config();

// Add debug logging
console.log('Initializing Zerodha route with API Key:', process.env.ZERODHA_API_KEY);

const kc = new KiteConnect({
    api_key: process.env.ZERODHA_API_KEY
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
        if (!process.env.ZERODHA_API_KEY) {
            throw new Error('Zerodha API credentials are not configured properly');
        }
        res.json({ success: true });
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
    console.log('Received login callback:', {
        query: req.query,
        headers: req.headers,
        url: req.url,
        apiKey: process.env.ZERODHA_API_KEY ? 'Present' : 'Missing',
        apiSecret: process.env.ZERODHA_API_SECRET ? 'Present' : 'Missing'
    });

    try {
        const requestToken = req.query.request_token;
        const status = req.query.status;

        if (!process.env.ZERODHA_API_KEY || !process.env.ZERODHA_API_SECRET) {
            throw new Error('Zerodha API credentials are not configured properly');
        }

        if (!requestToken) {
            return res.send(`
                <!DOCTYPE html>
                <html>
                    <head>
                        <title>Zerodha Authentication</title>
                    </head>
                    <body>
                        <script>
                            try {
                                window.opener.postMessage({
                                    type: 'ZERODHA_AUTH_ERROR',
                                    error: 'No request token provided'
                                }, '*');
                            } catch (e) {
                                console.error('Error sending message:', e);
                            }
                            setTimeout(() => window.close(), 1000);
                        </script>
                        <p>Authentication failed: No request token provided</p>
                    </body>
                </html>
            `);
        }

        if (status !== 'success') {
            return res.send(`
                <!DOCTYPE html>
                <html>
                    <head>
                        <title>Zerodha Authentication</title>
                    </head>
                    <body>
                        <script>
                            try {
                                window.opener.postMessage({
                                    type: 'ZERODHA_AUTH_ERROR',
                                    error: 'Login not successful'
                                }, '*');
                            } catch (e) {
                                console.error('Error sending message:', e);
                            }
                            setTimeout(() => window.close(), 1000);
                        </script>
                        <p>Authentication failed: Login not successful</p>
                    </body>
                </html>
            `);
        }

        console.log('Attempting to generate session with token:', requestToken);

        // Generate session
        const session = await kc.generateSession(requestToken, process.env.ZERODHA_API_SECRET);
        console.log('Session generated successfully:', session);

        // Return HTML that sends the tokens to the parent window
        res.send(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Zerodha Authentication</title>
                </head>
                <body>
                    <script>
                        try {
                            window.opener.postMessage({
                                type: 'ZERODHA_AUTH_SUCCESS',
                                data: {
                                    access_token: '${session.access_token}',
                                    public_token: '${session.public_token}'
                                }
                            }, '*');
                        } catch (e) {
                            console.error('Error sending message:', e);
                        }
                        setTimeout(() => window.close(), 1000);
                    </script>
                    <p>Authentication successful! You can close this window.</p>
                </body>
            </html>
        `);
    } catch (error) {
        console.error('Error in /login route:', error);
        console.error('Error stack:', error.stack);

        res.send(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Zerodha Authentication</title>
                </head>
                <body>
                    <script>
                        try {
                            window.opener.postMessage({
                                type: 'ZERODHA_AUTH_ERROR',
                                error: '${error.message}'
                            }, '*');
                        } catch (e) {
                            console.error('Error sending message:', e);
                        }
                        setTimeout(() => window.close(), 1000);
                    </script>
                    <p>Authentication failed: ${error.message}</p>
                </body>
            </html>
        `);
    }
});

module.exports = router;