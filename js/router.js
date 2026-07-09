/* ================= Router state ---------------- */
const state = {
  route: 'projects',   // projects | project | calendar | todos | chat | settings | backlog | meetings
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
  if(isGuest && !auth.currentUser){
    state.isGuest = true;
    state.isLoggedIn = true;
    return true;
  }
  
  // 檢查 Firebase 使用者
  if(auth.currentUser){
    // 如果之前是訪客但現在已登入，清除訪客狀態
    if(isGuest) {
      localStorage.removeItem('jianban_guest');
    }
    state.isGuest = false;
    state.isLoggedIn = true;
    return true;
  }
  
  // 未登入
  return false;
}