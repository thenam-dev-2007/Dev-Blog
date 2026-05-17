const express = require("express");
const router = express.Router();

const postController = require("../../controllers/client/post.controller.js");
const homeController = require("../../controllers/client/home.controller.js");

// [GET] - Tìm kiếm bài viết
router.get("/posts", postController.searchPost);

// [GET] - Lấy tất cả tags
router.get("/tags", homeController.getAllTags);

// [GET] - Lấy posts theo tag cụ thể
router.get("/tag/:tag", postController.getPostsByTag);

// [GET] - Lấy thống kê
router.get("/statistics", homeController.getStatistics);

module.exports = router;
