const db = require("../db");
const moment = require("moment");


exports.createStockTrade = (req, res) => {
  const {
    asset,
    quantity,
    tradetype,
    entryprice,
    entrydate,
    openquantity,
    status,
    tradeid
  } = req.body;

  // Validate mandatory fields
  if (
    !asset) {
    return res.status(400).json({
      error:
        "Missing required fields: asset",
    });
  }
  if (
    tradeid === undefined || tradeid === "") {
    return res.status(400).json({
      error:
        "Missing required fields: tradeid",
    });
  }
  if (
    !asset) {
    return res.status(400).json({
      error:
        "Missing required fields: asset",
    });
  }
  if (
    !tradetype) {
    return res.status(400).json({
      error:
        "Missing required fields: tradetype",
    });
  }
  if (
    !quantity) {
    return res.status(400).json({
      error:
        "Missing required fields: quantity",
    });
  }
  if (
    !entryprice) {
    return res.status(400).json({
      error:
        "Missing required fields: entryprice",
    });
  }
  if (
    !entrydate) {
    return res.status(400).json({
      error:
        "Missing required fields: entrydate",
    });
  }
  if (openquantity === undefined) {
    return res.status(400).json({
      error:
        "Missing required fields: openquantity",
    });
  }
  if (
    !status) {
    return res.status(400).json({
      error:
        "Missing required fields: status",
    });
  }
  if (!(status.toUpperCase() === "OPEN" || status.toUpperCase() === "CLOSED")) {
    return res.status(400).json({
      error: `Incorrect value ${status.toUpperCase()} in status: status can only be OPEN or CLOSED`,
    });
  }
  if (!(tradetype.toUpperCase() === "LONG" || tradetype.toUpperCase() === "SHORT")) {
    return res.status(400).json({
      error: `Incorrect value ${tradetype.toUpperCase()} in tradetype: tradetype can only be LONG or SHORT`,
    });
  }

  let notes,
    tags = "";
  let capitalused = req.body.capitalused
  let closedquantity = req.body.closedquantity
  let exitaverageprice = req.body.exitaverageprice
  let finalexitprice = req.body.finalexitprice
  let exitdate = req.body.exitdate
  let lastmodifieddate = req.body.lastmodifieddate
  let overallreturn = req.body.overallreturn

  if (req.body.notes !== undefined) notes = req.body.notes;
  if (req.body.tags !== undefined) tags = req.body.tags;
  if (capitalused === undefined) capitalused = quantity * entryprice;
  if (closedquantity === undefined) closedquantity = quantity - openquantity;
  if (exitaverageprice === undefined) exitaverageprice = 0;
  if (finalexitprice === undefined) finalexitprice = 0;
  if (exitdate === undefined) exitdate = null;
  if (lastmodifieddate === undefined) lastmodifieddate = null;
  if (overallreturn === undefined) overallreturn = 0;

  try {
    const sql =
      "INSERT INTO stock_trades (tradeid, asset, tradetype, quantity, entryprice, entrydate, openquantity, status,capitalused,closedquantity,exitaverageprice,finalexitprice,exitdate,lastmodifieddate,overallreturn,notes,tags) VALUES (?,?, ?, ?, ?, ?,?,?,?,?, ?, ?, ?, ?,?,?,?)";
    db.query(
      sql,
      [tradeid, asset, tradetype.toUpperCase(), quantity, entryprice, entrydate, openquantity, status.toUpperCase(), capitalused, closedquantity, exitaverageprice, finalexitprice, exitdate, lastmodifieddate, overallreturn, notes, tags],
      (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.affectedRows === 1)
          return res
            .status(201)
            .json({ message: "New trade added successfully!" });
        res.status(500).json({ message: "Internal server error" });
      }
    );
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


exports.getStockTrades = (req, res) => {

  let { id, asset, tradetype, status, entryStartdate, entryEndDate, tags, minimumreturn, maximumreturn, minimumcapitalused, maximumcapitalused } = req.query;
  let params = [];
  let query = "SELECT * FROM stock_trades WHERE 1=1";
  if (id !== undefined)
    query = `SELECT * FROM stock_trades where tradeid = ${id}`; // if id is passed all other params are ignored
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
    if (minimumcapitalused) {
      const parsedPrice = parseFloat(minimumcapitalused);
      if (isNaN(parsedPrice)) {
        return res.status(400).send('Invalid minimumcapitalused value, Expected number: ' + minimumcapitalused);
      }
      query += " AND capitalused >= ?";
      params.push(parsedPrice);
    }
    if (maximumcapitalused) {
      const parsedPrice = parseFloat(maximumcapitalused);
      if (isNaN(parsedPrice)) {
        return res.status(400).send('Invalid maximumcapitalused value, Expected number: ' + maximumcapitalused);
      }
      query += " AND capitalused <= ?";
      params.push(parsedPrice);
    }
    if (minimumreturn) {
      const parsedPrice = parseFloat(minimumreturn);
      if (isNaN(parsedPrice)) {
        return res.status(400).send('Invalid minimumreturn value, Expected number: ' + minimumreturn);
      }
      query += " AND overallreturn >= ?";
      params.push(parsedPrice);
    }
    if (maximumreturn) {
      const parsedPrice = parseFloat(maximumreturn);
      if (isNaN(parsedPrice)) {
        return res.status(400).send('Invalid maximumreturn value, Expected number: ' + maximumreturn);
      }
      query += " AND overallreturn <= ?";
      params.push(parsedPrice);
    }
    if (tradetype) {
      query += " AND tradetype = ?";
      params.push(tradetype.toUpperCase());
    }
    if (entryStartdate) {
      query += " AND entrydate >= ?";
      params.push(entryStartdate);
    }
    if (entryEndDate) {
      query += " AND entrydate <= ?";
      params.push(entryEndDate);
    }
    if (status) {
      query += " AND status = ?";
      params.push(status.toUpperCase());
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
  query += " ORDER BY entrydate DESC, STATUS";
  console.log(query)
  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json(err);
    const formattedresults = results.map((results) => ({
      ...results,
      date: moment(results.date).format("YYYY-MM-DD"), // Format to YYYY-MM-DD
    }));
    res.status(200).json(formattedresults);
  });
};


exports.deleteStockTrade = (req, res) => {
  const { id } = req.query;
  try {
    db.query("Delete FROM stock_trades WHERE tradeid = ?", [id], (err, results) => {
      if (err) return res.status(500).json(err);
      if (results.affectedRows == 1) return res.status(204).json({});
      else
        return res.status(500).json({
          error: `No Stock trade available to delete with id:${id}`,
        });
    });
  } catch (error) {
    console.error("Error deleting Stock trade:", error);
    res.status(500).json({ message: "Internal server error: " + error });
  }
};


exports.updateStockTrade = (req, res) => {
  const { id } = req.query;
  if (id == undefined) {
    return res.status(500).json({
      status: "fail",
      error: `id param is required`,
    });
  }
  db.query("SELECT * FROM stock_trades WHERE tradeid = ?", [id], (err, results) => {
    if (err) return res.status(500).json(err);
    if (results.length === 0) {
      return res.status(404).json({ error: "No trade found with id: " + id });
    }
  });
  const { asset, tradetype, quantity, entryprice, entrydate, openquantity, status, capitalused, closedquantity, exitaverageprice, finalexitprice, exitdate, lastmodifieddate, overallreturn, notes, tags } =
    req.body;
  // Build the query string to update the trade
  let updateFields = [];
  let updateValues = [];

  if (asset !== undefined) {
    updateFields.push("asset");
    updateValues.push(asset);
  }

  if (tradetype !== undefined) {
    updateFields.push("tradetype");
    updateValues.push(tradetype);
  }

  if (quantity !== undefined) {
    updateFields.push("quantity");
    updateValues.push(quantity);
  }

  if (entryprice !== undefined) {
    updateFields.push("entryprice");
    updateValues.push(entryprice);
  }

  if (entrydate !== undefined) {
    updateFields.push("entrydate");
    updateValues.push(entrydate);
  }

  if (openquantity !== undefined) {
    updateFields.push("openquantity");
    updateValues.push(openquantity);
  }

  if (notes !== undefined) {
    updateFields.push("notes");
    updateValues.push(notes);
  }

  if (tags !== undefined) {
    updateFields.push("tags");
    updateValues.push(tags);
  }

  if (status !== undefined) {
    updateFields.push("status");
    updateValues.push(status);
  }

  if (capitalused !== undefined) {
    updateFields.push("capitalused");
    updateValues.push(capitalused);
  }

  if (closedquantity !== undefined) {
    updateFields.push("closedquantity");
    updateValues.push(closedquantity);
  }

  if (exitaverageprice !== undefined) {
    updateFields.push("exitaverageprice");
    updateValues.push(exitaverageprice);
  }

  if (finalexitprice !== undefined) {
    updateFields.push("finalexitprice");
    updateValues.push(finalexitprice);
  }

  if (exitdate !== undefined) {
    updateFields.push("exitdate");
    updateValues.push(exitdate);
  }

  if (lastmodifieddate !== undefined) {
    updateFields.push("lastmodifieddate");
    updateValues.push(lastmodifieddate);
  }

  if (overallreturn !== undefined) {
    updateFields.push("overallreturn");
    updateValues.push(overallreturn);
  }

  const sqlQuery = `
            UPDATE stock_trades
            SET ${updateFields.map((field) => `${field} = ?`).join(", ")}

            WHERE tradeid = ?
        `;
  updateValues.push(id);
  try {
    db.execute(sqlQuery, updateValues, (err, results) => {
      if (err) return res.status(500).json(err);
      if (results.affectedRows == 1) {
        return res.status(200).json({ message: "trade updated successfully" });
      }
      res.status(500).json({ error: `Unable to update trade:  ${id}` });
    });
  } catch (error) {
    console.error("Error updating trade:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.createOptionTrade = (req, res) => {
  const {
    asset,
    quantity,
    tradetype,
    entryprice,
    entrydate,
    openquantity,
    status,
    tradeid,
    lotsize
  } = req.body;

  // Validate mandatory fields
  if (
    !lotsize) {
    return res.status(400).json({
      error:
        "Missing required fields: lotsize",
    });
  }
  if (
    !asset) {
    return res.status(400).json({
      error:
        "Missing required fields: asset",
    });
  }
  if (
    tradeid === undefined || tradeid === "") {
    return res.status(400).json({
      error:
        "Missing required fields: tradeid",
    });
  }
  if (
    !asset) {
    return res.status(400).json({
      error:
        "Missing required fields: asset",
    });
  }
  if (
    !tradetype) {
    return res.status(400).json({
      error:
        "Missing required fields: tradetype",
    });
  }
  if (
    !quantity) {
    return res.status(400).json({
      error:
        "Missing required fields: quantity",
    });
  }
  if (
    !entryprice) {
    return res.status(400).json({
      error:
        "Missing required fields: entryprice",
    });
  }
  if (
    !entrydate) {
    return res.status(400).json({
      error:
        "Missing required fields: entrydate",
    });
  }
  if (openquantity === undefined) {
    return res.status(400).json({
      error:
        "Missing required fields: openquantity",
    });
  }
  if (
    !status) {
    return res.status(400).json({
      error:
        "Missing required fields: status",
    });
  }
  if (!(status.toUpperCase() === "OPEN" || status.toUpperCase() === "CLOSED")) {
    return res.status(400).json({
      error: `Incorrect value ${status.toUpperCase()} in status: status can only be OPEN or CLOSED`,
    });
  }
  if (!(tradetype.toUpperCase() === "LONG" || tradetype.toUpperCase() === "SHORT")) {
    return res.status(400).json({
      error: `Incorrect value ${tradetype.toUpperCase()} in tradetype: tradetype can only be LONG or SHORT`,
    });
  }

  let notes,
    tags = "";
  let capitalused = req.body.capitalused
  let closedquantity = req.body.closedquantity
  let exitaverageprice = req.body.exitaverageprice
  let finalexitprice = req.body.finalexitprice
  let exitdate = req.body.exitdate
  let lastmodifieddate = req.body.lastmodifieddate
  let overallreturn = req.body.overallreturn
  let premiumamount = req.body.premiumamount

  if (req.body.notes !== undefined) notes = req.body.notes;
  if (req.body.tags !== undefined) tags = req.body.tags;
  if (capitalused === undefined) capitalused = quantity * entryprice * lotsize;
  if (closedquantity === undefined) closedquantity = quantity - openquantity;
  if (exitaverageprice === undefined) exitaverageprice = 0;
  if (finalexitprice === undefined) finalexitprice = 0;
  if (exitdate === undefined) exitdate = null;
  if (lastmodifieddate === undefined) lastmodifieddate = null;
  if (overallreturn === undefined) overallreturn = 0;
  if (premiumamount === undefined) premiumamount = capitalused;

  try {
    const sql =
      "INSERT INTO option_trades (tradeid, lotsize , asset, tradetype, quantity, premiumamount, entryprice, entrydate, openquantity, status,closedquantity,exitaverageprice,finalexitprice,exitdate,lastmodifieddate,overallreturn,notes,tags) VALUES (?,?, ?, ?, ?, ?,?,?,?,?, ?, ?,?,?,?,?,?,?)";
    db.query(
      sql,
      [tradeid, lotsize, asset, tradetype.toUpperCase(), quantity, premiumamount, entryprice, entrydate, openquantity, status.toUpperCase(), closedquantity, exitaverageprice, finalexitprice, exitdate, lastmodifieddate, overallreturn, notes, tags],
      (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.affectedRows === 1)
          return res
            .status(201)
            .json({ message: "New trade added successfully!" });
        res.status(500).json({ message: "Internal server error" });
      }
    );
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getOptionTrades = (req, res) => {

  let { id, asset, tradetype, status, entryStartdate, entryEndDate, tags, minimumreturn, maximumreturn, minimumcapitalused, maximumcapitalused } = req.query;
  let params = [];
  let query = "SELECT * FROM option_trades WHERE 1=1";
  if (id !== undefined)
    query = `SELECT * FROM option_trades where tradeid = ${id}`; // if id is passed all other params are ignored
  else {
    if (asset) {
      if (Array.isArray(asset)) {
        // to handle multiple options
        query += ` AND asset REGEXP ?`;
        params.push(asset.join("|"));
      } else {
        query += ` AND asset REGEXP ?`;
        params.push(asset);
      }
    }
    if (minimumcapitalused) {
      const parsedPrice = parseFloat(minimumcapitalused);
      if (isNaN(parsedPrice)) {
        return res.status(400).send('Invalid minimumcapitalused value, Expected number: ' + minimumcapitalused);
      }
      query += " AND capitalused >= ?";
      params.push(parsedPrice);
    }
    if (maximumcapitalused) {
      const parsedPrice = parseFloat(maximumcapitalused);
      if (isNaN(parsedPrice)) {
        return res.status(400).send('Invalid maximumcapitalused value, Expected number: ' + maximumcapitalused);
      }
      query += " AND capitalused <= ?";
      params.push(parsedPrice);
    }
    if (minimumreturn) {
      const parsedPrice = parseFloat(minimumreturn);
      if (isNaN(parsedPrice)) {
        return res.status(400).send('Invalid minimumreturn value, Expected number: ' + minimumreturn);
      }
      query += " AND overallreturn >= ?";
      params.push(parsedPrice);
    }
    if (maximumreturn) {
      const parsedPrice = parseFloat(maximumreturn);
      if (isNaN(parsedPrice)) {
        return res.status(400).send('Invalid maximumreturn value, Expected number: ' + maximumreturn);
      }
      query += " AND overallreturn <= ?";
      params.push(parsedPrice);
    }
    if (tradetype) {
      query += " AND tradetype = ?";
      params.push(tradetype.toUpperCase());
    }
    if (entryStartdate) {
      query += " AND entrydate >= ?";
      params.push(entryStartdate);
    }
    if (entryEndDate) {
      query += " AND entrydate <= ?";
      params.push(entryEndDate);
    }
    if (status) {
      query += " AND status = ?";
      params.push(status.toUpperCase());
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
  query += " ORDER BY entrydate DESC, STATUS";
  console.log(query)
  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json(err);
    const formattedresults = results.map((results) => ({
      ...results,
      date: moment(results.date).format("YYYY-MM-DD"), // Format to YYYY-MM-DD
    }));
    res.status(200).json(formattedresults);
  });
};


exports.deleteOptionTrade = (req, res) => {
  const { id } = req.query;
  try {
    db.query("Delete FROM option_trades WHERE tradeid = ?", [id], (err, results) => {
      if (err) return res.status(500).json(err);
      if (results.affectedRows == 1) return res.status(204).json({});
      else
        return res.status(500).json({
          error: `No Option trade available to delete with id:${id}`,
        });
    });
  } catch (error) {
    console.error("Error deleting Option trade:", error);
    res.status(500).json({ message: "Internal server error: " + error });
  }
};


exports.updateOptionTrade = (req, res) => {
  const { id } = req.query;
  if (id == undefined) {
    return res.status(500).json({
      status: "fail",
      error: `id param is required`,
    });
  }
  db.query("SELECT * FROM option_trades WHERE tradeid = ?", [id], (err, results) => {
    if (err) return res.status(500).json(err);
    if (results.length === 0) {
      return res.status(404).json({ error: "No trade found with id: " + id });
    }
  });
  const { asset, lotsize, tradetype, quantity, entryprice, entrydate, openquantity, status, premiumamount, closedquantity, exitaverageprice, finalexitprice, exitdate, lastmodifieddate, overallreturn, notes, tags } =
    req.body;
  // Build the query string to update the trade
  let updateFields = [];
  let updateValues = [];

  if (asset !== undefined) {
    updateFields.push("asset");
    updateValues.push(asset);
  }

  if (lotsize !== undefined) {
    updateFields.push("lotsize");
    updateValues.push(lotsize);
  }

  if (tradetype !== undefined) {
    updateFields.push("tradetype");
    updateValues.push(tradetype);
  }

  if (quantity !== undefined) {
    updateFields.push("quantity");
    updateValues.push(quantity);
  }

  if (entryprice !== undefined) {
    updateFields.push("entryprice");
    updateValues.push(entryprice);
  }

  if (entrydate !== undefined) {
    updateFields.push("entrydate");
    updateValues.push(entrydate);
  }

  if (openquantity !== undefined) {
    updateFields.push("openquantity");
    updateValues.push(openquantity);
  }

  if (notes !== undefined) {
    updateFields.push("notes");
    updateValues.push(notes);
  }

  if (tags !== undefined) {
    updateFields.push("tags");
    updateValues.push(tags);
  }

  if (status !== undefined) {
    updateFields.push("status");
    updateValues.push(status);
  }

  if (premiumamount !== undefined) {
    updateFields.push("premiumamount");
    updateValues.push(premiumamount);
  }

  if (closedquantity !== undefined) {
    updateFields.push("closedquantity");
    updateValues.push(closedquantity);
  }

  if (exitaverageprice !== undefined) {
    updateFields.push("exitaverageprice");
    updateValues.push(exitaverageprice);
  }

  if (finalexitprice !== undefined) {
    updateFields.push("finalexitprice");
    updateValues.push(finalexitprice);
  }

  if (exitdate !== undefined) {
    updateFields.push("exitdate");
    updateValues.push(exitdate);
  }

  if (lastmodifieddate !== undefined) {
    updateFields.push("lastmodifieddate");
    updateValues.push(lastmodifieddate);
  }

  if (overallreturn !== undefined) {
    updateFields.push("overallreturn");
    updateValues.push(overallreturn);
  }

  const sqlQuery = `
            UPDATE option_trades
            SET ${updateFields.map((field) => `${field} = ?`).join(", ")}

            WHERE tradeid = ?
        `;
  updateValues.push(id);
  try {
    db.execute(sqlQuery, updateValues, (err, results) => {
      if (err) return res.status(500).json(err);
      if (results.affectedRows == 1) {
        return res.status(200).json({ message: "trade updated successfully" });
      }
      res.status(500).json({ error: `Unable to update trade:  ${id}` });
    });
  } catch (error) {
    console.error("Error updating trade:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};