const User = require("../../models/user.model.js");
const Post = require("../../models/post.model.js");


// [GET] - Lấy tất cả tags hiện có
module.exports.getAllTags = async (req, res, next) => {
  try {
    const posts = await Post.find().select("tags").lean();

    // Flatten và loại bỏ duplicates
    const tagsSet = new Set();
    posts.forEach((post) => {
      if (post.tags && Array.isArray(post.tags)) {
        post.tags.forEach((tag) => tagsSet.add(tag));
      }
    });

    const tags = Array.from(tagsSet).sort();

    res.json({
      code: 200,
      message: "Lấy danh sách tags thành công",
      data: {
        tags,
        total: tags.length,
      },
    });
  } 
  catch (error) {
    next(error)
  }
};

// [GET] - Thống kê: Tổng số posts, users, comments
module.exports.getStatistics = async (req, res) => {
  try {

    const postCount = await Post.countDocuments();
    const userCount = await User.countDocuments();

    const posts = await Post.find().lean();
    let commentCount = 0;
    posts.forEach((post) => {
      if (post.comments) {
        commentCount += post.comments.length;
      }
    });

    let totalLikes = 0;
    posts.forEach((post) => {
      totalLikes += post.likes || 0;
    });

    res.json({
      code: 200,
      message: "Lấy thống kê thành công",
      data: {
        posts: postCount,
        users: userCount,
        comments: commentCount,
        likes: totalLikes,
      },
    });
  } catch (error) {
    console.error("Lỗi:", error);
    res.status(500).json({
      code: 500,
      message: "Lỗi server: " + error.message,
    });
  }
};
