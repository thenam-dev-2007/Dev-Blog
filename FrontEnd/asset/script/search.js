let currentSearchPage = 1;
let currentSearchQuery = "";
let cachedSearchResults = [];
const SEARCH_PAGE_SIZE = 9;

function renderSearchPage(page = 1) {
    currentSearchPage = page;
    const totalPage = Math.max(1, Math.ceil(cachedSearchResults.length / SEARCH_PAGE_SIZE));
    const start = (page - 1) * SEARCH_PAGE_SIZE;
    const pagePosts = cachedSearchResults.slice(start, start + SEARCH_PAGE_SIZE);

    const info = document.getElementById("searchInfo");
    if (info) {
        info.innerHTML = `Tìm thấy <strong>${cachedSearchResults.length}</strong> kết quả cho <strong>${escapeHtml(currentSearchQuery)}</strong>`;
    }

    renderPosts(pagePosts, "searchResults");
    renderPhanTrang("phan-trang-search", page, totalPage, renderSearchPage);
}

async function loadSearchResults(page = 1) {
    const query = (getQueryParam("q") || "").trim();
    currentSearchQuery = query;

    const queryText = document.querySelector("#searchQuery strong");
    if (queryText) queryText.textContent = query || "chưa nhập từ khóa";

    if (!query) {
        showMessage("Hãy nhập từ khóa trên thanh tìm kiếm.", "searchResults", "info");
        return;
    }

    showLoading("Đang tìm kiếm...");
    const posts = await loadAllPosts();
    hideLoading();

    const q = query.toLowerCase();
    cachedSearchResults = posts.filter(post => {
        const text = [post.title, post.content, ...(post.tags || [])].join(" ").toLowerCase();
        return text.includes(q);
    });

    renderSearchPage(page);
}

document.addEventListener("DOMContentLoaded", () => loadSearchResults(1));
window.loadSearchResults = loadSearchResults;
window.renderSearchPage = renderSearchPage;
