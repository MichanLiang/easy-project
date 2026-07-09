/* ================= Firebase Auth System ================= */

// 全域使用者資訊
let currentUser = null;
let authStateListener = null;

// 初始化認證系統
function initAuth() {
  // 監聽登入狀態
  authStateListener = auth.onAuthStateChanged((user) => {
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
      
      // 載入使用者資料
      loadUserData(user.uid);
      
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

// 載入使用者資料
async function loadUserData(uid) {
  try {
    const doc = await firebase.firestore().collection('users').doc(uid).get();
    if (doc.exists) {
      console.log('載入使用者資料:', doc.data());
    } else {
      // 建立新使用者文件
      await firebase.firestore().collection('users').doc(uid).set({
        displayName: currentUser.displayName,
        email: currentUser.email,
        photoURL: currentUser.photoURL,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  } catch (error) {
    console.error('載入使用者資料失敗:', error);
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