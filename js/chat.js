/* ================= CHAT ================= */
function viewChat(){
  const contacts = DB.members.filter(m=>m.id!==DB.currentUser);
  if(!state.chatContact && contacts.length) state.chatContact = contacts[0].id;
  const thread = DB.chats[state.chatContact] || [];
  
  setTimeout(initIcons, 10);
  
  return `
  <div class="page-title">聊天室</div>
  <div class="page-sub">與團隊成員即時溝通、指派任務</div>
  <div class="chat-wrap">
    <div class="chat-list">
      ${contacts.map(c=>`
        <div class="chat-contact ${state.chatContact===c.id?'active':''}" onclick="selectChatContact('${c.id}')">
          ${avatarHTML(c.id,36)}
          <div><div class="cn">${c.name}</div></div>
        </div>`).join('')}
    </div>
    <div class="chat-main">
      <div class="chat-head">${state.chatContact? memberName(state.chatContact) : '選擇聯絡人'}</div>
      <div class="chat-msgs" id="chatMsgs">
        ${thread.map(m=>`<div class="msg ${m.from==='me'?'me':''}">${escapeHTML(m.text)}<div class="t">${m.time}</div></div>`).join('') || '<div class="empty">開始你們的對話吧</div>'}
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

function selectChatContact(id){ state.chatContact = id; render(); }

function sendChatMsg(){
  const box = document.getElementById('chatInputBox');
  const text = box.value.trim();
  if(!text) return;
  const cid = state.chatContact;
  if(!DB.chats[cid]) DB.chats[cid]=[];
  const now = new Date(); const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  DB.chats[cid].push({from:'me', text, time});
  persist();
  render();
  setTimeout(()=>{ document.getElementById('chatInputBox') && document.getElementById('chatInputBox').focus(); },0);
}

function scrollChatBottom(){
  const el = document.getElementById('chatMsgs');
  if(el) el.scrollTop = el.scrollHeight;
}