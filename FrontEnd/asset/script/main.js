// ==================== MAIN.JS ====================
// Chạy trên MỌI trang (client + admin)
// Xử lý: dark mode, thanh tìm kiếm header, apiCall, auth functions

document.addEventListener("DOMContentLoaded", function () {
    var btnDarkMode = document.getElementById("btnDarkMode");
    var headerSearch = document.getElementById("headerSearch");

    // Khởi động: đọc theme đã lưu từ lần trước
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark");
        if (btnDarkMode) btnDarkMode.textContent = "☀️";
    }

    // Nhấn Enter trong ô search header → chuyển sang search.html
    if (headerSearch) {
        headerSearch.addEventListener("keydown", function (e) {
            if (e.key === "Enter" && this.value.trim() !== "") {
                window.location.href = "search.html?q=" + encodeURIComponent(this.value.trim());
            }
        });
    }
});

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

// Mở / đóng thanh tìm kiếm header
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


// ==================== API HELPERS ====================

const API_BASE_URL = "http://localhost:3000/api";

// Hàm gọi API dùng chung - tất cả file khác đều gọi qua đây
async function apiCall(endpoint, method = "GET", data = null) {
    const options = {
        method,
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include" // Gửi cookie session tự động
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


// ==================== AUTH ====================

async function login(username, password) {
    return await apiCall("/auth/login", "POST", { username, password });
}

async function register(username, email, password, passwordConfirm) {
    return await apiCall("/auth/register", "POST", { username, email, password, passwordConfirm });
}

async function logout() {
    return await apiCall("/auth/logout", "POST");
}

async function getProfile() {
    return await apiCall("/auth/profile", "GET");
}

async function updateProfile(avatar, dateOfBirth) {
    return await apiCall("/auth/profile", "PATCH", { avatar, dateOfBirth });
}


// ==================== POSTS ====================

async function getPosts(page = 1) {
    return await apiCall(`/posts?page=${page}`, "GET");
}

async function getPostDetail(slug) {
    return await apiCall(`/posts/${slug}`, "GET");
}

async function likePost(postId) {
    return await apiCall(`/posts/${postId}/like`, "POST");
}

async function commentPost(postId, content, userId) {
    return await apiCall(`/posts/${postId}/comment`, "POST", { content, userId });
}


// ==================== CATEGORIES ====================

async function getCategories() {
    return await apiCall("/categories", "GET");
}

async function getPostsByCategory(tag, page = 1) {
    return await apiCall(`/category/${tag}?page=${page}`, "GET");
}


// ==================== SEARCH ====================

async function searchPosts(q, page = 1) {
    return await apiCall(`/search?q=${encodeURIComponent(q)}&page=${page}`, "GET");
}
