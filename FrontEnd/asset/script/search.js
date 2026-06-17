let currentSearchPage = 1;
let currentSearchQuery = "";
const SEARCH_PAGE_SIZE = 9;

async function loadSearchResults(page = 1) {
    const query = (getQueryParam("q") || "").trim();
    currentSearchPage = page;
    currentSearchQuery = query;

    const queryText = document.querySelector("#searchQuery strong");
    if (queryText) queryText.textContent = query || "chưa nhập từ khóa";

    if (!query) {
        showMessage("Hãy nhập từ khóa trên thanh tìm kiếm.", "searchResults", "info");
        const pageBox = document.getElementById("phan-trang-search");
        if (pageBox) pageBox.innerHTML = "";
        return;
    }

    showLoading("Đang tìm kiếm...");
    let result = null;

    if (typeof searchPosts === "function") {
        result = await searchPosts(query, page, SEARCH_PAGE_SIZE);
    }

    hideLoading();

    if (!resultOk(result)) {
        // Fallback an toàn: nếu backend search chưa sẵn sàng, lọc phía client.
        const posts = await loadAllPosts();
        const q = query.toLowerCase();
        const filtered = posts.filter(post => {
            const text = [post.title, post.content, ...(post.tags || [])].join(" ").toLowerCase();
            return text.includes(q);
        });
        const totalPage = Math.max(1, Math.ceil(filtered.length / SEARCH_PAGE_SIZE));
        const start = (page - 1) * SEARCH_PAGE_SIZE;
        renderPosts(filtered.slice(start, start + SEARCH_PAGE_SIZE), "searchResults");
        renderPhanTrang("phan-trang-search", page, totalPage, loadSearchResults);
        const info = document.getElementById("searchInfo");
        if (info) info.innerHTML = `Tìm thấy <strong>${filtered.length}</strong> kết quả cho <strong>${escapeHtml(query)}</strong>`;
        return;
    }

    const posts = getPostsFromResponse(result);
    const pagination = getPaginationFromResponse(result, page, 1);
    const info = document.getElementById("searchInfo");
    if (info) {
        const total = pagination.totalPosts || posts.length;
        info.innerHTML = `Tìm thấy <strong>${total}</strong> kết quả cho <strong>${escapeHtml(query)}</strong>`;
    }

    renderPosts(posts, "searchResults");
    renderPhanTrang("phan-trang-search", pagination.currentPage, pagination.totalPage, loadSearchResults);
}

document.addEventListener("DOMContentLoaded", () => loadSearchResults(1));
window.loadSearchResults = loadSearchResults;
