const db = require("../db");
const moment = require("moment");


exports.createStockTrade = async (req, res) => {
  const {
    asset,
    quantity,
    tradetype,
    entryprice,
    entrydate,
    openquantity,
    status,
    tradeid,
    ltp,
    strategy_id
  } = req.body;

  // Validate mandatory fields
  if (!asset) {
    return res.status(400).json({
      error: "Missing required fields: asset"
    });
  }
  if (tradeid === undefined || tradeid === "") {
    return res.status(400).json({
      error: "Missing required fields: tradeid"
    });
  }
  if (!tradetype) {
    return res.status(400).json({
      error: "Missing required fields: tradetype"
    });
  }
  if (!quantity) {
    return res.status(400).json({
      error: "Missing required fields: quantity"
    });
  }
  if (!entryprice) {
    return res.status(400).json({
      error: "Missing required fields: entryprice"
    });
  }
  if (!entrydate) {
    return res.status(400).json({
      error: "Missing required fields: entrydate"
    });
  }
  if (openquantity === undefined) {
    return res.status(400).json({
      error: "Missing required fields: openquantity"
    });
  }
  if (!status) {
    return res.status(400).json({
      error: "Missing required fields: status"
    });
  }
  if (!(status.toUpperCase() === "OPEN" || status.toUpperCase() === "CLOSED")) {
    return res.status(400).json({
      error: `Incorrect value ${status.toUpperCase()} in status: status can only be OPEN or CLOSED`
    });
  }
  if (!(tradetype.toUpperCase() === "LONG" || tradetype.toUpperCase() === "SHORT")) {
    return res.status(400).json({
      error: `Incorrect value ${tradetype.toUpperCase()} in tradetype: tradetype can only be LONG or SHORT`
    });
  }

  let notes = "",
    tags = "";
  let capitalused = req.body.capitalused;
  let closedquantity = req.body.closedquantity;
  let exitaverageprice = req.body.exitaverageprice;
  let finalexitprice = req.body.finalexitprice;
  let exitdate = req.body.exitdate;
  let lastmodifieddate = req.body.lastmodifieddate;
  let overallreturn = req.body.overallreturn;

  if (req.body.notes !== undefined) notes = req.body.notes;
  if (req.body.tags !== undefined) tags = req.body.tags;
  if (capitalused === undefined) capitalused = quantity * entryprice;
  if (closedquantity === undefined) closedquantity = quantity - openquantity;
  if (exitaverageprice === undefined) exitaverageprice = 0;
  if (finalexitprice === undefined) finalexitprice = 0;
  if (exitdate === undefined) exitdate = null;
  if (lastmodifieddate === undefined) lastmodifieddate = null;
  if (overallreturn === undefined) overallreturn = 0;
  if (ltp === undefined) ltp = null;

  try {
    const sql = `
      INSERT INTO stock_trades 
      (tradeid, asset, tradetype, quantity, entryprice, entrydate, openquantity, status, capitalused, closedquantity, exitaverageprice, finalexitprice, exitdate, lastmodifieddate, overallreturn, notes, tags, ltp, strategy_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      tradeid,
      asset,
      tradetype.toUpperCase(),
      quantity,
      entryprice,
      entrydate,
      openquantity,
      status.toUpperCase(),
      capitalused,
      closedquantity,
      exitaverageprice,
      finalexitprice,
      exitdate,
      lastmodifieddate,
      overallreturn,
      notes,
      tags,
      ltp,
      strategy_id || null
    ];

    const [result] = await db.pool.query(sql, params);

    if (result.affectedRows === 1) {
      return res.status(201).json({
        message: "New trade added successfully!",
        tradeid: tradeid
      });
    }

    return res.status(500).json({ message: "Internal server error" });
  } catch (error) {
    console.error("Error creating trade:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};


exports.getStockTrades = async (req, res) => {
  try {
    console.log('Fetching stock trades with params:', req.query);
    let { id, strategy_id, entrydate, exitdate, createdafter, createdbefore, status } = req.query;
    let query = "SELECT * FROM stock_trades WHERE 1=1";
    let params = [];

    if (id !== undefined) {
      query += " AND id = ?";
      params.push(id);
    }
    if (strategy_id !== undefined) {
      query += " AND strategy_id = ?";
      params.push(strategy_id);
    }
    if (entrydate !== undefined) {
      query += " AND entrydate = ?";
      params.push(entrydate);
    }
    if (exitdate !== undefined) {
      query += " AND exitdate = ?";
      params.push(exitdate);
    }
    if (createdafter !== undefined) {
      query += " AND created_at >= ?";
      params.push(createdafter);
    }
    if (createdbefore !== undefined) {
      query += " AND created_at <= ?";
      params.push(createdbefore);
    }
    if (status !== undefined) {
      query += " AND status = ?";
      params.push(status.toUpperCase());
    }

    query += " ORDER BY entrydate DESC";
    console.log('Executing query:', query);
    console.log('With params:', params);

    // Set a timeout for the query
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Query timeout after 10 seconds'));
      }, 10000);
    });

    const queryPromise = db.pool.query(query, params);

    const [results] = await Promise.race([queryPromise, timeoutPromise]);

    if (!results || results.length === 0) {
      console.log('No results found');
      return res.status(200).json([]);
    }

    console.log(`Found ${results.length} trades`);
    const formattedResults = results.map(trade => ({
      ...trade,
      entrydate: moment(trade.entrydate).format("YYYY-MM-DD"),
      exitdate: trade.exitdate ? moment(trade.exitdate).format("YYYY-MM-DD") : null,
      lastmodifieddate: trade.lastmodifieddate ? moment(trade.lastmodifieddate).format("YYYY-MM-DD") : null
    }));

    return res.status(200).json(formattedResults);
  } catch (error) {
    console.error("Error fetching stock trades:", error);
    if (error.message.includes('timeout')) {
      return res.status(504).json({
        message: "Request timeout",
        error: "The database query took too long to execute"
      });
    }
    return res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
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


exports.updateStockTrade = async (req, res) => {
  const { id } = req.query;
  if (id === undefined) {
    return res.status(400).json({
      status: "fail",
      error: "id param is required"
    });
  }

  try {
    // Check if trade exists
    const [existingTrade] = await db.pool.query(
      "SELECT * FROM stock_trades WHERE tradeid = ?",
      [id]
    );

    if (existingTrade.length === 0) {
      return res.status(404).json({ error: "No trade found with id: " + id });
    }

    const {
      asset,
      tradetype,
      quantity,
      entryprice,
      entrydate,
      openquantity,
      status,
      capitalused,
      closedquantity,
      exitaverageprice,
      finalexitprice,
      exitdate,
      lastmodifieddate,
      overallreturn,
      notes,
      tags,
      ltp,
      strategy_id
    } = req.body;

    // Build the query string to update the trade
    let updateFields = [];
    let updateValues = [];

    if (asset !== undefined) {
      updateFields.push("asset");
      updateValues.push(asset);
    }
    if (tradetype !== undefined) {
      updateFields.push("tradetype");
      updateValues.push(tradetype.toUpperCase());
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
      updateValues.push(status.toUpperCase());
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
    if (ltp !== undefined) {
      updateFields.push("ltp");
      updateValues.push(ltp);
    }
    if (strategy_id !== undefined) {
      updateFields.push("strategy_id");
      updateValues.push(strategy_id);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const sqlQuery = `
      UPDATE stock_trades
      SET ${updateFields.map(field => `${field} = ?`).join(", ")}
      WHERE tradeid = ?
    `;
    updateValues.push(id);

    const [result] = await db.pool.query(sqlQuery, updateValues);

    if (result.affectedRows === 1) {
      return res.status(200).json({ message: "Trade updated successfully" });
    }

    return res.status(500).json({ error: `Unable to update trade: ${id}` });
  } catch (error) {
    console.error("Error updating trade:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.createOptionTrade = async (req, res) => {
  try {
    console.log('Creating option trade with data:', req.body);
    const {
      asset,
      strikeprize,
      quantity,
      tradetype,
      entryprice,
      entrydate,
      openquantity,
      status,
      tradeid,
      lotsize,
      ltp,
      strategy_id
    } = req.body;

    // Validate mandatory fields
    if (!lotsize) {
      return res.status(400).json({
        error: "Missing required fields: lotsize"
      });
    }
    if (!strikeprize) {
      return res.status(400).json({
        error: "Missing required fields: strikeprize"
      });
    }
    if (!asset) {
      return res.status(400).json({
        error: "Missing required fields: asset"
      });
    }
    if (tradeid === undefined || tradeid === "") {
      return res.status(400).json({
        error: "Missing required fields: tradeid"
      });
    }
    if (!tradetype) {
      return res.status(400).json({
        error: "Missing required fields: tradetype"
      });
    }
    if (!quantity) {
      return res.status(400).json({
        error: "Missing required fields: quantity"
      });
    }
    if (!entryprice) {
      return res.status(400).json({
        error: "Missing required fields: entryprice"
      });
    }
    if (!entrydate) {
      return res.status(400).json({
        error: "Missing required fields: entrydate"
      });
    }
    if (openquantity === undefined) {
      return res.status(400).json({
        error: "Missing required fields: openquantity"
      });
    }
    if (!status) {
      return res.status(400).json({
        error: "Missing required fields: status"
      });
    }
    if (!(status.toUpperCase() === "OPEN" || status.toUpperCase() === "CLOSED")) {
      return res.status(400).json({
        error: `Incorrect value ${status.toUpperCase()} in status: status can only be OPEN or CLOSED`
      });
    }
    if (!(tradetype.toUpperCase() === "LONG" || tradetype.toUpperCase() === "SHORT")) {
      return res.status(400).json({
        error: `Incorrect value ${tradetype.toUpperCase()} in tradetype: tradetype can only be LONG or SHORT`
      });
    }

    let notes = "",
      tags = "";
    let capitalused = req.body.capitalused;
    let closedquantity = req.body.closedquantity;
    let exitaverageprice = req.body.exitaverageprice;
    let finalexitprice = req.body.finalexitprice;
    let exitdate = req.body.exitdate;
    let lastmodifieddate = req.body.lastmodifieddate;
    let overallreturn = req.body.overallreturn;
    let premiumamount = req.body.premiumamount;

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
    if (ltp === undefined) ltp = null;

    console.log('Building SQL query');
    const sql = `
      INSERT INTO option_trades 
      (tradeid, lotsize, asset, strikeprize, tradetype, quantity, premiumamount, entryprice, entrydate, openquantity, status, closedquantity, exitaverageprice, finalexitprice, exitdate, lastmodifieddate, overallreturn, notes, tags, ltp, strategy_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      tradeid,
      lotsize,
      asset,
      strikeprize,
      tradetype.toUpperCase(),
      quantity,
      premiumamount,
      entryprice,
      entrydate,
      openquantity,
      status.toUpperCase(),
      closedquantity,
      exitaverageprice,
      finalexitprice,
      exitdate,
      lastmodifieddate,
      overallreturn,
      notes,
      tags,
      ltp,
      strategy_id || null
    ];

    console.log('Executing query with params:', params);
    const [result] = await db.pool.query(sql, params);
    console.log('Query result:', result);

    if (result.affectedRows === 1) {
      console.log('Trade created successfully');
      return res.status(201).json({
        message: "New trade added successfully!",
        tradeid: tradeid
      });
    }

    console.log('Failed to create trade');
    return res.status(500).json({ message: "Internal server error" });
  } catch (error) {
    console.error("Error creating trade:", error);
    console.error("Error stack:", error.stack);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};

exports.getOptionTrades = async (req, res) => {
  try {
    console.log('getOptionTrades called with query params:', req.query);
    let { id, asset, tradetype, status, entryStartdate, entryEndDate, tags, minimumreturn, maximumreturn, minimumcapitalused, maximumcapitalused } = req.query;
    let params = [];
    let query = "SELECT * FROM option_trades WHERE 1=1";

    if (id !== undefined) {
      console.log('Fetching by ID:', id);
      query = `SELECT * FROM option_trades WHERE tradeid = ?`;
      params.push(id);
    } else {
      console.log('Building query with filters');
      if (asset) {
        if (Array.isArray(asset)) {
          query += ` AND asset REGEXP ?`;
          params.push(asset.join("|"));
        } else {
          query += ` AND asset REGEXP ?`;
          params.push(asset);
        }
        console.log('Added asset filter:', asset);
      }
      if (minimumcapitalused) {
        const parsedPrice = parseFloat(minimumcapitalused);
        if (isNaN(parsedPrice)) {
          return res.status(400).send('Invalid minimumcapitalused value, Expected number: ' + minimumcapitalused);
        }
        query += " AND capitalused >= ?";
        params.push(parsedPrice);
        console.log('Added minimumcapitalused filter:', parsedPrice);
      }
      if (maximumcapitalused) {
        const parsedPrice = parseFloat(maximumcapitalused);
        if (isNaN(parsedPrice)) {
          return res.status(400).send('Invalid maximumcapitalused value, Expected number: ' + maximumcapitalused);
        }
        query += " AND capitalused <= ?";
        params.push(parsedPrice);
        console.log('Added maximumcapitalused filter:', parsedPrice);
      }
      if (minimumreturn) {
        const parsedPrice = parseFloat(minimumreturn);
        if (isNaN(parsedPrice)) {
          return res.status(400).send('Invalid minimumreturn value, Expected number: ' + minimumreturn);
        }
        query += " AND overallreturn >= ?";
        params.push(parsedPrice);
        console.log('Added minimumreturn filter:', parsedPrice);
      }
      if (maximumreturn) {
        const parsedPrice = parseFloat(maximumreturn);
        if (isNaN(parsedPrice)) {
          return res.status(400).send('Invalid maximumreturn value, Expected number: ' + maximumreturn);
        }
        query += " AND overallreturn <= ?";
        params.push(parsedPrice);
        console.log('Added maximumreturn filter:', parsedPrice);
      }
      if (tradetype) {
        query += " AND tradetype = ?";
        params.push(tradetype.toUpperCase());
        console.log('Added tradetype filter:', tradetype.toUpperCase());
      }
      if (entryStartdate) {
        query += " AND entrydate >= ?";
        params.push(entryStartdate);
        console.log('Added entryStartdate filter:', entryStartdate);
      }
      if (entryEndDate) {
        query += " AND entrydate <= ?";
        params.push(entryEndDate);
        console.log('Added entryEndDate filter:', entryEndDate);
      }
      if (status) {
        query += " AND status = ?";
        params.push(status.toUpperCase());
        console.log('Added status filter:', status.toUpperCase());
      }
      if (tags) {
        if (Array.isArray(tags)) {
          query += ` AND tags REGEXP ?`;
          params.push(tags.join("|"));
        } else {
          query += " AND tags REGEXP  ?";
          params.push(tags);
        }
        console.log('Added tags filter:', tags);
      }
    }
    query += " ORDER BY entrydate DESC, STATUS";
    console.log('Final query:', query);
    console.log('Query parameters:', params);

    // Execute query using promise
    const [results] = await db.pool.query(query, params);
    console.log('Raw query results:', results);

    if (!results || results.length === 0) {
      console.log('No results found');
      return res.status(200).json([]);
    }

    const formattedresults = results.map((result) => ({
      ...result,
      entrydate: moment(result.entrydate).format("YYYY-MM-DD"),
      exitdate: result.exitdate ? moment(result.exitdate).format("YYYY-MM-DD") : null,
      lastmodifieddate: result.lastmodifieddate ? moment(result.lastmodifieddate).format("YYYY-MM-DD") : null
    }));

    console.log('Formatted results:', formattedresults);
    return res.status(200).json(formattedresults);
  } catch (error) {
    console.error('Error in getOptionTrades:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      stack: error.stack
    });
  }
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


exports.updateOptionTrade = async (req, res) => {
  const { id } = req.query;
  if (id === undefined) {
    return res.status(400).json({
      status: "fail",
      error: "id param is required"
    });
  }

  try {
    // Check if trade exists
    const [existingTrade] = await db.pool.query(
      "SELECT * FROM option_trades WHERE tradeid = ?",
      [id]
    );

    if (existingTrade.length === 0) {
      return res.status(404).json({ error: "No trade found with id: " + id });
    }

    const {
      asset,
      lotsize,
      strikeprize,
      tradetype,
      quantity,
      entryprice,
      entrydate,
      openquantity,
      status,
      premiumamount,
      closedquantity,
      exitaverageprice,
      finalexitprice,
      exitdate,
      lastmodifieddate,
      overallreturn,
      notes,
      tags,
      ltp,
      strategy_id
    } = req.body;

    // Build the query string to update the trade
    let updateFields = [];
    let updateValues = [];

    if (asset !== undefined) {
      updateFields.push("asset");
      updateValues.push(asset);
    }
    if (strikeprize !== undefined) {
      updateFields.push("strikeprize");
      updateValues.push(strikeprize);
    }
    if (lotsize !== undefined) {
      updateFields.push("lotsize");
      updateValues.push(lotsize);
    }
    if (tradetype !== undefined) {
      updateFields.push("tradetype");
      updateValues.push(tradetype.toUpperCase());
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
      updateValues.push(status.toUpperCase());
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
    if (ltp !== undefined) {
      updateFields.push("ltp");
      updateValues.push(ltp);
    }
    if (strategy_id !== undefined) {
      updateFields.push("strategy_id");
      updateValues.push(strategy_id);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const sqlQuery = `
      UPDATE option_trades
      SET ${updateFields.map(field => `${field} = ?`).join(", ")}
      WHERE tradeid = ?
    `;
    updateValues.push(id);

    const [result] = await db.pool.query(sqlQuery, updateValues);

    if (result.affectedRows === 1) {
      return res.status(200).json({ message: "Trade updated successfully" });
    }

    return res.status(500).json({ error: `Unable to update trade: ${id}` });
  } catch (error) {
    console.error("Error updating trade:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};