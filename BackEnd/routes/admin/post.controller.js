const Post = require('../../models/post.model.js');

// [GET] /admin/posts - Lấy danh sách tất cả bài viết
module.exports.index = async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 });
        res.json({
            code: 200,
            message: "Lấy danh sách bài viết thành công",
            data: posts
        });
    } catch (error) {
        res.status(500).json({
            code: 500,
            message: "Lỗi khi lấy danh sách bài viết",
            error: error.message
        });
    }
};


// [GET] /admin/posts/:id - Lấy chi tiết một bài viết
module.exports.detail = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id).populate("author");
        if (!post) {
            return res.status(404).json({
                code: 404,
                message: "Bài viết không tồn tại"
            });
        }
        
        res.json({
            code: 200,
            message: "Lấy chi tiết bài viết thành công",
            data: post
        });
    } catch (error) {
        res.status(500).json({
            code: 500,
            message: "Lỗi khi lấy chi tiết bài viết",
            error: error.message
        });
    }
};


// [POST] /admin/posts - Tạo bài viết mới
module.exports.create = async (req, res) => {
    try {
        const newPost = new Post(req.body);
        const savedPost = await newPost.save();
        res.status(201).json({
            code: 201,
            message: "Tạo bài viết thành công",
            data: savedPost
        }); 
    } catch (error) {
        res.status(400).json({
            code: 400,
            message: "Lỗi khi tạo bài viết",
            error: error.message
        });
    }
};


// [PUT] /admin/posts/:id - Cập nhật bài viết
module.exports.update = async (req, res) => {
    try {
        const post = await Post.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!post) {
            return res.status(404).json({
                code: 404,
                message: "Bài viết không tồn tại"
            });
        }
        res.json({
            code: 200,
            message: "Cập nhật bài viết thành công",
            data: post
        });
    } catch (error) {
        res.status(400).json({
            code: 400,
            message: "Lỗi khi cập nhật bài viết",
            error: error.message
        });
    }
};


// [DELETE] /admin/posts/:id - Xóa bài viết
module.exports.delete = async (req, res) => {
    try {
        const post = await Post.findByIdAndDelete(req.params.id);
        if (!post) {
            return res.status(404).json({
                code: 404,
                message: "Bài viết không tồn tại"
            });
        }
        res.json({
            code: 200,
            message: "Xóa bài viết thành công"
        });
    } catch (error) {
        res.status(500).json({
            code : 500,
            message: "Lỗi khi xóa bài viết",
            error: error.message
        });
    }
};



