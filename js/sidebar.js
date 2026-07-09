/* ================= SIDEBAR ================= */
const NAV_ITEMS = [
  {key:'settings', label:'個人設定', icon:'user'},
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
    <div class="sidebar-footer">
      ${avatarHTML(me.id,34)}
      <div class="sidebar-user-meta">
        <div class="name">${me.name}</div>
        <div class="role">個人帳號</div>
      </div>
    </div>
  </div>`;
}

function toggleSidebar(){ 
  state.sidebarCollapsed = !state.sidebarCollapsed; 
  render(); 
  setTimeout(initIcons, 10);
}