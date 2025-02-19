const db = require("../db");
const moment = require("moment");

exports.createStockOrder = (req, res) => {
  const { asset, ordertype, quantity, price, date, tradeid } = req.body;
  let notes,
    tags = "";
  // Validate mandatory fields
  if (!asset || !ordertype || !quantity || !price || !date || !tradeid) {
    return res.status(400).json({
      error:
        "Missing required fields: asset, ordertype, quantity, price, date, tradeid",
    });
  }
  if (! (ordertype.toUpperCase() === "BUY" || ordertype.toUpperCase() === "SELL")) {
    return res.status(400).json({
      error: `Incorrect value ${ordertype.toUpperCase()} in ordertype: OrderType can only be BUY or SELL`,
    });
  }

  if (req.body.notes !== undefined) notes = req.body.notes;
  if (req.body.tags !== undefined) tags = req.body.tags;
  try {
    const sql =
      "INSERT INTO stock_orders (asset, ordertype, quantity, price, date, tradeid, notes, tags) VALUES (?, ?, ?, ?, ?,?,?,?)";
    db.query(
      sql,
      [asset, ordertype, quantity, price, date, tradeid, notes, tags],
      (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.affectedRows === 1)
          return res
            .status(201)
            .json({ message: "New order added successfully!" });
        res.status(500).json({ message: "Internal server error" });
      }
    );
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getStockOrders = (req, res) => {
  let { id, asset, ordertype, startDate, endDate, tradeid, tags } = req.query;
  let params = [];
  let query = "SELECT * FROM stock_orders WHERE 1=1";
  if (id !== undefined)
    query = `SELECT * FROM stock_orders where id = ${id}`; // if id is passed all other params are ignored
  else {
    if (asset) {
      if (Array.isArray(asset)) {
        // to handle multiple stocks
        query += ` AND asset REGEXP ?`;
        params.push(asset.join("|"));
      } else {
        query += ` AND asset REGEXP ?`;
        params.push(asset);
      }
    }
    if (ordertype) {
      query += " AND ordertype = ?";
      params.push(ordertype.toUpperCase());
    }
    if (startDate) {
      query += " AND date >= ?";
      params.push(startDate);
    }
    if (endDate) {
      query += " AND date <= ?";
      params.push(endDate);
    }
    if (tradeid) {
      query += " AND tradeid = ?";
      params.push(tradeid);
    }
    if (tags) {
      if (Array.isArray(tags)) {
        // to handle multiple tags
        query += ` AND tags REGEXP ?`;
        params.push(tags.join("|")); // Convert array to REGEXP pattern
      } else {
        query += " AND tags REGEXP  ?";
        params.push(tags);
      }
    }
  }
  query += " ORDER BY date DESC";
  console.log(query);
  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json(err);
    const formattedresults = results.map((results) => ({
      ...results,
      date: moment(results.date).format("YYYY-MM-DD"), // Format to YYYY-MM-DD
    }));
    res.status(200).json(formattedresults);
  });
};

exports.deleteStockOrder = (req, res) => {
  const { id } = req.query;
  try {
    db.query("Delete FROM stock_orders WHERE id = ?", [id], (err, results) => {
      if (err) return res.status(500).json(err);
      if (results.affectedRows == 1) return res.status(204).json({});
      else
        return res.status(500).json({
          error: `No Stock Order available to delete with id:${id}`,
        });
    });
  } catch (error) {
    console.error("Error deleting Stock Order:", error);
    res.status(500).json({ message: "Internal server error: " + error });
  }
};

exports.updateStockOrder = (req, res) => {
  const { id } = req.query;
  if (id == undefined) {
    return res.status(500).json({
      status: "fail",
      error: `id param is required`,
    });
  }
  db.query("SELECT * FROM stock_orders WHERE id = ?", [id], (err, results) => {
    if (err) return res.status(500).json(err);
    if (results.length === 0) {
      return res.status(404).json({ error: "No Stock Order with id: " + id });
    }
  });
  const { asset, ordertype, quantity, price, date, tradeid, notes, tags } =
    req.body;
  // Build the query string to update the trade
  let updateFields = [];
  let updateValues = [];

  if (asset !== undefined) {
    updateFields.push("asset");
    updateValues.push(asset);
  }

  if (ordertype !== undefined) {
    updateFields.push("ordertype");
    updateValues.push(ordertype);
  }

  if (quantity !== undefined) {
    updateFields.push("quantity");
    updateValues.push(quantity);
  }

  if (price !== undefined) {
    updateFields.push("price");
    updateValues.push(price);
  }

  if (date !== undefined) {
    updateFields.push("date");
    updateValues.push(date);
  }

  if (tradeid !== undefined) {
    updateFields.push("tradeid");
    updateValues.push(tradeid);
  }

  if (notes !== undefined) {
    updateFields.push("notes");
    updateValues.push(notes);
  }

  if (tags !== undefined) {
    updateFields.push("tags");
    updateValues.push(tags);
  }

  const sqlQuery = `
            UPDATE stock_orders
            SET ${updateFields.map((field) => `${field} = ?`).join(", ")}
            WHERE id = ?
        `;
  updateValues.push(id);
  try {
    db.execute(sqlQuery, updateValues, (err, results) => {
      if (err) return res.status(500).json(err);
      console.log(results);
      if (results.affectedRows == 1) {
        return res.status(200).json({ message: "Order updated successfully" });
      }
      res.status(500).json({ error: `Unable to update Order:  + ${id}` });
    });
  } catch (error) {
    console.error("Error updating entry:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.createOptionOrder = (req, res) => {
  const { asset, ordertype, quantity, price, date, tradeid } = req.body;
  let notes = "",
    tags = "",
    lotsize = 0;

  // Validate mandatory fields
  if (!asset || !ordertype || !quantity || !price || !date || !tradeid) {
    return res.status(400).json({
      error:
        "Missing required fields: asset, ordertype, quantity, price, date, tradeid",
    });
  }
  if (! (ordertype.toUpperCase() === "BUY" || ordertype.toUpperCase() === "SELL")) {
    return res.status(400).json({
      error: `Incorrect value ${ordertype.toUpperCase()} in ordertype: OrderType can only be BUY or SELL`,
    });
  }

  if (req.body.notes !== undefined) notes = req.body.notes;
  if (req.body.tags !== undefined) tags = req.body.tags;
  if (req.body.lotsize !== undefined) lotsize = req.body.lotsize;
  try {
    const sql =
      "INSERT INTO option_orders (asset, ordertype, quantity, price, date, tradeid, notes, tags, lotsize) VALUES (?, ?, ?, ?, ?,?,?,?,?)";
    db.query(
      sql,
      [asset, ordertype, quantity, price, date, tradeid, notes, tags, lotsize],
      (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.affectedRows === 1)
          return res
            .status(201)
            .json({ message: "New order added successfully!" });
        res.status(500).json({ message: "Internal server error" });
      }
    );
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getOptionOrders = (req, res) => {
  let { id, asset, ordertype, startDate, endDate, tradeid, tags } = req.query;
  let params = [];
  let query = "SELECT * FROM option_orders WHERE 1=1";
  if (id !== undefined)
    query = `SELECT * FROM option_orders where id = ${id}`; // if id is passed all other params are ignored
  else {
    if (asset) {
      if (Array.isArray(asset)) {
        // to handle multiple stocks
        query += ` AND asset REGEXP ?`;
        params.push(asset.join("|"));
      } else {
        query += ` AND asset REGEXP ?`;
        params.push(asset);
      }
    }
    if (ordertype) {
      query += " AND ordertype = ?";
      params.push(ordertype.toUpperCase());
    }
    if (startDate) {
      query += " AND date >= ?";
      params.push(startDate);
    }
    if (endDate) {
      query += " AND date <= ?";
      params.push(endDate);
    }
    if (tradeid) {
      query += " AND tradeid = ?";
      params.push(tradeid);
    }
    if (tags) {
      if (Array.isArray(tags)) {
        // to handle multiple tags
        query += ` AND tags REGEXP ?`;
        params.push(tags.join("|")); // Convert array to REGEXP pattern
      } else {
        query += " AND tags REGEXP  ?";
        params.push(tags);
      }
    }
  }
  query += " ORDER BY date DESC";
  console.log(query);
  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json(err);
    const formattedresults = results.map((results) => ({
      ...results,
      date: moment(results.date).format("YYYY-MM-DD"), // Format to YYYY-MM-DD
    }));
    res.status(200).json(formattedresults);
  });
};


exports.deleteOptionOrder = (req, res) => {
  const { id } = req.query;
  try {
    db.query("Delete FROM option_orders WHERE id = ?", [id], (err, results) => {
      if (err) return res.status(500).json(err);
      if (results.affectedRows == 1) return res.status(204).json({});
      else
        return res.status(500).json({
          error: `No Option Order available to delete with id:${id}`,
        });
    });
  } catch (error) {
    console.error("Error deleting Option Order:", error);
    res.status(500).json({ message: "Internal server error: " + error });
  }
};

exports.updateOptionOrder = (req, res) => {
  const { id } = req.query;
  if (id == undefined) {
    return res.status(500).json({
      status: "fail",
      error: `id param is required`,
    });
  }
  db.query("SELECT * FROM option_orders WHERE id = ?", [id], (err, results) => {
    if (err) return res.status(500).json(err);
    if (results.length === 0) {
      return res.status(404).json({ error: "No Stock Order with id: " + id });
    }
  });
  const { asset, ordertype, quantity, price, date, tradeid, notes, tags, lotsize } =
    req.body;
  // Build the query string to update the trade
  let updateFields = [];
  let updateValues = [];

  if (asset !== undefined) {
    updateFields.push("asset");
    updateValues.push(asset);
  }

  if (ordertype !== undefined) {
    updateFields.push("ordertype");
    updateValues.push(ordertype);
  }

  if (quantity !== undefined) {
    updateFields.push("quantity");
    updateValues.push(quantity);
  }

  if (price !== undefined) {
    updateFields.push("price");
    updateValues.push(price);
  }

  if (date !== undefined) {
    updateFields.push("date");
    updateValues.push(date);
  }

  if (tradeid !== undefined) {
    updateFields.push("tradeid");
    updateValues.push(tradeid);
  }

  if (notes !== undefined) {
    updateFields.push("notes");
    updateValues.push(notes);
  }

  if (tags !== undefined) {
    updateFields.push("tags");
    updateValues.push(tags);
  }

  if (lotsize !== undefined) {
    updateFields.push("lotsize");
    updateValues.push(lotsize);
  }

  const sqlQuery = `
            UPDATE option_orders
            SET ${updateFields.map((field) => `${field} = ?`).join(", ")}
            WHERE id = ?
        `;
  updateValues.push(id);
  try {
    db.execute(sqlQuery, updateValues, (err, results) => {
      if (err) return res.status(500).json(err);
      console.log(results);
      if (results.affectedRows == 1) {
        return res.status(200).json({ message: "Order updated successfully" });
      }
      res.status(500).json({ error: `Unable to update Order:  + ${id}` });
    });
  } catch (error) {
    console.error("Error updating entry:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};