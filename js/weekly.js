/* ================= 本週計畫 ================= */
function getWeekRange(offset){
  const now = new Date();
  const dayOfWeek = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek + 1 + (offset || 0) * 7);
  monday.setHours(0,0,0,0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    weekStart: monday.toISOString().slice(0,10),
    weekEnd: sunday.toISOString().slice(0,10),
    monday: new Date(monday)
  };
}

function changeWeek(offset){
  state.calWeekOffset = (state.calWeekOffset || 0) + offset;
  render();
}

function viewWeekly(){
  if(state.calWeekOffset === undefined) state.calWeekOffset = 0;
  const {weekStart, weekEnd, monday} = getWeekRange(state.calWeekOffset);
  const today = new Date().toISOString().slice(0,10);

  const items = [];

  DB.todos.forEach(t => {
    if(t.date && t.date >= weekStart && t.date <= weekEnd && t.status !== 'done'){
      items.push({type:'todo', date:t.date, title:t.title, status:t.status, data:t, id:t.id});
    }
  });

  DB.projects.forEach(p => {
    p.docs.forEach(d => {
      if(d.type === 'kanban'){
        (d.cards||[]).forEach(c => {
          if(c.due && c.due >= weekStart && c.due <= weekEnd){
            items.push({type:'kanban', date:c.due, title:c.title, status:c.col, data:c, projectId:p.id, docId:d.id, id:c.id});
          }
        });
      }
      if(d.type === 'gantt'){
        (d.tasks||[]).forEach(t => {
          if(t.end && t.end >= weekStart && t.start <= weekEnd){
            items.push({type:'gantt', date:t.start, title:t.title, status:'', data:t, projectId:p.id, docId:d.id, id:t.id, end:t.end});
          }
        });
      }
    });
  });

  DB.meetings.forEach(m => {
    if(m.date && m.date >= weekStart && m.date <= weekEnd){
      items.push({type:'meeting', date:m.date, title:m.title || m.name || '速記', status:'', data:m, id:m.id});
    }
  });

  items.sort((a,b) => a.date.localeCompare(b.date));

  const dayNames = ['週一','週二','週三','週四','週五','週六','週日'];
  const days = [];
  for(let i = 0; i < 7; i++){
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().slice(0,10);
    const isToday = dateStr === today;
    days.push({dateStr, dayName:dayNames[i], isToday, dayItems: items.filter(it => it.date === dateStr)});
  }

  const typeIcons = {todo:'checkSquare', kanban:'kanban', gantt:'barChart', meeting:'fileText'};
  const typeColors = {todo:'#C4A4A4', kanban:'#A8B5A0', gantt:'#B8A9C9', meeting:'#C2B5B5'};
  const typeLabels = {todo:'待辦', kanban:'看板', gantt:'甘特', meeting:'會議'};

  return `
    <div class="page-title">本週計畫</div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
      <button class="btn btn-sm" onclick="changeWeek(-1)"><span class="icon">${getIcon('chevronLeft')}</span> 上週</button>
      <span style="font-size:13px;font-weight:600;">${weekStart} ~ ${weekEnd}</span>
      <button class="btn btn-sm" onclick="changeWeek(1)">下週 <span class="icon">${getIcon('chevronRight')}</span></button>
      ${state.calWeekOffset !== 0 ? '<button class="btn btn-sm" onclick="state.calWeekOffset=0;render();">回到本週</button>' : ''}
      <span style="font-size:12px;color:var(--ink-faint);">共 ${items.length} 項任務</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:16px;">
      ${days.map(day => `
        <div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span style="font-size:13px;font-weight:700;color:${day.isToday ? 'var(--accent)' : 'var(--ink-faint)'}">${day.dayName} ${day.dateStr.slice(5)}</span>
            ${day.isToday ? '<span class="tag" style="font-size:10px;padding:1px 6px;background:var(--accent-soft);color:var(--accent);">今天</span>' : ''}
            <span style="font-size:11px;color:var(--ink-faint);">(${day.dayItems.length})</span>
          </div>
          <div class="card" style="margin:0;">
            ${day.dayItems.length ? day.dayItems.map(it => `
              <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--line);">
                <span class="icon" style="width:14px;height:14px;color:${typeColors[it.type]}">${getIcon(typeIcons[it.type])}</span>
                <span style="font-size:12px;color:${typeColors[it.type]};min-width:32px;">${typeLabels[it.type]}</span>
                <span style="flex:1;font-size:13px;">${escapeHTML(it.title)}</span>
                ${it.status ? `<span style="font-size:11px;color:var(--ink-faint);">${it.status}</span>` : ''}
                ${it.end ? `<span style="font-size:11px;color:var(--ink-faint);">~${it.end.slice(5)}</span>` : ''}
              </div>
            `).join('') : '<div style="padding:12px;text-align:center;color:var(--ink-faint);font-size:12px;">這天沒有任務</div>'}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
