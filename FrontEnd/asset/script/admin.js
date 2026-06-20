// ==========================================
// LOGIC HỆ THỐNG QUẢN TRỊ (ADMIN DASHBOARD)
// ==========================================

// 1. CHUYỂN ĐỔI TAB SIDEBAR VÀ SECTIONS
const menuItems = document.querySelectorAll('.admin-sidebar .menu-item[data-target]');
const adminSections = document.querySelectorAll('.admin-section');

if (menuItems.length > 0) {
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Xóa class active ở tất cả menu items khác và section
            menuItems.forEach(i => i.classList.remove('active'));
            adminSections.forEach(section => section.classList.remove('active'));
            
            // Thêm class active vào menu vừa click
            this.classList.add('active');

            // Lấy ID section mục tiêu và hiển thị nó lên
            const targetId = this.getAttribute('data-target');
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
            }
        });
    });
}

// 2. XỬ LÝ POPUP XEM CHI TIẾT BÀI VIẾT
const modalOverlay = document.getElementById('postDetailModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const viewButtons = document.querySelectorAll('.btn-action-view');

if (modalOverlay && viewButtons.length > 0) {
    viewButtons.forEach(button => {
        button.addEventListener('click', function() {
            const parentRow = this.closest('tr');
            
            // Lấy dữ liệu từ các thẻ data-* trong HTML (<tr>)
            const title = parentRow.getAttribute('data-title') || 'Chưa có tiêu đề';
            const author = parentRow.getAttribute('data-author') || 'Ẩn danh';
            const date = parentRow.getAttribute('data-date') || '';
            const content = parentRow.getAttribute('data-content') || 'Chưa có nội dung.';
            const thumbnail = parentRow.getAttribute('data-thumbnail'); // Link ảnh

            // Đẩy text vào Popup
            document.getElementById('modalPostTitle').innerText = title;
            document.getElementById('modalPostAuthor').innerText = author;
            document.getElementById('modalPostDate').innerText = date;
            document.getElementById('modalPostContent').innerText = content;

            // Xử lý Ảnh nền (Thumbnail)
            const imgElement = document.getElementById('modalPostThumbnail');
            const wrapperElement = imgElement.parentElement; // div.modal-thumbnail-wrapper

            // Nếu có link ảnh và link không rỗng thì hiển thị
            if (thumbnail && thumbnail.trim() !== "") {
                imgElement.setAttribute('src', thumbnail);
                wrapperElement.style.display = 'block'; 
            } else {
                // Nếu bài viết không có ảnh thì ẩn khung ảnh đi
                imgElement.setAttribute('src', '');
                wrapperElement.style.display = 'none';  
            }

            // Hiển thị Popup lên màn hình
            modalOverlay.classList.add('active');
        });
    });

    // Tắt popup khi bấm nút X
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            modalOverlay.classList.remove('active');
        });
    }

    // Tắt popup khi bấm ra ngoài vùng tối mờ
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.classList.remove('active');
        }
    });
}

// 3. XỬ LÝ XÓA NGƯỜI DÙNG
const userTable = document.getElementById('userListTable');
if (userTable) {
    userTable.addEventListener('click', function(e) {
        // Sử dụng event delegation để bắt sự kiện click vào nút xóa
        if (e.target.classList.contains('btn-delete-user')) {
            const userName = e.target.getAttribute('data-name');
            const confirmDelete = confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn người dùng "${userName}" khỏi hệ thống?`);
            
            if (confirmDelete) {
                // Xóa dòng tr (table row) chứa nút bấm đó ra khỏi cây DOM giao diện
                e.target.closest('tr').remove();
                alert(`Đã xóa thành công người dùng: ${userName}`);
            }
        }
    });
}