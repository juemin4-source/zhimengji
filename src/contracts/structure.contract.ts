export type StructureNodeType = 'book' | 'phase' | 'position' | 'chapter';

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
}
