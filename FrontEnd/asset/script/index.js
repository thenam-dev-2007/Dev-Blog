let currentHomePage = 1;

function updateHomeWriteLinks() {
    const links = [
        document.getElementById("homeWriteBtn"),
        document.getElementById("homeWriteBtnSmall"),
        document.getElementById("sidebarWriteBtn"),
    ].filter(Boolean);

    links.forEach(link => {
        if (isLoggedIn()) {
            link.href = "create_post.html";
            link.title = "Đăng bài viết mới";
        } else {
            link.href = "login.html";
            link.title = "Đăng nhập để đăng bài";
        }
    });
}

function renderPopularTags(posts) {
    const container = document.getElementById("popularTags");
    if (!container) return;

    const counts = new Map();
    posts.forEach(post => {
        (post.tags || []).forEach(tag => {
            const key = String(tag || "").trim();
            if (key) counts.set(key, (counts.get(key) || 0) + 1);
        });
    });

    const tags = Array.from(counts, ([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
        .slice(0, 8);

    if (!tags.length) return;
    container.innerHTML = tags.map(item =>
        `<a href="categories.html?tag=${encodeURIComponent(item.tag)}">#${escapeHtml(item.tag)} <small>(${item.count})</small></a>`
    ).join("");
}

function renderHomeStats(posts) {
    const tagSet = new Set();
    let likes = 0;
    posts.forEach(post => {
        likes += getLikeCount(post);
        (post.tags || []).forEach(tag => tag && tagSet.add(String(tag).trim()));
    });

    const statPosts = document.getElementById("statPosts");
    const statTags = document.getElementById("statTags");
    const statLikes = document.getElementById("statLikes");
    if (statPosts) statPosts.textContent = posts.length;
    if (statTags) statTags.textContent = tagSet.size;
    if (statLikes) statLikes.textContent = likes;
}

function renderFeaturedPosts(posts) {
    const featured = [...posts]
        .sort((a, b) => {
            const scoreB = getLikeCount(b) * 2 + getCommentCount(b);
            const scoreA = getLikeCount(a) * 2 + getCommentCount(a);
            return scoreB - scoreA || new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        })
        .slice(0, 4);

    renderPosts(featured, "featuredPosts");
}

async function loadHomeEnhancements() {
    const posts = await loadAllPosts(30);
    renderHomeStats(posts);
    renderPopularTags(posts);
    renderFeaturedPosts(posts);
}

async function loadHomePage(page = 1) {
    currentHomePage = page;
    updateHomeWriteLinks();
    showLoading("Đang tải bài viết...");

    const result = await getPosts(page, 6);
    hideLoading();

    if (!resultOk(result)) {
        showError(getErrorMessage(result, "Không tải được danh sách bài viết"), "latestPosts");
        return;
    }

    const posts = getPostsFromResponse(result);
    const pagination = getPaginationFromResponse(result, page, 1);

    renderPosts(posts, "latestPosts");
    renderPhanTrang("phan-trang-home", pagination.currentPage, pagination.totalPage, loadHomePage);
}

document.addEventListener("DOMContentLoaded", () => {
    updateHomeWriteLinks();
    loadHomePage(1);
    loadHomeEnhancements();
});
window.loadHomePage = loadHomePage;
