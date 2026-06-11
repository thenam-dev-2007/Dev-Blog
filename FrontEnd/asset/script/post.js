let currentPost = null;

function renderPostDetail(post) {
    currentPost = post;
    document.title = `${post.title || "Bài viết"} - Blog`;

    const banner = document.getElementById("postBanner");
    const detail = document.getElementById("postDetail");
    const commentFormWrap = document.getElementById("commentFormWrap");

    if (banner) {
        banner.innerHTML = `
            <h1>${escapeHtml(post.title || "Không có tiêu đề")}</h1>
            <p>Tác giả: <strong>${escapeHtml(post.author?.username || "Ẩn danh")}</strong> · ${formatDate(post.createdAt)}</p>
        `;
    }

    if (detail) {
        const tags = Array.isArray(post.tags) ? post.tags : [];
        detail.innerHTML = `
            <img class="post-hero-image" src="${normalizeImageUrl(post.thumbnail, "https://via.placeholder.com/900x420?text=Blog+Post")}" alt="${escapeHtml(post.title || "Bài viết")}">
            <div class="post-content-text">${escapeHtml(post.content || "")}</div>
            ${tags.length ? `<div class="tag-list post-tags">${tags.map(tag => `<a href="categories.html?tag=${encodeURIComponent(tag)}">#${escapeHtml(tag)}</a>`).join("")}</div>` : ""}
            <div class="post-actions-row">
                <button type="button" class="button" id="btnLikePost">❤️ Yêu thích (${getLikeCount(post)})</button>
                <button type="button" class="button secondary" id="btnSharePost">🔗 Chia sẻ</button>
            </div>
        `;
    }

    renderComments(post.comments || [], "commentsList");

    if (commentFormWrap && !isLoggedIn()) {
        commentFormWrap.innerHTML = `<div class="alert alert-info">Bạn cần <a href="login.html">đăng nhập</a> để bình luận.</div>`;
    }

    const btnLike = document.getElementById("btnLikePost");
    if (btnLike) btnLike.addEventListener("click", handleLikePost);

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

async function loadPostDetail() {
    const slug = getQueryParam("slug");
    if (!slug) {
        showError("URL thiếu slug bài viết.", "postDetail");
        return;
    }

    showLoading("Đang tải bài viết...");
    const result = await getPostDetail(slug);
    hideLoading();

    if (!resultOk(result) || !result.data) {
        showError(getErrorMessage(result, "Không tìm thấy bài viết"), "postDetail");
        return;
    }

    renderPostDetail(result.data);
}

async function handleLikePost() {
    if (!isLoggedIn()) {
        window.location.href = "login.html";
        return;
    }

    if (!currentPost?._id) return;
    const result = await likePost(currentPost._id);

    if (resultOk(result)) {
        toast(result.message || "Đã like bài viết", "success");
        await loadPostDetail();
    } else {
        toast(getErrorMessage(result, "Không like được bài viết"), "error");
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
