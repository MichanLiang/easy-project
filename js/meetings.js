/* ================= MEETINGS ================= */
function renderMeetingDoc(p,d){
  return `
  <div class="card" style="padding:24px;max-width:720px;">
    <div class="field-row">
      <div class="field">
        <label>日期</label>
        <input type="date" value="${d.date||''}" oninput="updateMeetingField('${p.id}','${d.id}','date',this.value)">
      </div>
      <div class="field">
        <label>出席人員</label>
        <input type="text" value="${escapeHTML(d.attendees||'')}" placeholder="例如：我、陳品心" oninput="updateMeetingField('${p.id}','${d.id}','attendees',this.value)">
      </div>
    </div>
    <div class="field">
      <label>會議內容</label>
      <textarea style="min-height:280px" placeholder="記錄會議重點、決議事項…" oninput="updateMeetingField('${p.id}','${d.id}','content',this.value)">${escapeHTML(d.content||'')}</textarea>
    </div>
  </div>`;
}

function updateMeetingField(pId,dId,field,val){
  const p=DB.projects.find(x=>x.id===pId); 
  if(!p) return;
  const d=p.docs.find(x=>x.id===dId);
  if(!d) return;
  d[field]=val; 
  persist();
}

function viewMeetingsGlobal(){
  if(!DB.meetings) DB.meetings = [];
  
  const projMeetings = [];
  DB.projects.forEach(p => {
    if(p.docs) {
      p.docs.filter(d => d.type === 'meeting').forEach(d => {
        projMeetings.push({...d, projectId: p.id, projectName: p.name});
      });
    }
  });
  
  const standalone = DB.meetings;
  const all = [...standalone.map(m => ({...m, projectName: null})), ...projMeetings];
  all.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  
  setTimeout(initIcons, 10);
  
  let listHTML = '';
  if(all.length) {
    listHTML = all.map(m => {
      const clickAction = m.projectId 
        ? `go('project',{projectId:'${m.projectId}',docId:'${m.id}'})` 
        : `openStandaloneMeetingModal('${m.id}')`;
      const deleteBtn = !m.projectId 
        ? `<button class="btn-ghost btn-icon btn-sm" onclick="event.stopPropagation();deleteStandaloneMeeting('${m.id}')"><span class="icon">${getIcon('x')}</span></button>` 
        : '';
      
      return `
      <div class="meeting-item" style="cursor:pointer" onclick="${clickAction}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div class="mt">${escapeHTML(m.name || m.title || '速記')}</div>
          ${deleteBtn}
        </div>
        <div class="mm" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span style="display:flex;align-items:center;gap:4px;">
            <span class="icon" style="width:12px;height:12px;">${getIcon('clock')}</span>
            ${m.date || ''}
          </span>
          ${m.attendees ? `<span style="display:flex;align-items:center;gap:4px;">
            <span class="icon" style="width:12px;height:12px;">${getIcon('users')}</span>
            ${escapeHTML(m.attendees)}
          </span>` : ''}
          <span style="display:flex;align-items:center;gap:4px;">
            <span class="icon" style="width:12px;height:12px;">${getIcon('folder')}</span>
            ${m.projectName ? escapeHTML(m.projectName) : '獨立速記'}
          </span>
        </div>
        <div class="mc">${escapeHTML((m.content || '').slice(0, 140))}${(m.content || '').length > 140 ? '…' : ''}</div>
      </div>`;
    }).join('');
  } else {
    listHTML = `<div class="empty">還沒有任何會議記錄</div>`;
  }
  
  return `
  <div style="display:flex;justify-content:space-between;align-items:flex-start;">
    <div>
      <div class="page-title">會議記錄</div>
      <div class="page-sub">可隸屬於各專案，也可以獨立記錄速記</div>
    </div>
    <button class="btn btn-primary" onclick="openStandaloneMeetingModal()">
      <span class="icon">${getIcon('plus')}</span>
      新增速記
    </button>
  </div>
  <div class="card">
    ${listHTML}
  </div>`;
}

function openStandaloneMeetingModal(meetingId){
  const meeting = meetingId ? DB.meetings.find(m => m.id === meetingId) : null;
  const isEdit = !!meeting;
  
  openModal(`
    <div class="modal-head"><h3>${isEdit ? '編輯速記' : '新增速記'}</h3></div>
    <div class="modal-body">
      <div class="field"><label>標題</label><input type="text" id="smTitle" value="${escapeHTML(meeting?.title || '')}" placeholder="會議或速記標題"></div>
      <div class="field-row">
        <div class="field"><label>日期</label><input type="date" id="smDate" value="${meeting?.date || todayStr()}"></div>
        <div class="field"><label>出席人員</label><input type="text" id="smAttendees" value="${escapeHTML(meeting?.attendees || '')}" placeholder="選填"></div>
      </div>
      <div class="field"><label>內容</label><textarea id="smContent" style="min-height:180px" placeholder="快速記下重點…">${escapeHTML(meeting?.content || '')}</textarea></div>
    </div>
    <div class="modal-foot">
      ${isEdit ? `<button class="btn btn-danger" onclick="deleteStandaloneMeeting('${meetingId}');closeModal();">
        <span class="icon">${getIcon('trash')}</span>
        刪除
      </button>` : ''}
      <div style="flex:1"></div>
      <button class="btn" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="saveStandaloneMeeting('${meetingId || ''}')">
        <span class="icon">${getIcon('save')}</span>
        儲存
      </button>
    </div>
  `);
  setTimeout(initIcons, 10);
}

function saveStandaloneMeeting(meetingId){
  const title = document.getElementById('smTitle').value.trim();
  if(!title){ toast('請輸入標題'); return; }
  
  if(!DB.meetings) DB.meetings = [];
  
  const payload = {
    title,
    date: document.getElementById('smDate').value,
    attendees: document.getElementById('smAttendees').value,
    content: document.getElementById('smContent').value
  };
  
  if(meetingId){
    const meeting = DB.meetings.find(m => m.id === meetingId);
    if(meeting) Object.assign(meeting, payload);
  } else {
    DB.meetings.push({id: uid(), ...payload});
  }
  
  persist(); closeModal(); render();
}

function deleteStandaloneMeeting(id){
  if(!DB.meetings) DB.meetings = [];
  DB.meetings = DB.meetings.filter(x => x.id !== id);
  persist(); render();
}