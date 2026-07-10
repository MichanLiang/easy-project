/* ================= Firebase Auth System ================= */

// 全域使用者資訊
let currentUser = null;
let authStateListener = null;

// 初始化認證系統
function initAuth() {
  // 設置監聽器
  authStateListener = auth.onAuthStateChanged(async (user) => {
    // 標記已初始化
    markInitialized();
    
    if (user && localStorage.getItem('jianban_logged_in') === 'true') {
      // 已登入且有標記
      currentUser = {
        uid: user.uid,
        displayName: user.displayName || '使用者',
        email: user.email,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified
      };
      
      // 只有非訪客模式才更新狀態
      if(!state.isGuest) {
        state.isLoggedIn = true;
        state.isGuest = false;
        state.route = 'projects'; // 確保在專案管理頁面
        
        // 儲存使用者基本資料到 Firestore
        await saveUserBasicInfo(user);
        
        // 從 Firestore 載入用戶資料
        await loadUserDataFromFirestore();
        
        // 從團隊同步成員
        await syncTeamMembers();
        
        // 從其他成員處載入共享專案
        await loadProjectsFromMembers();
        
        // 重新渲染
        render();
      }
      
      console.log('使用者已登入:', user.displayName);
    }
  });
}

// 儲存使用者基本資料到 Firestore
async function saveUserBasicInfo(user) {
  try {
    const userRef = firebase.firestore().collection('users').doc(user.uid);
    const doc = await userRef.get();
    
    if (!doc.exists) {
      // 新用戶，建立基本資料
      await userRef.set({
        displayName: user.displayName || '使用者',
        email: user.email,
        photoURL: user.photoURL,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
        // 空白初始資料
        projects: [],
        backlogItems: [],
        meetings: [],
        todos: [],
        chats: {},
        members: []
      });
    } else {
      // 舊用戶，更新登入時間
      await userRef.update({
        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
        displayName: user.displayName || doc.data().displayName,
        photoURL: user.photoURL || doc.data().photoURL
      });
    }
  } catch (error) {
    console.error('儲存使用者資料失敗:', error);
  }
}

// 取得首字母
function getInitials(name) {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
}

// 頁面載入時初始化
document.addEventListener('DOMContentLoaded', () => {
  // 載入 Firebase SDK 後初始化
  if (typeof firebase !== 'undefined' && firebase.auth) {
    initAuth();
  } else {
    // 如果 Firebase 還沒載入，先標記已初始化
    setTimeout(() => {
      if(!isInitialized) markInitialized();
    }, 2000);
  }
});