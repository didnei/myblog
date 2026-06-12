// --- GLOBALS & CONFIGURATION ---
let supabase = null;
const CONFIG_KEY = 'aesthetic_blog_supabase_config';
const AUTH_KEY = 'aesthetic_blog_admin_authenticated';
const THEME_KEY = 'aesthetic_blog_theme';

// --- INITIALIZE SUPABASE ---
function initSupabase() {
  const config = JSON.parse(localStorage.getItem(CONFIG_KEY));
  if (config && config.url && config.key) {
    try {
      supabase = window.supabase.createClient(config.url, config.key);
      return true;
    } catch (error) {
      console.error("Supabase 초기화 오류:", error);
      return false;
    }
  }
  return false;
}

// --- THEME CONTROL (LIGHT/DARK) ---
function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  const themeBtn = document.getElementById('theme-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem(THEME_KEY, newTheme);
      updateThemeIcon(newTheme);
    });
  }
}

function updateThemeIcon(theme) {
  const themeIcon = document.getElementById('theme-icon');
  if (!themeIcon) return;
  
  if (theme === 'light') {
    // Moon Icon SVG
    themeIcon.innerHTML = `
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    `;
  } else {
    // Sun Icon SVG
    themeIcon.innerHTML = `
      <circle cx="12" cy="12" r="5"></circle>
      <line x1="12" y1="1" x2="12" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="23"></line>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
      <line x1="1" y1="12" x2="3" y2="12"></line>
      <line x1="21" y1="12" x2="23" y2="12"></line>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    `;
  }
}

// --- CONFIG MODAL CONTROL ---
function initConfigModal() {
  const modal = document.getElementById('config-modal');
  const openBtn = document.getElementById('open-config');
  const closeBtn = document.getElementById('close-config');
  const saveBtn = document.getElementById('save-config');
  
  const urlInput = document.getElementById('supabase-url');
  const keyInput = document.getElementById('supabase-key');

  if (!modal) return;

  const showModal = () => {
    const config = JSON.parse(localStorage.getItem(CONFIG_KEY)) || { url: '', key: '' };
    urlInput.value = config.url;
    keyInput.value = config.key;
    modal.classList.add('active');
  };

  const hideModal = () => {
    modal.classList.remove('active');
  };

  if (openBtn) openBtn.addEventListener('click', showModal);
  if (closeBtn) closeBtn.addEventListener('click', hideModal);

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const url = urlInput.value.trim();
      const key = keyInput.value.trim();

      if (!url || !key) {
        alert("모든 필드를 입력해 주세요.");
        return;
      }

      localStorage.setItem(CONFIG_KEY, JSON.stringify({ url, key }));
      hideModal();
      alert("설정이 저장되었습니다. 페이지를 새로고침합니다.");
      window.location.reload();
    });
  }

  // 만약 Supabase 설정이 없다면 자동으로 모달 노출
  if (!supabase) {
    setTimeout(showModal, 600);
  }
}

// --- CORE UTILS ---
function formatDate(dateString) {
  const date = new Date(dateString);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

// Default images list to use if no cover image is provided
const DEFAULT_COVERS = [
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80'
];

function getRandomCover(id) {
  // Use id hash to keep cover persistent for same post
  let sum = 0;
  if (id) {
    for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  } else {
    sum = Math.floor(Math.random() * 100);
  }
  return DEFAULT_COVERS[sum % DEFAULT_COVERS.length];
}

// --- INDEX PAGE BUSINESS LOGIC ---
async function handleIndexPage() {
  const container = document.getElementById('posts-container');
  const searchInput = document.getElementById('search-input');
  const categoryList = document.getElementById('category-list');
  
  if (!container) return; // Not index page
  if (!supabase) return; // Supabase not configured

  let allPosts = [];
  let currentCategory = 'all';

  const fetchAndRenderPosts = async () => {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
        <p style="margin-bottom: 12px;">글 목록을 불러오는 중...</p>
        <div style="display:inline-block; width: 30px; height: 30px; border: 3px solid var(--border-color); border-radius: 50%; border-top-color: var(--primary); animation: spin 1s linear infinite;"></div>
      </div>
    `;

    try {
      let query = supabase.from('posts').select('*').order('created_at', { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;

      allPosts = data || [];
      renderPosts(allPosts);
    } catch (error) {
      console.error("데이터 조회 오류:", error);
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px;" class="glass-panel">
          <p style="color: var(--accent); font-weight: 600; margin-bottom: 8px;">글을 불러오지 못했습니다.</p>
          <p style="font-size: 0.9rem; color: var(--text-secondary);">Supabase DB의 posts 테이블 및 RLS 설정이 올바른지 확인해주세요.</p>
        </div>
      `;
    }
  };

  const renderPosts = (posts) => {
    // Filter by category
    let filtered = posts;
    if (currentCategory !== 'all') {
      filtered = posts.filter(p => p.category === currentCategory);
    }

    // Filter by search query
    const searchVal = searchInput.value.toLowerCase().trim();
    if (searchVal) {
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(searchVal) || 
        p.content.toLowerCase().includes(searchVal) ||
        (p.summary && p.summary.toLowerCase().includes(searchVal))
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px;" class="glass-panel">
          <svg style="margin-bottom: 16px; color: var(--text-muted);" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="9" y1="9" x2="15" y2="15"></line>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <circle cx="12" cy="12" r="10"></circle>
          </svg>
          <h3 style="font-family: 'Playfair Display', serif; margin-bottom: 8px;">게시글을 찾을 수 없습니다.</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem;">검색어나 카테고리 필터를 조정해보세요.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(post => {
      const cover = post.cover_image || getRandomCover(post.id);
      return `
        <article class="post-card glass-panel" onclick="location.href='post.html?id=${post.id}'">
          <div class="post-image-wrapper">
            <img src="${cover}" alt="${post.title}" class="post-image" loading="lazy">
            <span class="post-tag">${post.category || 'Tech'}</span>
          </div>
          <div class="post-content">
            <div class="post-meta">
              <span>${formatDate(post.created_at)}</span>
              <span>•</span>
              <span>조회 ${post.views || 0}</span>
            </div>
            <h2 class="post-title">${escapeHTML(post.title)}</h2>
            <p class="post-excerpt">${escapeHTML(post.summary || '')}</p>
            <div class="post-footer">
              <span>Read Story</span>
              <span class="arrow">&rarr;</span>
            </div>
          </div>
        </article>
      `;
    }).join('');
  };

  // Category Filter Events
  if (categoryList) {
    categoryList.addEventListener('click', (e) => {
      const btn = e.target.closest('.category-btn');
      if (!btn) return;

      document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      currentCategory = btn.dataset.category;
      renderPosts(allPosts);
    });
  }

  // Search Event
  searchInput.addEventListener('input', () => renderPosts(allPosts));

  // Initial load
  fetchAndRenderPosts();
}

// --- DETAIL PAGE BUSINESS LOGIC ---
async function handleDetailPage() {
  const article = document.getElementById('post-article');
  const commentsSection = document.getElementById('comments-section');
  const loading = document.getElementById('post-loading');
  const errorPanel = document.getElementById('post-error');

  if (!article) return; // Not detail page
  if (!supabase) {
    loading.style.display = 'none';
    errorPanel.style.display = 'block';
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('id');

  if (!postId) {
    loading.style.display = 'none';
    errorPanel.style.display = 'block';
    return;
  }

  try {
    // 1. Fetch Post Detail
    const { data: post, error } = await supabase.from('posts').select('*').eq('id', postId).single();
    if (error || !post) throw error;

    // 2. Render content
    document.title = `${post.title} — Aesthetic Space`;
    document.getElementById('post-category').textContent = post.category || 'Tech';
    document.getElementById('post-date').textContent = formatDate(post.created_at);
    document.getElementById('post-views').textContent = `조회 ${post.views || 0}`;
    document.getElementById('post-title').textContent = post.title;
    document.getElementById('post-banner').src = post.cover_image || getRandomCover(post.id);
    
    // Markdown Parse (Marked.js)
    document.getElementById('post-body-content').innerHTML = marked.parse(post.content || '');

    loading.style.display = 'none';
    article.style.display = 'block';
    commentsSection.style.display = 'block';

    // 3. Increment views asynchronously
    supabase.rpc('increment_views', { post_id: postId }).then(({ error: rpcError }) => {
      if (rpcError) {
        // Fallback if custom RPC function is not defined
        supabase.from('posts').update({ views: (post.views || 0) + 1 }).eq('id', postId);
      }
    });

    // 4. Load Comments
    loadComments(postId);

    // 5. Handle Comment Submit
    const commentForm = document.getElementById('comment-form');
    commentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const author = document.getElementById('comment-author').value.trim();
      const password = document.getElementById('comment-password').value.trim();
      const content = document.getElementById('comment-content').value.trim();
      
      if (!author || !content || !password) return;

      try {
        const { error: insertErr } = await supabase.from('comments').insert([
          { post_id: postId, author, content, password }
        ]);

        if (insertErr) throw insertErr;

        document.getElementById('comment-content').value = '';
        loadComments(postId);
      } catch (err) {
        console.error("댓글 작성 실패:", err);
        alert("댓글 작성에 실패했습니다. DB 스키마(password 필드 등)를 확인하세요.");
      }
    });

  } catch (err) {
    console.error("포스트 로드 에러:", err);
    loading.style.display = 'none';
    errorPanel.style.display = 'block';
  }
}

async function loadComments(postId) {
  const listContainer = document.getElementById('comments-list');
  if (!listContainer) return;

  try {
    const { data: comments, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    if (!comments || comments.length === 0) {
      listContainer.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 20px;">첫 번째 댓글을 작성해 보세요!</p>`;
      return;
    }

    listContainer.innerHTML = comments.map(c => `
      <div class="comment-card glass-panel">
        <div class="comment-header">
          <span class="comment-author">${escapeHTML(c.author)}</span>
          <div style="display: flex; gap: 12px; align-items: center;">
            <span class="comment-date">${formatDate(c.created_at)}</span>
            <button onclick="deleteComment('${c.id}', '${postId}')" style="color: var(--accent); font-size: 0.8rem; font-weight: 500;">삭제</button>
          </div>
        </div>
        <p class="comment-content">${escapeHTML(c.content).replace(/\n/g, '<br>')}</p>
      </div>
    `).join('');

  } catch (error) {
    console.error("댓글 로딩 에러:", error);
    listContainer.innerHTML = `<p style="color: var(--accent); text-align: center;">댓글을 불러오는 도중 오류가 발생했습니다.</p>`;
  }
}

// Window globally exposed function for comment deletion
window.deleteComment = async function(commentId, postId) {
  const password = prompt("댓글 작성 시 설정한 비밀번호를 입력해주세요:");
  if (!password) return;

  try {
    // Check password by requesting delete with matching ID and password
    const { data, error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('password', password)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      alert("비밀번호가 일치하지 않거나 삭제할 수 없습니다.");
    } else {
      alert("댓글이 삭제되었습니다.");
      loadComments(postId);
    }
  } catch (error) {
    console.error("댓글 삭제 에러:", error);
    alert("댓글 삭제 실패. 비밀번호 확인 또는 RLS 정책을 확인해 주세요.");
  }
};

// --- ADMIN PAGE BUSINESS LOGIC ---
const DEFAULT_ADMIN_PASSWORD = 'admin'; // 기본 관리자 비밀번호 (변경 가능)

function handleAdminPage() {
  const authSection = document.getElementById('admin-auth');
  const panelSection = document.getElementById('admin-panel');
  
  if (!authSection) return; // Not admin page

  const passwordInput = document.getElementById('admin-password-input');
  const loginBtn = document.getElementById('admin-login-btn');
  const logoutBtn = document.getElementById('admin-logout-btn');

  // Check Local Session
  const isAuth = sessionStorage.getItem(AUTH_KEY);
  if (isAuth === 'true' && supabase) {
    authSection.style.display = 'none';
    panelSection.style.display = 'block';
    loadAdminDashboard();
  }

  // Login event
  loginBtn.addEventListener('click', () => {
    const pw = passwordInput.value.trim();
    if (!supabase) {
      alert("Settings에서 Supabase 설정을 먼저 완료해주세요.");
      return;
    }
    
    // Simple verification (default: 'admin' or custom localStorage code)
    const storedAdminPw = localStorage.getItem('aesthetic_admin_pin') || DEFAULT_ADMIN_PASSWORD;
    if (pw === storedAdminPw) {
      sessionStorage.setItem(AUTH_KEY, 'true');
      authSection.style.display = 'none';
      panelSection.style.display = 'block';
      loadAdminDashboard();
    } else {
      alert("비밀번호가 잘못되었습니다.");
    }
  });

  // Logout event
  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem(AUTH_KEY);
    authSection.style.display = 'block';
    panelSection.style.display = 'none';
  });

  // Admin Config setup
  setupEditorPreview();
  setupEditorFormSubmit();
}

async function loadAdminDashboard() {
  const postsList = document.getElementById('admin-posts-list');
  if (!postsList || !supabase) return;

  postsList.innerHTML = `<tr><td colspan="5" style="padding: 24px; text-align: center; color: var(--text-muted);">글 목록을 불러오는 중...</td></tr>`;

  try {
    const { data: posts, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
    if (error) throw error;

    if (!posts || posts.length === 0) {
      postsList.innerHTML = `<tr><td colspan="5" style="padding: 24px; text-align: center; color: var(--text-muted);">등록된 글이 없습니다.</td></tr>`;
      return;
    }

    postsList.innerHTML = posts.map(post => `
      <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-secondary);">
        <td style="padding: 12px 16px;">${escapeHTML(post.category || 'Tech')}</td>
        <td style="padding: 12px 16px; font-weight: 500; color: var(--text-primary); cursor: pointer;" onclick="window.open('post.html?id=${post.id}')">${escapeHTML(post.title)}</td>
        <td style="padding: 12px 16px;">${formatDate(post.created_at)}</td>
        <td style="padding: 12px 16px;">${post.views || 0}</td>
        <td style="padding: 12px 16px; text-align: right; display: flex; gap: 8px; justify-content: flex-end;">
          <button onclick="editPost('${post.id}')" style="color: var(--primary); font-weight: 600; font-size: 0.9rem;">수정</button>
          <button onclick="deletePost('${post.id}')" style="color: var(--accent); font-weight: 600; font-size: 0.9rem;">삭제</button>
        </td>
      </tr>
    `).join('');

  } catch (error) {
    console.error("대시보드 로딩 에러:", error);
    postsList.innerHTML = `<tr><td colspan="5" style="padding: 24px; text-align: center; color: var(--accent);">글을 불러오지 못했습니다. DB RLS 규칙을 확인해보세요.</td></tr>`;
  }
}

// Global scope expose for admin buttons
window.editPost = async function(id) {
  if (!supabase) return;
  
  try {
    const { data: post, error } = await supabase.from('posts').select('*').eq('id', id).single();
    if (error) throw error;

    document.getElementById('edit-post-id').value = post.id;
    document.getElementById('post-title-input').value = post.title;
    document.getElementById('post-category-select').value = post.category || 'Tech';
    document.getElementById('post-cover-input').value = post.cover_image || '';
    document.getElementById('post-summary-input').value = post.summary || '';
    document.getElementById('post-content-textarea').value = post.content || '';

    // Update Preview
    document.getElementById('editor-title-label').textContent = "글 수정하기";
    document.getElementById('save-btn-text').textContent = "수정 완료 및 업데이트";

    // trigger preview update
    document.getElementById('post-content-textarea').dispatchEvent(new Event('input'));
    document.getElementById('post-title-input').dispatchEvent(new Event('input'));

    // Scroll to form
    document.getElementById('post-editor-form').scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    console.error("포스트 가져오기 실패:", err);
    alert("포스트 정보를 가져올 수 없습니다.");
  }
};

window.deletePost = async function(id) {
  if (!confirm("정말로 이 포스트를 삭제하시겠습니까? 관련 댓글도 함께 삭제되지 않을 수 있으니 주의하세요.")) return;
  if (!supabase) return;

  try {
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (error) throw error;

    alert("삭제되었습니다.");
    loadAdminDashboard();
    
    // If we were editing this post, reset
    if (document.getElementById('edit-post-id').value === id) {
      resetEditor();
    }
  } catch (err) {
    console.error("포스트 삭제 실패:", err);
    alert("삭제에 실패했습니다. Supabase RLS 정책을 확인하세요.");
  }
};

function resetEditor() {
  document.getElementById('post-editor-form').reset();
  document.getElementById('edit-post-id').value = '';
  document.getElementById('editor-title-label').textContent = "새 글 작성";
  document.getElementById('save-btn-text').textContent = "저장 및 발행";
  
  // Reset preview
  document.getElementById('preview-title').textContent = '';
  document.getElementById('preview-content').innerHTML = '<p style="color: var(--text-muted); font-style: italic;">본문 작성 시 실시간 마크다운 미리보기가 이곳에 렌더링됩니다.</p>';
  document.getElementById('preview-meta').style.display = 'none';
}

function setupEditorPreview() {
  const titleInput = document.getElementById('post-title-input');
  const contentInput = document.getElementById('post-content-textarea');
  const categorySelect = document.getElementById('post-category-select');
  
  const previewTitle = document.getElementById('preview-title');
  const previewContent = document.getElementById('preview-content');
  const previewMeta = document.getElementById('preview-meta');
  const previewCat = document.getElementById('preview-category');
  const previewDate = document.getElementById('preview-date');

  const updatePreview = () => {
    const titleVal = titleInput.value.trim();
    const contentVal = contentInput.value.trim();
    const catVal = categorySelect.value;

    if (titleVal || contentVal) {
      previewMeta.style.display = 'flex';
      previewCat.textContent = catVal;
      previewDate.textContent = formatDate(new Date());
    } else {
      previewMeta.style.display = 'none';
    }

    previewTitle.textContent = titleVal;
    
    if (contentVal) {
      previewContent.innerHTML = marked.parse(contentVal);
    } else {
      previewContent.innerHTML = '<p style="color: var(--text-muted); font-style: italic;">본문 작성 시 실시간 마크다운 미리보기가 이곳에 렌더링됩니다.</p>';
    }
  };

  titleInput.addEventListener('input', updatePreview);
  contentInput.addEventListener('input', updatePreview);
  categorySelect.addEventListener('change', updatePreview);

  document.getElementById('reset-editor-btn').addEventListener('click', resetEditor);
}

function setupEditorFormSubmit() {
  const form = document.getElementById('post-editor-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!supabase) return;

    const id = document.getElementById('edit-post-id').value;
    const title = document.getElementById('post-title-input').value.trim();
    const category = document.getElementById('post-category-select').value;
    const cover_image = document.getElementById('post-cover-input').value.trim() || null;
    const summary = document.getElementById('post-summary-input').value.trim();
    const content = document.getElementById('post-content-textarea').value.trim();

    const payload = { title, category, cover_image, summary, content };

    try {
      if (id) {
        // Update existing
        const { error } = await supabase.from('posts').update(payload).eq('id', id);
        if (error) throw error;
        alert("성공적으로 수정 및 업데이트되었습니다.");
      } else {
        // Create new
        const { error } = await supabase.from('posts').insert([payload]);
        if (error) throw error;
        alert("새 포스트가 성공적으로 발행되었습니다.");
      }

      resetEditor();
      loadAdminDashboard();
    } catch (error) {
      console.error("글 발행 오류:", error);
      alert(`글 발행 실패. DB 스키마 또는 RLS 설정을 확인하세요.\n에러: ${error.message}`);
    }
  });
}

// --- SECURE HTML ESCAPE ---
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// --- APPLICATION INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  const hasConfig = initSupabase();
  initConfigModal();
  
  if (hasConfig) {
    handleIndexPage();
    handleDetailPage();
    handleAdminPage();
  }
});
