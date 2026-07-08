import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import type { WorldObject, ObjectType } from '../types/world';
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
}

/** Ensure content has basic HTML structure for TipTap rendering */
function ensureHtmlContent(content: string): string {
  if (!content) return '<p></p>';
  // If it already has HTML tags, use as-is
  if (/<[a-z][\s\S]*>/i.test(content)) return content;
  // Otherwise wrap in <p> — preserve line breaks as <br>
  const escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return '<p>' + escaped.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br>') + '</p>';
}

export default function DocumentView({
  currentObject, allObjects,
  onUpdateObject, onNavigate, onCreateObject
}: DocumentViewProps) {
  const [editMode, setEditMode] = useState<EditMode>('wysiwyg');
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const [contentDirty, setContentDirty] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
    ],
    content: ensureHtmlContent(currentObject?.content || ''),
    editorProps: {
      attributes: {
        class: 'editor-content',
        'data-placeholder': '在此输入文档内容... 使用 [[对象名]] 引用其他对象',
      },
      handleClickOn: (_view, _pos, _node, _nodePos, event) => {
        // Allow clicking on wiki links to navigate
        const target = event.target as HTMLElement;
        if (target.tagName === 'A' && target.dataset.wiki) {
          onNavigate(target.dataset.wiki);
          return true;
        }
        return false;
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

  // Wiki-link rendering: after TipTap renders, inject wiki-link markup
  useEffect(() => {
    if (!editor || editMode !== 'wysiwyg') return;
    // Scan rendered content for [[wiki links]] and mark them
    const editorEl = editor.view.dom;
    if (!editorEl) return;
    const walker = document.createTreeWalker(editorEl, NodeFilter.SHOW_TEXT);
    const replacements: Array<{ text: string; node: Text }> = [];
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      if (node.textContent?.includes('[[')) {
        replacements.push({ text: node.textContent, node });
      }
    }
    // We don't modify the ProseMirror doc — the user sees the raw [[name]] syntax
    // and can double-click to navigate (handled by textarea double-click below)
  }, [editor, editMode, currentObject?.content]);

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
        if (target) onNavigate(name);
      }
    }
  }, [currentObject, allObjects, onNavigate]);

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
    </div>
  );
}
