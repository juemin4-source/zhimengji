/**
 * StructureFlowView — 画板② 结构 @xyflow 节点图 (织梦机 v2)
 *
 * Full ReactFlow node graph with 4 node types, inline inspector,
 * position persistence, child cascade delete, default template.
 */

import { useMemo, useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  useNodesState,
  Background,
  Controls,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
  type OnNodeDragEnd,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useProjectStore } from '../../stores/projectStore';
import * as structureApi from '../../api/structureApi';
import type { StructureNode, StructureNodeType } from '../../contracts/structure.contract';
import { confirmStructure } from '../../stores/pipeline-helper';
import './structure-flow.css';

// ===== Constants =====

const NODE_COLORS: Record<StructureNodeType, string> = {
  book: '#B7FF00',
  phase: '#4A9EFF',
  position: '#FFB74D',
  chapter: '#CE93D8',
};

const NODE_LABELS: Record<StructureNodeType, string> = {
  book: '作品',
  phase: '阶段',
  position: '情节点',
  chapter: '章节',
};

const CHILD_TYPE: Partial<Record<StructureNodeType, StructureNodeType>> = {
  book: 'phase',
  phase: 'position',
  position: 'chapter',
};

const DEFAULT_PHASES = ['开端', '发展', '高潮'];

// ===== Custom Node Component =====

function StructureNodeComponent({ data, selected }: NodeProps) {
  const nt = (data.nodeType || 'chapter') as StructureNodeType;
  const color = NODE_COLORS[nt] || '#888';
  const label = NODE_LABELS[nt] || nt;
  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="structure-node-handle"
        style={{ background: color }}
      />
      <div
        className="structure-node-container"
        style={{
          border: `2px solid ${selected ? '#fff' : color}`,
          boxShadow: selected
            ? `0 0 14px ${color}44, 0 2px 6px rgba(0,0,0,0.3)`
            : '0 2px 6px rgba(0,0,0,0.3)',
        }}
      >
        <div className="structure-node-type-label" style={{ color }}>
          {label}
        </div>
        <div className="structure-node-title">
          {data.title || '未命名'}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="structure-node-handle"
        style={{ background: color }}
      />
    </>
  );
}

export default function StructureFlowView() {
  const projectId = useProjectStore(s => s.currentProjectId);
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [selectedNode, setSelectedNode] = useState<StructureNode | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNarrativeFunction, setEditNarrativeFunction] = useState('');
  const [editSummary, setEditSummary] = useState('');

  // Edges derived from parentId — NOT stored independently
  const edges: Edge[] = useMemo(
    () =>
      nodes
        .filter(n => n.data.parentId)
        .map(n => ({
          id: `e-${n.data.parentId}-${n.id}`,
          source: n.data.parentId as string,
          target: n.id,
          type: 'smoothstep' as const,
          style: { stroke: '#555', strokeWidth: 2 },
        })),
    [nodes],
  );

  // ── Load nodes from SQLite ──
  const loadNodes = useCallback(async () => {
    if (!projectId) return;
    try {
      const sns = await structureApi.listStructureNodes(projectId);
      const flowNodes: Node[] = sns.map(sn => ({
        id: sn.id,
        type: 'structureNode',
        position: { x: sn.positionX, y: sn.positionY },
        data: { ...sn },
      }));
      setNodes(flowNodes);
    } catch (e) {
      console.error('Failed to load structure nodes', e);
    } finally {
      setLoading(false);
    }
  }, [projectId, setNodes]);

  useEffect(() => {
    loadNodes();
  }, [loadNodes]);

  // ── nodeTypes MUST be useMemo'd ──
  const nodeTypes = useMemo(() => ({ structureNode: StructureNodeComponent }), []);

  // ── Click to inspect ──
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const sn = node.data as StructureNode;
    setSelectedNode(sn);
    setEditTitle(sn.title);
    setEditNarrativeFunction(sn.narrativeFunction || '');
    setEditSummary(sn.summary || '');
  }, []);

  const onPaneClick = useCallback(() => setSelectedNode(null), []);

  // ── Drag end → save position ──
  const onNodeDragEnd: OnNodeDragEnd = useCallback(
    async (_, node) => {
      if (!projectId) return;
      try {
        await structureApi.updateStructureNode({
          id: node.id,
          parentId: (node.data.parentId as string) ?? null,
          title: node.data.title as string,
          nodeType: node.data.nodeType as StructureNodeType,
          narrativeFunction: (node.data.narrativeFunction as string) || '',
          summary: (node.data.summary as string) || '',
          positionX: Math.round(node.position.x),
          positionY: Math.round(node.position.y),
          sortOrder: (node.data.sortOrder as number) || 0,
        });
      } catch (e) {
        console.error('Failed to save position', e);
      }
    },
    [projectId],
  );

  // ── Save edit from inspector ──
  const handleSaveEdit = useCallback(async () => {
    if (!selectedNode || !projectId) return;
    try {
      const updated = await structureApi.updateStructureNode({
        id: selectedNode.id,
        parentId: selectedNode.parentId ?? null,
        title: editTitle,
        nodeType: selectedNode.nodeType,
        narrativeFunction: editNarrativeFunction,
        summary: editSummary,
        positionX: selectedNode.positionX,
        positionY: selectedNode.positionY,
        sortOrder: selectedNode.sortOrder,
      });
      setNodes(nds =>
        nds.map(n => (n.id === selectedNode.id ? { ...n, data: { ...updated } } : n)),
      );
      setSelectedNode(updated);
    } catch (e) {
      console.error('Failed to update node', e);
    }
  }, [selectedNode, projectId, editTitle, editNarrativeFunction, editSummary, setNodes]);

  // ── Add child node (auto-infer type) ──
  const handleAddChild = useCallback(async () => {
    if (!selectedNode || !projectId) return;
    const childType = CHILD_TYPE[selectedNode.nodeType];
    if (!childType) return;

    const children = nodes.filter(n => n.data.parentId === selectedNode.id);
    const sortOrder = children.length;
    const offset = children.length * 180 - 90;
    const posX = Math.max(50, selectedNode.positionX + offset);
    const posY = selectedNode.positionY + 180;

    try {
      const child = await structureApi.createStructureNode({
        projectId,
        parentId: selectedNode.id,
        title: `新${NODE_LABELS[childType]}`,
        nodeType: childType,
        narrativeFunction: '',
        summary: '',
        positionX: posX,
        positionY: posY,
        sortOrder,
      });
      setNodes(nds => [
        ...nds,
        {
          id: child.id,
          type: 'structureNode',
          position: { x: child.positionX, y: child.positionY },
          data: { ...child },
        },
      ]);
    } catch (e) {
      console.error('Failed to create child', e);
    }
  }, [selectedNode, projectId, nodes, setNodes]);

  // ── Delete node (cascade to children) ──
  const handleDelete = useCallback(async () => {
    if (!selectedNode || !projectId) return;

    const findDescendants = (parentId: string, acc: Set<string>) => {
      for (const n of nodes) {
        if (n.data.parentId === parentId && !acc.has(n.id)) {
          acc.add(n.id);
          findDescendants(n.id, acc);
        }
      }
    };

    const ids = new Set<string>([selectedNode.id]);
    findDescendants(selectedNode.id, ids);

    try {
      const sorted = [...ids].reverse();
      for (const id of sorted) {
        await structureApi.deleteStructureNode(id);
      }
      setNodes(nds => nds.filter(n => !ids.has(n.id)));
      setSelectedNode(null);
    } catch (e) {
      console.error('Failed to delete node', e);
    }
  }, [selectedNode, projectId, nodes, setNodes]);

  // ── Create default template ──
  const handleCreateDefault = useCallback(async () => {
    if (!projectId) return;
    try {
      const book = await structureApi.createStructureNode({
        projectId,
        parentId: null,
        title: '作品结构',
        nodeType: 'book',
        narrativeFunction: '',
        summary: '',
        positionX: 400,
        positionY: 50,
        sortOrder: 0,
      });
      for (let i = 0; i < DEFAULT_PHASES.length; i++) {
        await structureApi.createStructureNode({
          projectId,
          parentId: book.id,
          title: DEFAULT_PHASES[i],
          nodeType: 'phase',
          narrativeFunction: '',
          summary: '',
          positionX: 150 + i * 250,
          positionY: 250,
          sortOrder: i,
        });
      }
      await loadNodes();
    } catch (e) {
      console.error('Failed to create default structure', e);
    }
  }, [projectId, loadNodes]);

  // ── Confirm → advance pipeline ──
  const handleConfirm = useCallback(async () => {
    if (!projectId) return;
    try {
      await confirmStructure(projectId);
    } catch (e) {
      console.error('Failed to confirm structure', e);
    }
  }, [projectId]);

  // ── Render ──

  if (loading) {
    return (
      <div className="structure-flow-empty">
        <div className="spinner" />
        <p>加载结构节点...</p>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="structure-flow-empty">
        <p className="structure-flow-empty-text">还没有结构节点</p>
        <p className="structure-flow-empty-hint">
          点击下方按钮创建包含作品 + 三阶段（开端/发展/高潮）的默认骨架
        </p>
        <button
          className="structure-flow-btn structure-flow-btn-primary"
          style={{ padding: '10px 28px', fontSize: '0.85rem' }}
          onClick={handleCreateDefault}
        >
          创建默认结构
        </button>
      </div>
    );
  }

  return (
    <div className="structure-flow-wrapper">
      <div className="structure-flow-toolbar">
        <button className="structure-flow-btn structure-flow-btn-secondary" onClick={handleCreateDefault}>
          重建默认结构
        </button>
        <div className="structure-flow-toolbar-spacer" />
        <button className="structure-flow-btn structure-flow-btn-success" onClick={handleConfirm}>
          确认结构 ✓
        </button>
      </div>

      <div className="structure-flow-flex">
        <div className="structure-flow-flow">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onNodeDragEnd={onNodeDragEnd}
            fitView
            colorMode="dark"
            minZoom={0.1}
            maxZoom={2}
            defaultEdgeOptions={{ style: { stroke: '#555', strokeWidth: 2 } }}
          >
            <Background color="#2a2a3a" gap={20} size={1} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>

        {/* Inspector Panel */}
        {selectedNode && (
          <div className="structure-flow-inspector">
            <div className="structure-flow-insp-title">
              编辑 {NODE_LABELS[selectedNode.nodeType as StructureNodeType] || '节点'}
            </div>

            <div>
              <div className="structure-flow-label">标题</div>
              <input
                className="structure-flow-input"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                placeholder="节点标题"
              />
            </div>

            <div>
              <div className="structure-flow-label">叙事功能</div>
              <textarea
                className="structure-flow-textarea"
                value={editNarrativeFunction}
                onChange={e => setEditNarrativeFunction(e.target.value)}
                placeholder="该节点在叙事中的功能作用"
                rows={3}
              />
            </div>

            <div>
              <div className="structure-flow-label">摘要</div>
              <textarea
                className="structure-flow-textarea"
                value={editSummary}
                onChange={e => setEditSummary(e.target.value)}
                placeholder="节点内容摘要"
                rows={4}
              />
            </div>

            <div className="structure-flow-btn-row">
              <button
                className="structure-flow-btn structure-flow-btn-primary"
                style={{ flex: 1 }}
                onClick={handleSaveEdit}
              >
                保存
              </button>
              <button
                className="structure-flow-btn structure-flow-btn-secondary"
                style={{ flex: 1 }}
                onClick={handleAddChild}
              >
                + 添加子节点
              </button>
            </div>

            <div style={{ marginTop: 4 }}>
              <button
                className="structure-flow-btn structure-flow-btn-danger structure-flow-btn-full"
                onClick={handleDelete}
              >
                删除节点（含子节点）
              </button>
            </div>

            <div className="structure-flow-node-id">
              ID: {selectedNode.id.slice(0, 10)}...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
