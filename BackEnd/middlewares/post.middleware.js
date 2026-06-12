const Post = require("../models/post.model");

// Load post từ database
module.exports.loadPost = async (req, res, next) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy bài viết",
                error: "POST_NOT_FOUND",
            });
        }

        req.post = post;

        next();
    } 
    catch (error) {
        next(error);
    }
};

module.exports.canEditPost = (req, res, next) => {
    const post = req.post;
    const user = req.user;

    const isOwner = post.author.toString() === String(user._id);

    const isAdmin = user.role === "admin";

    if (!isOwner && !isAdmin) {
        return res.status(403).json({
            success: false,
            message: "Bạn không có quyền sửa bài viết này"
        });
    }

    next();
};

// Admin: xóa mọi bài viết
// User: chỉ xóa bài viết của mình
module.exports.canDeletePost = (req, res, next) => {
    const post = req.post;
    const user = req.user;

    const isOwner = post.author.toString() === String(user._id);

    const isAdmin = user.role === "admin";

    if (!isOwner && !isAdmin) {
        return res.status(403).json({
            success: false,
            message: "Bạn không có quyền xóa bài viết này"
        });
    }

    next();
};