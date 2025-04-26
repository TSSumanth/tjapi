const express = require("express");
const {
  createActionItem,
  getActionItems,
  updateActionItem,
  deleteItem
} = require("../controllers/actionItemController");
const router = express.Router();

router.route("/").post(createActionItem);
router.route("/").get(getActionItems)
router
  .route("/:id")
  .patch(updateActionItem)
  .delete(deleteItem);

module.exports = router;
