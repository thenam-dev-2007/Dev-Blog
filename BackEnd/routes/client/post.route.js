const express = require("express");
const router = express.Router();

const multer = require("multer");

// Cấu hình multer cho thumbnail
const storageThumbnail = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "upload/thumbnail");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error("Chỉ cho phép upload ảnh"));
  }
  cb(null, true);
};

const uploadThumbnail = multer({
  storage: storageThumbnail,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

const controller = require("../../controllers/client/post.controller.js");
const validation = require("../../middlewares/validation.js");

// [GET] - Lấy tất cả posts (có phân trang)
router.get("/", controller.getAllPosts);

// [GET] - Tìm kiếm posts
router.get("/search", controller.searchPost);

// [GET] - Lấy posts theo tag
router.get("/tag/:tag", controller.getPostsByTag);

// [GET] - Lấy post theo slug
router.get("/:slug", controller.getPostBySlug);

// [POST] - Tạo post mới (cần authentication)
router.post(
  "/",
  uploadThumbnail.single("thumbnail"),
  validation.validateCreatePost,
  controller.createPost,
);

// [PUT] - Sửa post (cần authentication)
router.put("/:id", uploadThumbnail.single("thumbnail"), controller.updatePost);

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
