/* ================= WIREFRAME BOARD ================= */
const WF_SHAPES = [
  {shape:'rect', label:'方形區塊', icon:'square'},
  {shape:'square', label:'正方形', icon:'square'},
  {shape:'circle', label:'圓形', icon:'circle'},
  {shape:'button', label:'按鈕', icon:'zap'},
  {shape:'text', label:'文字', icon:'fileText'},
];

const WF_COLORS = ['#F8F9FC','#C4A4A4','#9AABB8','#A8B5A0','#B8A9C9','#C9B896','#C4A882','#D4C5B9'];

function renderWireframe(p,d){
  return `
  <div class="board-toolbar">
    ${WF_SHAPES.map(s=>`<button class="btn btn-sm" onclick="addWFElement('${p.id}','${d.id}','${s.shape}')">
      <span class="icon">${getIcon(s.icon)}</span>
      ${s.label}
    </button>`).join('')}
    <span style="border-left:1px solid var(--line);margin:0 4px;height:24px;"></span>
    <button class="btn btn-sm" onclick="copyWFElement()">
      <span class="icon">${getIcon('copy')}</span>
      複製
    </button>
    <button class="btn btn-sm" onclick="pasteWFElement('${p.id}','${d.id}')">
      <span class="icon">${getIcon('clipboard')}</span>
      貼上
    </button>
    <button class="btn btn-sm" onclick="exportWireframe('${d.id}')">
      <span class="icon">${getIcon('download')}</span>
      存成圖片
    </button>
    <button class="btn btn-sm" onclick="shareWireframe('${p.id}','${d.id}')">
      <span class="icon">${getIcon('share')}</span>
      分享
    </button>
  </div>
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
    <span style="font-size:12px;color:var(--ink-faint);">選取顏色：</span>
    ${WF_COLORS.map(c=>`<div onclick="setWFColor('${c}')" style="width:24px;height:24px;border-radius:50%;background:${c};cursor:pointer;border:2px solid var(--line);transition:all 0.15s;" onmouseenter="this.style.transform='scale(1.2)'" onmouseleave="this.style.transform='scale(1)'"></div>`).join('')}
  </div>
  <div class="board-wrap" style="height:520px;">
    <div class="board-canvas" id="wfCanvas" data-pid="${p.id}" data-did="${d.id}" style="width:1100px;height:900px;background:#fff;">
      ${d.elements.map(el=>renderWFElement(el)).join('')}
    </div>
  </div>`;
}

function wfShapeStyle(el){
  const bgColor = el.color || '#F8F9FC';
  const base = `background:${bgColor};border:2px solid var(--ink-muted);display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--ink-soft);font-weight:600;`;
  if(el.shape==='circle') return base+'border-radius:50%;';
  if(el.shape==='button') return base+'border-radius:24px;background:linear-gradient(135deg,var(--accent) 0%,var(--accent-light) 100%);color:#fff;border-color:transparent;font-weight:700;box-shadow:0 2px 8px var(--accent-glow);';
  if(el.shape==='text') return 'border:1px dashed var(--ink-muted);display:flex;align-items:center;padding-left:8px;font-size:14px;color:var(--ink-soft);';
  return base+'border-radius:var(--radius);';
}

function renderWFElement(el){
  return `
  <div class="wf-el ${wfSelected===el.id?'wf-selected':''}" id="wfel-${el.id}" data-id="${el.id}" style="left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;${wfShapeStyle(el)}" onclick="event.stopPropagation();selectWFElement('${el.id}')">
    <span contenteditable="true" onmousedown="event.stopPropagation()" onblur="updateWFText('${el.id}',this.textContent)" style="outline:none;width:100%;text-align:center;">${escapeHTML(el.text||'')}</span>
    <div class="del" onmousedown="event.stopPropagation()" onclick="deleteWFElement('${el.id}')">
      <span class="icon" style="width:10px;height:10px;">${getIcon('x')}</span>
    </div>
    <div class="resize" onmousedown="event.stopPropagation();startWFResize(event,'${el.id}')"></div>
  </div>`;
}

let wfState = null;
let wfSelected = null;
let wfClipboard = null;

function selectWFElement(id){
  wfSelected = id;
  render();
}

function setWFColor(color){
  if(!wfSelected) { toast('請先點選一個元素'); return; }
  for(const p of DB.projects) for(const d of p.docs) if(d.type==='wireframe'){
    const el = d.elements.find(x=>x.id===wfSelected);
    if(el){ el.color = color; persist(); render(); return; }
  }
}

function copyWFElement(){
  if(!wfSelected) { toast('請先點選一個元素'); return; }
  for(const p of DB.projects) for(const d of p.docs) if(d.type==='wireframe'){
    const el = d.elements.find(x=>x.id===wfSelected);
    if(el){ wfClipboard = {...el}; toast('已複製'); return; }
  }
}

function pasteWFElement(pId,dId){
  if(!wfClipboard) { toast('沒有可貼上的元素'); return; }
  const p=DB.projects.find(x=>x.id===pId); const d=p.docs.find(x=>x.id===dId);
  const newEl = {...wfClipboard, id:uid(), x:wfClipboard.x+20, y:wfClipboard.y+20};
  d.elements.push(newEl);
  wfSelected = newEl.id;
  persist(); render();
}

function initWireframeBoard(d){
  const canvas = document.getElementById('wfCanvas');
  if(!canvas) return;
  const pid = canvas.dataset.pid, did = canvas.dataset.did;
  wfState = {pid, did, drag:null, resize:null};
  canvas.querySelectorAll('.wf-el').forEach(elDiv=>{
    elDiv.addEventListener('mousedown', (e)=>{
      if(e.target.closest('.del')||e.target.closest('.resize')) return;
      const rect = canvas.getBoundingClientRect();
      wfState.drag = {id: elDiv.dataset.id, offX: e.clientX-rect.left-elDiv.offsetLeft, offY: e.clientY-rect.top-elDiv.offsetTop};
      wfSelected = elDiv.dataset.id;
    });
  });
  canvas.onmousemove = (e)=>{
    if(wfState.drag){
      const rect = canvas.getBoundingClientRect();
      const x = Math.max(0, e.clientX-rect.left-wfState.drag.offX);
      const y = Math.max(0, e.clientY-rect.top-wfState.drag.offY);
      const el = document.getElementById('wfel-'+wfState.drag.id);
      el.style.left=x+'px'; el.style.top=y+'px';
      const proj = DB.projects.find(x2=>x2.id===pid); const doc = proj.docs.find(x2=>x2.id===did);
      const item = doc.elements.find(it=>it.id===wfState.drag.id); item.x=x; item.y=y;
    }
    if(wfState.resize){
      const el = document.getElementById('wfel-'+wfState.resize.id);
      const w = Math.max(30, wfState.resize.startW + (e.clientX-wfState.resize.startX));
      const h = Math.max(24, wfState.resize.startH + (e.clientY-wfState.resize.startY));
      el.style.width=w+'px'; el.style.height=h+'px';
      const proj = DB.projects.find(x2=>x2.id===pid); const doc = proj.docs.find(x2=>x2.id===did);
      const item = doc.elements.find(it=>it.id===wfState.resize.id); item.w=w; item.h=h;
    }
  };
  canvas.onmouseup = ()=>{ if(wfState.drag||wfState.resize) persist(); wfState.drag=null; wfState.resize=null; };
}

function startWFResize(e,id){
  const el = document.getElementById('wfel-'+id);
  wfState.resize = {id, startX:e.clientX, startY:e.clientY, startW:el.offsetWidth, startH:el.offsetHeight};
}

function addWFElement(pId,dId,shape){
  const p=DB.projects.find(x=>x.id===pId); const d=p.docs.find(x=>x.id===dId);
  const defaults = {rect:{w:160,h:100,text:'區塊'}, square:{w:100,h:100,text:'方塊'}, circle:{w:90,h:90,text:'圖示'}, button:{w:120,h:40,text:'按鈕文字'}, text:{w:150,h:26,text:'文字內容'}};
  const def = defaults[shape];
  d.elements.push({id:uid(), shape, x:60+Math.random()*300, y:60+Math.random()*200, w:def.w, h:def.h, text:def.text, color:'#F8F9FC'});
  persist(); render();
}

function updateWFText(id,text){
  for(const p of DB.projects) for(const d of p.docs) if(d.type==='wireframe'){
    const el = d.elements.find(x=>x.id===id); if(el){ el.text=text.trim(); persist(); return; }
  }
}

function deleteWFElement(id){
  for(const p of DB.projects) for(const d of p.docs) if(d.type==='wireframe'){
    const idx = d.elements.findIndex(x=>x.id===id);
    if(idx>-1){ d.elements.splice(idx,1); if(wfSelected===id) wfSelected=null; persist(); render(); return; }
  }
}

function exportWireframe(dId){
  const canvas = document.getElementById('wfCanvas');
  if(!canvas || typeof html2canvas==='undefined'){ toast('圖片匯出功能需要網路連線'); return; }
  html2canvas(canvas, {backgroundColor:'#ffffff'}).then(c=>{
    const link = document.createElement('a');
    link.download = 'wireframe.png';
    link.href = c.toDataURL('image/png');
    link.click();
    toast('已匯出圖片');
  }).catch(()=>toast('匯出失敗，請確認網路連線'));
}

function shareWireframe(pId,dId){
  const url = location.href.split('#')[0] + '#project='+pId+'&doc='+dId;
  navigator.clipboard && navigator.clipboard.writeText(url);
  toast('分享連結已複製（此為單機示範，實際協作需搭配後端服務）');
}
