const db = require('../db');

// Create a new order pair
exports.createOrderPair = async (req, res) => {
    const { order1_id, order2_id, type = 'OCO', status = 'active' } = req.body;
    if (!order1_id || !order2_id) {
        return res.status(400).json({ error: 'order1_id and order2_id are required' });
    }
    try {
        const sql = 'INSERT INTO order_pairs (order1_id, order2_id, type, status) VALUES (?, ?, ?, ?)';
        const [result] = await db.pool.query(sql, [order1_id, order2_id, type, status]);
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

// Update status of an order pair
exports.updateOrderPairStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!id || !status) return res.status(400).json({ error: 'id and status are required' });
    try {
        const [result] = await db.pool.query('UPDATE order_pairs SET status = ? WHERE id = ?', [status, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Order pair not found' });
        }
        const [rows] = await db.pool.query('SELECT * FROM order_pairs WHERE id = ?', [id]);
        return res.status(200).json(rows[0]);
    } catch (err) {
        console.error('Error updating order pair status:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}; 