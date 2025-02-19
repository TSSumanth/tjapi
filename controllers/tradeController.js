const db = require("../db");
const moment = require("moment");

exports.createStockTrade = (req, res) => {
  const {
    asset,
    quantity,
    ordertype,
    entryprice,
    entrydate,
    openquantiry,
    closedquantiry,
    exitaverageprice,
    finalexitprice,
    status,
    overallreturn,
    exitdate,
    lastmodifieddate,
  } = req.body;

  // Validate mandatory fields
  if (
    !asset ||
    !ordertype ||
    !quantity ||
    !entryprice ||
    !entrydate ||
    !openquantiry ||
    !status
  ) {
    return res.status(400).json({
      error:
        "Missing required fields: asset, ordertype, quantity, price, date, tradeid",
    });
  }
  if (!(status.toUpperCase() === "OPEN" || status.toUpperCase() === "CLOSED")) {
    return res.status(400).json({
      error: `Incorrect value ${status.toUpperCase()} in status: status can only be OPEN or CLOSED`,
    });
  }
  let notes,
    tags = "";
  if (req.body.notes !== undefined) notes = req.body.notes;
  if (req.body.tags !== undefined) tags = req.body.tags;
  if (req.body.capitalused !== undefined) capitalused = quantity * entryprice;
  if (req.body.closedquantiry !== undefined) closedquantiry = quantity - openquantiry;
  if (req.body.exitaverageprice !== undefined) exitaverageprice = 0;
  if (req.body.finalexitprice !== undefined) finalexitprice = 0;
  if (req.body.tags !== undefined) tags = req.body.tags;
  try {
    const sql =
      "INSERT INTO stock_trades (asset, ordertype, quantity, price, date, tradeid, notes, tags) VALUES (?, ?, ?, ?, ?,?,?,?)";
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
