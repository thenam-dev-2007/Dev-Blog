// ==================== UTILS.JS ====================
// Các hàm dùng chung cho toàn bộ trang client và admin

// ==================== RENDER BÀI VIẾT ====================

// Render 1 bài viết thành HTML (dùng ở index, search, categories...)
function renderPost(post) {
    return `
        <article class="section-card article-card">
            <img src="${post.thumbnail || 'https://via.placeholder.com/400x200'}" alt="${post.title}">
            <div>
                <h3><a href="post.html?slug=${post.slug}">${post.title}</a></h3>
                <p>${post.content.substring(0, 150)}...</p>
            </div>
            <div class="card-footer">
                <small>
                    <b>${post.author?.username || 'Ẩn danh'}</b>
                    | ${new Date(post.createdAt).toLocaleDateString('vi-VN')}
                </small>
                <div class="article-actions">
                    <button type="button">❤️ ${post.likes || 0}</button>
                    <button type="button">🔗 Share</button>
                </div>
            </div>
        </article>
    `;
}

// Render nhiều bài viết vào 1 container
function renderPosts(posts, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = posts.map(post => renderPost(post)).join('');
}


// ==================== PHÂN TRANG CLIENT ====================

/**
 * Tạo các nút phân trang và đặt vào container
 *
 * @param {string}   containerId  - id của div chứa phân trang
 * @param {number}   trangHT      - trang hiện tại (bắt đầu từ 1)
 * @param {number}   tongTrang    - tổng số trang
 * @param {Function} hamLoad      - hàm gọi khi người dùng đổi trang
 *
 * Ví dụ dùng:
 *   renderPhanTrang('phan-trang-home', 2, 10, loadHomePage);
 */
function renderPhanTrang(containerId, trangHT, tongTrang, hamLoad) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Nếu chỉ có 1 trang thì ẩn đi
    if (tongTrang <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';

    // Nút "← Trước"
    if (trangHT === 1) {
        // Trang đầu thì disabled
        html += `<button class="btn-trang" disabled>← Trước</button>`;
    } else {
        html += `<button class="btn-trang" onclick="${hamLoad.name}(${trangHT - 1})">← Trước</button>`;
    }

    // Tính khoảng số trang hiển thị (tối đa 5 nút số)
    // Ví dụ đang trang 5 / 10 thì hiện: 3 4 [5] 6 7
    let batDau = Math.max(1, trangHT - 2);
    let ketThuc = Math.min(tongTrang, trangHT + 2);

    // Hiển thị "1 ..." nếu trang đầu bị ẩn
    if (batDau > 1) {
        html += `<button class="btn-trang" onclick="${hamLoad.name}(1)">1</button>`;
        if (batDau > 2) {
            html += `<span style="padding:0 4px; color:#999; align-self:center;">...</span>`;
        }
    }

    // Các nút số trang chính
    for (let i = batDau; i <= ketThuc; i++) {
        if (i === trangHT) {
            // Trang đang xem - active
            html += `<button class="btn-trang active">${i}</button>`;
        } else {
            html += `<button class="btn-trang" onclick="${hamLoad.name}(${i})">${i}</button>`;
        }
    }

    // Hiển thị "... 10" nếu trang cuối bị ẩn
    if (ketThuc < tongTrang) {
        if (ketThuc < tongTrang - 1) {
            html += `<span style="padding:0 4px; color:#999; align-self:center;">...</span>`;
        }
        html += `<button class="btn-trang" onclick="${hamLoad.name}(${tongTrang})">${tongTrang}</button>`;
    }

    // Nút "Sau →"
    if (trangHT === tongTrang) {
        html += `<button class="btn-trang" disabled>Sau →</button>`;
    } else {
        html += `<button class="btn-trang" onclick="${hamLoad.name}(${trangHT + 1})">Sau →</button>`;
    }

    container.innerHTML = html;
}


// ==================== RENDER PHÂN TRANG ADMIN ====================
// (Giống client nhưng dùng class phan-trang-admin)

function renderPhanTrangAdmin(containerId, trangHT, tongTrang, hamLoad) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (tongTrang <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';

    html += `<button ${trangHT === 1 ? 'disabled' : `onclick="${hamLoad.name}(${trangHT - 1})"`}>← Trước</button>`;

    let batDau = Math.max(1, trangHT - 2);
    let ketThuc = Math.min(tongTrang, trangHT + 2);

    for (let i = batDau; i <= ketThuc; i++) {
        html += `<button class="${i === trangHT ? 'active' : ''}" onclick="${hamLoad.name}(${i})">${i}</button>`;
    }

    html += `<button ${trangHT === tongTrang ? 'disabled' : `onclick="${hamLoad.name}(${trangHT + 1})"`}>Sau →</button>`;

    container.innerHTML = html;
}


// ==================== RENDER DANH MỤC ====================

function renderCategories(categories) {
    return categories.map(cat => `
        <div class="section-card" style="cursor:pointer;">
            <a href="categories.html?tag=${cat._id}" style="text-decoration:none;">
                <h3 style="color:var(--mau-chu);">${cat._id}</h3>
                <p style="color:var(--mau-chu-nhat); font-size:0.85rem; margin-top:6px;">${cat.count} bài viết</p>
            </a>
        </div>
    `).join('');
}


// ==================== RENDER BÌNH LUẬN ====================

function renderComment(comment) {
    return `
        <div style="padding:14px 0; border-bottom:1px solid var(--mau-vien);">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
                <img src="${comment.user?.avatar || 'https://via.placeholder.com/36'}"
                     style="width:36px; height:36px; border-radius:50%; object-fit:cover;">
                <div>
                    <b style="font-size:0.9rem;">${comment.user?.username || 'Ẩn danh'}</b><br>
                    <span style="font-size:0.78rem; color:#999;">
                        ${new Date(comment.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                </div>
            </div>
            <p style="font-size:0.9rem; line-height:1.6;">${comment.content}</p>
        </div>
    `;
}

function renderComments(comments, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = comments.map(c => renderComment(c)).join('');
}


// ==================== URL QUERY ====================

// Lấy param từ URL: getQueryParam('slug') → 'ten-bai-viet'
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}


// ==================== LOCAL STORAGE ====================

function saveUserInfo(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

function getUserInfo() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

function clearUserInfo() {
    localStorage.removeItem('user');
}


// ==================== LOADING & TOAST ====================

function showLoading(text = 'Đang tải...') {
    hideLoading(); // Xóa loader cũ nếu còn
    const loader = document.createElement('div');
    loader.id = 'loader';
    loader.className = 'loader';
    loader.innerHTML = `<p>${text}</p>`;
    document.body.appendChild(loader);
}

function hideLoading() {
    const loader = document.getElementById('loader');
    if (loader) loader.remove();
}

// Thông báo nhỏ góc phải màn hình
function toast(message, type = 'info') {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    document.body.appendChild(el);

    // Tự xóa sau 3 giây
    setTimeout(() => {
        el.remove();
    }, 3000);
}

// Hiển thị lỗi trong container
function showError(message, containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div style="text-align:center; padding:30px; color:#e53e3e;">
                <p>⚠️ ${message}</p>
            </div>
        `;
    } else {
        alert(message);
    }
}
