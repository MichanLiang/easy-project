// Firebase 配置
// 請替換為你的 Firebase 專案配置
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// 初始化 Firebase
firebase.initializeApp(firebaseConfig);

// 取得 Auth 實例
const auth = firebase.auth();

// Google 登入_provider
const googleProvider = new firebase.auth.GoogleAuthProvider();