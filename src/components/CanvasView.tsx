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

  const canvasRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const autoLayoutRun = useRef<Set<string>>(new Set());
  const state = canvasStates[activeTab];

  const nameToObj = useMemo(() => { const m = new Map<string, WorldObject>(); allObjects.forEach(o => m.set(o.name, o)); return m; }, [allObjects]);

  // Auto-layout: force-directed on first load per tab
  useEffect(() => {
    if (autoLayoutRun.current.has(activeTab)) return;

    const newPositions = { ...state.positions };
    let changed = false;

    if (activeTab === '时间线') {
      TIMELINE_EVENTS.forEach((evt, i) => {
        const obj = allObjects.find(o => o.name === evt.name);
        if (obj && !newPositions[obj.id]) {
          newPositions[obj.id] = { objectId: obj.id, x: 120 + i * 260, y: 100 };
          changed = true;
        }
      });
    } else if (activeTab === '设定推演图') {
      const deductionObjects = allObjects.filter(o => o.selectedBoards.includes('设定推演图'));
      const zoneCounts: Record<string, number> = {};
      DEDUCTION_ZONE_NAMES.forEach(z => { zoneCounts[z] = 0; });
      const zoneLayout: Record<string, { x: number; y: number }> = { '问题区': { x: 30, y: 50 }, '候选方案区': { x: 430, y: 50 }, '已锁定区': { x: 30, y: 250 }, '废弃区': { x: 430, y: 250 }, '待验证区': { x: 30, y: 450 } };
      deductionObjects.forEach(obj => {
        if (!newPositions[obj.id]) {
          const zone = STATUS_TO_ZONE[obj.status] || '问题区';
          const base = zoneLayout[zone] || { x: 30, y: 50 };
          const count = zoneCounts[zone] || 0;
          newPositions[obj.id] = { objectId: obj.id, x: base.x + 10, y: base.y + count * 50 };
          zoneCounts[zone] = count + 1;
          changed = true;
        }
      });
    } else {
      // 角色关系图 force-directed layout
      const objectsInBoard = allObjects.filter(o => o.selectedBoards.includes(activeTab));
      const unpositioned = objectsInBoard.filter(o => !newPositions[o.id]);

      if (unpositioned.length > 0) {
        const nodes = objectsInBoard.map(o => ({
          id: o.id,
          x: newPositions[o.id]?.x || 0,
          y: newPositions[o.id]?.y || 0,
        }));
        const tabConnections = state.connections.length > 0 ? state.connections : connections.filter(c => {
          const srcOnBoard = objectsInBoard.some(o => o.id === c.sourceId);
          const tgtOnBoard = objectsInBoard.some(o => o.id === c.targetId);
          return srcOnBoard && tgtOnBoard;
        });
        const edges = tabConnections.map(c => ({ sourceId: c.sourceId, targetId: c.targetId }));

        if (nodes.length > 1) {
          const laidOut = forceDirectedLayout(
            nodes, edges,
            800, Math.max(400, Math.ceil(nodes.length / 3) * 150 + 100),
            Math.min(100, 20 + nodes.length * 5)
          );
          for (const n of laidOut) {
            if (n.x && n.y) {
              newPositions[n.id] = { objectId: n.id, x: n.x, y: n.y };
              changed = true;
            }
          }
        } else if (unpositioned.length > 0) {
          unpositioned.forEach((obj, i) => {
            newPositions[obj.id] = { objectId: obj.id, x: 60 + i * 180, y: 40 };
            changed = true;
          });
        }
      }
    }

    if (changed) onUpdateCanvasState(activeTab, { positions: newPositions });
    autoLayoutRun.current.add(activeTab);
  }, [activeTab]);

  // Grid-place any new objects added after auto-layout
  useEffect(() => {
    const newPositions = { ...state.positions };
    let changed = false;
    const objectsInBoard = allObjects.filter(o => o.selectedBoards.includes(activeTab));
    const unpositioned = objectsInBoard.filter(o => !newPositions[o.id]);
    unpositioned.forEach((obj, i) => {
      newPositions[obj.id] = {
        objectId: obj.id,
        x: 60 + (i % 3) * 200,
        y: 40 + Math.floor(i / 3) * 150,
      };
      changed = true;
    });
    if (changed) onUpdateCanvasState(activeTab, { positions: newPositions });
  }, [allObjects.length]);

  const canvasObjects = useMemo(() => {
    let objects = allObjects.filter(o => o.selectedBoards.includes(activeTab));
    if (activeTab === '时间线') {
      TIMELINE_EVENTS.forEach(evt => { const obj = nameToObj.get(evt.name); if (obj && !objects.find(o => o.id === obj.id)) objects = [...objects, obj]; });
    }
    return objects;
  }, [allObjects, activeTab, nameToObj]);

  const displayConnections = useMemo(() => {
    return [...state.connections];
  }, [state.connections]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (toolMode === 'drag') { setPanning(true); setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y }); }
  }, [toolMode, panOffset]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (panning) { setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y }); }

    // Connection drag line
    if (connSource) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        setConnDragPos({ x: e.clientX - rect.left + panOffset.x, y: e.clientY - rect.top + panOffset.y });
      }
    }

    // Dragging node(s)
    if (draggingNode) {
      const pos = state.positions[draggingNode];
      if (pos) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const currentX = e.clientX - dragOffset.x - rect.left + panOffset.x;
        const currentY = e.clientY - dragOffset.y - rect.top + panOffset.y;
        const primaryStart = dragStartPositions[draggingNode];
        if (!primaryStart) return;
        const dx = currentX - primaryStart.x;
        const dy = currentY - primaryStart.y;

        const newPositions = { ...state.positions };
        for (const id of Object.keys(dragStartPositions)) {
          const start = dragStartPositions[id];
          if (start && newPositions[id]) {
            newPositions[id] = { ...newPositions[id], x: Math.round(start.x + dx), y: Math.round(start.y + dy) };
          }
        }
        onUpdateCanvasState(activeTab, { positions: newPositions });
      }
    }
  }, [panning, connSource, draggingNode, dragOffset, dragStartPositions, state.positions, activeTab, panOffset, onUpdateCanvasState, panStart]);

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent) => {
    setPanning(false);
    setDraggingNode(null);
    setDragStartPositions({});

    // Connection drop detection
    if (connSource) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const mouseX = e.clientX - rect.left + panOffset.x;
        const mouseY = e.clientY - rect.top + panOffset.y;

        for (const [id, pos] of Object.entries(state.positions)) {
          if (id !== connSource &&
            mouseX >= pos.x && mouseX <= pos.x + NODE_W &&
            mouseY >= pos.y && mouseY <= pos.y + NODE_H) {
            setPendingConn({ sourceId: connSource, targetId: id, x: pos.x + NODE_W / 2, y: pos.y - 20 });
            setConnSource(null);
            setConnDragPos(null);
            return;
          }
        }
      }
      // Not over any node cancel
      setConnSource(null);
      setConnDragPos(null);
    }
  }, [connSource, state.positions, panOffset]);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, objectId: string) => {
    e.stopPropagation();
    const isCtrl = e.ctrlKey || e.metaKey;

    if (toolMode === 'addConnection') {
      if (connSource === null) {
        setConnSource(objectId);
      }
      return;
    }

    if (toolMode === 'select' || toolMode === 'drag') {
      if (isCtrl) {
        setMultiSelectedIds(prev => {
          if (prev.includes(objectId)) return prev.filter(id => id !== objectId);
          return [...prev, objectId];
        });
        onSelectObject(objectId);
      } else {
        setMultiSelectedIds([]);
        onSelectObject(objectId);
      }

      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        setDraggingNode(objectId);
        setDragOffset({
          x: e.clientX - (state.positions[objectId]?.x || 0) - rect.left + panOffset.x,
          y: e.clientY - (state.positions[objectId]?.y || 0) - rect.top + panOffset.y,
        });

        // Store start positions of all selected nodes for multi-drag
        const selected = isCtrl
          ? (multiSelectedIds.includes(objectId) ? [...multiSelectedIds] : [...multiSelectedIds, objectId])
          : [objectId];
        const starts: Record<string, { x: number; y: number }> = {};
        for (const id of selected) {
          const p = state.positions[id];
          if (p) starts[id] = { x: p.x, y: p.y };
        }
        setDragStartPositions(starts);
      }
    }
  }, [toolMode, connSource, state.positions, panOffset, onSelectObject, multiSelectedIds]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (toolMode === 'addObject') { setShowObjectPool(true); setToolMode('select'); return; }
    if (toolMode === 'addSticky') { setShowStickyDialog(true); return; }
    if (toolMode === 'text') {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTextInputPos({ x: e.clientX - rect.left + panOffset.x, y: e.clientY - rect.top + panOffset.y });
      setTextInput(''); setShowTextDialog(true); return;
    }
    if (toolMode === 'partition') {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPartitionZones(prev => [...prev, { id: `zone_${_zoneId++}`, label: `分区 ${prev.length + 1}`, x: e.clientX - rect.left + panOffset.x - 100, y: e.clientY - rect.top + panOffset.y - 50, width: 200, height: 100 }]);
      return;
    }
    if (toolMode === 'template') { setShowTemplatePicker(true); setToolMode('select'); return; }

    // Click background to deselect
    const target = e.target as HTMLElement;
    if (!target.closest('.canvas-node') && !target.closest('.canvas-sticky')) {
      onSelectObject(null);
      setMultiSelectedIds([]);
    }
  }, [toolMode, panOffset, onSelectObject]);

  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.canvas-node') || target.closest('.canvas-sticky') || target.closest('.text-annotation') || target.closest('.conn-type-popup')) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const canvasX = e.clientX - rect.left + panOffset.x;
    const canvasY = e.clientY - rect.top + panOffset.y;
    setBubblePos({ x: canvasX, y: canvasY });
    setShowTypeBubble(true);
  }, [panOffset]);

  // Close type bubble on outside click
  useEffect(() => {
    if (!showTypeBubble) return;
    const h = () => setShowTypeBubble(false);
    window.addEventListener('click', h);
    return () => window.removeEventListener('click', h);
  }, [showTypeBubble]);

  const handleTypeSelect = useCallback((type: ObjectType) => {
    if (onCanvasCreateObject) {
      onCanvasCreateObject(type, bubblePos.x, bubblePos.y, activeTab);
    } else {
      onCreateObject(type);
    }
    setShowTypeBubble(false);
  }, [bubblePos, activeTab, onCanvasCreateObject, onCreateObject]);

  const handleConfirmText = useCallback(() => { if (textInput.trim()) { setTextLabels(prev => [...prev, { id: `text_${_textId++}`, text: textInput.trim(), x: textInputPos.x, y: textInputPos.y }]); setTextInput(''); setShowTextDialog(false); } }, [textInput, textInputPos]);

  const handleConfirmSticky = useCallback(() => { if (stickyText.trim()) { onAddSticky(activeTab, stickyText.trim()); setStickyText(''); setShowStickyDialog(false); } }, [stickyText, activeTab, onAddSticky]);

  const handleConnTypeSelect = useCallback((type: ConnectionType) => {
    if (pendingConn) {
      onAddConnection(pendingConn.sourceId, pendingConn.targetId, type, '');
      setPendingConn(null);
    }
  }, [pendingConn, onAddConnection]);

  const handleSelectFromPool = useCallback((obj: WorldObject) => {
    onAddToBoard(obj.id, activeTab);
    const cnt = Object.keys(state.positions).length;
    onUpdateCanvasState(activeTab, { positions: { ...state.positions, [obj.id]: { objectId: obj.id, x: 40 + (cnt % 3) * 180, y: 40 + Math.floor(cnt / 3) * 120 } } });
    setShowObjectPool(false); setPoolSearch('');
  }, [activeTab, onAddToBoard, onUpdateCanvasState, state.positions]);

  const availableForPool = useMemo(() => { const onCanvas = new Set(Object.keys(state.positions)); return allObjects.filter(o => !onCanvas.has(o.id)); }, [allObjects, state.positions]);

  const filteredPoolItems = useMemo(() => {
    if (!poolSearch.trim()) return availableForPool;
    const q = poolSearch.toLowerCase();
    return availableForPool.filter(o => o.name.toLowerCase().includes(q) || o.type.toLowerCase().includes(q) || o.tags.some(t => t.toLowerCase().includes(q)));
  }, [availableForPool, poolSearch]);

  const handleToolClick = useCallback((mode: CanvasToolMode) => {
    if (mode === 'template') { setShowTemplatePicker(true); return; }
    if (mode === 'addObject') { setShowObjectPool(true); return; }
    setToolMode(prev => prev === mode ? 'select' : mode);
  }, []);

  const handleAutoLayout = useCallback(() => {
    autoLayoutRun.current.delete(activeTab);
    const newPositions: Record<string, CanvasNodePosition> = {};
    onUpdateCanvasState(activeTab, { positions: newPositions });
    setTimeout(() => {
      autoLayoutRun.current.delete(activeTab);
      onUpdateCanvasState(activeTab, { positions: {} });
    }, 50);
  }, [activeTab, onUpdateCanvasState]);

  const isNodeSelected = useCallback((id: string) => {
    return selectedObjectId === id || multiSelectedIds.includes(id);
  }, [selectedObjectId, multiSelectedIds]);

  useEffect(() => { if (!showObjectPool) setPoolSearch(''); }, [showObjectPool]);
  useEffect(() => { if (!contextMenu) return; const h = () => setContextMenu(null); window.addEventListener('click', h); return () => window.removeEventListener('click', h); }, [contextMenu]);

  const renderConnections = () => {
    if (activeTab !== '角色关系图') return null;
    return <g>{displayConnections.map(conn => {
      const from = state.positions[conn.sourceId];
      const to = state.positions[conn.targetId];
      if (!from || !to) return null;
      const path = makeConnectionPath(from, to);
      const isHovered = hoveredConn === conn.id;
      const labelPt = getLabelPoint(from, to);
      return <g key={conn.id}>
        <path d={path} fill="none" stroke={isHovered ? '#1a73e8' : '#555'} strokeWidth={isHovered ? 2.5 : 1.5} strokeDasharray={conn.type === '冲突' ? '6,3' : conn.type === '替代' ? '3,3' : undefined} onMouseEnter={() => setHoveredConn(conn.id)} onMouseLeave={() => setHoveredConn(null)} style={{ cursor: 'pointer', transition: 'stroke 0.2s' }} />
        <g><rect x={labelPt.x - 30} y={labelPt.y - 10} width={60} height={20} rx={4} fill="#1e1e1e" fillOpacity={0.9} stroke={isHovered ? '#1a73e8' : '#444'} strokeWidth={0.5} />
          <text x={labelPt.x} y={labelPt.y + 4} textAnchor="middle" fontSize={11} fill={isHovered ? '#1a73e8' : '#aaa'} style={{ pointerEvents: 'none', fontWeight: isHovered ? 600 : 400 }}>{conn.label || conn.type}</text></g>
      </g>;
    })}

      {/* Connection drag line */}
      {connSource && connDragPos && (() => {
        const from = state.positions[connSource];
        if (!from) return null;
        const center = getNodeCenter(from);
        return <line x1={center.x} y1={center.y} x2={connDragPos.x} y2={connDragPos.y} stroke="#FF9800" strokeWidth={2} strokeDasharray="6,3" />;
      })()}
    </g>;
  };

  const renderNode = (obj: WorldObject) => {
    const pos = state.positions[obj.id];
    if (!pos) return null;
    const sd = STATUS_DISPLAY[obj.status];
    const isSelected = selectedObjectId === obj.id;
    const isMultiSelected = multiSelectedIds.includes(obj.id);
    const isConnSource = connSource === obj.id;
    const isTimeline = activeTab === '时间线';
    const isKeyEvent = isTimeline && (obj.name === '第一次背叛' || obj.name === '替换计划');
    const isDiscarded = obj.status === '废弃';

    const borderStyle = isConnSource ? '0 0 0 3px #FF9800, 0 4px 16px rgba(0,0,0,0.3)' :
      isSelected ? '0 0 0 2px #1a73e8, 0 4px 16px rgba(0,0,0,0.3)' :
        isMultiSelected ? '0 0 0 2px #4FC3F7, 0 4px 16px rgba(0,0,0,0.3)' :
          '0 2px 8px rgba(0,0,0,0.2)';

    if (isTimeline) {
      return <div key={obj.id} className="canvas-node" data-node-id={obj.id} style={{
        position: 'absolute', left: pos.x - panOffset.x, top: pos.y - panOffset.y, width: 200, minHeight: 60,
        background: sd.background, border: sd.border, color: sd.text, borderRadius: 8, padding: '8px 14px', fontSize: 12, cursor: 'pointer',
        boxShadow: borderStyle, userSelect: 'none',
        opacity: isDiscarded ? 0.65 : 1, textDecoration: isDiscarded ? 'line-through' : 'none', zIndex: 10, ...(isKeyEvent ? { borderLeft: '4px solid #f44336' } : {}),
      }} onMouseDown={(e) => handleNodeMouseDown(e, obj.id)} onDoubleClick={(e) => { e.stopPropagation(); onNavigate(obj.name); }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 1 }}>{obj.name}</div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>{isDiscarded ? '已废弃' : obj.type}</div>
        </div>;
    }

    return <div key={obj.id} className={`canvas-node ${isSelected ? 'selected' : ''}`} data-node-id={obj.id} style={{
      ...{ border: sd.border, background: sd.background, color: sd.text, borderRadius: 8, padding: '8px 12px', position: 'absolute', cursor: 'pointer', minWidth: 100, maxWidth: 200, fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', userSelect: 'none' },
      left: pos.x - panOffset.x, top: pos.y - panOffset.y,
      opacity: isDiscarded ? 0.7 : 1,
      boxShadow: borderStyle,
      textDecoration: isDiscarded ? 'line-through' : 'none',
    }} onMouseDown={(e) => handleNodeMouseDown(e, obj.id)} onDoubleClick={(e) => { e.stopPropagation(); onNavigate(obj.name); }}>
        <div className="node-name">{obj.name}</div>
        <div className="node-type">{obj.type}</div>
      </div>;
  };

  const renderTimelineFeatures = () => {
    if (activeTab !== '时间线') return null;
    const axisY = 55;
    const eventItems = TIMELINE_EVENTS.map(evt => { const obj = nameToObj.get(evt.name); if (!obj) return null; const pos = state.positions[obj.id]; if (!pos) return null; return { obj, pos }; }).filter(Boolean) as Array<{ obj: WorldObject; pos: CanvasNodePosition }>;
    if (eventItems.length === 0) return null;
    const mainEventIds = new Set(TIMELINE_EVENTS.map(evt => nameToObj.get(evt.name)?.id).filter(Boolean));
    const pendingObjects = canvasObjects.filter(o => !mainEventIds.has(o.id));

    return <>
      <svg className="canvas-svg" style={{ pointerEvents: 'none', overflow: 'visible' }}>
        <line x1={eventItems[0].pos.x + 100 - panOffset.x} y1={axisY} x2={eventItems[eventItems.length - 1].pos.x + 100 - panOffset.x} y2={axisY} stroke="#555" strokeWidth={2} strokeLinecap="round" />
        {eventItems.map(item => {
          const cx = item.pos.x + 100 - panOffset.x;
          const isKey = item.obj.name === '第一次背叛' || item.obj.name === '替换计划';
          return <g key={item.obj.id}>
            <line x1={cx} y1={axisY} x2={cx} y2={item.pos.y + 5 - panOffset.y} stroke="#444" strokeWidth={1} strokeDasharray="4,3" />
            <circle cx={cx} cy={axisY} r={isKey ? 6 : 4} fill={isKey ? '#f44336' : '#666'} stroke="#1e1e1e" strokeWidth={2} />
            {isKey && <text x={cx} y={axisY - 14} textAnchor="middle" fontSize={10} fill="#f44336" fontWeight={600}>关键转折</text>}
          </g>;
        })}
      </svg>
      <div style={{ position: 'absolute', left: 40 - panOffset.x, top: 220 - panOffset.y, width: 850, minHeight: 100, border: '2px dashed #333', borderRadius: 8, padding: 12, background: '#141414', pointerEvents: 'auto' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 8 }}>待排事件区</div>
        {pendingObjects.length === 0 ? <div style={{ fontSize: 11, color: '#555', textAlign: 'center', padding: '12px 0' }}>暂无待排事件</div>
          : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{pendingObjects.map(obj => (
            <div key={obj.id} style={{ padding: '4px 10px', background: STATUS_DISPLAY[obj.status].background, border: STATUS_DISPLAY[obj.status].border, color: STATUS_DISPLAY[obj.status].text, borderRadius: 4, fontSize: 11, cursor: 'pointer' }}
              onClick={() => onSelectObject(obj.id)} onDoubleClick={() => onNavigate(obj.name)}>{obj.name}</div>))}</div>}
      </div>
    </>;
  };

  const renderDeductionZones = () => {
    if (activeTab !== '设定推演图') return null;
    const zoneLayout: Record<string, { x: number; y: number; w: number; h: number }> = {
      '问题区': { x: 20, y: 20, w: 390, h: 180 }, '候选方案区': { x: 430, y: 20, w: 390, h: 180 },
      '已锁定区': { x: 20, y: 220, w: 390, h: 180 }, '废弃区': { x: 430, y: 220, w: 390, h: 180 },
      '待验证区': { x: 20, y: 420, w: 800, h: 140 },
    };
    const zoneObjects: Record<string, WorldObject[]> = {};
    DEDUCTION_ZONE_NAMES.forEach(z => { zoneObjects[z] = []; });
    allObjects.filter(o => o.selectedBoards.includes('设定推演图')).forEach(obj => { const zone = STATUS_TO_ZONE[obj.status] || '问题区'; if (!zoneObjects[zone]) zoneObjects[zone] = []; zoneObjects[zone].push(obj); });

    return <>{DEDUCTION_ZONE_NAMES.map(zoneName => {
      const layout = zoneLayout[zoneName];
      if (!layout) return null;
      const objects = zoneObjects[zoneName] || [];
      return <div key={zoneName} className="deduction-zone" style={{ position: 'absolute', left: layout.x - panOffset.x, top: layout.y - panOffset.y, width: layout.w, height: layout.h, border: '2px solid #333', borderRadius: 8, background: '#141414', overflowY: 'auto' }}>
        <div style={{ background: '#1e1e1e', padding: '5px 12px', fontSize: 13, fontWeight: 600, color: '#aaa', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{zoneName}</span><span style={{ fontWeight: 400, fontSize: 11, color: '#666' }}>{objects.length} 项</span>
        </div>
        <div style={{ padding: 6 }}>
          {objects.length === 0 ? <div style={{ fontSize: 11, color: '#555', textAlign: 'center', paddingTop: 20 }}>暂无</div>
            : objects.map(obj => (
              <div key={obj.id} style={{ padding: '5px 10px', marginBottom: 4, background: STATUS_DISPLAY[obj.status].background, border: STATUS_DISPLAY[obj.status].border, color: STATUS_DISPLAY[obj.status].text, borderRadius: 4, fontSize: 12, cursor: 'pointer', ...(obj.status === '废弃' ? { textDecoration: 'line-through', opacity: 0.7 } : {}) }}
                onClick={() => onSelectObject(obj.id)} onDoubleClick={() => onNavigate(obj.name)}>
                <div style={{ fontWeight: 500 }}>{obj.name}</div>
                <div style={{ fontSize: 10, opacity: 0.7, marginTop: 1 }}>{obj.type}{obj.status === '废弃' ? ' · 已废弃' : ''}</div>
              </div>
            ))}
        </div>
      </div>;
    })}</>;
  };

  return (
    <div className="canvas-view">
      <div className="canvas-tabs">
        {CANVAS_TABS.map(tab => (
          <button key={tab} className={`canvas-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => { setActiveTab(tab); setConnSource(null); setPendingConn(null); }}>{tab}</button>
        ))}
      </div>
      <div className="canvas-body">
        <div className="canvas-sidebar" ref={sidebarRef}>
          {SIDEBAR_TOOLS.map(tool => {
            const isActive = toolMode === tool.mode;
            return <button key={tool.mode} className={`canvas-sb-btn ${isActive ? 'active' : ''}`} onClick={() => handleToolClick(tool.mode)} title={tool.label}>
              {tool.icon}<span className="sb-tooltip">{tool.label}{tool.shortcut ? ` (${tool.shortcut})` : ''}</span>
            </button>;
          })}
          <div className="canvas-sb-separator" />
          <button className="canvas-sb-btn" onClick={() => { onUpdateCanvasState(activeTab, { scale: 1, panX: 0, panY: 0 }); setPanOffset({ x: 0, y: 0 }); }} title="适应画布">⊞<span className="sb-tooltip">适应画布</span></button>
          <button className="canvas-sb-btn" onClick={handleAutoLayout} title="自动布局">⟳<span className="sb-tooltip">自动布局</span></button>
        </div>
        <div className="canvas-main">
          <div className="canvas-info-bar">
            <span>节点: {Object.keys(state.positions).length}</span><span>|</span><span>连线: {displayConnections.length}</span>
            {toolMode === 'addConnection' && <><span>|</span><span style={{ color: '#FF9800' }}>{connSource ? '拖拽到目标节点建立连线' : '点击一个节点开始连线'}</span></>}
            {multiSelectedIds.length > 0 && <><span>|</span><span style={{ color: '#4FC3F7' }}>已选 {multiSelectedIds.length + (selectedObjectId && !multiSelectedIds.includes(selectedObjectId) ? 1 : 0)} 个节点</span></>}
          </div>
          <div ref={canvasRef} className="canvas-container" onMouseDown={handleCanvasMouseDown} onMouseMove={handleCanvasMouseMove} onMouseUp={handleCanvasMouseUp} onMouseLeave={handleCanvasMouseUp} onClick={handleCanvasClick} onDoubleClick={handleCanvasDoubleClick}
            style={{ cursor: toolMode === 'drag' ? 'grab' : toolMode === 'addConnection' && connSource ? 'crosshair' : toolMode === 'text' ? 'text' : toolMode === 'partition' ? 'crosshair' : 'default' }}>
            {activeTab === '角色关系图' && <svg className="canvas-svg">{renderConnections()}</svg>}
            {renderTimelineFeatures()}
            {renderDeductionZones()}

            {/* Partition zones */}
            {partitionZones.map(zone => (
              <div key={zone.id} className="partition-zone-box" style={{ left: zone.x - panOffset.x, top: zone.y - panOffset.y, width: zone.width, height: zone.height }}>
                <div className="partition-zone-label">{zone.label}</div>
              </div>
            ))}

            {/* Nodes */}
            {activeTab !== '设定推演图' && canvasObjects.map(obj => renderNode(obj))}

            {/* Text annotations */}
            {textLabels.map(label => (
              <div key={label.id} className="text-annotation" style={{ left: label.x - panOffset.x, top: label.y - panOffset.y }}>{label.text}</div>
            ))}

            {/* Sticky notes */}
            {state.stickyNotes.map(note => (
              <div key={note.id} className="canvas-sticky" style={{ left: note.x - panOffset.x, top: note.y - panOffset.y, width: note.width, height: note.height, background: note.color }}
                onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, stickyId: note.id }); }}>{note.text}</div>
            ))}

            {/* Inline type bubble at double-click position */}
            {showTypeBubble && (
              <div className="type-bubble" style={{ left: bubblePos.x - panOffset.x, top: bubblePos.y - panOffset.y }} onClick={e => e.stopPropagation()}>
                <div className="type-bubble-header">新建对象</div>
                <div className="type-bubble-grid">
                  {TEMPLATES.map(t => (
                    <button key={t.type} className="type-bubble-btn" onClick={() => handleTypeSelect(t.type)}>
                      <span className="type-bubble-icon">
                        {t.type === '人物' ? '👤' : t.type === '地点' ? '📍' : t.type === '组织' ? '🏛' : t.type === '规则/机制' ? '⚙️' : t.type === '事件' ? '📅' : t.type === '物品' ? '📦' : t.type === '术语' ? '📖' : '📄'}
                      </span>
                      <span className="type-bubble-label">{t.type}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Inline connection type popup */}
            {pendingConn && (
              <div className="conn-type-popup" style={{ left: pendingConn.x - panOffset.x, top: pendingConn.y - panOffset.y }} onClick={e => e.stopPropagation()}>
                <div className="conn-popup-header">连线类型</div>
                <div className="conn-popup-grid">
                  {CONNECTION_TYPES.map(type => (
                    <button key={type} className="conn-popup-btn" onClick={() => handleConnTypeSelect(type)}>{type}</button>
                  ))}
                </div>
              </div>
            )}

            {canvasObjects.length === 0 && activeTab !== '时间线' && (
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', color: '#666' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>📋</div>
                <div style={{ fontSize: 14 }}>在文档视图中将对象「放入画板」</div>
                <div style={{ fontSize: 12, marginTop: 4, color: '#555' }}>或双击空白区域快速创建</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      {showStickyDialog && (
        <div className="canvas-overlay" onClick={() => setShowStickyDialog(false)}>
          <div className="canvas-overlay-panel" onClick={e => e.stopPropagation()}><h4>添加便签</h4>
            <textarea style={{ width: '100%', height: 80, padding: 8, border: '1px solid #333', borderRadius: 4, fontSize: 13, resize: 'vertical', background: '#0a0a0a', color: '#ccc' }} placeholder="便签内容..." value={stickyText} onChange={e => setStickyText(e.target.value)} autoFocus />
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <button className="tb-btn" onClick={() => setShowStickyDialog(false)}>取消</button>
              <button className="tb-btn primary" onClick={handleConfirmSticky}>添加</button>
            </div>
          </div>
        </div>
      )}

      {showTextDialog && (
        <div className="canvas-overlay" onClick={() => setShowTextDialog(false)}>
          <div className="canvas-overlay-panel" onClick={e => e.stopPropagation()}><h4>添加文本</h4>
            <textarea style={{ width: '100%', height: 60, padding: 8, border: '1px solid #333', borderRadius: 4, fontSize: 13, resize: 'vertical', background: '#0a0a0a', color: '#ccc' }} placeholder="文本内容..." value={textInput} onChange={e => setTextInput(e.target.value)} autoFocus />
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <button className="tb-btn" onClick={() => setShowTextDialog(false)}>取消</button>
              <button className="tb-btn primary" onClick={handleConfirmText}>添加</button>
            </div>
          </div>
        </div>
      )}

      {showObjectPool && (
        <div className="canvas-overlay" onClick={() => { setShowObjectPool(false); setPoolSearch(''); }}>
          <div className="canvas-overlay-panel" onClick={e => e.stopPropagation()}>
            <h4>对象池 — 选择对象添加到画板</h4>
            <input className="pool-search" type="text" placeholder="搜索对象名称、类型、标签..." value={poolSearch} onChange={e => setPoolSearch(e.target.value)} autoFocus />
            <div className="pool-list">
              {filteredPoolItems.length === 0 ? (
                <div className="pool-empty">{poolSearch.trim() ? '无匹配对象' : '所有对象已在此画板中'}</div>
              ) : (
                filteredPoolItems.map(obj => (
                  <div key={obj.id} className="pool-item" onClick={() => handleSelectFromPool(obj)}>
                    <span className="pool-item-type">{obj.type}</span>
                    <span className="pool-item-name">{obj.name}</span>
                    <span style={{ fontSize: 10, color: '#888', background: '#1e1e1e', padding: '1px 5px', borderRadius: 3 }}>{obj.status}</span>
                  </div>
                ))
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button className="tb-btn" onClick={() => { setShowObjectPool(false); setPoolSearch(''); }}>取消</button></div>
          </div>
        </div>
      )}

      {showTemplatePicker && (
        <div className="canvas-overlay" onClick={() => setShowTemplatePicker(false)}>
          <div className="canvas-overlay-panel" onClick={e => e.stopPropagation()}>
            <h4>选择画板模板</h4>
            <div className="template-grid">
              <div className="template-card" onClick={() => setShowTemplatePicker(false)}><div className="template-icon">📄</div><div className="template-name">空白画板</div><div className="template-desc">从空白开始</div></div>
              <div className="template-card" onClick={() => { setShowTemplatePicker(false); setActiveTab('角色关系图'); }}><div className="template-icon">🔗</div><div className="template-name">角色关系图</div><div className="template-desc">角色关系布局、连线</div></div>
              <div className="template-card" onClick={() => { setShowTemplatePicker(false); setActiveTab('时间线'); }}><div className="template-icon">📅</div><div className="template-name">时间线</div><div className="template-desc">横向时间轴布局</div></div>
              <div className="template-card" onClick={() => { setShowTemplatePicker(false); setActiveTab('设定推演图'); }}><div className="template-icon">🧩</div><div className="template-name">设定推演图</div><div className="template-desc">问题→方案→锁定 五区布局</div></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button className="tb-btn" onClick={() => setShowTemplatePicker(false)}>取消</button></div>
          </div>
        </div>
      )}

      {contextMenu && (
        <div className="canvas-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={e => e.stopPropagation()}>
          <button className="ctx-item" onClick={() => { onCreateObject('事件'); setContextMenu(null); }}>➜ 转为对象</button>
        </div>
      )}
    </div>
  );
}
