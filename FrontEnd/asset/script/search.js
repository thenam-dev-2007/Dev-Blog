// search.html - Trang tìm kiếm
let currentSearchQuery = "";
let currentSearchPage = 1;

async function loadSearchResults(page = 1) {
  const query = getQueryParam("q");

  if (!query) {
    showError("Vui lòng nhập từ khóa tìm kiếm", "content");
    return;
  }

  currentSearchQuery = query;
  currentSearchPage = page;
  showLoading("Đang tìm kiếm...");

  try {
    const result = await apiCall(
      `/search?q=${encodeURIComponent(query)}&page=${page}`,
      "GET",
    );
    hideLoading();

    const contentDiv = document.getElementById("searchResults");
    if (result.code === 200) {
      if (result.data && result.data.length > 0) {
        contentDiv.innerHTML = `<div class="search-info">
                    <p>Tìm thấy <strong>${result.pagination.total}</strong> kết quả cho "<strong>${query}</strong>"</p>
                </div>`;
        renderPosts(result.data, "searchResults");

        // Thêm pagination
        const paginationDiv = document.getElementById("pagination");
        if (paginationDiv) {
          paginationDiv.innerHTML = renderPage(
            result.pagination.page,
            result.pagination.pages,
          );
        }
      } else {
        contentDiv.innerHTML = `<p class="no-results">Không tìm thấy bài viết nào</p>`;
      }
    } else {
      showError(result.message || "Không thể thực hiện tìm kiếm", "content");
    }
  } catch (error) {
    hideLoading();
    console.error("Lỗi:", error);
    showError("Lỗi kết nối: " + error.message, "content");
  }
}

// Xử lý đổi trang
function handleSearchPageChange(newPage) {
  loadSearchResults(page);
  window.scroll(0, 0);
}

// Gọi khi trang load
document.addEventListener("DOMContentLoaded", () => {
  loadSearchResults(1);
});
