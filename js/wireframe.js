/* ================= WIREFRAME BOARD ================= */
const WF_SHAPES = [
  {shape:'rect', label:'方形區塊', icon:'square'},
  {shape:'square', label:'正方形', icon:'square'},
  {shape:'circle', label:'圓形', icon:'circle'},
  {shape:'button', label:'按鈕', icon:'zap'},
  {shape:'text', label:'文字', icon:'fileText'},
  {shape:'hline', label:'直線', icon:'minus'},
  {shape:'wline', label:'曲線', icon:'activity'},
];

const WF_COLORS = ['#F8F9FC','#FFFFFF','#E0E0E0','#BDBDBD','#9E9E9E','#757575','#424242','#212121','#000000','#C4A4A4','#9AABB8','#A8B5A0','#B8A9C9','#C9B896','#C4A882','#D4C5B9'];

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
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
    <span style="font-size:12px;color:var(--ink-faint);">背景色：</span>
    ${WF_COLORS.map(c=>`<div onclick="setWFColor('${c}')" style="width:20px;height:20px;border-radius:4px;background:${c};cursor:pointer;border:1px solid var(--line);transition:all 0.15s;" onmouseenter="this.style.transform='scale(1.2)'" onmouseleave="this.style.transform='scale(1)'"></div>`).join('')}
  </div>
  <div class="board-wrap" style="height:520px;">
    <div class="board-canvas" id="wfCanvas" data-pid="${p.id}" data-did="${d.id}" style="width:1100px;height:900px;background:#fff;">
      ${d.elements.map(el=>renderWFElement(el)).join('')}
    </div>
  </div>`;
}

function wfShapeStyle(el){
  const bgColor = el.color || '#F8F9FC';
  const rot = el.rotation ? `transform:rotate(${el.rotation}deg);` : '';
  if(el.shape==='hline') return `background:transparent;border:none;border-top:3px solid ${el.lineColor||'#424242'};height:0;${rot}`;
  if(el.shape==='wline') return `background:transparent;border:none;height:0;${rot}`;
  const base = `background:${bgColor};border:2px solid var(--ink-muted);display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--ink-soft);font-weight:600;${rot}`;
  if(el.shape==='circle') return base+'border-radius:50%;';
  if(el.shape==='button'){
    const btnColor = el.btnColor || '#C4A4A4';
    return `border-radius:24px;background:${btnColor};color:#fff;border:2px solid ${btnColor};font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,0.15);display:flex;align-items:center;justify-content:center;font-size:13px;${rot}`;
  }
  if(el.shape==='text') return `border:1px dashed var(--ink-muted);display:flex;align-items:center;padding-left:8px;font-size:14px;color:var(--ink-soft);${rot}`;
  return base+'border-radius:var(--radius);';
}

function renderWFElement(el){
  const isSelected = wfSelected===el.id;
  const delStyle = isSelected ? 'display:flex;' : 'display:none;';
  const controlStyle = isSelected ? 'display:block;' : 'display:none;';
  const curveStyle = isSelected && el.shape==='wline' ? 'display:flex;' : 'display:none;';
  
  if(el.shape==='hline'){
    return `<div class="wf-el ${isSelected?'wf-selected':''}" id="wfel-${el.id}" data-id="${el.id}" style="left:${el.x}px;top:${el.y}px;width:${el.w}px;height:6px;${wfShapeStyle(el)};cursor:move;" onclick="event.stopPropagation();selectWFElement('${el.id}')">
      <div class="del" style="${delStyle} top:-18px; right:auto; left:50%; transform:translateX(-50%);" onmousedown="event.stopPropagation()" onclick="deleteWFElement('${el.id}')"><span class="icon" style="width:10px;height:10px;">${getIcon('x')}</span></div>
      <div class="resize-line" style="${controlStyle}" onmousedown="event.stopPropagation();startWFResize(event,'${el.id}','hline')"></div>
      <div class="rotate" style="${controlStyle} left:auto; right:-16px; top:-4px;" onmousedown="event.stopPropagation();startWFRotate(event,'${el.id}')"><span class="icon" style="width:10px;height:10px;">${getIcon('refreshCw')}</span></div>
    </div>`;
  }
  if(el.shape==='wline'){
    const cp1y = el.cp1y != null ? el.cp1y : el.h * 0.2;
    const cp2y = el.cp2y != null ? el.cp2y : el.h * 0.8;
    const cp1x = el.w * 0.33, cp2x = el.w * 0.67;
    return `<div class="wf-el ${isSelected?'wf-selected':''}" id="wfel-${el.id}" data-id="${el.id}" style="left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;border:none;background:transparent;cursor:move;" onclick="event.stopPropagation();selectWFElement('${el.id}')">
      <svg class="wline-svg" width="100%" height="100%" style="overflow:visible;"><path d="M0,${el.h/2} C${cp1x},${cp1y} ${cp2x},${cp2y} ${el.w},${el.h/2}" fill="none" stroke="${el.lineColor||'#424242'}" stroke-width="3"/></svg>
      ${isSelected ? `<div class="curve-handle" data-cp="cp1" style="left:${cp1x-6}px;top:${cp1y-6}px;" onmousedown="event.stopPropagation();startWFCurveDrag(event,'${el.id}','cp1')"></div>
      <div class="curve-handle" data-cp="cp2" style="left:${cp2x-6}px;top:${cp2y-6}px;" onmousedown="event.stopPropagation();startWFCurveDrag(event,'${el.id}','cp2')"></div>` : ''}
      <div class="del" style="${delStyle}" onmousedown="event.stopPropagation()" onclick="deleteWFElement('${el.id}')"><span class="icon" style="width:10px;height:10px;">${getIcon('x')}</span></div>
      <div class="resize" style="${controlStyle}" onmousedown="event.stopPropagation();startWFResize(event,'${el.id}','wline')"></div>
      <div class="rotate" style="${controlStyle}" onmousedown="event.stopPropagation();startWFRotate(event,'${el.id}')"><span class="icon" style="width:10px;height:10px;">${getIcon('refreshCw')}</span></div>
    </div>`;
  }
  return `
  <div class="wf-el ${isSelected?'wf-selected':''}" id="wfel-${el.id}" data-id="${el.id}" style="left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;${wfShapeStyle(el)};cursor:move;" onclick="event.stopPropagation();selectWFElement('${el.id}')">
    <span contenteditable="true" onmousedown="event.stopPropagation()" onblur="updateWFText('${el.id}',this.textContent)" style="outline:none;width:100%;text-align:center;">${escapeHTML(el.text||'')}</span>
    <div class="del" style="${delStyle}" onmousedown="event.stopPropagation()" onclick="deleteWFElement('${el.id}')">
      <span class="icon" style="width:10px;height:10px;">${getIcon('x')}</span>
    </div>
    <div class="resize" style="${controlStyle}" onmousedown="event.stopPropagation();startWFResize(event,'${el.id}','rect')"></div>
    <div class="rotate" style="${controlStyle}" onmousedown="event.stopPropagation();startWFRotate(event,'${el.id}')">
      <span class="icon" style="width:10px;height:10px;">${getIcon('refreshCw')}</span>
    </div>
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
    if(el){
      if(el.shape==='button'){ el.btnColor = color; }
      else if(el.shape==='hline'||el.shape==='wline'){ el.lineColor = color; }
      else { el.color = color; }
      persist(); render(); return;
    }
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
  wfState = {pid, did, mode:null, elId:null, startX:0, startY:0, startW:0, startH:0, startX2:0, startY2:0};
  
  canvas.querySelectorAll('.wf-el').forEach(elDiv=>{
    elDiv.addEventListener('mousedown', (e)=>{
      if(e.target.closest('.del')||e.target.closest('.resize')||e.target.closest('.resize-line')||e.target.closest('.rotate')||e.target.closest('.curve-handle')) return;
      const rect = canvas.getBoundingClientRect();
      wfState.mode = 'drag';
      wfState.elId = elDiv.dataset.id;
      wfState.offX = e.clientX-rect.left-elDiv.offsetLeft;
      wfState.offY = e.clientY-rect.top-elDiv.offsetTop;
      wfSelected = elDiv.dataset.id;
    });
  });
  
  canvas.onmousemove = (e)=>{
    if(!wfState || !wfState.mode) return;
    const rect = canvas.getBoundingClientRect();
    const proj = DB.projects.find(x2=>x2.id===pid);
    const doc = proj.docs.find(x2=>x2.id===did);
    const item = doc.elements.find(it=>it.id===wfState.elId);
    if(!item) return;
    const el = document.getElementById('wfel-'+wfState.elId);
    
    if(wfState.mode==='drag'){
      const x = Math.max(0, e.clientX-rect.left-wfState.offX);
      const y = Math.max(0, e.clientY-rect.top-wfState.offY);
      el.style.left=x+'px'; el.style.top=y+'px';
      item.x=x; item.y=y;
    }
    else if(wfState.mode==='resize'){
      const dx = e.clientX - wfState.startX;
      const dy = e.clientY - wfState.startY;
      if(wfState.shapeType==='hline'){
        const w = Math.max(30, wfState.startW + dx);
        el.style.width=w+'px';
        item.w = w;
      } else if(wfState.shapeType==='wline'){
        const w = Math.max(30, wfState.startW + dx);
        const h = Math.max(20, wfState.startH + dy);
        el.style.width=w+'px'; el.style.height=h+'px';
        item.w = w; item.h = h;
        // Scale cp1y/cp2y proportionally
        const ratio = h / wfState.startH;
        item.cp1y = Math.round(wfState.startCp1y * ratio);
        item.cp2y = Math.round(wfState.startCp2y * ratio);
        const cp1x = w*0.33, cp2x = w*0.67;
        const svg = el.querySelector('.wline-svg');
        if(svg) svg.querySelector('path').setAttribute('d', `M0,${h/2} C${cp1x},${item.cp1y} ${cp2x},${item.cp2y} ${w},${h/2}`);
        const ch1 = el.querySelector('[data-cp="cp1"]');
        const ch2 = el.querySelector('[data-cp="cp2"]');
        if(ch1){ ch1.style.left=(cp1x-6)+'px'; ch1.style.top=(item.cp1y-6)+'px'; }
        if(ch2){ ch2.style.left=(cp2x-6)+'px'; ch2.style.top=(item.cp2y-6)+'px'; }
      } else {
        const w = Math.max(30, wfState.startW + dx);
        const h = Math.max(24, wfState.startH + dy);
        el.style.width=w+'px'; el.style.height=h+'px';
        item.w = w; item.h = h;
      }
    }
    else if(wfState.mode==='rotate'){
      const elRect = el.getBoundingClientRect();
      const cx = elRect.left + elRect.width/2;
      const cy = elRect.top + elRect.height/2;
      const angle = Math.atan2(e.clientY-cy, e.clientX-cx) * 180 / Math.PI + 90;
      const snapped = Math.round(angle / 15) * 15;
      el.style.transform = `rotate(${snapped}deg)`;
      item.rotation = snapped;
    }
    else if(wfState.mode==='curveDrag'){
      const my = e.clientY - rect.top;
      const newY = Math.max(0, Math.min(item.h, my - item.y));
      if(wfState.cp==='cp1'){
        item.cp1y = newY;
      } else {
        item.cp2y = newY;
      }
      const cp1x = item.w*0.33, cp2x = item.w*0.67;
      const svg = el.querySelector('.wline-svg');
      if(svg) svg.querySelector('path').setAttribute('d', 'M0,'+item.h/2+' C'+cp1x+','+item.cp1y+' '+cp2x+','+item.cp2y+' '+item.w+','+item.h/2);
      const ch1 = el.querySelector('[data-cp="cp1"]');
      const ch2 = el.querySelector('[data-cp="cp2"]');
      if(ch1){ ch1.style.left=(cp1x-6)+'px'; ch1.style.top=(item.cp1y-6)+'px'; }
      if(ch2){ ch2.style.left=(cp2x-6)+'px'; ch2.style.top=(item.cp2y-6)+'px'; }
    }
  };
  
  canvas.onmouseup = ()=>{
    if(wfState && wfState.mode) persist();
    if(wfState) wfState.mode = null;
  };
  
  canvas.onmouseleave = ()=>{
    if(wfState && wfState.mode) persist();
    if(wfState) wfState.mode = null;
  };
}

function startWFResize(e,id,shapeType){
  const el = document.getElementById('wfel-'+id);
  const proj = DB.projects.find(x2=>x2.id===wfState.pid);
  const doc = proj.docs.find(x2=>x2.id===wfState.did);
  const item = doc.elements.find(it=>it.id===id);
  wfState.mode = 'resize';
  wfState.elId = id;
  wfState.shapeType = shapeType;
  wfState.startX = e.clientX;
  wfState.startY = e.clientY;
  wfState.startW = el.offsetWidth;
  wfState.startH = el.offsetHeight;
  if(shapeType==='wline' && item){
    wfState.startCp1y = item.cp1y != null ? item.cp1y : item.h*0.2;
    wfState.startCp2y = item.cp2y != null ? item.cp2y : item.h*0.8;
  }
}

function startWFRotate(e,id){
  wfState.mode = 'rotate';
  wfState.elId = id;
}

function startWFCurveDrag(e,id,cp){
  wfState.mode = 'curveDrag';
  wfState.elId = id;
  wfState.cp = cp;
}

function addWFElement(pId,dId,shape){
  const p=DB.projects.find(x=>x.id===pId); const d=p.docs.find(x=>x.id===dId);
  const defaults = {rect:{w:160,h:100,text:'區塊'}, square:{w:100,h:100,text:'方塊'}, circle:{w:90,h:90,text:'圖示'}, button:{w:120,h:40,text:'按鈕文字'}, text:{w:150,h:26,text:'文字內容'}, hline:{w:200,h:6,text:''}, wline:{w:200,h:80,text:''}};
  const def = defaults[shape];
  d.elements.push({id:uid(), shape, x:60+Math.random()*300, y:60+Math.random()*200, w:def.w, h:def.h, text:def.text, color:'#F8F9FC', rotation:0, cp1y:def.h*0.2, cp2y:def.h*0.8});
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
    if(idx>-1){
      const el = d.elements[idx];
      d.elements.splice(idx,1);
      if(wfSelected===id) wfSelected=null;
      trashItem('wfelement', el, {projectId:p.id, docId:d.id});
      persist(); render(); return;
    }
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
