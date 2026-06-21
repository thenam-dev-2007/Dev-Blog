const API_BASE_URL = "http://127.0.0.1:3000/api/admin";

const accessToken = localStorage.getItem("adminAccessToken");

const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json"
};

// CHUYỂN ĐỔI TAB SIDEBAR VÀ SECTIONS
const menuItems = document.querySelectorAll('.admin-sidebar .menu-item[data-target]');
const adminSections = document.querySelectorAll('.admin-section');

if (menuItems.length > 0) {
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Xóa class active ở tất cả menu items khác và section
            menuItems.forEach(i => i.classList.remove('active'));
            adminSections.forEach(section => section.classList.remove('active'));
            
            // Thêm class active vào menu vừa click
            this.classList.add('active');

            // Lấy ID section mục tiêu và hiển thị nó lên
            const targetId = this.getAttribute('data-target');
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
            }
        });
    });
}

// Refresh Access Token
const refreshAccessToken = async () => {

    const res = await fetch(
        `${API_BASE_URL}/auth/refresh-token`,
        {
            method: "POST",
            credentials: "include"
        }
    );

    const result = await res.json();

    if (!res.ok || !result.success) {
        throw new Error(
            result.message || "Refresh token thất bại"
        );
    }

    localStorage.setItem(
        "adminAccessToken",
        result.data.accessToken
    );

    return result.data.accessToken;
};

// Fetch có tự refresh token
const apiFetch = async ( url, options = {} ) => {
    let accessToken = localStorage.getItem("adminAccessToken");

    let response = await fetch(url, {
        ...options,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
            Authorization: `Bearer ${accessToken}`
        }
    });

    // Access token hết hạn
    if (response.status === 401) {
        try {
            accessToken = await refreshAccessToken();
            response = await fetch(url, {
                ...options,
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    ...(options.headers || {}),
                    Authorization: `Bearer ${accessToken}`
                }
            });

        } 
        catch (error) {
            localStorage.removeItem("adminAccessToken");
            localStorage.removeItem("adminUser");

            alert("Phiên đăng nhập đã hết hạn");
            window.location.href = "admin_login.html";
            throw error;
        }
    }

    return response;
};

// Dashboard
const loadDashboard = async () => {
    try {
        const res = await apiFetch(
            `${API_BASE_URL}/`
        );

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const { data } = await res.json();

        document.getElementById("totalPosts").textContent = data.statistics.totalPosts;
        document.getElementById("totalUsers").textContent = data.statistics.totalUsers;
        document.getElementById("totalLikes").textContent = data.statistics.totalLikes;
        document.getElementById("totalComments").textContent = data.statistics.totalComments;

        document.getElementById("latestPosts").innerHTML =
            data.latestPosts.map(post => `
                <li>
                    <strong>${post.title}</strong>
                    <span>
                        Bởi
                        <em>${post.author?.fullname || "Ẩn danh"}</em>
                    </span>
                </li>
            `).join("");

        document.getElementById("topAuthors").innerHTML =
            data.topAuthors.map(author => `
                <li>
                    <strong>${author.fullname}</strong>
                    <span>${author.totalPosts} bài viết</span>
                </li>
            `).join("");

    } 
    catch (error) {
        console.error("Dashboard Error:", error);
    }
};

// Load Posts
const loadPosts = async () => {
    try {
        const res = await apiFetch(
            `${API_BASE_URL}/posts`
        );

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const result = await res.json();

        const postsTableBody = document.getElementById("postsTableBody");

        let html = "";

        result.data.forEach(post => {
            html += `
                <tr
                    data-id="${post._id}"
                    data-title="${post.title || ""}"
                    data-author="${post.author?.fullname || "Ẩn danh"}"
                    data-date="${new Date(post.createdAt).toLocaleDateString("vi-VN")}"
                    data-thumbnail="${post.thumbnail ? `http://127.0.0.1:3000${post.thumbnail}` : ""}"
                    data-content="${post.content || ""}"
                >
                    <td>
                        <strong>${post.title}</strong>
                    </td>

                    <td>
                        ${post.author?.fullname || "Ẩn danh"}
                    </td>

                    <td>
                        ${new Date(post.createdAt).toLocaleDateString("vi-VN")}
                    </td>

                    <td style="text-align:center;">
                        <button class="btn-action-view">
                            Xem
                        </button>

                        <button
                            class="btn-action-delete btn-delete-post"
                            data-id="${post._id}"
                            data-title="${post.title}"
                        >
                            Xóa
                        </button>
                    </td>
                </tr>
            `;
        });

        postsTableBody.innerHTML = html;

    } catch (error) {
        console.error("Load Posts Error:", error);
    }
};

// Xem chi tiết/Xóa bài viết
document.addEventListener("click", async (e) => {

    // XEM
    if (e.target.classList.contains("btn-action-view")) {
        const row = e.target.closest("tr");
        document.getElementById("modalPostTitle").innerText = row.dataset.title;
        document.getElementById("modalPostAuthor").innerText = row.dataset.author;
        document.getElementById("modalPostDate").innerText = row.dataset.date;
        document.getElementById("modalPostContent").innerText = row.dataset.content;

        const thumbnail = row.dataset.thumbnail;
        const img = document.getElementById("modalPostThumbnail");
        const wrapper = img.parentElement;
        if (thumbnail) {
            img.src = thumbnail;
            wrapper.style.display = "block";
        } 
        else {
            wrapper.style.display = "none";
        }

        modalOverlay.classList.add("active");
        return;
    }

    // XÓA
    if (e.target.classList.contains("btn-delete-post")) {

        const postId = e.target.dataset.id;
        const title = e.target.dataset.title;

        if (!confirm(`Xóa bài viết "${title}" ?`)) {
            return;
        }

        try {
            const res = await apiFetch(
                `${API_BASE_URL}/posts/${postId}`,
                {
                    method: "DELETE"
                }
            );

            const result = await res.json();
            if (!result.success) {
                throw new Error(result.message);
            }

            e.target.closest("tr").remove();
            alert("Xóa bài viết thành công");

        } 
        catch (error) {
            console.error(error);
            alert("Xóa bài viết thất bại");
        }
    }
});

// Đóng pop up
const modalOverlay = document.getElementById("postDetailModal");
const closeModalBtn = document.getElementById("closeModalBtn");

closeModalBtn?.addEventListener("click", () => {
    modalOverlay.classList.remove("active");
});

modalOverlay?.addEventListener("click", (e) => {
    if (e.target === modalOverlay) {
        modalOverlay.classList.remove("active");
    }
});

// Load Users
const loadUsers = async () => {
    try {
        const res = await apiFetch(
            `${API_BASE_URL}/users`
        );

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const result = await res.json();
        console.log(result);

        const userTable =
            document.getElementById("userListTable");

        let html = "";

        result.data.forEach(user => {

            const dateOfBirth = user.dateOfBirth
                ? new Date(user.dateOfBirth)
                    .toLocaleDateString("vi-VN")
                : "Chưa cập nhật";

            const createdAt = user.createdAt
                ? new Date(user.createdAt)
                    .toLocaleDateString("vi-VN")
                : "N/A";

            html += `
                <tr>
                    <td>
                        <strong>${user.fullname}</strong>
                    </td>

                    <td>
                        ${user.email}
                    </td>

                    <td>
                        ${dateOfBirth}
                    </td>

                    <td style="text-align:center;">
                        <span class="post-count-badge">
                            ${user.posts?.length || 0} bài
                        </span>
                    </td>

                    <td>
                        ${createdAt}
                    </td>

                    <td style="text-align:center;">
                        <button
                            class="btn-action-delete btn-delete-user"
                            data-id="${user._id}"
                            data-name="${user.fullname}"
                        >
                            Xóa người dùng
                        </button>
                    </td>
                </tr>
            `;
        });

        userTable.innerHTML = html;

    } 
    catch (error) {
        console.error("Load Users Error:", error);
    }
};

document.addEventListener("click", async (e) => {
    if (!e.target.classList.contains("btn-delete-user")) {
        return;
    }

    const userId = e.target.dataset.id;
    const userName = e.target.dataset.name;

    const confirmed = confirm(
        `Bạn có chắc muốn xóa người dùng "${userName}"?`
    );

    if (!confirmed) {
        return;
    }

    try {
        const res = await apiFetch(
            `${API_BASE_URL}/users/${userId}`,
            {
                method: "DELETE"
            }
        );

        const result = await res.json();
        if (!result.success) {
            throw new Error(result.message);
        }

        e.target.closest("tr").remove();
        alert("Xóa người dùng thành công");

    } 
    catch (error) {
        console.error(error);
        alert("Xóa người dùng thất bại");
    }
});

// Logout
const logoutBtn = document.getElementById("logoutBtn");

logoutBtn?.addEventListener("click", async (e) => {
    e.preventDefault();

    const confirmed = confirm("Bạn có chắc muốn đăng xuất?");
    if (!confirmed) {
        return;
    }

    try {
        const res = await fetch(
            `${API_BASE_URL}/auth/logout`,
            {
                method: "POST",
                headers,
                credentials: "include"
            }
        );

        const result = await res.json();

        if (!res.ok || !result.success) {
            throw new Error(result.message);
        }

        // Xóa dữ liệu client
        localStorage.removeItem("adminAccessToken");
        localStorage.removeItem("adminUser");

        alert("Đăng xuất thành công");

        window.location.href = "admin_login.html";

    } catch (error) {
        console.error("Logout Error:", error);

        // vẫn xóa localStorage để tránh token cũ
        localStorage.removeItem("adminAccessToken");
        localStorage.removeItem("adminUser");

        alert("Phiên đăng nhập đã kết thúc");

        window.location.href = "admin_login.html";
    }
});

document.addEventListener("DOMContentLoaded", async () => {
    await loadDashboard();
    await loadPosts();
    await loadUsers();
});