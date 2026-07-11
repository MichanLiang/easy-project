/* ======================= 工具函数 ======================= */
function uid(){return Math.random().toString(36).slice(2,10);}
function todayStr(){return new Date().toISOString().slice(0,10);}
function fmtDate(d){ if(!d) return ''; const [y,m,day]=d.split('-'); return `${m}/${day}`; }

function shiftDate(n){const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);}

function escapeHTML(s){ 
  if(Array.isArray(s)) s = s.join(', ');
  if(typeof s !== 'string') s = String(s || '');
  return s.replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); 
}

function memberById(id){ return DB.members.find(m=>m.id===id); }
function memberName(id){ const m=memberById(id); return m? (m.nickname || m.name) : '未知'; }
function initials(name){ return name ? name.slice(0,1) : '?'; }

function avatarHTML(id, size){
  const m = memberById(id); if(!m) return '';
  const s = size||34;
  return `<div class="avatar" style="width:${s}px;height:${s}px;background:${m.color};font-size:${Math.round(s*0.38)}px" title="${m.name}">${initials(m.name)}</div>`;
}

function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(()=>t.classList.remove('show'), 2400);
}