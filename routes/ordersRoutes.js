const express = require("express");
const {
  createStockOrder,
  getStockOrders,
  deleteStockOrder,
  updateStockOrder,
  createOptionOrder,
  updateOptionOrder,
  getOptionOrders,
  deleteOptionOrder
} = require("../controllers/ordersController");
const router = express.Router();

router
  .route("/stock")
  .post(createStockOrder)
  .get(getStockOrders)
  .delete(deleteStockOrder)
  .patch(updateStockOrder);

router
  .route("/option")
  .post(createOptionOrder)
  .get(getOptionOrders)
  .delete(deleteOptionOrder)
  .patch(updateOptionOrder);

module.exports = router;
