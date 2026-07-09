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
      
      // 更新 UI
      updateUIForLoggedInUser(user);
      
      // 載入使用者資料
      loadUserData(user.uid);
      
      console.log('使用者已登入:', user.displayName);
    } else {
      // 未登入
      currentUser = null;
      updateUIForLoggedOutUser();
      console.log('使用者已登出');
    }
  });
}

// Google 登入
async function signInWithGoogle() {
  try {
    const result = await auth.signInWithPopup(googleProvider);
    const user = result.user;
    toast(`歡迎，${user.displayName}！`);
    return user;
  } catch (error) {
    console.error('登入失敗:', error);
    if (error.code !== 'auth/popup-closed-by-user') {
      toast('登入失敗，請稍後再試');
    }
    return null;
  }
}

// 登出
async function signOut() {
  try {
    await auth.signOut();
    toast('已成功登出');
  } catch (error) {
    console.error('登出失敗:', error);
    toast('登出失敗，請稍後再試');
  }
}

// 更新 UI（已登入）
function updateUIForLoggedInUser(user) {
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const userAvatar = document.getElementById('userAvatar');
  const userName = document.getElementById('userName');
  
  if (loginBtn) loginBtn.style.display = 'none';
  if (logoutBtn) logoutBtn.style.display = 'flex';
  if (userAvatar) {
    if (user.photoURL) {
      userAvatar.innerHTML = `<img src="${user.photoURL}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    } else {
      userAvatar.innerHTML = getInitials(user.displayName || 'U');
    }
  }
  if (userName) userName.textContent = user.displayName || '使用者';
}

// 更新 UI（已登出）
function updateUIForLoggedOutUser() {
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const userAvatar = document.getElementById('userAvatar');
  const userName = document.getElementById('userName');
  
  if (loginBtn) loginBtn.style.display = 'flex';
  if (logoutBtn) logoutBtn.style.display = 'none';
  if (userAvatar) userAvatar.innerHTML = getInitials('訪客');
  if (userName) userName.textContent = '訪客';
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