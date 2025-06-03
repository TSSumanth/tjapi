const db = require('../db');

// Create a new note
exports.createNote = async (req, res) => {
    try {
        const { strategyid, notes } = req.body;
        if (!strategyid || !notes) {
            return res.status(400).json({ error: 'strategyid and notes are required' });
        }
        const [result] = await db.pool.query(
            'INSERT INTO algo_strategy_notes (strategyid, notes) VALUES (?, ?)',
            [strategyid, notes]
        );
        const [note] = await db.pool.query('SELECT * FROM algo_strategy_notes WHERE id = ?', [result.insertId]);
        res.status(201).json(note[0]);
    } catch (error) {
        console.error('Error creating note:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get all notes for a strategy
exports.getNotesByStrategyId = async (req, res) => {
    try {
        const { strategyid } = req.params;
        const [notes] = await db.pool.query(
            'SELECT * FROM algo_strategy_notes WHERE strategyid = ? ORDER BY timestamp DESC',
            [strategyid]
        );
        res.status(200).json(notes);
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get a single note by id
exports.getNoteById = async (req, res) => {
    try {
        const { id } = req.params;
        const [notes] = await db.pool.query('SELECT * FROM algo_strategy_notes WHERE id = ?', [id]);
        if (notes.length === 0) {
            return res.status(404).json({ error: 'Note not found' });
        }
        res.status(200).json(notes[0]);
    } catch (error) {
        console.error('Error fetching note:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete a note
exports.deleteNote = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.pool.query('DELETE FROM algo_strategy_notes WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Note not found' });
        }
        res.status(200).json({ message: 'Note deleted successfully' });
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}; 