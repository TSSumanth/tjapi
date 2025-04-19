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
const liveDataRouter = require("./routes/liveDataRoute");
const zerodhaRouter = require("./routes/zerodha");
const app = express();

// Middleware declaration
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:3000', 'https://kite.trade', 'https://kite.zerodha.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
  credentials: true
}));

//routes declaration
app.use("/api/marketanalysis", marketAnalaysisRouter);
app.use("/api/tags", tagRouter);
app.use("/api/plentry", profitLossReportRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/trades", tradesRouter);
app.use("/api/actionitems", actionitemsRouter);
app.use("/api/strategies", strategiesRouter);
app.use("/api/strategy-notes", strategyNotesRouter);
app.use("/api/livedata", liveDataRouter);
app.use("/api/zerodha", zerodhaRouter);

//Use this only at the end, if used at the beginning no matter what route is called by the client the response on the below method is only displayed
app.all("*", (req, res, next) => {
  res.status(404).json({
    status: "fail",
    message: `Can't find ${req.originalUrl} on this server`,
  });
});

module.exports = app;
