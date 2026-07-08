import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { WikiLink } from '../extensions/WikiLink';
import type { WorldObject, ObjectType, ObjectStatus, CanonLevel } from '../types/world';
import { OBJECT_TYPES, OBJECT_STATUSES, CANON_LEVELS, STATUS_DISPLAY } from '../types/world';
import { TEMPLATES } from '../data/seed';
import DocOutline from './DocOutline';

type EditMode = 'wysiwyg' | 'source' | 'preview';

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
  onCreateNamedObject?: (name: string, objectType: ObjectType) => void;
}

/** Ensure content has basic HTML structure for TipTap rendering */
function ensureHtmlContent(content: string): string {
  if (!content) return '<p></p>';
  if (/<[a-z][\s\S]*>/i.test(content)) return content;
  const escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return '<p>' + escaped.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br>') + '</p>';
}

export default function DocumentView({
  currentObject, allObjects,
  onUpdateObject, onNavigate, onCreateObject, onCreateNamedObject
}: DocumentViewProps) {
  const [editMode, setEditMode] = useState<EditMode>('wysiwyg');
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const [contentDirty, setContentDirty] = useState(false);

  // ── AC1: Create bubble state ──
  const [showCreateBubble, setShowCreateBubble] = useState(false);
  const [createBubbleName, setCreateBubbleName] = useState('');
  const [createBubbleType, setCreateBubbleType] = useState<ObjectType>('人物');

  // ── WikiLink exists checker ──
  const wikiExists = useCallback((name: string): boolean => {
    return allObjects.some(o => o.name === name);
  }, [allObjects]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      WikiLink.configure({
        existsChecker: wikiExists,
        onDoubleClick: (name) => {
          const exists = wikiExists(name);
          if (exists) {
            onNavigate(name);
          } else {
            setCreateBubbleName(name);
            setCreateBubbleType('人物');
            setShowCreateBubble(true);
          }
          return true;
        },
      }),
    ],
    content: ensureHtmlContent(currentObject?.content || ''),
    editorProps: {
      attributes: {
        class: 'editor-content',
        'data-placeholder': '在此输入文档内容... 使用 [[对象名]] 引用其他对象',
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (currentObject) {
        onUpdateObject(currentObject.id, { content: ed.getHTML() });
      }
    },
  });

  // Update editor content when switching objects
  useEffect(() => {
    if (editor && currentObject) {
      const html = ensureHtmlContent(currentObject.content);
      if (editor.getHTML() !== html) {
        editor.commands.setContent(html);
      }
    }
  }, [editor, currentObject?.id]);

  const wikiLinks = useMemo(() => {
    if (!currentObject) return [];
    const content = editMode === 'wysiwyg'
      ? editor?.getText() || ''
      : currentObject.content;
    const matches = content.match(/\[\[([^\]]+)\]\]/g);
    if (!matches) return [];
    return matches.map(m => m.slice(2, -2).trim()).filter(Boolean);
  }, [currentObject, editMode, editor]);

  const wordCount = useMemo(() => {
    if (!currentObject) return 0;
    const text = currentObject.content;
    const chineseChars = (text.match(/[一-鿿]/g) || []).length;
    const englishWords = text.replace(/[一-鿿]/g, ' ').split(/\s+/).filter(w => w.length > 0).length;
    return chineseChars + englishWords;
  }, [currentObject]);

  // ── Source mode handlers ──

  const insertFormat = useCallback((prefix: string, suffix: string = '') => {
    const ta = sourceRef.current;
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

  const handleSourceChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (currentObject) {
      onUpdateObject(currentObject.id, { content: e.target.value });
      setContentDirty(true);
    }
  }, [currentObject, onUpdateObject]);

  const handleSourceDoubleClick = useCallback(() => {
    const ta = sourceRef.current;
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
        if (target) {
          onNavigate(name);
        } else {
          setCreateBubbleName(name);
          setCreateBubbleType('人物');
          setShowCreateBubble(true);
        }
      }
    }
  }, [currentObject, allObjects, onNavigate]);

  // ── AC3: Property change handlers ──
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (currentObject) onUpdateObject(currentObject.id, { type: e.target.value as ObjectType });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (currentObject) onUpdateObject(currentObject.id, { status: e.target.value as ObjectStatus });
  };

  const handleCanonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (currentObject) onUpdateObject(currentObject.id, { canonLevel: e.target.value as CanonLevel });
  };

  // ── AC1: Create bubble confirm ──
  const handleCreateFromBubble = useCallback(() => {
    if (!createBubbleName.trim()) return;
    if (onCreateNamedObject) {
      onCreateNamedObject(createBubbleName.trim(), createBubbleType);
    } else {
      onCreateObject(createBubbleType);
    }
    setShowCreateBubble(false);
    setCreateBubbleName('');
  }, [createBubbleName, createBubbleType, onCreateObject, onCreateNamedObject]);

  // ── WYSIWYG toolbar handlers ──

  const execBold = useCallback(() => editor?.chain().focus().toggleBold().run(), [editor]);
  const execItalic = useCallback(() => editor?.chain().focus().toggleItalic().run(), [editor]);
  const execStrike = useCallback(() => editor?.chain().focus().toggleStrike().run(), [editor]);
  const execH2 = useCallback(() => editor?.chain().focus().toggleHeading({ level: 2 }).run(), [editor]);
  const execH3 = useCallback(() => editor?.chain().focus().toggleHeading({ level: 3 }).run(), [editor]);
  const execBlockquote = useCallback(() => editor?.chain().focus().toggleBlockquote().run(), [editor]);
  const execBulletList = useCallback(() => editor?.chain().focus().toggleBulletList().run(), [editor]);
  const execCode = useCallback(() => editor?.chain().focus().toggleCode().run(), [editor]);
  const execCodeBlock = useCallback(() => editor?.chain().focus().toggleCodeBlock().run(), [editor]);
  const execUndo = useCallback(() => editor?.chain().focus().undo().run(), [editor]);
  const execRedo = useCallback(() => editor?.chain().focus().redo().run(), [editor]);

  const renderToolbar = () => {
    const isWysiwyg = editMode === 'wysiwyg';
    const isSource = editMode === 'source';
    const isPreview = editMode === 'preview';
    if (isPreview) return null;

    const commonButtons = (
      <>
        <span className="separator" />
        <button className={`tb-btn ${isWysiwyg ? 'active' : ''}`} onClick={() => { if (editor) editor.commands.setContent(ensureHtmlContent(currentObject?.content || '')); setEditMode('wysiwyg'); }} title="编辑">✎ 编辑</button>
        <button className={`tb-btn ${isSource ? 'active' : ''}`} onClick={() => setEditMode('source')} title="源码">&lt;/&gt; 源码</button>
        <button className="tb-btn" onClick={() => setEditMode('preview')} title="预览">👁 预览</button>
      </>
    );

    if (isWysiwyg && editor) {
      return (
        <div className="doc-toolbar">
          <button className="tb-btn" onClick={execUndo} title="Undo">↩</button>
          <button className="tb-btn" onClick={execRedo} title="Redo">↪</button>
          <span className="separator" />
          <button className={`tb-btn ${editor.isActive('heading', { level: 2 }) ? 'active' : ''}`} onClick={execH2} title="Heading 2">H2</button>
          <button className={`tb-btn ${editor.isActive('heading', { level: 3 }) ? 'active' : ''}`} onClick={execH3} title="Heading 3">H3</button>
          <span className="separator" />
          <button className={`tb-btn ${editor.isActive('bold') ? 'active' : ''}`} onClick={execBold} title="Bold" style={{ fontWeight: 700 }}>B</button>
          <button className={`tb-btn ${editor.isActive('italic') ? 'active' : ''}`} onClick={execItalic} title="Italic" style={{ fontStyle: 'italic' }}>I</button>
          <button className={`tb-btn ${editor.isActive('strike') ? 'active' : ''}`} onClick={execStrike} title="Strikethrough" style={{ textDecoration: 'line-through' }}>S</button>
          <span className="separator" />
          <button className={`tb-btn ${editor.isActive('blockquote') ? 'active' : ''}`} onClick={execBlockquote} title="Blockquote">❝</button>
          <button className={`tb-btn ${editor.isActive('bulletList') ? 'active' : ''}`} onClick={execBulletList} title="Bullet List">≡</button>
          <button className={`tb-btn ${editor.isActive('code') ? 'active' : ''}`} onClick={execCode} title="Inline Code">&lt;/&gt;</button>
          <button className={`tb-btn ${editor.isActive('codeBlock') ? 'active' : ''}`} onClick={execCodeBlock} title="Code Block">▦</button>
          {commonButtons}
        </div>
      );
    }

    return (
      <div className="doc-toolbar">
        <button className="tb-btn" onClick={() => { const ta = sourceRef.current; if (!ta || !currentObject) return; undoStack.current.push(currentObject.content); redoStack.current = []; const text = currentObject.content; const full = text.slice(0, ta.selectionStart); const lastLC = full.lastIndexOf('\n'); const lineStart = lastLC >= 0 ? lastLC + 1 : 0; const newText = text.slice(0, lineStart) + '## ' + text.slice(lineStart); onUpdateObject(currentObject.id, { content: newText }); }} title="Heading 2">H2</button>
        <button className="tb-btn" onClick={() => insertFormat('### ', '')} title="Heading 3">H3</button>
        <span className="separator" />
        <button className="tb-btn" onClick={() => insertFormat('**', '**')} title="Bold" style={{ fontWeight: 700 }}>B</button>
        <button className="tb-btn" onClick={() => insertFormat('*', '*')} title="Italic" style={{ fontStyle: 'italic' }}>I</button>
        <button className="tb-btn" onClick={() => insertFormat('~~', '~~')} title="Strikethrough" style={{ textDecoration: 'line-through' }}>S</button>
        <span className="separator" />
        <button className="tb-btn" onClick={() => insertFormat('> ', '')} title="Blockquote">❝</button>
        <button className="tb-btn" onClick={() => insertFormat('- ', '')} title="List">≡</button>
        <button className="tb-btn" onClick={() => insertFormat('`', '`')} title="Inline Code">&lt;/&gt;</button>
        {commonButtons}
      </div>
    );
  };

  // ── AC3: Property selectors ──
  const renderProperties = () => {
    if (!currentObject || editMode === 'preview') return null;
    const sd = STATUS_DISPLAY[currentObject.status];
    return (
      <div className="doc-properties">
        <div className="prop-item">
          <label>类型</label>
          <select value={currentObject.type} onChange={handleTypeChange}>
            {OBJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="prop-item">
          <label>状态</label>
          <select value={currentObject.status} onChange={handleStatusChange}
            style={{ background: sd.background, color: sd.text, border: sd.border }}>
            {OBJECT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="prop-item">
          <label>正典</label>
          <select value={currentObject.canonLevel} onChange={handleCanonChange}>
            {CANON_LEVELS.map(c => (
              <option key={c} value={c} style={{
                color: c === '核心正典' ? '#FFB74D' : c === '项目正典' ? '#90CAF9' : c === '草案正典' ? '#CE93D8' : '#999',
              }}>{c}</option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  const renderEditorContent = () => {
    if (editMode === 'wysiwyg') {
      return (
        <div className="doc-editor tiptap-editor">
          {editor && (
            <EditorContent editor={editor} />
          )}
        </div>
      );
    }
    if (editMode === 'source') {
      return (
        <div className="doc-editor">
          <textarea
            ref={sourceRef}
            value={currentObject?.content || ''}
            onChange={handleSourceChange}
            onDoubleClick={handleSourceDoubleClick}
            placeholder="在此输入文档内容... 使用 [[对象名]] 引用其他对象"
            spellCheck={false}
          />
        </div>
      );
    }
    // Preview mode
    return (
      <div className="doc-editor">
        <div
          className="editor-content preview-content"
          dangerouslySetInnerHTML={{
            __html: currentObject ? ensureHtmlContent(currentObject.content) : '',
          }}
        />
      </div>
    );
  };

  if (!currentObject) {
    return (
      <div className="doc-view">
        <DocOutline allObjects={allObjects} currentObjectId={null} onNavigate={onNavigate} onCreateObject={onCreateObject} />
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

  return (
    <div className="doc-view">
      <DocOutline allObjects={allObjects} currentObjectId={currentObject.id} onNavigate={onNavigate} onCreateObject={onCreateObject} />
      <div className="doc-editor-area">
        {renderToolbar()}
        {renderProperties()}
        {renderEditorContent()}

        <div className="word-count">
          字数: {wordCount} | [[链接]]: {wikiLinks.length}
          {wikiLinks.length > 0 && (
            <span style={{ marginLeft: 8 }}>
              | 双击{editMode === 'source' ? ' [[链接]]' : ' Wiki链接'} 跳转
            </span>
          )}
          {currentObject && currentObject.content.includes('<') && editMode === 'wysiwyg' && (
            <span style={{ marginLeft: 8, color: '#888' }}>| 编辑模式 · HTML格式</span>
          )}
        </div>
      </div>

      {/* AC1: Create bubble for missing wiki links */}
      {showCreateBubble && (
        <div className="dialog-overlay" onClick={() => setShowCreateBubble(false)}>
          <div className="dialog-box create-bubble" onClick={e => e.stopPropagation()}>
            <h4>创建对象「{createBubbleName}」</h4>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
              对象不存在，选择类型后创建并打开：
            </p>
            <div className="bubble-type-selector">
              {OBJECT_TYPES.map(t => (
                <button
                  key={t}
                  className={`bubble-type-btn ${createBubbleType === t ? 'selected' : ''}`}
                  onClick={() => setCreateBubbleType(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="dialog-actions" style={{ marginTop: 16 }}>
              <button className="ia-btn" onClick={() => setShowCreateBubble(false)}>取消</button>
              <button
                className="ia-btn"
                style={{ background: '#1a73e8' }}
                onClick={handleCreateFromBubble}
              >
                创建并打开
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
