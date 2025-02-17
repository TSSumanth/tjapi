const express = require("express");
const cors = require("cors");
require("dotenv").config();
const marketAnalaysisRouter = require("./routes/marketAnalysisRoutes");

const app = express();

// Middleware declaration
app.use(express.json());
app.use(cors());
app.use("/api/marketanalysis", marketAnalaysisRouter);

module.exports = app

