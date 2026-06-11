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

function renderPost(post) {
    const title = escapeHtml(post.title || "Không có tiêu đề");
    const slug = encodeURIComponent(post.slug || post._id || "");
    const thumb = normalizeImageUrl(post.thumbnail, "https://via.placeholder.com/800x400?text=Blog+Post");
    const author = escapeHtml(post.author?.username || "Ẩn danh");
    const tags = Array.isArray(post.tags) ? post.tags : [];

    return `
        <article class="section-card article-card">
            <a href="post.html?slug=${slug}">
                <img src="${thumb}" alt="${title}">
            </a>
            <div>
                <h3><a href="post.html?slug=${slug}">${title}</a></h3>
                <p>${escapeHtml(truncateText(post.content, 150))}</p>
                ${tags.length ? `<div class="tag-list">${tags.map(tag => `<a href="categories.html?tag=${encodeURIComponent(tag)}">#${escapeHtml(tag)}</a>`).join("")}</div>` : ""}
            </div>
            <div class="card-footer">
                <small><b>${author}</b> | ${formatDate(post.createdAt)}</small>
                <div class="article-actions">
                    <button type="button">❤️ ${getLikeCount(post)}</button>
                    <button type="button">💬 ${getCommentCount(post)}</button>
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

function renderComment(comment) {
    return `
        <div class="comment-item">
            <div class="comment-meta">
                <img src="${normalizeImageUrl(comment.user?.avatar, "https://via.placeholder.com/36?text=U")}" alt="Avatar">
                <div>
                    <b>${escapeHtml(comment.user?.username || "Ẩn danh")}</b><br>
                    <span>${formatDate(comment.createdAt)}</span>
                </div>
            </div>
            <p>${escapeHtml(comment.content || "")}</p>
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
window.getLikeCount = getLikeCount;
window.getCommentCount = getCommentCount;
window.getPostsFromResponse = getPostsFromResponse;
window.getPaginationFromResponse = getPaginationFromResponse;
window.resultOk = resultOk;
window.getErrorMessage = getErrorMessage;
window.renderPost = renderPost;
window.renderPosts = renderPosts;
window.renderPhanTrang = renderPhanTrang;
window.renderPhanTrangAdmin = renderPhanTrangAdmin;
window.renderCategories = renderCategories;
window.renderComment = renderComment;
window.renderComments = renderComments;
window.loadAllPosts = loadAllPosts;
window.getQueryParam = getQueryParam;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.toast = toast;
window.showMessage = showMessage;
window.showError = showError;
