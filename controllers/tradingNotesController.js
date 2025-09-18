const db = require("../db");
const moment = require("moment");

exports.createTradingNote = async (req, res) => {
    const { title, content, created_at } = req.body;

    try {
        // Validate required fields
        if (!title || !content) {
            return res.status(400).json({
                success: false,
                error: "Missing required fields: title and content"
            });
        }

        // Insert new trading note
        const [result] = await db.pool.query(
            "INSERT INTO trading_notes (title, content, created_at) VALUES (?, ?, ?)",
            [title, content, created_at || new Date()]
        );

        if (result.affectedRows === 1) {
            const [newNote] = await db.pool.query(
                "SELECT * FROM trading_notes WHERE id = ?",
                [result.insertId]
            );
            return res.status(201).json({
                success: true,
                data: newNote[0]
            });
        }

        return res.status(500).json({
            success: false,
            error: "Unable to create trading note"
        });
    } catch (error) {
        console.error("Error creating trading note:", error);
        return res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
};

exports.getTradingNotes = async (req, res) => {
    try {
        const [notes] = await db.pool.query(
            "SELECT * FROM trading_notes ORDER BY created_at DESC"
        );

        const formattedNotes = notes.map(note => ({
            ...note,
            created_at: moment(note.created_at).format("YYYY-MM-DD HH:mm:ss"),
            updated_at: note.updated_at ? moment(note.updated_at).format("YYYY-MM-DD HH:mm:ss") : null
        }));

        return res.status(200).json({
            success: true,
            data: formattedNotes
        });
    } catch (error) {
        console.error("Error fetching trading notes:", error);
        return res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
};

exports.getTradingNoteById = async (req, res) => {
    const { id } = req.params;

    try {
        if (!id) {
            return res.status(400).json({
                success: false,
                error: "Note ID is required"
            });
        }

        const [notes] = await db.pool.query(
            "SELECT * FROM trading_notes WHERE id = ?",
            [id]
        );

        if (notes.length === 0) {
            return res.status(404).json({
                success: false,
                error: `No trading note found with id: ${id}`
            });
        }

        const formattedNote = {
            ...notes[0],
            created_at: moment(notes[0].created_at).format("YYYY-MM-DD HH:mm:ss"),
            updated_at: notes[0].updated_at ? moment(notes[0].updated_at).format("YYYY-MM-DD HH:mm:ss") : null
        };

        return res.status(200).json({
            success: true,
            data: formattedNote
        });
    } catch (error) {
        console.error("Error fetching trading note:", error);
        return res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
};

exports.updateTradingNote = async (req, res) => {
    const { id } = req.params;
    const { title, content } = req.body;

    try {
        if (!id) {
            return res.status(400).json({
                success: false,
                error: "Note ID is required"
            });
        }

        if (!title || !content) {
            return res.status(400).json({
                success: false,
                error: "Title and content are required"
            });
        }

        const [result] = await db.pool.query(
            "UPDATE trading_notes SET title = ?, content = ?, updated_at = ? WHERE id = ?",
            [title, content, new Date(), id]
        );

        if (result.affectedRows === 1) {
            return res.status(200).json({ 
                success: true,
                message: "Trading note updated successfully" 
            });
        }

        return res.status(404).json({
            success: false,
            error: `No trading note found with id: ${id}`
        });
    } catch (error) {
        console.error("Error updating trading note:", error);
        return res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
};

exports.deleteTradingNote = async (req, res) => {
    const { id } = req.params;

    try {
        if (!id) {
            return res.status(400).json({
                success: false,
                error: "Note ID is required"
            });
        }

        const [result] = await db.pool.query(
            "DELETE FROM trading_notes WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 1) {
            return res.status(200).json({ 
                success: true,
                message: "Trading note deleted successfully" 
            });
        }

        return res.status(404).json({
            success: false,
            error: `No trading note found with id: ${id}`
        });
    } catch (error) {
        console.error("Error deleting trading note:", error);
        return res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
};
