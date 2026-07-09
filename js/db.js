/* ================= DB ================= */
// 全域資料（使用 localStorage 暫存）
let DB={
  currentUser:'user1',
  members:[
    {id:'user1', name:'我', color:'#C4A4A4'}
  ],
  projects:[],
  backlogItems:[],
  meetings:[],
  chats:{},
  todos:[]
};

// Firestore 同步成員列表
async function syncMembersToFirestore(){
  const user = auth.currentUser;
  if(!user || state.isGuest) return;
  
  try {
    // 使用團隊 ID（目前用專案名稱的 hash）
    const teamId = getTeamId();
    const teamRef = firebase.firestore().collection('teams').doc(teamId);
    
    // 取得現有成員
    const teamDoc = await teamRef.get();
    const existingMembers = teamDoc.exists ? (teamDoc.data().members || []) : [];
    
    // 合併成員（避免重複）
    const memberMap = new Map();
    existingMembers.forEach(m => memberMap.set(m.id, m));
    DB.members.forEach(m => memberMap.set(m.id, m));
    
    const mergedMembers = Array.from(memberMap.values());
    
    // 儲存到 Firestore
    await teamRef.set({
      members: mergedMembers,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    // 更新本地
    DB.members = mergedMembers;
    persist();
    
  } catch (error) {
    console.error('同步成員列表失敗:', error);
  }
}

// 從 Firestore 載入成員列表
async function loadMembersFromFirestore(){
  const user = auth.currentUser;
  if(!user || state.isGuest) return;
  
  try {
    const teamId = getTeamId();
    const teamDoc = await firebase.firestore().collection('teams').doc(teamId).get();
    
    if(teamDoc.exists){
      const members = teamDoc.data().members || [];
      
      // 合併本地和遠端成員
      const memberMap = new Map();
      DB.members.forEach(m => memberMap.set(m.id, m));
      members.forEach(m => memberMap.set(m.id, m));
      
      DB.members = Array.from(memberMap.values());
      persist();
    }
  } catch (error) {
    console.error('載入成員列表失敗:', error);
  }
}

// 取得團隊 ID（根據邀請關係）
function getTeamId(){
  const user = auth.currentUser;
  if(!user) return 'default';
  
  // 使用所有成員 email 排序後組合
  const emails = DB.members
    .map(m => m.email)
    .filter(e => e)
    .sort();
  
  if(emails.length === 0) return user.uid;
  
  // 使用第一個 email 作為團隊 ID 基礎
  return emails[0].replace('@', '_at_');
}

// 離線資料（空白初始狀態）
const SEED={
  projects:[],
  backlogItems:[],
  meetings:[],
  chats:{},
  todos:[]
};

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
      if(!DB.members) DB.members = [{id:'user1', name:'我', color:'#C4A4A4'}];
    }catch(e){}
  }else{
    Object.assign(DB,SEED);
    // 確保 currentUser 存在於 members 中
    if(!DB.members.find(m=>m.id===DB.currentUser)){
      DB.members.push({id:DB.currentUser,name:'我',color:'#C4A4A4'});
    }
    persist();
  }
}

function persist(){
  localStorage.setItem('jianban_db',JSON.stringify(DB));
}

initDB();