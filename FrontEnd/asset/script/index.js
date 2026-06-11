let currentHomePage = 1;

async function loadHomePage(page = 1) {
    currentHomePage = page;
    showLoading("Đang tải bài viết...");

    const result = await getPosts(page, 4);
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

document.addEventListener("DOMContentLoaded", () => loadHomePage(1));
window.loadHomePage = loadHomePage;
