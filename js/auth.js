/* ================= Firebase Auth System ================= */

// 全域使用者資訊
let currentUser = null;
let authStateListener = null;

// 初始化認證系統
function initAuth() {
  // 監聽登入狀態
  authStateListener = auth.onAuthStateChanged(async (user) => {
    if (user) {
      // 已登入
      currentUser = {
        uid: user.uid,
        displayName: user.displayName || '使用者',
        email: user.email,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified
      };
      
      state.isLoggedIn = true;
      state.isGuest = false;
      
      // 儲存使用者基本資料到 Firestore
      await saveUserBasicInfo(user);
      
      // 從 Firestore 載入用戶資料
      await loadUserDataFromFirestore();
      
      // 從團隊同步成員
      await syncTeamMembers();
      
      // 重新渲染
      render();
      
      console.log('使用者已登入:', user.displayName);
    } else if (!state.isGuest) {
      // 未登入且非訪客
      currentUser = null;
      state.isLoggedIn = false;
      render();
      console.log('使用者已登出');
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
  }
});