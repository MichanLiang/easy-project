/* ================= MEETINGS ================= */
function renderMeetingDoc(p,d){
  // attendees could be old format (names) or new format (IDs); normalize to IDs
  const raw = (d.attendees || '').split(',').map(s=>s.trim()).filter(Boolean);
  const attendeeIds = raw.map(r => {
    const m = DB.members.find(x => x.id === r);
    return m ? m.id : r; // if it's an ID, keep it; if it's an old name, try to find by name
  }).filter(Boolean);
  // also handle legacy name-based entries
  const attendeeNames = raw.filter(r => !DB.members.find(x => x.id === r));
  
  const memberCheckboxes = DB.members
    .filter(m => p.memberIds.includes(m.id))
    .map(m => {
      const isChecked = attendeeIds.includes(m.id) || attendeeNames.includes(m.name);
      return `<label class="attendee-chip ${isChecked?'on':''}" data-id="${m.id}" onclick="toggleMeetingAttendee(this,'${p.id}','${d.id}')" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:16px;font-size:13px;border:2px solid ${isChecked?'var(--accent)':'var(--line)'};margin:2px;background:${isChecked?'var(--accent-soft)':'transparent'};transition:all 0.15s;">
      ${avatarHTML(m.id, 18)} ${escapeHTML(memberName(m.id))}
    </label>`;
    }).join('');
  
  return `
  <div class="card" style="padding:24px;max-width:720px;">
    <div class="field">
      <label>日期</label>
      <input type="date" value="${d.date||''}" oninput="updateMeetingField('${p.id}','${d.id}','date',this.value)">
    </div>
    <div class="field">
      <label>出席人員</label>
      <div id="attendeeList-${p.id}-${d.id}" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">
        ${memberCheckboxes || '<span style="color:var(--ink-faint);font-size:13px;">此專案還沒有成員</span>'}
      </div>
    </div>
    <div class="field">
      <label>會議內容</label>
      <textarea style="min-height:280px" placeholder="記錄會議重點、決議事項…" oninput="updateMeetingField('${p.id}','${d.id}','content',this.value)">${escapeHTML(d.content||'')}</textarea>
    </div>
  </div>`;
}

function toggleMeetingAttendee(el, pId, dId){
  const p=DB.projects.find(x=>x.id===pId); if(!p) return;
  const d=p.docs.find(x=>x.id===dId); if(!d) return;
  
  el.classList.toggle('on');
  const isOn = el.classList.contains('on');
  const memberId = el.dataset.id;
  
  // 更新樣式
  el.style.border = `2px solid ${isOn ? 'var(--accent)' : 'var(--line)'}`;
  el.style.background = isOn ? 'var(--accent-soft)' : 'transparent';
  
  // 收集所有已選取的人員 (store IDs)
  const container = document.getElementById(`attendeeList-${pId}-${dId}`);
  const checked = Array.from(container.querySelectorAll('.attendee-chip.on')).map(chip=>chip.dataset.id);
  d.attendees = checked.join(', ');
  persist();
}

function updateMeetingField(pId,dId,field,val){
  const p=DB.projects.find(x=>x.id===pId); 
  if(!p) return;
  const d=p.docs.find(x=>x.id===dId);
  if(!d) return;
  d[field]=val; 
  persist();
  syncProjectAfterChange(pId);
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

  if(state.calWeekOffset === undefined) state.calWeekOffset = 0;
  const {weekStart, weekEnd, monday} = getWeekRange(state.calWeekOffset);
  const today = new Date().toISOString().slice(0,10);

  const dayNames = ['一','二','三','四','五','六','日'];
  const weekDays = [];
  for(let i = 0; i < 7; i++){
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().slice(0,10);
    const isToday = dateStr === today;
    const dayMeetings = all.filter(m => m.date === dateStr);
    weekDays.push({dateStr, dayName:dayNames[i], isToday, meetings:dayMeetings});
  }
  
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
    <button class="btn btn-primary btn-sm" onclick="openStandaloneMeetingModal()">
      <span class="icon">${getIcon('plus')}</span>
      新增速記
    </button>
  </div>

  <!-- 本週曆 -->
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
    <button class="btn btn-sm" onclick="changeWeek(-1)"><span class="icon">${getIcon('chevronLeft')}</span> 上週</button>
    <span style="font-size:13px;font-weight:600;">${weekStart} ~ ${weekEnd}</span>
    <button class="btn btn-sm" onclick="changeWeek(1)">下週 <span class="icon">${getIcon('chevronRight')}</span></button>
    ${state.calWeekOffset !== 0 ? '<button class="btn btn-sm" onclick="state.calWeekOffset=0;render();">回到本週</button>' : ''}
  </div>
  <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;margin-bottom:20px;">
    <div style="display:flex;gap:0;min-width:700px;">
      ${weekDays.map(day => `
        <div style="flex:1;min-width:100px;border:1px solid var(--line);border-radius:8px;overflow:hidden;${day.isToday ? 'border-color:var(--accent);box-shadow:0 0 0 1px var(--accent);' : ''}">
          <div style="padding:8px 10px;background:${day.isToday ? 'var(--accent-soft)' : 'var(--bg-subtle)'};border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:12px;font-weight:700;color:${day.isToday ? 'var(--accent)' : 'var(--ink-faint)'}">週${day.dayName}</span>
            <span style="font-size:11px;color:var(--ink-faint);">${day.dateStr.slice(5)}</span>
          </div>
          <div style="padding:6px;min-height:60px;">
            ${day.meetings.map(m => {
              const click = m.projectId
                ? `go('project',{projectId:'${m.projectId}',docId:'${m.id}'})`
                : `openStandaloneMeetingModal('${m.id}')`;
              return `<div onclick="${click}" style="padding:4px 6px;margin-bottom:4px;border-radius:4px;background:var(--accent-soft);cursor:pointer;font-size:11px;color:var(--accent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHTML(m.name || m.title || '速記')}</div>`;
            }).join('')}
            <div onclick="openStandaloneMeetingModal(null,'${day.dateStr}')" style="padding:4px 6px;border-radius:4px;border:1px dashed var(--line);cursor:pointer;font-size:11px;color:var(--ink-faint);text-align:center;">+ 新增</div>
          </div>
        </div>
      `).join('')}
    </div>
  </div>

  <div class="card">
    ${listHTML}
  </div>`;
}

function openStandaloneMeetingModal(meetingId, prefillDate){
  const meeting = meetingId ? DB.meetings.find(m => m.id === meetingId) : null;
  const isEdit = !!meeting;
  
  openModal(`
    <div class="modal-head"><h3>${isEdit ? '編輯速記' : '新增速記'}</h3></div>
    <div class="modal-body">
      <div class="field"><label>標題</label><input type="text" id="smTitle" value="${escapeHTML(meeting?.title || '')}" placeholder="會議或速記標題"></div>
      <div class="field-row">
        <div class="field"><label>日期</label><input type="date" id="smDate" value="${meeting?.date || prefillDate || todayStr()}"></div>
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
  const m = DB.meetings.find(x=>x.id===id);
  DB.meetings = DB.meetings.filter(x => x.id !== id);
  if(m) trashItem('meeting', m);
  render();
}