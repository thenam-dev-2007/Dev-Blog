// ==================== MAIN.JS ====================
// Chạy trên mọi trang client/admin.
// Đồng bộ frontend với backend hiện tại: base URL /api, token Bearer, cookie refresh token.

const API_BASE_URL = "http://localhost:3000/api";
const API_ORIGIN = "http://localhost:3000";

function getAccessToken() {
    return localStorage.getItem("accessToken") || "";
}

function setAccessToken(token) {
    if (token) localStorage.setItem("accessToken", token);
}

function saveUserInfo(user) {
    if (user) localStorage.setItem("user", JSON.stringify(user));
}

function getUserInfo() {
    try {
        const raw = localStorage.getItem("user");
        return raw ? JSON.parse(raw) : null;
    } catch (_) {
        return null;
    }
}

function clearAuth() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
}

function isLoggedIn() {
    return Boolean(getAccessToken());
}

function normalizeApiResult(result, response) {
    const safe = result && typeof result === "object" ? result : {};
    if (!safe.code && response) safe.code = response.status;
    if (typeof safe.success !== "boolean") safe.success = response ? response.ok : false;
    if (!safe.message && safe.errors && Array.isArray(safe.errors)) {
        safe.message = safe.errors.map(e => e.msg || e.message).join("\n");
    }
    return safe;
}

// Hàm gọi API dùng chung.
async function apiCall(endpoint, method = "GET", data = null, options = {}) {
    const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
    const headers = {};
    const isFormData = typeof FormData !== "undefined" && data instanceof FormData;

    if (!isFormData) {
        headers["Content-Type"] = "application/json";
    }

    const token = getAccessToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const fetchOptions = {
        method,
        headers,
        credentials: "include",
        ...options
    };

    if (data) {
        fetchOptions.body = isFormData ? data : JSON.stringify(data);
    }

    try {
        const response = await fetch(url, fetchOptions);
        const text = await response.text();
        let result = {};

        try {
            result = text ? JSON.parse(text) : {};
        } catch (_) {
            result = { message: text || "Response không phải JSON" };
        }

        return normalizeApiResult(result, response);
    } catch (error) {
        console.error("API Error:", error);
        return {
            code: 0,
            success: false,
            message: "Không kết nối được backend. Hãy kiểm tra server BackEnd đã chạy ở http://localhost:3000 chưa.",
            error: error.message
        };
    }
}

// ==================== AUTH API ====================
async function login(email, password) {
    return apiCall("/auth/login", "POST", { email, password });
}

async function register(username, email, password, dateOfBirth) {
    return apiCall("/auth/register", "POST", { username, email, password, dateOfBirth });
}

async function verifyRegisterEmail(email, otp) {
    return apiCall("/auth/verify-email", "POST", { email, otp });
}

async function resendRegisterOTP(email) {
    return apiCall("/auth/resend-otp", "POST", { email });
}

async function forgotPassword(email) {
    return apiCall("/auth/forgot-password", "POST", { email });
}

async function verifyResetPasswordOTP(email, otp) {
    return apiCall("/auth/verify-reset-password-otp", "POST", { email, otp });
}

async function resendResetPasswordOTP(email) {
    return apiCall("/auth/resend-reset-password-otp", "POST", { email });
}

async function resetPassword(email, newPassword, confirmPassword) {
    // Backend hiện dùng chung validatePassword nên cần currentPassword dù controller reset không dùng.
    return apiCall("/auth/reset-password", "PATCH", {
        email,
        currentPassword: "__RESET_PASSWORD_FLOW__",
        newPassword,
        confirmPassword
    });
}

async function logout() {
    const result = await apiCall("/auth/logout", "POST");
    clearAuth();
    return result;
}

async function getProfile() {
    return apiCall("/profile/me", "GET");
}

async function updateProfile(formDataOrJson) {
    return apiCall("/profile/me", "PATCH", formDataOrJson);
}

// ==================== POST API ====================
async function getPosts(page = 1, limit = 4) {
    return apiCall(`/posts?page=${page}&limit=${limit}`, "GET");
}

async function getPostDetail(slug) {
    return apiCall(`/posts/${encodeURIComponent(slug)}`, "GET");
}

async function getPostsByTag(tag, page = 1, limit = 9) {
    return apiCall(`/posts/tag/${encodeURIComponent(tag)}?page=${page}&limit=${limit}`, "GET");
}

async function createPost(data) {
    return apiCall("/posts", "POST", data);
}

async function likePost(postId) {
    return apiCall(`/posts/${postId}/like`, "POST");
}

async function unlikePost(postId) {
    return apiCall(`/posts/${postId}/like`, "DELETE");
}

async function commentPost(postId, content) {
    return apiCall(`/posts/${postId}/comments`, "POST", { content });
}

// ==================== UI CHUNG ====================
function toggleDarkMode() {
    document.body.classList.toggle("dark");
    const btn = document.getElementById("btnDarkMode");

    if (document.body.classList.contains("dark")) {
        if (btn) btn.textContent = "☀️";
        localStorage.setItem("theme", "dark");
    } else {
        if (btn) btn.textContent = "🌙";
        localStorage.setItem("theme", "light");
    }
}

function toggleSearch() {
    const input = document.getElementById("headerSearch");
    if (!input) return;

    input.classList.toggle("open");
    if (input.classList.contains("open")) {
        input.focus();
    } else {
        input.value = "";
    }
}

function updateHeaderAuthUI() {
    const headerRight = document.querySelector(".header-right");
    if (!headerRight) return;

    const oldLogin = headerRight.querySelector(".btn-dangnhap");
    const oldRegister = headerRight.querySelector(".btn-dangky");
    const oldUserMenu = headerRight.querySelector(".user-menu-header");

    if (oldUserMenu) oldUserMenu.remove();

    if (!isLoggedIn()) {
        if (oldLogin) oldLogin.style.display = "inline-block";
        if (oldRegister) oldRegister.style.display = "inline-block";
        return;
    }

    const user = getUserInfo();
    if (oldLogin) oldLogin.style.display = "none";
    if (oldRegister) oldRegister.style.display = "none";

    const menu = document.createElement("div");
    menu.className = "user-menu-header";
    menu.innerHTML = `
        <a href="create_post.html" class="btn-dangky">Viết bài</a>
        <span class="header-username">${user?.username || "User"}</span>
        <button type="button" class="btn-dangnhap" id="btnHeaderLogout">Đăng xuất</button>
    `;
    headerRight.appendChild(menu);

    const btnLogout = document.getElementById("btnHeaderLogout");
    if (btnLogout) {
        btnLogout.addEventListener("click", async () => {
            await logout();
            window.location.href = "login.html";
        });
    }
}

function initMainUI() {
    const btnDarkMode = document.getElementById("btnDarkMode");
    const headerSearch = document.getElementById("headerSearch");

    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark");
        if (btnDarkMode) btnDarkMode.textContent = "☀️";
    }

    if (headerSearch) {
        headerSearch.addEventListener("keydown", function (e) {
            if (e.key === "Enter" && this.value.trim() !== "") {
                window.location.href = "search.html?q=" + encodeURIComponent(this.value.trim());
            }
        });
    }

    updateHeaderAuthUI();
}

document.addEventListener("DOMContentLoaded", initMainUI);

window.API_BASE_URL = API_BASE_URL;
window.API_ORIGIN = API_ORIGIN;
window.apiCall = apiCall;
window.login = login;
window.register = register;
window.verifyRegisterEmail = verifyRegisterEmail;
window.resendRegisterOTP = resendRegisterOTP;
window.forgotPassword = forgotPassword;
window.verifyResetPasswordOTP = verifyResetPasswordOTP;
window.resendResetPasswordOTP = resendResetPasswordOTP;
window.resetPassword = resetPassword;
window.logout = logout;
window.getProfile = getProfile;
window.updateProfile = updateProfile;
window.getPosts = getPosts;
window.getPostDetail = getPostDetail;
window.getPostsByTag = getPostsByTag;
window.createPost = createPost;
window.likePost = likePost;
window.unlikePost = unlikePost;
window.commentPost = commentPost;
window.getAccessToken = getAccessToken;
window.setAccessToken = setAccessToken;
window.saveUserInfo = saveUserInfo;
window.getUserInfo = getUserInfo;
window.clearAuth = clearAuth;
window.isLoggedIn = isLoggedIn;
window.toggleDarkMode = toggleDarkMode;
window.toggleSearch = toggleSearch;
window.updateHeaderAuthUI = updateHeaderAuthUI;
