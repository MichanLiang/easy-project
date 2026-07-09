/* ================= GANTT ================= */
function renderGantt(p,d){
  if(d.tasks.length===0){
    return `
    <div class="empty">
      <div class="big"><span class="icon" style="font-size:48px;">${getIcon('barChart')}</span></div>
      還沒有任何任務
      <br>
      <button class="btn btn-primary" style="margin-top:16px" onclick="openGanttTaskModal('${p.id}','${d.id}')">
        <span class="icon">${getIcon('plus')}</span>
        新增任務
      </button>
    </div>`;
  }
  
  const allDates = d.tasks.flatMap(t=>[new Date(t.start), new Date(t.end)]);
  let minD = new Date(Math.min(...allDates)); let maxD = new Date(Math.max(...allDates));
  minD.setDate(minD.getDate()-1); maxD.setDate(maxD.getDate()+2);
  const totalDays = Math.max(1, Math.round((maxD-minD)/86400000));
  const dayWidth = Math.max(24, Math.min(46, Math.floor(900/totalDays)));
  const days = [];
  for(let i=0;i<totalDays;i++){ const dt=new Date(minD); dt.setDate(dt.getDate()+i); days.push(dt); }
  
  return `
  <div style="margin-bottom:14px;">
    <button class="btn btn-primary btn-sm" onclick="openGanttTaskModal('${p.id}','${d.id}')">
      <span class="icon">${getIcon('plus')}</span>
      新增任務
    </button>
  </div>
  <div class="gantt-wrap">
    <table class="gantt" style="min-width:${150+totalDays*dayWidth}px">
      <thead>
        <tr>
          <th style="min-width:150px;position:sticky;left:0;background:#fff;">任務</th>
          ${days.map(dt=>`<th style="width:${dayWidth}px">${dt.getMonth()+1}/${dt.getDate()}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${d.tasks.map(t=>{
          const startOffset = Math.round((new Date(t.start)-minD)/86400000);
          const span = Math.max(1, Math.round((new Date(t.end)-new Date(t.start))/86400000));
          return `<tr onclick="openGanttTaskModal('${p.id}','${d.id}','${t.id}')" style="cursor:pointer">
            <td class="namecell">${escapeHTML(t.title)}</td>
            <td colspan="${totalDays}" style="position:relative;padding:0;">
              <div class="gantt-bar" style="left:${startOffset*dayWidth}px;width:${span*dayWidth-4}px;background:${t.color||'#C4A882'}"></div>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>`;
}

const GANTT_COLORS = ['#C4A4A4','#9AABB8','#A8B5A0','#B8A9C9','#C9B896','#C4A882'];

function openGanttTaskModal(pId,dId,taskId){
  const p=DB.projects.find(x=>x.id===pId); const d=p.docs.find(x=>x.id===dId);
  const t = taskId ? d.tasks.find(x=>x.id===taskId) : {id:null,title:'',start:todayStr(),end:todayStr(),color:GANTT_COLORS[d.tasks.length%GANTT_COLORS.length]};
  openModal(`
    <div class="modal-head"><h3>${taskId?'編輯任務':'新增任務'}</h3></div>
    <div class="modal-body">
      <div class="field"><label>任務名稱</label><input type="text" id="gtTitle" value="${escapeHTML(t.title)}"></div>
      <div class="field-row">
        <div class="field"><label>開始日期</label><input type="date" id="gtStart" value="${t.start}"></div>
        <div class="field"><label>結束日期</label><input type="date" id="gtEnd" value="${t.end}"></div>
      </div>
      <div class="field"><label>顏色</label>
        <div class="chip-row">${GANTT_COLORS.map(c=>`<div onclick="selectColor(this,'${c}')" data-c="${c}" style="width:32px;height:32px;border-radius:50%;background:${c};cursor:pointer;border:3px solid ${c===t.color?'var(--ink)':'transparent'};transition:all 0.15s;"></div>`).join('')}</div>
        <input type="hidden" id="gtColor" value="${t.color}">
      </div>
    </div>
    <div class="modal-foot">
      ${taskId?`<button class="btn btn-danger" onclick="deleteGanttTask('${pId}','${dId}','${taskId}')">
        <span class="icon">${getIcon('trash')}</span>
        刪除
      </button>`:''}
      <div style="flex:1"></div>
      <button class="btn" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="saveGanttTask('${pId}','${dId}','${taskId||''}')">
        <span class="icon">${getIcon('save')}</span>
        儲存
      </button>
    </div>
  `);
  setTimeout(initIcons, 10);
}

function selectColor(el,c){ 
  document.getElementById('gtColor').value=c; 
  document.querySelectorAll('#modalOverlay .chip-row > div').forEach(x=>x.style.border='3px solid transparent'); 
  el.style.border='3px solid var(--ink)'; 
}

function saveGanttTask(pId,dId,taskId){
  const p=DB.projects.find(x=>x.id===pId); const d=p.docs.find(x=>x.id===dId);
  const title = document.getElementById('gtTitle').value.trim();
  if(!title){ toast('請輸入任務名稱'); return; }
  const payload = {title, start:document.getElementById('gtStart').value, end:document.getElementById('gtEnd').value, color:document.getElementById('gtColor').value};
  if(payload.end < payload.start) payload.end = payload.start;
  if(taskId){ Object.assign(d.tasks.find(x=>x.id===taskId), payload); }
  else { d.tasks.push({id:uid(), ...payload}); }
  persist(); closeModal(); render();
}

function deleteGanttTask(pId,dId,taskId){
  const p=DB.projects.find(x=>x.id===pId); const d=p.docs.find(x=>x.id===dId);
  d.tasks = d.tasks.filter(x=>x.id!==taskId);
  persist(); closeModal(); render();
}