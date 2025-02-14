const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const moment = require('moment');

require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

// MySQL Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

db.connect(err => {
    if (err) {
        console.error("❌ MySQL Connection Error:", err);
        console.error("If failed due to Error: listen EADDRINUSE: address already in use :::5000, change the port number");
    }
    else console.log("✅ Connected to MySQL Database");
});

const PORT = 1000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

app.post("/api/marketanalysis", (req, res) => {
    const { date, premarketanalysis, postmarketanalysis, eventday, eventdescription, premarketexpectation, marketmovement } = req.body;
    const sql = "INSERT INTO marketanalysis (date, premarket_analysis, postmarket_analysis, event_day, event_description, premarket_expectation, market_movement) VALUES (?, ?, ?, ?, ?,?,?)";

    db.query(sql, [date, premarketanalysis, postmarketanalysis, eventday, eventdescription, premarketexpectation, marketmovement], (err, result) => {
        if (err) return res.status(500).json(err);
        res.status(201).json({ message: "Analysis added successfully!" });
    });
});

app.get("/api/marketanalysis", (req, res) => {
    db.query("SELECT * FROM marketanalysis ORDER BY date DESC", (err, results) => {
        if (err) return res.status(500).json(err);
        const formattedresults = results.map(results => ({
            ...results,
            date: moment(results.date).format('YYYY-MM-DD') // Format to YYYY-MM-DD
        }));
        res.json(formattedresults);
    });
});

app.get('/api/marketanalysis/:id', (req, res) => {
    const { id } = req.params;

    try {
        db.query('SELECT * FROM marketanalysis WHERE id = ?', [id], (err, results) => {
            if (err) return res.status(500).json(err);
            if (results.length === 0) {
                return res.status(404).json({ message: 'Analysis not found' });
            }
            const formattedresults = results.map(results => ({
                ...results,
                date: moment(results.date).format('YYYY-MM-DD') // Format to YYYY-MM-DD
            }));
            resstatus(200).json(formattedresults);
        });

    } catch (error) {
        console.error('Error fetching Analysis:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.patch("/api/marketanalysis/:id", (req, res) => {
    const { id } = req.params;
    const { date, premarketanalysis, postmarketanalysis, eventday, eventdescription, premarketexpectation, marketmovement } = req.body;
    // Build the query string to update the trade
    let updateFields = [];
    let updateValues = [];
    // Always update asset and trade_type
    updateFields.push('date', 'event_day');
    updateValues.push(date, eventday);

    if (premarketanalysis !== undefined) {
        updateFields.push('premarket_analysis');
        updateValues.push(premarketanalysis);
    }
    if (postmarketanalysis !== undefined) {
        updateFields.push('postmarket_analysis');
        updateValues.push(postmarketanalysis);
    }
    if (eventdescription !== undefined) {
        updateFields.push('event_description');
        updateValues.push(eventdescription);
    }

    if (premarketexpectation !== undefined) {
        updateFields.push('premarket_expectation');
        updateValues.push(premarketexpectation);
    }

    if (marketmovement !== undefined) {
        updateFields.push('premarket_expectation');
        updateValues.push(marketmovement);
    }
    const sqlQuery = `
        UPDATE marketanalysis
        SET ${updateFields.map(field => `${field} = ?`).join(', ')}
        WHERE id = ?
    `;
    updateValues.push(id);
    try {
        // Execute the query
        const result = db.execute(sqlQuery, updateValues);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Analysis not found" });
        }

        // Respond with a success message
        res.status(200).json({ message: "Analysis updated successfully" });
    } catch (error) {
        console.error("Error updating analysis:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});