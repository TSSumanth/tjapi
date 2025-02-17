const express = require("express");
const {
  getAllMarketAnalysis,
  getMarketAnalysis,
  createMarketAnalysis,
  updateMarketAnalysis,
  deleteMarketAnalysis
} = require("../controllers/marketAnalysisController");
const router = express.Router();

// app.post("/api/marketanalysis", createMarketAnalysis);
// app.get("/api/marketanalysis", getAllMarketAnalysis);
// app.patch("/api/marketanalysis/:id", updateMarketAnalysis);
// app.get("/api/marketanalysis/:id", getMarketAnalysis);

router.route("/").get(getAllMarketAnalysis).post(createMarketAnalysis);

router.route("/:id").get(getMarketAnalysis).patch(updateMarketAnalysis).delete(deleteMarketAnalysis);

module.exports = router;
