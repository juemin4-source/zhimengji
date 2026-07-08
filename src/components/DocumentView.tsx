import { useMemo, useRef, useCallback } from 'react';
import type { WorldObject, ObjectType, ObjectStatus, CanonLevel } from '../types/world';
import { OBJECT_TYPES, OBJECT_STATUSES, CANON_LEVELS, STATUS_DISPLAY } from '../types/world';
import { TEMPLATES } from '../data/seed';
import DocOutline from './DocOutline';

interface DocumentViewProps {
  currentObject: WorldObject | null;
  allObjects: WorldObject[];
  allBoardTabs: string[];
  onUpdateObject: (id: string, updates: Partial<WorldObject>) => void;
  onNavigate: (name: string) => void;
  onAddToBoard: (objectId: string, board: string) => void;
  onLockObject: (objectId: string, reason: string) => void;
  onDiscardObject: (objectId: string, reason: string) => void;
  onCreateObject: (templateType: ObjectType) => void;
}

export default function DocumentView({
  currentObject, allObjects,
  onUpdateObject, onNavigate, onCreateObject
}: DocumentViewProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);

  const insertFormat = useCallback((prefix: string, suffix: string = '') => {
    const ta = textareaRef.current;
    if (!ta || !currentObject) return;
    undoStack.current.push(currentObject.content);
    redoStack.current = [];
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = currentObject.content;
    const before = text.slice(0, start);
    const selected = text.slice(start, end);
    const after = text.slice(end);
    const newText = before + prefix + selected + suffix + after;
    onUpdateObject(currentObject.id, { content: newText });
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  }, [currentObject, onUpdateObject]);

  const wikiLinks = useMemo(() => {
    if (!currentObject) return [];
    const matches = currentObject.content.match(/\[\[([^\]]+)\]\]/g);
    if (!matches) return [];
    return matches.map(m => m.slice(2, -2).trim()).filter(Boolean);
  }, [currentObject]);

  const wordCount = useMemo(() => {
    if (!currentObject) return 0;
    const text = currentObject.content.replace(/\[\[([^\]]+)\]\]/g, '$1');
    const chineseChars = (text.match(/[一-鿿]/g) || []).length;
    const englishWords = text.replace(/[一-鿿]/g, ' ').split(/\s+/).filter(w => w.length > 0).length;
    return chineseChars + englishWords;
  }, [currentObject]);

  const handleDoubleClick = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta || !currentObject) return;
    const pos = ta.selectionStart;
    const text = currentObject.content;
    const before = text.slice(0, pos);
    const lastOpen = before.lastIndexOf('[[');
    const fromOpen = text.slice(pos);
    const nextClose = fromOpen.indexOf(']]');
    if (lastOpen >= 0 && nextClose >= 0) {
      const name = text.slice(lastOpen + 2, pos + nextClose).trim();
      if (name) {
        const target = allObjects.find(o => o.name === name);
        if (target) onNavigate(name);
      }
    }
  }, [currentObject, allObjects, onNavigate]);

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (currentObject) {
      undoStack.current.push(currentObject.content);
      redoStack.current = [];
      onUpdateObject(currentObject.id, { content: e.target.value });
    }
  }, [currentObject, onUpdateObject]);

  const handleUndo = useCallback(() => {
    if (!currentObject || undoStack.current.length === 0) return;
    redoStack.current.push(currentObject.content);
    const prev = undoStack.current.pop()!;
    onUpdateObject(currentObject.id, { content: prev });
  }, [currentObject, onUpdateObject]);

  const handleRedo = useCallback(() => {
    if (!currentObject || redoStack.current.length === 0) return;
    const next = redoStack.current.pop()!;
    undoStack.current.push(currentObject.content);
    onUpdateObject(currentObject.id, { content: next });
  }, [currentObject, onUpdateObject]);

  const handleStatusChange = useCallback((newStatus: ObjectStatus) => {
    if (currentObject) onUpdateObject(currentObject.id, { status: newStatus });
  }, [currentObject, onUpdateObject]);

  const handleTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    if (currentObject) onUpdateObject(currentObject.id, { type: e.target.value as ObjectType });
  }, [currentObject, onUpdateObject]);

  const handleCanonChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    if (currentObject) onUpdateObject(currentObject.id, { canonLevel: e.target.value as CanonLevel });
  }, [currentObject, onUpdateObject]);

  if (!currentObject) {
    return (
      <div className="doc-view">
        <DocOutline allObjects={allObjects} currentObjectId={null} onNavigate={onNavigate} />
        <div className="doc-editor-area">
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
            <p style={{ fontSize: 18, marginBottom: 16 }}>选择或创建一个对象</p>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
              <span style={{ color: '#888', fontSize: 13, width: '100%', marginBottom: 8 }}>使用模板快速创建：</span>
              {TEMPLATES.map(t => (
                <button key={t.type} className="tb-btn primary" onClick={() => onCreateObject(t.type)} style={{ background: '#333' }}>+ {t.type}</button>
              ))}
            </div>
            <div style={{ marginTop: 24, fontSize: 13, color: '#666' }}>或在文档中写入 [[对象名]] 来创建引用</div>
          </div>
        </div>
      </div>
    );
  }

  const sd = STATUS_DISPLAY[currentObject.status];

  return (
    <div className="doc-view">
      <DocOutline allObjects={allObjects} currentObjectId={currentObject.id} onNavigate={onNavigate} />
      <div className="doc-editor-area">
        <div className="doc-toolbar">
          <button className="tb-btn" onClick={handleUndo} title="Undo">↩</button>
          <button className="tb-btn" onClick={handleRedo} title="Redo">↪</button>
          <span className="separator" />
          <button className="tb-btn" onClick={() => insertFormat('## ', '')} title="Heading 2">H2</button>
          <button className="tb-btn" onClick={() => insertFormat('### ', '')} title="Heading 3">H3</button>
          <span className="separator" />
          <button className="tb-btn" onClick={() => insertFormat('**', '**')} title="Bold" style={{ fontWeight: 700 }}>B</button>
          <button className="tb-btn" onClick={() => insertFormat('*', '*')} title="Italic" style={{ fontStyle: 'italic' }}>I</button>
          <button className="tb-btn" onClick={() => insertFormat('~~', '~~')} title="Strikethrough" style={{ textDecoration: 'line-through' }}>S</button>
          <span className="separator" />
          <button className="tb-btn" onClick={() => insertFormat('> ', '')} title="Blockquote">❝</button>
          <button className="tb-btn" onClick={() => insertFormat('- ', '')} title="List">≡</button>
          <button className="tb-btn" onClick={() => insertFormat('`', '`')} title="Inline Code">&lt;/&gt;</button>
        </div>

        <div className="doc-properties">
          <div className="prop-item"><label>类型</label><select value={currentObject.type} onChange={handleTypeChange}>{OBJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
          <div className="prop-item">
            <label>状态</label>
            <select value={currentObject.status} onChange={e => handleStatusChange(e.target.value as ObjectStatus)} style={{ borderColor: sd ? sd.border.split(' ')[1] : undefined }}>
              {OBJECT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="prop-item"><label>正典等级</label><select value={currentObject.canonLevel} onChange={handleCanonChange}>{CANON_LEVELS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
        </div>

        <div className="doc-editor">
          <textarea ref={textareaRef} value={currentObject.content} onChange={handleContentChange} onDoubleClick={handleDoubleClick} placeholder="在此输入文档内容... 使用 [[对象名]] 引用其他对象" spellCheck={false} />
          <div className="word-count">
            字数: {wordCount} | [[链接]]: {wikiLinks.length}{wikiLinks.length > 0 && <span style={{ marginLeft: 8 }}>| 双击 [[链接]] 跳转</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
