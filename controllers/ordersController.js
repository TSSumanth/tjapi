const db = require("../db");
const moment = require("moment");

// exports.createOrder = async (req, res) => {
//   const {
//     tradeid,
//     asset,
//     tradetype,
//     quantity,
//     price,
//     date,
//     status,
//     orderid,
//     ltp
//   } = req.body;

//   try {
//     // Validate required fields
//     if (!tradeid || !asset || !tradetype || !quantity || !price || !date || !status || !orderid) {
//       return res.status(400).json({
//         error: "Missing required fields"
//       });
//     }

//     // Validate status
//     if (!(status.toUpperCase() === "OPEN" || status.toUpperCase() === "CLOSED")) {
//       return res.status(400).json({
//         error: `Incorrect value ${status.toUpperCase()} in status: Status can only be OPEN or CLOSED`
//       });
//     }

//     // Validate trade type
//     if (!(tradetype.toUpperCase() === "LONG" || tradetype.toUpperCase() === "SHORT")) {
//       return res.status(400).json({
//         error: `Incorrect value ${tradetype.toUpperCase()} in tradetype: Trade type can only be LONG or SHORT`
//       });
//     }

//     // Insert new order
//     const [result] = await db.pool.query(
//       "INSERT INTO orders (tradeid, asset, tradetype, quantity, price, date, status, orderid, ltp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
//       [tradeid, asset, tradetype.toUpperCase(), quantity, price, date, status.toUpperCase(), orderid, ltp]
//     );

//     if (result.affectedRows === 1) {
//       const [newOrder] = await db.pool.query(
//         "SELECT * FROM orders WHERE orderid = ?",
//         [orderid]
//       );
//       return res.status(201).json(newOrder[0]);
//     }

//     return res.status(500).json({
//       error: "Unable to create order"
//     });
//   } catch (error) {
//     console.error("Error creating order:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

// exports.getOrders = async (req, res) => {
//   const { tradeid, start_date, end_date, status } = req.query;

//   try {
//     let query = "SELECT * FROM orders";
//     const params = [];

//     if (tradeid) {
//       query += " WHERE tradeid = ?";
//       params.push(tradeid);
//     }

//     if (start_date && end_date) {
//       query += tradeid ? " AND" : " WHERE";
//       query += " date BETWEEN ? AND ?";
//       params.push(start_date, end_date);
//     }

//     if (status) {
//       query += (tradeid || (start_date && end_date)) ? " AND" : " WHERE";
//       query += " status = ?";
//       params.push(status.toUpperCase());
//     }

//     query += " ORDER BY date DESC";

//     const [orders] = await db.pool.query(query, params);
//     return res.status(200).json(orders);
//   } catch (error) {
//     console.error("Error fetching orders:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

// exports.updateOrder = async (req, res) => {
//   const { orderid } = req.query;
//   const {
//     tradeid,
//     asset,
//     tradetype,
//     quantity,
//     price,
//     date,
//     status,
//     ltp
//   } = req.body;

//   try {
//     // Check if order exists
//     const [existingOrder] = await db.pool.query(
//       "SELECT * FROM orders WHERE orderid = ?",
//       [orderid]
//     );

//     if (existingOrder.length === 0) {
//       return res.status(404).json({
//         error: "Order not found"
//       });
//     }

//     // Validate status if provided
//     if (status && !(status.toUpperCase() === "OPEN" || status.toUpperCase() === "CLOSED")) {
//       return res.status(400).json({
//         error: `Incorrect value ${status.toUpperCase()} in status: Status can only be OPEN or CLOSED`
//       });
//     }

//     // Validate trade type if provided
//     if (tradetype && !(tradetype.toUpperCase() === "LONG" || tradetype.toUpperCase() === "SHORT")) {
//       return res.status(400).json({
//         error: `Incorrect value ${tradetype.toUpperCase()} in tradetype: Trade type can only be LONG or SHORT`
//       });
//     }

//     // Build update query
//     const updateFields = [];
//     const updateValues = [];

//     if (tradeid) {
//       updateFields.push("tradeid = ?");
//       updateValues.push(tradeid);
//     }
//     if (asset) {
//       updateFields.push("asset = ?");
//       updateValues.push(asset);
//     }
//     if (tradetype) {
//       updateFields.push("tradetype = ?");
//       updateValues.push(tradetype.toUpperCase());
//     }
//     if (quantity) {
//       updateFields.push("quantity = ?");
//       updateValues.push(quantity);
//     }
//     if (price) {
//       updateFields.push("price = ?");
//       updateValues.push(price);
//     }
//     if (date) {
//       updateFields.push("date = ?");
//       updateValues.push(date);
//     }
//     if (status) {
//       updateFields.push("status = ?");
//       updateValues.push(status.toUpperCase());
//     }
//     if (ltp !== undefined) {
//       updateFields.push("ltp = ?");
//       updateValues.push(ltp);
//     }

//     if (updateFields.length === 0) {
//       return res.status(400).json({ message: "No fields to update" });
//     }

//     updateValues.push(orderid);

//     const [result] = await db.pool.query(
//       `UPDATE orders SET ${updateFields.join(", ")} WHERE orderid = ?`,
//       updateValues
//     );

//     if (result.affectedRows === 1) {
//       return res.status(200).json({ message: "Order updated successfully" });
//     }

//     return res.status(500).json({ error: "Unable to update order" });
//   } catch (error) {
//     console.error("Error updating order:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

// exports.deleteOrder = async (req, res) => {
//   const { orderid } = req.query;

//   try {
//     const [result] = await db.pool.query(
//       "DELETE FROM orders WHERE orderid = ?",
//       [orderid]
//     );

//     if (result.affectedRows === 1) {
//       return res.status(200).json({ message: "Order deleted successfully" });
//     }

//     return res.status(404).json({
//       error: `No order found with id: ${orderid}`
//     });
//   } catch (error) {
//     console.error("Error deleting order:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

exports.createStockOrder = async (req, res) => {
  const { asset, ordertype, quantity, price, date, tradeid } = req.body;
  let notes = "",
    tags = "";
  // Validate mandatory fields
  if (!asset || !ordertype || !quantity || !price || !date || !tradeid) {
    return res.status(400).json({
      error:
        "Missing required fields: asset, ordertype, quantity, price, date, tradeid",
    });
  }
  if (!(ordertype.toUpperCase() === "BUY" || ordertype.toUpperCase() === "SELL")) {
    return res.status(400).json({
      error: `Incorrect value ${ordertype.toUpperCase()} in ordertype: OrderType can only be BUY or SELL`,
    });
  }

  // Validate price
  const priceNum = Number(price);
  if (isNaN(priceNum)) {
    return res.status(400).json({ error: "Invalid price value" });
  }

  if (req.body.notes !== undefined) notes = req.body.notes;
  if (req.body.tags !== undefined) tags = req.body.tags;
  try {
    const sql =
      "INSERT INTO stock_orders (asset, ordertype, quantity, price, date, tradeid, notes, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
    const [result] = await db.pool.query(
      sql,
      [asset, ordertype.toUpperCase(), quantity, priceNum, date, tradeid, notes, tags]
    );

    if (result.affectedRows === 1) {
      const [newRecord] = await db.pool.query("SELECT * FROM stock_orders WHERE id = ?", [result.insertId]);
      return res.status(201).json(newRecord[0]);
    }
    return res.status(500).json({ message: "Internal server error" });
  } catch (error) {
    console.error("Error creating order:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getStockOrders = (req, res) => {
  let { id, asset, ordertype, startDate, endDate, tradeid, tags } = req.query;
  let params = [];
  let query = "SELECT * FROM stock_orders WHERE 1=1";
  if (id !== undefined)
    query = `SELECT * FROM stock_orders where id = ${id}`; // if id is passed all other params are ignored
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
    if (ordertype) {
      query += " AND ordertype = ?";
      params.push(ordertype.toUpperCase());
    }
    if (startDate) {
      query += " AND date >= ?";
      params.push(startDate);
    }
    if (endDate) {
      query += " AND date <= ?";
      params.push(endDate);
    }
    if (tradeid) {
      query += " AND tradeid = ?";
      params.push(tradeid);
    }
    if (tags) {
      if (Array.isArray(tags)) {
        // to handle multiple tags
        query += ` AND tags REGEXP ?`;
        params.push(tags.join("|")); // Convert array to REGEXP pattern
      } else {
        query += " AND tags REGEXP ?";
        params.push(tags);
      }
    }
  }
  query += " ORDER BY date DESC";
  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json(err);
    const formattedresults = results.map((results) => ({
      ...results,
      date: moment(results.date).format("YYYY-MM-DD"), // Format to YYYY-MM-DD
    }));
    res.status(200).json(formattedresults);
  });
};

exports.deleteStockOrder = async (req, res) => {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({
      error: "Missing required parameter: id"
    });
  }

  try {
    // Check if order exists first
    const [existingOrder] = await db.pool.query(
      "SELECT * FROM stock_orders WHERE id = ?",
      [id]
    );

    if (existingOrder.length === 0) {
      return res.status(404).json({
        error: `No stock order found with id: ${id}`
      });
    }

    const [result] = await db.pool.query(
      "DELETE FROM stock_orders WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 1) {
      return res.status(204).send();
    }

    return res.status(500).json({
      error: `Unable to delete stock order with id: ${id}`
    });
  } catch (error) {
    console.error("Error deleting stock order:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};

exports.updateStockOrder = async (req, res) => {
  const { id } = req.query;
  if (id === undefined) {
    return res.status(400).json({
      status: "fail",
      error: "id param is required"
    });
  }

  try {
    // Check if order exists
    const [existingOrder] = await db.pool.query(
      "SELECT * FROM stock_orders WHERE id = ?",
      [id]
    );

    if (existingOrder.length === 0) {
      return res.status(404).json({ error: "No order found with id: " + id });
    }

    const {
      asset,
      ordertype,
      quantity,
      price,
      date,
      tradeid,
      notes,
      tags
    } = req.body;

    // Build the query string to update the order
    let updateFields = [];
    let updateValues = [];

    if (asset !== undefined) {
      updateFields.push("asset");
      updateValues.push(asset);
    }
    if (ordertype !== undefined) {
      updateFields.push("ordertype");
      updateValues.push(ordertype.toUpperCase());
    }
    if (quantity !== undefined) {
      updateFields.push("quantity");
      updateValues.push(quantity);
    }
    if (price !== undefined) {
      updateFields.push("price");
      const priceNum = Number(price);
      if (isNaN(priceNum)) {
        return res.status(400).json({ error: "Invalid price value" });
      }
      updateValues.push(priceNum);
    }
    if (date !== undefined) {
      updateFields.push("date");
      updateValues.push(date);
    }
    if (tradeid !== undefined) {
      updateFields.push("tradeid");
      updateValues.push(tradeid);
    }
    if (notes !== undefined) {
      updateFields.push("notes");
      updateValues.push(notes);
    }
    if (tags !== undefined) {
      updateFields.push("tags");
      updateValues.push(tags);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const sqlQuery = `
      UPDATE stock_orders
      SET ${updateFields.map(field => `${field} = ?`).join(", ")}
      WHERE id = ?
    `;
    updateValues.push(id);

    const [result] = await db.pool.query(sqlQuery, updateValues);

    if (result.affectedRows === 1) {
      return res.status(200).json({ message: "Order updated successfully" });
    }

    return res.status(500).json({ error: `Unable to update order: ${id}` });
  } catch (error) {
    console.error("Error updating order:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.createOptionOrder = async (req, res) => {
  try {
    console.log('Creating option order with data:', req.body);
    const { asset, ordertype, quantity, price, date, tradeid, lotsize } = req.body;
    let notes = "",
      tags = "";

    // Validate mandatory fields
    if (!asset || !ordertype || !quantity || !price || !date || !tradeid || !lotsize) {
      console.log('Missing required fields');
      return res.status(400).json({
        error: "Missing required fields: asset, ordertype, quantity, price, date, tradeid, lotsize"
      });
    }

    if (!(ordertype.toUpperCase() === "BUY" || ordertype.toUpperCase() === "SELL")) {
      console.log('Invalid ordertype:', ordertype);
      return res.status(400).json({
        error: `Incorrect value ${ordertype.toUpperCase()} in ordertype: OrderType can only be BUY or SELL`
      });
    }

    // Validate price
    const priceNum = Number(price);
    if (isNaN(priceNum)) {
      return res.status(400).json({ error: "Invalid price value" });
    }

    if (req.body.notes !== undefined) notes = req.body.notes;
    if (req.body.tags !== undefined) tags = req.body.tags;

    console.log('Building SQL query');
    const sql = `
      INSERT INTO option_orders 
      (asset, ordertype, quantity, price, date, tradeid, notes, tags, lotsize) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      asset,
      ordertype.toUpperCase(),
      quantity,
      priceNum,
      date,
      tradeid,
      notes,
      tags,
      lotsize
    ];

    console.log('Executing query with params:', params);
    const [result] = await db.pool.query(sql, params);
    console.log('Query result:', result);

    if (result.affectedRows === 1) {
      console.log('Order created successfully');
      const [newOrder] = await db.pool.query(
        "SELECT * FROM option_orders WHERE id = ?",
        [result.insertId]
      );
      return res.status(201).json(newOrder[0]);
    }

    console.log('Failed to create order');
    return res.status(500).json({ message: "Internal server error" });
  } catch (error) {
    console.error("Error creating order:", error);
    console.error("Error stack:", error.stack);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};

exports.getOptionOrders = async (req, res) => {
  try {
    console.log('getOptionOrders called with query params:', req.query);
    let { id, asset, ordertype, startDate, endDate, tradeid, tags } = req.query;
    let params = [];
    let query = "SELECT * FROM option_orders WHERE 1=1";

    if (id !== undefined) {
      console.log('Fetching by ID:', id);
      query = `SELECT * FROM option_orders WHERE id = ?`;
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
      if (ordertype) {
        query += " AND ordertype = ?";
        params.push(ordertype.toUpperCase());
        console.log('Added ordertype filter:', ordertype.toUpperCase());
      }
      if (startDate) {
        query += " AND date >= ?";
        params.push(startDate);
        console.log('Added startDate filter:', startDate);
      }
      if (endDate) {
        query += " AND date <= ?";
        params.push(endDate);
        console.log('Added endDate filter:', endDate);
      }
      if (tradeid) {
        query += " AND tradeid = ?";
        params.push(tradeid);
        console.log('Added tradeid filter:', tradeid);
      }
      if (tags) {
        if (Array.isArray(tags)) {
          query += ` AND tags REGEXP ?`;
          params.push(tags.join("|"));
        } else {
          query += " AND tags REGEXP ?";
          params.push(tags);
        }
        console.log('Added tags filter:', tags);
      }
    }
    query += " ORDER BY date DESC";
    console.log('Final query:', query);
    console.log('Query parameters:', params);

    const [results] = await db.pool.query(query, params);
    console.log('Query results:', results);

    if (!results || results.length === 0) {
      console.log('No results found');
      return res.status(200).json([]);
    }

    const formattedresults = results.map((result) => ({
      ...result,
      date: moment(result.date).format("YYYY-MM-DD")
    }));

    console.log('Formatted results:', formattedresults);
    return res.status(200).json(formattedresults);
  } catch (error) {
    console.error('Error in getOptionOrders:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

exports.deleteOptionOrder = async (req, res) => {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({
      error: "Missing required parameter: id"
    });
  }

  try {
    // Check if order exists first
    const [existingOrder] = await db.pool.query(
      "SELECT * FROM option_orders WHERE id = ?",
      [id]
    );

    if (existingOrder.length === 0) {
      return res.status(404).json({
        error: `No option order found with id: ${id}`
      });
    }

    const [result] = await db.pool.query(
      "DELETE FROM option_orders WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 1) {
      return res.status(204).send();
    }

    return res.status(500).json({
      error: `Unable to delete option order with id: ${id}`
    });
  } catch (error) {
    console.error("Error deleting option order:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};

exports.updateOptionOrder = async (req, res) => {
  const { id } = req.query;
  if (id === undefined) {
    return res.status(400).json({
      status: "fail",
      error: "id param is required"
    });
  }

  try {
    // Check if order exists
    const [existingOrder] = await db.pool.query(
      "SELECT * FROM option_orders WHERE id = ?",
      [id]
    );

    if (existingOrder.length === 0) {
      return res.status(404).json({ error: "No order found with id: " + id });
    }

    const {
      asset,
      lotsize,
      strikeprize,
      ordertype,
      quantity,
      price,
      date,
      notes,
      tags,
      tradeid
    } = req.body;

    // Build the query string to update the order
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
    if (ordertype !== undefined) {
      updateFields.push("ordertype");
      updateValues.push(ordertype.toUpperCase());
    }
    if (quantity !== undefined) {
      updateFields.push("quantity");
      updateValues.push(quantity);
    }
    if (price !== undefined) {
      updateFields.push("price");
      // Convert to number and then to string to ensure proper decimal handling
      const priceNum = Number(price);
      if (isNaN(priceNum)) {
        return res.status(400).json({ error: "Invalid price value" });
      }
      updateValues.push(priceNum);
    }
    if (date !== undefined) {
      updateFields.push("date");
      updateValues.push(date);
    }
    if (notes !== undefined) {
      updateFields.push("notes");
      updateValues.push(notes);
    }
    if (tags !== undefined) {
      updateFields.push("tags");
      updateValues.push(tags);
    }
    if (tradeid !== undefined) {
      updateFields.push("tradeid");
      updateValues.push(tradeid);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const sqlQuery = `
      UPDATE option_orders
      SET ${updateFields.map(field => `${field} = ?`).join(", ")}
      WHERE id = ?
    `;
    updateValues.push(id);

    const [result] = await db.pool.query(sqlQuery, updateValues);

    if (result.affectedRows === 1) {
      return res.status(200).json({ message: "Order updated successfully" });
    }

    return res.status(500).json({ error: `Unable to update order: ${id}` });
  } catch (error) {
    console.error("Error updating order:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};