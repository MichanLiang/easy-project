/* ================= SETTINGS ================= */
function viewSettings(){
  const me = memberById(DB.currentUser);
  const currentTheme = localStorage.getItem('jianban_theme') || 'light';
  const user = auth.currentUser;
  
  setTimeout(initIcons, 10);
  
  return `
  <div class="page-title">個人設定</div>
  <div class="page-sub">管理你的個人資訊、團隊成員與應用程式外觀</div>
  <div class="settings-grid">
    <!-- 帳號登入 -->
    <div class="card" style="padding:24px;">
      <div class="section-title" style="margin-top:0">
        <span class="icon">${getIcon('lock')}</span>
        帳號登入
      </div>
      ${user ? `
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;">
          <div style="width:56px;height:56px;border-radius:50%;background:var(--accent-soft);display:flex;align-items:center;justify-content:center;">
            ${user.photoURL 
              ? `<img src="${user.photoURL}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`
              : `<span class="icon" style="font-size:24px;color:var(--accent);">${getIcon('user')}</span>`
            }
          </div>
          <div>
            <div style="font-weight:700;font-size:16px;color:var(--ink);">${user.displayName || '使用者'}</div>
            <div style="font-size:13px;color:var(--ink-faint);">${user.email || ''}</div>
          </div>
        </div>
      ` : `
        <div style="text-align:center;padding:20px 0;">
          <div style="color:var(--ink-faint);margin-bottom:18px;">登入以同步你的資料到雲端</div>
          <button class="btn btn-primary" onclick="signInWithGoogle()" style="width:100%;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            使用 Google 帳號登入
          </button>
        </div>
      `}
    </div>
    
    <!-- 外觀設定 -->
    <div class="card" style="padding:24px;">
      <div class="section-title" style="margin-top:0">
        <span class="icon">${getIcon('eye')}</span>
        外觀設定
      </div>
      <div class="field">
        <label>主題模式</label>
        <div class="theme-switcher">
          <button class="theme-btn ${currentTheme==='light'?'active':''}" onclick="setTheme('light')">
            <span class="icon">${getIcon('sun')}</span>
            淺色
          </button>
          <button class="theme-btn ${currentTheme==='dark'?'active':''}" onclick="setTheme('dark')">
            <span class="icon">${getIcon('moon')}</span>
            深色
          </button>
          <button class="theme-btn ${currentTheme==='system'?'active':''}" onclick="setTheme('system')">
            <span class="icon">${getIcon('monitor')}</span>
            跟隨系統
          </button>
        </div>
      </div>
    </div>
    
    <!-- 我的帳號 -->
    <div class="card" style="padding:24px;">
      <div class="section-title" style="margin-top:0">
        <span class="icon">${getIcon('user')}</span>
        個人資料
      </div>
      <div class="field"><label>顯示名稱</label><input type="text" id="meName" value="${escapeHTML(me.name)}"></div>
      <div class="field"><label>顏色標籤</label>
        <div class="chip-row">${getMorandiColors().map(c=>`<div onclick="pickMeColor(this,'${c}')" style="width:32px;height:32px;border-radius:50%;background:${c};cursor:pointer;border:3px solid ${c===me.color?'var(--ink)':'transparent'};transition:all 0.15s;"></div>`).join('')}</div>
        <input type="hidden" id="meColor" value="${me.color}">
      </div>
      <button class="btn btn-primary" onclick="saveMyProfile()">
        <span class="icon">${getIcon('save')}</span>
        儲存
      </button>
    </div>
    
    <!-- 團隊成員 -->
    <div class="card" style="padding:24px;">
      <div class="section-title" style="margin-top:0">
        <span class="icon">${getIcon('users')}</span>
        團隊成員
      </div>
      
      <!-- 邀請成員 -->
      <div style="margin-bottom:16px;">
        <div style="display:flex;gap:8px;">
          <input type="email" id="inviteEmail" placeholder="輸入 Gmail 信箱邀請" style="flex:1;border:1px solid var(--line);border-radius:var(--radius);padding:10px 14px;background:var(--bg-subtle);">
          <button class="btn btn-primary btn-sm" onclick="inviteMember()">
            <span class="icon">${getIcon('send')}</span>
            邀請
          </button>
        </div>
      </div>
      
      <!-- 成員列表 -->
      <div id="memberList">
        ${DB.members.map(m=>`
          <div class="member-row" data-uid="${m.id}">
            ${avatarHTML(m.id,34)}
            <div style="flex:1;">
              <div style="font-weight:600;">${escapeHTML(m.name)}</div>
              <div style="font-size:11px;color:var(--ink-faint);">${m.email || '本地用戶'}</div>
            </div>
            ${m.id === DB.currentUser ? '<span style="font-size:11px;color:var(--accent);">你</span>' : 
              `<button class="btn-ghost btn-icon btn-sm" onclick="removeMember('${m.id}')">
                <span class="icon">${getIcon('x')}</span>
              </button>`
            }
          </div>`).join('')}
      </div>
    </div>
  </div>
  `;
}

// 莫蘭迪色系
function getMorandiColors(){
  return [
    '#C4A4A4', '#9AABB8', '#A8B5A0', '#B8A9C9',
    '#C9B896', '#C4A882', '#9CA89C', '#C2B5B5',
  ];
}

function pickMeColor(el,c){ 
  document.getElementById('meColor').value=c; 
  el.parentElement.querySelectorAll('div').forEach(x=>x.style.border='3px solid transparent'); 
  el.style.border='3px solid var(--ink)'; 
}

function saveMyProfile(){
  const me = memberById(DB.currentUser);
  me.name = document.getElementById('meName').value.trim() || me.name;
  me.color = document.getElementById('meColor').value;
  persist(); toast('已儲存'); render();
}

// 邀請成員
async function inviteMember(){
  const email = document.getElementById('inviteEmail').value.trim();
  if(!email){ toast('請輸入信箱'); return; }
  if(!email.includes('@')){ toast('請輸入有效的信箱'); return; }
  
  // 檢查是否已存在
  const exists = DB.members.some(m => m.email === email);
  if(exists){ toast('此成員已存在'); return; }
  
  const colors = getMorandiColors();
  const newMember = {
    id: uid(),
    name: email.split('@')[0],
    email: email,
    color: colors[DB.members.length % colors.length],
    isPending: true
  };
  
  // 嘗試從 Firestore 查找用戶
  try {
    const usersSnapshot = await firebase.firestore().collection('users').get();
    let found = false;
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      if(userData.email === email){
        // 找到用戶，使用他們的 UID
        newMember.id = doc.id;
        newMember.isPending = false;
        newMember.name = userData.displayName || email.split('@')[0];
        found = true;
      }
    });
    
    if(found){
      toast(`已成功邀請 ${email}`);
    } else {
      toast(`邀請已發送，等待 ${email} 註冊後自動加入`);
    }
  } catch (error) {
    console.error('查詢用戶失敗:', error);
    toast('邀請已發送');
  }
  
  DB.members.push(newMember);
  persist();
  
  // 同步到 Firestore
  await syncMembersToFirestore();
  
  document.getElementById('inviteEmail').value = '';
  render();
}

function removeMember(id){
  if(!confirm('確定移除此成員？')) return;
  DB.members = DB.members.filter(m=>m.id!==id);
  DB.projects.forEach(p => {
    p.memberIds = p.memberIds.filter(mid => mid !== id);
  });
  persist(); render();
}

/* ================= Theme System ================= */
function setTheme(theme){
  localStorage.setItem('jianban_theme', theme);
  applyTheme(theme);
  render();
}

function applyTheme(theme){
  let effectiveTheme = theme;
  if(theme === 'system'){
    effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', effectiveTheme);
}

function initTheme(){
  const savedTheme = localStorage.getItem('jianban_theme') || 'light';
  applyTheme(savedTheme);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if(localStorage.getItem('jianban_theme') === 'system') applyTheme('system');
  });
}

initTheme();