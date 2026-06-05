const Post = require("../../models/post.model.js");
const User = require("../../models/user.model.js");
const paginationHelper = require("../../helper/pagination")

// [GET] - Lấy tất cả bài viết (có phân trang)
module.exports.getAllPosts = async (req, res, next) => {
  try {
    let find = {isDeleted: false};

    const countPosts = await Post.countDocuments(find); // countDocuments() => Dùng để đếm số document trong MongoDB

    let objectPagination = paginationHelper({
      currentPage: 1,
      limitPost: 4,
    }, 
    req.query, 
    countPosts
    )

    const posts = await Post.find(find)
      .sort({ createdAt: -1 })
      .limit(objectPagination.limitPost)
      .skip(objectPagination.skip)
      .populate("author", "username avatar")
      .populate("comments.user", "username avatar")
      .lean(); // lean() --> trong Mongoose dùng để trả về object JavaScript thuần thay vì trả về Mongoose Document.
      // Nên dùng GET API
      // Không nên dùng UPDATE API vì cần dùng các method của Mongoose document. (ví dụ: .save())
    res.status(200).json({
      success: true,
      message: "Lấy bài viết thành công",
      pagination: {
        currentPage: objectPagination.currentPage,
        totalPage: objectPagination.totalPage,
        totalPosts: countPosts
        // limit: objectPagination.limit,
      },
      data: posts
    })
  } 
  catch (error) {
    next(error)
  }
};

// [GET] - Lấy bài viết theo slug
module.exports.getPostBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const post = await Post.findOne({ slug })
      .populate("author", "username avatar")
      .populate("comments.user", "username avatar")
      .lean();

    if (!post) {
      return res.status(404).json({
        code: 404,
        message: "Bài viết không tồn tại",
      });
    }

    res.status(200).json({
      success: true,
      message: "Lấy bài viết thành công",
      data: post,
    });
  } 
  catch (error) {
    next(error)
  }
};

// [GET] - Tìm kiếm bài viết
module.exports.searchPost = async (req, res) => {
  try {
    const { keyword } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    if (!keyword || keyword.trim() === "") {
      return res.status(400).json({
        code: 400,
        message: "Vui lòng nhập từ khóa tìm kiếm",
      });
    }

    const posts = await Post.find({
      $or: [
        { title: { $regex: keyword, $options: "i" } },
        { content: { $regex: keyword, $options: "i" } },
        { tags: { $regex: keyword, $options: "i" } },
      ],
    })
      .populate("author", "username email avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Post.countDocuments({
      $or: [
        { title: { $regex: keyword, $options: "i" } },
        { content: { $regex: keyword, $options: "i" } },
        { tags: { $regex: keyword, $options: "i" } },
      ],
    });

    res.json({
      code: 200,
      message: "Tìm kiếm bài viết thành công",
      data: {
        posts,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
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

// [GET] - Lấy bài viết theo tag
module.exports.getPostsByTag = async (req, res) => {
  try {
    const { tag } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ tags: { $in: [tag] } })
      .populate("author", "username email avatar")
      .populate("comments.user", "username avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Post.countDocuments({ tags: { $in: [tag] } });

    res.json({
      code: 200,
      message: "Lấy bài viết theo tag thành công",
      data: {
        tag,
        posts,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
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

// [POST] - Tạo bài viết mới
module.exports.createPost = async (req, res) => {
  try {
    const { title, content, thumbnail, tags } = req.body;
    const authorId = req.user?.id; // Lấy từ middleware auth

    if (!authorId) {
      return res.status(401).json({
        code: 401,
        message: "Bạn phải đăng nhập để tạo bài viết",
      });
    }

    const newPost = await Post.create({
      title,
      content,
      thumbnail,
      tags: tags || [],
      author: authorId,
    });

    await User.findByIdAndUpdate(authorId, { $push: { posts: newPost._id } });

    const populatedPost = await newPost.populate(
      "author",
      "username email avatar",
    );

    res.status(201).json({
      code: 201,
      message: "Tạo bài viết thành công",
      data: populatedPost,
    });
  } catch (error) {
    console.error("Lỗi:", error);
    res.status(500).json({
      code: 500,
      message: "Lỗi server: " + error.message,
    });
  }
};

// [PUT] - Sửa bài viết
module.exports.updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, thumbnail, tags } = req.body;
    const userId = req.user?.id;

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        code: 404,
        message: "Bài viết không tồn tại",
      });
    }

    if (post.author.toString() !== userId) {
      return res.status(403).json({
        code: 403,
        message: "Bạn không có quyền sửa bài viết này",
      });
    }

    const updatedPost = await Post.findByIdAndUpdate(
      id,
      { title, content, thumbnail, tags },
      { new: true },
    ).populate("author", "username email avatar");

    res.json({
      code: 200,
      message: "Cập nhật bài viết thành công",
      data: updatedPost,
    });
  } 
  catch (error) {
    console.error("Lỗi:", error);
    res.status(500).json({
      code: 500,
      message: "Lỗi server: " + error.message,
    });
  }
};

// [DELETE] - Xóa bài viết
module.exports.deletePost = async (req, res) => {
  try {
        await req.post.deleteOne();
        await User.findByIdAndUpdate(
            post.author,
            { $pull: { posts: post._id } } // $pull là một MongoDB update operator dùng để xóa phần tử khỏi mảng.
        );

        return res.status(200).json({
            success: true,
            message: "Xóa bài viết thành công"
        });

    }
    catch (error) {
      next(error);
    }
};

// [POST] - Like bài viết
module.exports.likePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        code: 401,
        message: "Bạn phải đăng nhập để like bài viết",
      });
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        code: 404,
        message: "Bài viết không tồn tại",
      });
    }

    const updatedPost = await Post.findByIdAndUpdate(
      id,
      { $inc: { likes: 1 } },
      { new: true },
    );

    res.json({
      code: 200,
      message: "Like bài viết thành công",
      data: { likes: updatedPost.likes },
    });
  } catch (error) {
    console.error("Lỗi:", error);
    res.status(500).json({
      code: 500,
      message: "Lỗi server: " + error.message,
    });
  }
};

// [DELETE] - Bỏ like bài viết
module.exports.unlikePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        code: 401,
        message: "Bạn phải đăng nhập để bỏ like bài viết",
      });
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        code: 404,
        message: "Bài viết không tồn tại",
      });
    }

    const updatedPost = await Post.findByIdAndUpdate(
      id,
      { $inc: { likes: -1 } },
      { new: true },
    );

    res.json({
      code: 200,
      message: "Bỏ like bài viết thành công",
      data: { likes: updatedPost.likes },
    });
  } catch (error) {
    console.error("Lỗi:", error);
    res.status(500).json({
      code: 500,
      message: "Lỗi server: " + error.message,
    });
  }
};

// [POST] - Thêm bình luận
module.exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        code: 401,
        message: "Bạn phải đăng nhập để bình luận",
      });
    }

    if (!content || content.trim() === "") {
      return res.status(400).json({
        code: 400,
        message: "Nội dung bình luận không được để trống",
      });
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        code: 404,
        message: "Bài viết không tồn tại",
      });
    }

    const newComment = {
      user: userId,
      content,
      createdAt: new Date(),
    };

    post.comments.push(newComment);
    await post.save();

    const updatedPost = await Post.findById(id)
      .populate("author", "username email avatar")
      .populate("comments.user", "username avatar");

    res.status(201).json({
      code: 201,
      message: "Thêm bình luận thành công",
      data: updatedPost,
    });
  } catch (error) {
    console.error("Lỗi:", error);
    res.status(500).json({
      code: 500,
      message: "Lỗi server: " + error.message,
    });
  }
};

// [DELETE] - Xóa bình luận
module.exports.deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        code: 401,
        message: "Bạn phải đăng nhập để xóa bình luận",
      });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        code: 404,
        message: "Bài viết không tồn tại",
      });
    }

    const comment = post.comments.id(commentId);

    if (!comment) {
      return res.status(404).json({
        code: 404,
        message: "Bình luận không tồn tại",
      });
    }

    if (
      comment.user.toString() !== userId &&
      post.author.toString() !== userId
    ) {
      return res.status(403).json({
        code: 403,
        message: "Bạn không có quyền xóa bình luận này",
      });
    }

    post.comments.id(commentId).deleteOne();
    await post.save();

    res.json({
      code: 200,
      message: "Xóa bình luận thành công",
    });
  } catch (error) {
    console.error("Lỗi:", error);
    res.status(500).json({
      code: 500,
      message: "Lỗi server: " + error.message,
    });
  }
};

// [GET] - Lấy tất cả bài viết của user
module.exports.getPostsByUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        code: 404,
        message: "User not found",
      });
    }

    const posts = await Post.find({ author: id })
      .populate("author", "username email avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Post.countDocuments({ author: id });

    res.json({
      code: 200,
      message: "Lấy bài viết của user thành công",
      data: {
        user: {
          id: user._id,
          username: user.username,
          avatar: user.avatar,
        },
        posts,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
