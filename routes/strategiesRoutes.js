const express = require("express");
const {
  createStrategy,
  getStrategies,
  updateStrategy,
  deleteStrategy,
} = require("../controllers/strategiesController");
const router = express.Router();

router.route("/").get(getStrategies).post(createStrategy).patch(updateStrategy)
  .delete(deleteStrategy);

  
module.exports = router;
