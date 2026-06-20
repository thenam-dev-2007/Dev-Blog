let currentPost = null;

function currentUserId() {
    const user = getUserInfo();
    return user?._id || user?.id || "";
}

function renderPostDetail(post) {
    currentPost = post;
    window.currentPost = post;
    document.title = `${post.title || "Bài viết"} - Blog`;

    const banner = document.getElementById("postBanner");
    const detail = document.getElementById("postDetail");
    const commentFormWrap = document.getElementById("commentFormWrap");
    const authorId = idToString(post.author);
    const authorName = escapeHtml(post.author?.fullname || post.author?.username || "Ẩn danh");
    const authorHtml = authorId ? `<a href="profile.html?id=${encodeURIComponent(authorId)}"><strong>${authorName}</strong></a>` : `<strong>${authorName}</strong>`;
    const liked = isLikedByUser(post, currentUserId());

    if (banner) {
        banner.innerHTML = `
            <h1>${escapeHtml(post.title || "Không có tiêu đề")}</h1>
            <p>Tác giả: ${authorHtml} · ${formatDate(post.createdAt)} · ${estimateReadingMinutes(post.content)} phút đọc</p>
        `;
    }

    if (detail) {
        const tags = Array.isArray(post.tags) ? post.tags : [];
        detail.innerHTML = `
            <img class="post-hero-image" src="${normalizeImageUrl(post.thumbnail, "https://via.placeholder.com/900x420?text=Blog+Post")}" alt="${escapeHtml(post.title || "Bài viết")}">
            <div class="post-content-text">${escapeHtml(post.content || "")}</div>
            ${tags.length ? `<div class="tag-list post-tags">${tags.map(tag => `<a href="tags.html?tag=${encodeURIComponent(tag)}">#${escapeHtml(tag)}</a>`).join("")}</div>` : ""}
            <div class="post-actions-row">
                <button type="button" class="button ${liked ? "danger" : ""}" id="btnLikePost">
                    ${liked ? "💔 Bỏ like" : "❤️ Like"} (${getLikeCount(post)})
                </button>
                <button type="button" class="button secondary" id="btnGoComment">💬 Bình luận (${getCommentCount(post)})</button>
                <button type="button" class="button secondary" id="btnSharePost">🔗 Chia sẻ</button>
            </div>
        `;
    }

    renderComments(post.comments || [], "commentsList");
    bindCommentControls();

    if (commentFormWrap && !isLoggedIn()) {
        commentFormWrap.innerHTML = `<div class="alert alert-info">Bạn cần <a href="login.html">đăng nhập</a> để bình luận.</div>`;
    }

    const btnLike = document.getElementById("btnLikePost");
    if (btnLike) btnLike.addEventListener("click", handleToggleLikePost);

    const btnGoComment = document.getElementById("btnGoComment");
    if (btnGoComment) btnGoComment.addEventListener("click", () => {
        document.getElementById("commentFormWrap")?.scrollIntoView({ behavior: "smooth", block: "center" });
        document.getElementById("commentContent")?.focus();
    });

    const btnShare = document.getElementById("btnSharePost");
    if (btnShare) btnShare.addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            toast("Đã copy link bài viết", "success");
        } catch (_) {
            toast("Không copy được link trên trình duyệt này", "info");
        }
    });
}

async function loadRelatedPosts(post) {
    const container = document.getElementById("relatedPosts");
    const section = document.getElementById("relatedSection");
    if (!container || !post) return;

    const tags = Array.isArray(post.tags) ? post.tags : [];
    if (!tags.length) {
        if (section) section.classList.add("hidden");
        return;
    }

    const allPosts = await loadAllPosts(30);
    const currentId = idToString(post._id || post.id);
    const related = allPosts
        .filter(item => idToString(item._id || item.id) !== currentId)
        .filter(item => (item.tags || []).some(tag => tags.includes(tag)))
        .sort((a, b) => (getLikeCount(b) + getCommentCount(b)) - (getLikeCount(a) + getCommentCount(a)))
        .slice(0, 4);

    if (!related.length) {
        if (section) section.classList.add("hidden");
        return;
    }

    if (section) section.classList.remove("hidden");
    renderPosts(related, "relatedPosts");
}

async function loadPostDetail() {
    const slug = getQueryParam("slug");
    if (!slug) {
        showError("URL thiếu slug bài viết.", "postDetail");
        return;
    }

    const result = await getPostDetail(slug);

    if (!resultOk(result) || !result.data) {
        showError(getErrorMessage(result, "Không tìm thấy bài viết"), "postDetail");
        return;
    }

    renderPostDetail(result.data);
    loadRelatedPosts(result.data);
}

async function handleToggleLikePost() {
    if (!isLoggedIn()) {
        window.location.href = "login.html";
        return;
    }

    if (!currentPost?._id) return;
    const liked = isLikedByUser(currentPost, currentUserId());
    const result = liked ? await unlikePost(currentPost._id) : await likePost(currentPost._id);

    if (resultOk(result)) {
        toast(result.message || (liked ? "Đã bỏ like bài viết" : "Đã like bài viết"), "success");
        await loadPostDetail();
    } else {
        toast(getErrorMessage(result, liked ? "Không bỏ like được bài viết" : "Không like được bài viết"), "error");
    }
}

function getCurrentPostId() {
    return currentPost?._id || currentPost?.id || "";
}

function bindCommentControls() {
    const container = document.getElementById("commentsList");
    if (!container) return;

    container.querySelectorAll("[data-comment-edit]").forEach((btn) => {
        btn.addEventListener("click", () => handleEditComment(btn.dataset.commentEdit));
    });

    container.querySelectorAll("[data-comment-delete]").forEach((btn) => {
        btn.addEventListener("click", () => handleDeleteComment(btn.dataset.commentDelete));
    });
}

function findCommentById(commentId) {
    return (currentPost?.comments || []).find((comment) => idToString(comment) === String(commentId));
}

async function handleEditComment(commentId) {
    if (!isLoggedIn()) {
        window.location.href = "login.html";
        return;
    }

    const comment = findCommentById(commentId);
    if (!comment) {
        toast("Không tìm thấy bình luận cần sửa", "error");
        return;
    }

    const oldContent = comment.content || "";
    const newContent = window.prompt("Sửa nội dung bình luận:", oldContent);
    if (newContent === null) return;

    const content = newContent.trim();
    if (!content) {
        toast("Nội dung bình luận không được để trống", "error");
        return;
    }

    if (content === oldContent.trim()) return;

    const result = await updateComment(getCurrentPostId(), commentId, content);
    if (resultOk(result)) {
        toast("Đã cập nhật bình luận", "success");
        if (result.data) renderPostDetail(result.data);
        else await loadPostDetail();
    } else {
        toast(getErrorMessage(result, "Không sửa được bình luận"), "error");
    }
}

async function handleDeleteComment(commentId) {
    if (!isLoggedIn()) {
        window.location.href = "login.html";
        return;
    }

    if (!confirm("Bạn có chắc muốn xóa bình luận này không?")) return;

    const result = await deleteCommentById(getCurrentPostId(), commentId);
    if (resultOk(result)) {
        toast("Đã xóa bình luận", "success");
        if (result.data) renderPostDetail(result.data);
        else await loadPostDetail();
    } else {
        toast(getErrorMessage(result, "Không xóa được bình luận"), "error");
    }
}

async function handleCommentSubmit(event) {
    event.preventDefault();

    if (!isLoggedIn()) {
        window.location.href = "login.html";
        return;
    }

    const input = document.getElementById("commentContent");
    const content = input?.value.trim();
    if (!content) {
        toast("Nội dung bình luận không được để trống", "error");
        return;
    }

    const result = await commentPost(currentPost._id, content);
    if (resultOk(result)) {
        input.value = "";
        toast("Đã gửi bình luận", "success");
        if (result.data) renderPostDetail(result.data);
        else await loadPostDetail();
    } else {
        toast(getErrorMessage(result, "Không gửi được bình luận"), "error");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadPostDetail();
    const form = document.getElementById("commentForm");
    if (form) form.addEventListener("submit", handleCommentSubmit);
});

window.loadPostDetail = loadPostDetail;
