const db = require("../db");

exports.createActionItem = async (req, res) => {
  const { description, status } = req.body;
  try {
    if (!(status.toUpperCase() === "TODO" || status.toUpperCase() === "COMPLETED")) {
      return res.status(400).json({
        "message": "Invalid Status: " + status.toUpperCase() + ". Status can only be TODO and COMPLETED."
      });
    }

    const sql = "INSERT INTO action_items (description, status) VALUES (?, ?)";
    const [result] = await db.pool.query(sql, [description, status.toUpperCase()]);

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

exports.getActiveActionItems = async (req, res) => {
  try {
    const query = `SELECT * FROM action_items WHERE status = "TODO"`;
    const [results] = await db.pool.query(query);
    console.log('Active action items:', results);
    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching active action items:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

exports.updateActionItem = async (req, res) => {
  try {
    const { id } = req.params;
    let status = req.body.status;
    let description = req.body.description;

    // Build the query string to update the item
    let updateFields = [];
    let updateValues = [];

    if (description === undefined && status === undefined) {
      return res.status(400).json({
        "message": "No Fields passed to update the item: Add status or description."
      });
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
