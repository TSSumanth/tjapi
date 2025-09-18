const db = require("../db");
const moment = require("moment");
const slackHelper = require("../services/slackIntegrationHelper");
const slack_webhook = process.env.SLACK_JOURNALING_WEBHOOK;

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
  if (exitdate === undefined || exitdate === "") exitdate = null;
  if (lastmodifieddate === undefined || lastmodifieddate === "") lastmodifieddate = new Date();
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
      // Update the strategy's stock_trades array
      if (strategy_id) {
        try {
          // Get the current strategy
          const [strategy] = await db.pool.query(
            "SELECT stock_trades FROM strategies WHERE id = ?",
            [strategy_id]
          );

          if (strategy && strategy[0]) {
            // Parse the current stock_trades array
            let stockTrades = [];
            try {
              stockTrades = JSON.parse(strategy[0].stock_trades || '[]');
            } catch (e) {
              console.error('Error parsing stock_trades:', e);
            }

            // Add the new trade ID if it's not already in the array
            if (!stockTrades.includes(tradeid)) {
              stockTrades.push(tradeid);

              // Update the strategy
              await db.pool.query(
                "UPDATE strategies SET stock_trades = ? WHERE id = ?",
                [JSON.stringify(stockTrades), strategy_id]
              );
            }
          }
        } catch (error) {
          console.error('Error updating strategy stock_trades:', error);
        }
      }

      // Send Slack notification for new stock trade
      try {
        await slackHelper.notifyNewTrade({
          tradeid,
          asset,
          tradetype: tradetype.toUpperCase(),
          quantity,
          entryprice,
          entrydate,
          status: status.toUpperCase(),
          type: 'STOCK'
        }, slack_webhook);
      } catch (slackError) {
        console.error('Failed to send Slack notification for stock trade:', slackError);
        // Don't fail the main operation if Slack notification fails
      }

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
      // Handle both single ID and array of IDs
      const ids = Array.isArray(id) ? id : [id];
      query += " AND tradeid IN (?)";
      params.push(ids);
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


exports.deleteStockTrade = async (req, res) => {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({
      error: "Missing required parameter: id"
    });
  }

  try {
    // Check if trade exists first
    const [existingTrade] = await db.pool.query(
      "SELECT * FROM stock_trades WHERE tradeid = ?",
      [id]
    );

    if (existingTrade.length === 0) {
      return res.status(404).json({
        error: `No stock trade found with tradeid: ${id}`
      });
    }

    const [result] = await db.pool.query(
      "DELETE FROM stock_trades WHERE tradeid = ?",
      [id]
    );

    if (result.affectedRows === 1) {
      return res.status(204).send();
    }

    return res.status(500).json({
      error: `Unable to delete stock trade with tradeid: ${id}`
    });
  } catch (error) {
    console.error("Error deleting stock trade:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
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
      // unrealizedpl, // Not stored in database, calculated on frontend
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
    if (finalexitprice !== undefined && finalexitprice !== "") {
      updateFields.push("finalexitprice");
      updateValues.push(finalexitprice);
    }
    if (exitdate !== undefined && exitdate !== '') {
      updateFields.push("exitdate");
      updateValues.push(exitdate);
    }
    if (lastmodifieddate !== undefined && lastmodifieddate !== '') {
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
    // Note: unrealizedpl is calculated on the frontend and not stored in database
    // if (unrealizedpl !== undefined) {
    //   updateFields.push("unrealizedpl");
    //   updateValues.push(unrealizedpl);
    // }
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
  if (exitdate === undefined || exitdate === "") exitdate = null;
  if (lastmodifieddate === undefined || lastmodifieddate === "") lastmodifieddate = new Date();
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
      // Update the strategy's option_trades array
      if (strategy_id) {
        try {
          // Get the current strategy
          const [strategy] = await db.pool.query(
            "SELECT option_trades FROM strategies WHERE id = ?",
            [strategy_id]
          );

          if (strategy && strategy[0]) {
            // Parse the current option_trades array
            let optionTrades = [];
            try {
              optionTrades = JSON.parse(strategy[0].option_trades || '[]');
            } catch (e) {
              console.error('Error parsing option_trades:', e);
            }

            // Add the new trade ID if it's not already in the array
            if (!optionTrades.includes(tradeid)) {
              optionTrades.push(tradeid);

              // Update the strategy
              await db.pool.query(
                "UPDATE strategies SET option_trades = ? WHERE id = ?",
                [JSON.stringify(optionTrades), strategy_id]
              );
            }
          }
        } catch (error) {
          console.error('Error updating strategy option_trades:', error);
        }
      }

      // Send Slack notification for new option trade
      try {
        await slackHelper.notifyNewTrade({
          tradeid,
          asset,
          tradetype: tradetype.toUpperCase(),
          quantity,
          premiumamount,
          entrydate,
          status: status.toUpperCase(),
          type: 'OPTION',
          strikeprize
        }, slack_webhook);
      } catch (slackError) {
        console.error('Failed to send Slack notification for option trade:', slackError);
        // Don't fail the main operation if Slack notification fails
      }

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
    console.log('Fetching option trades with params:', req.query);
    let { id, strategy_id, entrydate, exitdate, createdafter, createdbefore, status } = req.query;
    let query = "SELECT * FROM option_trades WHERE 1=1";
    let params = [];

    if (id) {
      // Handle both single ID and array of IDs
      const ids = Array.isArray(id) ? id : [id];
      query += " AND tradeid IN (?)";
      params.push(ids);
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

    query += " ORDER BY entrydate DESC, status";
    console.log('Executing query:', query);
    console.log('With params:', params);

    const [rows] = await db.pool.query(query, params);

    if (!rows || rows.length === 0) {
      console.log('No results found');
      return res.status(200).json([]);
    }

    console.log(`Found ${rows.length} trades`);
    const formattedResults = rows.map(trade => ({
      ...trade,
      entrydate: moment(trade.entrydate).format("YYYY-MM-DD"),
      exitdate: trade.exitdate ? moment(trade.exitdate).format("YYYY-MM-DD") : null,
      lastmodifieddate: trade.lastmodifieddate ? moment(trade.lastmodifieddate).format("YYYY-MM-DD") : null
    }));

    return res.status(200).json(formattedResults);
  } catch (error) {
    console.error("Error in getOptionTrades:", error);
    res.status(500).json({ error: "Failed to fetch option trades" });
  }
};


exports.deleteOptionTrade = async (req, res) => {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({
      error: "Missing required parameter: id"
    });
  }

  try {
    // Check if trade exists first
    const [existingTrade] = await db.pool.query(
      "SELECT * FROM option_trades WHERE tradeid = ?",
      [id]
    );

    if (existingTrade.length === 0) {
      return res.status(404).json({
        error: `No option trade found with tradeid: ${id}`
      });
    }

    const [result] = await db.pool.query(
      "DELETE FROM option_trades WHERE tradeid = ?",
      [id]
    );

    if (result.affectedRows === 1) {
      return res.status(204).send();
    }

    return res.status(500).json({
      error: `Unable to delete option trade with tradeid: ${id}`
    });
  } catch (error) {
    console.error("Error deleting option trade:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
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
      // unrealizedpl, // Not stored in database, calculated on frontend
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
    if (entrydate !== undefined && entrydate !== "") {
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
    if (finalexitprice !== undefined && finalexitprice !== "") {
      updateFields.push("finalexitprice");
      updateValues.push(finalexitprice);
    }
    if (exitdate !== undefined && exitdate !== '') {
      updateFields.push("exitdate");
      updateValues.push(exitdate);
    }
    if (lastmodifieddate !== undefined && lastmodifieddate !== '') {
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
    // Note: unrealizedpl is calculated on the frontend and not stored in database
    // if (unrealizedpl !== undefined) {
    //   updateFields.push("unrealizedpl");
    //   updateValues.push(unrealizedpl);
    // }
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
