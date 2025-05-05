const db = require('../db');

// Create a new order pair
exports.createOrderPair = async (req, res) => {
    const {
        order1_id,
        order2_id,
        type = 'OCO',
        status = 'active',
        // Order 1 details
        order1_details,
        order1_tradingsymbol,
        order1_transaction_type,
        order1_quantity,
        order1_price,
        order1_product,
        order1_order_type,
        order1_validity,
        // Order 2 details
        order2_details,
        order2_tradingsymbol,
        order2_transaction_type,
        order2_quantity,
        order2_price,
        order2_product,
        order2_order_type,
        order2_validity
    } = req.body;

    // Validate required fields based on order type
    if (!order1_id) {
        return res.status(400).json({ error: 'order1_id is required' });
    }

    if (type === 'OCO') {
        if (!order2_id) {
            return res.status(400).json({ error: 'order2_id is required for OCO orders' });
        }
        if (!order1_details || !order2_details) {
            return res.status(400).json({ error: 'order1_details and order2_details are required for OCO orders' });
        }
    } else if (type === 'OAO') {
        if (!order2_details) {
            return res.status(400).json({ error: 'order2_details is required for OAO orders' });
        }
    }

    try {
        const sql = `INSERT INTO order_pairs (
            order1_id, order2_id, type, status,
            order1_details, order1_tradingsymbol, order1_transaction_type, order1_quantity, 
            order1_price, order1_product, order1_order_type, order1_validity,
            order2_details, order2_tradingsymbol, order2_transaction_type, order2_quantity,
            order2_price, order2_product, order2_order_type, order2_validity
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const [result] = await db.pool.query(sql, [
            order1_id,
            order2_id,
            type,
            status,
            JSON.stringify(order1_details),
            order1_tradingsymbol,
            order1_transaction_type,
            order1_quantity,
            order1_price,
            order1_product,
            order1_order_type,
            order1_validity,
            JSON.stringify(order2_details),
            order2_tradingsymbol,
            order2_transaction_type,
            order2_quantity,
            order2_price,
            order2_product,
            order2_order_type,
            order2_validity
        ]);

        const [rows] = await db.pool.query('SELECT * FROM order_pairs WHERE id = ?', [result.insertId]);
        return res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Error creating order pair:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Get all order pairs
exports.getOrderPairs = async (req, res) => {
    try {
        const [rows] = await db.pool.query('SELECT * FROM order_pairs ORDER BY created_at DESC');
        return res.status(200).json(rows);
    } catch (err) {
        console.error('Error fetching order pairs:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete (cancel) an order pair by id
exports.deleteOrderPair = async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'id param is required' });
    try {
        const [result] = await db.pool.query('DELETE FROM order_pairs WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Order pair not found' });
        }
        return res.status(204).send();
    } catch (err) {
        console.error('Error deleting order pair:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Update status and details of an order pair
exports.updateOrderPairStatus = async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'id param is required' });

    // Allowed fields to update
    const allowedFields = [
        'status',
        'order1_details', 'order1_tradingsymbol', 'order1_transaction_type', 'order1_quantity', 'order1_price', 'order1_product', 'order1_order_type', 'order1_validity',
        'order2_details', 'order2_tradingsymbol', 'order2_transaction_type', 'order2_quantity', 'order2_price', 'order2_product', 'order2_order_type', 'order2_validity'
    ];
    const updates = [];
    const values = [];
    for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
            if (field === 'order1_details' || field === 'order2_details') {
                updates.push(`${field} = ?`);
                values.push(JSON.stringify(req.body[field]));
            } else {
                updates.push(`${field} = ?`);
                values.push(req.body[field]);
            }
        }
    }
    if (updates.length === 0) {
        return res.status(400).json({ error: 'No valid fields provided for update' });
    }
    try {
        const sql = `UPDATE order_pairs SET ${updates.join(', ')} WHERE id = ?`;
        values.push(id);
        const [result] = await db.pool.query(sql, values);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Order pair not found' });
        }
        const [rows] = await db.pool.query('SELECT * FROM order_pairs WHERE id = ?', [id]);
        return res.status(200).json(rows[0]);
    } catch (err) {
        console.error('Error updating order pair:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}; 