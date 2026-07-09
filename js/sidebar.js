/* ================= SIDEBAR ================= */
const NAV_ITEMS = [
  {key:'projects', label:'專案管理', icon:'folder'},
  {key:'calendar', label:'行事曆', icon:'calendar'},
  {key:'todos', label:'待辦清單', icon:'checkSquare'},
  {key:'backlog', label:'需求池', icon:'lightbulb'},
  {key:'meetings', label:'會議記錄', icon:'fileText'},
  {key:'chat', label:'聊天室', icon:'messageCircle'},
];

function renderSidebar(){
  const c = state.sidebarCollapsed;
  const me = memberById(DB.currentUser);
  const user = auth.currentUser;
  const displayName = state.isGuest ? '訪客' : (user?.displayName || me.name);
  const displayEmail = state.isGuest ? '本地儲存' : (user?.email || '');
  const photoURL = state.isGuest ? null : user?.photoURL;
  
  return `
  <div class="sidebar ${c?'collapsed':''}">
    <div class="sidebar-head">
      <div class="sidebar-logo">簡</div>
      <div class="sidebar-title">簡案</div>
      <button class="collapse-btn" onclick="toggleSidebar()">
        <span class="icon">${c ? getIcon('chevronRight') : getIcon('chevronLeft')}</span>
      </button>
    </div>
    <div class="nav">
      ${NAV_ITEMS.map(it=>`
        <div class="navitem ${state.route===it.key || (it.key==='projects'&&state.route==='project') ?'active':''}" onclick="go('${it.key}')" title="${it.label}">
          <span class="ic">${getIcon(it.icon)}</span><span class="navlabel">${it.label}</span>
        </div>`).join('')}
    </div>
    <div class="sidebar-footer" onclick="go('settings')" style="cursor:pointer;" title="個人設定">
      <div class="avatar" style="width:34px;height:34px;background:${me.color};font-size:13px;">
        ${photoURL 
          ? `<img src="${photoURL}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`
          : initials(displayName)
        }
      </div>
      <div class="sidebar-user-meta" style="flex:1;min-width:0;">
        <div class="name">${escapeHTML(displayName)}</div>
        <div class="role">${escapeHTML(displayEmail)}</div>
      </div>
      <button class="collapse-btn" onclick="event.stopPropagation();openUserMenu()" title="帳號選單">
        <span class="icon">${getIcon('moreVertical')}</span>
      </button>
    </div>
  </div>`;
}

function toggleSidebar(){ 
  state.sidebarCollapsed = !state.sidebarCollapsed; 
  render(); 
  setTimeout(initIcons, 10);
}

// 用戶選單
function openUserMenu(){
  const user = auth.currentUser;
  const me = memberById(DB.currentUser);
  const displayName = state.isGuest ? '訪客' : (user?.displayName || me.name);
  const displayEmail = state.isGuest ? '本地儲存模式' : (user?.email || '');
  const photoURL = state.isGuest ? null : user?.photoURL;
  
  openModal(`
    <div class="modal-head">
      <h3>帳號選單</h3>
    </div>
    <div class="modal-body">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid var(--line-light);">
        <div class="avatar" style="width:56px;height:56px;background:${me.color};font-size:20px;">
          ${photoURL 
            ? `<img src="${photoURL}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`
            : initials(displayName)
          }
        </div>
        <div>
          <div style="font-weight:700;font-size:16px;color:var(--ink);">${escapeHTML(displayName)}</div>
          <div style="font-size:13px;color:var(--ink-faint);">${escapeHTML(displayEmail)}</div>
          ${state.isGuest ? '<div style="font-size:11px;color:var(--amber);margin-top:4px;">訪客模式 - 資料僅存於本機</div>' : ''}
        </div>
      </div>
      
      <div style="display:flex;flex-direction:column;gap:8px;">
        <button class="btn" onclick="go('settings');closeModal();" style="width:100%;justify-content:flex-start;">
          <span class="icon">${getIcon('settings')}</span>
          個人設定
        </button>
        
        ${state.isGuest ? `
          <button class="btn btn-primary" onclick="handleGoogleLogin();closeModal();" style="width:100%;justify-content:center;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff" opacity="0.8"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff" opacity="0.8"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff" opacity="0.8"/>
            </svg>
            登入 Google 帳號同步資料
          </button>
        ` : `
          <button class="btn" onclick="handleChangeAccount();closeModal();" style="width:100%;justify-content:flex-start;">
            <span class="icon">${getIcon('refreshCw')}</span>
            換帳號
          </button>
          <button class="btn btn-danger" onclick="handleLogout();closeModal();" style="width:100%;justify-content:flex-start;">
            <span class="icon">${getIcon('logOut')}</span>
            登出
          </button>
        `}
      </div>
    </div>
  `);
  setTimeout(initIcons, 10);
}