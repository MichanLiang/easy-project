/* ================= CHAT ================= */
let chatUnsubscribe = null;

function viewChat(){
  const user = auth.currentUser;
  const contacts = DB.members.filter(m => m.id !== DB.currentUser);
  
  if(!state.chatContact && contacts.length) {
    state.chatContact = contacts[0].id;
  }
  
  setTimeout(() => {
    initIcons();
    if(state.chatContact) loadChatMessages(state.chatContact);
  }, 10);
  
  return `
  <div class="page-title">聊天室</div>
  <div class="page-sub">與團隊成員即時溝通</div>
  <div class="chat-wrap">
    <div class="chat-list">
      ${contacts.map(c => `
        <div class="chat-contact ${state.chatContact === c.id ? 'active' : ''}" onclick="selectChatContact('${c.id}')">
          ${avatarHTML(c.id, 36)}
          <div style="flex:1;min-width:0;">
            <div class="cn">${escapeHTML(c.name)}</div>
            <div style="font-size:11px;color:var(--ink-faint);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.email || ''}</div>
          </div>
          <div id="unread-${c.id}" style="display:none;width:8px;height:8px;border-radius:50%;background:var(--accent);"></div>
        </div>`).join('')}
      ${contacts.length === 0 ? '<div class="empty" style="padding:20px;">尚無成員</div>' : ''}
    </div>
    <div class="chat-main">
      <div class="chat-head">
        ${state.chatContact ? memberName(state.chatContact) : '選擇聯絡人'}
      </div>
      <div class="chat-msgs" id="chatMsgs">
        <div class="empty">選擇聯絡人開始對話</div>
      </div>
      <div class="chat-input">
        <input type="text" id="chatInputBox" placeholder="輸入訊息…" onkeydown="if(event.key==='Enter')sendChatMsg()">
        <button class="btn btn-primary" onclick="sendChatMsg()">
          <span class="icon">${getIcon('send')}</span>
          傳送
        </button>
      </div>
    </div>
  </div>`;
}

function selectChatContact(id){
  state.chatContact = id;
  render();
}

// 取得聊天室 ID（確保兩人之間只有一個聊天室）
function getChatRoomId(userId1, userId2){
  return [userId1, userId2].sort().join('_');
}

// 載入聊天訊息
function loadChatMessages(contactId){
  const user = auth.currentUser;
  if(!user || state.isGuest) {
    // 訪客模式使用本地資料
    renderLocalMessages(contactId);
    return;
  }
  
  const chatRoomId = getChatRoomId(user.uid, contactId);
  const chatMsgs = document.getElementById('chatMsgs');
  if(!chatMsgs) return;
  
  // 取消之前的監聽
  if(chatUnsubscribe) chatUnsubscribe();
  
  // 監聽 Firestore 訊息
  chatUnsubscribe = firebase.firestore()
    .collection('chatRooms')
    .doc(chatRoomId)
    .collection('messages')
    .orderBy('createdAt', 'asc')
    .onSnapshot(snapshot => {
      const messages = [];
      snapshot.forEach(doc => messages.push({id: doc.id, ...doc.data()}));
      
      chatMsgs.innerHTML = messages.length 
        ? messages.map(m => `
          <div class="msg ${m.senderId === user.uid ? 'me' : ''}">
            ${escapeHTML(m.text)}
            <div class="t">${formatTime(m.createdAt)}</div>
          </div>`).join('')
        : '<div class="empty">開始你們的對話吧</div>';
      
      chatMsgs.scrollTop = chatMsgs.scrollHeight;
    }, error => {
      console.error('載入訊息失敗:', error);
      renderLocalMessages(contactId);
    });
}

// 本地模式載入訊息
function renderLocalMessages(contactId){
  const chatMsgs = document.getElementById('chatMsgs');
  if(!chatMsgs) return;
  
  const thread = DB.chats[contactId] || [];
  chatMsgs.innerHTML = thread.length
    ? thread.map(m => `
      <div class="msg ${m.from === 'me' ? 'me' : ''}">
        ${escapeHTML(m.text)}
        <div class="t">${m.time}</div>
      </div>`).join('')
    : '<div class="empty">開始你們的對話吧</div>';
  
  chatMsgs.scrollTop = chatMsgs.scrollHeight;
}

// 格式化時間
function formatTime(timestamp){
  if(!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
}

// 傳送訊息
async function sendChatMsg(){
  const box = document.getElementById('chatInputBox');
  const text = box.value.trim();
  if(!text || !state.chatContact) return;
  
  const user = auth.currentUser;
  
  if(!user || state.isGuest) {
    // 訪客模式
    sendLocalMessage(text);
  } else {
    // Firebase 模式
    await sendFirebaseMessage(text);
  }
  
  box.value = '';
}

// 本地模式傳訊息
function sendLocalMessage(text){
  const contactId = state.chatContact;
  if(!DB.chats[contactId]) DB.chats[contactId] = [];
  
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  
  DB.chats[contactId].push({from: 'me', text, time});
  persist();
  renderLocalMessages(contactId);
}

// Firebase 模式傳訊息
async function sendFirebaseMessage(text){
  const user = auth.currentUser;
  const chatRoomId = getChatRoomId(user.uid, state.chatContact);
  
  try {
    // 確保聊天室存在
    const chatRoomRef = firebase.firestore().collection('chatRooms').doc(chatRoomId);
    const chatRoomDoc = await chatRoomRef.get();
    
    if(!chatRoomDoc.exists){
      await chatRoomRef.set({
        participants: [user.uid, state.chatContact],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastMessage: text,
        lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    
    // 添加訊息
    await chatRoomRef.collection('messages').add({
      senderId: user.uid,
      senderName: user.displayName || '使用者',
      text: text,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // 更新聊天室最後訊息
    await chatRoomRef.update({
      lastMessage: text,
      lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
  } catch (error) {
    console.error('傳送訊息失敗:', error);
    toast('傳送失敗');
  }
}

function scrollChatBottom(){
  const el = document.getElementById('chatMsgs');
  if(el) el.scrollTop = el.scrollHeight;
}

// 離開時取消監聽
window.addEventListener('beforeunload', () => {
  if(chatUnsubscribe) chatUnsubscribe();
});