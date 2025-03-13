const express = require("express");
const {
  createActionItem,
  getActiveActionItems,
  updateActionItem,
  deleteItem
} = require("../controllers/actionItemController");
const router = express.Router();

router.route("/").post(createActionItem);
router.route("/activeactionitems").get(getActiveActionItems)
router
  .route("/:id")
  .patch(updateActionItem)
  .delete(deleteItem);

module.exports = router;
