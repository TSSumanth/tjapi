const db = require("../db");
const moment = require("moment");


exports.addHoliday = async (req, res) => {
  const { name, description, date, priority } = req.body;

  try {
    if (!(priority.toUpperCase() === "HIGH" || priority.toUpperCase() === "MEDIUM" || priority.toUpperCase() === "LOW")) {
      return res.status(400).json({
        "message": "Invalid Priority: " + priority.toUpperCase() + ". Priority can only be HIGH, MEDIUM or LOW."
      });
    }
    const [result] = await db.pool.query('INSERT INTO holidays (name, description, date, priority) VALUES (?, ?, ?, ?)', [name, description, date, priority]);

    res.status(201).json({ message: "Holiday added successfully!" });
  } catch (err) {
    console.error("Error adding Holiday:", err);
    res.status(500).json({ error: "Failed to add Holiday" });
  }
};

exports.updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, date, priority } = req.body;

    // Build the query string to update the order
    let updateFields = [];
    let updateValues = [];

    if (name === undefined && description === undefined && date === undefined && priority === undefined) {
      return res.status(400).json({
        "message": "No Fields passed to update the item: Add name, description, date or priority."
      });
    }

    if (name !== undefined) {
      updateFields.push("name");
      updateValues.push(name);
    }

    if (description !== undefined) {
      updateFields.push("description");
      updateValues.push(description);
    }

    if (date !== undefined) {
      updateFields.push("date");
      updateValues.push(date);
    }

    if (name !== undefined) {
      updateFields.push("name");
      updateValues.push(name);
    }

    if (priority !== undefined) {
      if (!(priority.toUpperCase() === "HIGH" || priority.toUpperCase() === "MEDIUM" || priority.toUpperCase() === "LOW")) {
        return res.status(400).json({
          "message": "Invalid priority: " + priority.toUpperCase() + ". priority can only be HIGH, MEDIUM or LOW."
        });
      }
      updateFields.push("priority");
      updateValues.push(priority.toUpperCase());
    }

    const sqlQuery = `
    UPDATE holidays
    SET ${updateFields.map((field) => `${field} = ?`).join(", ")}
    WHERE id = ?
  `;
    updateValues.push(id);
    console.log('Update query:', sqlQuery, updateValues);

    const [result] = await db.pool.query(sqlQuery, updateValues);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Holiday not found" });
    }

    // Fetch and return the updated strategy
    const [updatedHoliday] = await db.pool.query(
      "SELECT * FROM holidays WHERE id = ?",
      [id]
    );

    return res.status(200).json(updatedHoliday[0]);
  } catch (error) {
    console.error("Error updating Holiday:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.deleteHoliday = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.pool.query(
      "DELETE FROM holidays WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 1) {
      return res.status(204).json({});
    }

    return res.status(404).json({
      error: `No record available to delete with id:${id}`
    });
  } catch (error) {
    console.error("Error deleting Holiday:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getHolidays = async (req, res) => {
  const { startDate, endDate, financialYear, month, year, name } = req.query;
  let query = 'SELECT * FROM holidays WHERE ';
  let conditions = [];
  let params = [];

  if (startDate && endDate) {
    // Convert the dates to YYYY-MM-DD format
    const formattedStartDate = moment(startDate).format('YYYY-MM-DD');
    const formattedEndDate = moment(endDate).format('YYYY-MM-DD');
    conditions.push('date BETWEEN ? AND ?');
    params.push(formattedStartDate, formattedEndDate);
  } else if (financialYear) {
    const [start, end] = financialYear.split('-');
    const startFY = `${start}-04-01`;
    const endFY = `${end}-03-31`;
    conditions.push('date BETWEEN ? AND ?');
    params.push(startFY, endFY);
  } else if (month && year) {
    conditions.push('MONTH(date) = ? AND YEAR(date) = ?');
    params.push(month, year);
  }

  if (name) {
    conditions.push('name LIKE ?');
    params.push(`%${name}%`);
  }

  try {
    const [results] = await db.pool.query(
      conditions.length > 0 ? query + conditions.join(' AND ') : 'SELECT * FROM holidays',
      params
    );

    const formatted = results.map(row => ({
      ...row,
      date: formatDate(row.date),
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    console.error("Error fetching holidays:", error);
    return res.status(500).json({ message: "Internal server error" });
  }

  // Helper function to format MySQL date
  function formatDate(mysqlDate) {
    const date = new Date(mysqlDate);
    const offset = date.getTimezoneOffset();
    const adjustedDate = new Date(date.getTime() - offset * 60 * 1000);
    return adjustedDate.toISOString().split('T')[0]; // "YYYY-MM-DD"
  }
};
