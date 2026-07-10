/* ================= TODOS (global + per-project) ================= */
const STATUS_LABEL = {pending:'待處理', doing:'進行中', testing:'測試中', done:'已完成'};
const DEFAULT_TODO_COLORS = [
  {color:'#C4A4A4', name:'工作'},
  {color:'#9AABB8', name:'專案'},
  {color:'#A8B5A0', name:'個人'},
  {color:'#B8A9C9', name:'學習'},
  {color:'#C9B896', name:'會議'},
  {color:'#C4A882', name:'緊急'},
];
let TODO_COLORS = JSON.parse(localStorage.getItem('todo_custom_colors') || 'null') || DEFAULT_TODO_COLORS.slice();
function saveTodoColors(){ localStorage.setItem('todo_custom_colors', JSON.stringify(TODO_COLORS)); }
function openTodoColorSettings(){
  var rows = TODO_COLORS.map(function(c,i){
    return '<div class="field-row" style="margin-bottom:8px;align-items:flex-end;">'
      + '<div class="field" style="flex:1;"><label>名稱</label><input type="text" id="colorName'+i+'" value="'+escapeHTML(c.name)+'" maxlength="6"></div>'
      + '<div class="field" style="width:80px;"><label>顏色</label><input type="color" id="colorVal'+i+'" value="'+c.color+'" style="width:100%;height:32px;"></div>'
      + '<button class="btn btn-sm btn-danger" onclick="removeTodoColor('+i+')" style="margin-bottom:2px;height:32px;min-width:32px;display:inline-flex;align-items:center;justify-content:center;" title="刪除此標籤"><span class="icon" style="width:14px;height:14px;">'+getIcon('trash2')+'</span></button>'
      + '</div>';
  }).join('');
  openModal('<div class="modal-head"><h3>編輯顏色標籤</h3></div><div class="modal-body">'
    + rows
    + '<div style="display:flex;gap:8px;margin-top:12px;">'
    + '<button class="btn btn-sm" onclick="addTodoColor()"><span class="icon" style="width:14px;height:14px;">'+getIcon('plus')+'</span> 新增</button>'
    + '<button class="btn btn-sm" onclick="resetTodoColors()" style="margin-left:auto;"><span class="icon" style="width:14px;height:14px;">'+getIcon('rotateCcw')+'</span> 回到預設</button>'
    + '</div></div>'
    + '<div class="modal-foot"><button class="btn btn-cancel" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="saveTodoColorSettings()">儲存</button></div>');
}
function addTodoColor(){ TODO_COLORS.push({name:'新標籤',color:'#B8A9C9'}); saveTodoColors(); openTodoColorSettings(); }
function removeTodoColor(i){ TODO_COLORS.splice(i,1); saveTodoColors(); openTodoColorSettings(); }
function resetTodoColors(){ TODO_COLORS = DEFAULT_TODO_COLORS.slice(); saveTodoColors(); openTodoColorSettings(); toast('已恢復預設顏色'); }
function saveTodoColorSettings(){ for(var i=0;i<TODO_COLORS.length;i++){ var n=document.getElementById('colorName'+i), v=document.getElementById('colorVal'+i); if(n) TODO_COLORS[i].name=n.value.trim()||'未命名'; if(v) TODO_COLORS[i].color=v.value; } saveTodoColors(); closeModal(); render(); toast('顏色標籤已更新'); }

// Firestore 同步任務
async function syncTodosToFirestore(){
  const user = auth.currentUser;
  if(!user || state.isGuest) return;
  
  try {
    const todosRef = firebase.firestore().collection('users').doc(user.uid).collection('todos');
    
    // 先取得 Firestore 中現有的任務
    const snapshot = await todosRef.get();
    const firestoreIds = new Set();
    snapshot.forEach(doc => firestoreIds.add(doc.id));
    
    // 同步本地任務到 Firestore
    const localIds = new Set();
    for(const todo of DB.todos){
      localIds.add(todo.id);
      await todosRef.doc(todo.id).set({
        ...todo,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    
    // 刪除 Firestore 中不在本地的任務
    for(const firestoreId of firestoreIds){
      if(!localIds.has(firestoreId)){
        await todosRef.doc(firestoreId).delete();
      }
    }
  } catch (error) {
    console.error('同步任務失敗:', error);
  }
}

// 從 Firestore 載入任務
async function loadTodosFromFirestore(){
  const user = auth.currentUser;
  if(!user || state.isGuest) return;
  
  try {
    const todosRef = firebase.firestore().collection('users').doc(user.uid).collection('todos');
    const snapshot = await todosRef.get();
    
    const firestoreTodos = [];
    snapshot.forEach(doc => firestoreTodos.push({id: doc.id, ...doc.data()}));
    
    // 確保 DB.todos 是陣列
    if(!Array.isArray(DB.todos)) DB.todos = [];
    
    // 合併本地和 Firestore 任務（避免重複）
    const localIds = DB.todos.map(t => t.id);
    for(const todo of firestoreTodos){
      if(!localIds.includes(todo.id)){
        DB.todos.push(todo);
      }
    }
    
    persist();
  } catch (error) {
    console.error('載入任務失敗:', error);
  }
}

// 從其他成員處取得指派給我的任務
async function loadAssignedTasks(){
  const user = auth.currentUser;
  if(!user || state.isGuest) return;
  
  // 確保 DB.todos 是陣列
  if(!Array.isArray(DB.todos)) DB.todos = [];
  
  try {
    // 查詢所有成員的 Firestore，找指派給我的任務
    for(const member of DB.members){
      if(member.id === user.uid) continue;
      
      try {
        const todosRef = firebase.firestore().collection('users').doc(member.id).collection('todos');
        const snapshot = await todosRef.where('assignee', '==', user.uid).get();
        
        // 收集所有指派給我的有效任務 ID
        const remoteIds = new Set();
        snapshot.forEach(doc => {
          const task = {id: doc.id, ...doc.data()};
          remoteIds.add(task.id);
          // 檢查是否已存在
          if(!DB.todos.find(t => t.id === task.id)){
            DB.todos.push(task);
          }
        });
        
        // 清除 DB.todos 中已經從對方 subcollection 被刪除的任務（對方已刪除）
        DB.todos = DB.todos.filter(t => {
          if(t.assignedBy === member.id && t.assignee === user.uid && !remoteIds.has(t.id)){
            return false; // 對方已刪除此任務
          }
          return true;
        });
      } catch (e) {
        // 可能無權限存取
      }
    }
    
    persist();
  } catch (error) {
    console.error('載入指派任務失敗:', error);
  }
}

function renderTodoRow(t){
  const overdue = t.date && t.date < todayStr() && t.status!=='done';
  const assignee = memberById(t.assignee);
  const assignedBy = t.assignedBy ? memberById(t.assignedBy) : null;
  const colorTag = t.colorTag ? TODO_COLORS.find(c=>c.color===t.colorTag) : null;
  
  return `
  <div class="todo-row" ${t.colorTag?`style="border-left:4px solid ${t.colorTag}"`:''}>
    <div class="todo-check ${t.status==='done'?'done':''}" onclick="toggleTodoDone('${t.id}')">
      ${t.status==='done' ? `<span class="icon" style="width:12px;height:12px;color:#fff;">${getIcon('check')}</span>` : ''}
    </div>
    <div class="todo-main" onclick="openTodoModal('${t.id}')" style="cursor:pointer">
      <div class="todo-title ${t.status==='done'?'done':''}">${escapeHTML(t.title)}</div>
      <div class="todo-sub">
        ${t.date?`<span style="display:flex;align-items:center;gap:4px;${overdue?'color:var(--rose);font-weight:700':''}">
          <span class="icon" style="width:12px;height:12px;">${getIcon('clock')}</span>
          ${t.date}
        </span>`:''}
        <span class="tag ${t.status}">${STATUS_LABEL[t.status]}</span>
        ${colorTag?`<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:12px;font-size:11px;background:${t.colorTag}22;color:${t.colorTag};font-weight:600;">
          ${escapeHTML(colorTag.name)}
        </span>`:''}
        ${assignee?`<span style="display:flex;align-items:center;gap:4px;">
          ${avatarHTML(t.assignee, 16)}
          ${escapeHTML(assignee.name)}
        </span>`:''}
        ${assignedBy && assignedBy.id !== DB.currentUser ?`<span style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--ink-faint);">
          由 ${escapeHTML(assignedBy.name)} 指派
        </span>`:''}
        ${t.projectId?`<span style="display:flex;align-items:center;gap:4px;">
          <span class="icon" style="width:12px;height:12px;">${getIcon('folder')}</span>
          ${(DB.projects.find(p=>p.id===t.projectId)||{}).name||''}
        </span>`:''}
        ${(t.attachments&&t.attachments.length)?`<span style="display:flex;align-items:center;gap:4px;">
          <span class="icon" style="width:12px;height:12px;">${getIcon('paperclip')}</span>
          ${t.attachments.length}
        </span>`:''}
      </div>
    </div>
    <button class="btn-ghost btn-icon btn-sm" onclick="event.stopPropagation();confirmDeleteTodo('${t.id}')" style="flex-shrink:0;color:var(--ink-faint);">
      <span class="icon" style="width:16px;height:16px;">${getIcon('x')}</span>
    </button>
  </div>`;
}

function toggleTodoDone(id){
  const t = DB.todos.find(x=>x.id===id);
  t.status = t.status==='done' ? 'pending' : 'done';
  persist(); 
  syncTodosToFirestore();
  // 如果是別人指派的任務，同步更新對方的狀態
  if(t.assignedBy && t.assignedBy !== DB.currentUser){
    syncTaskToAssigner(t);
  }
  render();
}

function confirmDeleteTodo(id){
  const t = DB.todos.find(x=>x.id===id);
  if(!t) return;
  openModal(`
    <div class="modal-head"><h3>確認刪除</h3></div>
    <div class="modal-body">
      <p>確定要刪除「${escapeHTML(t.title)}」嗎？任務會移到垃圾桶，可以之後還原。</p>
    </div>
    <div class="modal-foot">
      <button class="btn" onclick="closeModal()">取消</button>
      <button class="btn btn-danger" onclick="deleteTodoItem('${id}')">
        <span class="icon">${getIcon('trash')}</span>
        刪除
      </button>
    </div>
  `);
  setTimeout(initIcons, 10);
}

// 同步任務狀態到指派人那邊
async function syncTaskToAssigner(task){
  const user = auth.currentUser;
  if(!user || state.isGuest) return;
  
  try {
    // 更新指派人 Firestore 子集合中的任務狀態
    const todosRef = firebase.firestore().collection('users').doc(task.assignedBy).collection('todos');
    const docRef = todosRef.doc(task.id);
    const doc = await docRef.get();
    
    if(doc.exists){
      await docRef.update({ status: task.status });
    }
    
    // 同時更新指派人主文檔的 todos 陣列（如果存在的話）
    const assignerRef = firebase.firestore().collection('users').doc(task.assignedBy);
    const assignerDoc = await assignerRef.get();
    
    if(assignerDoc.exists){
      const assignerData = assignerDoc.data();
      const todos = assignerData.todos || [];
      const taskIndex = todos.findIndex(t => t.id === task.id);
      
      if(taskIndex !== -1){
        todos[taskIndex].status = task.status;
        await assignerRef.update({ todos: todos });
      }
    }
  } catch (error) {
    console.error('同步任務到指派人失敗:', error);
  }
}

// 刪除任務 → 移到垃圾桶，並同步到指派人
async function deleteTodoItem(id){
  const t = DB.todos.find(x=>x.id===id);
  if(!t) return;
  
  // 移到垃圾桶（帶時間戳）
  const trashed = {...t, deletedAt: new Date().toISOString(), deletedBy: DB.currentUser};
  if(!Array.isArray(DB.trash)) DB.trash = [];
  DB.trash.push(trashed);
  
  // 從本地移除
  DB.todos = DB.todos.filter(x=>x.id!==id);
  
  // 同步到指派人：也在對方那邊移到垃圾桶
  if(t.assignedBy && t.assignedBy !== DB.currentUser){
    await trashTaskForAssigner(t);
  }
  // 同步到被指派人：如果我是指派人，對方也要移到垃圾桶
  if(t.assignee && t.assignee !== DB.currentUser){
    await trashTaskForAssignee(t);
  }
  
  persist(); 
  syncTodosToFirestore();
  closeModal(); 
  render();
}

// 從指派人那邊也移到垃圾桶
async function trashTaskForAssigner(task){
  const user = auth.currentUser;
  if(!user || state.isGuest) return;
  try {
    // 寫入指派人的 trash 子集合
    const trashRef = firebase.firestore().collection('users').doc(task.assignedBy).collection('trash');
    await trashRef.doc(task.id).set({...task, deletedAt: firebase.firestore.FieldValue.serverTimestamp(), deletedBy: user.uid});
    // 從指派人的 todos subcollection 刪除
    const todosRef = firebase.firestore().collection('users').doc(task.assignedBy).collection('todos');
    await todosRef.doc(task.id).delete().catch(()=>{});
    // 從指派人的主文檔 todos 陣列移除
    const assignerRef = firebase.firestore().collection('users').doc(task.assignedBy);
    const assignerDoc = await assignerRef.get();
    if(assignerDoc.exists){
      const todos = (assignerDoc.data().todos || []).filter(t => t.id !== task.id);
      const trash = assignerDoc.data().trash || [];
      trash.push({...task, deletedAt: new Date().toISOString(), deletedBy: user.uid});
      await assignerRef.update({ todos, trash });
    }
  } catch(e){ console.error('trashTaskForAssigner:', e); }
}

// 從被指派人那邊也移到垃圾桶
async function trashTaskForAssignee(task){
  const user = auth.currentUser;
  if(!user || state.isGuest) return;
  try {
    const trashRef = firebase.firestore().collection('users').doc(task.assignee).collection('trash');
    await trashRef.doc(task.id).set({...task, deletedAt: firebase.firestore.FieldValue.serverTimestamp(), deletedBy: user.uid});
    const todosRef = firebase.firestore().collection('users').doc(task.assignee).collection('todos');
    await todosRef.doc(task.id).delete().catch(()=>{});
    const assigneeRef = firebase.firestore().collection('users').doc(task.assignee);
    const assigneeDoc = await assigneeRef.get();
    if(assigneeDoc.exists){
      const todos = (assigneeDoc.data().todos || []).filter(t => t.id !== task.id);
      const trash = assigneeDoc.data().trash || [];
      trash.push({...task, deletedAt: new Date().toISOString(), deletedBy: user.uid});
      await assigneeRef.update({ todos, trash });
    }
  } catch(e){ console.error('trashTaskForAssignee:', e); }
}

function viewTrash(){
  if(!Array.isArray(DB.trash)) DB.trash = [];
  const items = DB.trash.slice().sort((a,b)=>(b.deletedAt||'').localeCompare(a.deletedAt||''));
  setTimeout(initIcons, 10);
  return `
    <div class="page-title">垃圾桶</div>
    <div class="page-sub">已刪除的任務會在這裡保留 30 天</div>
    ${items.length ? `
      <div style="margin-bottom:14px;">
        <button class="btn btn-danger btn-sm" onclick="emptyTrash()">
          <span class="icon">${getIcon('trash')}</span>
          清空垃圾桶
        </button>
      </div>
      <div class="card">${items.map(t=>{
        const assignee = memberById(t.assignee);
        const assignedBy = t.assignedBy ? memberById(t.assignedBy) : null;
        return `<div class="todo-row" style="opacity:0.7;">
          <div class="todo-main" style="cursor:default;">
            <div class="todo-title">${escapeHTML(t.title)}</div>
            <div class="todo-sub">
              ${t.date?`<span style="display:flex;align-items:center;gap:4px;"><span class="icon" style="width:12px;height:12px;">${getIcon('clock')}</span>${t.date}</span>`:''}
              ${assignee?`<span style="display:flex;align-items:center;gap:4px;">${avatarHTML(t.assignee,16)} ${escapeHTML(assignee.name)}</span>`:''}
              ${assignedBy?`<span style="font-size:11px;color:var(--ink-faint);">由 ${escapeHTML(assignedBy.name)} 指派</span>`:''}
              <span style="font-size:11px;color:var(--ink-faint);">刪除於 ${t.deletedAt ? new Date(t.deletedAt).toLocaleDateString('zh-TW') : ''}</span>
            </div>
          </div>
          <button class="btn btn-sm" onclick="restoreFromTrash('${t.id}')" style="flex-shrink:0;" title="還原">
            <span class="icon" style="width:14px;height:14px;">${getIcon('rotateCcw')}</span>
          </button>
          <button class="btn btn-sm btn-danger" onclick="permanentDeleteFromTrash('${t.id}')" style="flex-shrink:0;" title="永久刪除">
            <span class="icon" style="width:14px;height:14px;">${getIcon('trash2')}</span>
          </button>
        </div>`;
      }).join('')}</div>
    ` : `<div class="card"><div class="empty">垃圾桶是空的</div></div>`}
  `;
}

function restoreFromTrash(id){
  const t = DB.trash.find(x=>x.id===id);
  if(!t) return;
  // 從垃圾桶移除
  DB.trash = DB.trash.filter(x=>x.id!==id);
  // 還原到 todos（移除 deletedAt 欄位）
  const restored = {...t};
  delete restored.deletedAt;
  delete restored.deletedBy;
  DB.todos.push(restored);
  persist();
  syncTodosToFirestore();
  render();
  toast('已還原任務');
}

function permanentDeleteFromTrash(id){
  openModal(`
    <div class="modal-head"><h3>確認永久刪除</h3></div>
    <div class="modal-body"><p>此操作無法復原，確定要永久刪除嗎？</p></div>
    <div class="modal-foot">
      <button class="btn" onclick="closeModal()">取消</button>
      <button class="btn btn-danger" onclick="confirmPermanentDelete('${id}')">
        <span class="icon">${getIcon('trash')}</span>
        永久刪除
      </button>
    </div>
  `);
  setTimeout(initIcons, 10);
}

function confirmPermanentDelete(id){
  DB.trash = DB.trash.filter(x=>x.id!==id);
  persist();
  closeModal();
  render();
  toast('已永久刪除');
}

function emptyTrash(){
  openModal(`
    <div class="modal-head"><h3>確認清空</h3></div>
    <div class="modal-body"><p>確定要清空垃圾桶嗎？所有已刪除的任務都將無法復原。</p></div>
    <div class="modal-foot">
      <button class="btn" onclick="closeModal()">取消</button>
      <button class="btn btn-danger" onclick="confirmEmptyTrash()">
        <span class="icon">${getIcon('trash')}</span>
        清空
      </button>
    </div>
  `);
  setTimeout(initIcons, 10);
}

function confirmEmptyTrash(){
  DB.trash = [];
  persist();
  closeModal();
  render();
  toast('垃圾桶已清空');
}

function viewTodos(){
  const me = DB.currentUser;
  const inbox = DB.todos.filter(t=>t.assignee===me && t.assignedBy && t.assignedBy!==me);
  const assigned = DB.todos.filter(t=>t.assignedBy===me && t.assignee && t.assignee!==me);
  const mine = DB.todos.filter(t=>t.assignedBy===me && (!t.assignee || t.assignee===me));
  
  // 使用自訂顏色標籤（從 localStorage 讀取或使用預設）
  const customColors = JSON.parse(localStorage.getItem('todo_custom_colors') || 'null') || TODO_COLORS;
  
  setTimeout(() => {
    initIcons();
    loadAssignedTasks();
  }, 10);
  
  return `
    <div class="page-title">待辦清單</div>
    <div class="page-sub">收件匣是別人指派給你的任務，指派是你分配給別人的任務，我的任務是你自己負責的</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;">
      <span style="font-size:12px;color:var(--ink-faint);line-height:26px;">顏色標籤：</span>
      ${customColors.map(c=>`<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 10px;border-radius:12px;font-size:12px;background:${c.color}22;color:${c.color};font-weight:600;border:1px solid ${c.color}44;">
        <span style="width:8px;height:8px;border-radius:50%;background:${c.color};"></span>
        ${escapeHTML(c.name)}
      </span>`).join('')}
      <button class="btn btn-sm" onclick="openTodoColorSettings()" style="font-size:11px;padding:2px 8px;">
        <span class="icon" style="width:12px;height:12px;">${getIcon('settings')}</span>
        編輯
      </button>
    </div>
    <div class="section-title">
      <span class="dot" style="background:var(--accent)"></span>
      收件匣 ${inbox.length?`<span style="color:var(--ink-faint);font-weight:500">(${inbox.length})</span>`:''}
    </div>
    <div class="card">${inbox.length? inbox.map(renderTodoRow).join('') : `<div class="empty">目前沒有人指派任務給你</div>`}</div>
    <div class="section-title">
      <span class="dot" style="background:var(--purple)"></span>
      指派 ${assigned.length?`<span style="color:var(--ink-faint);font-weight:500">(${assigned.length})</span>`:''}
    </div>
    <div class="card">${assigned.length? assigned.map(renderTodoRow).join('') : `<div class="empty">你還沒有指派任務給其他人</div>`}</div>
    <div class="section-title" style="justify-content:space-between">
      <span style="display:flex;align-items:center;gap:8px">
        <span class="dot" style="background:var(--teal)"></span>
        我的任務
      </span>
      <button class="btn btn-primary btn-sm" onclick="openTodoModal()">
        <span class="icon">${getIcon('plus')}</span>
        新增任務
      </button>
    </div>
    <div class="card">${mine.length? mine.map(renderTodoRow).join('') : `<div class="empty">還沒有任務，點右上角新增一個吧</div>`}</div>
  `;
}

function renderProjectTodo(p,d){
  const items = DB.todos.filter(t=>t.projectId===p.id);
  setTimeout(initIcons, 10);
  return `
  <div style="margin-bottom:14px">
    <button class="btn btn-primary btn-sm" onclick="openTodoModal(null,'${p.id}')">
      <span class="icon">${getIcon('plus')}</span>
      新增任務
    </button>
  </div>
  <div class="card">${items.length? items.map(renderTodoRow).join('') : `<div class="empty">這個專案還沒有待辦事項</div>`}</div>`;
}

function openTodoModal(todoId, presetProjectId){
  const t = todoId ? DB.todos.find(x=>x.id===todoId) : {id:null,title:'',date:'',status:'pending',note:'',assignee:DB.currentUser,assignedBy:DB.currentUser,projectId:presetProjectId||null,attachments:[],colorTag:''};
  const projOptions = `<option value="">（個人，不屬於任何專案）</option>` + DB.projects.map(p=>`<option value="${p.id}" ${t.projectId===p.id?'selected':''}>${escapeHTML(p.name)}</option>`).join('');
  const proj = DB.projects.find(p=>p.id===t.projectId);
  
  // 建立指派選項（包含所有團隊成員）
  const assigneeOptions = DB.members.map(m => 
    `<option value="${m.id}" ${t.assignee===m.id?'selected':''}>${escapeHTML(m.name)} ${m.email ? '(' + m.email + ')' : ''}</option>`
  ).join('');
  
  openModal(`
    <div class="modal-head"><h3>${todoId?'編輯任務':'新增任務'}</h3></div>
    <div class="modal-body">
      <div class="field"><label>任務標題</label><input type="text" id="tdTitle" value="${escapeHTML(t.title)}" placeholder="要做什麼？"></div>
      <div class="field-row">
        <div class="field"><label>所屬專案</label><select id="tdProject" onchange="refreshTodoAssigneeOptions()">${projOptions}</select></div>
        <div class="field"><label>指派給</label><select id="tdAssignee">${assigneeOptions}</select></div>
      </div>
      <div class="field-row">
        <div class="field"><label>日期</label><input type="date" id="tdDate" value="${t.date||''}"></div>
        <div class="field"><label>狀態</label><select id="tdStatus">${Object.entries(STATUS_LABEL).map(([k,v])=>`<option value="${k}" ${t.status===k?'selected':''}>${v}</option>`).join('')}</select></div>
      </div>
      <div class="field"><label>顏色標籤</label>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          <div class="todo-color-opt ${!t.colorTag?'on':''}" onclick="selectTodoColor('')" style="height:28px;border-radius:14px;border:2px solid var(--line);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--ink-faint);padding:0 8px;" title="無">✕</div>
          ${TODO_COLORS.map(c=>`<div class="todo-color-opt ${t.colorTag===c.color?'on':''}" onclick="selectTodoColor('${c.color}')" style="height:28px;border-radius:14px;background:${c.color}22;cursor:pointer;border:2px solid ${t.colorTag===c.color?c.color:'transparent'};transition:all 0.15s;padding:0 10px;display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:600;color:${c.color};" title="${c.name}"><span style="width:8px;height:8px;border-radius:50%;background:${c.color};"></span>${escapeHTML(c.name)}</div>`).join('')}
          <button class="btn btn-sm" onclick="openTodoColorSettings()" style="height:28px;border-radius:14px;font-size:11px;padding:0 8px;">編輯</button>
        </div>
        <input type="hidden" id="tdColorTag" value="${t.colorTag||''}">
      </div>
      <div class="field"><label>備註</label><textarea id="tdNote" placeholder="補充說明…">${escapeHTML(t.note||'')}</textarea></div>
      <div class="field"><label>檔案附件</label>
        <div class="attach-list" id="tdAttachList">${(t.attachments||[]).map(a=>`<div class="attach-item"><a href="${a.url}" target="_blank">${escapeHTML(a.name)}</a><button class="btn-ghost btn-icon btn-sm" onclick="this.parentElement.remove()"><span class="icon">${getIcon('x')}</span></button></div>`).join('')}</div>
        <div style="display:flex;gap:10px;margin-top:10px;">
          <input type="text" id="tdAttachName" placeholder="名稱" style="flex:1;border:1px solid var(--line);border-radius:var(--radius);padding:10px;">
          <input type="url" id="tdAttachUrl" placeholder="連結網址" style="flex:1.4;border:1px solid var(--line);border-radius:var(--radius);padding:10px;">
          <button class="btn btn-sm" onclick="addAttachRow('tdAttachList')">
            <span class="icon">${getIcon('plus')}</span>
            加入
          </button>
        </div>
      </div>
    </div>
    <div class="modal-foot">
      ${todoId?`<button class="btn btn-danger" onclick="deleteTodoItem('${todoId}')">
        <span class="icon">${getIcon('trash')}</span>
        刪除
      </button>`:''}
      <div style="flex:1"></div>
      <button class="btn" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="saveTodoItem('${todoId||''}')">
        <span class="icon">${getIcon('save')}</span>
        儲存
      </button>
    </div>
  `);
  setTimeout(initIcons, 10);
}

function selectTodoColor(color){
  document.getElementById('tdColorTag').value = color;
  document.querySelectorAll('.todo-color-opt').forEach(el=>{
    el.style.border = '3px solid transparent';
    el.classList.remove('on');
  });
  if(color){
    event.target.style.border = '3px solid var(--ink)';
    event.target.classList.add('on');
  } else {
    event.target.style.border = '2px solid var(--line)';
    event.target.classList.add('on');
  }
}

function refreshTodoAssigneeOptions(){
  const pid = document.getElementById('tdProject').value;
  const proj = DB.projects.find(p=>p.id===pid);
  // 顯示所有團隊成員
  document.getElementById('tdAssignee').innerHTML = DB.members.map(m => 
    `<option value="${m.id}">${escapeHTML(m.name)} ${m.email ? '(' + m.email + ')' : ''}</option>`
  ).join('');
}

function saveTodoItem(todoId){
  const title = document.getElementById('tdTitle').value.trim();
  if(!title){ toast('請輸入任務標題'); return; }
  const projectId = document.getElementById('tdProject').value || null;
  const assignee = document.getElementById('tdAssignee').value;
  const payload = {
    title, projectId, assignee,
    date: document.getElementById('tdDate').value,
    status: document.getElementById('tdStatus').value,
    note: document.getElementById('tdNote').value,
    attachments: readAttachList('tdAttachList'),
    colorTag: document.getElementById('tdColorTag').value,
  };
  
  if(todoId){ 
    const t = DB.todos.find(x=>x.id===todoId); 
    Object.assign(t, payload); 
  } else { 
    DB.todos.push({id:uid(), assignedBy: DB.currentUser, ...payload}); 
  }
  
  persist(); 
  syncTodosToFirestore();
  closeModal(); 
  render();
}