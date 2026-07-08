import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { WorldObject, Connection, CanvasTab, CanvasTabState, CanvasToolMode, StickyNote, CanvasNodePosition, ObjectType, ConnectionType } from '../types/world';
import { STATUS_DISPLAY, CONNECTION_TYPES, CANVAS_TABS } from '../types/world';
import { TEMPLATES } from '../data/seed';

interface TextAnnotation { id: string; text: string; x: number; y: number; }
interface PartitionZone { id: string; label: string; x: number; y: number; width: number; height: number; }

interface ToolDef { mode: CanvasToolMode; icon: string; label: string; shortcut?: string; }

const SIDEBAR_TOOLS: ToolDef[] = [
  { mode: 'select', icon: '↖', label: '选择', shortcut: 'V' },
  { mode: 'drag', icon: '✋', label: '拖动画布', shortcut: 'H' },
  { mode: 'addObject', icon: '▦', label: '对象卡' },
  { mode: 'text', icon: 'T', label: '文本' },
  { mode: 'addSticky', icon: '📝', label: '便签' },
  { mode: 'addConnection', icon: '→', label: '连线' },
  { mode: 'partition', icon: '⊞', label: '分区' },
  { mode: 'template', icon: '▫', label: '模板' },
];

interface CanvasViewProps {
  allObjects: WorldObject[];
  connections: Connection[];
  canvasStates: Record<CanvasTab, CanvasTabState>;
  selectedObjectId: string | null;
  onSelectObject: (objectId: string | null) => void;
  onNavigate: (name: string) => void;
  onUpdateCanvasState: (tabId: CanvasTab, state: Partial<CanvasTabState>) => void;
  onAddConnection: (sourceId: string, targetId: string, type: ConnectionType, label: string) => void;
  onAddSticky: (tabId: CanvasTab, text: string) => void;
  onAddToBoard: (objectId: string, board: string) => void;
  onCreateObject: (templateType: ObjectType) => void;
  onCanvasCreateObject?: (type: ObjectType, x: number, y: number, tabId: CanvasTab) => void;
}

const NODE_W = 130;
const NODE_H = 60;

function getNodeCenter(pos: CanvasNodePosition, w: number = NODE_W, h: number = NODE_H) {
  return { x: pos.x + w / 2, y: pos.y + h / 2 };
}

function makeConnectionPath(from: CanvasNodePosition, to: CanvasNodePosition): string {
  const f = getNodeCenter(from);
  const t = getNodeCenter(to);
  const dx = t.x - f.x;
  const dist = Math.sqrt(dx * dx + (t.y - f.y) ** 2);
  if (dist < 1) return '';
  return `M ${f.x} ${f.y} C ${f.x + dx * 0.4} ${f.y}, ${t.x - dx * 0.4} ${t.y}, ${t.x} ${t.y}`;
}

function getLabelPoint(from: CanvasNodePosition, to: CanvasNodePosition) {
  const f = getNodeCenter(from);
  const t = getNodeCenter(to);
  return { x: (f.x + t.x) / 2, y: (f.y + t.y) / 2 };
}

const STATUS_TO_ZONE: Record<string, string> = {
  '占位': '问题区', '草稿': '问题区', '待定': '候选方案区', '待验证': '待验证区', '锁定': '已锁定区', '废弃': '废弃区',
};
const DEDUCTION_ZONE_NAMES = ['问题区', '候选方案区', '已锁定区', '废弃区', '待验证区'];

const TIMELINE_EVENTS = [
  { name: '第一次背叛' },
  { name: '替换计划' },
  { name: '逃离' },
];

let _textId = 0, _zoneId = 0;

/**
 * Simple force-directed layout.
 * Nodes repel each other, connected nodes attract, center gravity.
 */
function forceDirectedLayout(
  nodes: Array<{ id: string; x: number; y: number }>,
  edges: Array<{ sourceId: string; targetId: string }>,
  width: number = 800,
  height: number = 600,
  iterations: number = 60
): Array<{ id: string; x: number; y: number }> {
  const centerX = width / 2;
  const centerY = height / 2;

  const positions = new Map<string, { x: number; y: number }>();
  const velocities = new Map<string, { vx: number; vy: number }>();

  // Initialize positions (grid for uninitialized)
  const cols = Math.max(3, Math.ceil(Math.sqrt(nodes.length)));
  nodes.forEach((node, i) => {
    if (node.x || node.y) {
      positions.set(node.id, { x: node.x, y: node.y });
    } else {
      positions.set(node.id, {
        x: centerX - (Math.min(cols, nodes.length) * 180) / 2 + (i % cols) * 180 + 40,
        y: centerY - (Math.ceil(nodes.length / cols) * 120) / 2 + Math.floor(i / cols) * 120 + 40,
      });
    }
    velocities.set(node.id, { vx: 0, vy: 0 });
  });

  // Build adjacency set
  const adj = new Map<string, Set<string>>();
  for (const node of nodes) adj.set(node.id, new Set());
  for (const edge of edges) {
    adj.get(edge.sourceId)?.add(edge.targetId);
    adj.get(edge.targetId)?.add(edge.sourceId);
  }

  const repulsion = 6000;
  const attraction = 0.004;
  const gravity = 0.02;
  const damping = 0.8;
  const idealEdgeLen = 160;
  const minDist = 20;

  for (let iter = 0; iter < iterations; iter++) {
    const alpha = 1 - iter / iterations;

    // Repulsion between all pairs
    const nodeArr = Array.from(positions.entries());
    for (let i = 0; i < nodeArr.length; i++) {
      for (let j = i + 1; j < nodeArr.length; j++) {
        const [idA, pa] = nodeArr[i];
        const [idB, pb] = nodeArr[j];
        let dx = pb.x - pa.x;
        let dy = pb.y - pa.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) dist = minDist;
        const force = repulsion * alpha / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        const va = velocities.get(idA)!;
        const vb = velocities.get(idB)!;
        va.vx -= fx; va.vy -= fy;
        vb.vx += fx; vb.vy += fy;
      }
    }

    // Attraction along edges
    for (const edge of edges) {
      const pa = positions.get(edge.sourceId);
      const pb = positions.get(edge.targetId);
      if (!pa || !pb) continue;
      let dx = pb.x - pa.x;
      let dy = pb.y - pa.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) continue;
      const force = (dist - idealEdgeLen) * attraction * alpha;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      const va = velocities.get(edge.sourceId)!;
      const vb = velocities.get(edge.targetId)!;
      va.vx += fx; va.vy += fy;
      vb.vx -= fx; vb.vy -= fy;
    }

    // Gravity toward center + boundary
    for (const [id, p] of positions) {
      const v = velocities.get(id)!;
      v.vx += (centerX - p.x) * gravity * alpha;
      v.vy += (centerY - p.y) * gravity * alpha;
    }

    // Apply velocities with damping
    for (const [id, p] of positions) {
      const v = velocities.get(id)!;
      v.vx *= damping;
      v.vy *= damping;
      p.x += v.vx;
      p.y += v.vy;
      p.x = Math.max(30, Math.min(width - 30, p.x));
      p.y = Math.max(30, Math.min(height - 30, p.y));
    }
  }

  return nodes.map(n => ({
    id: n.id,
    x: Math.round(positions.get(n.id)!.x),
    y: Math.round(positions.get(n.id)!.y),
  }));
}

export default function CanvasView({
  allObjects, connections, canvasStates,
  selectedObjectId, onSelectObject, onNavigate,
  onUpdateCanvasState, onAddConnection, onAddSticky,
  onAddToBoard, onCreateObject, onCanvasCreateObject
}: CanvasViewProps) {
  const [activeTab, setActiveTab] = useState<CanvasTab>('角色关系图');
  const [toolMode, setToolMode] = useState<CanvasToolMode>('select');
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragStartPositions, setDragStartPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [connSource, setConnSource] = useState<string | null>(null);
  const [connDragPos, setConnDragPos] = useState<{ x: number; y: number } | null>(null);
  const [pendingConn, setPendingConn] = useState<{ sourceId: string; targetId: string; x: number; y: number } | null>(null);
  const [stickyText, setStickyText] = useState('');
  const [showStickyDialog, setShowStickyDialog] = useState(false);
  const [hoveredConn, setHoveredConn] = useState<string | null>(null);
  const [showObjectPool, setShowObjectPool] = useState(false);
  const [poolSearch, setPoolSearch] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; stickyId: string } | null>(null);
  const [textLabels, setTextLabels] = useState<TextAnnotation[]>([]);
  const [partitionZones, setPartitionZones] = useState<PartitionZone[]>([]);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showTextDialog, setShowTextDialog] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textInputPos, setTextInputPos] = useState({ x: 0, y: 0 });
  const [showTypeBubble, setShowTypeBubble] = useState(false);
  const [bubblePos, setBubblePos] = useState({ x: 0, y: 0 });
  const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>([]);
