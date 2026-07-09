/* ================= INIT ================= */
// Initial render
render();

// Initialize icons after a short delay
setTimeout(initIcons, 100);

// 當用戶登入時，從 Firestore 載入資料
firebase.auth().onAuthStateChanged(async (user) => {
  if(user && !state.isGuest){
    // 載入 Firestore 資料
    await loadTodosFromFirestore();
    await loadAssignedTasks();
    render();
  }
});