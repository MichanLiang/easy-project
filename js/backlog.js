/* ================= BACKLOG (需求池) ================= */
function viewBacklog(){
  const folders = [{id:'__all', name:'全部'}, ...DB.projects.map(p=>({id:p.id,name:p.name})), {id:'__none', name:'未分類'}];
  const filter = state.backlogFilter;
  let items = DB.backlogItems;
  if(filter==='__none') items = items.filter(i=>!i.projectId);
  else if(filter!=='all' && filter!=='__all') items = items.filter(i=>i.projectId===filter);
  
  setTimeout(() => {
    initIcons();
    loadProjectBacklogItems();
  }, 10);
  
  return `
  <div style="display:flex;justify-content:space-between;align-items:flex-start;">
    <div>
      <div class="page-title">需求池</div>
      <div class="page-sub">收集來自各方的點子與 Bug，尚未排入開發排程的彈藥庫</div>
    </div>
    <button class="btn btn-primary" onclick="openBacklogModal()">
      <span class="icon">${getIcon('plus')}</span>
      新增項目
    </button>
  </div>
  <div class="backlog-tabs">
    ${folders.map(f=>`<div class="backtab ${filter===f.id||(filter==='all'&&f.id==='__all')?'active':''}" onclick="setBacklogFilter('${f.id}')">${escapeHTML(f.name)}</div>`).join('')}
  </div>
  <div class="card">
    ${items.length? items.map(i=>renderBacklogItem(i)).join('') : `<div class="empty"><div class="big"><span class="icon" style="font-size:48px;">${getIcon('lightbulb')}</span></div>目前沒有項目</div>`}
  </div>`;
}

// 從專案成員載入需求池項目（跳過已刪除的）
async function loadProjectBacklogItems(){
  const user = auth.currentUser;
  if(!user || state.isGuest) return;
  if(!Array.isArray(DB.dismissedBacklogs)) DB.dismissedBacklogs = [];
  
  try {
    for(const project of DB.projects){
      for(const memberId of project.memberIds){
        if(memberId === user.uid) continue;
        try {
          const memberDoc = await firebase.firestore().collection('users').doc(memberId).get();
          if(memberDoc.exists){
            const memberData = memberDoc.data();
            const memberBacklog = memberData.backlogItems || [];
            for(const item of memberBacklog){
              // 跳過已刪除的、已存在的
              if(DB.dismissedBacklogs.includes(item.id)) continue;
              if(!DB.backlogItems.find(b=>b.id===item.id)){
                DB.backlogItems.push(item);
              }
            }
          }
        } catch(e) { /* 可能無權限 */ }
      }
    }
    persist();
  } catch(error) {
    console.error('載入專案需求池失敗:', error);
  }
}

function setBacklogFilter(f){ state.backlogFilter = f==='__all'?'all':f; render(); }

function renderBacklogItem(i){
  const proj = DB.projects.find(p=>p.id===i.projectId);
  return `
  <div class="blitem">
    <span class="blkind ${i.kind}">
      <span class="icon" style="width:10px;height:10px;">${getIcon(i.kind==='idea'?'lightbulb':'bug')}</span>
      ${i.kind==='idea'?'點子':'BUG'}
    </span>
    <div style="flex:1;cursor:pointer" onclick="openBacklogModal('${i.id}')">
      <div style="font-weight:700;font-size:14px;color:var(--ink);">${escapeHTML(i.title)}</div>
      ${i.desc?`<div style="font-size:13px;color:var(--ink-soft);margin-top:6px;">${escapeHTML(i.desc)}</div>`:''}
      <div style="font-size:12px;color:var(--ink-faint);margin-top:8px;display:flex;align-items:center;gap:6px;">
        <span class="icon" style="width:12px;height:12px;">${getIcon('folder')}</span>
        ${proj?proj.name:'未分類'} · ${i.createdAt}
      </div>
    </div>
    <button class="btn btn-sm" onclick="convertBacklogToTask('${i.id}')">
      <span class="icon">${getIcon('checkSquare')}</span>
      轉為任務
    </button>
    <button class="btn btn-sm btn-danger" onclick="dismissBacklogItem('${i.id}')" style="margin-left:4px;" title="刪除">
      <span class="icon">${getIcon('trash2')}</span>
    </button>
  </div>`;
}

function openBacklogModal(id){
  const i = id ? DB.backlogItems.find(x=>x.id===id) : {id:null, kind:'idea', title:'', desc:'', projectId:null};
  openModal(`
    <div class="modal-head"><h3>${id?'編輯項目':'新增需求池項目'}</h3></div>
    <div class="modal-body">
      <div class="field"><label>類型</label>
        <div class="chip-row">
          <div class="chip ${i.kind==='idea'?'on':''}" onclick="pickBLKind(this,'idea')">
            <span class="icon">${getIcon('lightbulb')}</span>
            點子
          </div>
          <div class="chip ${i.kind==='bug'?'on':''}" onclick="pickBLKind(this,'bug')">
            <span class="icon">${getIcon('bug')}</span>
            Bug
          </div>
        </div>
        <input type="hidden" id="blKind" value="${i.kind}">
      </div>
      <div class="field"><label>標題</label><input type="text" id="blTitle" value="${escapeHTML(i.title)}"></div>
      <div class="field"><label>說明</label><textarea id="blDesc" placeholder="詳細描述…">${escapeHTML(i.desc||'')}</textarea></div>
      <div class="field"><label>所屬專案</label>
        <select id="blProject"><option value="">未分類</option>${DB.projects.map(p=>`<option value="${p.id}" ${i.projectId===p.id?'selected':''}>${escapeHTML(p.name)}</option>`).join('')}</select>
      </div>
    </div>
    <div class="modal-foot">
      ${id?`<button class="btn btn-danger" onclick="dismissBacklogItem('${id}')">
        <span class="icon">${getIcon('trash2')}</span>
        刪除
      </button>`:''}
      <div style="flex:1"></div>
      <button class="btn" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="saveBacklogItem('${id||''}')">
        <span class="icon">${getIcon('save')}</span>
        儲存
      </button>
    </div>
  `);
  setTimeout(initIcons, 10);
}

function pickBLKind(el,k){ 
  document.getElementById('blKind').value=k; 
  el.parentElement.querySelectorAll('.chip').forEach(c=>c.classList.remove('on')); 
  el.classList.add('on'); 
}

function saveBacklogItem(id){
  const title = document.getElementById('blTitle').value.trim();
  if(!title){ toast('請輸入標題'); return; }
  const payload = {
    kind: document.getElementById('blKind').value, title,
    desc: document.getElementById('blDesc').value,
    projectId: document.getElementById('blProject').value || null,
  };
  if(id){ Object.assign(DB.backlogItems.find(x=>x.id===id), payload); }
  else { DB.backlogItems.push({id:uid(), createdAt:todayStr(), ...payload}); }
  persist(); closeModal(); render();
}

// 刪除需求池項目（記住已刪除，避免重新載入）
function dismissBacklogItem(id){
  if(!Array.isArray(DB.dismissedBacklogs)) DB.dismissedBacklogs = [];
  DB.dismissedBacklogs.push(id);
  DB.backlogItems = DB.backlogItems.filter(x=>x.id!==id);
  persist(); closeModal(); render();
}

function convertBacklogToTask(id){
  const i = DB.backlogItems.find(x=>x.id===id);
  if(!i.projectId){ toast('請先指定所屬專案再轉為任務'); return; }
  const p = DB.projects.find(x=>x.id===i.projectId);
  let kanbanDoc = p.docs.find(d=>d.type==='kanban');
  if(!kanbanDoc){ kanbanDoc = {id:uid(), type:'kanban', name:'開發看板', cards:[]}; p.docs.push(kanbanDoc); }
  kanbanDoc.cards.push({id:uid(), title:i.title, col:'pending', assignee:'', due:'', note:i.desc||'', attachments:[]});
  // 轉為任務後也標記為已處理
  if(!Array.isArray(DB.dismissedBacklogs)) DB.dismissedBacklogs = [];
  DB.dismissedBacklogs.push(id);
  DB.backlogItems = DB.backlogItems.filter(x=>x.id!==id);
  persist(); toast('已轉為看板任務'); render();
}
