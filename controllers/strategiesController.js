const db = require("../db");
const moment = require("moment");

exports.createStrategy = async (req, res) => {
  let { name, description, created_at, stock_trades, option_trades, status, symbol, symbol_ltp, realized_pl, unrealized_pl } = req.body;

  if (!name) {
    return res.status(400).json({
      error: "Missing required fields: name"
    });
  }
  if (!status) {
    return res.status(400).json({
      error: "Missing required fields: status"
    });
  }
  if (!symbol) {
    return res.status(400).json({
      error: "Missing required fields: symbol"
    });
  }

  if (!(status.toUpperCase() === "OPEN" || status.toUpperCase() === "CLOSE")) {
    return res.status(400).json({
      error: `Incorrect value ${status.toUpperCase()} in status: Status can only be OPEN or CLOSE`
    });
  }

  try {
    // Check for duplicate strategy name
    const [existingStrategies] = await db.pool.query(
      "SELECT name FROM strategies WHERE name = ?",
      [name.toUpperCase()]
    );

    if (existingStrategies.length > 0) {
      return res.status(500).json({ message: "Duplicate strategy name not allowed!" });
    }

    // Set default values
    if (created_at === undefined) created_at = new Date();
    if (stock_trades === undefined || stock_trades === null) stock_trades = JSON.stringify([]);
    if (option_trades === undefined || option_trades === null) option_trades = JSON.stringify([]);
    if (realized_pl === undefined || realized_pl === null) realized_pl = 0.00;
    if (unrealized_pl === undefined || unrealized_pl === null) unrealized_pl = 0.00;
    if (symbol_ltp === undefined || symbol_ltp === null) symbol_ltp = 0.00;

    // Insert new strategy
    const [result] = await db.pool.query(
      "INSERT INTO strategies (name, description, status, stock_trades, option_trades, created_at, symbol, symbol_ltp, realized_pl, unrealized_pl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [name.toUpperCase(), description, status.toUpperCase(), stock_trades, option_trades, created_at, symbol, symbol_ltp, realized_pl, unrealized_pl]
    );

    if (result.affectedRows === 1) {
      const [newRecord] = await db.pool.query(
        "SELECT * FROM strategies WHERE id = ?",
        [result.insertId]
      );
      return res.status(201).json(newRecord[0]);
    }

    return res.status(500).json({
      error: "Unable to Create new strategy: " + name.toUpperCase()
    });
  } catch (error) {
    console.error("Error creating strategy:", error);
    return res.status(500).json(error);
  }
};

exports.getStrategies = async (req, res) => {
  try {
    let { name, id, status, createdafter, createdbefore } = req.query;

    if (id !== undefined) {
      console.log('Fetching strategy with ID:', id);
      const [results] = await db.pool.query("SELECT * FROM strategies WHERE id = ?", [id]);
      console.log('Raw database results:', results);

      if (results.length === 0) {
        return res.status(404).json({ message: "Strategy not found: " + id });
      }

      // Fetch notes for the strategy
      const [notes] = await db.pool.query(
        "SELECT * FROM strategy_notes WHERE strategy_id = ? ORDER BY created_at DESC",
        [id]
      );

      const formattedNotes = notes.map(note => ({
        ...note,
        created_at: moment(note.created_at).format("YYYY-MM-DD HH:mm:ss")
      }));

      return res.status(200).json({ ...results[0], notes: formattedNotes });
    }

    let params = [];
    let query = "SELECT * FROM strategies WHERE 1=1";

    if (name) {
      query += ` AND name REGEXP ?`;
      params.push(name);
    }
    if (req.query.symbol) {
      query += " AND symbol = ?";
      params.push(req.query.symbol);
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

    const [results] = await db.pool.query(query, params);
    return res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching strategies:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateStrategy = async (req, res) => {
  const { id } = req.query;
  let { name, description, stock_trades, option_trades, status, symbol, symbol_ltp, realized_pl, unrealized_pl } = req.body;

  try {
    if (status && !(status.toUpperCase() === "OPEN" || status.toUpperCase() === "CLOSE")) {
      return res.status(400).json({
        error: `Incorrect value ${status.toUpperCase()} in status: Status can only be OPEN or CLOSED`
      });
    }

    // Build the query string to update the strategy
    let updateFields = [];
    let updateValues = [];

    if (name !== undefined) {
      updateFields.push("name");
      updateValues.push(name.toUpperCase());
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
      // Only stringify if it's not already a string
      updateValues.push(typeof stock_trades === 'string' ? stock_trades : JSON.stringify(stock_trades));
    }
    if (option_trades !== undefined) {
      updateFields.push("option_trades");
      // Only stringify if it's not already a string
      updateValues.push(typeof option_trades === 'string' ? option_trades : JSON.stringify(option_trades));
    }
    if (symbol !== undefined) {
      updateFields.push("symbol");
      updateValues.push(symbol);
    }
    if (symbol_ltp !== undefined) {
      updateFields.push("symbol_ltp");
      updateValues.push(parseFloat(symbol_ltp).toFixed(2));
    }
    if (realized_pl !== undefined) {
      updateFields.push("realized_pl");
      updateValues.push(parseFloat(realized_pl).toFixed(2));
    }
    if (unrealized_pl !== undefined) {
      updateFields.push("unrealized_pl");
      updateValues.push(parseFloat(unrealized_pl).toFixed(2));
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const sqlQuery = `
      UPDATE strategies
      SET ${updateFields.map(field => `${field} = ?`).join(", ")}
      WHERE id = ?
    `;
    updateValues.push(id);

    const [result] = await db.pool.query(sqlQuery, updateValues);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Strategy not found" });
    }

    // Fetch and return the updated strategy
    const [updatedStrategy] = await db.pool.query(
      "SELECT * FROM strategies WHERE id = ?",
      [id]
    );

    return res.status(200).json(updatedStrategy[0]);
  } catch (error) {
    console.error("Error updating Strategy:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.deleteStrategy = async (req, res) => {
  const { id } = req.query;

  try {
    const [result] = await db.pool.query(
      "DELETE FROM strategies WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 1) {
      return res.status(200).json({ message: "Strategy deleted successfully" });
    }

    return res.status(404).json({
      error: `No record available to delete with id:${id}`
    });
  } catch (error) {
    console.error("Error deleting Strategy:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
