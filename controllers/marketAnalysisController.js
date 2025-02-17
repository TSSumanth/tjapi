const db = require("./../db");
const moment = require("moment");


exports.createMarketAnalysis = (req, res) => {
  const {
    date,
    premarketanalysis,
    postmarketanalysis,
    eventday,
    eventdescription,
    premarketexpectation,
    marketmovement,
  } = req.body;
  const sql =
    "INSERT INTO marketanalysis (date, premarket_analysis, postmarket_analysis, event_day, event_description, premarket_expectation, market_movement) VALUES (?, ?, ?, ?, ?,?,?)";

  db.query(
    sql,
    [
      date,
      premarketanalysis,
      postmarketanalysis,
      eventday,
      eventdescription,
      premarketexpectation,
      marketmovement,
    ],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.status(201).json({ message: "Analysis added successfully!" });
    }
  );
};

exports.getAllMarketAnalysis = (req, res) => {
  db.query(
    "SELECT * FROM marketanalysis ORDER BY date DESC",
    (err, results) => {
      if (err) return res.status(500).json(err);
      const formattedresults = results.map((results) => ({
        ...results,
        date: moment(results.date).format("YYYY-MM-DD"), // Format to YYYY-MM-DD
      }));
      res.json(formattedresults);
    }
  );
};

exports.getMarketAnalysis = (req, res) => {
  const { id } = req.params;

  try {
    db.query(
      "SELECT * FROM marketanalysis WHERE id = ?",
      [id],
      (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length === 0) {
          return res.status(404).json({ message: "Analysis not found" });
        }
        const formattedresults = results.map((results) => ({
          ...results,
          date: moment(results.date).format("YYYY-MM-DD"), // Format to YYYY-MM-DD
        }));
        res.status(200).json(formattedresults);
      }
    );
  } catch (error) {
    console.error("Error fetching Analysis:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateMarketAnalysis = (req, res) => {
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
  // Build the query string to update the trade
  let updateFields = [];
  let updateValues = [];
  // Always update asset and trade_type
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
    updateFields.push("premarket_expectation");
    updateValues.push(marketmovement);
  }
  const sqlQuery = `
            UPDATE marketanalysis
            SET ${updateFields.map((field) => `${field} = ?`).join(", ")}
            WHERE id = ?
        `;
  updateValues.push(id);
  try {
    // Execute the query
    const result = db.execute(sqlQuery, updateValues, (err, results) => {
      if (err) return res.status(500).json(err);
      console.log(results)
      if (results.affectedRows == 0) {
        return res.status(404).json({ message: "Analysis not found" });
      }
      if (results.affectedRows == 1){
        return res
          .status(200)
          .json({ message: "Analysis updated successfully" });
      }
      res.status(500).json({error: "Unable to update record: "+ id}); 
    });
  } catch (error) {
    console.error("Error updating analysis:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.deleteMarketAnalysis = (req, res) => {
  const { id } = req.params;

  try {
    db.query(
      "Delete FROM marketanalysis WHERE id = ?",
      [id],
      (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.affectedRows == 1) return res.status(204).json({});
        else
          return res
            .status(500)
            .json({ error: `No record available to delete with id:${id}` });
      }
    );
  } catch (error) {
    console.error("Error deleting Analysis:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
