const db = require("../db");
const moment = require("moment");

exports.createStrategyNote = (req, res) => {
    const { strategy_id, content } = req.body;

    if (!strategy_id) {
        return res.status(400).json({
            error: "Missing required field: strategy_id"
        });
    }

    if (!content) {
        return res.status(400).json({
            error: "Missing required field: content"
        });
    }

    const created_at = new Date();

    const sql = "INSERT INTO strategy_notes (strategy_id, content, created_at) VALUES (?, ?, ?)";

    db.query(sql, [strategy_id, content, created_at], async (err, result) => {
        if (err) return res.status(500).json(err);

        if (result.affectedRows === 1) {
            const [newNote] = await db.promise().query("SELECT * FROM strategy_notes WHERE id = ?", [result.insertId]);
            return res.status(201).json(newNote[0]);
        }

        res.status(500).json({ error: "Unable to create note" });
    });
};

exports.getStrategyNotes = (req, res) => {
    const { strategy_id } = req.query;

    if (!strategy_id) {
        return res.status(400).json({
            error: "Missing required field: strategy_id"
        });
    }

    const sql = "SELECT * FROM strategy_notes WHERE strategy_id = ? ORDER BY created_at DESC";

    db.query(sql, [strategy_id], (err, results) => {
        if (err) return res.status(500).json(err);

        const formattedResults = results.map(note => ({
            ...note,
            created_at: moment(note.created_at).format("YYYY-MM-DD HH:mm:ss")
        }));

        res.status(200).json(formattedResults);
    });
};

exports.updateStrategyNote = (req, res) => {
    const { id } = req.query;
    const { content } = req.body;

    if (!id) {
        return res.status(400).json({
            error: "Missing required field: id"
        });
    }

    if (!content) {
        return res.status(400).json({
            error: "Missing required field: content"
        });
    }

    const sql = "UPDATE strategy_notes SET content = ? WHERE id = ?";

    db.query(sql, [content, id], (err, result) => {
        if (err) return res.status(500).json(err);

        if (result.affectedRows === 1) {
            return res.status(200).json({ message: "Note updated successfully" });
        }

        res.status(404).json({ error: "Note not found" });
    });
};

exports.deleteStrategyNote = (req, res) => {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({
            error: "Missing required field: id"
        });
    }

    const sql = "DELETE FROM strategy_notes WHERE id = ?";

    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json(err);

        if (result.affectedRows === 1) {
            return res.status(204).json();
        }

        res.status(404).json({ error: "Note not found" });
    });
}; 