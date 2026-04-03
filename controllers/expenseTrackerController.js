const db = require("../db");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateString(s) {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(s + "T12:00:00");
  return !Number.isNaN(d.getTime());
}

function parseAmount(v) {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  if (Number.isNaN(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

exports.list = async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to || !isValidDateString(from) || !isValidDateString(to)) {
    return res.status(400).json({
      success: false,
      error: "Query params 'from' and 'to' are required (YYYY-MM-DD).",
    });
  }
  if (from > to) {
    return res.status(400).json({
      success: false,
      error: "'from' must be on or before 'to'.",
    });
  }

  try {
    const [rows] = await db.pool.query(
      `SELECT
        DATE_FORMAT(expense_date, '%Y-%m-%d') AS expense_date,
        stt, exchange_charges, brokerage, others, notes,
        created_at, updated_at
      FROM daily_trading_expenses
      WHERE expense_date >= ? AND expense_date <= ?
      ORDER BY expense_date DESC`,
      [from, to]
    );

    const data = rows.map((row) => ({
      ...row,
      stt: Number(row.stt),
      exchange_charges: Number(row.exchange_charges),
      brokerage: Number(row.brokerage),
      others: Number(row.others),
      row_total:
        Number(row.stt) +
        Number(row.exchange_charges) +
        Number(row.brokerage) +
        Number(row.others),
    }));

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("expenseTracker list:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

exports.summary = async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to || !isValidDateString(from) || !isValidDateString(to)) {
    return res.status(400).json({
      success: false,
      error: "Query params 'from' and 'to' are required (YYYY-MM-DD).",
    });
  }
  if (from > to) {
    return res.status(400).json({
      success: false,
      error: "'from' must be on or before 'to'.",
    });
  }

  try {
    const [[totals]] = await db.pool.query(
      `SELECT
        COALESCE(SUM(stt), 0) AS stt,
        COALESCE(SUM(exchange_charges), 0) AS exchange_charges,
        COALESCE(SUM(brokerage), 0) AS brokerage,
        COALESCE(SUM(others), 0) AS others
      FROM daily_trading_expenses
      WHERE expense_date >= ? AND expense_date <= ?`,
      [from, to]
    );

    const stt = Number(totals.stt);
    const exchange_charges = Number(totals.exchange_charges);
    const brokerage = Number(totals.brokerage);
    const others = Number(totals.others);
    const grandTotal = stt + exchange_charges + brokerage + others;

    const [byMonth] = await db.pool.query(
      `SELECT
        DATE_FORMAT(expense_date, '%Y-%m') AS ym,
        COALESCE(SUM(stt), 0) AS stt,
        COALESCE(SUM(exchange_charges), 0) AS exchange_charges,
        COALESCE(SUM(brokerage), 0) AS brokerage,
        COALESCE(SUM(others), 0) AS others
      FROM daily_trading_expenses
      WHERE expense_date >= ? AND expense_date <= ?
      GROUP BY DATE_FORMAT(expense_date, '%Y-%m')
      ORDER BY ym ASC`,
      [from, to]
    );

    const byMonthFormatted = byMonth.map((row) => ({
      ym: row.ym,
      stt: Number(row.stt),
      exchange_charges: Number(row.exchange_charges),
      brokerage: Number(row.brokerage),
      others: Number(row.others),
      monthTotal:
        Number(row.stt) +
        Number(row.exchange_charges) +
        Number(row.brokerage) +
        Number(row.others),
    }));

    return res.status(200).json({
      success: true,
      data: {
        totals: { stt, exchange_charges, brokerage, others, grandTotal },
        byMonth: byMonthFormatted,
      },
    });
  } catch (err) {
    console.error("expenseTracker summary:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

exports.upsert = async (req, res) => {
  const { date } = req.params;
  if (!isValidDateString(date)) {
    return res.status(400).json({
      success: false,
      error: "Invalid date in path (use YYYY-MM-DD).",
    });
  }

  const { stt, exchange_charges, brokerage, others, notes } = req.body || {};

  const a1 = parseAmount(stt);
  const a2 = parseAmount(exchange_charges);
  const a3 = parseAmount(brokerage);
  const a4 = parseAmount(others);
  if ([a1, a2, a3, a4].some((x) => x === null)) {
    return res.status(400).json({
      success: false,
      error: "Amounts must be non-negative numbers.",
    });
  }

  const notesVal =
    notes === null || notes === undefined
      ? null
      : String(notes).trim() === ""
        ? null
        : String(notes).trim();

  try {
    await db.pool.query(
      `INSERT INTO daily_trading_expenses
        (expense_date, stt, exchange_charges, brokerage, others, notes)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        stt = VALUES(stt),
        exchange_charges = VALUES(exchange_charges),
        brokerage = VALUES(brokerage),
        others = VALUES(others),
        notes = VALUES(notes)`,
      [date, a1, a2, a3, a4, notesVal]
    );

    const [[row]] = await db.pool.query(
      `SELECT
        DATE_FORMAT(expense_date, '%Y-%m-%d') AS expense_date,
        stt, exchange_charges, brokerage, others, notes,
        created_at, updated_at
      FROM daily_trading_expenses
      WHERE expense_date = ?`,
      [date]
    );

    const payload = {
      ...row,
      stt: Number(row.stt),
      exchange_charges: Number(row.exchange_charges),
      brokerage: Number(row.brokerage),
      others: Number(row.others),
      row_total:
        Number(row.stt) +
        Number(row.exchange_charges) +
        Number(row.brokerage) +
        Number(row.others),
    };

    return res.status(200).json({
      success: true,
      message: "Saved",
      data: payload,
    });
  } catch (err) {
    console.error("expenseTracker upsert:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

exports.remove = async (req, res) => {
  const { date } = req.params;
  if (!isValidDateString(date)) {
    return res.status(400).json({
      success: false,
      error: "Invalid date in path (use YYYY-MM-DD).",
    });
  }

  try {
    const [result] = await db.pool.query(
      "DELETE FROM daily_trading_expenses WHERE expense_date = ?",
      [date]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: "No entry for that date.",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Deleted",
    });
  } catch (err) {
    console.error("expenseTracker remove:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};
