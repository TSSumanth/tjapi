const express = require("express");
const cors = require("cors");
require("dotenv").config();
const marketAnalaysisRouter = require("./routes/marketAnalysisRoutes");
const tagRouter = require("./routes/tagRoutes");
const profitLossReportRouter = require("./routes/profitLossAnalysisRoutes");
const ordersRouter = require("./routes/ordersRoutes");
const tradesRouter = require("./routes/tradeRoutes");
const app = express();

// Middleware declaration
app.use(express.json());
app.use(cors());

//routes declaration
app.use("/api/marketanalysis", marketAnalaysisRouter);
app.use("/api/tags", tagRouter);
app.use("/api/plentry", profitLossReportRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/trades", tradesRouter);

//Use this only at the end, if used at the beginning no matter what route is called by the client the response on the below method is only displayed
app.all("*", (req, res, next) => {
  res.status(404).json({
    status: "fail",
    message: `Can't find ${req.originalUrl} on this server`,
  });
});

module.exports = app;
