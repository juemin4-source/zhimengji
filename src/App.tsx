import { useState, useCallback, useMemo, useEffect } from 'react';
import type { WorldObject, Connection, NavTab, CanvasTab, CanvasTabState, ObjectType, ObjectStatus, CanonLevel, JudgmentOperation } from './types/world';
import { CANVAS_TABS, OBJECT_TYPES, CANON_LEVELS, OBJECT_STATUSES } from './types/world';
import { TEMPLATES } from './data/seed';
import type { Project } from './types/world';
import * as api from './tauri-api';

import Bookshelf from './components/Bookshelf';
import DocumentView from './components/DocumentView';
import CanvasView from './components/CanvasView';
import SettingCollection from './components/SettingCollection';
import JudgmentRecords from './components/JudgmentRecords';
import Inspector from './components/Inspector';
import './styles/global.css';
import './styles/variables.css';

// ===== ID Generators =====
let _nextId = 1000;
function uid(): string { return `obj_${_nextId++}`; }
function cid(): string { return `conn_${_nextId++}`; }
function jid(): string { return `judg_${_nextId++}`; }

function createDefaultCanvasStates(): Record<CanvasTab, CanvasTabState> {
  const states: Record<string, CanvasTabState> = {};
  for (const tab of CANVAS_TABS) {
    states[tab] = {
      tabId: tab,
      positions: {},
      stickyNotes: [],
      connections: [],
      scale: 1,
      panX: 0,
      panY: 0,
    };
  }
  return states as Record<CanvasTab, CanvasTabState>;
}

function mapDTOtoProject(dto: api.ProjectDTO): Project {
  let gradient: [string, string] = ['#6366f1', '#8b5cf6'];
  try { const g = JSON.parse(dto.gradient); if (Array.isArray(g) && g.length >= 2) gradient = [g[0], g[1]]; } catch {}
  return {
    id: dto.id,
    title: dto.name,
    genre: dto.genre || '未分类',
    status: (dto.status as Project['status']) || 'conceiving',
    wordCount: dto.wordCount ?? 0,
    gradient,
  };
}

function mapProjectToCreate(name: string, genre?: string): Promise<api.ProjectDTO> {
  return api.createProject(name, genre || '未分类', 'conceiving', 0, '["#6366f1","#8b5cf6"]');
}

// ===== App Component =====
export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [activeBookId, setActiveBookId] = useState<string | null>(null);

  // Live state for the active book
  const [objects, setObjects] = useState<WorldObject[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [activeNavTab, setActiveNavTab] = useState<NavTab>('文档');
  const [canvasStates, setCanvasStates] = useState<Record<CanvasTab, CanvasTabState>>(createDefaultCanvasStates);

  // Load projects on mount
  useEffect(() => {
    api.listProjects()
      .then(dtos => setProjects(dtos.map(mapDTOtoProject)))
      .catch(e => console.error('Failed to load projects', e))
      .finally(() => setProjectsLoading(false));
  }, []);

  const activeBook = useMemo(
    () => projects.find(b => b.id === activeBookId) || null,
    [projects, activeBookId]
  );
  const currentObject = useMemo(
    () => objects.find(o => o.id === selectedObjectId) || null,
    [objects, selectedObjectId]
  );
  const allBoardTabs = CANVAS_TABS;
  const bookshelfProjects = projects;
  const settingDefaultSelected = useMemo(
    () => { const first = objects.find(o => o.canonLevel !== '未收录'); return first?.id; },
    [objects]
  );

  // Load project data from backend when entering a project
  const loadProjectData = useCallback(async (projectId: string) => {
    try {
      const [objs, conns, canvases] = await Promise.all([
        api.listWorldObjects(projectId),
        api.listConnections(projectId),
        api.listCanvasTabStates(projectId),
      ]);
      setObjects(objs);
      setConnections(conns);
      // Build canvas states from backend
      const cs: Record<string, CanvasTabState> = {};
      for (const tab of CANVAS_TABS) {
        const found = canvases.find(c => c.tabId === tab);
        cs[tab] = found || { tabId: tab, positions: {}, stickyNotes: [], connections: [], scale: 1, panX: 0, panY: 0 };
      }
      setCanvasStates(cs as Record<CanvasTab, CanvasTabState>);
      setSelectedObjectId(objs.length > 0 ? objs[0].id : null);
    } catch (e) {
      console.error('Failed to load project data', e);
      setObjects([]);
      setConnections([]);
      setCanvasStates(createDefaultCanvasStates());
      setSelectedObjectId(null);
    }
  }, []);

  // Refresh project list from backend
  const refreshProjects = useCallback(async () => {
    try {
      const dtos = await api.listProjects();
      setProjects(dtos.map(mapDTOtoProject));
    } catch (e) {
      console.error('Failed to refresh projects', e);
    }
  }, []);

  const handleEnterProject = useCallback(async (project: Project) => {
    setActiveBookId(project.id);
    setActiveNavTab('文档');
    await loadProjectData(project.id);
  }, [loadProjectData]);

  const handleBackToBookshelf = useCallback(() => {
    setActiveBookId(null);
    setSelectedObjectId(null);
    setObjects([]);
    setConnections([]);
  }, []);

  const handleCreateProject = useCallback(async () => {
    try {
      const dto = await mapProjectToCreate('新作品');
      const project = mapDTOtoProject(dto);
      await refreshProjects();
      setActiveBookId(project.id);
      setActiveNavTab('文档');
      setObjects([]);
      setConnections([]);
      setCanvasStates(createDefaultCanvasStates());
      setSelectedObjectId(null);
    } catch (e) {
      console.error('Failed to create project', e);
    }
  }, [refreshProjects]);

  // ══════════════════════════════════════════
  //  Judgment Operations (sync to backend)
  //  NOTE: defined BEFORE CRUD so onUpdateObject can reference addJudgment
  // ══════════════════════════════════════════

  const addJudgment = useCallback(async (objectId: string, operationType: JudgmentOperation, reason: string, prevValue: string, newValue: string) => {
    const obj = objects.find(o => o.id === objectId);
    if (!obj) return;
    const now = Date.now();
    const statusOps: JudgmentOperation[] = ['锁定', '废弃', '待验证'];
    const record = {
      id: jid(), objectId, objectName: obj.name, operationType,
      reason, timestamp: now, previousStatus: prevValue, newStatus: newValue,
    };
    setObjects(prev => prev.map(o =>
      o.id === objectId
        ? {
            ...o,
            // Only overwrite status for status-type operations
            ...(statusOps.includes(operationType) ? { status: newValue as ObjectStatus } : {}),
            judgmentHistory: [...o.judgmentHistory, record],
            updatedAt: now,
          }
        : o
    ));
    api.appendJudgmentRecord(record).catch(e => console.error('Failed to append judgment', e));
  }, [objects]);

  const onLockObject = useCallback((objectId: string, reason: string) => {
    const obj = objects.find(o => o.id === objectId);
    if (obj) addJudgment(objectId, '锁定', reason || '手动锁定', obj.status, '锁定');
  }, [objects, addJudgment]);

  const onDiscardObject = useCallback((objectId: string, reason: string) => {
    const obj = objects.find(o => o.id === objectId);
    if (obj) addJudgment(objectId, '废弃', reason || '手动废弃', obj.status, '废弃');
  }, [objects, addJudgment]);

  const onUnlockObject = useCallback((objectId: string, reason: string) => {
    const obj = objects.find(o => o.id === objectId);
    if (obj) addJudgment(objectId, '待验证', reason || '解锁回退', obj.status, '待验证');
  }, [objects, addJudgment]);

  // ══════════════════════════════════════════
  //  WorldObject CRUD (sync to backend)
  // ══════════════════════════════════════════

  const onUpdateObject = useCallback(async (id: string, updates: Partial<WorldObject>) => {
    // Handle judgment creation BEFORE state updater
    const before = objects.find(o => o.id === id);
    if (before) {
      if (updates.status && updates.status !== before.status) {
        addJudgment(id, '待验证', `状态变更: ${before.status} → ${updates.status}`, before.status, updates.status);
      }
      if (updates.canonLevel && updates.canonLevel !== before.canonLevel) {
        const idxBefore = CANON_LEVELS.indexOf(before.canonLevel);
        const idxAfter = CANON_LEVELS.indexOf(updates.canonLevel);
        const op: JudgmentOperation = idxAfter > idxBefore ? '提升正典' : '收录';
        addJudgment(id, op, `正典等级变更: ${before.canonLevel} → ${updates.canonLevel}`, before.canonLevel, updates.canonLevel);
      }
    }
    setObjects(prev => {
      const updated = prev.map(o => o.id === id ? { ...o, ...updates, updatedAt: Date.now() } as WorldObject : o);
      const target = updated.find(o => o.id === id);
      if (target && activeBookId) {
        const objWithProject = { ...target, projectId: activeBookId };
        api.updateWorldObject(objWithProject).catch(e => console.error('Failed to update object', e));
      }
      return updated;
    });
  }, [activeBookId, objects, addJudgment]);

  const onCreateObject = useCallback(async (templateType: ObjectType) => {
    const template = TEMPLATES.find(t => t.type === templateType);
    const now = Date.now();
    const newObj: WorldObject = {
      id: uid(), projectId: activeBookId || '', name: `新${templateType}`,
      type: templateType, status: (template?.defaultStatus ?? '草稿') as ObjectStatus,
      canonLevel: '未收录' as CanonLevel,
      tags: template?.defaultTags ?? [], aliases: [], selectedBoards: [],
      content: template?.defaultContent ?? '', referencesCount: 0, judgmentHistory: [],
      createdAt: now, updatedAt: now,
    };
    setObjects(prev => [...prev, newObj]);
    setSelectedObjectId(newObj.id);
    setActiveNavTab('文档');
    if (activeBookId) {
      api.createWorldObject(newObj).catch(e => console.error('Failed to create object', e));
    }
  }, [activeBookId]);

  const onCreateNamedObject = useCallback(async (name: string, objectType: ObjectType) => {
    const template = TEMPLATES.find(t => t.type === objectType);
    const now = Date.now();
    const newObj: WorldObject = {
      id: uid(), projectId: activeBookId || '', name,
      type: objectType, status: (template?.defaultStatus ?? '草稿') as ObjectStatus,
      canonLevel: '未收录' as CanonLevel,
      tags: template?.defaultTags ?? [], aliases: [], selectedBoards: [],
      content: template?.defaultContent ?? '', referencesCount: 0, judgmentHistory: [],
      createdAt: now, updatedAt: now,
    };
    setObjects(prev => [...prev, newObj]);
    setSelectedObjectId(newObj.id);
    setActiveNavTab('文档');
    if (activeBookId) {
      api.createWorldObject(newObj).catch(e => console.error('Failed to create named object', e));
    }
  }, [activeBookId]);

  const onDeleteObject = useCallback(async (id: string) => {
    setObjects(prev => prev.filter(o => o.id !== id));
    if (selectedObjectId === id) setSelectedObjectId(null);
    api.deleteWorldObject(id).catch(e => console.error('Failed to delete object', e));
  }, [selectedObjectId]);

  const onNavigate = useCallback((name: string) => {
    const target = objects.find(o => o.name === name);
    if (target) { setSelectedObjectId(target.id); setActiveNavTab('文档'); }
  }, [objects]);

  const onSelectObject = useCallback((objectId: string | null) => {
    setSelectedObjectId(objectId);
  }, []);

  const onAddToBoard = useCallback((objectId: string, board: string) => {
    setObjects(prev => prev.map(o => {
      if (o.id !== objectId || o.selectedBoards.includes(board)) return o;
      const updated = { ...o, selectedBoards: [...o.selectedBoards, board], updatedAt: Date.now() };
      if (activeBookId) {
        api.updateWorldObject({ ...updated, projectId: activeBookId }).catch(e => console.error('Failed to update board', e));
      }
      return updated;
    }));
  }, [activeBookId]);

  const onInspectorAction = useCallback((action: string, objectId: string, extra?: string) => {
    switch (action) {
      case '收录为设定': {
        const obj = objects.find(o => o.id === objectId);
        if (!obj || obj.canonLevel !== '未收录') return;
        addJudgment(objectId, '提升正典', '收录为设定', obj.canonLevel, '草案正典');
        setObjects(prev => prev.map(o =>
          o.id === objectId ? { ...o, canonLevel: '草案正典' as CanonLevel, updatedAt: Date.now() } : o
        ));
        break;
      }
      case '放入画板': if (extra) onAddToBoard(objectId, extra); break;
      case '锁定': onLockObject(objectId, extra || ''); break;
      case '废弃': onDiscardObject(objectId, extra || ''); break;
      case '解锁': onUnlockObject(objectId, extra || ''); break;
      case '查看引用': {
        const obj = objects.find(o => o.id === objectId);
        if (obj) { const ref = objects.find(o => o.id !== obj.id && o.content.includes(obj.name)); if (ref) onNavigate(ref.name); }
        break;
      }
      case '判断记录': setSelectedObjectId(objectId); setActiveNavTab('判断记录'); break;
    }
  }, [objects, onAddToBoard, onLockObject, onDiscardObject, onUnlockObject, addJudgment, onNavigate]);

  // ══════════════════════════════════════════
  //  Canvas Operations (sync to backend)
  // ══════════════════════════════════════════

  const saveCanvasState = useCallback(async (tabId: CanvasTab, state: Partial<CanvasTabState>) => {
    if (!activeBookId) return;
    const current = canvasStates[tabId];
    const merged: CanvasTabState = { ...current, ...state };
    setCanvasStates(prev => ({ ...prev, [tabId]: merged }));
    // Persist to backend — use the tabId as the DB id for upsert
    const canvasRecord: CanvasTabState = {
      ...merged,
      tabId,
    };
    // We need an id; use projectId:tabId as convention
    const canvasId = `${activeBookId}:${tabId}`;
    api.saveCanvasTabState({ ...canvasRecord, id: canvasId, projectId: activeBookId })
      .catch(e => console.error('Failed to save canvas state', e));
  }, [activeBookId, canvasStates]);

  const onUpdateCanvasState = useCallback((tabId: CanvasTab, state: Partial<CanvasTabState>) => {
    saveCanvasState(tabId, state);
  }, [saveCanvasState]);

  const onAddConnection = useCallback(async (sourceId: string, targetId: string, type: string, label: string) => {
    if (!activeBookId) return;
    const newConn: Connection = {
      id: cid(), sourceId, targetId, type: type as any, label,
      projectId: activeBookId,
    };
    setConnections(prev => [...prev, newConn]);
    setCanvasStates(prev => {
      const next = { ...prev } as Record<CanvasTab, CanvasTabState>;
      for (const tab of CANVAS_TABS) {
        const s = next[tab];
        if (s.positions[sourceId] && s.positions[targetId]) {
          next[tab] = { ...s, connections: [...s.connections, newConn] };
        }
      }
      return next;
    });
    api.createConnection(newConn).catch(e => console.error('Failed to create connection', e));
  }, [activeBookId]);

  const onAddSticky = useCallback((tabId: CanvasTab, text: string) => {
    setCanvasStates(prev => ({
      ...prev,
      [tabId]: { ...prev[tabId], stickyNotes: [...prev[tabId].stickyNotes, { id: `sticky_${_nextId++}`, text, x: 100, y: 100, width: 160, height: 100, color: '#3E2723' }] }
    }));
  }, []);

  // ══════════════════════════════════════════
  //  Canvas Object Creation (AC1: double-click to create at position)
  // ══════════════════════════════════════════

  const onCanvasCreateObject = useCallback((templateType: ObjectType, board: CanvasTab, x: number, y: number) => {
    const template = TEMPLATES.find(t => t.type === templateType);
    const now = Date.now();
    const newObj: WorldObject = {
      id: uid(), projectId: activeBookId || '', name: `新${templateType}`,
      type: templateType, status: (template?.defaultStatus ?? '草稿') as ObjectStatus,
      canonLevel: '未收录' as CanonLevel,
      tags: template?.defaultTags ?? [], aliases: [], selectedBoards: [board],
      content: template?.defaultContent ?? '', referencesCount: 0, judgmentHistory: [],
      createdAt: now, updatedAt: now,
    };
    setObjects(prev => [...prev, newObj]);
    setSelectedObjectId(newObj.id);
    // Stay on canvas — do NOT navigate away
    if (activeBookId) {
      api.createWorldObject(newObj).catch(e => console.error('Failed to create object', e));
    }
    // Set the position immediately on the canvas
    setCanvasStates(prev => {
      const tab = prev[board];
      if (!tab) return prev;
      return {
        ...prev,
        [board]: {
          ...tab,
          positions: {
            ...tab.positions,
            [newObj.id]: { objectId: newObj.id, x, y },
          },
        },
      } as Record<CanvasTab, CanvasTabState>;
    });
  }, [activeBookId]);

  const NAV_TABS: NavTab[] = ['文档', '画板', '设定集', '判断记录'];

  const renderMainContent = () => {
    switch (activeNavTab) {
      case '文档': return <DocumentView currentObject={currentObject} allObjects={objects} allBoardTabs={allBoardTabs} onUpdateObject={onUpdateObject} onNavigate={onNavigate} onAddToBoard={onAddToBoard} onLockObject={onLockObject} onDiscardObject={onDiscardObject} onCreateObject={onCreateObject} onCreateNamedObject={onCreateNamedObject} />;
      case '画板': return <CanvasView allObjects={objects} connections={connections} canvasStates={canvasStates} selectedObjectId={selectedObjectId} onSelectObject={onSelectObject} onNavigate={onNavigate} onUpdateCanvasState={onUpdateCanvasState} onAddConnection={onAddConnection} onAddSticky={onAddSticky} onAddToBoard={onAddToBoard} onCreateObject={onCreateObject} onCanvasCreateObject={onCanvasCreateObject} />;
      case '设定集': return <SettingCollection allObjects={objects} onSelectObject={onSelectObject} onNavigate={onNavigate} onUpdateObject={onUpdateObject} onCreateObject={onCreateObject} defaultSelected={settingDefaultSelected} />;
      case '判断记录': return <JudgmentRecords allObjects={objects} onNavigate={onNavigate} />;
      default: return null;
    }
  };

  if (projectsLoading) {
    return (
      <div className="app-layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ color: '#888' }}>加载中...</p>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {activeBookId === null ? (
        <Bookshelf projects={bookshelfProjects} onEnterProject={handleEnterProject} onCreateProject={handleCreateProject} />
      ) : (
        <>
          <nav className="nav-bar">
            <button onClick={handleBackToBookshelf} className="nav-back-btn" title="返回书架">← 书架</button>
            <span className="app-title">{activeBook?.title ?? '设定管理器'}</span>
            {NAV_TABS.map(tab => (
              <button key={tab} className={`nav-tab ${activeNavTab === tab ? 'active' : ''}`} onClick={() => setActiveNavTab(tab)}>{tab}</button>
            ))}
          </nav>
          <div className="main-area">
            <div className="main-content">{renderMainContent()}</div>
            <Inspector object={currentObject} allObjects={objects} allBoardTabs={allBoardTabs} onNavigate={onNavigate} onAction={onInspectorAction} />
          </div>
        </>
      )}
    </div>
  );
}
