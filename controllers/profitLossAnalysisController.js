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

exports.updateEntry = (req, res) => {
  const entrydate = req.query.date;

  const {
    date,
    stocks_realised,
    stocks_unrealised,
    fo_realised,
    fo_unrealised,
  } = req.body;
  // Build the query string to update the trade
  let updateFields = [];
  let updateValues = [];

  if (stocks_realised == undefined) {
    return res.status(500).json({
      status: "fail",
      error: `stocks_realised : attribute is mandatory`,
    });
  }

  if (stocks_unrealised == undefined) {
    return res.status(500).json({
      status: "fail",
      error: `stocks_unrealised : attribute is mandatory`,
    });
  }

  if (fo_realised == undefined) {
    return res.status(500).json({
      status: "fail",
      error: `fo_realised : attribute is mandatory`,
    });
  }

  if (fo_unrealised == undefined) {
    return res.status(500).json({
      status: "fail",
      error: `fo_unrealised : attribute is mandatory`,
    });
  }
  let erroroccured = false;
  if (entrydate == undefined) {
    return res.status(500).json({
      status: "fail",
      error: `date param is required`,
    });
  }

  db.query(
    "SELECT * FROM profit_loss_report WHERE date = ?",
    [entrydate],
    (err, results) => {
      if (err) {
        erroroccured = true
        return res.status(500).json(err);
      }
      if (results.length === 0) {
        erroroccured = true
        return res
          .status(404)
          .json({ error: "No existing entry for date: " + entrydate });
      }

      // Always update asset and trade_type
      updateFields.push(
        "date",
        "stocks_realised",
        "stocks_unrealised",
        "fo_realised",
        "fo_unrealised",
        "stock_pl",
        "fo_pl",
        "total_pl"
      );
      updateValues.push(
        date,
        Number(stocks_realised),
        Number(stocks_unrealised),
        Number(fo_realised),
        Number(fo_unrealised),
        Number(stocks_realised) + Number(stocks_unrealised),
        Number(fo_realised) + Number(fo_unrealised),
        Number(stocks_realised) + Number(stocks_unrealised) + Number(fo_realised) + Number(fo_unrealised)
      );

      console.log(updateValues)
      const sqlQuery = `
            UPDATE profit_loss_report
            SET ${updateFields.map((field) => `${field} = ?`).join(", ")}
            WHERE date = ?
        `;
      updateValues.push(entrydate);
      try {
        db.execute(sqlQuery, updateValues, (err, results) => {
          if (err) return res.status(500).json(err);
          if (results.affectedRows == 1) {
            return res.status(200).json({ message: "Entry updated successfully" });
          }
          res
            .status(500)
            .json({ error: `Unable to update entry:  + ${entrydate}` });
        });
      } catch (error) {
        console.error("Error updating entry:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );



};
