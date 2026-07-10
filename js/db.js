/* ================= DB ================= */
// 全域資料
let DB={
  currentUser:'user1',
  members:[],
  projects:[],
  backlogItems:[],
  meetings:[],
  chats:{},
  todos:[],
  trash:[],
  dismissedBacklogs:[]
};

// 當前用戶 ID
function getCurrentUserId(){
  const user = auth.currentUser;
  return user ? user.uid : 'guest';
}

// 取得用戶資料的 Firestore 路徑
function getUserDocRef(){
  const userId = getCurrentUserId();
  return firebase.firestore().collection('users').doc(userId);
}

// 從 Firestore 載入用戶資料
async function loadUserDataFromFirestore(){
  const user = auth.currentUser;
  if(!user || state.isGuest) return;
  
  try {
    const docRef = getUserDocRef();
    const doc = await docRef.get();
    
    // 設定當前用戶 ID
    DB.currentUser = user.uid;
    
    if(doc.exists){
      const data = doc.data();
      DB.projects = data.projects || [];
      DB.backlogItems = data.backlogItems || [];
      DB.meetings = data.meetings || [];
      DB.todos = data.todos || [];
      DB.chats = data.chats || {};
      DB.members = data.members || [];
      DB.trash = data.trash || [];
      DB.dismissedBacklogs = data.dismissedBacklogs || [];
    } else {
      // 新用戶，初始化空白資料
      DB.projects = [];
      DB.backlogItems = [];
      DB.meetings = [];
      DB.todos = [];
      DB.chats = {};
      DB.members = [];
      DB.trash = [];
      DB.dismissedBacklogs = [];
      await saveUserDataToFirestore();
    }
    
    persist();
    setupRealtimeListeners();
  } catch (error) {
    console.error('載入用戶資料失敗:', error);
  }
}

// 儲存用戶資料到 Firestore
async function saveUserDataToFirestore(){
  const user = auth.currentUser;
  if(!user || state.isGuest) return;
  
  try {
    const docRef = getUserDocRef();
    await docRef.set({
      projects: DB.projects,
      backlogItems: DB.backlogItems,
      meetings: DB.meetings,
      todos: DB.todos,
      chats: DB.chats,
      members: DB.members,
      trash: DB.trash,
      dismissedBacklogs: DB.dismissedBacklogs,
      email: user.email,
      displayName: user.displayName,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('儲存用戶資料失敗:', error);
  }
}

// 自動同步到 Firestore
let syncTimeout = null;
let isLocalWrite = false;
let memberUnsubscibes = [];

function autoSync(){
  if(syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    isLocalWrite = true;
    await saveUserDataToFirestore();
    setTimeout(()=>{ isLocalWrite = false; }, 500);
  }, 1000); // 1秒後自動同步
}

// ===== 即時同步：监听自己和成員的文件 =====
function setupRealtimeListeners(){
  const user = auth.currentUser;
  if(!user || state.isGuest) return;

  // 1. 監聽自己的文件
  firebase.firestore().collection('users').doc(user.uid)
    .onSnapshot({ includeMetadataChanges: true }, (snap) => {
      if(snap.metadata.fromCache) return;
      const data = snap.data();
      if(!data) return;

      const before = JSON.stringify(DB.projects);

      if(data.projects){
        const incoming = data.projects;
        const local = DB.projects;
        const merged = [];
        const localMap = {};
        local.forEach(p => { localMap[p.id] = p; });

        for(const ip of incoming){
          const lp = localMap[ip.id];
          if(!lp){
            merged.push(ip);
          } else {
            const localTime = new Date(lp.updatedAt||0).getTime();
            const incomingTime = new Date(ip.updatedAt||0).getTime();
            merged.push(incomingTime > localTime ? ip : lp);
          }
        }
        DB.projects = merged;
      }

      if(data.todos) DB.todos = data.todos;
      if(data.meetings) DB.meetings = data.meetings;
      if(data.backlogItems) DB.backlogItems = data.backlogItems;
      if(data.trash) DB.trash = data.trash;
      if(data.dismissedBacklogs) DB.dismissedBacklogs = data.dismissedBacklogs;
      if(data.members){
        const prevMembers = JSON.stringify(DB.members.map(m=>({id:m.id,status:m.status})));
        DB.members = data.members;
        const newMembers = JSON.stringify(DB.members.map(m=>({id:m.id,status:m.status})));
        if(prevMembers !== newMembers) setupMemberListeners();
      }

      const after = JSON.stringify(DB.projects);
      if(before !== after){
        persist();
        render();
      }
    });

  // 2. 監聽已接受的成員文件（同步共用專案）
  setupMemberListeners();
}

function setupMemberListeners(){
  memberUnsubscibes.forEach(unsub => unsub());
  memberUnsubscibes = [];

  const user = auth.currentUser;
  if(!user || state.isGuest) return;

  const acceptedMembers = DB.members.filter(m => m.status === 'accepted' && m.id);
  for(const member of acceptedMembers){
    const unsub = firebase.firestore().collection('users').doc(member.id)
      .onSnapshot({ includeMetadataChanges: true }, (snap) => {
        if(snap.metadata.fromCache) return;
        const data = snap.data();
        if(!data || !data.projects) return;

        const before = JSON.stringify(DB.projects);

        const myIds = new Set(DB.projects.map(p => p.id));
        for(const mp of data.projects){
          if(myIds.has(mp.id)){
            const local = DB.projects.find(p => p.id === mp.id);
            const localTime = new Date(local?.updatedAt||0).getTime();
            const incomingTime = new Date(mp.updatedAt||0).getTime();
            if(incomingTime > localTime){
              Object.assign(local, mp);
            }
          } else {
            DB.projects.push(mp);
          }
        }

        const after = JSON.stringify(DB.projects);
        if(before !== after){
          persist();
          render();
        }
      });
    memberUnsubscibes.push(unsub);
  }
}

// 從團隊同步成員列表
async function syncTeamMembers(){
  const user = auth.currentUser;
  if(!user || state.isGuest) return;
  
  try {
    // 查詢所有用戶，找有邀請過我的人
    const usersSnapshot = await firebase.firestore().collection('users').get();
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      const myEntry = userData.members && userData.members.find(m => m.email === user.email);
      
      if(myEntry){
        // 這個用戶邀請過我
        // 如果對方邀請我的狀態是 accepted，我這邊也要是 accepted
        // 如果對方邀請我的狀態是 pending，我這邊也應該是 pending
        const targetStatus = myEntry.status === 'accepted' ? 'accepted' : 'pending';
        
        // 檢查是否已存在
        const existingMember = DB.members.find(m => m.email === userData.email);
        if(!existingMember){
          // 新增到我的成員列表
          DB.members.push({
            id: doc.id,
            name: userData.displayName || userData.email.split('@')[0],
            email: userData.email,
            color: '#9AABB8',
            status: targetStatus
          });
          persist();
        } else if(existingMember.status !== targetStatus){
          // 更新狀態（如果對方改了狀態，我這邊也要更新）
          existingMember.status = targetStatus;
          persist();
        }
        
        // 同時把我加入對方的成員列表（如果還沒有的話）
        if(!myEntry){
          const myMember = {
            id: user.uid,
            name: user.displayName || user.email.split('@')[0],
            email: user.email,
            color: '#C4A4A4',
            status: 'pending'
          };
          
          const otherMembers = userData.members || [];
          if(!otherMembers.find(m => m.email === user.email)){
            otherMembers.push(myMember);
            const otherUserRef = firebase.firestore().collection('users').doc(doc.id);
            otherUserRef.update({ members: otherMembers });
          }
        }
      }
    });
    
    // 儲存到 Firestore
    await saveUserDataToFirestore();
  } catch (error) {
    console.error('同步團隊成員失敗:', error);
  }
}

function uid(){return '_'+Math.random().toString(36).slice(2,10);}
function todayStr(){return new Date().toISOString().slice(0,10);}

function initDB(){
  const raw=localStorage.getItem('jianban_db');
  if(raw){
    try{
      Object.assign(DB,JSON.parse(raw));
      // 確保必要欄位存在
      if(!DB.meetings) DB.meetings = [];
      if(!DB.backlogItems) DB.backlogItems = [];
      if(!DB.todos) DB.todos = [];
      if(!DB.projects) DB.projects = [];
      if(!DB.members) DB.members = [];
      if(!DB.trash) DB.trash = [];
      if(!DB.dismissedBacklogs) DB.dismissedBacklogs = [];
    }catch(e){}
  }
}

// ===== 通用垃圾桶系統 =====
const TRASH_TYPES = {
  todo: {label:'待辦任務', icon:'checkSquare'},
  project: {label:'專案', icon:'folder'},
  doc: {label:'文件', icon:'file'},
  kcard: {label:'看板卡片', icon:'kanban'},
  meeting: {label:'會議記錄', icon:'fileText'},
  backlog: {label:'需求池項目', icon:'lightbulb'},
  ufnodes: {label:'Userflow 節點', icon:'gitBranch'},
  wfelement: {label:'Wireframe 元素', icon:'image'},
  gantttask: {label:'甘特圖任務', icon:'barChart'},
};

// 把任意項目丟進垃圾桶
function trashItem(type, item, extra){
  if(!Array.isArray(DB.trash)) DB.trash = [];
  const trashed = {
    ...item,
    _trashType: type,
    _extra: extra || {},
    deletedAt: new Date().toISOString(),
    deletedBy: DB.currentUser
  };
  DB.trash.push(trashed);
  persist();
}

// 從垃圾桶還原（通用）
function restoreFromTrash(id){
  const t = DB.trash.find(x=>x.id===id);
  if(!t) return;
  DB.trash = DB.trash.filter(x=>x.id!==id);
  const restored = {...t};
  delete restored.deletedAt;
  delete restored.deletedBy;
  delete restored._trashType;
  delete restored._extra;

  const type = t._trashType;
  if(type==='todo'){
    if(!Array.isArray(DB.todos)) DB.todos = [];
    if(!DB.todos.find(x=>x.id===restored.id)) DB.todos.push(restored);
  } else if(type==='project'){
    if(!Array.isArray(DB.projects)) DB.projects = [];
    if(!DB.projects.find(x=>x.id===restored.id)) DB.projects.push(restored);
  } else if(type==='doc'){
    const p = DB.projects.find(x=>x.id===t._extra.projectId);
    if(p && p.docs && !p.docs.find(x=>x.id===restored.id)) p.docs.push(restored);
  } else if(type==='kcard'){
    const p = DB.projects.find(x=>x.id===t._extra.projectId);
    const d = p && p.docs.find(x=>x.id===t._extra.docId);
    if(d && d.cards && !d.cards.find(x=>x.id===restored.id)) d.cards.push(restored);
    // 還原連結的 todo
    if(restored.todoId){
      if(!Array.isArray(DB.todos)) DB.todos = [];
      if(!DB.todos.find(x=>x.id===restored.todoId)){
        const todoData = {id:restored.todoId, title:restored.title, status:'pending', assignee:'', assignedBy:DB.currentUser, projectId:t._extra.projectId||'', date:restored.due||'', note:restored.note||'', attachments:[], colorTag:''};
        DB.todos.push(todoData);
      }
    }
  } else if(type==='meeting'){
    if(!Array.isArray(DB.meetings)) DB.meetings = [];
    if(!DB.meetings.find(x=>x.id===restored.id)) DB.meetings.push(restored);
  } else if(type==='backlog'){
    if(!Array.isArray(DB.backlogItems)) DB.backlogItems = [];
    if(!DB.backlogItems.find(x=>x.id===restored.id)) DB.backlogItems.push(restored);
    // 從 dismissed 移除
    if(Array.isArray(DB.dismissedBacklogs)) DB.dismissedBacklogs = DB.dismissedBacklogs.filter(x=>x!==restored.id);
  } else if(type==='ufnodes'){
    const p = DB.projects.find(x=>x.id===t._extra.projectId);
    const d = p && p.docs.find(x=>x.id===t._extra.docId);
    if(d && d.nodes && !d.nodes.find(x=>x.id===restored.id)) d.nodes.push(restored);
    // 還原相關 edges
    if(t._extra.edges && d && d.edges){
      for(const e of t._extra.edges){
        if(!d.edges.find(x=>x.from===e.from && x.to===e.to)) d.edges.push(e);
      }
    }
  } else if(type==='wfelement'){
    const p = DB.projects.find(x=>x.id===t._extra.projectId);
    const d = p && p.docs.find(x=>x.id===t._extra.docId);
    if(d && d.elements && !d.elements.find(x=>x.id===restored.id)) d.elements.push(restored);
  } else if(type==='gantttask'){
    const p = DB.projects.find(x=>x.id===t._extra.projectId);
    const d = p && p.docs.find(x=>x.id===t._extra.docId);
    if(d && d.tasks && !d.tasks.find(x=>x.id===restored.id)) d.tasks.push(restored);
  }

  persist();
  render();
  toast('已還原');
}

function persist(){
  localStorage.setItem('jianban_db',JSON.stringify(DB));
  autoSync();
}

initDB();