const ARTICLE_LIST_LIMIT = 4;
let currentArticleType = "latest";
let cachedFeaturedPosts = null;

function getArticleTypeFromUrl() {
    const type = (getQueryParam("type") || "latest").toLowerCase();
    return type === "featured" ? "featured" : "latest";
}

function setArticleListHeader(type) {
    const isFeatured = type === "featured";
    const pageTitle = isFeatured ? "Bài viết nổi bật" : "Bài viết mới nhất";
    const pageDesc = isFeatured
        ? "Những bài viết có nhiều lượt thích và bình luận nhất trong cộng đồng."
        : "Những bài viết được đăng gần đây nhất trên DEV BLOG.";

    document.title = `${pageTitle} - DEV BLOG`;

    const title = document.getElementById("articleListTitle");
    const desc = document.getElementById("articleListDesc");
    const subTitle = document.getElementById("articleListSubTitle");
    const subDesc = document.getElementById("articleListSubDesc");
    const eyebrow = document.getElementById("articleListEyebrow");
    const btnFeatured = document.getElementById("btnFeaturedList");
    const btnLatest = document.getElementById("btnLatestList");
    const writeBtn = document.getElementById("articleListWriteBtn");

    if (eyebrow) eyebrow.textContent = isFeatured ? "Được cộng đồng quan tâm" : "Cập nhật mới";
    if (title) title.textContent = pageTitle;
    if (desc) desc.textContent = pageDesc;
    if (subTitle) subTitle.textContent = pageTitle;
    if (subDesc) subDesc.textContent = "Mỗi trang hiển thị 4 bài để đồng nhất với phân trang backend.";

    if (btnFeatured) btnFeatured.classList.toggle("active-filter", isFeatured);
    if (btnLatest) btnLatest.classList.toggle("active-filter", !isFeatured);

    if (writeBtn) {
        writeBtn.href = isLoggedIn() ? "create_post.html" : "login.html";
        writeBtn.title = isLoggedIn() ? "Đăng bài viết mới" : "Đăng nhập để đăng bài";
    }
}

function getFeaturedScore(post) {
    return getLikeCount(post) * 2 + getCommentCount(post);
}

async function getSortedFeaturedPosts() {
    if (cachedFeaturedPosts) return cachedFeaturedPosts;

    const posts = await loadAllPosts(100);
    cachedFeaturedPosts = posts.sort((a, b) => {
        const scoreB = getFeaturedScore(b);
        const scoreA = getFeaturedScore(a);
        return scoreB - scoreA || new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    return cachedFeaturedPosts;
}

async function loadFeaturedArticleList(page = 1) {
    showLoading("Đang tải bài viết nổi bật...");

    try {
        const posts = await getSortedFeaturedPosts();
        const totalPage = Math.max(1, Math.ceil(posts.length / ARTICLE_LIST_LIMIT));
        const safePage = Math.min(Math.max(Number(page) || 1, 1), totalPage);
        const start = (safePage - 1) * ARTICLE_LIST_LIMIT;
        const pagePosts = posts.slice(start, start + ARTICLE_LIST_LIMIT);

        renderPosts(pagePosts, "articleList");
        renderPhanTrang("phan-trang-articles", safePage, totalPage, loadArticleListing);
    } catch (error) {
        console.error(error);
        showError("Không tải được bài viết nổi bật", "articleList");
    } finally {
        hideLoading();
    }
}

async function loadLatestArticleList(page = 1) {
    showLoading("Đang tải bài viết mới nhất...");

    try {
        const result = await getPosts(page, ARTICLE_LIST_LIMIT);

        if (!resultOk(result)) {
            showError(getErrorMessage(result, "Không tải được bài viết mới nhất"), "articleList");
            return;
        }

        const posts = getPostsFromResponse(result);
        const pagination = getPaginationFromResponse(result, page, 1);

        renderPosts(posts, "articleList");
        renderPhanTrang("phan-trang-articles", pagination.currentPage, pagination.totalPage, loadArticleListing);
    } catch (error) {
        console.error(error);
        showError("Không tải được bài viết mới nhất", "articleList");
    } finally {
        hideLoading();
    }
}

async function loadArticleListing(page = 1) {
    currentArticleType = getArticleTypeFromUrl();
    setArticleListHeader(currentArticleType);

    if (currentArticleType === "featured") {
        await loadFeaturedArticleList(page);
    } else {
        await loadLatestArticleList(page);
    }
}

document.addEventListener("DOMContentLoaded", () => loadArticleListing(1));
window.loadArticleListing = loadArticleListing;
