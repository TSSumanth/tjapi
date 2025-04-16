const db = require("../db");
const moment = require("moment");

exports.createStrategyNote = async (req, res) => {
    const { strategy_id, content, created_at } = req.body;

    try {
        // Validate required fields
        if (!strategy_id || !content) {
            return res.status(400).json({
                error: "Missing required fields: strategy_id and content"
            });
        }

        // Check if strategy exists
        const [strategy] = await db.pool.query(
            "SELECT id FROM strategies WHERE id = ?",
            [strategy_id]
        );

        if (strategy.length === 0) {
            return res.status(404).json({
                error: "Strategy not found"
            });
        }

        // Insert new note
        const [result] = await db.pool.query(
            "INSERT INTO strategy_notes (strategy_id, content, created_at) VALUES (?, ?, ?)",
            [strategy_id, content, created_at || new Date()]
        );

        if (result.affectedRows === 1) {
            const [newNote] = await db.pool.query(
                "SELECT * FROM strategy_notes WHERE id = ?",
                [result.insertId]
            );
            return res.status(201).json(newNote[0]);
        }

        return res.status(500).json({
            error: "Unable to create strategy note"
        });
    } catch (error) {
        console.error("Error creating strategy note:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

exports.getStrategyNotes = async (req, res) => {
    const { strategy_id } = req.query;

    try {
        if (!strategy_id) {
            return res.status(400).json({
                error: "Strategy ID is required"
            });
        }

        const [notes] = await db.pool.query(
            "SELECT * FROM strategy_notes WHERE strategy_id = ? ORDER BY created_at DESC",
            [strategy_id]
        );

        const formattedNotes = notes.map(note => ({
            ...note,
            created_at: moment(note.created_at).format("YYYY-MM-DD HH:mm:ss")
        }));

        return res.status(200).json(formattedNotes);
    } catch (error) {
        console.error("Error fetching strategy notes:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

exports.updateStrategyNote = async (req, res) => {
    const { id } = req.query;
    const { content } = req.body;

    try {
        if (!id || !content) {
            return res.status(400).json({
                error: "Note ID and updated content are required"
            });
        }

        const [result] = await db.pool.query(
            "UPDATE strategy_notes SET content = ? WHERE id = ?",
            [content, id]
        );

        if (result.affectedRows === 1) {
            return res.status(200).json({ message: "Strategy note updated successfully" });
        }

        return res.status(404).json({
            error: `No strategy note found with id: ${id}`
        });
    } catch (error) {
        console.error("Error updating strategy note:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

exports.deleteStrategyNote = async (req, res) => {
    const { id } = req.query;

    try {
        if (!id) {
            return res.status(400).json({
                error: "Note ID is required"
            });
        }

        const [result] = await db.pool.query(
            "DELETE FROM strategy_notes WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 1) {
            return res.status(200).json({ message: "Strategy note deleted successfully" });
        }

        return res.status(404).json({
            error: `No strategy note found with id: ${id}`
        });
    } catch (error) {
        console.error("Error deleting strategy note:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}; 