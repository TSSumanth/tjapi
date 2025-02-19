const express = require("express");
const {
  createStockTrade,
  getStockTrades,
  deleteStockTrade,
  updateStockTrade
} = require("../controllers/tradeController");
const router = express.Router();

router
  .route("/stock")
  .post(createStockTrade)
  .get(getStockTrades)
  .delete(deleteStockTrade)
  .patch(updateStockTrade);

// router
//   .route("/option")
//   .post(createOptionOrder)
//   .get(getOptionOrders)
//   .delete(deleteOptionOrder)
//   .patch(updateOptionOrder);

module.exports = router;
