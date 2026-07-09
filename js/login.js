/* ================= LOGIN PAGE ================= */
function renderLoginPage(){
  return `
  <div id="loginPage" style="min-height:100vh;width:100%;display:flex;align-items:center;justify-content:center;background:var(--bg);padding:20px;position:fixed;top:0;left:0;right:0;bottom:0;z-index:1000;">
    <div style="max-width:380px;width:100%;">
      <!-- Logo -->
      <div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:32px;">
        <div style="width:56px;height:56px;border-radius:14px;background:linear-gradient(135deg,var(--accent) 0%,var(--accent-light) 100%);color:#fff;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:700;font-size:24px;box-shadow:0 6px 20px var(--accent-glow);">
          簡
        </div>
        <h1 style="font-family:var(--font-display);font-size:32px;font-weight:700;color:var(--ink);margin:0;">簡案</h1>
      </div>
      
      <!-- Login Card -->
      <div class="card" style="padding:36px 32px;">
        <h1 style="font-family:var(--font-display);font-size:22px;font-weight:700;color:var(--ink);margin:0 0 6px;text-align:center;">歡迎回來</h1>
        <p style="color:var(--ink-faint);font-size:14px;margin:0 0 24px;text-align:center;">登入以同步你的資料到雲端</p>
        
        <!-- Google Login Button -->
        <button onclick="handleGoogleLogin()" style="width:100%;padding:14px 20px;border:1px solid var(--line);border-radius:var(--radius);background:var(--panel);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:12px;font-size:15px;font-weight:600;color:var(--ink);transition:all var(--transition-fast);box-shadow:var(--shadow-sm);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          使用 Google 帳號登入
        </button>
        
        <div style="margin-top:20px;text-align:center;">
          <button onclick="handleGuestLogin()" style="padding:10px 20px;border:none;border-radius:var(--radius);background:transparent;cursor:pointer;font-size:14px;font-weight:500;color:var(--ink-faint);transition:all var(--transition-fast);">
            先以訪客身份使用
          </button>
        </div>
      </div>
    </div>
  </div>`;
}

// 處理 Google 登入
async function handleGoogleLogin(){
  try {
    // 確保 Firebase 已初始化
    if (typeof firebase === 'undefined' || !firebase.auth) {
      toast('Firebase 尚未載入，請稍後再試');
      return;
    }
    
    const result = await auth.signInWithPopup(googleProvider);
    const user = result.user;
    toast(`歡迎，${user.displayName}！`);
  } catch (error) {
    console.error('登入失敗:', error);
    if (error.code === 'auth/popup-blocked') {
      toast('彈出視窗被封鎖，請允許彈出視窗');
    } else if (error.code !== 'auth/popup-closed-by-user') {
      toast('登入失敗：' + error.message);
    }
  }
}

// 訪客登入（使用本地資料）
function handleGuestLogin(){
  state.isLoggedIn = true;
  state.isGuest = true;
  localStorage.setItem('jianban_guest', 'true');
  render();
}

// 登出
async function handleLogout(){
  try {
    localStorage.removeItem('jianban_guest');
    state.isGuest = false;
    state.isLoggedIn = false;
    
    if(auth.currentUser){
      await auth.signOut();
    }
    
    toast('已成功登出');
    render();
  } catch (error) {
    console.error('登出失敗:', error);
    toast('登出失敗，請稍後再試');
  }
}

// 換帳號
async function handleChangeAccount(){
  try {
    localStorage.removeItem('jianban_guest');
    state.isGuest = false;
    state.isLoggedIn = false;
    
    if(auth.currentUser){
      await auth.signOut();
    }
    
    render();
  } catch (error) {
    console.error('換帳號失敗:', error);
  }
}