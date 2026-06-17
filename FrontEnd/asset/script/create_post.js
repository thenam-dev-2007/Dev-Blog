let editPostId = "";
let editPostSlug = "";
let editingPost = null;

function setCreatePostMode(isEdit) {
    const title = document.getElementById("createPostTitle");
    const desc = document.getElementById("createPostDesc");
    const submit = document.getElementById("create-post-submit-btn");
    if (isEdit) {
        document.title = "Sửa bài viết - Blog";
        if (title) title.textContent = "Sửa bài viết";
        if (desc) desc.textContent = "Cập nhật nội dung, tags và thumbnail cho bài viết của bạn.";
        if (submit) submit.textContent = "Lưu bài viết";
    } else {
        document.title = "Viết bài mới - Blog";
        if (title) title.textContent = "Tạo bài viết mới";
        if (desc) desc.textContent = "Viết và chia sẻ nội dung mới với cộng đồng.";
        if (submit) submit.textContent = "Đăng bài";
    }
}

async function loadPostForEdit() {
    editPostId = getQueryParam("edit") || "";
    editPostSlug = getQueryParam("slug") || "";
    if (!editPostId) return;

    setCreatePostMode(true);

    if (!editPostSlug) {
        showMessage("Thiếu slug bài viết để tải dữ liệu sửa. Hãy mở từ nút Sửa trong trang hồ sơ.", "create-post-message", "error");
        return;
    }

    const result = await getPostDetail(editPostSlug);
    if (!resultOk(result) || !result.data) {
        showMessage(getErrorMessage(result, "Không tải được bài viết cần sửa"), "create-post-message", "error");
        return;
    }

    editingPost = result.data;
    document.getElementById("title").value = editingPost.title || "";
    document.getElementById("content").value = editingPost.content || "";
    document.getElementById("tags").value = Array.isArray(editingPost.tags) ? editingPost.tags.join(", ") : "";
}

document.addEventListener("DOMContentLoaded", async () => {
    const form = document.getElementById("create-post-client-form");
    const gate = document.getElementById("create-post-gate");

    if (!isLoggedIn()) {
        if (form) form.classList.add("hidden");
        if (gate) gate.classList.remove("hidden");
        return;
    }

    if (!form) return;

    await loadPostForEdit();
    if (!editPostId) setCreatePostMode(false);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const title = document.getElementById("title")?.value.trim();
        const content = document.getElementById("content")?.value.trim();
        const tagsRaw = document.getElementById("tags")?.value.trim();
        const thumbnailFile = document.getElementById("thumbnail")?.files?.[0];
        const tags = tagsRaw ? tagsRaw.split(",").map(tag => tag.trim()).filter(Boolean) : [];

        if (!title) {
            showMessage("Tiêu đề là bắt buộc.", "create-post-message", "error");
            return;
        }

        if (!content || content.length < 10) {
            showMessage("Nội dung bài viết cần có ít nhất 10 ký tự.", "create-post-message", "error");
            return;
        }

        if (tags.length > 10) {
            showMessage("Không được nhập quá 10 tags.", "create-post-message", "error");
            return;
        }

        if (thumbnailFile && !["image/png", "image/jpeg"].includes(thumbnailFile.type)) {
            showMessage("Thumbnail chỉ nhận ảnh PNG hoặc JPEG.", "create-post-message", "error");
            return;
        }

        const formData = new FormData();
        formData.append("title", title);
        formData.append("content", content);
        tags.forEach(tag => formData.append("tags", tag));
        if (thumbnailFile) formData.append("thumbnail", thumbnailFile);

        const result = editPostId
            ? await updatePost(editPostId, formData)
            : await createPost(formData);

        if (resultOk(result)) {
            const actionText = editPostId ? "Cập nhật bài viết thành công" : "Tạo bài viết thành công";
            showMessage(`${actionText}. Đang mở bài viết...`, "create-post-message", "success");

            const postData = result.data?.post || result.data || {};
            const slug = postData.slug || editingPost?.slug || "";
            const redirectUrl = slug
                ? `post.html?slug=${encodeURIComponent(slug)}`
                : "profile.html?tab=posts";

            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 450);
        } else {
            showMessage(getErrorMessage(result, editPostId ? "Không cập nhật được bài viết" : "Không tạo được bài viết"), "create-post-message", "error");
        }
    });
});
