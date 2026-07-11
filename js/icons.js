/* ============================================
   Icons System - Lucide Icons Wrapper
   ============================================ */

const Icons = {
  // Navigation
  user: '<i data-lucide="user"></i>',
  folder: '<i data-lucide="folder"></i>',
  calendar: '<i data-lucide="calendar"></i>',
  calendarClock: '<i data-lucide="calendar-clock"></i>',
  checkSquare: '<i data-lucide="check-square"></i>',
  lightbulb: '<i data-lucide="lightbulb"></i>',
  fileText: '<i data-lucide="file-text"></i>',
  messageCircle: '<i data-lucide="message-circle"></i>',
  
  // Actions
  plus: '<i data-lucide="plus"></i>',
  chevronLeft: '<i data-lucide="chevron-left"></i>',
  chevronRight: '<i data-lucide="chevron-right"></i>',
  chevronDown: '<i data-lucide="chevron-down"></i>',
  moreHorizontal: '<i data-lucide="more-horizontal"></i>',
  x: '<i data-lucide="x"></i>',
  trash: '<i data-lucide="trash"></i>',
  trash2: '<i data-lucide="trash-2"></i>',
  edit: '<i data-lucide="edit"></i>',
  save: '<i data-lucide="save"></i>',
  download: '<i data-lucide="download"></i>',
  share: '<i data-lucide="share-2"></i>',
  
  // Status
  clock: '<i data-lucide="clock"></i>',
  alertCircle: '<i data-lucide="alert-circle"></i>',
  check: '<i data-lucide="check"></i>',
  checkCircle: '<i data-lucide="check-circle"></i>',
  
  // Objects
  file: '<i data-lucide="file"></i>',
  kanban: '<i data-lucide="layout"></i>',
  gitBranch: '<i data-lucide="git-branch"></i>',
  image: '<i data-lucide="image"></i>',
  clipboard: '<i data-lucide="clipboard"></i>',
  barChart: '<i data-lucide="bar-chart"></i>',
  map: '<i data-lucide="map"></i>',
  target: '<i data-lucide="target"></i>',
  
  // Shapes
  square: '<i data-lucide="square"></i>',
  circle: '<i data-lucide="circle"></i>',
  hexagon: '<i data-lucide="hexagon"></i>',
  
  // Communication
  send: '<i data-lucide="send"></i>',
  paperclip: '<i data-lucide="paperclip"></i>',
  
  // Misc
  zap: '<i data-lucide="zap"></i>',
  bug: '<i data-lucide="bug"></i>',
  coffee: '<i data-lucide="coffee"></i>',
  star: '<i data-lucide="star"></i>',
  heart: '<i data-lucide="heart"></i>',
  bookmark: '<i data-lucide="bookmark"></i>',
  archive: '<i data-lucide="archive"></i>',
  tag: '<i data-lucide="tag"></i>',
  Users: '<i data-lucide="users"></i>',
  settings: '<i data-lucide="settings"></i>',
  home: '<i data-lucide="home"></i>',
  search: '<i data-lucide="search"></i>',
  filter: '<i data-lucide="filter"></i>',
  menu: '<i data-lucide="menu"></i>',
  sidebar: '<i data-lucide="sidebar"></i>',
  maximize: '<i data-lucide="maximize"></i>',
  minimize: '<i data-lucide="minimize"></i>',
  refresh: '<i data-lucide="refresh-cw"></i>',
  copy: '<i data-lucide="copy"></i>',
  externalLink: '<i data-lucide="external-link"></i>',
  link: '<i data-lucide="link"></i>',
  lock: '<i data-lucide="lock"></i>',
  unlock: '<i data-lucide="unlock"></i>',
  logOut: '<i data-lucide="log-out"></i>',
  logIn: '<i data-lucide="log-in"></i>',
  moreVertical: '<i data-lucide="more-vertical"></i>',
  refreshCw: '<i data-lucide="refresh-cw"></i>',
  eye: '<i data-lucide="eye"></i>',
  eyeOff: '<i data-lucide="eye-off"></i>',
  info: '<i data-lucide="info"></i>',
  alertTriangle: '<i data-lucide="alert-triangle"></i>',
};

// Helper function to get icon
function getIcon(name) {
  return Icons[name] || '';
}

// Initialize Lucide icons
function initIcons() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// Call after DOM update
document.addEventListener('DOMContentLoaded', initIcons);