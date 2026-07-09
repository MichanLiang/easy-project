/* ================= TODOS (global + per-project) ================= */
const STATUS_LABEL = {pending:'待處理', doing:'進行中', testing:'測試中', done:'已完成'};

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
        
        snapshot.forEach(doc => {
          const task = {id: doc.id, ...doc.data()};
          // 檢查是否已存在
          if(!DB.todos.find(t => t.id === task.id)){
            DB.todos.push(task);
          }
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
  
  return `
  <div class="todo-row">
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
      <p>確定要刪除「${escapeHTML(t.title)}」嗎？</p>
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

// 刪除任務並同步到指派人
async function deleteTodoItem(id){
  const t = DB.todos.find(x=>x.id===id);
  
  // 如果是別人指派的任務，從對方那邊也刪除
  if(t && t.assignedBy && t.assignedBy !== DB.currentUser){
    await deleteTaskFromAssigner(t);
  }
  
  DB.todos = DB.todos.filter(t=>t.id!==id);
  persist(); 
  syncTodosToFirestore();
  closeModal(); 
  render();
}

// 從指派人的 Firestore 刪除任務
async function deleteTaskFromAssigner(task){
  const user = auth.currentUser;
  if(!user || state.isGuest) return;
  
  try {
    const assignerRef = firebase.firestore().collection('users').doc(task.assignedBy);
    const assignerDoc = await assignerRef.get();
    
    if(assignerDoc.exists){
      const assignerData = assignerDoc.data();
      const todos = assignerData.todos || [];
      const newTodos = todos.filter(t => t.id !== task.id);
      await assignerRef.update({ todos: newTodos });
    }
  } catch (error) {
    console.error('從指派人刪除任務失敗:', error);
  }
}

function viewTodos(){
  const me = DB.currentUser;
  const inbox = DB.todos.filter(t=>t.assignee===me && t.assignedBy && t.assignedBy!==me);
  const assigned = DB.todos.filter(t=>t.assignedBy===me && t.assignee && t.assignee!==me);
  const mine = DB.todos.filter(t=>!(t.assignedBy && t.assignedBy!==me && t.assignee===me) && !(t.assignedBy===me && t.assignee && t.assignee!==me));
  
  setTimeout(() => {
    initIcons();
    loadAssignedTasks();
  }, 10);
  
  return `
    <div class="page-title">待辦清單</div>
    <div class="page-sub">收件匣是別人指派給你的任務，指派是你分配給別人的任務，我的任務是你自己負責的</div>
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
  const t = todoId ? DB.todos.find(x=>x.id===todoId) : {id:null,title:'',date:'',status:'pending',note:'',assignee:DB.currentUser,assignedBy:DB.currentUser,projectId:presetProjectId||null,attachments:[]};
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