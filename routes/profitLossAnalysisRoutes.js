const express = require("express");
const {
  createEntry,
  getAllEntries,
  getEntry,
  deleteEntry,
  updateEntry
} = require("../controllers/profitLossAnalysisController");
const router = express.Router();

router
  .route("/")
  .get((req, res) => {
    try {
      if (req.query.date) {
        return getEntry(req, res);
      } else {
        return getAllEntries(req, res);
      }
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  })
  .get(getEntry)
  .post(createEntry)
  .delete(deleteEntry)
  .patch(updateEntry);

module.exports = router;
