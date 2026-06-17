// ==================== UTILS.JS ====================
// Hàm dùng chung để render dữ liệu backend hiện tại.

function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function stripHtml(value = "") {
    const temp = document.createElement("div");
    temp.innerHTML = value;
    return temp.textContent || temp.innerText || "";
}

function truncateText(value = "", max = 150) {
    const text = stripHtml(value).trim();
    return text.length > max ? text.slice(0, max).trim() + "..." : text;
}

function normalizeImageUrl(src, fallback = "https://via.placeholder.com/800x400?text=Blog") {
    if (!src || src.includes("default-post.png")) return fallback;
    if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")) return src;
    if (src.startsWith("../upload")) return `${window.API_ORIGIN || "http://localhost:3000"}/${src.replace(/^\.\.\//, "")}`;
    if (src.startsWith("/upload")) return `${window.API_ORIGIN || "http://localhost:3000"}${src}`;
    return src;
}

function formatDate(value) {
    if (!value) return "Không rõ ngày";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Không rõ ngày";
    return date.toLocaleDateString("vi-VN");
}

function estimateReadingMinutes(content = "") {
    const words = stripHtml(content).trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 220));
}

function currentStoredUserId() {
    try {
        const user = typeof getUserInfo === "function" ? getUserInfo() : JSON.parse(localStorage.getItem("user") || "null");
        return user?._id || user?.id || "";
    } catch (_) {
        return "";
    }
}

function getPostId(post) {
    return post?._id || post?.id || "";
}

function getPostSlug(post) {
    return encodeURIComponent(post?.slug || post?._id || post?.id || "");
}

function getPostUrl(post, hash = "") {
    return `post.html?slug=${getPostSlug(post)}${hash}`;
}

function getLikeButtonLabel(liked, count) {
    return `${liked ? "💔 Bỏ like" : "❤️ Like"} ${Number(count) || 0}`;
}

function getLikeCount(post) {
    if (Array.isArray(post?.likes)) return post.likes.length;
    if (typeof post?.likes === "number") return post.likes;
    if (typeof post?.likesCount === "number") return post.likesCount;
    return 0;
}

function getCommentCount(post) {
    if (Array.isArray(post?.comments)) return post.comments.length;
    if (typeof post?.commentsCount === "number") return post.commentsCount;
    return 0;
}

function getPostsFromResponse(result) {
    if (!result) return [];
    if (Array.isArray(result.data)) return result.data;
    if (Array.isArray(result.data?.posts)) return result.data.posts;
    if (Array.isArray(result.data?.latestPosts)) return result.data.latestPosts;
    return [];
}

function getPaginationFromResponse(result, fallbackPage = 1, fallbackTotal = 1) {
    const p = result?.pagination || result?.data?.pagination || {};
    return {
        currentPage: Number(p.currentPage || p.page || fallbackPage) || fallbackPage,
        totalPage: Number(p.totalPage || p.pages || fallbackTotal) || fallbackTotal,
        totalPosts: Number(p.totalPosts || p.total || 0) || 0
    };
}

function resultOk(result) {
    return Boolean(result && (result.success === true || result.code === 200 || result.code === 201 || result.status === "success"));
}

function getErrorMessage(result, fallback = "Có lỗi xảy ra") {
    if (result?.message) return result.message;
    if (Array.isArray(result?.errors)) return result.errors.map(e => e.msg || e.message).join("\n");
    return fallback;
}

function idToString(value) {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object" && value._id) return String(value._id);
    return String(value);
}

function isLikedByUser(post, userId) {
    if (!post || !userId || !Array.isArray(post.likes)) return false;
    const target = String(userId);
    return post.likes.some(item => idToString(item) === target);
}

function renderPost(post) {
    const title = escapeHtml(post.title || "Không có tiêu đề");
    const slug = getPostSlug(post);
    const postUrl = getPostUrl(post);
    const commentUrl = getPostUrl(post, "#comments");
    const thumb = normalizeImageUrl(post.thumbnail, "https://via.placeholder.com/800x400?text=Blog+Post");
    const authorName = escapeHtml(post.author?.fullname || post.author?.username || "Ẩn danh");
    const authorId = idToString(post.author);
    const authorHtml = authorId ? `<a href="profile.html?id=${encodeURIComponent(authorId)}"><b>${authorName}</b></a>` : `<b>${authorName}</b>`;
    const tags = Array.isArray(post.tags) ? post.tags : [];
    const postId = escapeHtml(getPostId(post));
    const liked = isLikedByUser(post, currentStoredUserId());
    const likeCount = getLikeCount(post);

    return `
        <article class="section-card article-card">
            <a href="${postUrl}">
                <img src="${thumb}" alt="${title}">
            </a>
            <div>
                <h3><a href="${postUrl}">${title}</a></h3>
                <div class="article-meta-line">
                    <span>${authorHtml}</span>
                    <span>${formatDate(post.createdAt)}</span>
                    <span>${estimateReadingMinutes(post.content)} phút đọc</span>
                </div>
                <p>${escapeHtml(truncateText(post.content, 150))}</p>
                ${tags.length ? `<div class="tag-list">${tags.map(tag => `<a href="categories.html?tag=${encodeURIComponent(tag)}">#${escapeHtml(tag)}</a>`).join("")}</div>` : ""}
            </div>
            <div class="card-footer">
                <small>Chia sẻ kiến thức</small>
                <div class="article-actions">
                    <button type="button" class="post-card-like ${liked ? "liked" : ""}" data-card-like="${postId}" data-liked="${liked}" data-count="${likeCount}">${getLikeButtonLabel(liked, likeCount)}</button>
                    <a class="post-card-comment" href="${commentUrl}">💬 ${getCommentCount(post)}</a>
                </div>
            </div>
        </article>
    `;
}

function renderPosts(posts, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!posts || posts.length === 0) {
        container.innerHTML = `<div class="section-card empty-state">Chưa có bài viết nào.</div>`;
        return;
    }

    container.innerHTML = posts.map(post => renderPost(post)).join("");
    bindPostCardActions(container);
}

function bindPostCardActions(scope = document) {
    scope.querySelectorAll("[data-card-like]").forEach(button => {
        button.addEventListener("click", handlePostCardLikeClick);
    });
}

async function handlePostCardLikeClick(event) {
    event.preventDefault();
    event.stopPropagation();

    const button = event.currentTarget;
    const postId = button.dataset.cardLike;
    if (!postId) return;

    if (typeof isLoggedIn === "function" && !isLoggedIn()) {
        try { sessionStorage.setItem("authMessage", "Vui lòng đăng nhập để like bài viết."); } catch (_) {}
        window.location.href = "login.html";
        return;
    }

    const liked = button.dataset.liked === "true";
    const oldCount = Number(button.dataset.count || 0);
    button.disabled = true;

    const result = liked ? await unlikePost(postId) : await likePost(postId);
    if (resultOk(result)) {
        const newLiked = !liked;
        const newCount = Number(result.likesCount ?? result.data?.likesCount ?? (newLiked ? oldCount + 1 : Math.max(0, oldCount - 1)));
        button.dataset.liked = String(newLiked);
        button.dataset.count = String(newCount);
        button.classList.toggle("liked", newLiked);
        button.textContent = getLikeButtonLabel(newLiked, newCount);
        toast(newLiked ? "Đã like bài viết" : "Đã bỏ like bài viết", "success");
    } else {
        toast(getErrorMessage(result, "Không cập nhật được lượt thích"), "error");
    }

    button.disabled = false;
}

function renderPhanTrang(containerId, trangHT, tongTrang, hamLoad) {
    const container = document.getElementById(containerId);
    if (!container) return;

    trangHT = Number(trangHT) || 1;
    tongTrang = Number(tongTrang) || 1;

    if (tongTrang <= 1) {
        container.innerHTML = "";
        return;
    }

    let html = "";
    html += `<button class="btn-trang" ${trangHT === 1 ? "disabled" : `onclick="${hamLoad.name}(${trangHT - 1})"`}>← Trước</button>`;

    const batDau = Math.max(1, trangHT - 2);
    const ketThuc = Math.min(tongTrang, trangHT + 2);

    if (batDau > 1) {
        html += `<button class="btn-trang" onclick="${hamLoad.name}(1)">1</button>`;
        if (batDau > 2) html += `<span class="page-ellipsis">...</span>`;
    }

    for (let i = batDau; i <= ketThuc; i++) {
        html += `<button class="btn-trang ${i === trangHT ? "active" : ""}" ${i === trangHT ? "disabled" : `onclick="${hamLoad.name}(${i})"`}>${i}</button>`;
    }

    if (ketThuc < tongTrang) {
        if (ketThuc < tongTrang - 1) html += `<span class="page-ellipsis">...</span>`;
        html += `<button class="btn-trang" onclick="${hamLoad.name}(${tongTrang})">${tongTrang}</button>`;
    }

    html += `<button class="btn-trang" ${trangHT === tongTrang ? "disabled" : `onclick="${hamLoad.name}(${trangHT + 1})"`}>Sau →</button>`;
    container.innerHTML = html;
}

function renderPhanTrangAdmin(containerId, trangHT, tongTrang, hamLoad) {
    return renderPhanTrang(containerId, trangHT, tongTrang, hamLoad);
}

function renderCategories(categories) {
    if (!categories || categories.length === 0) {
        return `<section class="section-card empty-state">Chưa có tag nào trong các bài viết.</section>`;
    }

    return categories.map(cat => `
        <section class="section-card category-card">
            <a href="categories.html?tag=${encodeURIComponent(cat._id)}">
                <h2>#${escapeHtml(cat._id)}</h2>
                <p>${cat.count} bài viết</p>
            </a>
        </section>
    `).join("");
}

function getCommentId(comment) {
    return comment?._id || comment?.id || "";
}

function canEditComment(comment) {
    const userId = currentStoredUserId();
    return Boolean(userId && idToString(comment?.user) === String(userId));
}

function canDeleteComment(comment) {
    const userId = currentStoredUserId();
    const postAuthorId = idToString(window.currentPost?.author);
    return Boolean(userId && (idToString(comment?.user) === String(userId) || postAuthorId === String(userId)));
}

function renderComment(comment) {
    const commentId = escapeHtml(getCommentId(comment));
    const canEdit = canEditComment(comment);
    const canDelete = canDeleteComment(comment);
    const actions = (canEdit || canDelete) ? `
                <div class="comment-actions">
                    ${canEdit ? `<button type="button" class="comment-action-btn" data-comment-edit="${commentId}">Sửa</button>` : ""}
                    ${canDelete ? `<button type="button" class="comment-action-btn danger" data-comment-delete="${commentId}">Xóa</button>` : ""}
                </div>
            ` : "";

    return `
        <div class="comment-item" data-comment-id="${commentId}">
            <div class="comment-meta">
                <img src="${normalizeImageUrl(comment.user?.avatar, "https://via.placeholder.com/36?text=U")}" alt="Avatar">
                <div>
                    <b>${escapeHtml(comment.user?.fullname || comment.user?.username || "Ẩn danh")}</b><br>
                    <span>${formatDate(comment.createdAt)}</span>
                </div>
                ${actions}
            </div>
            <p class="comment-content">${escapeHtml(comment.content || "")}</p>
        </div>
    `;
}

function renderComments(comments, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!comments || comments.length === 0) {
        container.innerHTML = `<p class="empty-state">Chưa có bình luận nào.</p>`;
        return;
    }

    container.innerHTML = comments.map(renderComment).join("");
}

async function loadAllPosts(maxPages = 30) {
    const all = [];
    let page = 1;
    let totalPage = 1;

    do {
        const result = await getPosts(page, 4);
        if (!resultOk(result)) break;
        all.push(...getPostsFromResponse(result));
        totalPage = getPaginationFromResponse(result, page, totalPage).totalPage;
        page++;
    } while (page <= totalPage && page <= maxPages);

    return all;
}

function getQueryParam(param) {
    return new URLSearchParams(window.location.search).get(param);
}

function showLoading(text = "Đang tải...") {
    const loader = document.getElementById("loader");
    if (loader) loader.remove();
}

function hideLoading() {
    const loader = document.getElementById("loader");
    if (loader) loader.remove();
}

function toast(message, type = "info") {
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
}

function showMessage(message, containerId, type = "info") {
    const container = document.getElementById(containerId);
    const cls = type === "error" ? "alert-error" : type === "success" ? "alert-success" : "alert-info";
    if (container) {
        container.innerHTML = `<div class="alert ${cls}">${escapeHtml(message)}</div>`;
    } else {
        toast(message, type);
    }
}

function showError(message, containerId) {
    showMessage(message, containerId, "error");
}

window.escapeHtml = escapeHtml;
window.stripHtml = stripHtml;
window.truncateText = truncateText;
window.normalizeImageUrl = normalizeImageUrl;
window.formatDate = formatDate;
window.estimateReadingMinutes = estimateReadingMinutes;
window.currentStoredUserId = currentStoredUserId;
window.getPostId = getPostId;
window.getPostSlug = getPostSlug;
window.getPostUrl = getPostUrl;
window.bindPostCardActions = bindPostCardActions;
window.getLikeCount = getLikeCount;
window.getCommentCount = getCommentCount;
window.idToString = idToString;
window.isLikedByUser = isLikedByUser;
window.getPostsFromResponse = getPostsFromResponse;
window.getPaginationFromResponse = getPaginationFromResponse;
window.resultOk = resultOk;
window.getErrorMessage = getErrorMessage;
window.renderPost = renderPost;
window.renderPosts = renderPosts;
window.renderPhanTrang = renderPhanTrang;
window.renderPhanTrangAdmin = renderPhanTrangAdmin;
window.renderCategories = renderCategories;
window.getCommentId = getCommentId;
window.canEditComment = canEditComment;
window.canDeleteComment = canDeleteComment;
window.renderComment = renderComment;
window.renderComments = renderComments;
window.loadAllPosts = loadAllPosts;
window.getQueryParam = getQueryParam;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.toast = toast;
window.showMessage = showMessage;
window.showError = showError;
