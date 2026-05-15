document.addEventListener("DOMContentLoaded", function () {
    var btnDarkMode = document.getElementById("btnDarkMode");
    var headerSearch = document.getElementById("headerSearch");

    // Khởi động: đọc theme đã lưu từ lần trước
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark");
        if (btnDarkMode) btnDarkMode.textContent = "☀️";
    }

    // Bật/tắt dark mode
    window.toggleDarkMode = function () {
        document.body.classList.toggle("dark");
        var btn = document.getElementById("btnDarkMode");
        if (!btn) return;

        if (document.body.classList.contains("dark")) {
            btn.textContent = "☀️";
            localStorage.setItem("theme", "dark");
        } else {
            btn.textContent = "🌙";
            localStorage.setItem("theme", "light");
        }
    };

    // Mở / đóng thanh tìm kiếm
    window.toggleSearch = function () {
        var input = document.getElementById("headerSearch");
        if (!input) return;

        input.classList.toggle("open");
        if (input.classList.contains("open")) {
            input.focus();
        } else {
            input.value = "";
        }
    };

    // Nhấn Enter để tìm kiếm
    if (headerSearch) {
        headerSearch.addEventListener("keydown", function (e) {
            if (e.key === "Enter" && this.value.trim() !== "") {
                window.location.href = "search.html?q=" + encodeURIComponent(this.value.trim());
            }
        });
    }
});

// ==================== API HELPERS ====================
const API_BASE_URL = "http://localhost:3000/api";

// API wrapper function
async function apiCall(endpoint, method = "GET", data = null) {
    const options = {
        method,
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include" // Gửi cookie cho session
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        const result = await response.json();
        return result;
    } catch (error) {
        console.error("API Error:", error);
        return { code: 500, message: "Lỗi kết nối", error: error.message };
    }
}

// ==================== AUTHENTICATION ====================

// Đăng ký
async function register(username, email, password, passwordConfirm) {
    return await apiCall("/auth/register", "POST", {
        username,
        email,
        password,
        passwordConfirm
    });
}

// Đăng nhập
async function login(username, password) {
    return await apiCall("/auth/login", "POST", {
        username,
        password
    });
}

// Lấy profile
async function getProfile() {
    return await apiCall("/auth/profile", "GET");
}

// Cập nhật profile
async function updateProfile(avatar, dateOfBirth) {
    return await apiCall("/auth/profile", "PATCH", {
        avatar,
        dateOfBirth
    });
}

// Đăng xuất
async function logout() {
    return await apiCall("/auth/logout", "POST");
}

// ==================== POSTS ====================

// Lấy danh sách bài viết
async function getPosts(page = 1) {
    return await apiCall(`/posts?page=${page}`, "GET");
}

// Lấy chi tiết bài viết
async function getPostDetail(slug) {
    return await apiCall(`/posts/${slug}`, "GET");
}

// Like bài viết
async function likePost(postId) {
    return await apiCall(`/posts/${postId}/like`, "POST");
}

// Bình luận bài viết
async function commentPost(postId, content, userId) {
    return await apiCall(`/posts/${postId}/comment`, "POST", {
        content,
        userId
    });
}

// ==================== CATEGORIES ====================

// Lấy danh sách categories
async function getCategories() {
    return await apiCall("/categories", "GET");
}

// Lấy bài viết theo category
async function getPostsByCategory(tag, page = 1) {
    return await apiCall(`/category/${tag}?page=${page}`, "GET");
}

// ==================== SEARCH ====================

// Tìm kiếm bài viết
async function searchPosts(q, page = 1) {
    return await apiCall(`/search?q=${encodeURIComponent(q)}&page=${page}`, "GET");
}