/* ================= KANBAN ================= */
const KANBAN_COLS = [
  {key:'pending', label:'待處理', color:'#C2B5B5'},
  {key:'doing', label:'進行中', color:'#C9B896'},
  {key:'testing', label:'測試中', color:'#9AABB8'},
  {key:'done', label:'已完成', color:'#A8B5A0'},
];

function renderKanban(p,d){
  return `
  <div class="kanban" id="kanbanRoot" data-pid="${p.id}" data-did="${d.id}">
    ${KANBAN_COLS.map(col=>{
      const cards = d.cards.filter(c=>c.col===col.key);
      return `
      <div class="kcol">
        <div class="kcol-head">
          <span class="t">
            <span class="dot" style="width:8px;height:8px;border-radius:50%;background:${col.color};display:inline-block"></span>
            ${col.label}
          </span>
          <span class="badge">${cards.length}</span>
        </div>
        <div class="status-col-body kcol-drop" data-col="${col.key}">
          ${cards.map(c=>renderKcard(p,d,c)).join('')}
        </div>
        <button class="kcol-add" onclick="openKcardModal('${p.id}','${d.id}',null,'${col.key}')">
          <span class="icon">${getIcon('plus')}</span>
          新增卡片
        </button>
      </div>`;
    }).join('')}
  </div>`;
}

function renderKcard(p,d,c){
  return `
  <div class="kcard" draggable="true" data-id="${c.id}" onclick="openKcardModal('${p.id}','${d.id}','${c.id}')">
    <div class="ktitle">${escapeHTML(c.title)}</div>
    <div class="kmeta">
      <span>${c.assignee?avatarHTML(c.assignee,22):''}</span>
      <span class="due">
        ${c.due ? `<span class="icon" style="width:12px;height:12px;">${getIcon('clock')}</span> ${fmtDate(c.due)}` : ''}
      </span>
    </div>
  </div>`;
}

function initKanbanDnD(){
  const root = document.getElementById('kanbanRoot');
  if(!root) return;
  const pid = root.dataset.pid, did = root.dataset.did;
  let dragId = null;
  root.querySelectorAll('.kcard').forEach(card=>{
    card.addEventListener('dragstart', e=>{ dragId = card.dataset.id; card.classList.add('dragging'); });
    card.addEventListener('dragend', e=>{ card.classList.remove('dragging'); });
  });
  root.querySelectorAll('.kcol-drop').forEach(zone=>{
    zone.addEventListener('dragover', e=>{ e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', e=>{ zone.classList.remove('dragover'); });
    zone.addEventListener('drop', e=>{
      e.preventDefault(); zone.classList.remove('dragover');
      if(!dragId) return;
      const p = DB.projects.find(x=>x.id===pid); const d = p.docs.find(x=>x.id===did);
      const card = d.cards.find(x=>x.id===dragId);
      if(card){ card.col = zone.dataset.col; persist(); render(); }
    });
  });
}

function openKcardModal(pId,dId,cardId,initCol){
  const p = DB.projects.find(x=>x.id===pId); const d = p.docs.find(x=>x.id===dId);
  const c = cardId ? d.cards.find(x=>x.id===cardId) : {id:null,title:'',col:initCol||'pending',assignee:'',due:'',note:'',attachments:[]};
  const isNew = !cardId;
  openModal(`
    <div class="modal-head"><h3>${isNew?'新增卡片':'編輯卡片'}</h3></div>
    <div class="modal-body">
      <div class="field"><label>標題</label><input type="text" id="kcTitle" value="${escapeHTML(c.title)}" placeholder="任務標題"></div>
      <div class="field-row">
        <div class="field"><label>狀態</label><select id="kcCol">${KANBAN_COLS.map(k=>`<option value="${k.key}" ${c.col===k.key?'selected':''}>${k.label}</option>`).join('')}</select></div>
        <div class="field"><label>指派給</label><select id="kcAssignee"><option value="">未指派</option>${p.memberIds.map(id=>`<option value="${id}" ${c.assignee===id?'selected':''}>${memberName(id)}</option>`).join('')}</select></div>
      </div>
      <div class="field"><label>截止日期</label><input type="date" id="kcDue" value="${c.due||''}"></div>
      <div class="field"><label>備註</label><textarea id="kcNote" placeholder="補充說明…">${escapeHTML(c.note||'')}</textarea></div>
      <div class="field"><label>檔案附件（Figma / Miro 連結等）</label>
        <div class="attach-list" id="kcAttachList">${(c.attachments||[]).map((a,i)=>`<div class="attach-item"><a href="${a.url}" target="_blank">${escapeHTML(a.name)}</a><button class="btn-ghost btn-icon btn-sm" onclick="this.parentElement.remove()"><span class="icon">${getIcon('x')}</span></button></div>`).join('')}</div>
        <div style="display:flex;gap:10px;margin-top:10px;">
          <input type="text" id="kcAttachName" placeholder="名稱" style="flex:1;border:1px solid var(--line);border-radius:var(--radius);padding:10px;">
          <input type="url" id="kcAttachUrl" placeholder="連結網址" style="flex:1.4;border:1px solid var(--line);border-radius:var(--radius);padding:10px;">
          <button class="btn btn-sm" onclick="addAttachRow('kcAttachList')">
            <span class="icon">${getIcon('plus')}</span>
            加入
          </button>
        </div>
      </div>
    </div>
    <div class="modal-foot">
      ${!isNew?`<button class="btn btn-danger" onclick="deleteKcard('${pId}','${dId}','${cardId}')">
        <span class="icon">${getIcon('trash')}</span>
        刪除
      </button>`:''}
      <div style="flex:1"></div>
      <button class="btn" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="saveKcard('${pId}','${dId}','${cardId||''}')">
        <span class="icon">${getIcon('save')}</span>
        儲存
      </button>
    </div>
  `);
  setTimeout(initIcons, 10);
}

function addAttachRow(listId){
  const name = document.getElementById('kcAttachName').value.trim();
  const url = document.getElementById('kcAttachUrl').value.trim();
  if(!name||!url){ toast('請輸入名稱與連結'); return; }
  const list = document.getElementById(listId);
  const row = document.createElement('div');
  row.className='attach-item';
  row.innerHTML = `<a href="${url}" target="_blank">${escapeHTML(name)}</a><button class="btn-ghost btn-icon btn-sm" onclick="this.parentElement.remove()"><span class="icon">${getIcon('x')}</span></button>`;
  list.appendChild(row);
  document.getElementById('kcAttachName').value=''; document.getElementById('kcAttachUrl').value='';
  setTimeout(initIcons, 10);
}

function readAttachList(listId){
  return Array.from(document.getElementById(listId).querySelectorAll('.attach-item')).map(el=>({name: el.querySelector('a').textContent, url: el.querySelector('a').getAttribute('href')}));
}

function saveKcard(pId,dId,cardId){
  const p = DB.projects.find(x=>x.id===pId); const d = p.docs.find(x=>x.id===dId);
  const title = document.getElementById('kcTitle').value.trim();
  if(!title){ toast('請輸入標題'); return; }
  const payload = {
    title, col: document.getElementById('kcCol').value,
    assignee: document.getElementById('kcAssignee').value,
    due: document.getElementById('kcDue').value,
    note: document.getElementById('kcNote').value,
    attachments: readAttachList('kcAttachList'),
  };
  if(cardId){ Object.assign(d.cards.find(x=>x.id===cardId), payload); }
  else { d.cards.push({id:uid(), ...payload}); }
  persist(); closeModal(); render();
}

function deleteKcard(pId,dId,cardId){
  const p = DB.projects.find(x=>x.id===pId); const d = p.docs.find(x=>x.id===dId);
  d.cards = d.cards.filter(x=>x.id!==cardId);
  persist(); closeModal(); render();
}