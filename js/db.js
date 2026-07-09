/* ======================= 数据库操作 ======================= */
const LS_KEY = 'jianban_db_v1';

// 莫蘭迪色系
const MORANDI_COLORS = [
  '#C4A4A4', // rose
  '#9AABB8', // blue
  '#A8B5A0', // green
  '#B8A9C9', // mauve
  '#C9B896', // sand
  '#C4A882', // terracotta
  '#9CA89C', // sage
  '#C2B5B5', // dusty
];

function seedDB(){
  const meId = uid();
  const members = [
    {id:meId, name:'我', color:MORANDI_COLORS[0]},
    {id:uid(), name:'陳品心', color:MORANDI_COLORS[1]},
    {id:uid(), name:'林大宇', color:MORANDI_COLORS[2]},
    {id:uid(), name:'王小美', color:MORANDI_COLORS[3]},
  ];
  const teamId2 = members[1].id, teamId3 = members[2].id;
  const projId = uid();
  return {
    currentUser: meId,
    members,
    projects: [
      {
        id: projId, name:'日日小記錄 App', status:'進行中', memberIds:[meId, teamId2, teamId3],
        docs: [
          {id:uid(), type:'prd', name:'PRD 需求文件', goal:'做出一款簡單好上手的每日紀錄工具', background:'市面工具太複雜', value:'純中文、簡單介面', features:['每日打卡','情緒紀錄','週報表']},
          {id:uid(), type:'kanban', name:'開發看板', cards:[
            {id:uid(), title:'Google 登入串接', col:'pending', assignee:teamId2, due:todayStr(), note:'', attachments:[]},
            {id:uid(), title:'週報表頁面', col:'doing', assignee:meId, due:'', note:'', attachments:[]},
            {id:uid(), title:'手機版排版', col:'testing', assignee:teamId3, due:'', note:'', attachments:[]},
            {id:uid(), title:'首頁版型', col:'done', assignee:meId, due:'', note:'', attachments:[]},
          ]},
          {id:uid(), type:'roadmap', name:'產品路線圖', phases:[
            {id:uid(), title:'MVP', period:'6月', items:['每日紀錄','基本登入']},
            {id:uid(), title:'v1.0', period:'7月', items:['Google 登入','週月年檢視']},
            {id:uid(), title:'v2.0', period:'Q4', items:['多人協作','App 化']},
          ]},
          {id:uid(), type:'gantt', name:'開發甘特圖', tasks:[
            {id:uid(), title:'需求訪談', start: shiftDate(0), end: shiftDate(3), color:MORANDI_COLORS[0]},
            {id:uid(), title:'介面設計', start: shiftDate(3), end: shiftDate(8), color:MORANDI_COLORS[1]},
            {id:uid(), title:'開發階段', start: shiftDate(6), end: shiftDate(16), color:MORANDI_COLORS[2]},
            {id:uid(), title:'測試上線', start: shiftDate(16), end: shiftDate(20), color:MORANDI_COLORS[3]},
          ]},
          {id:uid(), type:'userflow', name:'登入流程', nodes:[
            {id:'n1', shape:'rect', x:60,y:60,w:120,h:56,text:'開啟 App'},
            {id:'n2', shape:'diamond', x:240,y:50,w:130,h:78,text:'已登入？'},
            {id:'n3', shape:'rect', x:440,y:60,w:120,h:56,text:'進入首頁'},
            {id:'n4', shape:'rect', x:240,y:200,w:130,h:56,text:'登入頁面'},
          ], edges:[{from:'n1',to:'n2'},{from:'n2',to:'n3'},{from:'n2',to:'n4'},{from:'n4',to:'n3'}]},
          {id:uid(), type:'wireframe', name:'首頁 Wireframe', elements:[
            {id:uid(), shape:'rect', x:40,y:40,w:520,h:60, text:'頂部導覽列'},
            {id:uid(), shape:'square', x:40,y:120,w:160,h:100, text:'今日紀錄'},
            {id:uid(), shape:'circle', x:230,y:120,w:100,h:100, text:'圖示'},
            {id:uid(), shape:'button', x:40,y:250,w:120,h:38, text:'開始紀錄'},
          ]},
          {id:uid(), type:'meeting', name:'第一次啟動會議', date: todayStr(), attendees:'我、陳品心、林大宇', content:'確認 MVP 範圍與時程。'},
        ]
      },
      {id:uid(), name:'英文口說練習 App', status:'完成', memberIds:[meId], docs:[]},
      {id:uid(), name:'大學選課管理系統', status:'維護', memberIds:[meId], docs:[]},
      {id:uid(), name:'團隊內部知識庫', status:'構想', memberIds:[meId, teamId3], docs:[]},
    ],
    todos: [
      {id:uid(), title:'確認 Google 登入方案', date: todayStr(), status:'doing', note:'Firebase 或自架後端？', assignee:meId, assignedBy:teamId2, projectId:projId, attachments:[]},
      {id:uid(), title:'寄送週報表設計稿', date: shiftDate(2), status:'pending', note:'', assignee:teamId2, assignedBy:meId, projectId:projId, attachments:[{name:'Figma 設計稿', url:'https://figma.com'}]},
      {id:uid(), title:'整理個人待辦', date:'', status:'pending', note:'', assignee:meId, assignedBy:meId, projectId:null, attachments:[]},
    ],
    backlogItems: [
      {id:uid(), projectId:projId, kind:'idea', title:'加入深色模式', desc:'使用者反應希望晚上使用時眼睛比較不累', createdAt:todayStr()},
      {id:uid(), projectId:projId, kind:'bug', title:'iOS 日期選擇器跑版', desc:'Safari 上日期欄位樣式跑掉', createdAt:todayStr()},
      {id:uid(), projectId:null, kind:'idea', title:'做一個團隊共用的番茄鐘', desc:'', createdAt:todayStr()},
    ],
    meetings: [],
    chats: {}
  };
}

function loadDB(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  const db = seedDB();
  saveDB(db);
  return db;
}

function saveDB(db){ localStorage.setItem(LS_KEY, JSON.stringify(db)); }

let DB = loadDB();
function persist(){ saveDB(DB); }