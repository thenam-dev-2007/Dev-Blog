// ==================== ADMIN.JS ====================
// Toàn bộ logic cho trang admin.html
// Gồm: chuyển tab, dashboard, quản lý bài viết, user, Q&A

// ---- Biến lưu trạng thái ----
let dsBaiViet  = [];   // Danh sách bài viết đã load
let dsNguoiDung = [];  // Danh sách user đã load
let dsQA       = [];   // Danh sách Q&A đã load

// Trang hiện tại của từng phần
let trangBaiViet  = 1;
let trangNguoiDung = 1;
let trangQA       = 1;

// Hàm xóa sẽ gọi khi xác nhận trong modal
let hamXoaPending = null;


// ==================== CHUYỂN TAB ====================

function moTab(tenTab, linkElement) {
    // 1. Ẩn tất cả tab content
    document.querySelectorAll('.tab-content').forEach(function(tab) {
        tab.style.display = 'none';
    });

    // 2. Bỏ active khỏi tất cả link sidebar
    document.querySelectorAll('.sidebar-menu a').forEach(function(a) {
        a.classList.remove('active');
    });

    // 3. Hiện tab được chọn
    var tabEl = document.getElementById('tab-' + tenTab);
    if (tabEl) tabEl.style.display = 'block';

    // 4. Đánh dấu link active
    if (linkElement) linkElement.classList.add('active');

    // 5. Cập nhật tiêu đề topbar
    var tenHienThi = {
        'dashboard': '📊 Dashboard',
        'posts':     '📝 Quản lý bài viết',
        'users':     '👥 Quản lý người dùng',
        'qa':        '❓ Quản lý Q&A'
    };
    var topbar = document.getElementById('topbar-title');
    if (topbar) topbar.textContent = tenHienThi[tenTab] || '';

    // 6. Load dữ liệu cho tab vừa mở
    if (tenTab === 'dashboard') loadDashboard();
    if (tenTab === 'posts')     loadAdminPosts(trangBaiViet);
    if (tenTab === 'users')     loadAdminUsers(trangNguoiDung);
    if (tenTab === 'qa')        loadAdminQA(trangQA);
}


// ==================== DASHBOARD ====================

async function loadDashboard() {
    try {
        const result = await apiCall('/admin/stats', 'GET');
        if (result.code === 200) {
            document.getElementById('stat-posts').textContent    = result.data.posts    || 0;
            document.getElementById('stat-users').textContent    = result.data.users    || 0;
            document.getElementById('stat-qa').textContent       = result.data.qa       || 0;
            document.getElementById('stat-comments').textContent = result.data.comments || 0;
        }
    } catch (error) {
        // API chưa có thì hiển thị 0, không báo lỗi
        console.log('Chưa có API stats:', error.message);
    }

    // Load bài viết gần đây cho dashboard
    try {
        const result = await apiCall('/admin/posts?page=1', 'GET');
        if (result.code === 200 && result.data.length > 0) {
            var tbody = document.getElementById('dashboard-recent-posts');
            if (tbody) {
                // Chỉ lấy 5 bài đầu
                tbody.innerHTML = result.data.slice(0, 5).map(function(post, i) {
                    return `
                        <tr>
                            <td>${i + 1}</td>
                            <td>${post.title}</td>
                            <td>${post.author?.username || 'N/A'}</td>
                            <td>${new Date(post.createdAt).toLocaleDateString('vi-VN')}</td>
                            <td><span class="badge badge-xanh">Hiển thị</span></td>
                        </tr>
                    `;
                }).join('');
            }
        }
    } catch (error) {
        console.log('Lỗi load recent posts:', error.message);
    }
}


// ==================== QUẢN LÝ BÀI VIẾT ====================

async function loadAdminPosts(trang) {
    trang = trang || 1;
    trangBaiViet = trang;

    var container = document.getElementById('admin-posts');
    container.innerHTML = '<p style="color:#999; text-align:center; padding:20px;">Đang tải...</p>';

    try {
        const result = await apiCall('/admin/posts?page=' + trang, 'GET');

        if (result.code === 200) {
            dsBaiViet = result.data || [];
            hienThiBangBaiViet(dsBaiViet);

            // Hiện số lượng
            var total = result.pagination ? result.pagination.total : dsBaiViet.length;
            var countEl = document.getElementById('post-count');
            if (countEl) countEl.textContent = 'Tổng: ' + total + ' bài viết';

            // Phân trang
            var tongTrang = result.pagination ? result.pagination.pages : 1;
            renderPhanTrangAdmin('phan-trang-posts', trang, tongTrang, loadAdminPosts);

        } else {
            container.innerHTML = '<p style="color:red; padding:20px;">' + (result.message || 'Lỗi tải dữ liệu') + '</p>';
        }
    } catch (error) {
        console.error('Lỗi:', error);
        container.innerHTML = '<p style="color:red; padding:20px;">Lỗi kết nối: ' + error.message + '</p>';
    }
}

function hienThiBangBaiViet(ds) {
    var container = document.getElementById('admin-posts');

    if (!ds || ds.length === 0) {
        container.innerHTML = '<p style="color:#999; text-align:center; padding:20px;">Không có bài viết nào</p>';
        return;
    }

    container.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Tiêu đề</th>
                    <th>Tác giả</th>
                    <th>Ngày tạo</th>
                    <th>Like</th>
                    <th>Hành động</th>
                </tr>
            </thead>
            <tbody>
                ${ds.map(function(post, i) {
                    return `
                        <tr>
                            <td>${i + 1}</td>
                            <td>${post.title}</td>
                            <td>${post.author?.username || 'N/A'}</td>
                            <td>${new Date(post.createdAt).toLocaleDateString('vi-VN')}</td>
                            <td>${post.likes || 0}</td>
                            <td>
                                <button class="btn-edit"   onclick="suaBaiViet('${post._id}')">✏️ Sửa</button>
                                <button class="btn-delete" onclick="moModalXoa('bài viết', function(){ xoaBaiViet('${post._id}') })">🗑️ Xóa</button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

// Tìm kiếm bài viết ngay trên client (không cần gọi API thêm)
function timKiemBaiViet(tuKhoa) {
    var ketQua = dsBaiViet.filter(function(post) {
        return post.title.toLowerCase().indexOf(tuKhoa.toLowerCase()) !== -1;
    });
    hienThiBangBaiViet(ketQua);
}

// Điền bài viết vào form để sửa
function suaBaiViet(postId) {
    var post = dsBaiViet.find(function(p) { return p._id === postId; });
    if (!post) {
        toast('Không tìm thấy bài viết', 'error');
        return;
    }

    document.getElementById('post-title').value     = post.title;
    document.getElementById('post-content').value   = post.content;
    document.getElementById('post-tags').value      = (post.tags || []).join(', ');
    document.getElementById('post-thumbnail').value = post.thumbnail || '';

    // Đổi tiêu đề form + nút
    document.getElementById('form-post-title').textContent = '✏️ Chỉnh sửa bài viết';
    var btn = document.getElementById('submit-post-btn');
    btn.textContent = '💾 Cập nhật bài viết';
    btn.onclick = function() { capNhatBaiViet(postId); };

    // Cuộn lên đầu form
    document.getElementById('form-post-title').scrollIntoView({ behavior: 'smooth' });
}

// Reset form về trạng thái "thêm mới"
function huyFormPost() {
    document.getElementById('create-post-form').reset();
    document.getElementById('form-post-title').textContent = '➕ Thêm bài viết mới';
    var btn = document.getElementById('submit-post-btn');
    btn.textContent = '➕ Tạo bài viết';
    btn.onclick = taoBaiViet;
}

async function taoBaiViet() {
    var title     = document.getElementById('post-title').value.trim();
    var content   = document.getElementById('post-content').value.trim();
    var tags      = document.getElementById('post-tags').value;
    var thumbnail = document.getElementById('post-thumbnail').value.trim();
    var user      = getUserInfo();

    if (!title || !content) {
        toast('Vui lòng nhập tiêu đề và nội dung', 'error');
        return;
    }
    if (!user) {
        toast('Bạn cần đăng nhập', 'error');
        return;
    }

    showLoading('Đang tạo bài viết...');

    try {
        const result = await apiCall('/admin/posts', 'POST', {
            title,
            content,
            thumbnail: thumbnail || null,
            tags: tags ? tags.split(',').map(function(t) { return t.trim(); }) : [],
            author: user.id
        });
        hideLoading();

        if (result.code === 201) {
            toast('Tạo bài viết thành công!', 'success');
            huyFormPost();
            loadAdminPosts(1);
        } else {
            toast(result.message || 'Lỗi khi tạo bài viết', 'error');
        }
    } catch (error) {
        hideLoading();
        toast('Lỗi: ' + error.message, 'error');
    }
}

async function capNhatBaiViet(postId) {
    var title     = document.getElementById('post-title').value.trim();
    var content   = document.getElementById('post-content').value.trim();
    var tags      = document.getElementById('post-tags').value;
    var thumbnail = document.getElementById('post-thumbnail').value.trim();

    if (!title || !content) {
        toast('Vui lòng nhập tiêu đề và nội dung', 'error');
        return;
    }

    showLoading('Đang cập nhật...');

    try {
        const result = await apiCall('/admin/posts/' + postId, 'PATCH', {
            title,
            content,
            thumbnail: thumbnail || null,
            tags: tags ? tags.split(',').map(function(t) { return t.trim(); }) : []
        });
        hideLoading();

        if (result.code === 200) {
            toast('Cập nhật thành công!', 'success');
            huyFormPost();
            loadAdminPosts(trangBaiViet);
        } else {
            toast(result.message || 'Lỗi khi cập nhật', 'error');
        }
    } catch (error) {
        hideLoading();
        toast('Lỗi: ' + error.message, 'error');
    }
}

async function xoaBaiViet(postId) {
    showLoading('Đang xóa...');
    try {
        const result = await apiCall('/admin/posts/' + postId, 'DELETE');
        hideLoading();
        if (result.code === 200) {
            toast('Đã xóa bài viết!', 'success');
            loadAdminPosts(trangBaiViet);
        } else {
            toast(result.message || 'Lỗi khi xóa', 'error');
        }
    } catch (error) {
        hideLoading();
        toast('Lỗi: ' + error.message, 'error');
    }
}


// ==================== QUẢN LÝ NGƯỜI DÙNG ====================

async function loadAdminUsers(trang) {
    trang = trang || 1;
    trangNguoiDung = trang;

    var container = document.getElementById('admin-users');
    container.innerHTML = '<p style="color:#999; text-align:center; padding:20px;">Đang tải...</p>';

    try {
        const result = await apiCall('/admin/users?page=' + trang, 'GET');

        if (result.code === 200) {
            dsNguoiDung = result.data || [];
            hienThiBangUser(dsNguoiDung);

            var total = result.pagination ? result.pagination.total : dsNguoiDung.length;
            var countEl = document.getElementById('user-count');
            if (countEl) countEl.textContent = 'Tổng: ' + total + ' người dùng';

            var tongTrang = result.pagination ? result.pagination.pages : 1;
            renderPhanTrangAdmin('phan-trang-users', trang, tongTrang, loadAdminUsers);

        } else {
            container.innerHTML = '<p style="color:red; padding:20px;">' + (result.message || 'Lỗi tải dữ liệu') + '</p>';
        }
    } catch (error) {
        console.error('Lỗi:', error);
        container.innerHTML = '<p style="color:red; padding:20px;">Lỗi kết nối: ' + error.message + '</p>';
    }
}

function hienThiBangUser(ds) {
    var container = document.getElementById('admin-users');

    if (!ds || ds.length === 0) {
        container.innerHTML = '<p style="color:#999; text-align:center; padding:20px;">Không có người dùng</p>';
        return;
    }

    container.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Tên đăng nhập</th>
                    <th>Email</th>
                    <th>Ngày tham gia</th>
                    <th>Vai trò</th>
                    <th>Hành động</th>
                </tr>
            </thead>
            <tbody>
                ${ds.map(function(user, i) {
                    return `
                        <tr>
                            <td>${i + 1}</td>
                            <td>
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <img src="${user.avatar || 'https://via.placeholder.com/30'}"
                                        style="width:30px; height:30px; border-radius:50%; object-fit:cover;">
                                    ${user.username}
                                </div>
                            </td>
                            <td>${user.email}</td>
                            <td>${new Date(user.createdAt).toLocaleDateString('vi-VN')}</td>
                            <td>
                                <span class="badge ${user.role === 'admin' ? 'badge-xanh' : 'badge-vang'}">
                                    ${user.role === 'admin' ? 'Admin' : 'Thành viên'}
                                </span>
                            </td>
                            <td>
                                <button class="btn-delete"
                                        onclick="moModalXoa('người dùng', function(){ xoaUser('${user._id}') })">
                                    🗑️ Xóa
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

function timKiemUser(tuKhoa) {
    var ketQua = dsNguoiDung.filter(function(user) {
        return user.username.toLowerCase().indexOf(tuKhoa.toLowerCase()) !== -1
            || user.email.toLowerCase().indexOf(tuKhoa.toLowerCase()) !== -1;
    });
    hienThiBangUser(ketQua);
}

async function xoaUser(userId) {
    showLoading('Đang xóa...');
    try {
        const result = await apiCall('/admin/users/' + userId, 'DELETE');
        hideLoading();
        if (result.code === 200) {
            toast('Đã xóa người dùng!', 'success');
            loadAdminUsers(trangNguoiDung);
        } else {
            toast(result.message || 'Lỗi khi xóa', 'error');
        }
    } catch (error) {
        hideLoading();
        toast('Lỗi: ' + error.message, 'error');
    }
}


// ==================== QUẢN LÝ Q&A ====================

async function loadAdminQA(trang) {
    trang = trang || 1;
    trangQA = trang;

    var container = document.getElementById('admin-qa');
    container.innerHTML = '<p style="color:#999; text-align:center; padding:20px;">Đang tải...</p>';

    var filter = '';
    var filterEl = document.getElementById('filter-qa');
    if (filterEl) filter = filterEl.value;

    var url = '/admin/qa?page=' + trang;
    if (filter) url += '&status=' + filter;

    try {
        const result = await apiCall(url, 'GET');

        if (result.code === 200) {
            dsQA = result.data || [];
            hienThiBangQA(dsQA);

            var tongTrang = result.pagination ? result.pagination.pages : 1;
            renderPhanTrangAdmin('phan-trang-qa', trang, tongTrang, loadAdminQA);

        } else {
            container.innerHTML = '<p style="color:red; padding:20px;">' + (result.message || 'Lỗi tải dữ liệu') + '</p>';
        }
    } catch (error) {
        console.error('Lỗi:', error);
        container.innerHTML = '<p style="color:red; padding:20px;">Lỗi kết nối: ' + error.message + '</p>';
    }
}

function hienThiBangQA(ds) {
    var container = document.getElementById('admin-qa');

    if (!ds || ds.length === 0) {
        container.innerHTML = '<p style="color:#999; text-align:center; padding:20px;">Không có câu hỏi nào</p>';
        return;
    }

    container.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Câu hỏi</th>
                    <th>Người hỏi</th>
                    <th>Ngày đặt</th>
                    <th>Trả lời</th>
                    <th>Hành động</th>
                </tr>
            </thead>
            <tbody>
                ${ds.map(function(qa, i) {
                    var soTraLoi = qa.answers ? qa.answers.length : 0;
                    var noiDung  = qa.title || (qa.content ? qa.content.substring(0, 60) + '...' : 'N/A');
                    return `
                        <tr>
                            <td>${i + 1}</td>
                            <td>${noiDung}</td>
                            <td>${qa.user?.username || 'Ẩn danh'}</td>
                            <td>${new Date(qa.createdAt).toLocaleDateString('vi-VN')}</td>
                            <td>
                                <span class="badge ${soTraLoi > 0 ? 'badge-xanh' : 'badge-do'}">
                                    ${soTraLoi > 0 ? soTraLoi + ' trả lời' : 'Chưa có'}
                                </span>
                            </td>
                            <td>
                                <button class="btn-delete"
                                        onclick="moModalXoa('câu hỏi', function(){ xoaQA('${qa._id}') })">
                                    🗑️ Xóa
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

function timKiemQA(tuKhoa) {
    var ketQua = dsQA.filter(function(qa) {
        var text = (qa.title || '') + ' ' + (qa.content || '');
        return text.toLowerCase().indexOf(tuKhoa.toLowerCase()) !== -1;
    });
    hienThiBangQA(ketQua);
}

async function xoaQA(qaId) {
    showLoading('Đang xóa...');
    try {
        const result = await apiCall('/admin/qa/' + qaId, 'DELETE');
        hideLoading();
        if (result.code === 200) {
            toast('Đã xóa câu hỏi!', 'success');
            loadAdminQA(trangQA);
        } else {
            toast(result.message || 'Lỗi khi xóa', 'error');
        }
    } catch (error) {
        hideLoading();
        toast('Lỗi: ' + error.message, 'error');
    }
}


// ==================== MODAL XÁC NHẬN XÓA ====================

function moModalXoa(tenMuc, hamXoa) {
    // Cập nhật nội dung modal
    document.getElementById('modal-message').textContent =
        'Bạn có chắc muốn xóa ' + tenMuc + ' này? Hành động này không thể hoàn tác.';

    // Lưu hàm xóa lại để gọi khi bấm xác nhận
    hamXoaPending = hamXoa;

    // Hiện modal
    document.getElementById('modal-xoa').style.display = 'flex';
}

function dongModal() {
    document.getElementById('modal-xoa').style.display = 'none';
    hamXoaPending = null;
}


// ==================== KHỞI ĐỘNG ====================

document.addEventListener('DOMContentLoaded', function() {
    // Mặc định hiện tab dashboard
    var tabDashboard = document.getElementById('tab-dashboard');
    if (tabDashboard) tabDashboard.style.display = 'block';

    loadDashboard();

    // Gán sự kiện cho nút tạo bài viết
    var submitBtn = document.getElementById('submit-post-btn');
    if (submitBtn) {
        submitBtn.onclick = taoBaiViet;
    }

    // Gán sự kiện cho nút xác nhận xóa trong modal
    var btnXacNhan = document.getElementById('btn-xac-nhan-xoa');
    if (btnXacNhan) {
        btnXacNhan.onclick = function() {
            dongModal();
            if (hamXoaPending) hamXoaPending();
        };
    }
});
