// ==================== MAIN.JS ====================
// Chạy trên mọi trang client/admin.
// Đồng bộ frontend với backend hiện tại: base URL /api, token Bearer, cookie refresh token.

const API_BASE_URL = "http://127.0.0.1:3000/api";
const API_ORIGIN = "http://127.0.0.1:3000";

function getAccessToken() {
  return localStorage.getItem("accessToken") || "";
}

function setAccessToken(token) {
  if (token) localStorage.setItem("accessToken", token);
  else localStorage.removeItem("accessToken");
}

function normalizeUserInfo(user = null) {
  if (!user || typeof user !== "object") return null;
  const fullname = user.fullname || user.username || user.name || "";
  return {
    ...user,
    fullname,
    username: user.username || fullname,
  };
}

function getDisplayName(user = null, fallback = "User") {
  const safeUser = user || getUserInfo();
  return safeUser?.fullname || safeUser?.username || safeUser?.name || fallback;
}

function saveUserInfo(user) {
  const normalized = normalizeUserInfo(user);
  if (normalized) localStorage.setItem("user", JSON.stringify(normalized));
}

function getUserInfo() {
  try {
    const raw = localStorage.getItem("user");
    const parsed = raw ? JSON.parse(raw) : null;
    return normalizeUserInfo(parsed);
  } catch (_) {
    localStorage.removeItem("user");
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
  if (typeof safe.success !== "boolean") {
    safe.success = response ? response.ok : false;
  }
  if (!safe.message && safe.errors && Array.isArray(safe.errors)) {
    safe.message = safe.errors.map((e) => e.msg || e.message).join("\n");
  }
  return safe;
}

function isAuthError(result) {
  if (!result) return false;
  const message = String(result.message || "").toLowerCase();
  return (
    result.code === 401 ||
    result.code === 403 ||
    message.includes("token") ||
    message.includes("phiên đăng nhập") ||
    message.includes("người dùng không tồn tại") ||
    message.includes("vui lòng đăng nhập") ||
    message.includes("access token")
  );
}

function redirectToLogin(message = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.") {
  clearAuth();
  try {
    sessionStorage.setItem("authMessage", message);
  } catch (_) {}
  window.location.href = "login.html";
}

// Hàm gọi API dùng chung.
// options.skipAuth = true: không gửi Bearer token, dùng cho login/register/OTP.
async function apiCall(endpoint, method = "GET", data = null, options = {}) {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
  const isFormData = typeof FormData !== "undefined" && data instanceof FormData;

  const headers = {};
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const token = getAccessToken();
  if (token && !options.skipAuth) {
    headers.Authorization = `Bearer ${token}`;
  }

  const { skipAuth, ...fetchOptionOverrides } = options;
  const fetchOptions = {
    method,
    credentials: "include",
    ...fetchOptionOverrides,
    headers: {
      ...headers,
      ...(fetchOptionOverrides.headers || {}),
    },
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

    const normalized = normalizeApiResult(result, response);

    // Nếu token cũ/hỏng được gửi lên và backend báo lỗi xác thực,
    // xóa token ngay để header/profile không còn dùng phiên đăng nhập lỗi.
    if (token && !options.skipAuth && isAuthError(normalized)) {
      normalized.authInvalid = true;
      clearAuth();
      updateHeaderAuthUI();
    }

    return normalized;
  } catch (error) {
    console.error("API Error:", error);
    return {
      code: 0,
      success: false,
      message:
        "Không kết nối được backend. Hãy kiểm tra server BackEnd đã chạy ở http://localhost:3000 chưa.",
      error: error.message,
    };
  }
}

// ==================== AUTH API ====================
async function login(email, password) {
  clearAuth();
  return apiCall("/auth/login", "POST", { email, password }, { skipAuth: true });
}

async function register(fullname, email, password, confirmPassword, dateOfBirth) {
  return apiCall(
    "/auth/register",
    "POST",
    { fullname, email, password, confirmPassword, dateOfBirth },
    { skipAuth: true },
  );
}

async function verifyRegisterEmail(email, otp) {
  return apiCall("/auth/verify-email", "POST", { email, otp }, { skipAuth: true });
}

async function resendRegisterOTP(email) {
  return apiCall("/auth/resend-otp", "POST", { email }, { skipAuth: true });
}

async function forgotPassword(email) {
  return apiCall("/auth/forgot-password", "POST", { email }, { skipAuth: true });
}

async function verifyResetPasswordOTP(email, otp) {
  return apiCall("/auth/verify-reset-password-otp", "POST", { email, otp }, { skipAuth: true });
}

async function resendResetPasswordOTP(email) {
  return apiCall("/auth/resend-reset-password-otp", "POST", { email }, { skipAuth: true });
}

async function resetPassword(email, newPassword, confirmPassword) {
  // Backend hiện dùng chung validatePassword nên cần currentPassword dù controller reset không dùng.
  return apiCall(
    "/auth/reset-password",
    "PATCH",
    {
      email,
      currentPassword: "ResetFlow123!",
      newPassword,
      confirmPassword,
    },
    { skipAuth: true },
  );
}

async function changePassword(currentPassword, newPassword, confirmPassword) {
  return apiCall("/auth/change-password", "PATCH", {
    currentPassword,
    newPassword,
    confirmPassword,
  });
}

async function logout() {
  const result = await apiCall("/auth/logout", "POST");
  clearAuth();
  updateHeaderAuthUI();
  return result;
}

// ==================== PROFILE API ====================
async function getProfile() {
  return apiCall("/profile/me", "GET");
}

async function getUserProfile(userId) {
  return apiCall(`/profile/${encodeURIComponent(userId)}`, "GET");
}

async function updateProfile(formDataOrJson) {
  return apiCall("/profile/me", "PATCH", formDataOrJson);
}

async function getMyPosts(page = 1, limit = 9) {
  return apiCall(`/profile/me/posts?page=${page}&limit=${limit}`, "GET");
}

async function getUserPosts(userId, page = 1, limit = 9) {
  return apiCall(
    `/profile/${encodeURIComponent(userId)}/posts?page=${page}&limit=${limit}`,
    "GET",
  );
}

// ==================== POST API ====================
async function getPosts(page = 1, limit = 4) {
  return apiCall(`/posts?page=${page}&limit=${limit}`, "GET");
}

async function getPostDetail(slug) {
  return apiCall(`/posts/${encodeURIComponent(slug)}`, "GET");
}

async function getPostsByTag(tag, page = 1, limit = 9) {
  return apiCall(
    `/posts/tag/${encodeURIComponent(tag)}?page=${page}&limit=${limit}`,
    "GET",
  );
}

async function createPost(data) {
  return apiCall("/posts", "POST", data);
}

async function updatePost(postId, data) {
  return apiCall(`/posts/${encodeURIComponent(postId)}`, "PUT", data);
}

async function deletePostById(postId) {
  return apiCall(`/posts/${encodeURIComponent(postId)}`, "DELETE");
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

function normalizeHeaderAvatar(src) {
  if (!src) return "https://via.placeholder.com/80?text=U";
  if (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("data:")
  )
    return src;
  if (src.startsWith("../upload")) return `${API_ORIGIN}/${src.replace(/^\.\.\//, "")}`;
  if (src.startsWith("/upload")) return `${API_ORIGIN}${src}`;
  return src;
}

function closeHeaderDropdown() {
  const dropdown = document.getElementById("headerAvatarDropdown");
  if (dropdown) dropdown.classList.remove("open");
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

  const user = getUserInfo() || {};
  if (oldLogin) oldLogin.style.display = "none";
  if (oldRegister) oldRegister.style.display = "none";

  const menu = document.createElement("div");
  menu.className = "user-menu-header";
  menu.innerHTML = `
        <button type="button" class="avatar-toggle" id="btnHeaderAvatar" aria-label="Mở menu người dùng">
            <img src="${normalizeHeaderAvatar(user.avatar)}" alt="Avatar">
            <span class="header-username">${escapeHtml(getDisplayName(user, "Tài khoản"))}</span>
        </button>
        <div class="avatar-dropdown" id="headerAvatarDropdown">
            <a href="profile.html">👤 Xem hồ sơ</a>
            <button type="button" id="btnHeaderLogout">🚪 Đăng xuất</button>
        </div>
    `;
  headerRight.appendChild(menu);

  const btnAvatar = document.getElementById("btnHeaderAvatar");
  const dropdown = document.getElementById("headerAvatarDropdown");
  const btnLogout = document.getElementById("btnHeaderLogout");

  if (btnAvatar && dropdown) {
    btnAvatar.addEventListener("click", (event) => {
      event.stopPropagation();
      dropdown.classList.toggle("open");
    });
  }

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
        window.location.href =
          "search.html?q=" + encodeURIComponent(this.value.trim());
      }
    });
  }

  document.addEventListener("click", closeHeaderDropdown);
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
window.changePassword = changePassword;
window.logout = logout;
window.getProfile = getProfile;
window.getUserProfile = getUserProfile;
window.updateProfile = updateProfile;
window.getMyPosts = getMyPosts;
window.getUserPosts = getUserPosts;
window.getPosts = getPosts;
window.getPostDetail = getPostDetail;
window.getPostsByTag = getPostsByTag;
window.createPost = createPost;
window.updatePost = updatePost;
window.deletePostById = deletePostById;
window.likePost = likePost;
window.unlikePost = unlikePost;
window.commentPost = commentPost;
window.getAccessToken = getAccessToken;
window.setAccessToken = setAccessToken;
window.saveUserInfo = saveUserInfo;
window.getUserInfo = getUserInfo;
window.clearAuth = clearAuth;
window.isLoggedIn = isLoggedIn;
window.isAuthError = isAuthError;
window.redirectToLogin = redirectToLogin;
window.normalizeUserInfo = normalizeUserInfo;
window.getDisplayName = getDisplayName;
window.toggleDarkMode = toggleDarkMode;
window.toggleSearch = toggleSearch;
window.updateHeaderAuthUI = updateHeaderAuthUI;
