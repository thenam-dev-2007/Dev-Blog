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


// Admin: xóa mọi bài viết
// User: chỉ xóa bài viết của mình
module.exports.canDeletePost = (req, res, next) => {
    const { user, post } = req;

    const isAdmin = user.role === "admin";

    const isOwner = post.author.toString() === user._id.toString();

    if (isAdmin || isOwner) {
        return next();
    }

    return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xóa bài viết này",
        error: "PERMISSION_DENIED",
    });
};