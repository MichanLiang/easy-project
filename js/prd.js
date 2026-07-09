/* ================= PRD ================= */
function renderPRD(p,d){
  return `
  <div class="card" style="padding:28px;max-width:780px;">
    <div class="prd-block">
      <div class="lab">
        <span class="icon" style="width:12px;height:12px;">${getIcon('target')}</span>
        目標
      </div>
      <textarea class="field" style="width:100%;border:1px solid var(--line);border-radius:var(--radius);padding:12px;font-size:14px;" oninput="updatePrdField('${p.id}','${d.id}','goal',this.value)" placeholder="這個專案要達成什麼？">${escapeHTML(d.goal)}</textarea>
    </div>
    <div class="prd-block">
      <div class="lab">
        <span class="icon" style="width:12px;height:12px;">${getIcon('compass')}</span>
        背景
      </div>
      <textarea style="width:100%;border:1px solid var(--line);border-radius:var(--radius);padding:12px;font-size:14px;" oninput="updatePrdField('${p.id}','${d.id}','background',this.value)" placeholder="為什麼要做這個？現況與痛點是什麼？">${escapeHTML(d.background)}</textarea>
    </div>
    <div class="prd-block">
      <div class="lab">
        <span class="icon" style="width:12px;height:12px;">${getIcon('star')}</span>
        價值
      </div>
      <textarea style="width:100%;border:1px solid var(--line);border-radius:var(--radius);padding:12px;font-size:14px;" oninput="updatePrdField('${p.id}','${d.id}','value',this.value)" placeholder="這個功能／產品能帶來什麼價值？">${escapeHTML(d.value)}</textarea>
    </div>
    <div class="prd-block">
      <div class="lab">
        <span class="icon" style="width:12px;height:12px;">${getIcon('clipboard')}</span>
        功能清單
      </div>
      <div class="feat-list" id="featList">
        ${d.features.map((f,i)=>`
          <div class="feat-row">
            <span style="color:var(--ink-faint)">•</span>
            <input type="text" value="${escapeHTML(f)}" oninput="updatePrdFeature('${p.id}','${d.id}',${i},this.value)" placeholder="功能描述">
            <button class="btn-ghost btn-icon btn-sm" onclick="removePrdFeature('${p.id}','${d.id}',${i})">
              <span class="icon">${getIcon('x')}</span>
            </button>
          </div>`).join('')}
      </div>
      <button class="btn btn-sm" style="margin-top:12px;" onclick="addPrdFeature('${p.id}','${d.id}')">
        <span class="icon">${getIcon('plus')}</span>
        新增功能項目
      </button>
    </div>
  </div>`;
}

function updatePrdField(pId,dId,field,val){
  const p=DB.projects.find(x=>x.id===pId); const d=p.docs.find(x=>x.id===dId);
  d[field]=val; persist();
}

function updatePrdFeature(pId,dId,idx,val){
  const p=DB.projects.find(x=>x.id===pId); const d=p.docs.find(x=>x.id===dId);
  d.features[idx]=val; persist();
}

function addPrdFeature(pId,dId){
  const p=DB.projects.find(x=>x.id===pId); const d=p.docs.find(x=>x.id===dId);
  d.features.push(''); persist(); render();
}

function removePrdFeature(pId,dId,idx){
  const p=DB.projects.find(x=>x.id===pId); const d=p.docs.find(x=>x.id===dId);
  d.features.splice(idx,1); if(d.features.length===0) d.features.push('');
  persist(); render();
}