// post.html
async function loadPostDetail() {
  const slug = getQueryParam("slug");

  if (!slug) {
    showError("Bài viết không tồn tại", "content");
    return;
  }

  showLoading("Đang tải bài viết...");

  try {
    const result = await apiCall(`/posts/${slug}`, "GET");
    hideLoading();

    if (result.code === 200) {
      const post = result.data;
      const contentDiv = document.getElementById("post-detail");

      if (contentDiv) {
        contentDiv.innerHTML = `
                    <article class="post-detail">
                        <h1>${post.title}</h1>
                        <div class="post-meta">
                            <img src="${post.author?.avatar || "https://via.placeholder.com/50"}" alt="${post.author?.username}" class="avatar">
                            <div>
                                <h4>${post.author?.username}</h4>
                                <p>${new Date(post.createdAt).toLocaleDateString("vi-VN")}</p>
                            </div>
                        </div>
                        ${post.thumbnail ? `<img src="${post.thumbnail}" alt="${post.title}" class="post-image">` : ""}
                        <div class="post-body">
                            ${post.content}
                        </div>
                        <div class="post-footer">
                            <div class="tags">
                                ${post.tags?.map((tag) => `<span class="tag">#${tag}</span>`).join("") || ""}
                            </div>
                            <div class="actions">
                                <button onclick="likeThisPost('${post._id}')">❤️ ${post.likes}</button>
                            </div>
                        </div>
                    </article>
                `;
      }

      // Render comments
      if (post.comments && post.comments.length > 0) {
        renderComments(post.comments, "comments-list");
      }
    } else {
      showError(result.message || "Không thể tải bài viết", "content");
    }
  } catch (error) {
    hideLoading();
    console.error("Lỗi:", error);
    showError("Lỗi: " + error.message, "content");
  }
}

// Like
async function likeThisPost(postId) {
  try {
    const result = await apiCall(`/posts/${postId}/like`, "POST");
    if (result.code === 200) {
      toast("Bạn đã thích bài viết!", "success");
      // Cập nhật lại số lượt thích trên giao diện
      loadPostDetail();
    }
  } catch (error) {
    console.error("Lỗi:" + error.message, error);
  }
}

// Bình luận
async function submitComment() {
  const slug = getQueryParam("slug");
  const content = document.getElementById("comment-input").value;
  const user = getUserInfo();

  if (!content || content.trim() == "") {
    toast("Vui lòng nhập nội dung bình luận", "error");
    return;
  }

  if (!user) {
    toast("Vui lòng đăng nhập để bình luận", "error");
    return;
  }

  try {
    // lấy post Id từ slug
    const postResult = await apiCall(`/posts/${slug}`, "GET");
    const postId = postResult.data._id;

    const result = await apiCall(`/posts/${postId}/comment`, "POST", {
      content,
      userId: user.id,
    });

    if (result.code === 201) {
      toast("Bình luận thành công!", "success");
      document.getElementById("comment-input").value = "";
      loadPostDetail(); // Tải lại bài viết để hiển thị bình luận mới
    }
  } catch (error) {
    console.error("Lỗi:" + error.message, error);
  }
}

// Render một bình luận
function renderComment(comment) {
  return `
        <div class="comment"></div>
            <img src="${comment.user?.avatar || "https://via.placeholder.com/40"}" alt="${comment.user?.username}" class="avatar">
            <div class="comment-content"></div>
                <h5 class="comment-author">${comment.user?.username}</h5>
                <p class="comment-text">${comment.content}</p>
                <span class="comment-date">${new Date(comment.createdAt).toLocaleDateString("vi-VN")}</span>
            </div>
        </div>
    `;
}

// Render danh sách bình luận
function renderComments(comments, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = comments
    .map((comment) => renderComment(comment))
    .join("");
}

// Gọi khi trang load
document.addEventListener("DOMContentLoaded", loadPostDetail);
