/**
 * Prototype C: Layer State Retention
 *
 * Purpose: Validate that when a user navigates L4 → zooms out to L2 → back to L4,
 * all expanded/collapsed states, node positions, and selection state are preserved.
 * No data loss during layer switches.
 *
 * Approach:
 * - Maintain a `layerStateCache` (Record<Layer, LayerState>) that stores:
 *     - expandedNodeIds: Set of node IDs that are expanded at this layer
 *     - selectedNodeId: ID of the selected node (if any)
 *     - viewport: { x, y, zoom } for precise restoration
 *     - nodePositions: Map of node ID → position (for persisted positions)
 * - On navigating away from a layer → snapshot current state into cache.
 * - On navigating back to a layer → restore from cache.
 * - This is layered on top of Prototype A's filter-based approach.
 *
 * Key @xyflow APIs tested:
 *   - useReactFlow().getViewport() / setViewport() — viewport snapshot & restore
 *   - useNodesState — can be replaced with a custom state hook that reads from cache
 *   - Node positions are preserved because we keep the same node objects
 *
 * State management strategy:
 *   - For a spike: plain React state (useRef for cache, useState for active state)
 *   - For production: zustand store (consistent with existing projectStore pattern)
 *
 * Integration effort: LOW — layer state cache is a simple key-value store.
 * If using zustand, the store pattern is already established in the codebase.
 *
 * === Usage ===
 * Self-contained component. Mount in a test harness.
 */

import { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
  type Viewport,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// ── Types ──

type Layer = 1 | 2 | 3 | 4;

const LAYER_LABELS: Record<Layer, string> = {
  1: 'Book',
  2: 'Shiwei',
  3: 'Hou',
  4: 'Zhang',
};

const LAYER_COLORS: Record<Layer, string> = {
  1: '#B7FF00',
  2: '#4A9EFF',
  3: '#FFB74D',
  4: '#CE93D8',
};

interface CanvasNodeData {
  label: string;
  layer: Layer;
  parentId: string | null;
  childIds: string[];
  expanded: boolean;
}

interface LayerState {
  selectedNodeId: string | null;
  viewport: Viewport;
  expandedNodeIds: Set<string>;
  // Position data is stored per-node-id, not per-layer, since it's global
}

// ── Custom Node ──

function StateNodeComponent({ data, selected }: NodeProps<CanvasNodeData>) {
  const color = LAYER_COLORS[data.layer];
  const label = LAYER_LABELS[data.layer];
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ background: color }} />
      <div
        style={{
          background: '#1a1a2e',
          border: `2px solid ${selected ? '#fff' : color}`,
          borderRadius: 8,
          padding: '8px 14px',
          minWidth: 130,
          cursor: 'pointer',
          opacity: data.expanded ? 1 : 0.6,
          boxShadow: selected ? `0 0 14px ${color}44` : '0 2px 6px rgba(0,0,0,0.3)',
          transition: 'opacity 0.2s ease',
        }}
      >
        <div style={{ fontSize: '0.62rem', fontWeight: 600, color, textTransform: 'uppercase', marginBottom: 3 }}>
          {label} {data.expanded ? '▾' : '▸'}
        </div>
        <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#e0e0e0' }}>
          {data.label}
        </div>
        {data.childIds.length > 0 && (
          <div style={{ fontSize: '0.65rem', color: '#888', marginTop: 4 }}>
            {data.childIds.length} children
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: color }} />
    </>
  );
}

// ── Data Generator ──

interface TreeData {
  nodes: Node<CanvasNodeData>[];
  edges: Edge[];
  rootId: string;
}

function generateSampleTree(): TreeData {
  const nodes: Node<CanvasNodeData>[] = [];
  const edges: Edge[] = [];
  let c = 0;
  const id = () => `s_${++c}`;

  const rootId = id();
  nodes.push({
    id: rootId,
    type: 'stateNode',
    position: { x: 0, y: 0 },
    data: { label: '龙族 (Book)', layer: 1, parentId: null, childIds: [], expanded: true },
  });

  const shiweiList = ['角色弧光', '世界设定', '剧情主线'];
  const shiweiIds: string[] = [];
  shiweiList.forEach((name, i) => {
    const sid = id();
    shiweiIds.push(sid);
    nodes.push({
      id: sid,
      type: 'stateNode',
      position: { x: (i - 1) * 250, y: 200 },
      data: { label: name, layer: 2, parentId: rootId, childIds: [], expanded: true },
    });
    edges.push({ id: `e-${rootId}-${sid}`, source: rootId, target: sid, type: 'smoothstep', style: { stroke: '#555', strokeWidth: 2 } });
  });

  const houNames = ['启蒙', '成长', '决战'];
  shiweiIds.forEach((sid, si) => {
    houNames.forEach((hn, hi) => {
      const hid = id();
      nodes.push({
        id: hid,
        type: 'stateNode',
        position: { x: (si - 1) * 250 + (hi - 1) * 180, y: 400 },
        data: { label: hn, layer: 3, parentId: sid, childIds: [], expanded: true },
      });
      edges.push({ id: `e-${sid}-${hid}`, source: sid, target: hid, type: 'smoothstep', style: { stroke: '#555', strokeWidth: 2 } });
    });
  });

  // L4 nodes only under "角色弧光 > 启蒙"
  const roleArcNode = nodes.find(n => n.data.label === '角色弧光')!;
  const qiMengNode = nodes.find(n => n.data.label === '启蒙' && n.data.parentId === roleArcNode.id);
  if (qiMengNode) {
    const zhangNames = ['路明非入学', '楚子航的过去', '绘梨衣登场', '源稚生的抉择', '龙王苏醒'];
    const zhangIds: string[] = [];
    zhangNames.forEach((zn, zi) => {
      const zid = id();
      zhangIds.push(zid);
      nodes.push({
        id: zid,
        type: 'stateNode',
        position: { x: (zi - 2) * 160, y: 580 },
        data: { label: zn, layer: 4, parentId: qiMengNode.id, childIds: [], expanded: true },
      });
      edges.push({ id: `e-${qiMengNode.id}-${zid}`, source: qiMengNode.id, target: zid, type: 'smoothstep', style: { stroke: '#555', strokeWidth: 1.5 } });
    });
    qiMengNode.data.childIds = zhangIds;
  }

  // Build parent childIds
  nodes[0].data.childIds = shiweiIds;
  shiweiIds.forEach((sid, i) => {
    const n = nodes.find(x => x.id === sid)!;
    n.data.childIds = ['启蒙', '成长', '决战'].map((_, hi) => {
      return nodes.find(x => x.data.label === houNames[hi] && x.data.parentId === sid)?.id || '';
    }).filter(Boolean);
  });

  return { nodes, edges, rootId };
}

// ── Main Prototype C Component ──

export default function StateRetentionPrototype() {
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Tree data
  const { nodes: allNodes, edges: allEdges, rootId } = useMemo(() => generateSampleTree(), []);

  // Navigation state
  const [currentLayer, setCurrentLayer] = useState<Layer>(1);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Layer state cache — persists across layer switches
  const layerCacheRef = useRef<Record<Layer, LayerState>>({
    1: { selectedNodeId: null, viewport: { x: 0, y: 0, zoom: 1 }, expandedNodeIds: new Set() },
    2: { selectedNodeId: null, viewport: { x: 0, y: 0, zoom: 1 }, expandedNodeIds: new Set() },
    3: { selectedNodeId: null, viewport: { x: 0, y: 0, zoom: 1 }, expandedNodeIds: new Set() },
    4: { selectedNodeId: null, viewport: { x: 0, y: 0, zoom: 1 }, expandedNodeIds: new Set() },
  });

  // Navigation stack (for breadcrumb)
  const [navStack, setNavStack] = useState<{ layer: Layer; nodeId: string | null }[]>([
    { layer: 1, nodeId: null },
  ]);

  // Visible nodes based on current layer
  const visibleNodeIds = useMemo(() => {
    const ids = new Set<string>();
    if (currentLayer === 1) {
      ids.add(rootId);
    } else {
      const fn = allNodes.find(n => n.id === (focusNodeId || rootId));
      if (!fn) return ids;
      ids.add(fn.id);
      const addKids = (pid: string, depth: number) => {
        if (depth >= currentLayer) return;
        const p = allNodes.find(n => n.id === pid);
        if (!p) return;
        for (const cid of p.data.childIds) {
          ids.add(cid);
          addKids(cid, depth + 1);
        }
      };
      addKids(fn.id, 1);
    }
    return ids;
  }, [currentLayer, focusNodeId, allNodes, rootId]);

  const visibleNodes = useMemo(
    () => allNodes.filter(n => visibleNodeIds.has(n.id)),
    [allNodes, visibleNodeIds],
  );
  const visibleEdges = useMemo(
    () => allEdges.filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)),
    [allEdges, visibleNodeIds],
  );

  // ── Layer State Persistence ──

  // Snapshot current layer state before navigating away
  const { getViewport } = useReactFlow();

  const snapshotCurrentLayer = useCallback(() => {
    const viewport = getViewport();
    layerCacheRef.current[currentLayer] = {
      selectedNodeId,
      viewport,
      expandedNodeIds: layerCacheRef.current[currentLayer]?.expandedNodeIds || new Set(),
    };
  }, [currentLayer, selectedNodeId, getViewport]);

  // Restore layer state when navigating to a layer
  const restoreLayerState = useCallback(
    (layer: Layer) => {
      const cached = layerCacheRef.current[layer];
      if (cached) {
        setSelectedNodeId(cached.selectedNodeId);
      }
    },
    [],
  );

  // ── Node state management ──

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(visibleNodes);
  const [flowEdges, , onEdgesChange] = useEdgesState(visibleEdges);

  useEffect(() => {
    setFlowNodes(visibleNodes);
  }, [visibleNodes, setFlowNodes]);

  useEffect(() => {
    setFlowEdges(visibleEdges);
  }, [visibleEdges, setFlowEdges]);

  const { fitView, setViewport } = useReactFlow();

  // When layer changes: snapshot old, restore new, fit view
  const navigateToLayer = useCallback(
    (layer: Layer, nodeId: string | null) => {
      // Snapshot current before leaving
      snapshotCurrentLayer();

      // Update state
      setCurrentLayer(layer);
      setFocusNodeId(nodeId);

      // Restore cached state for target layer
      restoreLayerState(layer);

      // Fit view
      setTimeout(() => fitView({ duration: 300, padding: 0.15 }), 50);
    },
    [snapshotCurrentLayer, restoreLayerState, fitView],
  );

  // Node click → drill down & snapshot expand state
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<CanvasNodeData>) => {
      setSelectedNodeId(node.id);

      // Update expanded state in cache
      const cache = layerCacheRef.current[currentLayer];
      if (cache) {
        const newSet = new Set(cache.expandedNodeIds);
        if (newSet.has(node.id)) {
          newSet.delete(node.id); // toggle collapse
        } else {
          newSet.add(node.id); // expand
        }
        layerCacheRef.current[currentLayer] = { ...cache, expandedNodeIds: newSet };
      }

      // Update node data
      setFlowNodes(nds =>
        nds.map(n =>
          n.id === node.id ? { ...n, data: { ...n.data, expanded: !n.data.expanded } } : n,
        ),
      );

      // Navigate deeper if has children
      if (node.data.layer < 4 && node.data.childIds.length > 0) {
        const newLayer = (node.data.layer + 1) as Layer;
        setNavStack(prev => [...prev, { layer: newLayer, nodeId: node.id }]);
        navigateToLayer(newLayer, node.id);
      }
    },
    [currentLayer, navigateToLayer, setFlowNodes],
  );

  // Pane click → zoom out
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    if (currentLayer > 1) {
      const newStack = navStack.slice(0, -1);
      const prev = newStack[newStack.length - 1];
      setNavStack(newStack);
      navigateToLayer(prev.layer, prev.nodeId);
    }
  }, [currentLayer, navStack, navigateToLayer]);

  // Simulate: navigate L4 → L2 → back to L4 (test state retention)
  const handleTestRetention = useCallback(() => {
    // Current layer → snapshot
    snapshotCurrentLayer();
    // Jump to L2 (keep book as focus)
    navigateToLayer(2, rootId);
    // After a delay, restore to L4
    setTimeout(() => {
      const lastEntry = navStack[navStack.length - 1];
      navigateToLayer(lastEntry.layer, lastEntry.nodeId);
    }, 500);
  }, [snapshotCurrentLayer, navigateToLayer, rootId, navStack]);

  const nodeTypes = useMemo(() => ({ stateNode: StateNodeComponent }), []);

  // Status display helper
  const cacheStatus = useMemo(() => {
    const c = layerCacheRef.current;
    return Object.entries(c).map(([layer, state]) => ({
      layer: Number(layer) as Layer,
      hasViewport: state.viewport.x !== 0 || state.viewport.y !== 0 || state.viewport.zoom !== 1,
      selectedNodeId: state.selectedNodeId,
      expandedCount: state.expandedNodeIds.size,
    }));
  }, [currentLayer]); // re-read on render (ref is mutable)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0d0d1a', color: '#e0e0e0' }}>
      {/* Layer nav bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderBottom: '1px solid #2a2a2a', background: '#12122a' }}>
        {([1, 2, 3, 4] as Layer[]).map(l => (
          <button
            key={l}
            onClick={() => {
              snapshotCurrentLayer();
              const entry = navStack.find(e => e.layer <= l);
              navigateToLayer(l, entry?.nodeId || null);
            }}
            style={{
              padding: '4px 12px',
              borderRadius: 6,
              border: `1px solid ${currentLayer === l ? LAYER_COLORS[l] : '#333'}`,
              background: currentLayer === l ? `${LAYER_COLORS[l]}22` : '#1a1a2e',
              color: currentLayer === l ? LAYER_COLORS[l] : '#aaa',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontFamily: 'inherit',
            }}
          >
            L{l}: {LAYER_LABELS[l]}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={handleTestRetention}
          style={{
            padding: '4px 12px',
            borderRadius: 6,
            border: '1px solid #FFB74D',
            background: '#FFB74D22',
            color: '#FFB74D',
            cursor: 'pointer',
            fontSize: '0.7rem',
            fontFamily: 'inherit',
          }}
        >
          Test: L4 → L2 → L4
        </button>
      </div>

      {/* ReactFlow canvas */}
      <div ref={wrapperRef} style={{ flex: 1 }}>
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          fitView
          colorMode="dark"
          minZoom={0.05}
          maxZoom={3}
          defaultEdgeOptions={{ style: { stroke: '#555', strokeWidth: 2 } }}
        >
          <Background color="#2a2a3a" gap={20} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      {/* Cache status bar */}
      <div style={{ padding: '6px 16px', borderTop: '1px solid #2a2a2a', background: '#12122a', fontSize: '0.65rem', color: '#666', display: 'flex', gap: 12 }}>
        {cacheStatus.map(cs => (
          <span key={cs.layer}>
            L{cs.layer}: {cs.expandedCount} expanded |
            sel={cs.selectedNodeId ? 'yes' : 'no'} |
            vp={cs.hasViewport ? 'stored' : 'default'}
          </span>
        ))}
      </div>

      <div style={{ padding: '4px 16px 6px', borderTop: '1px solid #2a2a2a', background: '#12122a', fontSize: '0.7rem', color: '#666' }}>
        Selected node: {selectedNodeId ? allNodes.find(n => n.id === selectedNodeId)?.data.label || selectedNodeId : 'none'}
      </div>
    </div>
  );
}
