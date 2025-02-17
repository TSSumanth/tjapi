const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
require("dotenv").config();

const marketAnalaysisRouter = require('./routes/marketAnalysisRoutes')

const app = express();

// Middleware declaration
app.use(express.json());
app.use(cors());
app.use("/api/marketanalysis", marketAnalaysisRouter);

const PORT = 1000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));


