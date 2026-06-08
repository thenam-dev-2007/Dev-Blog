// index.js - Trang chủ
// Biến lưu trang hiện tại
var trangHienTai = 1;

async function loadHomePage(trang) {
    trang = trang || 1;
    trangHienTai = trang;

    showLoading("Đang tải dữ liệu...");

    try {
        // Gọi API lấy bài viết trang chủ
        const result = await apiCall("/posts?page=" + trang, "GET");
        hideLoading();

        if (result.code === 200) {
            // Render bài viết vào latestPosts
            var latestContainer = document.getElementById("latestPosts");
            if (latestContainer && result.data) {
                latestContainer.innerHTML = result.data
                    .map(function(post) { return renderPost(post); })
                    .join("");
            }

            // Cập nhật phân trang
            var tongTrang = result.pagination ? result.pagination.pages : 1;
            renderPhanTrang('phan-trang-home', trang, tongTrang, loadHomePage);

        } else {
            showError("Không thể tải dữ liệu. Vui lòng thử lại sau.", "latestPosts");
        }
    } catch (error) {
        hideLoading();
        console.error("Lỗi:", error);
        showError("Lỗi kết nối: " + error.message, "latestPosts");
    }
}

// Gọi khi trang load
document.addEventListener("DOMContentLoaded", function() {
    loadHomePage(1);
});
