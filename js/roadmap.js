/* ================= ROADMAP ================= */
function renderRoadmap(p,d){
  return `
  <div style="margin-bottom:16px;">
    <button class="btn btn-primary btn-sm" onclick="addRoadmapPhase('${p.id}','${d.id}')">
      <span class="icon">${getIcon('plus')}</span>
      新增階段
    </button>
  </div>
  <div class="roadmap">
    ${d.phases.map((ph,pi)=>`
      <div class="rphase">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <h4 contenteditable="true" onblur="updateRoadmapField('${p.id}','${d.id}',${pi},'title',this.textContent)">${escapeHTML(ph.title)}</h4>
            <div class="period" contenteditable="true" onblur="updateRoadmapField('${p.id}','${d.id}',${pi},'period',this.textContent)">${escapeHTML(ph.period)}</div>
          </div>
          <button class="btn-ghost btn-icon btn-sm" onclick="removeRoadmapPhase('${p.id}','${d.id}',${pi})">
            <span class="icon">${getIcon('x')}</span>
          </button>
        </div>
        ${ph.items.map((it,ii)=>`<div class="ritem" contenteditable="true" onblur="updateRoadmapItem('${p.id}','${d.id}',${pi},${ii},this.textContent)">${escapeHTML(it)}</div>`).join('')}
        <button class="btn btn-sm" style="width:100%;margin-top:8px;" onclick="addRoadmapItem('${p.id}','${d.id}',${pi})">
          <span class="icon">${getIcon('plus')}</span>
          項目
        </button>
      </div>`).join('')}
  </div>`;
}

function addRoadmapPhase(pId,dId){
  const p=DB.projects.find(x=>x.id===pId); const d=p.docs.find(x=>x.id===dId);
  d.phases.push({id:uid(), title:'新階段', period:'', items:[]});
  persist(); render();
}

function removeRoadmapPhase(pId,dId,pi){
  const p=DB.projects.find(x=>x.id===pId); const d=p.docs.find(x=>x.id===dId);
  d.phases.splice(pi,1);
  syncProjectAfterChange(pId);
  persist(); render();
}

function updateRoadmapField(pId,dId,pi,field,val){
  const p=DB.projects.find(x=>x.id===pId); const d=p.docs.find(x=>x.id===dId);
  d.phases[pi][field]=val.trim(); persist();
}

function addRoadmapItem(pId,dId,pi){
  const p=DB.projects.find(x=>x.id===pId); const d=p.docs.find(x=>x.id===dId);
  d.phases[pi].items.push(''); persist(); render();
}

function updateRoadmapItem(pId,dId,pi,ii,val){
  const p=DB.projects.find(x=>x.id===pId); const d=p.docs.find(x=>x.id===dId);
  d.phases[pi].items[ii]=val.trim(); persist();
}