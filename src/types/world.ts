// ===== UI-Layer Types for 织梦机 World Objects =====
// These are in-memory types used by the UI components, separate from
// the tauri-api persistence types. A future bridge layer maps between them.

export type ObjectType = '人物' | '地点' | '组织' | '规则/机制' | '事件' | '物品' | '术语' | '章节';

export const OBJECT_TYPES: ObjectType[] = [
  '人物', '地点', '组织', '规则/机制', '事件', '物品', '术语', '章节'
];

export type ObjectStatus = '占位' | '草稿' | '待定' | '待验证' | '锁定' | '废弃';

export const OBJECT_STATUSES: ObjectStatus[] = [
  '占位', '草稿', '待定', '待验证', '锁定', '废弃'
];

export type CanonLevel = '未收录' | '草案正典' | '项目正典' | '核心正典';

export const CANON_LEVELS: CanonLevel[] = [
  '未收录', '草案正典', '项目正典', '核心正典'
];

export type NavTab = '文档' | '画板' | '设定集' | '判断记录';

export type CanvasTab = '角色关系图' | '时间线' | '设定推演图';

export const CANVAS_TABS: CanvasTab[] = ['角色关系图', '时间线', '设定推演图'];

export type ConnectionType = '相关' | '影响' | '冲突' | '支撑' | '替代' | '属于' | '发生于' | '导致';

export const CONNECTION_TYPES: ConnectionType[] = [
  '相关', '影响', '冲突', '支撑', '替代', '属于', '发生于', '导致'
];

export type JudgmentOperation = '锁定' | '废弃' | '待验证' | '提升正典' | '收录';

export interface JudgmentRecord {
  id: string;
  objectId: string;
  objectName: string;
  operationType: JudgmentOperation;
  reason: string;
  timestamp: number;
  previousStatus: string;
  newStatus: string;
}

export interface WorldObject {
  id: string;
  projectId?: string;
  name: string;
  type: ObjectType;
  status: ObjectStatus;
  canonLevel: CanonLevel;
  tags: string[];
  aliases: string[];
  selectedBoards: string[];
  content: string;
  referencesCount: number;
  judgmentHistory: JudgmentRecord[];
  createdAt: number;
  updatedAt: number;
}

export interface Connection {
  id: string;
  projectId?: string;
  sourceId: string;
  targetId: string;
  type: ConnectionType;
  label: string;
}

export interface CanvasNodePosition {
  objectId: string;
  x: number;
  y: number;
}

export interface StickyNote {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface CanvasTabState {
  id?: string;
  projectId?: string;
  tabId: CanvasTab;
  positions: Record<string, CanvasNodePosition>;
  stickyNotes: StickyNote[];
  connections: Connection[];
  scale: number;
  panX: number;
  panY: number;
}

export interface TemplatePreset {
  type: ObjectType;
  defaultStatus: ObjectStatus;
  defaultTags: string[];
  defaultContent: string;
}

export type CanvasToolMode = 'select' | 'drag' | 'addObject' | 'text' | 'addSticky' | 'addConnection' | 'partition' | 'template';

export interface StatusDisplayConfig {
  border: string;
  background: string;
  text: string;
}

export const STATUS_DISPLAY: Record<ObjectStatus, StatusDisplayConfig> = {
  '占位': { border: '2px dashed #555', background: '#1a1a1a', text: '#888' },
  '草稿': { border: '2px solid #555', background: '#1e1e1e', text: '#ccc' },
  '待定': { border: '2px solid #2196F3', background: '#0D47A1', text: '#90CAF9' },
  '待验证': { border: '2px solid #FF9800', background: '#E65100', text: '#FFCC80' },
  '锁定': { border: '2px solid #4CAF50', background: '#1B5E20', text: '#A5D6A7' },
  '废弃': { border: '2px solid #f44336', background: '#B71C1C', text: '#EF9A9A' }
};

export interface Project {
  id: string;
  title: string;
  genre: string;
  status: 'drafting' | 'conceiving' | 'editing' | 'done';
  wordCount: number;
  gradient: [string, string];
}
