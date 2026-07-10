/* ================= MAIN RENDER ================= */
let isInitialized = false;

function render(){
  const app = document.getElementById('app');
  
  // 等待 Firebase 準備好
  if(!isInitialized) {
    // 顯示載入中
    app.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:var(--ink-faint);">載入中...</div>`;
    return;
  }
  
  // 檢查登入狀態
  if(!checkLoginState()){
    // 未登入，顯示登入頁面
    app.innerHTML = renderLoginPage();
    return;
  }
  
  // 已登入，顯示主應用
  let viewHTML = '';
  switch(state.route){
    case 'projects': viewHTML = viewProjects(); break;
    case 'project': viewHTML = viewProjectDetail(); break;
    case 'calendar': viewHTML = viewCalendar(); break;
    case 'todos': viewHTML = viewTodos(); break;
    case 'backlog': viewHTML = viewBacklog(); break;
    case 'meetings': viewHTML = viewMeetingsGlobal(); break;
    case 'chat': viewHTML = viewChat(); break;
    case 'settings': viewHTML = viewSettings(); break;
    case 'trash': viewHTML = viewTrash(); break;
    default: viewHTML = viewProjects();
  }
  app.innerHTML = `
    <div class="sidebar-overlay" onclick="closeSidebarMobile()"></div>
    ${renderSidebar()}
    <div class="main">
      ${renderTopbar()}
      <div class="view">${viewHTML}</div>
    </div>
  `;
  afterRender();
}

// 標記已初始化
function markInitialized(){
  isInitialized = true;
  render();
}

// 手機版關閉側邊欄
function closeSidebarMobile(){
  if(window.innerWidth <= 768){
    state.sidebarCollapsed = true;
    render();
    setTimeout(initIcons, 10);
  }
}

// 手機版開關側邊欄
function toggleSidebarMobile(){
  state.sidebarCollapsed = !state.sidebarCollapsed;
  render();
  setTimeout(initIcons, 10);
}

function afterRender(){
  if(state.route==='project'){
    const p = DB.projects.find(x=>x.id===state.projectId);
    const d = p ? p.docs.find(x=>x.id===state.docId) : null;
    if(d && d.type==='userflow') initUserflowBoard(d);
    if(d && d.type==='wireframe') initWireframeBoard(d);
    if(d && d.type==='kanban') initKanbanDnD();
  }
  if(state.route==='chat') scrollChatBottom();
}