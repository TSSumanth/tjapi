const db = require("../db");
const moment = require("moment");
exports.createStrategy = (req, res) => {
  let { name, description, created_at, stock_trades, option_trades, status } = req.body;
  if (!name) {
    return res.status(400).json({
      error:
        "Missing required fields: name",
    });
  }
  if (!status) {
    return res.status(400).json({
      error:
        "Missing required fields: status",
    });
  }
  if (created_at === undefined)
    created_at = new Date();
  if (stock_trades !== undefined || stock_trades !== null)
    stock_trades = JSON.stringify([])
  if (option_trades !== undefined || option_trades !== null)
    option_trades = JSON.stringify([])

  if (!(status.toUpperCase() === "OPEN" || status.toUpperCase() === "CLOSED")) {
    return res.status(400).json({
      error: `Incorrect value ${status.toUpperCase()} in status: Status can only be OPEN or CLOSED`,
    });
  }
  db.query(
    `Select name from strategies where name = ?`,
    [name.toUpperCase()],
    (err, results) => {
      if (results.length > 0) {
        return res.status(500).json({ message: "Duplicate strategy name not allowed!" });
      }
      const sql = "INSERT INTO strategies (name, description,status, stock_trades, option_trades, created_at) VALUES (?, ?,?, ?,?,?)";
      db.query(
        sql,
        [name.toUpperCase(), description, status.toUpperCase(), stock_trades, option_trades, created_at],
        async (err1, result1) => {
          if (err1) {
            return res.status(500).json(err1);
          }
          if (result1.affectedRows == 1) {
            const [newRecord] = await db.promise().query("SELECT * FROM strategies WHERE id = ?", [result1.insertId]);
            return res.status(201).json(newRecord[0])
          } res.status(500).json({
            error: "Unable to Create new strategy: " + name.toUpperCase(),
          });
        }
      );
    }
  );
};

exports.getStrategies = (req, res) => {
  let { name, id, status, createdafter, createdbefore } = req.query;
  if (id !== undefined) {
    try {
      db.query("SELECT * FROM strategies WHERE id = ?", [id], (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length === 0) {
          return res.status(404).json({ message: "Strategy not found: " + id });
        }
        return res.status(200).json(results);
      });
    } catch (error) {
      console.error("Error fetching strategies:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  } else {
    let params = [];
    let query = "SELECT * FROM strategies WHERE 1=1";
    if (name) {
      query += ` AND name REGEXP ?`;
      params.push(name);
    }
    if (status) {
      query += " AND status = ?";
      params.push(status.toUpperCase());
    }
    if (createdafter) {
      query += " AND created_at >= ?";
      params.push(createdafter);
    }
    if (createdbefore) {
      query += " AND created_at <= ?";
      params.push(createdbefore);
    }
    query += " ORDER BY created_at DESC";
    console.log(query)
    db.query(query, params, (err, results) => {
      if (err) return res.status(500).json(err);
      const formattedresults = results.map((results) => ({
        ...results,
        created_at: moment(results.created_at).format("YYYY-MM-DD HH:mm"), // Format to YYYY-MM-DD
      }));
      res.status(200).json(formattedresults);
    });
  }
};

exports.updateStrategy = (req, res) => {
  const { id } = req.query;
  let strategyname = req.body.name;
  let description = req.body.description;
  let stock_trades = req.body.stock_trades;
  let option_trades = req.body.option_trades;
  let status = req.body.status;

  if (stock_trades !== undefined)
    stock_trades = JSON.stringify(stock_trades)
  if (option_trades !== undefined)
    option_trades = JSON.stringify(option_trades)

  if (!status && !(status.toUpperCase() === "OPEN" || status.toUpperCase() === "CLOSED")) {
    return res.status(400).json({
      error: `Incorrect value ${status.toUpperCase()} in status: Status can only be OPEN or CLOSED`,
    });
  }

  // Build the query string to update the trade
  let updateFields = [];
  let updateValues = [];

  if (strategyname !== undefined) {
    updateFields.push("name");
    updateValues.push(strategyname.toUpperCase());
  }
  if (status !== undefined) {
    updateFields.push("status");
    updateValues.push(status.toUpperCase());
  }
  if (description !== undefined) {
    updateFields.push("description");
    updateValues.push(description);
  }
  if (stock_trades !== undefined) {
    updateFields.push("stock_trades");
    updateValues.push(stock_trades);
  }
  if (option_trades !== undefined) {
    updateFields.push("option_trades");
    updateValues.push(option_trades);
  }


  const sqlQuery = `
            UPDATE strategies
            SET ${updateFields.map((field) => `${field} = ?`).join(", ")}
            WHERE id = ?
        `;
  updateValues.push(id);
  try {
    // Execute the query
    const result = db.execute(sqlQuery, updateValues, (err, results) => {
      if (err) {
        console.error("Error updating Strategy:", err);
        return res.status(500).json(err);
      }
      if (results.affectedRows == 0) {
        return res.status(404).json({ message: "Strategy not found" });
      }
      if (results.affectedRows == 1) {
        console.log({ message: "Strategy updated successfully" })
        return res.status(200).json({ message: "Strategy updated successfully" });
      }
      res.status(500).json({ error: "Unable to update Strategy: " + name });
    });
  } catch (error) {
    console.error("Error updating Strategy:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.deleteStrategy = (req, res) => {
  const { id } = req.query;

  try {
    db.query(
      "Delete FROM strategies WHERE id = ?",
      [id],
      (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.affectedRows == 1) return res.status(204).json({});
        else
          return res.status(500).json({
            error: `No record available to delete with id:${id}`,
          });
      }
    );
  } catch (error) {
    console.error("Error deleting Strategy:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
