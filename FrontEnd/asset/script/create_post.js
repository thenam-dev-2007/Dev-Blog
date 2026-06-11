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
        const thumbnail = document.getElementById("thumbnail")?.value.trim();
        const tagsRaw = document.getElementById("tags")?.value.trim();
        const tags = tagsRaw ? tagsRaw.split(",").map(tag => tag.trim()).filter(Boolean) : [];

        if (!title || !content) {
            showMessage("Tiêu đề và nội dung là bắt buộc.", "create-post-message", "error");
            return;
        }

        showLoading("Đang đăng bài...");
        const result = await createPost({ title, content, thumbnail, tags });
        hideLoading();

        if (resultOk(result)) {
            showMessage("Tạo bài viết thành công. Đang mở bài viết...", "create-post-message", "success");
            const slug = result.data?.slug;
            setTimeout(() => window.location.href = slug ? `post.html?slug=${encodeURIComponent(slug)}` : "index.html", 800);
        } else {
            showMessage(getErrorMessage(result, "Không tạo được bài viết"), "create-post-message", "error");
        }
    });
});
