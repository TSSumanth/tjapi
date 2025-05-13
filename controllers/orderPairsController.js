const db = require('../db');

// Create a new order pair
exports.createOrderPair = async (req, res) => {
    const {
        order1_id,
        order2_id,
        type = 'OCO',
        status = 'active',
        order1_details,
        order2_details
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
            order1_details, order2_details
        ) VALUES (?, ?, ?, ?, ?, ?)`;

        const [result] = await db.pool.query(sql, [
            order1_id,
            order2_id,
            type,
            status,
            JSON.stringify(order1_details),
            JSON.stringify(order2_details)
        ]);

        const [rows] = await db.pool.query('SELECT * FROM order_pairs WHERE id = ?', [result.insertId]);
        return res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Error creating order pair:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Get all order pairs with optional status filter
exports.getOrderPairs = async (req, res) => {
    const { status } = req.query;
    try {
        let sql = 'SELECT * FROM order_pairs';
        const params = [];

        if (status) {
            sql += ' WHERE status = ?';
            params.push(status);
        }

        sql += ' ORDER BY created_at DESC';

        const [rows] = await db.pool.query(sql, params);
        return res.json(rows);
    } catch (err) {
        console.error('Error fetching order pairs:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Get completed order pairs
exports.getCompletedOrderPairs = async (req, res) => {
    try {
        const [rows] = await db.pool.query(
            'SELECT * FROM order_pairs WHERE status = ? ORDER BY created_at DESC',
            ['COMPLETED']
        );
        return res.json(rows);
    } catch (err) {
        console.error('Error fetching completed order pairs:', err);
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
        'order1_details',
        'order2_details',
        'order2_id'
    ];
    const updates = [];
    const values = [];
    for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
            updates.push(`${field} = ?`);
            // Only stringify the details fields, not the status or order2_id
            if (field === 'status' || field === 'order2_id') {
                values.push(req.body[field]);
            } else {
                values.push(JSON.stringify(req.body[field]));
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