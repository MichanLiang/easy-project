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