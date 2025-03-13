const db = require("../db");

exports.createActionItem = (req, res) => {
  const { description, status } = req.body;
  if (!(status.toUpperCase() === "TODO" || status.toUpperCase() === "COMPLETED")) {
    return res.status(500).json({
      "message": "Invalid Status: " + status.toUpperCase() + ". Status can only be TODO and COMPLETED."
    });
  }
  const sql = "INSERT INTO action_items (description, status) VALUES (?, ?)";
  db.query(
    sql,
    [description, status.toUpperCase()],
    (err1, result1) => {
      if (err1) {
        console.log(err1)
        return res.status(500).json(err1);
      }
      if (result1.affectedRows == 1)
        return res.status(201).json({ message: "Action Item added successfully!" });
      res.status(500).json({
        error: "Unable to Create new Action Item: " + description,
      });
    }
  );
};

exports.getActiveActionItems = (req, res) => {
  let query = `SELECT * FROM action_items  
                WHERE status = "TODO"`
  db.query(query, (err, results) => {
    if (err) return res.status(500).json(err);
    console.log(results)
    res.status(200).json(results);
  });

};


exports.updateActionItem = (req, res) => {
  const { id } = req.params;
  let status = req.body.status;
  let description = req.body.description;

  // Build the query string to update the trade
  let updateFields = [];
  let updateValues = [];

  if(description === undefined && status === undefined)
    return res.status(500).json({
      "message": "No Fields passed to update the item: Add status or deescription."
    });

  if (description !== undefined) {
    updateFields.push("description")
    updateValues.push(description);
  }

  if (status !== undefined) {
    if (!(status.toUpperCase() === "TODO" || status.toUpperCase() === "COMPLETED")) {
      return res.status(500).json({
        "message": "Invalid Status: " + status.toUpperCase() + ". Status can only be TODO and COMPLETED."
      });
    }
    updateFields.push("status")
    updateValues.push(status.toUpperCase());
  }

  const sqlQuery = `
            UPDATE action_items
            SET ${updateFields.map((field) => `${field} = ?`).join(", ")}
            WHERE id = ?
        `;
  updateValues.push(id);
  console.log(sqlQuery)
  try {
    // Execute the query
    const result = db.execute(sqlQuery, updateValues, (err, results) => {
      if (err) return res.status(500).json(err);
      if (results.affectedRows == 0) {
        return res.status(404).json({ message: "Item Not Found" });
      }
      if (results.affectedRows == 1) {
        return res.status(200).json({ message: "Item updated successfully" });
      }
      res.status(500).json({ error: "Unable to update Item: " + id });
    });
  } catch (error) {
    console.error("Error updating item:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.deleteItem = (req, res) => {
  const { id } = req.params;

  try {
    db.query(
      "Delete FROM action_items WHERE id = ?",
      [id],
      (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.affectedRows == 1) return res.status(204).json({});
        else
          return res.status(500).json({
            error: `No record available to delete with id: ${id}`,
          });
      }
    );
  } catch (error) {
    console.error("Error deleting Analysis:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
