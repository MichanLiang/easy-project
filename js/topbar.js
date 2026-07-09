/* ================= TOPBAR ================= */
function renderTopbar(){
  let crumb = '';
  if(state.route==='project'){
    const p = DB.projects.find(x=>x.id===state.projectId);
    if(!p){ crumb = `<div class="crumb"><span class="seg" onclick="go('projects')">專案管理</span></div>`; }
    else if(state.docId){
      const d = p.docs.find(x=>x.id===state.docId);
      crumb = `<div class="crumb"><span class="seg" onclick="go('projects')">專案管理</span> / <span class="seg" onclick="go('project',{projectId:'${p.id}',docId:null})">${p.name}</span> / <b>${d?d.name:''}</b></div>`;
    } else {
      crumb = `<div class="crumb"><span class="seg" onclick="go('projects')">專案管理</span> / <b>${p.name}</b></div>`;
    }
  } else {
    const found = NAV_ITEMS.find(i=>i.key===state.route);
    crumb = `<div class="crumb"><b>${found?found.label:''}</b></div>`;
  }
  return `<div class="topbar">
    <button class="btn-ghost btn-icon menu-toggle" onclick="toggleSidebar()">
      <span class="icon">${getIcon('menu')}</span>
    </button>
    ${crumb}
    <div class="topbar-spacer"></div>
  </div>`;
}