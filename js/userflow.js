/* ================= USERFLOW BOARD ================= */
function renderUserflow(p,d){
  return `
  <div class="board-toolbar">
    <button class="btn btn-sm" onclick="addUFNode('${p.id}','${d.id}','rect')">
      <span class="icon">${getIcon('square')}</span>
      矩形（步驟）
    </button>
    <button class="btn btn-sm" onclick="addUFNode('${p.id}','${d.id}','ellipse')">
      <span class="icon">${getIcon('circle')}</span>
      橢圓（開始/結束）
    </button>
    <button class="btn btn-sm" onclick="addUFNode('${p.id}','${d.id}','diamond')">
      <span class="icon">${getIcon('hexagon')}</span>
      菱形（判斷）
    </button>
    <button class="btn btn-sm" onclick="addUFNode('${p.id}','${d.id}','subprocess')">
      <span class="icon">${getIcon('layout')}</span>
      子流程
    </button>
    <button class="btn btn-sm" onclick="addUFNode('${p.id}','${d.id}','document')">
      <span class="icon">${getIcon('fileText')}</span>
      文件
    </button>
    <button class="btn btn-sm" onclick="addUFNode('${p.id}','${d.id}','annotation')">
      <span class="icon">${getIcon('messageSquare')}</span>
      註解
    </button>
    <span class="hint" style="margin:0">提示：拖曳移動；Shift+點擊兩節點連線；右上角 ✕ 刪除</span>
    <button class="btn btn-sm" onclick="exportUserflow()" style="margin-left:auto;">
      <span class="icon">${getIcon('download')}</span>
      匯出圖片
    </button>
  </div>
  <div class="board-wrap" id="ufBoardWrap">
    <div class="board-canvas" id="ufCanvas" data-pid="${p.id}" data-did="${d.id}">
      <svg class="edges" id="ufEdgesSvg" width="1600" height="1200"></svg>
      ${d.nodes.map(n=>renderUFNode(n)).join('')}
    </div>
  </div>`;
}

function renderUFNode(n){
  let innerStyle = '';
  let shapeClass = n.shape;
  
  if(n.shape==='ellipse'){
    innerStyle = 'border-radius:50%;';
  } else if(n.shape==='diamond'){
    innerStyle = 'clip-path:polygon(50% 0%,100% 50%,50% 100%,0% 50%);background:var(--accent-light) !important;border-color:var(--accent) !important;';
  } else if(n.shape==='subprocess'){
    innerStyle = 'border-left:4px solid var(--accent);';
  } else if(n.shape==='document'){
    innerStyle = 'border-bottom:3px wavy var(--ink-muted);';
  } else if(n.shape==='annotation'){
    innerStyle = 'border:1px dashed var(--amber);background:var(--amber-soft) !important;';
  }
  
  return `
  <div class="node ${shapeClass}" id="node-${n.id}" data-id="${n.id}" style="left:${n.x}px;top:${n.y}px;width:${n.w}px;height:${n.h}px;${innerStyle}">
    <div class="txt" contenteditable="true" style="width:100%;outline:none;" onblur="updateUFNodeText('${n.id}',this.textContent)" onmousedown="event.stopPropagation()">${escapeHTML(n.text)}</div>
  </div>
  <div class="uf-del" id="ufdel-${n.id}" data-id="${n.id}" style="left:${n.x + n.w - 9}px;top:${n.y - 9}px;" onmousedown="event.stopPropagation()" onclick="deleteUFNode('${n.id}')">
    <span class="icon" style="width:10px;height:10px;">${getIcon('x')}</span>
  </div>`;
}

let ufState = null;

function initUserflowBoard(d){
  const canvas = document.getElementById('ufCanvas');
  if(!canvas) return;
  const pid = canvas.dataset.pid, did = canvas.dataset.did;
  ufState = {pid, did, connectFrom:null, drag:null, resize:null, dragType:null};
  drawUFEdges(d);
  
  // 節點拖曳
  canvas.querySelectorAll('.node').forEach(nodeEl=>{
    nodeEl.addEventListener('mousedown', (e)=>{
      if(e.target.closest('.del')||e.target.closest('.resize')) return;
      const id = nodeEl.dataset.id;
      if(e.shiftKey){
        if(ufState.connectFrom && ufState.connectFrom!==id){
          const proj = DB.projects.find(x=>x.id===pid); const doc = proj.docs.find(x=>x.id===did);
          doc.edges.push({from:ufState.connectFrom, to:id}); persist(); ufState.connectFrom=null; render();
        } else { ufState.connectFrom = id; toast('已選取起點，按住 Shift 點擊另一個節點以連線'); }
        return;
      }
      const rect = canvas.getBoundingClientRect();
      ufState.drag = {id, offX: e.clientX - rect.left - nodeEl.offsetLeft, offY: e.clientY - rect.top - nodeEl.offsetTop};
      ufState.dragType = 'node';
    });
  });
  
  // 刪除按鈕
  canvas.querySelectorAll('.uf-del').forEach(delEl=>{
    delEl.addEventListener('mousedown', (e)=>e.stopPropagation());
  });
  
  canvas.onmousemove = (e)=>{
    if(ufState.drag && ufState.dragType==='node'){
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left - ufState.drag.offX;
      const y = e.clientY - rect.top - ufState.drag.offY;
      const el = document.getElementById('node-'+ufState.drag.id);
      const del = document.getElementById('ufdel-'+ufState.drag.id);
      el.style.left = Math.max(0,x)+'px'; el.style.top = Math.max(0,y)+'px';
      if(del){ del.style.left = Math.max(0,x)+'px'; del.style.top = Math.max(0,y-9)+'px'; }
      const proj = DB.projects.find(x=>x.id===pid); const doc = proj.docs.find(x=>x.id===did);
      const n = doc.nodes.find(nn=>nn.id===ufState.drag.id); n.x=Math.max(0,x); n.y=Math.max(0,y);
      drawUFEdges(doc);
    }
  };
  canvas.onmouseup = ()=>{
    if(ufState.drag) persist();
    ufState.drag=null; ufState.dragType=null;
  };
  canvas.onmouseleave = ()=>{ };
}

function drawUFEdges(d){
  const svg = document.getElementById('ufEdgesSvg');
  if(!svg) return;
  svg.innerHTML = `<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#C4A882"/></marker></defs>`;
  d.edges.forEach(e=>{
    const a = d.nodes.find(n=>n.id===e.from), b = d.nodes.find(n=>n.id===e.to);
    if(!a||!b) return;
    // 計算線與矩形邊緣的交點（不連到中心）
    const acx=a.x+a.w/2, acy=a.y+a.h/2, bcx=b.x+b.w/2, bcy=b.y+b.h/2;
    const p1 = rectEdgePoint(acx, acy, a.w, a.h, bcx, bcy);
    const p2 = rectEdgePoint(bcx, bcy, b.w, b.h, acx, acy);
    svg.innerHTML += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="#C4A882" stroke-width="2" marker-end="url(#arrow)"/>`;
  });
}

// 從矩形中心朝目標方向，找到矩形邊緣的交點
function rectEdgePoint(cx, cy, w, h, tx, ty){
  const dx = tx - cx, dy = ty - cy;
  if(dx===0 && dy===0) return {x:cx, y:cy};
  const hw = w/2, hh = h/2;
  const absDx = Math.abs(dx), absDy = Math.abs(dy);
  let scale;
  if(absDx * hh > absDy * hw){
    scale = hw / absDx;
  } else {
    scale = hh / absDy;
  }
  return {x: cx + dx*scale, y: cy + dy*scale};
}

function exportUserflow(){
  const canvas = document.getElementById('ufCanvas');
  if(!canvas || typeof html2canvas==='undefined'){ toast('圖片匯出功能需要網路連線'); return; }
  html2canvas(canvas, {backgroundColor:'#ffffff'}).then(c=>{
    const link = document.createElement('a');
    link.download = 'userflow.png';
    link.href = c.toDataURL('image/png');
    link.click();
    toast('已匯出圖片');
  }).catch(()=>toast('匯出失敗，請確認網路連線'));
}

function addUFNode(pId,dId,shape){
  const p=DB.projects.find(x=>x.id===pId); const d=p.docs.find(x=>x.id===dId);
  const defaults = {
    rect:{w:120,h:56,text:'步驟'},
    ellipse:{w:120,h:60,text:'開始'},
    diamond:{w:140,h:90,text:'條件？'},
    subprocess:{w:140,h:60,text:'子流程'},
    document:{w:130,h:70,text:'文件內容'},
    annotation:{w:140,h:60,text:'註解文字'},
  };
  const def = defaults[shape] || defaults.rect;
  d.nodes.push({id:uid(), shape, x:80+Math.random()*300, y:80+Math.random()*200, w:def.w, h:def.h, text:def.text});
  persist(); render();
}

function updateUFNodeText(id,text){
  for(const p of DB.projects) for(const d of p.docs) if(d.type==='userflow'){
    const n = d.nodes.find(x=>x.id===id); if(n){ n.text=text.trim(); persist(); return; }
  }
}

function deleteUFNode(id){
  for(const p of DB.projects) for(const d of p.docs) if(d.type==='userflow'){
    const idx = d.nodes.findIndex(x=>x.id===id);
    if(idx>-1){
      const node = d.nodes[idx];
      const relatedEdges = d.edges.filter(e=>e.from===id||e.to===id);
      d.nodes.splice(idx,1);
      d.edges = d.edges.filter(e=>e.from!==id&&e.to!==id);
      trashItem('ufnodes', node, {projectId:p.id, docId:d.id, edges:relatedEdges});
      syncProjectAfterChange(p.id);
      persist(); render(); return;
    }
  }
}
