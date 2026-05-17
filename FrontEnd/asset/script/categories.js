// categories.html - Trang categories
let currentTag = "";
let currentCategoryPage = 1;

async function loadCategories() {
  showLoading("Đang tải danh mục...");

  try {
    const result = await apiCall("/categories", "GET");
    hideLoading();

    if (result.code === 200 && result.data) {
      const categoriesDiv = document.getElementById("all-categories");
      if (categoriesDiv) {
        categoriesDiv.innerHTML = renderCategories(result.data);
      }
    }
  } catch (error) {
    hideLoading();
    console.error("Lỗi:", error);
  }
}

async function loadPostsByCategory(page = 1) {
  const tag = getQueryParam("tag");

  if (!tag) {
    // Load tất cả categories néu không có tag
    loadCategories();
    return;
  }

  currentTag = tag;
  currentCategoryPage = page;
  showLoading("Đang tải bài viết...");

  try {
    const result = await apiCall(`/category/${tag}?page=${page}`, "GET");
    hideLoading();

    const contentDiv = document.getElementById("category-posts");

    if (result.code === 200) {
      if (result.data && result.data.length > 0) {
        contentDiv.innerHTML = `
                    <div class="category-header">
                        <h2>Danh mục: <strong>${tag}</strong></h2>
                        <p>${result.pagination.total} bài viết</p>
                    </div>
                `;
        renderPosts(result.data, "category-posts");
      } else {
        contentDiv.innerHTML = `<p>Không có bài viết trong danh mục này</p>`;
      }
    } else {
      showError(result.message || "Không thể tải bài viết", "content");
    }
  } catch (error) {
    hideLoading();
    console.error("Lỗi:", error);
    showError("Lỗi kết nối: " + error.message, "content");
  }
}

// Xử lý đổi trang
function handleCategoryPageChange(newPage) {
  loadPostsByCategory(newPage);
  window.scroll(0, 0);
}

// Gọi khi trang load
document.addEventListener("DOMContentLoaded", () => {
  const tag = getQueryParam("tag");
  if (tag) {
    loadPostsByCategory(1);
  } else {
    loadCategories();
  }
});
