const express = require("express");
const {
  createStockTrade,
  getStockTrades,
  deleteStockTrade,
  updateStockTrade,
  createOptionTrade,
  deleteOptionTrade,
  getOptionTrades,
  updateOptionTrade
} = require("../controllers/tradeController");
const router = express.Router();

router
  .route("/stock")
  .post(createStockTrade)
  .get(getStockTrades)
  .delete(deleteStockTrade)
  .patch(updateStockTrade);


  router
  .route("/option")
  .post(createOptionTrade)
  .get(getOptionTrades)
  .delete(deleteOptionTrade)
  .patch(updateOptionTrade);

module.exports = router;
