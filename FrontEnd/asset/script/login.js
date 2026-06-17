document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("login-form");
    if (!form) return;

    try {
        const authMessage = sessionStorage.getItem("authMessage");
        if (authMessage) {
            showMessage(authMessage, "login-message", "error");
            sessionStorage.removeItem("authMessage");
        }
    } catch (_) {}

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = document.getElementById("login-email")?.value.trim();
        const password = document.getElementById("login-password")?.value;

        if (!email || !password) {
            showMessage("Vui lòng nhập email và mật khẩu.", "login-message", "error");
            return;
        }

        showLoading("Đang đăng nhập...");

        try {
            const result = await login(email, password);

            console.log("LOGIN RESULT:", result);

            if (!resultOk(result)) {
                clearAuth();
                updateHeaderAuthUI();
                showMessage(getErrorMessage(result, "Đăng nhập thất bại"), "login-message", "error");
                return;
            }

            const data = result.data || result;

            const token =
                data.accessToken ||
                data.token ||
                result.accessToken ||
                result.token;

            const user =
                data.user ||
                data.userInfo ||
                data.account ||
                result.user ||
                null;

            if (!token) {
                clearAuth();
                updateHeaderAuthUI();
                showMessage("Backend đăng nhập chưa trả accessToken.", "login-message", "error");
                return;
            }

            // Lưu token trước
            setAccessToken(token);

            // Nếu backend trả user thì lưu tạm
            if (user) {
                saveUserInfo(user);
            }

            // Kiểm tra lại token bằng API profile/me
            const profileResult = await apiCall("/profile/me", "GET");

            console.log("PROFILE CHECK RESULT:", profileResult);

            if (!resultOk(profileResult)) {
                clearAuth();
                updateHeaderAuthUI();

                showMessage(
                    getErrorMessage(profileResult, "Token đăng nhập không hợp lệ. Vui lòng đăng nhập lại."),
                    "login-message",
                    "error"
                );
                return;
            }

            const profileUser =
                profileResult.data?.user ||
                profileResult.data ||
                profileResult.user;

            if (profileUser) {
                saveUserInfo(profileUser);
            }

            updateHeaderAuthUI();

            showMessage("Đăng nhập thành công. Đang chuyển trang...", "login-message", "success");

            setTimeout(() => {
                window.location.href = "profile.html";
            }, 600);
        } catch (error) {
            console.error(error);
            clearAuth();
            updateHeaderAuthUI();
            showMessage("Không thể kết nối tới server.", "login-message", "error");
        } finally {
            hideLoading();
        }
    });
});