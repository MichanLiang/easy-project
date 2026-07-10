/* ================= PROJECTS LIST VIEW ================= */
const PROJECT_STATUSES = ['構想','進行中','完成','維護'];
const STATUS_COLOR = {'構想':'#C2B5B5','進行中':'#B8A9C9','完成':'#A8B5A0','維護':'#C9B896'};

function viewProjects(){
  const cols = PROJECT_STATUSES.map(st=>{
    const items = DB.projects.filter(p=>p.status===st);
    return `
    <div>
      <div class="status-col-head">
        <span class="dot" style="background:${STATUS_COLOR[st]}"></span>
        ${st} 
        <span class="n">${items.length}</span>
      </div>
      <div class="status-col-body">
        ${items.map(p=>renderProjectCard(p)).join('') }
      </div>
    </div>`;
  }).join('');
  
  setTimeout(initIcons, 10);
  
  return `
    <div class="page-title" style="justify-content:space-between;align-items:center">
      <span>專案管理</span>
      <button class="btn btn-primary btn-sm" onclick="openNewProjectModal()">
        <span class="icon">${getIcon('plus')}</span>
        新增專案
      </button>
    </div>
    <div class="page-sub">建立與追蹤所有個人與團隊專案，依進度分類一目瞭然</div>
    <div class="status-cols">${cols}</div>
  `;
}

function renderProjectCard(p){
  const docCount = p.docs.length;
  // 只顯示已接受邀請的成員
  const acceptedMemberIds = (p.memberIds || []).filter(id => {
    const member = DB.members.find(m => m.id === id);
    return member && member.status === 'accepted';
  });
  
  return `
  <div class="card proj-card" onclick="go('project',{projectId:'${p.id}',docId:null})">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
      <div class="pname">${escapeHTML(p.name)}</div>
      <button class="btn-ghost btn-icon btn-sm" onclick="event.stopPropagation();openProjectSettingsModal('${p.id}')">
        <span class="icon">${getIcon('moreHorizontal')}</span>
      </button>
    </div>
    <div style="font-size:12px;color:var(--ink-faint);display:flex;align-items:center;gap:6px;">
      <span class="icon">${getIcon('file')}</span>
      ${docCount} 份文件
    </div>
    <div class="pmeta">
      <div class="stack">${acceptedMemberIds.slice(0,4).map(id=>avatarHTML(id,24)).join('')}</div>
      <span class="tag pending">${p.status}</span>
    </div>
  </div>`;
}

function openNewProjectModal(){
  openModal(`
    <div class="modal-head"><h3>新增專案</h3></div>
    <div class="modal-body">
      <div class="field"><label>專案名稱</label><input type="text" id="npName" placeholder="請輸入專案名稱"></div>
      <div class="field"><label>初始狀態</label>
        <select id="npStatus">${PROJECT_STATUSES.map(s=>`<option>${s}</option>`).join('')}</select>
      </div>
      <div class="field"><label>成員</label>
        <div class="member-pick" id="npMembers">
          ${DB.members.map(m=>`<div class="mchip on" data-id="${m.id}" onclick="toggleChip(this)">${avatarHTML(m.id,22)} ${m.name}</div>`).join('')}
        </div>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="createProject()">
        <span class="icon">${getIcon('plus')}</span>
        建立專案
      </button>
    </div>
  `);
  setTimeout(initIcons, 10);
}

function toggleChip(el){ el.classList.toggle('on'); }

function createProject(){
  const name = document.getElementById('npName').value.trim();
  if(!name){ toast('請輸入專案名稱'); return; }
  const status = document.getElementById('npStatus').value;
  const memberIds = Array.from(document.querySelectorAll('#npMembers .mchip.on')).map(el=>el.dataset.id);
  const newProject = {id:uid(), name, status, memberIds, docs:[]};
  DB.projects.push(newProject);
  persist(); closeModal(); toast('專案已建立'); go('projects');
  // 同步專案到所有成員
  syncProjectToMembers(newProject);
}

function openProjectSettingsModal(id){
  const p = DB.projects.find(x=>x.id===id);
  openModal(`
    <div class="modal-head"><h3>專案設定</h3></div>
    <div class="modal-body">
      <div class="field"><label>專案名稱</label><input type="text" id="epName" value="${escapeHTML(p.name)}"></div>
      <div class="field"><label>狀態</label>
        <select id="epStatus">${PROJECT_STATUSES.map(s=>`<option ${s===p.status?'selected':''}>${s}</option>`).join('')}</select>
      </div>
      <div class="field"><label>成員</label>
        <div class="member-pick" id="epMembers">
          ${DB.members.map(m=>`<div class="mchip ${p.memberIds.includes(m.id)?'on':''}" data-id="${m.id}" onclick="toggleChip(this)">${avatarHTML(m.id,22)} ${m.name}</div>`).join('')}
        </div>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-danger" onclick="deleteProject('${p.id}')">
        <span class="icon">${getIcon('trash')}</span>
        刪除專案
      </button>
      <div style="flex:1"></div>
      <button class="btn" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="saveProjectSettings('${p.id}')">
        <span class="icon">${getIcon('save')}</span>
        儲存
      </button>
    </div>
  `);
  setTimeout(initIcons, 10);
}

function saveProjectSettings(id){
  const p = DB.projects.find(x=>x.id===id);
  p.name = document.getElementById('epName').value.trim() || p.name;
  p.status = document.getElementById('epStatus').value;
  p.memberIds = Array.from(document.querySelectorAll('#epMembers .mchip.on')).map(el=>el.dataset.id);
  persist(); closeModal(); toast('已儲存'); render();
  // 同步更新到所有成員
  syncProjectUpdateToMembers(p);
}

function deleteProject(id){
  if(!confirm('確定要刪除此專案嗎？此動作無法復原。')) return;
  const project = DB.projects.find(p=>p.id===id);
  DB.projects = DB.projects.filter(p=>p.id!==id);
  persist(); closeModal(); go('projects');
  // 同步刪除到所有成員的 Firestore
  if(project) removeProjectFromMembers(project);
}

// 從所有成員的 Firestore 移除專案
async function removeProjectFromMembers(project){
  const user = auth.currentUser;
  if(!user || state.isGuest) return;
  for(const memberId of (project.memberIds||[])){
    if(memberId === user.uid) continue;
    try {
      const memberRef = firebase.firestore().collection('users').doc(memberId);
      const memberDoc = await memberRef.get();
      if(memberDoc.exists){
        const projects = (memberDoc.data().projects||[]).filter(p=>p.id!==project.id);
        await memberRef.update({ projects });
      }
    } catch(e){ /* 可能無權限 */ }
  }
}

/* ================= PROJECT DETAIL VIEW ================= */
const DOC_TYPES = [
  {type:'doc', label:'文件', icon:'file', color:'#C2B5B5'},
  {type:'kanban', label:'看板', icon:'kanban', color:'#A8B5A0'},
  {type:'userflow', label:'Userflow', icon:'gitBranch', color:'#C9B896'},
  {type:'wireframe', label:'Wireframe', icon:'image', color:'#C4A4A4'},
  {type:'prd', label:'PRD 模板', icon:'clipboard', color:'#9AABB8'},
  {type:'gantt', label:'甘特圖', icon:'barChart', color:'#B8A9C9'},
  {type:'todo', label:'待辦事項', icon:'checkSquare', color:'#C4A882'},
  {type:'roadmap', label:'Roadmap', icon:'map', color:'#9CA89C'},
  {type:'meeting', label:'會議記錄', icon:'fileText', color:'#C2B5B5'},
];

function docTypeMeta(type){ return DOC_TYPES.find(d=>d.type===type) || DOC_TYPES[0]; }

function viewProjectDetail(){
  const p = DB.projects.find(x=>x.id===state.projectId);
  if(!p) return `<div class="empty"><div class="big">?</div>找不到這個專案</div>`;
  if(state.docId){
    const d = p.docs.find(x=>x.id===state.docId);
    if(!d) { state.docId=null; }
    else return renderDocView(p,d);
  }
  
  setTimeout(initIcons, 10);
  
  return `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <div class="page-title">${escapeHTML(p.name)}</div>
        <div class="page-sub">狀態：${p.status} · ${p.docs.length} 份文件</div>
      </div>
      <div style="display:flex;gap:10px;align-items:center;">
        <div class="stack">${p.memberIds.map(id=>avatarHTML(id,30)).join('')}</div>
        <button class="btn" onclick="openProjectSettingsModal('${p.id}')">
          <span class="icon">${getIcon('settings')}</span>
          專案設定
        </button>
      </div>
    </div>
    <div class="grid grid-docs">
      ${p.docs.map(d=>renderDocCard(p,d)).join('')}
      <div class="addcard" onclick="openAddDocModal('${p.id}')">
        <span class="icon" style="font-size:24px;">${getIcon('plus')}</span>
        新增內容
      </div>
    </div>
  `;
}

function renderDocCard(p,d){
  const meta = docTypeMeta(d.type);
  return `
  <div class="card doc-card" onclick="go('project',{projectId:'${p.id}',docId:'${d.id}'})">
    <div class="dic" style="background:${meta.color}15;color:${meta.color}">
      <span class="icon">${getIcon(meta.icon)}</span>
    </div>
    <div class="dname">${escapeHTML(d.name)}</div>
    <div class="dtype">${meta.label}</div>
  </div>`;
}

function openAddDocModal(projectId){
  openModal(`
    <div class="modal-head"><h3>新增內容</h3></div>
    <div class="modal-body">
      <div class="grid grid-docs">
        ${DOC_TYPES.map(t=>`
          <div class="card doc-card" onclick="createDoc('${projectId}','${t.type}')">
            <div class="dic" style="background:${t.color}15;color:${t.color}">
              <span class="icon">${getIcon(t.icon)}</span>
            </div>
            <div class="dname">${t.label}</div>
          </div>`).join('')}
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn" onclick="closeModal()">取消</button>
    </div>
  `, {wide:true});
  setTimeout(initIcons, 10);
}

function createDoc(projectId, type){
  const p = DB.projects.find(x=>x.id===projectId);
  const meta = docTypeMeta(type);
  const base = {id:uid(), type, name:meta.label};
  if(type==='prd') Object.assign(base,{goal:'',background:'',value:'',features:['']});
  if(type==='kanban') Object.assign(base,{cards:[]});
  if(type==='gantt') Object.assign(base,{tasks:[]});
  if(type==='roadmap') Object.assign(base,{phases:[]});
  if(type==='userflow') Object.assign(base,{nodes:[],edges:[]});
  if(type==='wireframe') Object.assign(base,{elements:[]});
  if(type==='doc') Object.assign(base,{content:''});
  if(type==='meeting') Object.assign(base,{date:todayStr(),attendees:'',content:''});
  p.docs.push(base);
  persist(); closeModal();
  go('project',{projectId, docId: base.id});
}

function renameDoc(pId, dId){
  const p = DB.projects.find(x=>x.id===pId); const d = p.docs.find(x=>x.id===dId);
  const nn = prompt('重新命名', d.name);
  if(nn && nn.trim()){ d.name = nn.trim(); persist(); render(); }
}

function deleteDoc(pId,dId){
  if(!confirm('確定刪除這份內容？')) return;
  const p = DB.projects.find(x=>x.id===pId);
  p.docs = p.docs.filter(x=>x.id!==dId);
  persist(); go('project',{projectId:pId, docId:null});
}

function docHeader(p,d){
  const meta = docTypeMeta(d.type);
  return `
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
    <div>
      <div class="page-title" style="display:flex;align-items:center;gap:12px;">
        <span class="icon" style="font-size:24px;">${getIcon(meta.icon)}</span>
        ${escapeHTML(d.name)}
      </div>
      <div class="page-sub">${p.name} · ${meta.label}</div>
    </div>
    <div style="display:flex;gap:10px;">
      <button class="btn btn-sm" onclick="renameDoc('${p.id}','${d.id}')">
        <span class="icon">${getIcon('edit')}</span>
        重新命名
      </button>
      <button class="btn btn-sm btn-danger" onclick="deleteDoc('${p.id}','${d.id}')">
        <span class="icon">${getIcon('trash')}</span>
        刪除
      </button>
    </div>
  </div>`;
}

function renderDocView(p,d){
  setTimeout(initIcons, 10);
  switch(d.type){
    case 'kanban': return docHeader(p,d) + renderKanban(p,d);
    case 'prd': return docHeader(p,d) + renderPRD(p,d);
    case 'gantt': return docHeader(p,d) + renderGantt(p,d);
    case 'roadmap': return docHeader(p,d) + renderRoadmap(p,d);
    case 'userflow': return docHeader(p,d) + renderUserflow(p,d);
    case 'wireframe': return docHeader(p,d) + renderWireframe(p,d);
    case 'todo': return docHeader(p,d) + renderProjectTodo(p,d);
    case 'meeting': return docHeader(p,d) + renderMeetingDoc(p,d);
    default: return docHeader(p,d) + renderPlainDoc(p,d);
  }
}

function renderPlainDoc(p,d){
  return `<textarea class="card" style="width:100%;min-height:420px;padding:20px;border:1px solid var(--line);font-size:14px;border-radius:var(--radius-lg);" oninput="updatePlainDoc('${p.id}','${d.id}',this.value)" placeholder="開始輸入文件內容…">${escapeHTML(d.content||'')}</textarea>`;
}

function updatePlainDoc(pId,dId,val){
  const p=DB.projects.find(x=>x.id===pId); const d=p.docs.find(x=>x.id===dId);
  d.content = val; persist();
}

// 同步專案到所有成員的 Firestore
async function syncProjectToMembers(project){
  const user = auth.currentUser;
  if(!user || state.isGuest) return;
  
  for(const memberId of project.memberIds){
    if(memberId === user.uid) continue;
    try {
      const memberRef = firebase.firestore().collection('users').doc(memberId);
      const memberDoc = await memberRef.get();
      if(memberDoc.exists){
        const memberData = memberDoc.data();
        const projects = memberData.projects || [];
        // 如果該成員還沒有這個專案，就加入
        if(!projects.find(p=>p.id===project.id)){
          projects.push(project);
          await memberRef.update({ projects });
        }
      }
    } catch(e) { /* 可能無權限 */ }
  }
}

// 同步專案更新到所有成員
async function syncProjectUpdateToMembers(project){
  const user = auth.currentUser;
  if(!user || state.isGuest) return;
  
  for(const memberId of project.memberIds){
    if(memberId === user.uid) continue;
    try {
      const memberRef = firebase.firestore().collection('users').doc(memberId);
      const memberDoc = await memberRef.get();
      if(memberDoc.exists){
        const memberData = memberDoc.data();
        const projects = memberData.projects || [];
        const idx = projects.findIndex(p=>p.id===project.id);
        if(idx !== -1){
          projects[idx] = project;
        } else {
          projects.push(project);
        }
        await memberRef.update({ projects });
      }
    } catch(e) { /* 可能無權限 */ }
  }
}

// 從其他成員處載入專案（確保所有成員都能看到共享專案）
async function loadProjectsFromMembers(){
  const user = auth.currentUser;
  if(!user || state.isGuest) return;
  if(!Array.isArray(DB.projects)) DB.projects = [];
  
  try {
    for(const member of DB.members){
      if(member.id === user.uid) continue;
      try {
        const memberDoc = await firebase.firestore().collection('users').doc(member.id).get();
        if(memberDoc.exists){
          const memberProjects = memberDoc.data().projects || [];
          for(const p of memberProjects){
            if(p.memberIds && p.memberIds.includes(user.uid)){
              const existing = DB.projects.find(x=>x.id===p.id);
              if(!existing){
                DB.projects.push(p);
              } else {
                existing.name = p.name || existing.name;
                existing.status = p.status || existing.status;
                existing.memberIds = p.memberIds || existing.memberIds;
                if(p.docs && Array.isArray(existing.docs)){
                  for(const d of p.docs){
                    if(!existing.docs.find(x=>x.id===d.id)){
                      existing.docs.push(d);
                    }
                  }
                }
              }
            }
          }
        }
      } catch(e){ /* 可能無權限 */ }
    }
    persist();
  } catch(error) {
    console.error('載入專案失敗:', error);
  }
}