const express = require("express");
const router = express.Router();
const expenseTrackerController = require("../controllers/expenseTrackerController");

router.get("/summary", expenseTrackerController.summary);
router.get("/", expenseTrackerController.list);
router.put("/:date", expenseTrackerController.upsert);
router.delete("/:date", expenseTrackerController.remove);

module.exports = router;
