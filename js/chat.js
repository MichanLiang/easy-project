/* ================= CHAT ================= */
let chatUnsubscribe = null;

function viewChat(){
  const user = auth.currentUser;
  const contacts = DB.members.filter(m => m.id !== user?.uid);
  
  if(!state.chatContact && contacts.length) {
    state.chatContact = contacts[0].id;
  }
  
  setTimeout(() => {
    initIcons();
    if(state.chatContact) loadChatMessages(state.chatContact);
  }, 10);

  const groups = (DB.chatGroups || []);
  
  return `
  <div class="page-title">聊天室</div>
  <div class="page-sub">與團隊成員即時溝通</div>
  <div class="chat-wrap">
    <div class="chat-list">
      <div style="padding:8px 12px;border-bottom:1px solid var(--line);">
        <button class="btn btn-sm btn-primary" onclick="openCreateGroupModal()" style="width:100%;">
          <span class="icon">${getIcon('plus')}</span>
          建立群組
        </button>
      </div>
      ${groups.map(g => `
        <div class="chat-contact ${state.chatContact === 'group:'+g.id ? 'active' : ''}" onclick="selectChatContact('group:${g.id}')">
          <div class="avatar" style="width:36px;height:36px;background:var(--purple);font-size:12px;display:flex;align-items:center;justify-content:center;border-radius:50%;">
            <span class="icon" style="width:16px;height:16px;">${getIcon('users')}</span>
          </div>
          <div style="flex:1;min-width:0;">
            <div class="cn">${escapeHTML(g.name)}</div>
            <div style="font-size:11px;color:var(--ink-faint);">${g.memberIds.length} 位成員</div>
          </div>
        </div>`).join('')}
      ${contacts.map(c => `
        <div class="chat-contact ${state.chatContact === c.id ? 'active' : ''}" onclick="selectChatContact('${c.id}')">
          ${avatarHTML(c.id, 36)}
          <div style="flex:1;min-width:0;">
            <div class="cn">${escapeHTML(c.name)}</div>
            <div style="font-size:11px;color:var(--ink-faint);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              ${c.status === 'pending' ? '<span style="color:var(--amber);">等待中</span>' : (c.email || '')}
            </div>
          </div>
          <div id="unread-${c.id}" style="display:none;width:8px;height:8px;border-radius:50%;background:var(--accent);"></div>
        </div>`).join('')}
      ${contacts.length === 0 && groups.length === 0 ? '<div class="empty" style="padding:20px;">尚無成員，請先邀請</div>' : ''}
    </div>
    <div class="chat-main">
      <div class="chat-head">
        ${getChatDisplayName()}
      </div>
      <div class="chat-msgs" id="chatMsgs">
        <div class="empty">選擇聯絡人開始對話</div>
      </div>
      <div class="chat-reply-bar" id="chatReplyBar" style="display:none;padding:8px 14px;background:var(--bg-subtle);border-top:1px solid var(--line);font-size:13px;display:none;align-items:center;gap:8px;">
        <span style="color:var(--accent);font-weight:600;">回覆：</span>
        <span id="chatReplyText" style="flex:1;color:var(--ink-soft);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></span>
        <button class="btn-ghost btn-icon btn-sm" onclick="cancelReply()">
          <span class="icon">${getIcon('x')}</span>
        </button>
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

function getChatDisplayName(){
  if(!state.chatContact) return '選擇聯絡人';
  if(state.chatContact.startsWith('group:')){
    const gId = state.chatContact.slice(6);
    const g = (DB.chatGroups||[]).find(x=>x.id===gId);
    return g ? g.name : '群組';
  }
  return memberName(state.chatContact);
}

function isGroupChat(){
  return state.chatContact && state.chatContact.startsWith('group:');
}

function getGroupChatId(){
  return state.chatContact ? state.chatContact.slice(6) : '';
}

function openCreateGroupModal(){
  const user = auth.currentUser;
  const contacts = DB.members.filter(m => m.id !== user?.uid && m.status === 'accepted');
  openModal(`
    <div class="modal-head"><h3>建立群組</h3></div>
    <div class="modal-body">
      <div class="field"><label>群組名稱</label><input type="text" id="grpName" placeholder="例如：前端開發組"></div>
      <div class="field"><label>選擇成員</label>
        <div class="member-pick" id="grpMembers">
          ${contacts.map(m=>`<div class="mchip" data-id="${m.id}" onclick="toggleChip(this)">${avatarHTML(m.id,22)} ${m.name}</div>`).join('')}
        </div>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="createGroupChat()">
        <span class="icon">${getIcon('plus')}</span>
        建立
      </button>
    </div>
  `);
  setTimeout(initIcons, 10);
}

function createGroupChat(){
  const user = auth.currentUser;
  const name = document.getElementById('grpName').value.trim();
  if(!name){ toast('請輸入群組名稱'); return; }
  const memberIds = Array.from(document.querySelectorAll('#grpMembers .mchip.on')).map(el=>el.dataset.id);
  if(memberIds.length === 0){ toast('請至少選擇一位成員'); return; }
  memberIds.push(user.uid); // 加入自己

  const groupId = uid();
  if(!DB.chatGroups) DB.chatGroups = [];
  DB.chatGroups.push({id:groupId, name, memberIds});
  persist();
  closeModal();
  state.chatContact = 'group:' + groupId;
  render();
}

function selectChatContact(id){
  state.chatContact = id;
  state.replyTo = null;
  render();
}

let replyToMsg = null;

function setReplyTo(msgId, msgText, senderName){
  replyToMsg = {id: msgId, text: msgText, sender: senderName};
  const bar = document.getElementById('chatReplyBar');
  const textEl = document.getElementById('chatReplyText');
  if(bar && textEl){
    bar.style.display = 'flex';
    textEl.textContent = msgText.slice(0, 60) + (msgText.length > 60 ? '…' : '');
  }
}

function cancelReply(){
  replyToMsg = null;
  const bar = document.getElementById('chatReplyBar');
  if(bar) bar.style.display = 'none';
}

function recallMessage(msgId){
  if(!confirm('確定要收回這則訊息嗎？')) return;
  const user = auth.currentUser;
  if(!user || state.isGuest) return;
  
  const chatRoomId = isGroupChat() ? getGroupChatId() : getChatRoomId(user.uid, state.chatContact);
  firebase.firestore()
    .collection('chatRooms')
    .doc(chatRoomId)
    .collection('messages')
    .doc(msgId)
    .update({ recalled: true, text: '（訊息已收回）' })
    .then(() => toast('已收回'))
    .catch(e => console.error('收回訊息失敗:', e));
}

function getChatRoomId(userId1, userId2){
  return [userId1, userId2].sort().join('_');
}

function loadChatMessages(contactId){
  const user = auth.currentUser;
  if(!user || state.isGuest) {
    renderLocalMessages(contactId);
    return;
  }
  
  let chatRoomId;
  if(contactId.startsWith('group:')){
    chatRoomId = contactId.slice(6);
  } else {
    chatRoomId = getChatRoomId(user.uid, contactId);
  }
  
  const chatMsgs = document.getElementById('chatMsgs');
  if(!chatMsgs) return;
  
  if(chatUnsubscribe) chatUnsubscribe();
  
  chatUnsubscribe = firebase.firestore()
    .collection('chatRooms')
    .doc(chatRoomId)
    .collection('messages')
    .orderBy('createdAt', 'asc')
    .onSnapshot(snapshot => {
      const messages = [];
      snapshot.forEach(doc => messages.push({id: doc.id, ...doc.data()}));
      
      chatMsgs.innerHTML = messages.length 
        ? messages.map(m => {
            const isMe = m.senderId === user.uid;
            const isRecalled = m.recalled;
            const senderLabel = isMe ? '' : `<span style="font-size:11px;color:var(--accent);font-weight:600;display:block;margin-bottom:2px;">${escapeHTML(m.senderName||'')}</span>`;
            const replyHtml = m.replyTo ? `<div style="font-size:11px;color:var(--accent);margin-bottom:4px;padding:4px 8px;background:var(--accent-soft);border-radius:4px;border-left:3px solid var(--accent);">↩ ${escapeHTML(m.replyTo.sender)}：${escapeHTML(m.replyTo.text.slice(0,50))}${m.replyTo.text.length>50?'…':''}</div>` : '';
            return `
            <div class="msg ${isMe ? 'me' : ''}" style="${isRecalled?'opacity:0.5;font-style:italic;':''}">
              ${senderLabel}
              ${replyHtml}
              ${escapeHTML(m.text)}
              <div class="t">
                ${formatTime(m.createdAt)}
                ${isMe && !isRecalled ? `<span style="cursor:pointer;margin-left:8px;opacity:0.6;" onclick="event.stopPropagation();recallMessage('${m.id}')" title="收回訊息">✕</span>` : ''}
                ${!isMe && !isRecalled ? `<span style="cursor:pointer;margin-left:8px;opacity:0.6;" onclick="event.stopPropagation();setReplyTo('${m.id}','${escapeHTML(m.text).replace(/'/g,"\\'")}','${escapeHTML(m.senderName||'').replace(/'/g,"\\'")}')" title="回覆">↩</span>` : ''}
              </div>
            </div>`;
          }).join('')
        : '<div class="empty">開始你們的對話吧</div>';
      
      chatMsgs.scrollTop = chatMsgs.scrollHeight;
    }, error => {
      console.error('載入訊息失敗:', error);
      renderLocalMessages(contactId);
    });
}

function renderLocalMessages(contactId){
  const chatMsgs = document.getElementById('chatMsgs');
  if(!chatMsgs) return;
  
  const thread = DB.chats[contactId] || [];
  chatMsgs.innerHTML = thread.length
    ? thread.map((m,i) => `
      <div class="msg ${m.from === 'me' ? 'me' : ''}">
        ${m.replyTo ? `<div style="font-size:11px;color:var(--accent);margin-bottom:4px;padding:4px 8px;background:var(--accent-soft);border-radius:4px;border-left:3px solid var(--accent);">↩ ${escapeHTML(m.replyTo.sender)}：${escapeHTML(m.replyTo.text.slice(0,50))}${m.replyTo.text.length>50?'…':''}</div>` : ''}
        ${m.recalled ? '<em>（訊息已收回）</em>' : escapeHTML(m.text)}
        <div class="t">${m.time}</div>
      </div>`).join('')
    : '<div class="empty">開始你們的對話吧</div>';
  
  chatMsgs.scrollTop = chatMsgs.scrollHeight;
}

function formatTime(timestamp){
  if(!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
}

async function sendChatMsg(){
  const box = document.getElementById('chatInputBox');
  const text = box.value.trim();
  if(!text || !state.chatContact) return;
  
  const user = auth.currentUser;
  
  if(!isGroupChat()){
    const contact = DB.members.find(m => m.id === state.chatContact);
    if(contact && contact.status === 'pending'){
      toast('對方尚未接受邀請，無法傳送訊息');
      return;
    }
  }
  
  if(!user || state.isGuest) {
    sendLocalMessage(text);
  } else {
    await sendFirebaseMessage(text);
  }
  
  box.value = '';
  cancelReply();
}

function sendLocalMessage(text){
  const contactId = state.chatContact;
  if(!DB.chats[contactId]) DB.chats[contactId] = [];
  
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  
  const msg = {from: 'me', text, time};
  if(replyToMsg) msg.replyTo = {sender: '我', text: replyToMsg.text};
  
  DB.chats[contactId].push(msg);
  persist();
  renderLocalMessages(contactId);
}

async function sendFirebaseMessage(text){
  const user = auth.currentUser;
  let chatRoomId;
  
  if(isGroupChat()){
    chatRoomId = getGroupChatId();
  } else {
    chatRoomId = getChatRoomId(user.uid, state.chatContact);
  }
  
  try {
    const chatRoomRef = firebase.firestore().collection('chatRooms').doc(chatRoomId);
    const chatRoomDoc = await chatRoomRef.get();
    
    if(!chatRoomDoc.exists){
      const participants = isGroupChat()
        ? (DB.chatGroups||[]).find(g=>g.id===chatRoomId)?.memberIds || [user.uid]
        : [user.uid, state.chatContact];
      await chatRoomRef.set({
        participants,
        isGroup: isGroupChat(),
        groupName: isGroupChat() ? ((DB.chatGroups||[]).find(g=>g.id===chatRoomId)?.name||'') : '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastMessage: text,
        lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    
    const msgData = {
      senderId: user.uid,
      senderName: user.displayName || '使用者',
      text: text,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if(replyToMsg){
      msgData.replyTo = {
        id: replyToMsg.id,
        sender: replyToMsg.sender,
        text: replyToMsg.text
      };
    }
    
    await chatRoomRef.collection('messages').add(msgData);
    
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

window.addEventListener('beforeunload', () => {
  if(chatUnsubscribe) chatUnsubscribe();
});
