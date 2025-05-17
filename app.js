const express = require("express");
const cors = require("cors");
require("dotenv").config();
const marketAnalaysisRouter = require("./routes/marketAnalysisRoutes");
const tagRouter = require("./routes/tagRoutes");
const profitLossReportRouter = require("./routes/profitLossAnalysisRoutes");
const ordersRouter = require("./routes/ordersRoutes");
const tradesRouter = require("./routes/tradeRoutes");
const actionitemsRouter = require("./routes/actionItemRoutes");
const strategiesRouter = require("./routes/strategiesRoutes");
const strategyNotesRouter = require("./routes/strategyNotesRoutes");
const zerodhaRouter = require("./routes/zerodhaRoutes");
const portfolioValueRouter = require("./routes/portfolioValueRoutes");
const orderPairsRouter = require("./routes/orderPairsRoutes");
const manualPlRoutes = require('./routes/manualPlRoutes');
const holidaysRouter = require("./routes/holidaysRoutes");
const zerodhaWebSocketRouter = require("./routes/ZerodhaWebSocketRoutes");
const zerodhaAccountRouter = require("./routes/zerodhaAccount");

const app = express();

// Global error handlers for robust logging
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Don't exit the process, just log the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

// Enable CORS for all routes
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5003',
      'http://127.0.0.1:5003',
      'https://kite.trade',
      'https://kite.zerodha.com',
      'http://127.0.0.1:5000'  // Add this for backward compatibility with Zerodha callback
    ];

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'X-Zerodha-Public-Token'],
  exposedHeaders: ['Authorization', 'X-Zerodha-Public-Token'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Middleware declaration
app.use(express.json());

//routes declaration
app.use("/api/marketanalysis", marketAnalaysisRouter);
app.use("/api/tags", tagRouter);
app.use("/api/plentry", profitLossReportRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/trades", tradesRouter);
app.use("/api/actionitems", actionitemsRouter);
app.use("/api/strategies", strategiesRouter);
app.use("/api/strategy-notes", strategyNotesRouter);
app.use("/api/zerodha", zerodhaRouter);
app.use("/api/zerodha-ws", zerodhaWebSocketRouter);
app.use("/api/portfolio-value", portfolioValueRouter);
app.use("/api/order-pairs", orderPairsRouter);
app.use('/api/manual-pl', manualPlRoutes);
app.use("/api/holidays", holidaysRouter);
app.use("/api/zerodha-account", zerodhaAccountRouter);

//Use this only at the end, if used at the beginning no matter what route is called by the client the response on the below method is only displayed
app.all("*", (req, res, next) => {
  res.status(404).json({
    status: "fail",
    message: `Can't find ${req.originalUrl} on this server`,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      error: 'Session expired. Please login again.'
    });
  }

  // Default error
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

module.exports = app;
