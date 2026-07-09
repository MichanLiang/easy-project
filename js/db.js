/* ================= DB ================= */
// 全域資料
let DB={
  currentUser:'user1',
  members:[],
  projects:[],
  backlogItems:[],
  meetings:[],
  chats:{},
  todos:[]
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
    
    if(doc.exists){
      const data = doc.data();
      DB.projects = data.projects || [];
      DB.backlogItems = data.backlogItems || [];
      DB.meetings = data.meetings || [];
      DB.todos = data.todos || [];
      DB.chats = data.chats || {};
      DB.members = data.members || [];
    } else {
      // 新用戶，初始化空白資料
      DB.projects = [];
      DB.backlogItems = [];
      DB.meetings = [];
      DB.todos = [];
      DB.chats = {};
      DB.members = [];
      await saveUserDataToFirestore();
    }
    
    persist();
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
function autoSync(){
  if(syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    await saveUserDataToFirestore();
  }, 1000); // 1秒後自動同步
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
    }catch(e){}
  }
}

function persist(){
  localStorage.setItem('jianban_db',JSON.stringify(DB));
  autoSync();
}

initDB();