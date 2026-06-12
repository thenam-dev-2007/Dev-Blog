const express = require("express");
const router = express.Router();

const controller = require("../../controllers/admin/post.controller.js");
const validation = require("../../middlewares/validation.js");
const upload = require("../../middlewares/upload.js");
const auth = require("../../middlewares/auth.js");
const authorize = require("../../middlewares/authorize.js")
const postMiddleware = require("../../middlewares/post.middleware.js");

router.get("/", controller.getAllPosts);

router.get("/:slug", controller.getPostBySlug);

router.post("/", auth.authenticateToken, upload.uploadThumbnail.single("thumbnail"), validation.validateCreatePost, controller.createPost);

router.delete("/:id", auth.authenticateToken, authorize.authorizeRoles("admin"), postMiddleware.loadPost, postMiddleware.canDeletePost, controller.deletePost);

module.exports = router