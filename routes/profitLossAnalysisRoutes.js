const express = require("express");
const {
  createEntry,
  getAllEntries,
  getEntry,
  deleteEntry,
  updateEntry,
  getLastEntryDate
} = require("../controllers/profitLossAnalysisController");
const router = express.Router();

router.get("/last-entry-date", getLastEntryDate);

router
  .route("/")
  .get((req, res) => {
    try {
      if (req.query.date || req.query.startdate) {
        return getEntry(req, res);
      } else {
        return getAllEntries(req, res);
      }
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  })
  .post(createEntry)
  .delete(deleteEntry)
  .patch(updateEntry);

module.exports = router;
