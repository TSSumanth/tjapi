const express = require("express");
const {
  createTag,
  getTags,
  getTag,
  updateTag,
  deleteTag,
} = require("../controllers/tagsController");
const router = express.Router();

router.route("/").get(getTags).post(createTag);

router
  .route("/:name")
  .get(getTag)
  .patch(updateTag)
  .delete(deleteTag);

module.exports = router;
