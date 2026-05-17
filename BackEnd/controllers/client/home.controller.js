const Post = request('../../models/post.model.js')

// [GET] //
module.exports.home = (req, res) => { 
    try{
        // 10 post mới nhất
        const latestPosts = await Post.find()
            .populate('author', 'name email')
            .populate('comments.user', 'name')
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();


        // 10 post nổi tiếng nhất
        const popularPosts = await Post.find()
            .populate('author', 'name email')
            .populate('comments.user', 'name')
            .sort({ likes: -1 })
            .limit(10)
            .lean();

        res.json({
            code: 200,
            message: "Lấy danh sách bài viết thành công",
            data: {
                latestPosts,
                popularPosts
            }
        });
    } catch (error) {
        console.error("Lỗi:", error);
        res.status(500).json({
            code: 500,
            message: "Lỗi server: " + error.message
        });
    }
}