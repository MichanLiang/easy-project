/* ================= Router state ---------------- */
const state = {
  route: 'projects',   // projects | project | calendar | todos | chat | settings | backlog | meetings | trash
  projectId: null,
  docId: null,
  sidebarCollapsed: false,
  backlogFilter: 'all',
  chatContact: null,
  calMonth: new Date().getMonth(),
  calYear: new Date().getFullYear(),
  isLoggedIn: false,
  isGuest: false,
};

function go(route, extra){
  state.route = route;
  Object.assign(state, extra||{});
  render();
}

/* ---------------- Modal helper ---------------- */
function openModal(html, opts){
  closeModal();
  const wrap = document.createElement('div');
  wrap.className = 'overlay';
  wrap.id = 'modalOverlay';
  wrap.innerHTML = `<div class="modal ${opts&&opts.wide?'wide':''}">${html}</div>`;
  wrap.addEventListener('mousedown', (e)=>{ if(e.target===wrap) closeModal(); });
  document.body.appendChild(wrap);
}
function closeModal(){
  const el = document.getElementById('modalOverlay');
  if(el) el.remove();
}

// 檢查登入狀態
function checkLoginState(){
  // 檢查是否為訪客
  const isGuest = localStorage.getItem('jianban_guest') === 'true';
  if(isGuest){
    state.isGuest = true;
    state.isLoggedIn = true;
    return true;
  }
  
  // 檢查是否已明確登入過（有 user data 在 localStorage）
  const hasLoggedIn = localStorage.getItem('jianban_logged_in') === 'true';
  if(hasLoggedIn && auth.currentUser){
    state.isGuest = false;
    state.isLoggedIn = true;
    return true;
  }
  
  // 未登入，顯示登入頁面
  return false;
}