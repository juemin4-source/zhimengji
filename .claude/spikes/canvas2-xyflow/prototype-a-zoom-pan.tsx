/**
 * Prototype A: L1-L4 Zoom/Pan Performance
 *
 * Purpose: Validate that @xyflow/react v12 can render a 4-layer hierarchical
 * structure (book → shiwei → hou → zhang) with zoom-to-fit per layer,
 * smooth pan across large graphs, and acceptable performance at max node counts.
 *
 * Approach: Single ReactFlow instance storing ALL nodes. A `currentLayer` state
 * controls which subset of the tree is visible. `fitView` centers on the
 * active layer's nodes. This avoids sub-flow complexity (experimental in v12)
 * and gives us full control over viewport transitions.
 *
 * Max node counts: L1=1, L2=6, L3=180, L4=1800 (total ~1987)
 *
 * Key @xyflow APIs tested:
 *   - ReactFlow with controlled nodes/edges
 *   - useNodesState, useEdgesState
 *   - useReactFlow().fitView({ nodes, duration })
 *   - useReactFlow().setViewport({ x, y, zoom })
 *   - Custom nodeTypes
 *   - nodeClick / paneClick events for layer navigation
 *
 * Integration risk: LOW — same APIs already used in StructureFlowView.tsx
 * Performance risk: MEDIUM — 1800 nodes may stress SVG rendering
 *
 * === Usage ===
 * This component can be mounted in a test harness page. It is self-contained
 * and does not import any production stores or api modules.
 */

import { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
  type OnNodeDragEnd,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// ── Layer Type ──

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

// ── Node Data Shape ──

interface CanvasNodeData {
  label: string;
  layer: Layer;
  parentId: string | null;
  childIds: string[];
  collapsed: boolean;
}

// ── Custom Node Component ──

function LayerNodeComponent({ data, selected }: NodeProps<CanvasNodeData>) {
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
          boxShadow: selected
            ? `0 0 14px ${color}44, 0 2px 6px rgba(0,0,0,0.3)`
            : '0 2px 6px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ fontSize: '0.62rem', fontWeight: 600, color, textTransform: 'uppercase', marginBottom: 3 }}>
          {label}
        </div>
        <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#e0e0e0', wordBreak: 'break-word' }}>
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
// Generates hierarchical test data for all 4 layers at specified max counts.

interface GeneratedData {
  nodes: Node<CanvasNodeData>[];
  edges: Edge[];
  rootId: string;
}

function generateTreeData(
  l2Count: number,   // shiwei
  l3Count: number,   // hou per shiwei
  l4Count: number,   // zhang per hou
): GeneratedData {
  const nodes: Node<CanvasNodeData>[] = [];
  const edges: Edge[] = [];
  let idCounter = 0;
  const nid = () => `n_${++idCounter}`;

  // L1: Book
  const rootId = nid();
  const l1Children: string[] = [];

  nodes.push({
    id: rootId,
    type: 'canvasNode',
    position: { x: 0, y: 0 },
    data: {
      label: '故事骨架 (Book)',
      layer: 1,
      parentId: null,
      childIds: [],
      collapsed: false,
    },
  });

  // L2: Shiwei nodes
  for (let s = 0; s < l2Count; s++) {
    const shiweiId = nid();
    const offsetX = (s - (l2Count - 1) / 2) * 220;
    l1Children.push(shiweiId);
    const l2Children: string[] = [];

    nodes.push({
      id: shiweiId,
      type: 'canvasNode',
      position: { x: offsetX, y: 200 },
      data: {
        label: `Shiwei ${s + 1}`,
        layer: 2,
        parentId: rootId,
        childIds: [],
        collapsed: false,
      },
    });

    edges.push({
      id: `e-${rootId}-${shiweiId}`,
      source: rootId,
      target: shiweiId,
      type: 'smoothstep',
      style: { stroke: '#555', strokeWidth: 2 },
    });

    // L3: Hou nodes
    for (let h = 0; h < l3Count; h++) {
      const houId = nid();
      const hOffsetX = (h - (l3Count - 1) / 2) * 180;
      l2Children.push(houId);
      const l3Children: string[] = [];

      nodes.push({
        id: houId,
        type: 'canvasNode',
        position: { x: offsetX + hOffsetX, y: 400 },
        data: {
          label: `Hou ${s + 1}-${h + 1}`,
          layer: 3,
          parentId: shiweiId,
          childIds: [],
          collapsed: false,
        },
      });

      edges.push({
        id: `e-${shiweiId}-${houId}`,
        source: shiweiId,
        target: houId,
        type: 'smoothstep',
        style: { stroke: '#555', strokeWidth: 2 },
      });

      // L4: Zhang nodes
      for (let z = 0; z < l4Count; z++) {
        const zhangId = nid();
        const zOffsetX = (z - (l4Count - 1) / 2) * 160;
        l3Children.push(zhangId);

        nodes.push({
          id: zhangId,
          type: 'canvasNode',
          position: { x: offsetX + hOffsetX + zOffsetX, y: 580 },
          data: {
            label: `Zhang ${s + 1}-${h + 1}-${z + 1}`,
            layer: 4,
            parentId: houId,
            childIds: [],
            collapsed: false,
          },
        });

        edges.push({
          id: `e-${houId}-${zhangId}`,
          source: houId,
          target: zhangId,
          type: 'smoothstep',
          style: { stroke: '#555', strokeWidth: 1.5 },
        });
      }

      // Update hou childIds
      const houNode = nodes.find(n => n.id === houId)!;
      houNode.data.childIds = l3Children;
    }

    // Update shiwei childIds
    const shiweiNode = nodes.find(n => n.id === shiweiId)!;
    shiweiNode.data.childIds = l2Children;
  }

  // Update book childIds
  nodes[0].data.childIds = l1Children;

  return { nodes, edges, rootId };
}

// ── Main Prototype Component ──

interface ZoomPanPrototypeProps {
  // Test data sizes
  l2Count?: number;
  l3Count?: number;
  l4Count?: number;
}

export default function ZoomPanPrototype({
  l2Count = 2,
  l3Count = 3,
  l4Count = 4,
}: ZoomPanPrototypeProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  // Generate tree data (stable across renders via useMemo)
  const { nodes: allNodes, edges: allEdges, rootId } = useMemo(
    () => generateTreeData(l2Count, l3Count, l4Count),
    [l2Count, l3Count, l4Count],
  );

  // Display state: current layer and which parent we're zoomed into
  const [currentLayer, setCurrentLayer] = useState<Layer>(1);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);

  // Filter nodes by current layer and focus
  const visibleNodeIds = useMemo(() => {
    const ids = new Set<string>();

    if (currentLayer === 1) {
      // L1: only the root book node
      ids.add(rootId);
    } else {
      // For layers 2+, find the focus node's children and their descendants
      const focusNode = allNodes.find(n => n.id === (focusNodeId || rootId));
      if (!focusNode) return ids;

      // Include the focus node (parent)
      ids.add(focusNode.id);

      // Include direct children up to currentLayer depth
      const collectDescendants = (parentId: string, depth: number) => {
        if (depth >= currentLayer) return;
        const parent = allNodes.find(n => n.id === parentId);
        if (!parent) return;
        for (const cid of parent.data.childIds) {
          ids.add(cid);
          collectDescendants(cid, depth + 1);
        }
      };

      collectDescendants(focusNode.id, 1);
    }

    return ids;
  }, [currentLayer, focusNodeId, allNodes, rootId]);

  const nodes: Node[] = useMemo(
    () => allNodes.filter(n => visibleNodeIds.has(n.id)),
    [allNodes, visibleNodeIds],
  );

  const edges: Edge[] = useMemo(
    () => allEdges.filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)),
    [allEdges, visibleNodeIds],
  );

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(nodes);
  const [flowEdges, , onEdgesChange] = useEdgesState(edges);

  // Sync nodes when filter changes
  useEffect(() => {
    // Preserve existing positions for nodes that already exist
    setFlowNodes(nds => {
      const existingPositions = new Map(nds.map(n => [n.id, n.position]));
      return nodes.map(n => ({
        ...n,
        position: existingPositions.get(n.id) || n.position,
      }));
    });
  }, [nodes, setFlowNodes]);

  useEffect(() => {
    setFlowEdges(edges);
  }, [edges, setFlowEdges]);

  // Fit viewport to visible nodes after layer change
  const { fitView } = useReactFlow();

  useEffect(() => {
    // Small delay to let nodes render
    const timer = setTimeout(() => {
      fitView({ duration: 300, padding: 0.15 });
    }, 50);
    return () => clearTimeout(timer);
  }, [currentLayer, focusNodeId, fitView]);

  // Node click → navigate deeper
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<CanvasNodeData>) => {
      if (node.data.layer < 4 && node.data.childIds.length > 0) {
        setFocusNodeId(node.id);
        setCurrentLayer((node.data.layer + 1) as Layer);
      }
    },
    [],
  );

  // Pane click → zoom out one layer
  const onPaneClick = useCallback(() => {
    if (currentLayer > 1) {
      setCurrentLayer((currentLayer - 1) as Layer);
      // Find the parent of the current focus
      if (focusNodeId) {
        const focusNode = allNodes.find(n => n.id === focusNodeId);
        if (focusNode?.data.parentId) {
          setFocusNodeId(focusNode.data.parentId);
        } else {
          setFocusNodeId(null);
        }
      }
    }
  }, [currentLayer, focusNodeId, allNodes]);

  // Node types (stable reference)
  const nodeTypes = useMemo(() => ({ canvasNode: LayerNodeComponent }), []);

  // ── Layer navigation controls ──

  const canZoomIn = currentLayer < 4 && nodes.some(n => n.data.childIds.length > 0);
  const canZoomOut = currentLayer > 1;

  const navigateToLayer = useCallback(
    (layer: Layer) => {
      setCurrentLayer(layer);
      if (layer === 1) setFocusNodeId(null);
    },
    [],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0d0d1a', color: '#e0e0e0' }}>
      {/* Layer info bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', borderBottom: '1px solid #2a2a2a', background: '#12122a' }}>
        <span style={{ fontSize: '0.75rem', color: '#888' }}>Layer:</span>
        {([1, 2, 3, 4] as Layer[]).map(l => (
          <button
            key={l}
            onClick={() => navigateToLayer(l)}
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
        <span style={{ fontSize: '0.7rem', color: '#666' }}>
          {nodes.length} nodes visible / {allNodes.length} total
        </span>
      </div>

      {/* ReactFlow canvas */}
      <div ref={reactFlowWrapper} style={{ flex: 1 }}>
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onInit={instance => { reactFlowInstance.current = instance; }}
          fitView
          colorMode="dark"
          minZoom={0.05}
          maxZoom={3}
          defaultEdgeOptions={{ style: { stroke: '#555', strokeWidth: 2 } }}
        >
          <Background color="#2a2a3a" gap={20} />
          <Controls showInteractive={false} />
          {allNodes.length < 500 && <MiniMap style={{ background: '#1a1a2e' }} />}
        </ReactFlow>
      </div>

      {/* Navigation hints */}
      <div style={{ padding: '6px 16px', borderTop: '1px solid #2a2a2a', background: '#12122a', fontSize: '0.7rem', color: '#666', display: 'flex', gap: 16 }}>
        <span>Click a node → zoom to children</span>
        <span>Click empty area → zoom out</span>
        <span>Use layer buttons (L1-L4) for direct navigation</span>
      </div>
    </div>
  );
}
