/**
 * Prototype B: Breadcrumb Path Construction
 *
 * Purpose: Validate that a dynamic breadcrumb trail can work with @xyflow's
 * layered navigation. Breadcrumb segments correspond to the active navigation
 * path: Book > Shiwei > Hou > Zhang. Clicking any segment navigates directly
 * to that layer.
 *
 * Approach:
 * - Track `navigationStack` as an array of { layer, nodeId, label } entries.
 *   Each entry represents one segment of the breadcrumb.
 * - When user clicks a node → push the next layer onto the stack.
 * - When user clicks a breadcrumb segment → pop back to that level.
 * - Breadcrumb auto-updates when layer changes via any mechanism.
 *
 * Key @xyflow APIs tested:
 *   - Same as Prototype A (shared architecture)
 *   - No additional @xyflow APIs needed — breadcrumb is pure React UI
 *
 * Integration effort: LOW — breadcrumb is a separate UI component that
 * reads from the navigation store/state. No special @xyflow integration needed.
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
}

// ── Breadcrumb Segment ──

interface BreadcrumbSegment {
  layer: Layer;
  nodeId: string | null;
  label: string;
}

// ── Custom Node ──

function BcrumbNodeComponent({ data, selected }: NodeProps<CanvasNodeData>) {
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
          boxShadow: selected ? `0 0 14px ${color}44` : '0 2px 6px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ fontSize: '0.62rem', fontWeight: 600, color, textTransform: 'uppercase', marginBottom: 3 }}>
          {label}
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

// ── Sample Data Generator ──

interface TreeData {
  nodes: Node<CanvasNodeData>[];
  edges: Edge[];
  rootId: string;
}

function generateSmallTree(): TreeData {
  const nodes: Node<CanvasNodeData>[] = [];
  const edges: Edge[] = [];
  let c = 0;
  const id = () => `b_${++c}`;

  const rootId = id();
  nodes.push({
    id: rootId,
    type: 'bcNode',
    position: { x: 0, y: 0 },
    data: { label: '我的小说 (Book)', layer: 1, parentId: null, childIds: [] },
  });

  const shiweiList = ['角色线', '剧情线', '世界观线'];
  const shiweiIds: string[] = [];
  shiweiList.forEach((name, i) => {
    const sid = id();
    shiweiIds.push(sid);
    nodes.push({
      id: sid,
      type: 'bcNode',
      position: { x: (i - 1) * 250, y: 200 },
      data: { label: name, layer: 2, parentId: rootId, childIds: [] },
    });
    edges.push({ id: `e-${rootId}-${sid}`, source: rootId, target: sid, type: 'smoothstep', style: { stroke: '#555', strokeWidth: 2 } });
  });

  const houNames = ['起始', '冲突', '转折'];
  const houIds: string[] = [];
  shiweiIds.forEach((sid, si) => {
    houNames.forEach((hn, hi) => {
      const hid = id();
      houIds.push(hid);
      nodes.push({
        id: hid,
        type: 'bcNode',
        position: { x: (si - 1) * 250 + (hi - 1) * 180, y: 400 },
        data: { label: `${hn}`, layer: 3, parentId: sid, childIds: [] },
      });
      edges.push({ id: `e-${sid}-${hid}`, source: sid, target: hid, type: 'smoothstep', style: { stroke: '#555', strokeWidth: 2 } });
    });
  });

  // Update parent childIds
  nodes[0].data.childIds = shiweiIds;
  shiweiIds.forEach((sid, i) => {
    const n = nodes.find(x => x.id === sid)!;
    n.data.childIds = houIds.slice(i * 3, i * 3 + 3);
  });

  return { nodes, edges, rootId };
}

// ── Breadcrumb Component ──

interface BreadcrumbProps {
  segments: BreadcrumbSegment[];
  onNavigate: (segment: BreadcrumbSegment) => void;
  currentLayer: Layer;
}

function Breadcrumb({ segments, onNavigate, currentLayer }: BreadcrumbProps) {
  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 16px',
        background: '#12122a',
        borderBottom: '1px solid #2a2a2a',
        flexWrap: 'wrap',
      }}
      aria-label="Layer navigation breadcrumb"
    >
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        const isActive = seg.layer === currentLayer;
        return (
          <span key={`${seg.layer}-${seg.nodeId || 'root'}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Separator */}
            {i > 0 && (
              <span style={{ color: '#555', fontSize: '0.75rem' }}>›</span>
            )}

            {/* Segment */}
            <button
              onClick={() => onNavigate(seg)}
              disabled={isActive}
              style={{
                padding: '3px 10px',
                borderRadius: 4,
                border: `1px solid ${isActive ? LAYER_COLORS[seg.layer] : 'transparent'}`,
                background: isActive ? `${LAYER_COLORS[seg.layer]}22` : 'transparent',
                color: isActive ? LAYER_COLORS[seg.layer] : isLast ? '#ccc' : '#888',
                cursor: isActive ? 'default' : 'pointer',
                fontSize: '0.78rem',
                fontFamily: 'inherit',
                fontWeight: isActive ? 600 : 400,
                transition: 'all 0.15s ease',
              }}
              title={`Navigate to ${LAYER_LABELS[seg.layer]}: ${seg.label}`}
            >
              {seg.label}
            </button>
          </span>
        );
      })}

      {/* Layer indicator badge */}
      <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#666' }}>
        Layer {currentLayer}: {LAYER_LABELS[currentLayer]}
      </span>
    </nav>
  );
}

// ── Main Prototype B Component ──

export default function BreadcrumbPrototype() {
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Generate tree data
  const { nodes: allNodes, edges: allEdges, rootId } = useMemo(() => generateSmallTree(), []);

  // Navigation state
  const [breadcrumbStack, setBreadcrumbStack] = useState<BreadcrumbSegment[]>([
    { layer: 1, nodeId: null, label: LAYER_LABELS[1] },
  ]);
  const [currentLayer, setCurrentLayer] = useState<Layer>(1);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);

  // Resolve breadcrumb from stack
  const resolveBreadcrumb = useCallback(
    (stack: BreadcrumbSegment[]): BreadcrumbSegment[] => {
      return stack.map(seg => {
        if (seg.nodeId) {
          const node = allNodes.find(n => n.id === seg.nodeId);
          if (node) return { ...seg, label: node.data.label };
        }
        return seg;
      });
    },
    [allNodes],
  );

  const breadcrumbSegments = useMemo(() => resolveBreadcrumb(breadcrumbStack), [breadcrumbStack, resolveBreadcrumb]);

  // Compute visible nodes
  const visibleNodeIds = useMemo(() => {
    const ids = new Set<string>();
    if (currentLayer === 1) {
      ids.add(rootId);
    } else {
      const focusNode = allNodes.find(n => n.id === (focusNodeId || rootId));
      if (!focusNode) return ids;
      ids.add(focusNode.id);
      const addDescendants = (pid: string, depth: number) => {
        if (depth >= currentLayer) return;
        const p = allNodes.find(n => n.id === pid);
        if (!p) return;
        for (const cid of p.data.childIds) {
          ids.add(cid);
          addDescendants(cid, depth + 1);
        }
      };
      addDescendants(focusNode.id, 1);
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

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(visibleNodes);
  const [flowEdges, , onEdgesChange] = useEdgesState(visibleEdges);

  useEffect(() => {
    setFlowNodes(visibleNodes);
  }, [visibleNodes, setFlowNodes]);

  useEffect(() => {
    setFlowEdges(visibleEdges);
  }, [visibleEdges, setFlowEdges]);

  const { fitView } = useReactFlow();

  useEffect(() => {
    const t = setTimeout(() => fitView({ duration: 300, padding: 0.15 }), 50);
    return () => clearTimeout(t);
  }, [currentLayer, focusNodeId, fitView]);

  // Navigate deeper (click node)
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<CanvasNodeData>) => {
      if (node.data.layer < 4 && node.data.childIds.length > 0) {
        const newLayer = (node.data.layer + 1) as Layer;
        setCurrentLayer(newLayer);
        setFocusNodeId(node.id);

        // Push onto breadcrumb stack
        setBreadcrumbStack(prev => [
          ...prev,
          { layer: newLayer, nodeId: node.id, label: node.data.label },
        ]);
      }
    },
    [],
  );

  // Navigate via breadcrumb click
  const onBreadcrumbNavigate = useCallback(
    (segment: BreadcrumbSegment) => {
      if (segment.layer === currentLayer && segment.nodeId === focusNodeId) return;

      // Trim stack to this segment
      const idx = breadcrumbStack.findIndex(
        s => s.layer === segment.layer && s.nodeId === segment.nodeId,
      );
      if (idx >= 0) {
        setBreadcrumbStack(breadcrumbStack.slice(0, idx + 1));
      }

      setCurrentLayer(segment.layer);
      setFocusNodeId(segment.nodeId);
    },
    [currentLayer, focusNodeId, breadcrumbStack],
  );

  // Pane click → zoom out
  const onPaneClick = useCallback(() => {
    if (currentLayer > 1) {
      const newLayer = (currentLayer - 1) as Layer;
      setCurrentLayer(newLayer);

      // Pop breadcrumb stack
      setBreadcrumbStack(prev => prev.slice(0, -1));

      // Find parent of current focus
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

  const nodeTypes = useMemo(() => ({ bcNode: BcrumbNodeComponent }), []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0d0d1a' }}>
      {/* Breadcrumb bar */}
      <Breadcrumb
        segments={breadcrumbSegments}
        onNavigate={onBreadcrumbNavigate}
        currentLayer={currentLayer}
      />

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

      {/* Breadcrumb interaction hint */}
      <div style={{ padding: '6px 16px', borderTop: '1px solid #2a2a2a', background: '#12122a', fontSize: '0.7rem', color: '#666' }}>
        Click a breadcrumb segment to navigate directly to that layer. Click a node to drill down. Click empty space to go back.
      </div>
    </div>
  );
}
