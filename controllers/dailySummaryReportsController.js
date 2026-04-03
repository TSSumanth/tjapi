const moment = require('moment');
const dailySummaryService = require('../services/dailySummaryService');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validDate(s) {
  return typeof s === 'string' && DATE_RE.test(s) && moment(s, 'YYYY-MM-DD', true).isValid();
}

exports.getPreview = async (req, res) => {
  try {
    const { date } = req.query;
    if (!validDate(date)) {
      return res.status(400).json({
        success: false,
        error: "Query param 'date' is required (YYYY-MM-DD)."
      });
    }
    const raw = await dailySummaryService.getDailySummaryData(date);
    const data = dailySummaryService.formatForUIPreview(raw);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('dailySummaryReports getPreview:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.getSessions = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 30);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const endDate = validDate(req.query.endDate)
      ? req.query.endDate
      : moment().format('YYYY-MM-DD');

    const dates = await dailySummaryService.listSessionsPaginated(endDate, limit, offset);
    return res.status(200).json({ success: true, dates, limit, offset, endDate });
  } catch (error) {
    console.error('dailySummaryReports getSessions:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.getSessionsInRange = async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!validDate(from) || !validDate(to)) {
      return res.status(400).json({
        success: false,
        error: "Query params 'from' and 'to' are required (YYYY-MM-DD)."
      });
    }
    const diff = moment(to).diff(moment(from), 'days');
    if (diff < 0) {
      return res.status(400).json({
        success: false,
        error: "'from' must be on or before 'to'."
      });
    }
    if (diff > 30) {
      return res.status(400).json({
        success: false,
        error: 'Date range cannot exceed 31 calendar days (inclusive).'
      });
    }

    const dates = await dailySummaryService.listSessionsInRange(from, to);
    return res.status(200).json({ success: true, dates, from, to });
  } catch (error) {
    console.error('dailySummaryReports getSessionsInRange:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
