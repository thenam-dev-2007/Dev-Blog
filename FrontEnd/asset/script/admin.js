// admin.js
 let adminPosts = [];
 let currentAdminPage = 1;

async function loadAdminPosts(page = 1) {
    currentAdminPage = page;
    showLoading("Đang tải bài viết...");

    try {
        const result = await apiCall(`/admin/posts?page=${page}`, "GET");
        hideLoading();

        if (result.code === 200) {
            adminPosts = result.data;
            const tableDiv = document.getElementById("admin-posts");
            if (tableDiv && adminPosts.length > 0) {
                tableDiv.innerHTML = `
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Tiêu đề</th>
                                <th>Tác giả</th>
                                <th>Ngày tạo</th>
                                <th>Like</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${adminPosts.map((post, index) => `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>${post.title}</td>
                                    <td>${post.author?.username || 'N/A'}</td>
                                    <td>${new Date(post.createdAt).toLocaleDateString('vi-VN')}</td>
                                    <td>${post.likes}</td>
                                    <td>
                                        <button onclick="editPost('${post._id}')" class="btn-edit">Sửa</button>
                                        <button onclick="deletePost('${post._id}')" class="btn-delete">Xóa</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            } else {
                document.getElementById("admin-posts").innerHTML = `<p>Không có bài viết</p>`;
            }
        }
    } catch (error) {
        hideLoading();
        console.error("Lỗi:", error);
        toast("Lỗi: " + error.message, "error");
    }
}

async function createPost() {
    const title = document.getElementById('post-title').value;
    const content = document.getElementById('post-content').value;
    const tags = document.getElementById('post-tags').value;
    const thumbnail = document.getElementById('post-thumbnail').value;
    const user = getUserInfo();

    if (!title || !content) {
        toast("Vui lòng nhập tiêu đề và nội dung", "error");
        return;
    }

    if (!user) {
        toast("Bạn cần đăng nhập để tạo bài viết", "error");
        return;
    }

    showLoading("Đang tạo bài viết...");

    try {
        const result = await apiCall("/admin/posts", "POST", {
            title,
            content,
            thumbnail : thumbnail || null,
            tags: tags ? tags.split(',').map(t => t.trim()) : [],
            author: user.id
        });

        hideLoading();

        if (result.code === 201) {
            toast("Bài viết đã được tạo!", "success");
            // Reset form
            document.getElementById('create-post-form').reset();
            // Tải lại danh sách bài viết
            loadAdminPosts(currentAdminPage);
        } else {
            toast(result.message || "Không thể tạo bài viết", "error");
        }
    } catch (error) {
        hideLoading();
        console.error("Lỗi:", error);
        toast("Lỗi: " + error.message, "error");
    }
}

async function editPost(postId) {
    // search
    const post = adminPosts.find(p => p._id === postId);
    if (!post) {
        toast("Bài viết không tồn tại", "error");
        return;
    }

    // Điền thông tin vào form
    document.getElementById("post-title").value = post.title;
    document.getElementById("post-content").value = post.content;
    document.getElementById("post-tags").value = post.tags?.join(', ') || '';
    document.getElementById("post-thumbnail").value = post.thumbnail || '';

    // Thay đổi nút tạo thành cập nhật
    const submitBtn = document.getElementById("submit-post-btn");
    submitBtn.textContent = "Cập nhật bài viết";
    submitBtn.onclick = async () => (await updatePost(postId));

}

async function updatePost(postId) {
    const title = document.getElementById("post-title")?.value;
    const content = document.getElementById("post-content")?.value;
    const thumbnail = document.getElementById("post-thumbnail")?.value;
    const tags = document.getElementById("post-tags")?.value;

    if (!title || !content) {
        toast("Vui lòng điền tiêu đề và nội dung", "error");
        return;
    }

    showLoading("Đang cập nhật...");

    try {
        const result = await apiCall(`/admin/posts/${postId}`, "PATCH", {
            title,
            content,
            thumbnail: thumbnail || null,
            tags: tags ? tags.split(',').map(t => t.trim()) : []
        });

        hideLoading();

        if (result.code === 200) {
            toast("Cập nhật thành công!", "success");
            document.getElementById("create-post-form").reset();
            
            // Đổi button lại
            const submitBtn = document.getElementById("submit-post-btn");
            submitBtn.textContent = "Tạo bài viết";
            submitBtn.onclick = createPost;

            loadAdminPosts(1);
        } else {
            toast(result.message || "Lỗi khi cập nhật", "error");
        }
    } catch (error) {
        hideLoading();
        console.error("Lỗi:", error);
        toast("Lỗi: " + error.message, "error");
    }
}


async function deletePost(postId) {
    if (!confirm("Bạn có chắc muốn xóa bài viết này?")) {
        return;
    }
    showLoading("Đang xóa...");

    try {
        const result = await apiCall(`/admin/posts/${postId}`, "DELETE");
        hideLoading();
        if (result.code === 200) {
            toast("Bài viết đã được xóa!", "success");
            loadAdminPosts(currentAdminPage);
        } else {
            toast(result.message || "Lỗi khi xóa", "error");
        }
    } catch (error) {
        hideLoading();
        console.error("Lỗi:", error);
        toast("Lỗi: " + error.message, "error");
    }
}

function handleAdminPageChange(page) {
    loadAdminPosts(page);
    window.scrollTo(0, 0);
}


document.addEventListener("DOMContentLoaded", () => {
    loadAdminPosts(1);

    // Set event listener for submit button
    const submitBtn = document.getElementById("submit-post-btn");
    if (submitBtn) {
        submitBtn.onclick = createPost;
    }
});

