const Post = require("../../models/post.model.js");
const User = require("../../models/user.model.js");
const paginationHelper = require("../../helper/pagination");

const cleanUpNewFile = async () => {
  if (req.file && req.file.path) {
    try { await fs.unlink(req.file.path); } 
    catch (err) { console.error("Không thể xóa file mới khi rollback:", err.message); }
  }
};

const normalizeTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map(tag => String(tag).trim()).filter(Boolean);
  if (typeof tags === "string") return tags.split(",").map(tag => tag.trim()).filter(Boolean);
  return [];
}

// [GET] - Lấy tất cả bài viết 
module.exports.getAllPosts = async (req, res, next) => {
  try {
    const find = { isDeleted: false };
    const countPosts = await Post.countDocuments(find);

    const objectPagination = paginationHelper(
      { currentPage: 1, limitPost: 4 },
      req.query,
      countPosts
    );

    const posts = await Post.find(find)
      .sort({ createdAt: -1 })
      .limit(objectPagination.limitItem)
      .skip(objectPagination.skip)
      .populate("author", "fullname avatar")
      .populate("comments.user", "fullname avatar")
      .lean();

    res.status(200).json({
      success: true,
      message: "Lấy bài viết thành công",
      pagination: {
        currentPage: objectPagination.currentPage,
        totalPage: objectPagination.totalPage,
        totalPosts: countPosts,
        limit: objectPagination.limitItem,
      },
      data: posts,
    });
  } 
  catch (error) {
    next(error);
  }
};

// [GET] - Lấy bài viết theo slug
module.exports.getPostBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const post = await Post.findOne({ slug, isDeleted: false })
      .populate("author", "fullname avatar")
      .populate("comments.user", "fullname avatar")
      .lean();

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Bài viết không tồn tại",
      });
    }

    res.status(200).json({
      success: true,
      message: "Lấy bài viết thành công",
      data: post,
    });
  } catch (error) {
    next(error);
  }
};

// [GET] - Lấy bài viết theo tag
module.exports.getPostsByTag = async (req, res, next) => {
  try {
    const { tag } = req.params;
    const find = { tags: { $in: [tag] }, isDeleted: false };
    const countPosts = await Post.countDocuments(find);

    const objectPagination = paginationHelper(
      { currentPage: 1, limitPost: 9 },
      req.query,
      countPosts
    );

    const posts = await Post.find(find)
      .populate("author", "fullname email avatar")
      .populate("comments.user", "fullname avatar")
      .sort({ createdAt: -1 })
      .skip(objectPagination.skip)
      .limit(objectPagination.limitItem)
      .lean();

    res.status(200).json({
      success: true,
      message: "Lấy bài viết theo tag thành công",
      data: {
        tag,
        posts,
        pagination: objectPagination,
      },
    });
  } catch (error) {
    next(error);
  }
};

// [GET] - Tìm kiếm bài viết
module.exports.searchPost = async (req, res, next) => {
  try {
    const { keyword } = req.query;
    if (!keyword?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập từ khóa tìm kiếm",
      });
    }

    const find = {
      isDeleted: false,
      $or: [
        { title: { $regex: keyword, $options: "i" } },
        { content: { $regex: keyword, $options: "i" } },
        { tags: { $regex: keyword, $options: "i" } },
      ],
    };

    const countPosts = await Post.countDocuments(find);

    const objectPagination = paginationHelper(
      { currentPage: 1, limitPost: 9 },
      req.query,
      countPosts
    );

    const posts = await Post.find(find)
      .populate("author", "fullname email avatar")
      .populate("comments.user", "fullname avatar")
      .sort({ createdAt: -1 })
      .skip(objectPagination.skip)
      .limit(objectPagination.limitItem)
      .lean();

    res.status(200).json({
      success: true,
      message: "Tìm kiếm bài viết thành công",
      data: {
        posts,
        pagination: objectPagination,
      },
    });
  } catch (error) {
    next(error);
  }
};

// [POST] - Tạo bài viết mới
module.exports.createPost = async (req, res, next) => {
  try {
    const { title, content, tags } = req.body;
    const authorId = req.user._id; // Lấy từ middleware auth

    if (!authorId) {
      await cleanUpNewFile();
      return res.status(401).json({
        success: false,
        message: "Bạn phải đăng nhập để tạo bài viết",
      });
    }

    let thumbnailPath = ""; 
    if (req.file) {
      thumbnailPath = `/upload/post/${req.file.filename}`; // Đảm bảo thư mục này tồn tại
    }

    const newPost = await Post.create({
      title,
      content,
      thumbnail: thumbnailPath,
      tags: normalizeTags(tags),
      author: authorId,
    });

    await User.findByIdAndUpdate(authorId, { $push: { posts: newPost._id } });

    const populatedPost = await newPost.populate(
      "author",
      "fullname email avatar"
    );

    res.status(201).json({
      success: true,
      message: "Tạo bài viết thành công",
      data: populatedPost,
    });
  } 
  catch (error) {
    next(error);
  }
};

// [PUT] - Sửa bài viết
module.exports.updatePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, tags } = req.body;
    const userId = req.user._id;

    const post = await Post.findOne({ _id: id, isDeleted: false });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Bài viết không tồn tại",
      });
    }

    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền sửa bài viết này",
      });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (tags !== undefined) updateData.tags = normalizeTags(tags);
    // Xử lý file (Tương tự như avatar)
    let oldThumbnailPath = null;
    if (req.file) {
      if (post.thumbnail && !post.thumbnail.includes("default")) {
        oldThumbnailPath = path.join(process.cwd(), post.thumbnail.replace(/^\/+/, ""));
      }
      updateData.thumbnail = `/upload/post/${req.file.filename}`;
    };

    const updatedPost = await Post.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("author", "fullname email avatar")
      .populate("comments.user", "fullname avatar");

    if (oldThumbnailPath) {
      try { await fs.unlink(oldThumbnailPath); } 
      catch (err) { if (err.code !== 'ENOENT') console.error("Lỗi khi xóa thumbnail cũ:", err.message); }
    }

    res.status(200).json({
      success: true,
      message: "Cập nhật bài viết thành công",
      data: updatedPost,
    });
  } 
  catch (error) {
    await cleanUpNewFile();
    next(error);
  }
};

// [DELETE] - Xóa bài viết
module.exports.deletePost = async (req, res, next) => {
  try {
    const post = req.post;

    await Post.findByIdAndUpdate(post._id, {
      isDeleted: true,
      deletedAt: new Date(),
    });

    await User.findByIdAndUpdate(post.author, { $pull: { posts: post._id } });

    res.status(200).json({
      success: true,
      message: "Xóa bài viết thành công",
    });
  } catch (error) {
    next(error);
  }
};

// [POST] - Like bài viết
module.exports.likePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await Post.findOne({ _id: id, isDeleted: false });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Bài viết không tồn tại",
      });
    }

    if (post.likes.some(like => like.toString() === userId)) {
      return res.status(400).json({
        success: false,
        message: "Bạn đã like bài viết này rồi",
      });
    }

    post.likes.push(req.user._id);
    await post.save();

    res.status(200).json({
      success: true,
      message: "Like bài viết thành công",
      likesCount: post.likes.length,
    });
  } 
  catch (error) {
    next(error);
  }
};

// [DELETE] - Bỏ like bài viết
module.exports.unlikePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await Post.findOne({ _id: id, isDeleted: false });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Bài viết không tồn tại",
      });
    }

    if (!post.likes.some(like => like.toString() === userId)) {
      return res.status(400).json({
        success: false,
        message: "Bạn chưa like bài viết này",
      });
    }

    post.likes = post.likes.filter(like => like.toString() !== userId);
    await post.save();

    res.status(200).json({
      success: true,
      message: "Bỏ like bài viết thành công",
      likesCount: post.likes.length,
    });
  } 
  catch (error) {
    next(error);
  }
};

// [POST] - Thêm bình luận
module.exports.addComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Bạn phải đăng nhập để bình luận",
      });
    }

    if (!content || content.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Nội dung bình luận không được để trống",
      });
    }

    const post = await Post.findOne({ _id: id, isDeleted: false });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Bài viết không tồn tại",
      });
    }

    post.comments.push({
      user: userId,
      content: content.trim(),
      createdAt: new Date(),
    });
    await post.save();

    const updatedPost = await Post.findOne({ _id: id, isDeleted: false })
      .populate("author", "fullname email avatar")
      .populate("comments.user", "fullname avatar");

    res.status(201).json({
      success: true,
      message: "Thêm bình luận thành công",
      data: updatedPost,
    });
  } catch (error) {
    next(error);
  }
};

// [DELETE] - Xóa bình luận
module.exports.deleteComment = async (req, res, next) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Bạn phải đăng nhập để xóa bình luận",
      });
    }

    const post = await Post.findOne({ _id: postId, isDeleted: false });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Bài viết không tồn tại",
      });
    }

    const comment = post.comments.id(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Bình luận không tồn tại",
      });
    }

    if (comment.user.toString() !== userId && post.author.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xóa bình luận này",
      });
    }

    post.comments.id(commentId).deleteOne();
    await post.save();

    res.status(200).json({
      success: true,
      message: "Xóa bình luận thành công",
    });
  } catch (error) {
    next(error);
  }
};
