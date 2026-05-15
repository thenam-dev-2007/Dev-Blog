document.addEventListener("DOMContentLoaded", function () {
    var btnDarkMode = document.getElementById("btnDarkMode");
    var headerSearch = document.getElementById("headerSearch");

    // Khởi động: đọc theme đã lưu từ lần trước
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark");
        if (btnDarkMode) btnDarkMode.textContent = "☀️";
    }

    // Bật/tắt dark mode
    window.toggleDarkMode = function () {
        document.body.classList.toggle("dark");
        var btn = document.getElementById("btnDarkMode");
        if (!btn) return;

        if (document.body.classList.contains("dark")) {
            btn.textContent = "☀️";
            localStorage.setItem("theme", "dark");
        } else {
            btn.textContent = "🌙";
            localStorage.setItem("theme", "light");
        }
    };

    // Mở / đóng thanh tìm kiếm
    window.toggleSearch = function () {
        var input = document.getElementById("headerSearch");
        if (!input) return;

        input.classList.toggle("open");
        if (input.classList.contains("open")) {
            input.focus();
        } else {
            input.value = "";
        }
    };

    // Nhấn Enter để tìm kiếm
    if (headerSearch) {
        headerSearch.addEventListener("keydown", function (e) {
            if (e.key === "Enter" && this.value.trim() !== "") {
                window.location.href = "search.html?q=" + encodeURIComponent(this.value.trim());
            }
        });
    }
});