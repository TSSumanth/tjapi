const db = require('../db');

// Create a new automated order
exports.createAutomatedOrder = async (req, res) => {
    try {
        const {
            strategy_id,
            instrument_token,
            trading_symbol,
            exchange,
            product,
            quantity,
            transaction_type,
            validity,
            order_type,
            price,
            status,
            tags,
            notes,
            zerodha_orderid
        } = req.body;

        if (!instrument_token || !trading_symbol || !exchange || !product || !quantity || !transaction_type || !validity || !order_type || !status) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const [result] = await db.pool.query(
            `INSERT INTO automated_orders (strategy_id, instrument_token, trading_symbol, exchange, product, quantity, transaction_type, validity, order_type, price, status, tags, notes, zerodha_orderid)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [strategy_id, instrument_token, trading_symbol, exchange, product, quantity, transaction_type, validity, order_type, price, status, tags, notes, zerodha_orderid]
        );
        const [order] = await db.pool.query('SELECT * FROM automated_orders WHERE id = ?', [result.insertId]);
        res.status(201).json(order[0]);
    } catch (error) {
        console.error('Error creating automated order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get all automated orders
exports.getAutomatedOrders = async (req, res) => {
    try {
        const { strategy_id, status } = req.query;
        let query = 'SELECT * FROM automated_orders';
        const conditions = [];
        const values = [];
        if (strategy_id) {
            conditions.push('strategy_id = ?');
            values.push(strategy_id);
        }
        if (status) {
            conditions.push('status = ?');
            values.push(status);
        }
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        query += ' ORDER BY created_at DESC';
        const [orders] = await db.pool.query(query, values);
        res.status(200).json(orders);
    } catch (error) {
        console.error('Error fetching automated orders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get a single automated order by ID
exports.getAutomatedOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const [orders] = await db.pool.query('SELECT * FROM automated_orders WHERE id = ?', [id]);
        if (orders.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.status(200).json(orders[0]);
    } catch (error) {
        console.error('Error fetching automated order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update an automated order
exports.updateAutomatedOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const fields = req.body;
        const allowedFields = [
            'strategy_id', 'instrument_token', 'trading_symbol', 'exchange', 'product', 'quantity',
            'transaction_type', 'validity', 'order_type', 'price', 'status', 'tags', 'notes', 'zerodha_orderid'
        ];
        const updates = [];
        const values = [];
        for (const key of allowedFields) {
            if (fields[key] !== undefined) {
                updates.push(`${key} = ?`);
                values.push(fields[key]);
            }
        }
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        values.push(id);
        await db.pool.query(`UPDATE automated_orders SET ${updates.join(', ')} WHERE id = ?`, values);
        const [orders] = await db.pool.query('SELECT * FROM automated_orders WHERE id = ?', [id]);
        res.status(200).json(orders[0]);
    } catch (error) {
        console.error('Error updating automated order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete an automated order
exports.deleteAutomatedOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.pool.query('DELETE FROM automated_orders WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.status(200).json({ message: 'Order deleted successfully' });
    } catch (error) {
        console.error('Error deleting automated order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}; 