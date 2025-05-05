const db = require('../db');

// Create a new manual PL record
exports.createManualPl = async (req, res) => {
    const { AssetName, manual_pl = 0 } = req.body;
    if (!AssetName) return res.status(400).json({ error: 'AssetName is required' });
    try {
        const sql = 'INSERT INTO manual_pl (AssetName, manual_pl) VALUES (?, ?)';
        const [result] = await db.pool.query(sql, [AssetName, manual_pl]);
        const [rows] = await db.pool.query('SELECT * FROM manual_pl WHERE id = ?', [result.insertId]);
        return res.status(201).json(rows[0]);
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'AssetName already exists' });
        }
        console.error('Error creating manual PL:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Get manual PL record by id or AssetName
exports.getManualPl = async (req, res) => {
    const { id, AssetName } = req.query;
    if (!id && !AssetName) return res.status(400).json({ error: 'id or AssetName is required' });
    try {
        let sql, params;
        if (id) {
            sql = 'SELECT * FROM manual_pl WHERE id = ?';
            params = [id];
        } else {
            sql = 'SELECT * FROM manual_pl WHERE AssetName = ?';
            params = [AssetName];
        }
        const [rows] = await db.pool.query(sql, params);
        if (rows.length === 0) return res.status(404).json({ error: 'Record not found' });
        return res.status(200).json(rows[0]);
    } catch (err) {
        console.error('Error fetching manual PL:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Update manual PL record by id or AssetName
exports.updateManualPl = async (req, res) => {
    const { id, AssetName } = req.query;
    const { manual_pl } = req.body;
    if ((!id && !AssetName) || manual_pl === undefined) return res.status(400).json({ error: 'id or AssetName and manual_pl are required' });
    try {
        let sql, params;
        if (id) {
            sql = 'UPDATE manual_pl SET manual_pl = ?, last_updated_at = CURRENT_TIMESTAMP WHERE id = ?';
            params = [manual_pl, id];
        } else {
            sql = 'UPDATE manual_pl SET manual_pl = ?, last_updated_at = CURRENT_TIMESTAMP WHERE AssetName = ?';
            params = [manual_pl, AssetName];
        }
        const [result] = await db.pool.query(sql, params);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Record not found' });
        // Return updated record
        if (id) {
            const [rows] = await db.pool.query('SELECT * FROM manual_pl WHERE id = ?', [id]);
            return res.status(200).json(rows[0]);
        } else {
            const [rows] = await db.pool.query('SELECT * FROM manual_pl WHERE AssetName = ?', [AssetName]);
            return res.status(200).json(rows[0]);
        }
    } catch (err) {
        console.error('Error updating manual PL:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete manual PL record by id or AssetName
exports.deleteManualPl = async (req, res) => {
    const { id, AssetName } = req.query;
    if (!id && !AssetName) return res.status(400).json({ error: 'id or AssetName is required' });
    try {
        let sql, params;
        if (id) {
            sql = 'DELETE FROM manual_pl WHERE id = ?';
            params = [id];
        } else {
            sql = 'DELETE FROM manual_pl WHERE AssetName = ?';
            params = [AssetName];
        }
        const [result] = await db.pool.query(sql, params);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Record not found' });
        return res.status(204).send();
    } catch (err) {
        console.error('Error deleting manual PL:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}; 