let resetEmail = "";

function showForgotStep(step) {
    ["forgot-step-email", "forgot-step-otp", "forgot-step-reset"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add("hidden");
    });
    const target = document.getElementById(step);
    if (target) target.classList.remove("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
    const emailForm = document.getElementById("forgot-email-form");
    const otpForm = document.getElementById("forgot-otp-form");
    const resetForm = document.getElementById("reset-password-form");
    const resendBtn = document.getElementById("btn-resend-reset-otp");

    if (emailForm) {
        emailForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            resetEmail = document.getElementById("forgot-email")?.value.trim();
            if (!resetEmail) {
                showMessage("Vui lòng nhập email.", "forgot-message", "error");
                return;
            }

            showLoading("Đang gửi OTP...");
            const result = await forgotPassword(resetEmail);
            hideLoading();

            if (resultOk(result)) {
                document.getElementById("reset-email-target").textContent = resetEmail;
                showMessage(result.message || "OTP đã được gửi về email.", "forgot-message", "success");
                showForgotStep("forgot-step-otp");
            } else {
                showMessage(getErrorMessage(result, "Không gửi được OTP"), "forgot-message", "error");
            }
        });
    }

    if (otpForm) {
        otpForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const otp = document.getElementById("reset-otp")?.value.trim();
            if (!otp) {
                showMessage("Vui lòng nhập OTP.", "forgot-message", "error");
                return;
            }

            showLoading("Đang xác thực OTP...");
            const result = await verifyResetPasswordOTP(resetEmail, otp);
            hideLoading();

            if (resultOk(result)) {
                showMessage(result.message || "OTP hợp lệ. Hãy đặt mật khẩu mới.", "forgot-message", "success");
                showForgotStep("forgot-step-reset");
            } else {
                showMessage(getErrorMessage(result, "OTP không hợp lệ"), "forgot-message", "error");
            }
        });
    }

    if (resetForm) {
        resetForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const newPassword = document.getElementById("new-password")?.value;
            const confirmPassword = document.getElementById("confirm-new-password")?.value;

            if (!newPassword || !confirmPassword) {
                showMessage("Vui lòng nhập mật khẩu mới.", "forgot-message", "error");
                return;
            }
            if (newPassword !== confirmPassword) {
                showMessage("Xác nhận mật khẩu không khớp.", "forgot-message", "error");
                return;
            }

            showLoading("Đang đổi mật khẩu...");
            const result = await resetPassword(resetEmail, newPassword, confirmPassword);
            hideLoading();

            if (resultOk(result)) {
                showMessage("Đổi mật khẩu thành công. Đang chuyển sang đăng nhập...", "forgot-message", "success");
                setTimeout(() => window.location.href = "login.html", 900);
            } else {
                showMessage(getErrorMessage(result, "Không đổi được mật khẩu"), "forgot-message", "error");
            }
        });
    }

    if (resendBtn) {
        resendBtn.addEventListener("click", async () => {
            if (!resetEmail) return;
            showLoading("Đang gửi lại OTP...");
            const result = await resendResetPasswordOTP(resetEmail);
            hideLoading();

            if (resultOk(result)) showMessage(result.message || "Đã gửi lại OTP.", "forgot-message", "success");
            else showMessage(getErrorMessage(result, "Không gửi lại được OTP"), "forgot-message", "error");
        });
    }
});
