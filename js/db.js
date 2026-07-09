/* ================= DB ================= */
// 全域資料（使用 localStorage 暫存）
let DB={
  currentUser:'user1',
  members:[
    {id:'user1', name:'我', color:'#C4A4A4'}
  ],
  projects:[],
  backlogItems:[],
  meetings:[],
  chats:{},
  todos:[]
};

// Firestore 同步成員列表
async function syncMembersToFirestore(){
  const user = auth.currentUser;
  if(!user || state.isGuest) return;
  
  try {
    // 使用團隊 ID（目前用專案名稱的 hash）
    const teamId = getTeamId();
    const teamRef = firebase.firestore().collection('teams').doc(teamId);
    
    // 取得現有成員
    const teamDoc = await teamRef.get();
    const existingMembers = teamDoc.exists ? (teamDoc.data().members || []) : [];
    
    // 合併成員（避免重複）
    const memberMap = new Map();
    existingMembers.forEach(m => memberMap.set(m.id, m));
    DB.members.forEach(m => memberMap.set(m.id, m));
    
    const mergedMembers = Array.from(memberMap.values());
    
    // 儲存到 Firestore
    await teamRef.set({
      members: mergedMembers,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    // 更新本地
    DB.members = mergedMembers;
    persist();
    
  } catch (error) {
    console.error('同步成員列表失敗:', error);
  }
}

// 從 Firestore 載入成員列表
async function loadMembersFromFirestore(){
  const user = auth.currentUser;
  if(!user || state.isGuest) return;
  
  try {
    const teamId = getTeamId();
    const teamDoc = await firebase.firestore().collection('teams').doc(teamId).get();
    
    if(teamDoc.exists){
      const members = teamDoc.data().members || [];
      
      // 合併本地和遠端成員
      const memberMap = new Map();
      DB.members.forEach(m => memberMap.set(m.id, m));
      members.forEach(m => memberMap.set(m.id, m));
      
      DB.members = Array.from(memberMap.values());
      persist();
    }
  } catch (error) {
    console.error('載入成員列表失敗:', error);
  }
}

// 取得團隊 ID（根據邀請關係）
function getTeamId(){
  const user = auth.currentUser;
  if(!user) return 'default';
  
  // 使用所有成員 email 排序後組合
  const emails = DB.members
    .map(m => m.email)
    .filter(e => e)
    .sort();
  
  if(emails.length === 0) return user.uid;
  
  // 使用第一個 email 作為團隊 ID 基礎
  return emails[0].replace('@', '_at_');
}

// 離線資料
const SEED={
  projects:[
    {id:'p1',name:'官網改版',desc:'重新設計公司官網',color:'#9AABB8',memberIds:['user1','user2'],docs:[
      {id:'d1',name:'專案說明',type:'prd',content:'# 官網改版\n重新設計公司官網，提升使用者體驗'},
      {id:'d2',name:'頁面流程',type:'userflow',nodes:[
        {id:'n1',label:'首頁',x:80,y:60,w:140,h:56,shape:'round'},
        {id:'n2',label:'產品列表',x:80,y:180,w:140,h:56,shape:'round'},
        {id:'n3',label:'產品詳情',x:300,y:180,w:140,h:56,shape:'round'},
        {id:'n4',label:'購物車',x:300,y:300,w:140,h:56,shape:'round'},
        {id:'n5',label:'結帳',x:80,y:300,w:140,h:56,shape:'round'}
      ],edges:[
        {from:'n1',to:'n2'},{from:'n2',to:'n3'},{from:'n3',to:'n4'},{from:'n4',to:'n5'}
      ]},
      {id:'d3',name:'UI 設計',type:'wireframe',items:[
        {id:'w1',type:'box',x:20,y:20,w:360,h:60,label:'Header',color:'#E8E4E0'},
        {id:'w2',type:'box',x:20,y:100,w:160,h:200,label:'Sidebar',color:'#F4EDE4'},
        {id:'w3',type:'box',x:200,y:100,w:180,h:200,label:'Main Content',color:'#FDFBF7'},
        {id:'w4',type:'box',x:20,y:320,w:360,h:50,label:'Footer',color:'#E8E4E0'}
      ]},
      {id:'d4',name:'開發進度',type:'kanban',columns:[
        {id:'todo',name:'待處理',cards:[
          {id:'c1',title:'設計 Header',desc:'包含導覽列與 Logo',labels:['設計']},
          {id:'c2',title:'響應式適配',desc:'手機版版面調整',labels:['開發']}
        ]},
        {id:'doing',name:'進行中',cards:[
          {id:'c3',title:'首頁切版',desc:'HTML/CSS 實作',labels:['開發'],due:'2026-07-15'}
        ]},
        {id:'done',name:'已完成',cards:[
          {id:'c4',title:'需求訪談',desc:'訪談 5 位客戶',labels:['研究']}
        ]}
      ]}
    ]},
    {id:'p2',name:'App 開發',desc:'開發 iOS/Android App',color:'#C4A4A4',memberIds:['user1'],docs:[
      {id:'d5',name:'專案說明',type:'prd',content:'# App 開發\n開發跨平台行動應用程式'}
    ]}
  ],
  backlogItems:[
    {id:'b1',title:'深色模式',desc:'支援深色主題',status:'approved',votes:5,labels:['功能','UI']},
    {id:'b2',title:'多語言支援',desc:'支援英文、日文',status:'new',votes:3,labels:['功能']},
    {id:'b3',title:'匯出 PDF',desc:'可將文件匯出為 PDF',status:'new',votes:2,labels:['功能']},
    {id:'b4',title:'效能優化',desc:'提升頁面載入速度',status:'planned',votes:4,labels:['技術']}
  ],
  meetings:[
    {id:'m1',title:'產品規格確認',date:'2026-07-10',attendees:'user1, user2',content:'確認第三版 PRD 內容，調整部分功能優先順序'},
    {id:'m2',title:'UI 設計評審',date:'2026-07-12',attendees:'user1',content:'討論首頁與產品頁的設計方向'}
  ],
  todos:[
    {id:'t1',title:'審核 PRD 文件',date:'2026-07-12',status:'pending',assignee:'user1',assignedBy:'user1',projectId:'p1',note:'需在下週前完成',attachments:[{name:'PRD v3',url:'#'}]},
    {id:'t2',title:'設計 Wireframe',date:'2026-07-15',status:'doing',assignee:'user2',assignedBy:'user1',projectId:'p1',note:'',attachments:[]},
    {id:'t3',title:'訪談客戶需求',date:'2026-07-10',status:'done',assignee:'user1',assignedBy:'user1',projectId:null,note:'已完成 5 位訪談',attachments:[]}
  ]
};

function uid(){return '_'+Math.random().toString(36).slice(2,10);}
function todayStr(){return new Date().toISOString().slice(0,10);}

function initDB(){
  const raw=localStorage.getItem('jianban_db');
  if(raw){
    try{Object.assign(DB,JSON.parse(raw));}catch(e){}
  }else{
    Object.assign(DB,SEED);
    // 確保 currentUser 存在於 members 中
    if(!DB.members.find(m=>m.id===DB.currentUser)){
      DB.members.push({id:DB.currentUser,name:'我',color:'#C4A4A4'});
    }
    persist();
  }
}

function persist(){
  localStorage.setItem('jianban_db',JSON.stringify(DB));
}

initDB();