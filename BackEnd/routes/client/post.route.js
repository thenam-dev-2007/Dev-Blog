const express = require("express");
const router = express.Router();

const controller = require("../../controllers/client/post.controller.js");
const validation = require("../../middlewares/validation.js");
const upload = require("../../middlewares/upload.js");
const auth = require("../../middlewares/auth.js");
const postMiddleware = require("../../middlewares/post.middleware.js");

router.get("/", controller.getAllPosts);

router.get("/tag/:tag", controller.getPostsByTag);

router.get("/search", controller.searchPost);

router.get("/:slug", controller.getPostBySlug);

router.post("/", auth.authenticateToken, upload.uploadThumbnail.single("thumbnail"), validation.validateCreatePost, controller.createPost);

router.put("/:id", auth.authenticateToken, postMiddleware.loadPost, postMiddleware.canEditPost, upload.uploadThumbnail.single("thumbnail"), validation.validateUpdatePost, controller.updatePost);

router.delete("/:id", auth.authenticateToken, postMiddleware.loadPost, postMiddleware.canDeletePost, controller.deletePost);

router.post("/:id/like",auth.authenticateToken,  controller.likePost);

router.delete("/:id/like", auth.authenticateToken, controller.unlikePost);

router.post("/:id/comments", auth.authenticateToken, validation.validateComment, controller.addComment);

router.delete("/:postId/comments/:commentId", auth.authenticateToken, controller.deleteComment);

module.exports = router;
