const express = require("express");
const router = express.Router();

const controller = require("../../controllers/client/post.controller.js");
const validation = require("../../middlewares/validation.js");
const upload = require("../../middlewares/upload.js");

// [GET] - Lấy tất cả posts (có phân trang)
router.get("/", controller.getAllPosts);

// [GET] - Tìm kiếm posts
router.get("/search", controller.searchPost);

// [GET] - Lấy posts theo tag
router.get("/tag/:tag", controller.getPostsByTag);

// [GET] - Lấy post theo slug
router.get("/:slug", controller.getPostBySlug);

// [POST] - Tạo post mới (cần authentication)
router.post("/", validation.validateCreatePost, upload.uploadThumbnail.single("thumbnail"), controller.createPost);

// [PUT] - Sửa post (cần authentication)
router.put("/:id", upload.uploadThumbnail.single("thumbnail"), controller.updatePost);

// [DELETE] - Xóa post (cần authentication)
router.delete("/:id", controller.deletePost);

// [POST] - Like post (cần authentication)
router.post("/:id/like", controller.likePost);

// [DELETE] - Bỏ like post (cần authentication)
router.delete("/:id/like", controller.unlikePost);

// [POST] - Thêm bình luận (cần authentication)
router.post("/:id/comment", validation.validateComment, controller.addComment);

// [DELETE] - Xóa bình luận (cần authentication)
router.delete("/:postId/comment/:commentId", controller.deleteComment);

module.exports = router;
