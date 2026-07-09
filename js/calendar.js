/* ================= CALENDAR ================= */
const WEEKDAYS = ['日','一','二','三','四','五','六'];

function viewCalendar(){
  const y = state.calYear, m = state.calMonth;
  const first = new Date(y,m,1);
  const startDow = first.getDay();
  const daysInMonth = new Date(y,m+1,0).getDate();
  const prevDays = new Date(y,m,0).getDate();
  const cells = [];
  for(let i=0;i<startDow;i++) cells.push({day: prevDays-startDow+1+i, other:true});
  for(let i=1;i<=daysInMonth;i++) cells.push({day:i, other:false});
  while(cells.length%7!==0 || cells.length<42) cells.push({day: cells.length - startDow - daysInMonth + 1, other:true});
  const monthTodos = DB.todos.filter(t=>t.date);
  const todayISO = todayStr();
  
  setTimeout(initIcons, 10);
  
  return `
  <div class="page-title">行事曆</div>
  <div class="page-sub">檢視所有帶有日期的待辦事項</div>
  <div class="cal-head">
    <button class="btn btn-sm" onclick="calNav(-1)">
      <span class="icon">${getIcon('chevronLeft')}</span>
      上個月
    </button>
    <div style="font-family:var(--font-display);font-weight:700;font-size:18px;min-width:120px;text-align:center;">
      ${y} 年 ${m+1} 月
    </div>
    <button class="btn btn-sm" onclick="calNav(1)">
      下個月
      <span class="icon">${getIcon('chevronRight')}</span>
    </button>
    <button class="btn btn-sm" onclick="calToday()">
      <span class="icon">${getIcon('refresh')}</span>
      回到今天
    </button>
  </div>
  <div class="cal-grid">
    ${WEEKDAYS.map(w=>`<div class="cal-dow">${w}</div>`).join('')}
    ${cells.map(c=>{
      const iso = c.other? '' : `${y}-${String(m+1).padStart(2,'0')}-${String(c.day).padStart(2,'0')}`;
      const items = iso ? monthTodos.filter(t=>t.date===iso) : [];
      const isToday = iso===todayISO;
      return `<div class="cal-cell ${c.other?'other':''} ${isToday?'today':''}">
        <div class="dnum">${c.day}</div>
        ${items.map(t=>`<div class="cal-item" onclick="openTodoModal('${t.id}')" title="${escapeHTML(t.title)}">${escapeHTML(t.title)}</div>`).join('')}
      </div>`;
    }).join('')}
  </div>`;
}

function calNav(dir){
  state.calMonth += dir;
  if(state.calMonth<0){ state.calMonth=11; state.calYear--; }
  if(state.calMonth>11){ state.calMonth=0; state.calYear++; }
  render();
}

function calToday(){ 
  const n=new Date(); 
  state.calMonth=n.getMonth(); 
  state.calYear=n.getFullYear(); 
  render(); 
}