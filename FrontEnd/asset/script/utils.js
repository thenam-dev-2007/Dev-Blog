// ==================== RENDER UTILITIES ====================

// Render bài viết
function renderPost(post) {
    return `
        <article class="post-card">
            <div class="post-thumbnail">
                <img src="${post.thumbnail || 'https://via.placeholder.com/400x200'}" alt="${post.title}">
            </div>
            <div class="post-content">
                <h3 class="post-title">
                    <a href="post.html?slug=${post.slug}">${post.title}</a>
                </h3>
                <p class="post-excerpt">${post.content.substring(0, 150)}...</p>
                <div class="post-meta">
                    <span class="author">
                        <img src="${post.author?.avatar || 'https://via.placeholder.com/30'}" alt="${post.author?.username}">
                        ${post.author?.username || 'Anonymous'}
                    </span>
                    <span class="date">${new Date(post.createdAt).toLocaleDateString('vi-VN')}</span>
                    <span class="likes">❤️ ${post.likes}</span>
                </div>
                <div class="post-tags">
                    ${post.tags?.map(tag => `<a href="categories.html?tag=${tag}" class="tag">#${tag}</a>`).join('') || ''}
                </div>
            </div>
        </article>
    `;
}


// Render danh sách bài viết
function renderPosts(posts, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = posts.map(post => renderPost(post)).join('');
}  



// Render trang
function renderPage(currentPage, totalPages, onPageChange) {
    let html = '<div class="pagination">';

    if (currentPage > 1) {
        html += `<button class="page-btn" data-page="${currentPage - 1}">Trước</button>`;
    }

    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }

    if (currentPage < totalPages) {
        html += `<button class="page-btn" data-page="${currentPage + 1}">Sau</button>`;
    }

    html += '</div>';
    return html
}

// Render danh mục
function renderCategories(categories) {
    return categories.map(cat => `<a href="categories.html?tag=${cat.tag}" class="category-link">${cat.name}</a>`).join('');
}

// Render bình luận
function renderComment(comment) {
    return `
        <div class="comment">
            <img src="${comment.user?.avatar || 'https://via.placeholder.com/40'}" alt="${comment.user?.username}" class="avatar">
            <div class="comment-content">
                <h5 class="comment-author">${comment.user?.username}</h5>
                <p class="comment-text">${comment.content}</p>
                <span class="comment-date">${new Date(comment.createdAt).toLocaleDateString('vi-VN')}</span>
            </div>
        </div>
    `;
}


// Render danh sách bình luận
function renderComments(comments, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = comments.map(comment => renderComment(comment)).join('');
}


// ==================== FORM HELPERS ====================
// Lấy dữ liệu form
function getFormData(formId) {
    const form = document.getElementById(formId);
    if (!form) return null;

    const formData = new FormData(form);
    const data = {};

    formData.forEach((value, key) => {
        data[key] = value;
    });

    return data;
}

// Hiển thị thông báo lỗi
function showError(message, containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `<div class="alert alert-error">${message}</div>`;
    } else {
        alert(message);
    }
}

// Hiển thị thông báo thành công
function showSuccess(message, containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `<div class="alert alert-success">${message}</div>`;
        setTimeout(() => {
            container.innerHTML = '';
        }, 3000);
    }
}

    

// ==================== URL QUERY STRING ====================
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Lấy tất cả query parameters
function getAllQueryParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const params = {};
    
    for (const [key,value] of urlParams.entries()) {
        params[key] = value;
    }
    return params;
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


// ==================== LOADING & NOTIFICATIONS ====================
// loading
function showLoading(text = "Đang tải...") {
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


function toast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        TransformStreamDefaultController.remove();
    }, 3000);
}


