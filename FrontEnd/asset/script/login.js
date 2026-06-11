document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("login-form");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = document.getElementById("login-email")?.value.trim();
        const password = document.getElementById("login-password")?.value;

        if (!email || !password) {
            showMessage("Vui lòng nhập email và mật khẩu.", "login-message", "error");
            return;
        }

        showLoading("Đang đăng nhập...");
        const result = await login(email, password);
        hideLoading();

        if (resultOk(result)) {
            setAccessToken(result.data?.accessToken);
            saveUserInfo(result.data?.user);
            showMessage("Đăng nhập thành công. Đang chuyển trang...", "login-message", "success");
            setTimeout(() => window.location.href = "index.html", 600);
        } else {
            showMessage(getErrorMessage(result, "Đăng nhập thất bại"), "login-message", "error");
        }
    });
});
