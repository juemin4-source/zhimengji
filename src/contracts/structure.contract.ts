export type StructureNodeType = 'book' | 'phase' | 'position' | 'chapter';

/**
 * ChapterFunction — 本章功能枚举（Round C 新增）
 */
export type ChapterFunction =
  | 'opening'
  | 'setup'
  | 'escalation'
  | 'reversal'
  | 'reveal'
  | 'relationship_shift'
  | 'decision'
  | 'aftermath'
  | 'transition'
  | 'climax'
  | 'closure';

export interface StructureNode {
  id: string;
  projectId: string;
  parentId: string | null;
  title: string;
  nodeType: StructureNodeType;
  narrativeFunction: string;
  summary: string;
  positionX: number;
  positionY: number;
  sortOrder: number;
  /** Round C 新增：本章功能枚举 */
  chapterFunction?: ChapterFunction;
  /** Round C 新增：线路字段（预留） */
  line?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreateStructureNodeInput {
  projectId: string;
  parentId: string | null;
  title: string;
  nodeType: StructureNodeType;
  narrativeFunction: string;
  summary: string;
  positionX: number;
  positionY: number;
  sortOrder: number;
  /** Round C 新增 */
  chapterFunction?: ChapterFunction;
  /** Round C 新增 */
  line?: string;
}

export interface UpdateStructureNodeInput {
  id: string;
  parentId: string | null;
  title: string;
  nodeType: StructureNodeType;
  narrativeFunction: string;
  summary: string;
  positionX: number;
  positionY: number;
  sortOrder: number;
  /** Round C 新增 */
  chapterFunction?: ChapterFunction;
  /** Round C 新增 */
  line?: string;
}
