const db = require("./../db");
const moment = require("moment");

// Helper for consistent responses
function sendResponse(res, { success, data = null, message = '', error = null, status = 200, meta = undefined }) {
  const resp = { success, data, message };
  if (error) resp.error = error;
  if (meta) resp.meta = meta;
  res.status(status).json(resp);
}

exports.createMarketAnalysis = async (req, res) => {
  const {
    date,
    premarketanalysis,
    postmarketanalysis,
    eventday,
    eventdescription,
    premarketexpectation,
    marketmovement,
  } = req.body;

  if (!date) {
    return sendResponse(res, { success: false, message: 'Date is required', error: 'VALIDATION_ERROR', status: 400 });
  }

  try {
    const sql =
      "INSERT INTO marketanalysis (date, premarket_analysis, postmarket_analysis, event_day, event_description, premarket_expectation, market_movement) VALUES (?, ?, ?, ?, ?, ?, ?)";

    const [result] = await db.pool.query(sql, [
      date,
      premarketanalysis,
      postmarketanalysis,
      eventday,
      eventdescription,
      premarketexpectation,
      marketmovement,
    ]);

    sendResponse(res, { success: true, message: "Analysis added successfully!", data: { id: result.insertId }, status: 201 });
  } catch (err) {
    console.error("Error creating market analysis:", err);
    sendResponse(res, { success: false, message: "Failed to create market analysis", error: err.message, status: 500 });
  }
};

exports.getAllMarketAnalysis = async (req, res) => {
  let { page = 1, limit = 20 } = req.query;
  page = parseInt(page);
  limit = parseInt(limit);
  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1) limit = 20;
  const offset = (page - 1) * limit;

  try {
    // Get total count
    const [countResult] = await db.pool.query("SELECT COUNT(*) as count FROM marketanalysis");
    const total = countResult[0].count;

    // Get paginated results
    const [results] = await db.pool.query(
      "SELECT * FROM marketanalysis ORDER BY date DESC LIMIT ? OFFSET ?",
      [limit, offset]
    );

    const formattedresults = results.map((result) => ({
      ...result,
      date: moment(result.date).format("YYYY-MM-DD"),
    }));

    sendResponse(res, {
      success: true,
      data: formattedresults,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("Error fetching market analysis:", err);
    sendResponse(res, { success: false, message: "Failed to fetch market analysis", error: err.message, status: 500 });
  }
};

exports.getMarketAnalysis = async (req, res) => {
  const { id } = req.params;

  try {
    const [results] = await db.pool.query(
      "SELECT * FROM marketanalysis WHERE id = ?",
      [id]
    );

    if (results.length === 0) {
      return sendResponse(res, { success: false, message: "Analysis not found", error: "NOT_FOUND", status: 404 });
    }

    const formattedresults = results.map((result) => ({
      ...result,
      date: moment(result.date).format("YYYY-MM-DD"),
    }));

    sendResponse(res, { success: true, data: formattedresults[0] });
  } catch (error) {
    console.error("Error fetching Analysis:", error);
    sendResponse(res, { success: false, message: "Internal server error", error: error.message, status: 500 });
  }
};

exports.updateMarketAnalysis = async (req, res) => {
  const { id } = req.params;
  const {
    date,
    premarketanalysis,
    postmarketanalysis,
    eventday,
    eventdescription,
    premarketexpectation,
    marketmovement,
  } = req.body;

  try {
    // Build the query string to update the trade
    let updateFields = [];
    let updateValues = [];

    // Always update date and event_day
    updateFields.push("date", "event_day");
    updateValues.push(date, eventday);

    if (premarketanalysis !== undefined) {
      updateFields.push("premarket_analysis");
      updateValues.push(premarketanalysis);
    }
    if (postmarketanalysis !== undefined) {
      updateFields.push("postmarket_analysis");
      updateValues.push(postmarketanalysis);
    }
    if (eventdescription !== undefined) {
      updateFields.push("event_description");
      updateValues.push(eventdescription);
    }
    if (premarketexpectation !== undefined) {
      updateFields.push("premarket_expectation");
      updateValues.push(premarketexpectation);
    }
    if (marketmovement !== undefined) {
      updateFields.push("market_movement"); // Fixed field name
      updateValues.push(marketmovement);
    }

    const sqlQuery = `
      UPDATE marketanalysis
      SET ${updateFields.map((field) => `${field} = ?`).join(", ")}
      WHERE id = ?
    `;
    updateValues.push(id);

    const [result] = await db.pool.query(sqlQuery, updateValues);

    if (result.affectedRows === 0) {
      return sendResponse(res, { success: false, message: "Analysis not found", error: "NOT_FOUND", status: 404 });
    }

    sendResponse(res, { success: true, message: "Analysis updated successfully" });
  } catch (error) {
    console.error("Error updating analysis:", error);
    sendResponse(res, { success: false, message: "Internal server error", error: error.message, status: 500 });
  }
};

exports.deleteMarketAnalysis = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.pool.query(
      "DELETE FROM marketanalysis WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 1) {
      return sendResponse(res, { success: true, message: "Analysis deleted successfully", status: 200 });
    }

    return sendResponse(res, { success: false, message: `No record available to delete with id:${id}`, error: "NOT_FOUND", status: 404 });
  } catch (error) {
    console.error("Error deleting Analysis:", error);
    sendResponse(res, { success: false, message: "Internal server error", error: error.message, status: 500 });
  }
};
