const Post = require("../../models/post.model.js");
const User = require("../../models/user.model.js");
const paginationHelper = require("../../helper/pagination");

const cleanUpNewFile = async () => {
  if (req.file && req.file.path) {
    try { await fs.unlink(req.file.path); } 
    catch (err) { console.error("Không thể xóa file mới khi rollback:", err.message); }
  }
};

// [GET] - Lấy tất cả bài viết 
module.exports.getAllPosts = async (req, res, next) => {
  try {
    let find = {isDeleted: false};

    const countPosts = await Post.countDocuments(find); // countDocuments() => Dùng để đếm số document trong MongoDB

    let objectPagination = paginationHelper(
      {
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

    const post = await Post.findOne({ slug, isDeleted: false })
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

// [GET] - Lấy bài viết theo tag
module.exports.getPostsByTag = async (req, res, next) => {
  try {
    const { tag } = req.params;

    const find = {tags: { $in: [tag] }, isDeleted: false};
    
    const countPosts = await Post.countDocuments(find);

    let objectPagination = paginationHelper(
          {
            currentPage: 1,
            limitPost: 9,
          }, 
          req.query, 
          countPosts
        )

    const posts = await Post.find({ tags: { $in: [tag] }, isDeleted: false })
        .populate("author", "username email avatar")
        .sort({ createdAt: -1 })
        .skip(objectPagination.skip)
        .limit(objectPagination.limitItem);

    res.json({
      code: 200,
      message: "Lấy bài viết theo tag thành công",
      data: {
        tag,
        posts,
        pagination: objectPagination
      },
    });
  } 
  catch (error) {
    next(error);
  }
};

// [GET] - Tìm kiếm bài viết
module.exports.searchPost = async (req, res, next) => {
  try {
    const { keyword } = req.query;
    if (!keyword?.trim()) {
        return res.status(400).json({
            code: 400,
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

    let objectPagination = paginationHelper(
        {
          currentPage: 1,
          limitPost: 9,
        }, 
        req.query, 
        countPosts
      )

    const posts = await Post.find(find)
        .populate("author", "username email avatar")
        .sort({ createdAt: -1 })
        .skip(objectPagination.skip)
        .limit(objectPagination.limitItem)

    res.json({
        code: 200,
        message: "Tìm kiếm bài viết thành công",
        data: {
            posts,
            pagination: objectPagination,
        },
    });
  } 
  catch (error) {
    next(error)
  }
};

// [POST] - Tạo bài viết mới
module.exports.createPost = async (req, res, next) => {
  try {
    const { title, content, tags } = req.body;
    const authorId = req.user.id; // Lấy từ middleware auth

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
  } 
  catch (error) {
    next(error)
  }
};

// [PUT] - Sửa bài viết
module.exports.updatePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, thumbnail, tags } = req.body;
    const userId = req.user?._id;

    const post = await Post.findById({_id: id, isDeleted: false});

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

    const updateData = {};
    if(title !== undefined) updateData.title = title;
    if(content !== undefined) updateData.content = content;
    if(thumbnail !== undefined) updateData.thumbnail = thumbnail;
    if(tags !== undefined) updateData.tags = tags;

    const updatedPost = await Post.findByIdAndUpdate(
      id, 
      updateData,
      {
          new: true,
          runValidators: true
      }
    )

    res.json({
      code: 200,
      message: "Cập nhật bài viết thành công",
      data: post,
    });
  } 
  catch (error) {
    next(error)
  }
};

// [DELETE] - Xóa bài viết
module.exports.deletePost = async (req, res, next) => {
  try {
    const post = req.post;

    await Post.findByIdAndUpdate(
      post._id,
      {
        isDeleted: true,
        deletedAt: new Date()
      }
    );

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
module.exports.likePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await Post.findById({_id: id,  isDeleted: false});

    if (!post) {
      return res.status(404).json({
        code: 404,
        message: "Bài viết không tồn tại",
      });
    }

    if (post.likes.includes(userId)) {
      return res.status(400).json({
        message: "Bạn đã like bài viết này rồi"
      });
    }

    post.likes.push(userId);
    await post.save();

    res.json({
      code: 200,
      message: "Like bài viết thành công",
      likesCount: post.likes.length
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

    const post = await Post.findById({_id: id, isDeleted: false});

    if (!post) {
      return res.status(404).json({
        code: 404,
        message: "Bài viết không tồn tại",
      });
    }

    if (!post.likes.includes(userId)) {
      return res.status(400).json({
        message: "Bạn chưa like bài viết này"
      });
    }

    post.likes.pull(userId);
    await post.save();

    res.json({
      code: 200,
      message: "Bỏ like bài viết thành công",
      likesCount: post.likes.length
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
    const userId = req.user?._id;

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
      content: content.trim(),
      createdAt: new Date(),
    };

    post.comments.push(newComment);
    await post.save();

    const updatedPost = await Post.findById({_id: id, isDeleted: false})
      .populate("author", "username email avatar")
      .populate("comments.user", "username avatar");

    res.status(201).json({
      code: 201,
      message: "Thêm bình luận thành công",
      data: updatedPost,
    });
  } 
  catch (error) {
    next(error);
  }
};

// [DELETE] - Xóa bình luận
module.exports.deleteComment = async (req, res, next) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        code: 401,
        message: "Bạn phải đăng nhập để xóa bình luận",
      });
    }

    const post = await Post.findById({_id: postId, isDeleted: false});

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
  } 
  catch (error) {
    next(error);
  }
};
