const db = require("../db");

exports.createStrategy = (req, res) => {
  let { name, description, created_at, stock_trades, option_trades, status } = req.body;
  if (
    !name) {
    return res.status(400).json({
      error:
        "Missing required fields: name",
    });
  }
  if (
    !status) {
    return res.status(400).json({
      error:
        "Missing required fields: status",
    });
  }
  if (created_at === undefined)
    created_at = new Date();
  if (stock_trades !== undefined)
    stock_trades = JSON.stringify(stock_trades)
  if (option_trades !== undefined)
    option_trades = JSON.stringify(option_trades)

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
      const sql = "INSERT INTO strategies (name, description, stock_trades, option_trades, created_at) VALUES (?, ?, ?,?,?)";
      db.query(
        sql,
        [name.toUpperCase(), description, stock_trades, option_trades, created_at],
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
  let { name, id } = req.query;
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
    if (name == undefined)
      name = ""
    let query = `SELECT * FROM strategies  
                WHERE LOWER(name) LIKE    
                  CASE  
                      WHEN ? = '' THEN '%'  
                      ELSE LOWER(CONCAT('%', ?, '%'))  
                  END;`
    db.query(query, [name, name], (err, results) => {
      if (err) return res.status(500).json(err);
      console.log(results)
      res.status(200).json(results);
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

  if (!(status.toUpperCase() === "OPEN" || status.toUpperCase() === "CLOSED")) {
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
      if (err) return res.status(500).json(err);
      if (results.affectedRows == 0) {
        return res.status(404).json({ message: "Strategy not found" });
      }
      if (results.affectedRows == 1) {
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
