const db = require("../db");

exports.createActionItem = async (req, res) => {
  const { description, status, created_by, asset, stock_trade_id, option_trade_id } = req.body;
  try {
    if (!(status.toUpperCase() === "TODO" || status.toUpperCase() === "COMPLETED")) {
      return res.status(400).json({
        "message": "Invalid Status: " + status.toUpperCase() + ". Status can only be TODO and COMPLETED."
      });
    }

    if (created_by && !(created_by.toUpperCase() === "MANUAL" || created_by.toUpperCase() === "AUTOMATIC")) {
      return res.status(400).json({
        "message": "Invalid created_by: " + created_by.toUpperCase() + ". created_by can only be MANUAL or AUTOMATIC."
      });
    }

    if (stock_trade_id && option_trade_id) {
      return res.status(400).json({
        "message": "An action item can only be linked to either a stock trade or an option trade, not both."
      });
    }

    // Verify trade exists if ID is provided
    if (stock_trade_id) {
      const [stockTrade] = await db.pool.query(
        "SELECT tradeid FROM stock_trades WHERE tradeid = ?",
        [stock_trade_id]
      );
      if (!stockTrade.length) {
        return res.status(404).json({
          "message": "Stock trade not found with ID: " + stock_trade_id
        });
      }
    }

    if (option_trade_id) {
      const [optionTrade] = await db.pool.query(
        "SELECT tradeid FROM option_trades WHERE tradeid = ?",
        [option_trade_id]
      );
      if (!optionTrade.length) {
        return res.status(404).json({
          "message": "Option trade not found with ID: " + option_trade_id
        });
      }
    }

    const sql = "INSERT INTO action_items (description, status, created_by, asset, stock_trade_id, option_trade_id) VALUES (?, ?, ?, ?, ?, ?)";
    const [result] = await db.pool.query(sql, [
      description,
      status.toUpperCase(),
      (created_by || "Manual").toUpperCase(),
      asset || null,
      stock_trade_id || null,
      option_trade_id || null
    ]);

    if (result.affectedRows === 1) {
      return res.status(201).json({ message: "Action Item added successfully!" });
    }

    res.status(500).json({
      error: "Unable to Create new Action Item: " + description
    });
  } catch (error) {
    console.error("Error creating action item:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

exports.getActionItems = async (req, res) => {
  try {
    const { status, stock_trade_id, option_trade_id } = req.query;

    // Check if at least one filter parameter is provided
    if (!status && !stock_trade_id && !option_trade_id) {
      return res.status(400).json({
        message: "At least one filter parameter is required: status, stock_trade_id, or option_trade_id"
      });
    }

    let query = `SELECT * FROM action_items WHERE 1=1`;
    const queryParams = [];

    if (status) {
      if (!(status.toUpperCase() === "TODO" || status.toUpperCase() === "COMPLETED")) {
        return res.status(400).json({
          message: "Invalid Status: " + status.toUpperCase() + ". Status can only be TODO or COMPLETED."
        });
      }
      query += ` AND status = ?`;
      queryParams.push(status.toUpperCase());
    }

    if (stock_trade_id) {
      query += ` AND stock_trade_id = ?`;
      queryParams.push(stock_trade_id);
    }

    if (option_trade_id) {
      query += ` AND option_trade_id = ?`;
      queryParams.push(option_trade_id);
    }

    const [results] = await db.pool.query(query, queryParams);
    console.log('Action items:', results);
    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching action items:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

exports.updateActionItem = async (req, res) => {
  try {
    const { id } = req.params;
    let status = req.body.status;
    let description = req.body.description;
    let created_by = req.body.created_by;
    let asset = req.body.asset;
    let stock_trade_id = req.body.stock_trade_id;
    let option_trade_id = req.body.option_trade_id;

    // Build the query string to update the item
    let updateFields = [];
    let updateValues = [];

    if (description === undefined && status === undefined && created_by === undefined &&
      asset === undefined && stock_trade_id === undefined && option_trade_id === undefined) {
      return res.status(400).json({
        "message": "No Fields passed to update the item: Add status, description, created_by, asset, stock_trade_id, or option_trade_id."
      });
    }

    if (stock_trade_id !== undefined && option_trade_id !== undefined) {
      return res.status(400).json({
        "message": "An action item can only be linked to either a stock trade or an option trade, not both."
      });
    }

    if (stock_trade_id !== undefined) {
      const [stockTrade] = await db.pool.query(
        "SELECT tradeid FROM stock_trades WHERE tradeid = ?",
        [stock_trade_id]
      );
      if (!stockTrade.length) {
        return res.status(404).json({
          "message": "Stock trade not found with ID: " + stock_trade_id
        });
      }
      updateFields.push("stock_trade_id");
      updateValues.push(stock_trade_id);
      // Clear option_trade_id if setting stock_trade_id
      updateFields.push("option_trade_id");
      updateValues.push(null);
    }

    if (option_trade_id !== undefined) {
      const [optionTrade] = await db.pool.query(
        "SELECT tradeid FROM option_trades WHERE tradeid = ?",
        [option_trade_id]
      );
      if (!optionTrade.length) {
        return res.status(404).json({
          "message": "Option trade not found with ID: " + option_trade_id
        });
      }
      updateFields.push("option_trade_id");
      updateValues.push(option_trade_id);
      // Clear stock_trade_id if setting option_trade_id
      updateFields.push("stock_trade_id");
      updateValues.push(null);
    }

    if (description !== undefined) {
      updateFields.push("description");
      updateValues.push(description);
    }

    if (status !== undefined) {
      if (!(status.toUpperCase() === "TODO" || status.toUpperCase() === "COMPLETED")) {
        return res.status(400).json({
          "message": "Invalid Status: " + status.toUpperCase() + ". Status can only be TODO and COMPLETED."
        });
      }
      updateFields.push("status");
      updateValues.push(status.toUpperCase());
    }

    if (created_by !== undefined) {
      if (!(created_by.toUpperCase() === "MANUAL" || created_by.toUpperCase() === "AUTOMATIC")) {
        return res.status(400).json({
          "message": "Invalid created_by: " + created_by.toUpperCase() + ". created_by can only be MANUAL or AUTOMATIC."
        });
      }
      updateFields.push("created_by");
      updateValues.push(created_by.toUpperCase());
    }

    if (asset !== undefined) {
      updateFields.push("asset");
      updateValues.push(asset);
    }

    const sqlQuery = `
      UPDATE action_items
      SET ${updateFields.map((field) => `${field} = ?`).join(", ")}
      WHERE id = ?
    `;
    updateValues.push(id);
    console.log('Update query:', sqlQuery, updateValues);

    const [result] = await db.pool.query(sqlQuery, updateValues);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Item Not Found" });
    }

    if (result.affectedRows === 1) {
      return res.status(200).json({ message: "Item updated successfully" });
    }

    res.status(500).json({ error: "Unable to update Item: " + id });
  } catch (error) {
    console.error("Error updating item:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.pool.query(
      "DELETE FROM action_items WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 1) {
      return res.status(204).json({});
    }

    return res.status(404).json({
      error: `No record available to delete with id: ${id}`
    });
  } catch (error) {
    console.error("Error deleting item:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};
