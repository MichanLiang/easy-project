/* ================= MAIN RENDER ================= */
function render(){
  const app = document.getElementById('app');
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
    default: viewHTML = viewProjects();
  }
  app.innerHTML = `
    ${renderSidebar()}
    <div class="main">
      ${renderTopbar()}
      <div class="view">${viewHTML}</div>
    </div>
  `;
  afterRender();
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