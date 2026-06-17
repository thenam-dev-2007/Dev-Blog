const API_URL = "http://127.0.0.1:3000/api/auth";

let registeredEmail = "";

function showOtpStep(email) {
  registeredEmail = email;

  document.getElementById("register-form")?.classList.add("hidden");
  document.getElementById("register-otp-box")?.classList.remove("hidden");
  const target = document.getElementById("otp-email-target");
  if (target) target.textContent = email;
}

function showRegisterMessage(message, type = "success") {
  const messageBox = document.getElementById("register-message");
  if (!messageBox) return;

  messageBox.innerHTML = `
        <div class="${type}">
            ${escapeHtml(message || "")}
        </div>
    `;
}

function getRegisterError(result, fallback = "Đăng ký thất bại") {
  return (
    result?.message ||
    result?.errors?.[0]?.msg ||
    result?.errors?.[0]?.message ||
    fallback
  );
}

document.addEventListener("DOMContentLoaded", () => {
  // Nếu trước đó còn token cũ/token của user đã bị xóa, xóa luôn khi vào trang đăng ký.
  // Tránh trường hợp đăng ký xong bị dashboard/profile dùng lại phiên đăng nhập lỗi.
  clearAuth();
  updateHeaderAuthUI();

  const registerForm = document.getElementById("register-form");
  const otpForm = document.getElementById("register-otp-form");
  const resendBtn = document.getElementById("btn-resend-register-otp");

  // ================= REGISTER =================
  registerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const fullname = document.getElementById("reg-fullname")?.value.trim();
    const email = document.getElementById("reg-email")?.value.trim();
    const password = document.getElementById("password")?.value.trim();
    const confirmPassword = document.getElementById("confirmPassword")?.value.trim();
    const dateOfBirth = document.getElementById("reg-dob")?.value;
    const agree = document.getElementById("agree")?.checked;

    if (!fullname || !email || !password || !confirmPassword || !dateOfBirth) {
      return showRegisterMessage("Vui lòng nhập đầy đủ thông tin", "error");
    }

    if (password !== confirmPassword) {
      return showRegisterMessage("Mật khẩu xác nhận không khớp", "error");
    }

    if (!agree) {
      return showRegisterMessage("Bạn cần đồng ý điều khoản", "error");
    }

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          fullname,
          email,
          password,
          confirmPassword,
          dateOfBirth,
        }),
      });

      const result = await response
        .json()
        .catch(() => ({ message: "Lỗi phản hồi từ server" }));

      if (!response.ok) {
        return showRegisterMessage(getRegisterError(result), "error");
      }

      showRegisterMessage(
        result.message || "Đăng ký thành công! Vui lòng kiểm tra email để lấy OTP.",
        "success",
      );
      showOtpStep(result.data?.email || email);
    } catch (error) {
      console.error(error);
      showRegisterMessage("Không thể kết nối tới server", "error");
    }
  });

  // ================= VERIFY OTP =================
  otpForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const otp = document.getElementById("register-otp")?.value.trim();
    if (!registeredEmail || !otp) {
      return showRegisterMessage("Vui lòng nhập OTP", "error");
    }

    try {
      const response = await fetch(`${API_URL}/verify-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: registeredEmail,
          otp,
        }),
      });

      const result = await response.json().catch(() => ({ message: "Lỗi phản hồi từ server" }));

      if (!response.ok) {
        return showRegisterMessage(getRegisterError(result, "Xác thực OTP thất bại"), "error");
      }

      // Backend verify-email hiện chỉ trả accessToken, không trả đầy đủ user.
      // Vì vậy không lưu token ở bước này để tránh dashboard/profile dùng token/user không đồng bộ.
      // Sau xác thực OTP, bắt người dùng đăng nhập lại để nhận token + user chuẩn.
      clearAuth();
      showRegisterMessage("Xác thực email thành công. Vui lòng đăng nhập.", "success");

      setTimeout(() => {
        window.location.href = "login.html";
      }, 1000);
    } catch (error) {
      console.error(error);
      showRegisterMessage("Không thể kết nối tới server", "error");
    }
  });

  // ================= RESEND OTP =================
  resendBtn?.addEventListener("click", async () => {
    if (!registeredEmail) {
      return showRegisterMessage("Chưa có email để gửi lại OTP", "error");
    }

    try {
      const response = await fetch(`${API_URL}/resend-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: registeredEmail,
        }),
      });

      const result = await response.json().catch(() => ({ message: "Lỗi phản hồi từ server" }));

      if (!response.ok) {
        return showRegisterMessage(getRegisterError(result, "Không gửi lại được OTP"), "error");
      }

      showRegisterMessage(result.message || "OTP mới đã được gửi", "success");
    } catch (error) {
      console.error(error);
      showRegisterMessage("Không thể kết nối tới server", "error");
    }
  });
});
