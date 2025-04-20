const db = require("../db");
const moment = require("moment");

exports.createEntry = async (req, res) => {
  const {
    date,
    stocks_realised,
    stocks_unrealised,
    fo_realised,
    fo_unrealised,
  } = req.body;

  try {
    // Check if entry exists
    const [existingEntries] = await db.pool.query(
      "SELECT * FROM profit_loss_report WHERE date = ?",
      [date]
    );

    if (existingEntries.length === 1) {
      return res.status(500).json({
        message: "Entry is already present for the selected date: " + date,
      });
    }

    // Insert new entry
    const [result] = await db.pool.query(
      "INSERT INTO profit_loss_report (date, stocks_realised, stocks_unrealised, fo_realised, fo_unrealised, stock_pl, fo_pl, total_pl) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        date,
        Number(stocks_realised),
        Number(stocks_unrealised),
        Number(fo_realised),
        Number(fo_unrealised),
        Number(stocks_realised) + Number(stocks_unrealised),
        Number(fo_realised) + Number(fo_unrealised),
        Number(stocks_realised) + Number(stocks_unrealised) + Number(fo_realised) + Number(fo_unrealised),
      ]
    );

    res.status(201).json({ message: "New entry added successfully!" });
  } catch (error) {
    console.error("Error creating Entry:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getAllEntries = async (req, res) => {
  try {
    const [results] = await db.pool.query(
      "SELECT * FROM profit_loss_report ORDER BY date DESC"
    );

    const formattedResults = results.map(result => ({
      ...result,
      date: moment(result.date).format("YYYY-MM-DD")
    }));

    res.json(formattedResults);
  } catch (error) {
    console.error("Error fetching all entries:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getEntry = async (req, res) => {
  const { date, startdate, enddate } = req.query;

  try {
    if (date) {
      const [results] = await db.pool.query(
        "SELECT * FROM profit_loss_report WHERE date = ?",
        [date]
      );

      if (results.length === 0) {
        return res.status(404).json({
          message: "Entry not found for date: " + date
        });
      }

      const formattedResults = results.map(result => ({
        ...result,
        date: moment(result.date).format("YYYY-MM-DD")
      }));

      res.status(200).json(formattedResults);
    } else {
      console.log("Range date:", startdate, enddate);

      const [results] = await db.pool.query(
        "SELECT * FROM profit_loss_report WHERE date >= ? AND date <= ? ORDER BY date DESC",
        [startdate, enddate]
      );

      if (results.length === 0) {
        return res.status(200).json({
          message: `No Data Found in Date Range: ${startdate} - ${enddate}`
        });
      }

      const formattedResults = results.map(result => ({
        ...result,
        date: moment(result.date).format("YYYY-MM-DD")
      }));

      res.status(200).json(formattedResults);
    }
  } catch (error) {
    console.error("Error fetching Entry:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.deleteEntry = (req, res) => {
  const { date } = req.query;

  try {
    db.query(
      "Delete FROM profit_loss_report WHERE date = ?",
      [date],
      (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.affectedRows == 1) return res.status(204).json({});
        else
          return res.status(500).json({
            error: `No record available to delete with date:${date}`,
          });
      }
    );
  } catch (error) {
    console.error("Error deleting P/L Entry:", error);
    res.status(500).json({ message: "Internal server error: " + error });
  }
};

exports.updateEntry = async (req, res) => {
  const entrydate = req.query.date;
  const {
    date,
    stocks_realised,
    stocks_unrealised,
    fo_realised,
    fo_unrealised,
  } = req.body;

  if (!entrydate) {
    return res.status(400).json({
      status: "fail",
      error: "date param is required",
    });
  }

  try {
    // Check if entry exists
    const [existingEntry] = await db.pool.query(
      "SELECT * FROM profit_loss_report WHERE date = ?",
      [entrydate]
    );

    if (existingEntry.length === 0) {
      return res.status(404).json({
        error: `No existing entry for date: ${entrydate}`
      });
    }

    // Build update fields and values
    const updateFields = [
      "date",
      "stocks_realised",
      "stocks_unrealised",
      "fo_realised",
      "fo_unrealised",
      "stock_pl",
      "fo_pl",
      "total_pl"
    ];

    const updateValues = [
      date,
      Number(stocks_realised),
      Number(stocks_unrealised),
      Number(fo_realised),
      Number(fo_unrealised),
      Number(stocks_realised) + Number(stocks_unrealised),
      Number(fo_realised) + Number(fo_unrealised),
      Number(stocks_realised) + Number(stocks_unrealised) + Number(fo_realised) + Number(fo_unrealised)
    ];

    const sqlQuery = `
      UPDATE profit_loss_report
      SET ${updateFields.map(field => `${field} = ?`).join(", ")}
      WHERE date = ?
    `;
    updateValues.push(entrydate);

    const [result] = await db.pool.query(sqlQuery, updateValues);

    if (result.affectedRows === 1) {
      return res.status(200).json({ message: "Entry updated successfully" });
    }

    return res.status(500).json({
      error: `Unable to update entry: ${entrydate}`
    });
  } catch (error) {
    console.error("Error updating entry:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};

exports.getLastEntryDate = async (req, res) => {
  try {
    const [result] = await db.pool.query(
      "SELECT MAX(date) as last_date FROM profit_loss_report"
    );

    if (!result[0].last_date) {
      // If no entries exist, return a date 7 days ago as default
      const defaultDate = moment().subtract(7, 'days').format('YYYY-MM-DD');
      return res.json({ last_date: defaultDate });
    }

    res.json({ last_date: moment(result[0].last_date).format('YYYY-MM-DD') });
  } catch (error) {
    console.error("Error fetching last entry date:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
