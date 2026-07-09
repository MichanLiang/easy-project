// Firebase 配置
const firebaseConfig = {
  apiKey: "AIzaSyBfW8ZSogMbUtAri4ExMqowcq-gFw2Cwa4",
  authDomain: "easy-project-d520f.firebaseapp.com",
  projectId: "easy-project-d520f",
  storageBucket: "easy-project-d520f.firebasestorage.app",
  messagingSenderId: "671655396632",
  appId: "1:671655396632:web:6b1f90d228c86b752e8a6d"
};

// 初始化 Firebase
firebase.initializeApp(firebaseConfig);

// 取得 Auth 實例
const auth = firebase.auth();

// 取得 Firestore 實例
const db = firebase.firestore();

// Google 登入_provider
const googleProvider = new firebase.auth.GoogleAuthProvider();