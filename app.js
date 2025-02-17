const express = require("express");
const cors = require("cors");
require("dotenv").config();
const marketAnalaysisRouter = require("./routes/marketAnalysisRoutes");
const tagRouter = require("./routes/tagRoutes");
const app = express();

// Middleware declaration
app.use(express.json());
app.use(cors());
app.use("/api/marketanalysis", marketAnalaysisRouter);
app.use("/api/tags", tagRouter);
module.exports = app

