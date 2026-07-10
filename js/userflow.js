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
  </div>
  <div class="board-wrap" id="ufBoardWrap">
    <div class="board-canvas" id="ufCanvas" data-pid="${p.id}" data-did="${d.id}">
      <svg class="edges" id="ufEdgesSvg" width="1600" height="1200"></svg>
      ${d.nodes.map(n=>renderUFNode(n)).join('')}
    </div>
  </div>`;
}

function renderUFNode(n){
  let shapeStyle = '';
  let extraClass = n.shape;
  
  if(n.shape==='ellipse'){
    shapeStyle = 'border-radius:50%;';
  } else if(n.shape==='diamond'){
    shapeStyle = 'clip-path:polygon(50% 0%,100% 50%,50% 100%,0% 50%);border-radius:0;';
  } else if(n.shape==='subprocess'){
    shapeStyle = 'border-left:4px solid var(--accent);';
  } else if(n.shape==='document'){
    shapeStyle = 'border-bottom:3px wavy var(--ink-muted);';
  } else if(n.shape==='annotation'){
    shapeStyle = 'border:1px dashed var(--amber);background:var(--amber-soft) !important;';
  }
  
  return `
  <div class="node ${extraClass}" id="node-${n.id}" data-id="${n.id}" style="left:${n.x}px;top:${n.y}px;width:${n.w}px;height:${n.h}px;${shapeStyle}">
    <div class="txt" contenteditable="true" style="width:100%;outline:none;" onblur="updateUFNodeText('${n.id}',this.textContent)" onmousedown="event.stopPropagation()">${escapeHTML(n.text)}</div>
    <div class="del" onmousedown="event.stopPropagation()" onclick="deleteUFNode('${n.id}')">
      <span class="icon" style="width:10px;height:10px;">${getIcon('x')}</span>
    </div>
    <div class="resize" onmousedown="event.stopPropagation();startUFResize(event,'${n.id}')"></div>
  </div>`;
}

let ufState = null;

function initUserflowBoard(d){
  const canvas = document.getElementById('ufCanvas');
  if(!canvas) return;
  const pid = canvas.dataset.pid, did = canvas.dataset.did;
  ufState = {pid, did, connectFrom:null, drag:null, resize:null};
  drawUFEdges(d);
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
    });
  });
  canvas.onmousemove = (e)=>{
    if(ufState.drag){
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left - ufState.drag.offX;
      const y = e.clientY - rect.top - ufState.drag.offY;
      const el = document.getElementById('node-'+ufState.drag.id);
      el.style.left = Math.max(0,x)+'px'; el.style.top = Math.max(0,y)+'px';
      const proj = DB.projects.find(x=>x.id===pid); const doc = proj.docs.find(x=>x.id===did);
      const n = doc.nodes.find(nn=>nn.id===ufState.drag.id); n.x=Math.max(0,x); n.y=Math.max(0,y);
      drawUFEdges(doc);
    }
    if(ufState.resize){
      const el = document.getElementById('node-'+ufState.resize.id);
      const w = Math.max(70, ufState.resize.startW + (e.clientX - ufState.resize.startX));
      const h = Math.max(44, ufState.resize.startH + (e.clientY - ufState.resize.startY));
      el.style.width=w+'px'; el.style.height=h+'px';
      const proj = DB.projects.find(x=>x.id===pid); const doc = proj.docs.find(x=>x.id===did);
      const n = doc.nodes.find(nn=>nn.id===ufState.resize.id); n.w=w; n.h=h;
      drawUFEdges(doc);
    }
  };
  canvas.onmouseup = ()=>{
    if(ufState.drag||ufState.resize) persist();
    ufState.drag=null; ufState.resize=null;
  };
  canvas.onmouseleave = ()=>{ };
}

function startUFResize(e,id){
  const el = document.getElementById('node-'+id);
  ufState.resize = {id, startX:e.clientX, startY:e.clientY, startW:el.offsetWidth, startH:el.offsetHeight};
}

function drawUFEdges(d){
  const svg = document.getElementById('ufEdgesSvg');
  if(!svg) return;
  svg.innerHTML = `<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#C4A882"/></marker></defs>`;
  d.edges.forEach(e=>{
    const a = d.nodes.find(n=>n.id===e.from), b = d.nodes.find(n=>n.id===e.to);
    if(!a||!b) return;
    const x1=a.x+a.w/2, y1=a.y+a.h/2, x2=b.x+b.w/2, y2=b.y+b.h/2;
    svg.innerHTML += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#C4A882" stroke-width="2" marker-end="url(#arrow)"/>`;
  });
}

function addUFNode(pId,dId,shape){
  const p=DB.projects.find(x=>x.id===pId); const d=p.docs.find(x=>x.id===dId);
  const defaults = {
    rect:{w:120,h:56,text:'步驟'},
    ellipse:{w:120,h:60,text:'開始'},
    diamond:{w:130,h:80,text:'條件？'},
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
    if(idx>-1){ d.nodes.splice(idx,1); d.edges = d.edges.filter(e=>e.from!==id&&e.to!==id); persist(); render(); return; }
  }
}
