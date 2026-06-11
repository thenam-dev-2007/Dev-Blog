let currentCategoryPage = 1;
let currentTag = null;

async function loadCategoryPage(page = 1) {
    currentCategoryPage = page;
    currentTag = getQueryParam("tag");

    const title = document.getElementById("categoryTitle");
    const desc = document.getElementById("categoryDesc");
    const content = document.getElementById("categoryContent");

    showLoading("Đang tải danh mục...");

    if (currentTag) {
        if (title) title.textContent = `#${currentTag}`;
        if (desc) desc.textContent = "Các bài viết thuộc tag này.";

        const result = await getPostsByTag(currentTag, page, 9);
        hideLoading();

        if (!resultOk(result)) {
            showError(getErrorMessage(result, "Không tải được bài viết theo tag"), "categoryContent");
            return;
        }

        const posts = result.data?.posts || getPostsFromResponse(result);
        const pagination = getPaginationFromResponse(result, page, 1);
        renderPosts(posts, "categoryContent");
        renderPhanTrang("phan-trang-category", pagination.currentPage, pagination.totalPage, loadCategoryPage);
        return;
    }

    if (title) title.textContent = "Danh mục";
    if (desc) desc.textContent = "Các tag được tổng hợp từ bài viết hiện có trong backend.";

    const posts = await loadAllPosts();
    hideLoading();

    const counts = new Map();
    posts.forEach(post => {
        (post.tags || []).forEach(tag => {
            if (!tag) return;
            counts.set(tag, (counts.get(tag) || 0) + 1);
        });
    });

    const categories = Array.from(counts, ([tag, count]) => ({ _id: tag, count }))
        .sort((a, b) => b.count - a.count || a._id.localeCompare(b._id));

    if (content) content.innerHTML = renderCategories(categories);
    const pagination = document.getElementById("phan-trang-category");
    if (pagination) pagination.innerHTML = "";
}

document.addEventListener("DOMContentLoaded", () => loadCategoryPage(1));
window.loadCategoryPage = loadCategoryPage;
