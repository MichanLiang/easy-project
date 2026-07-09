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
      
      // 儲存使用者資料到 Firestore
      saveUserToFirestore(user);
      
      // 載入使用者資料
      loadUserData(user.uid);
      
      // 同步成員列表
      syncMemberList(user);
      
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

// 儲存使用者資料到 Firestore
async function saveUserToFirestore(user) {
  try {
    const userRef = firebase.firestore().collection('users').doc(user.uid);
    const doc = await userRef.get();
    
    if (!doc.exists) {
      await userRef.set({
        displayName: user.displayName || '使用者',
        email: user.email,
        photoURL: user.photoURL,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else {
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

// 載入使用者資料
async function loadUserData(uid) {
  try {
    const doc = await firebase.firestore().collection('users').doc(uid).get();
    if (doc.exists) {
      console.log('載入使用者資料:', doc.data());
    }
  } catch (error) {
    console.error('載入使用者資料失敗:', error);
  }
}

// 同步成員列表（新用戶註冊時自動加入）
async function syncMemberList(user) {
  try {
    // 先從 Firestore 載入成員
    await loadMembersFromFirestore();
    
    // 檢查是否已在成員列表中
    const existingMember = DB.members.find(m => m.email === user.email);
    
    if (existingMember) {
      // 更新現有成員的 ID 為 Firebase UID
      if (existingMember.id !== user.uid) {
        const oldId = existingMember.id;
        existingMember.id = user.uid;
        existingMember.isPending = false;
        
        // 更新相關資料中的 ID
        DB.todos.forEach(t => {
          if (t.assignee === oldId) t.assignee = user.uid;
          if (t.assignedBy === oldId) t.assignedBy = user.uid;
        });
        
        persist();
      }
    } else {
      // 新成員，加入列表
      const colors = ['#C4A4A4', '#9AABB8', '#A8B5A0', '#B8A9C9', '#C9B896', '#C4A882'];
      const newMember = {
        id: user.uid,
        name: user.displayName || user.email.split('@')[0],
        email: user.email,
        color: colors[DB.members.length % colors.length],
        isPending: false
      };
      
      DB.members.push(newMember);
      persist();
    }
    
    // 同步到 Firestore
    await syncMembersToFirestore();
    
  } catch (error) {
    console.error('同步成員列表失敗:', error);
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