// Admin frontend được chỉnh để không gọi các route /api/admin vì backend hiện đang comment admin route.
// Phần có endpoint client thì vẫn dùng được; phần chưa có endpoint sẽ hiển thị thông báo rõ ràng.

let adminPostsCache = [];
let adminCurrentPage = 1;
const ADMIN_PAGE_SIZE = 4;

function moTab(tabName, el) {
    document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));
    const target = document.getElementById(`tab-${tabName}`);
    if (target) target.classList.add("active");

    document.querySelectorAll(".sidebar-menu a").forEach(a => a.classList.remove("active"));
    if (el) el.classList.add("active");

    const titles = {
        dashboard: "📊 Dashboard",
        posts: "📝 Quản lý bài viết",
        users: "👥 Quản lý người dùng",
        qa: "❓ Quản lý Q&A"
    };
    const topbar = document.getElementById("topbar-title");
    if (topbar) topbar.textContent = titles[tabName] || "Admin";

    if (tabName === "dashboard") loadDashboard();
    if (tabName === "posts") loadAdminPosts(1);
    if (tabName === "users") loadAdminUsers();
    if (tabName === "qa") loadAdminQA();
}

async function ensurePostsCache() {
    if (adminPostsCache.length) return adminPostsCache;
    adminPostsCache = await loadAllPosts();
    return adminPostsCache;
}

async function loadDashboard() {
    const posts = await ensurePostsCache();

    const statPosts = document.getElementById("stat-posts");
    const statUsers = document.getElementById("stat-users");
    const statQa = document.getElementById("stat-qa");
    const statComments = document.getElementById("stat-comments");

    if (statPosts) statPosts.textContent = posts.length;
    if (statUsers) statUsers.textContent = "N/A";
    if (statQa) statQa.textContent = "N/A";
    if (statComments) statComments.textContent = posts.reduce((sum, post) => sum + getCommentCount(post), 0);

    const recent = document.getElementById("dashboard-recent-posts");
    if (recent) {
        recent.innerHTML = posts.slice(0, 5).map((post, index) => `
            <tr>
                <td>${index + 1}</td>
                <td><a href="post.html?slug=${encodeURIComponent(post.slug || post._id)}">${escapeHtml(post.title || "Không tiêu đề")}</a></td>
                <td>${escapeHtml(post.author?.username || "Ẩn danh")}</td>
                <td>${formatDate(post.createdAt)}</td>
                <td><span class="badge badge-success">Đang hiển thị</span></td>
            </tr>
        `).join("") || `<tr><td colspan="5" style="text-align:center; padding:20px; color:#999;">Chưa có bài viết</td></tr>`;
    }

    const qa = document.getElementById("dashboard-unanswered-qa");
    if (qa) {
        qa.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:#999;">Backend hiện chưa mount endpoint Q&A/admin.</td></tr>`;
    }
}

async function loadAdminPosts(page = 1) {
    adminCurrentPage = page;
    const posts = await ensurePostsCache();
    const start = (page - 1) * ADMIN_PAGE_SIZE;
    const pagePosts = posts.slice(start, start + ADMIN_PAGE_SIZE);
    const totalPage = Math.max(1, Math.ceil(posts.length / ADMIN_PAGE_SIZE));

    const count = document.getElementById("post-count");
    if (count) count.textContent = `${posts.length} bài viết`;

    const container = document.getElementById("admin-posts");
    if (container) {
        container.innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>#</th><th>Tiêu đề</th><th>Tác giả</th><th>Ngày tạo</th><th>Thao tác</th>
                    </tr>
                </thead>
                <tbody>
                    ${pagePosts.map((post, index) => `
                        <tr>
                            <td>${start + index + 1}</td>
                            <td>${escapeHtml(post.title || "Không tiêu đề")}</td>
                            <td>${escapeHtml(post.author?.username || "Ẩn danh")}</td>
                            <td>${formatDate(post.createdAt)}</td>
                            <td><a href="post.html?slug=${encodeURIComponent(post.slug || post._id)}">Xem</a></td>
                        </tr>
                    `).join("") || `<tr><td colspan="5" style="text-align:center; padding:20px; color:#999;">Chưa có bài viết</td></tr>`}
                </tbody>
            </table>
        `;
    }

    renderPhanTrangAdmin("phan-trang-posts", page, totalPage, loadAdminPosts);
}

function loadAdminUsers() {
    const container = document.getElementById("admin-users");
    const count = document.getElementById("user-count");
    if (count) count.textContent = "Chưa có endpoint";
    if (container) {
        container.innerHTML = `<div class="admin-note">Backend hiện tại chưa mount route <code>/api/admin/users</code>, nên frontend không gọi API giả nữa.</div>`;
    }
}

function loadAdminQA() {
    const container = document.getElementById("admin-qa");
    if (container) {
        container.innerHTML = `<div class="admin-note">Backend hiện tại chưa có route Q&A, nên phần này chỉ giữ giao diện.</div>`;
    }
}

function timKiemBaiViet(keyword = "") {
    const q = keyword.toLowerCase().trim();
    if (!q) {
        adminPostsCache = [];
        ensurePostsCache().then(() => loadAdminPosts(1));
        return;
    }

    loadAllPosts().then(posts => {
        adminPostsCache = posts.filter(post => (post.title || "").toLowerCase().includes(q));
        loadAdminPosts(1);
    });
}

function timKiemUser() {
    loadAdminUsers();
}

function timKiemQA() {
    loadAdminQA();
}

function huyFormPost() {
    const form = document.getElementById("create-post-form");
    if (form) form.reset();
}

function dongModal() {
    const modal = document.getElementById("modal-xoa");
    if (modal) modal.style.display = "none";
}

document.addEventListener("DOMContentLoaded", () => {
    const submitBtn = document.getElementById("submit-post-btn");
    if (submitBtn) {
        submitBtn.addEventListener("click", async () => {
            if (!isLoggedIn()) {
                alert("Bạn cần đăng nhập trước khi tạo bài viết.");
                window.location.href = "login.html";
                return;
            }

            const title = document.getElementById("post-title")?.value.trim();
            const thumbnail = document.getElementById("post-thumbnail")?.value.trim();
            const content = document.getElementById("post-content")?.value.trim();
            const tagsRaw = document.getElementById("post-tags")?.value.trim();
            const tags = tagsRaw ? tagsRaw.split(",").map(tag => tag.trim()).filter(Boolean) : [];

            if (!title || !content) {
                alert("Vui lòng nhập tiêu đề và nội dung.");
                return;
            }

            const result = await createPost({ title, thumbnail, content, tags });
            if (resultOk(result)) {
                alert("Tạo bài viết thành công.");
                adminPostsCache = [];
                huyFormPost();
                loadAdminPosts(1);
            } else {
                alert(getErrorMessage(result, "Không tạo được bài viết"));
            }
        });
    }

    loadDashboard();
});

window.moTab = moTab;
window.loadAdminPosts = loadAdminPosts;
window.loadAdminUsers = loadAdminUsers;
window.loadAdminQA = loadAdminQA;
window.timKiemBaiViet = timKiemBaiViet;
window.timKiemUser = timKiemUser;
window.timKiemQA = timKiemQA;
window.huyFormPost = huyFormPost;
window.dongModal = dongModal;
