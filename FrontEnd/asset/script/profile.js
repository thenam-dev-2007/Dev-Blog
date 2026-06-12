let viewedUser = null;
let ownProfile = true;
let activeProfileTab = "overview";
let viewedUserId = "";

function idsEqual(a, b) {
    if (!a || !b) return false;
    return String(a) === String(b);
}

function userIdOf(user) {
    return user?._id || user?.id || "";
}

function shortDateForInput(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
}

function renderProfileHero() {
    const hero = document.getElementById("profileHero");
    if (!hero || !viewedUser) return;

    document.title = `${viewedUser.username || "Hồ sơ"} - Blog`;
    hero.innerHTML = `
        <div class="profile-hero-inner">
            <img class="profile-hero-avatar" src="${normalizeImageUrl(viewedUser.avatar, "https://via.placeholder.com/120?text=U")}" alt="Avatar">
            <div class="profile-hero-info">
                <h1>${escapeHtml(viewedUser.username || "Người dùng")}</h1>
                <p>${ownProfile ? escapeHtml(viewedUser.email || "") : "Hồ sơ công khai"}</p>
                <div class="profile-stats">
                    <span><b>${viewedUser.totalPosts || 0}</b> bài viết</span>
                    <span><b>${viewedUser.totalLikes || 0}</b> lượt thích</span>
                    <span><b>${viewedUser.totalComments || 0}</b> bình luận</span>
                </div>
            </div>
        </div>
    `;
}

function renderProfileSidebar() {
    const sidebar = document.getElementById("profileSidebar");
    if (!sidebar) return;

    const passwordTab = ownProfile ? `
        <button type="button" class="profile-nav-btn" data-tab="password">🔒 Đổi mật khẩu</button>
    ` : "";

    sidebar.innerHTML = `
        <h3>${ownProfile ? "Quản lý tài khoản" : "Hồ sơ người dùng"}</h3>
        <button type="button" class="profile-nav-btn" data-tab="overview">👤 Quản lý hồ sơ</button>
        <button type="button" class="profile-nav-btn" data-tab="posts">📝 Quản lý bài viết</button>
        <button type="button" class="profile-nav-btn" data-tab="favorites">❤️ Bài viết yêu thích</button>
        ${passwordTab}
    `;

    sidebar.querySelectorAll(".profile-nav-btn").forEach(btn => {
        btn.addEventListener("click", () => showProfileTab(btn.dataset.tab));
    });

    markActiveSidebar();
}

function markActiveSidebar() {
    document.querySelectorAll(".profile-nav-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.tab === activeProfileTab);
    });
}

function setProfileUrlTab(tab) {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    if (!ownProfile && viewedUserId) url.searchParams.set("id", viewedUserId);
    window.history.replaceState({}, "", url);
}

function showProfileTab(tab = "overview") {
    if (!ownProfile && tab === "password") tab = "overview";
    activeProfileTab = tab;
    markActiveSidebar();
    setProfileUrlTab(tab);

    if (tab === "overview") renderOverviewTab();
    if (tab === "posts") renderPostsTab(1);
    if (tab === "favorites") renderFavoritesTab();
    if (tab === "password") renderPasswordTab();
}

function renderOverviewTab() {
    const content = document.getElementById("profileContent");
    if (!content || !viewedUser) return;

    if (!ownProfile) {
        content.innerHTML = `
            <div class="profile-section-title">
                <h2>Hồ sơ</h2>
            </div>
            <div class="profile-info-list">
                <p><b>Tên người dùng:</b> ${escapeHtml(viewedUser.username || "")}</p>
                <p><b>Ngày sinh:</b> ${viewedUser.dateOfBirth ? formatDate(viewedUser.dateOfBirth) : "Chưa cập nhật"}</p>
                <p><b>Số bài viết:</b> ${viewedUser.totalPosts || 0}</p>
                <p><b>Tổng lượt thích:</b> ${viewedUser.totalLikes || 0}</p>
                <p><b>Tổng bình luận:</b> ${viewedUser.totalComments || 0}</p>
            </div>
        `;
        return;
    }

    content.innerHTML = `
        <div class="profile-section-title">
            <h2>Quản lý hồ sơ</h2>
            <p>Cập nhật tên hiển thị, ngày sinh và avatar.</p>
        </div>
        <div id="profile-message"></div>
        <form id="profile-update-form" class="profile-form" enctype="multipart/form-data">
            <div class="form-group">
                <label for="profile-username">Tên người dùng</label>
                <input id="profile-username" type="text" value="${escapeHtml(viewedUser.username || "")}" required>
            </div>
            <div class="form-group">
                <label for="profile-email">Email</label>
                <input id="profile-email" type="email" value="${escapeHtml(viewedUser.email || "")}" disabled>
            </div>
            <div class="form-group">
                <label for="profile-dob">Ngày sinh</label>
                <input id="profile-dob" type="date" value="${shortDateForInput(viewedUser.dateOfBirth)}">
            </div>
            <div class="form-group">
                <label for="profile-avatar">Avatar</label>
                <input id="profile-avatar" type="file" accept="image/png,image/jpeg">
            </div>
            <button type="submit" class="button">Lưu thay đổi</button>
        </form>
    `;

    const form = document.getElementById("profile-update-form");
    if (form) form.addEventListener("submit", handleProfileUpdate);
}

async function handleProfileUpdate(event) {
    event.preventDefault();

    const username = document.getElementById("profile-username")?.value.trim();
    const dateOfBirth = document.getElementById("profile-dob")?.value;
    const avatar = document.getElementById("profile-avatar")?.files?.[0];

    if (!username || username.length < 3) {
        showMessage("Tên người dùng phải có ít nhất 3 ký tự.", "profile-message", "error");
        return;
    }

    const formData = new FormData();
    formData.append("username", username);
    if (dateOfBirth) formData.append("dateOfBirth", dateOfBirth);
    if (avatar) formData.append("avatar", avatar);

    const result = await updateProfile(formData);
    if (resultOk(result)) {
        viewedUser = { ...viewedUser, ...result.data };
        saveUserInfo({ ...(getUserInfo() || {}), ...result.data });
        renderProfileHero();
        updateHeaderAuthUI();
        showMessage("Cập nhật hồ sơ thành công.", "profile-message", "success");
    } else {
        showMessage(getErrorMessage(result, "Không cập nhật được hồ sơ"), "profile-message", "error");
    }
}

async function renderPostsTab(page = 1) {
    const content = document.getElementById("profileContent");
    if (!content) return;

    content.innerHTML = `
        <div class="profile-section-title profile-section-title-row">
            <div>
                <h2>${ownProfile ? "Quản lý bài viết" : "Bài viết đã tạo"}</h2>
                <p>${ownProfile ? "Các bài viết bạn đã đăng." : "Các bài viết công khai của người dùng này."}</p>
            </div>
            ${ownProfile ? `<a href="create_post.html" class="button">➕ Thêm mới</a>` : ""}
        </div>
        <div id="profile-posts-message"></div>
        <div id="profile-posts-list" class="profile-post-list"><div class="empty-state">Đang tải bài viết...</div></div>
        <div class="phan-trang" id="phan-trang-profile-posts"></div>
    `;

    const result = ownProfile ? await getMyPosts(page, 9) : await getUserPosts(viewedUserId, page, 9);
    if (!resultOk(result)) {
        showMessage(getErrorMessage(result, "Không tải được bài viết"), "profile-posts-message", "error");
        document.getElementById("profile-posts-list").innerHTML = "";
        return;
    }

    const posts = getPostsFromResponse(result);
    const pagination = getPaginationFromResponse(result, page, 1);
    renderManagedPosts(posts, "profile-posts-list", { canDelete: ownProfile, canUnlike: false });
    renderPhanTrang("phan-trang-profile-posts", pagination.currentPage, pagination.totalPage, renderPostsTab);
}

function renderManagedPosts(posts, containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!posts || posts.length === 0) {
        container.innerHTML = `<div class="empty-state">Chưa có bài viết nào.</div>`;
        return;
    }

    container.innerHTML = posts.map(post => renderManagedPostCard(post, options)).join("");

    if (options.canDelete) {
        container.querySelectorAll("[data-delete-post]").forEach(btn => {
            btn.addEventListener("click", () => handleDeletePost(btn.dataset.deletePost));
        });
    }

    if (options.canUnlike) {
        container.querySelectorAll("[data-unlike-post]").forEach(btn => {
            btn.addEventListener("click", () => handleUnlikeFavorite(btn.dataset.unlikePost));
        });
    }
}

function renderManagedPostCard(post, options = {}) {
    const title = escapeHtml(post.title || "Không có tiêu đề");
    const slug = encodeURIComponent(post.slug || "");
    const thumb = normalizeImageUrl(post.thumbnail, "https://via.placeholder.com/320x180?text=Blog");
    const tags = Array.isArray(post.tags) ? post.tags : [];

    return `
        <article class="profile-post-card" data-post-card="${escapeHtml(post._id || "")}">
            <a href="post.html?slug=${slug}"><img src="${thumb}" alt="${title}"></a>
            <div class="profile-post-card-body">
                <h3><a href="post.html?slug=${slug}">${title}</a></h3>
                <p>${escapeHtml(truncateText(post.content || "", 170))}</p>
                ${tags.length ? `<div class="tag-list">${tags.map(tag => `<a href="categories.html?tag=${encodeURIComponent(tag)}">#${escapeHtml(tag)}</a>`).join("")}</div>` : ""}
                <div class="profile-post-meta">
                    <span>${formatDate(post.createdAt)}</span>
                    <span>❤️ ${getLikeCount(post)}</span>
                    <span>💬 ${getCommentCount(post)}</span>
                </div>
                <div class="profile-post-actions">
                    <a href="post.html?slug=${slug}" class="button secondary">Xem bài</a>
                    ${options.canDelete ? `<button type="button" class="button danger" data-delete-post="${escapeHtml(post._id)}">Xóa</button>` : ""}
                    ${options.canUnlike ? `<button type="button" class="button danger" data-unlike-post="${escapeHtml(post._id)}">Bỏ like</button>` : ""}
                </div>
            </div>
        </article>
    `;
}

async function handleDeletePost(postId) {
    if (!postId) return;
    const ok = confirm("Bạn chắc chắn muốn xóa bài viết này?");
    if (!ok) return;

    const result = await deletePostById(postId);
    if (resultOk(result)) {
        toast("Đã xóa bài viết", "success");
        renderPostsTab(1);
    } else {
        toast(getErrorMessage(result, "Không xóa được bài viết"), "error");
    }
}

async function renderFavoritesTab() {
    const content = document.getElementById("profileContent");
    if (!content) return;

    content.innerHTML = `
        <div class="profile-section-title">
            <h2>Bài viết yêu thích</h2>
            <p>${ownProfile ? "Tất cả bài viết bạn đã like. Bỏ like thì bài sẽ biến mất khỏi trang này." : "Tất cả bài viết người dùng này đã like."}</p>
        </div>
        <div id="profile-favorites-message"></div>
        <div id="profile-favorites-list" class="profile-post-list"><div class="empty-state">Đang tải bài viết yêu thích...</div></div>
    `;

    const posts = await loadAllPosts(50);
    const favorites = posts.filter(post => isLikedByUser(post, viewedUserId));
    renderManagedPosts(favorites, "profile-favorites-list", { canDelete: false, canUnlike: ownProfile });
}

async function handleUnlikeFavorite(postId) {
    if (!postId) return;
    const result = await unlikePost(postId);
    if (resultOk(result)) {
        const card = document.querySelector(`[data-post-card="${CSS.escape(postId)}"]`);
        if (card) card.remove();
        const list = document.getElementById("profile-favorites-list");
        if (list && list.children.length === 0) {
            list.innerHTML = `<div class="empty-state">Chưa có bài viết yêu thích nào.</div>`;
        }
        toast("Đã bỏ like bài viết", "success");
    } else {
        toast(getErrorMessage(result, "Không bỏ like được bài viết"), "error");
    }
}

function renderPasswordTab() {
    const content = document.getElementById("profileContent");
    if (!content || !ownProfile) return;

    content.innerHTML = `
        <div class="profile-section-title">
            <h2>Đổi mật khẩu</h2>
            <p>Sau khi đổi mật khẩu, hệ thống sẽ yêu cầu đăng nhập lại.</p>
        </div>
        <div id="password-message"></div>
        <form id="change-password-form" class="profile-form">
            <div class="form-group">
                <label for="old-password">Mật khẩu cũ</label>
                <input id="old-password" type="password" autocomplete="current-password" required>
            </div>
            <div class="form-group">
                <label for="new-password">Mật khẩu mới</label>
                <input id="new-password" type="password" autocomplete="new-password" required>
            </div>
            <div class="form-group">
                <label for="confirm-new-password">Xác nhận mật khẩu mới</label>
                <input id="confirm-new-password" type="password" autocomplete="new-password" required>
            </div>
            <button type="submit" class="button">Đổi mật khẩu</button>
        </form>
    `;

    const form = document.getElementById("change-password-form");
    if (form) form.addEventListener("submit", handleChangePassword);
}

async function handleChangePassword(event) {
    event.preventDefault();

    const currentPassword = document.getElementById("old-password")?.value;
    const newPassword = document.getElementById("new-password")?.value;
    const confirmPassword = document.getElementById("confirm-new-password")?.value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        showMessage("Vui lòng nhập đầy đủ 3 dòng mật khẩu.", "password-message", "error");
        return;
    }

    if (newPassword !== confirmPassword) {
        showMessage("Xác nhận mật khẩu mới không trùng khớp.", "password-message", "error");
        return;
    }

    const result = await changePassword(currentPassword, newPassword, confirmPassword);
    if (resultOk(result)) {
        showMessage("Đổi mật khẩu thành công. Vui lòng đăng nhập lại.", "password-message", "success");
        clearAuth();
        setTimeout(() => window.location.href = "login.html", 800);
    } else {
        showMessage(getErrorMessage(result, "Không đổi được mật khẩu"), "password-message", "error");
    }
}

async function initProfilePage() {
    if (!isLoggedIn()) {
        window.location.href = "login.html";
        return;
    }

    const requestedId = getQueryParam("id");
    const currentUser = getUserInfo();
    ownProfile = !requestedId || idsEqual(requestedId, userIdOf(currentUser));

    const result = ownProfile ? await getProfile() : await getUserProfile(requestedId);
    if (!resultOk(result) || !result.data) {
        document.getElementById("profileHero").innerHTML = `<div class="alert alert-error">${escapeHtml(getErrorMessage(result, "Không tải được hồ sơ"))}</div>`;
        return;
    }

    viewedUser = result.data;
    viewedUserId = userIdOf(viewedUser);

    if (ownProfile) {
        saveUserInfo({ ...(currentUser || {}), ...viewedUser });
        updateHeaderAuthUI();
    }

    renderProfileHero();
    renderProfileSidebar();

    const defaultTab = getQueryParam("tab") || "overview";
    showProfileTab(defaultTab);
}

document.addEventListener("DOMContentLoaded", initProfilePage);

window.renderPostsTab = renderPostsTab;
