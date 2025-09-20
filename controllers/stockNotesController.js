const db = require("../db");
const moment = require("moment");

exports.createStockNote = async (req, res) => {
    const { symbol, symbol_type, title, content, created_at } = req.body;

    try {
        // Validate required fields
        if (!symbol || !symbol_type || !title || !content) {
            return res.status(400).json({
                success: false,
                error: "Missing required fields: symbol, symbol_type, title and content"
            });
        }

        // Validate symbol_type
        if (!['STOCK', 'INDEX'].includes(symbol_type.toUpperCase())) {
            return res.status(400).json({
                success: false,
                error: "symbol_type must be either 'STOCK' or 'INDEX'"
            });
        }

        // Insert new stock note
        const [result] = await db.pool.query(
            "INSERT INTO stock_notes (symbol, symbol_type, title, content, created_at) VALUES (?, ?, ?, ?, ?)",
            [symbol.toUpperCase(), symbol_type.toUpperCase(), title, content, created_at || new Date()]
        );

        if (result.affectedRows === 1) {
            const [newNote] = await db.pool.query(
                "SELECT * FROM stock_notes WHERE id = ?",
                [result.insertId]
            );
            return res.status(201).json({
                success: true,
                data: newNote[0]
            });
        }

        return res.status(500).json({
            success: false,
            error: "Unable to create stock note"
        });
    } catch (error) {
        console.error("Error creating stock note:", error);
        return res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
};

exports.getStockNotes = async (req, res) => {
    try {
        const [notes] = await db.pool.query(
            "SELECT * FROM stock_notes ORDER BY symbol, created_at DESC"
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
        console.error("Error fetching stock notes:", error);
        return res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
};

exports.getStockNotesBySymbol = async (req, res) => {
    const { symbol } = req.params;

    try {
        if (!symbol) {
            return res.status(400).json({
                success: false,
                error: "Symbol is required"
            });
        }

        const [notes] = await db.pool.query(
            "SELECT * FROM stock_notes WHERE symbol = ? ORDER BY created_at DESC",
            [symbol.toUpperCase()]
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
        console.error("Error fetching stock notes by symbol:", error);
        return res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
};

exports.getStockNoteById = async (req, res) => {
    const { id } = req.params;

    try {
        if (!id) {
            return res.status(400).json({
                success: false,
                error: "Note ID is required"
            });
        }

        const [notes] = await db.pool.query(
            "SELECT * FROM stock_notes WHERE id = ?",
            [id]
        );

        if (notes.length === 0) {
            return res.status(404).json({
                success: false,
                error: `No stock note found with id: ${id}`
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
        console.error("Error fetching stock note:", error);
        return res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
};

exports.updateStockNote = async (req, res) => {
    const { id } = req.params;
    const { symbol, symbol_type, title, content } = req.body;

    try {
        if (!id) {
            return res.status(400).json({
                success: false,
                error: "Note ID is required"
            });
        }

        if (!symbol || !symbol_type || !title || !content) {
            return res.status(400).json({
                success: false,
                error: "Symbol, symbol_type, title and content are required"
            });
        }

        // Validate symbol_type
        if (!['STOCK', 'INDEX'].includes(symbol_type.toUpperCase())) {
            return res.status(400).json({
                success: false,
                error: "symbol_type must be either 'STOCK' or 'INDEX'"
            });
        }

        const [result] = await db.pool.query(
            "UPDATE stock_notes SET symbol = ?, symbol_type = ?, title = ?, content = ?, updated_at = ? WHERE id = ?",
            [symbol.toUpperCase(), symbol_type.toUpperCase(), title, content, new Date(), id]
        );

        if (result.affectedRows === 1) {
            return res.status(200).json({ 
                success: true,
                message: "Stock note updated successfully" 
            });
        }

        return res.status(404).json({
            success: false,
            error: `No stock note found with id: ${id}`
        });
    } catch (error) {
        console.error("Error updating stock note:", error);
        return res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
};

exports.deleteStockNote = async (req, res) => {
    const { id } = req.params;

    try {
        if (!id) {
            return res.status(400).json({
                success: false,
                error: "Note ID is required"
            });
        }

        const [result] = await db.pool.query(
            "DELETE FROM stock_notes WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 1) {
            return res.status(200).json({ 
                success: true,
                message: "Stock note deleted successfully" 
            });
        }

        return res.status(404).json({
            success: false,
            error: `No stock note found with id: ${id}`
        });
    } catch (error) {
        console.error("Error deleting stock note:", error);
        return res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
};

exports.getStockNotesGrouped = async (req, res) => {
    try {
        const [notes] = await db.pool.query(
            "SELECT * FROM stock_notes ORDER BY symbol_type, symbol, created_at DESC"
        );

        const formattedNotes = notes.map(note => ({
            ...note,
            created_at: moment(note.created_at).format("YYYY-MM-DD HH:mm:ss"),
            updated_at: note.updated_at ? moment(note.updated_at).format("YYYY-MM-DD HH:mm:ss") : null
        }));

        // Group notes by symbol
        const groupedNotes = formattedNotes.reduce((acc, note) => {
            const key = note.symbol;
            if (!acc[key]) {
                acc[key] = {
                    symbol: note.symbol,
                    symbol_type: note.symbol_type,
                    notes: []
                };
            }
            acc[key].notes.push(note);
            return acc;
        }, {});

        // Convert to array and sort
        const result = Object.values(groupedNotes).sort((a, b) => {
            // First sort by symbol_type (STOCK before INDEX)
            if (a.symbol_type !== b.symbol_type) {
                return a.symbol_type === 'STOCK' ? -1 : 1;
            }
            // Then sort by symbol name
            return a.symbol.localeCompare(b.symbol);
        });

        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error("Error fetching grouped stock notes:", error);
        return res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
};
