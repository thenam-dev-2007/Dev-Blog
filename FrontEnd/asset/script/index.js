async function loadHomePage() {
  showLoading("Đang tải dữ liệu...");
  try {
    const response = await fetch("http://localhost:3000/");
    const result = await response.json();

    hideLoading();

    if (result.code === 200) {
      // Render Bài Viết Mới nhất
      const latestContainer = document.getElementById("latestPosts");
      if (latestContainer && result.data.latestPosts) {
        latestContainer.innerHTML = result.data.latestPosts
          .map((post) => renderPost(post))
          .join("");
      }

      // Render Bài Viết Nổi Bật
      const topContainer = document.getElementById("topPosts");
      if (topContainer && result.data.topPosts) {
        topContainer.innerHTML = result.data.topPosts
          .map((post) => renderPost(post))
          .join("");
      }
    } else {
      showError("Không thể tải dữ liệu. Vui lòng thử lại sau.");
    }
  } catch (error) {
    hideLoading();
    console.error("Lỗi:", error);
    showError("Lỗi kết nối:" + error.message, "content");
  }
}

// Gọi khi trang load
document.addEventListener("DOMContentLoaded", loadHomePage);
