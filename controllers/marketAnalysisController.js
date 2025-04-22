const db = require("./../db");
const moment = require("moment");

exports.createMarketAnalysis = async (req, res) => {
  const {
    date,
    premarketanalysis,
    postmarketanalysis,
    eventday,
    eventdescription,
    premarketexpectation,
    marketmovement,
  } = req.body;

  try {
    const sql =
      "INSERT INTO marketanalysis (date, premarket_analysis, postmarket_analysis, event_day, event_description, premarket_expectation, market_movement) VALUES (?, ?, ?, ?, ?, ?, ?)";

    const [result] = await db.pool.query(sql, [
      date,
      premarketanalysis,
      postmarketanalysis,
      eventday,
      eventdescription,
      premarketexpectation,
      marketmovement,
    ]);

    res.status(201).json({ message: "Analysis added successfully!" });
  } catch (err) {
    console.error("Error creating market analysis:", err);
    res.status(500).json({ error: "Failed to create market analysis" });
  }
};

exports.getAllMarketAnalysis = async (req, res) => {
  try {
    const [results] = await db.pool.query(
      "SELECT * FROM marketanalysis ORDER BY date DESC"
    );

    const formattedresults = results.map((result) => ({
      ...result,
      date: moment(result.date).format("YYYY-MM-DD"),
    }));

    res.json(formattedresults);
  } catch (err) {
    console.error("Error fetching market analysis:", err);
    res.status(500).json({ error: "Failed to fetch market analysis" });
  }
};

exports.getMarketAnalysis = async (req, res) => {
  const { id } = req.params;

  try {
    const [results] = await db.pool.query(
      "SELECT * FROM marketanalysis WHERE id = ?",
      [id]
    );

    if (results.length === 0) {
      return res.status(404).json({ message: "Analysis not found" });
    }

    const formattedresults = results.map((result) => ({
      ...result,
      date: moment(result.date).format("YYYY-MM-DD"),
    }));

    res.status(200).json(formattedresults);
  } catch (error) {
    console.error("Error fetching Analysis:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateMarketAnalysis = async (req, res) => {
  const { id } = req.params;
  const {
    date,
    premarketanalysis,
    postmarketanalysis,
    eventday,
    eventdescription,
    premarketexpectation,
    marketmovement,
  } = req.body;

  try {
    // Build the query string to update the trade
    let updateFields = [];
    let updateValues = [];

    // Always update date and event_day
    updateFields.push("date", "event_day");
    updateValues.push(date, eventday);

    if (premarketanalysis !== undefined) {
      updateFields.push("premarket_analysis");
      updateValues.push(premarketanalysis);
    }
    if (postmarketanalysis !== undefined) {
      updateFields.push("postmarket_analysis");
      updateValues.push(postmarketanalysis);
    }
    if (eventdescription !== undefined) {
      updateFields.push("event_description");
      updateValues.push(eventdescription);
    }
    if (premarketexpectation !== undefined) {
      updateFields.push("premarket_expectation");
      updateValues.push(premarketexpectation);
    }
    if (marketmovement !== undefined) {
      updateFields.push("market_movement"); // Fixed field name
      updateValues.push(marketmovement);
    }

    const sqlQuery = `
      UPDATE marketanalysis
      SET ${updateFields.map((field) => `${field} = ?`).join(", ")}
      WHERE id = ?
    `;
    updateValues.push(id);

    const [result] = await db.pool.query(sqlQuery, updateValues);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Analysis not found" });
    }

    res.status(200).json({ message: "Analysis updated successfully" });
  } catch (error) {
    console.error("Error updating analysis:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.deleteMarketAnalysis = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.pool.query(
      "DELETE FROM marketanalysis WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 1) {
      return res.status(204).json({});
    }

    return res.status(404).json({
      error: `No record available to delete with id:${id}`
    });
  } catch (error) {
    console.error("Error deleting Analysis:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
