document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("create-post-client-form");
    const gate = document.getElementById("create-post-gate");

    if (!isLoggedIn()) {
        if (form) form.classList.add("hidden");
        if (gate) gate.classList.remove("hidden");
        return;
    }

    if (!form) return;

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

        const formData = new FormData();
        formData.append("title", title);
        formData.append("content", content);
        tags.forEach(tag => formData.append("tags", tag));
        if (thumbnailFile) formData.append("thumbnail", thumbnailFile);

        const result = await createPost(formData);

        if (resultOk(result)) {
            showMessage("Tạo bài viết thành công. Đang mở bài viết...", "create-post-message", "success");
            const slug = result.data?.slug;
            setTimeout(() => window.location.href = slug ? `post.html?slug=${encodeURIComponent(slug)}` : "profile.html?tab=posts", 500);
        } else {
            showMessage(getErrorMessage(result, "Không tạo được bài viết"), "create-post-message", "error");
        }
    });
});
