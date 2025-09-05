const db = require("../db");


// Get P/L history for a specific strategy
exports.getStrategyPlHistory = async (req, res) => {
  try {
    const { strategyId } = req.params;
    const { startDate, endDate, limit = 1000, strategyType = 'regular' } = req.query;


    let query = `
      SELECT 
        id,
        strategy_id,
        timestamp,
        total_pl,
        total_pl_mp,
        market_price,
        market_hours,
        created_at
      FROM strategy_pl_history 
      WHERE strategy_id = ?
    `;
    
    const queryParams = [strategyId];

    // Add date range filter if provided
    if (startDate && endDate) {
      // Convert dates to proper datetime format for comparison
      const startDateTime = `${startDate} 00:00:00`;
      const endDateTime = `${endDate} 23:59:59`;
      
      query += ` AND timestamp BETWEEN ? AND ?`;
      queryParams.push(startDateTime, endDateTime);
      
    }

    // Order by timestamp descending (newest first)
    query += ` ORDER BY timestamp DESC`;

    // Add limit (use string concatenation to avoid MySQL prepared statement issues)
    if (limit) {
      const limitNum = parseInt(limit, 10);
      query += ` LIMIT ${limitNum}`;
    }


    const [rows] = await db.pool.execute(query, queryParams);

    res.status(200).json({
      success: true,
      data: rows,
      count: rows.length
    });
  } catch (error) {
    console.error("Error fetching strategy P/L history:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Save P/L history for a strategy
exports.saveStrategyPlHistory = async (req, res) => {
  try {
    const { strategyId, totalPl, totalPlMp, marketPrice, marketHours = true, strategyType = 'regular' } = req.body;

    if (!strategyId || totalPl === undefined || totalPlMp === undefined) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: strategyId, totalPl, totalPlMp"
      });
    }

    const query = `
      INSERT INTO strategy_pl_history 
      (strategy_id, strategy_type, timestamp, total_pl, total_pl_mp, market_price, market_hours)
      VALUES (?, ?, NOW(), ?, ?, ?, ?)
    `;

    const [result] = await db.pool.execute(query, [
      strategyId,
      strategyType,
      parseFloat(totalPl),
      parseFloat(totalPlMp),
      marketPrice ? parseFloat(marketPrice) : null,
      marketHours
    ]);

    res.status(201).json({
      success: true,
      message: "P/L history saved successfully",
      data: {
        id: result.insertId,
        strategyId,
        strategyType,
        timestamp: new Date().toISOString(),
        totalPl: parseFloat(totalPl),
        totalPlMp: parseFloat(totalPlMp),
        marketPrice: marketPrice ? parseFloat(marketPrice) : null,
        marketHours
      }
    });
  } catch (error) {
    console.error("Error saving strategy P/L history:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Get P/L history for multiple strategies
exports.getMultipleStrategiesPlHistory = async (req, res) => {
  try {
    const { strategyIds, strategyType = 'regular' } = req.body;
    const { startDate, endDate, limit = 1000 } = req.query;

    if (!strategyIds || !Array.isArray(strategyIds) || strategyIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "strategyIds array is required"
      });
    }

    const placeholders = strategyIds.map(() => '?').join(',');
    let query = `
      SELECT 
        id,
        strategy_id,
        strategy_type,
        timestamp,
        total_pl,
        total_pl_mp,
        market_price,
        market_hours,
        created_at
      FROM strategy_pl_history 
      WHERE strategy_id IN (${placeholders}) AND strategy_type = ?
    `;
    
    const queryParams = [...strategyIds, strategyType];

    // Add date range filter if provided
    if (startDate && endDate) {
      // Convert dates to proper datetime format for comparison
      const startDateTime = `${startDate} 00:00:00`;
      const endDateTime = `${endDate} 23:59:59`;
      
      query += ` AND timestamp BETWEEN ? AND ?`;
      queryParams.push(startDateTime, endDateTime);
      
    }

    // Order by strategy_id, then timestamp descending
    query += ` ORDER BY strategy_id, timestamp DESC`;

    // Add limit (use string concatenation to avoid MySQL prepared statement issues)
    if (limit) {
      const limitNum = parseInt(limit, 10);
      query += ` LIMIT ${limitNum}`;
    }


    const [rows] = await db.pool.execute(query, queryParams);

    // Group by strategy_id for easier frontend consumption
    const groupedData = rows.reduce((acc, row) => {
      if (!acc[row.strategy_id]) {
        acc[row.strategy_id] = [];
      }
      acc[row.strategy_id].push(row);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: groupedData,
      count: rows.length
    });
  } catch (error) {
    console.error("Error fetching multiple strategies P/L history:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Delete old P/L history data (cleanup)
exports.cleanupOldPlHistory = async (req, res) => {
  try {
    const { daysToKeep = 30 } = req.query;

    const query = `
      DELETE FROM strategy_pl_history 
      WHERE timestamp < DATE_SUB(NOW(), INTERVAL ? DAY)
    `;

    const [result] = await db.pool.execute(query, [parseInt(daysToKeep)]);

    res.status(200).json({
      success: true,
      message: `Cleaned up ${result.affectedRows} old P/L history records`,
      deletedCount: result.affectedRows
    });
  } catch (error) {
    console.error("Error cleaning up old P/L history:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};
