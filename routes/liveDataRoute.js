const express = require("express");
const {
  getNSEStockPrice,
  getNSEOptionPrice
} = require("../controllers/nseData");
const router = express.Router();

router
  .route("/equity-stock")
  .get(getNSEStockPrice)

  router
  .route("/option-stock")
  .get(getNSEOptionPrice)

module.exports = router;
