import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import type { WorldObject } from '../../types/world';
import type { Message, DocCardData, AiModel } from '../../types/ai';
import { DEFAULT_MODELS } from '../../types/ai';
import DocCard from './DocCard';

const CANON_DOT_COLORS: Record<string, string> = {
  '核心正典': '#FFB74D',
  '项目正典': '#90CAF9',
  '草案正典': '#CE93D8',
  '未收录': '#666',
};

interface AIChatProps {
  allObjects: WorldObject[];
  activeBookId: string | null;
  onNavigate: (name: string, id?: string) => void;
  onUpdateObject?: (id: string, updates: Partial<WorldObject>) => void;
  onShowToast?: (message: string, type?: 'info' | 'success' | 'error') => void;
  onCreateObject?: (templateType: string) => void;
}

let msgIdCounter = 0;
function uid(): string { return 'msg_' + (++msgIdCounter); }
export default function AIChat({ allObjects, activeBookId, onNavigate, onUpdateObject, onShowToast, onCreateObject }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uid(), role: 'assistant',
      content: '你好！我是织梦机的 AI 助手。我可以帮你创建世界观、设计角色、展开设定——所有生成的内容都会以文档卡片的形式直接嵌入对话中，你可以随时编辑和收录。',
      timestamp: Date.now(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [focusObjectId, setFocusObjectId] = useState<string | null>(null);
  const [activeModel] = useState<AiModel>(DEFAULT_MODELS[0]);
  const [tokenCount, setTokenCount] = useState(0);
  const [inputText, setInputText] = useState('');
  const [showNewChatConfirm, setShowNewChatConfirm] = useState(false);

  const convScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const outlineGroups = useMemo(() => {
    const groups: Array<{ label: string; icon: string; items: WorldObject[] }> = [
      { label: '世界观', icon: '\u{1F30D}', items: allObjects.filter(o => o.type === '规则/机制' && o.status !== '废弃' && o.status !== '草稿') },
      { label: '组织', icon: '\u{1F3DB}️', items: allObjects.filter(o => o.type === '组织' && o.status !== '废弃') },
      { label: '地点', icon: '\u{1F4CD}', items: allObjects.filter(o => o.type === '地点' && o.status !== '废弃') },
      { label: '人物', icon: '\u{1F464}', items: allObjects.filter(o => o.type === '人物' && o.status !== '废弃') },
      { label: '章节', icon: '\u{1F4C4}', items: allObjects.filter(o => o.type === '章节') },
      { label: '其他', icon: '\u{1F4E6}', items: allObjects.filter(o => ['事件', '物品', '术语'].includes(o.type) && o.status !== '废弃') },
    ].filter(g => g.items.length > 0);
    return groups;
  }, [allObjects]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (convScrollRef.current) {
        convScrollRef.current.scrollTop = convScrollRef.current.scrollHeight;
      }
    });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const handleOutlineClick = useCallback((obj: WorldObject) => {
    if (focusObjectId === obj.id) {
      setFocusObjectId(null);
    } else {
      setFocusObjectId(obj.id);
      onNavigate(obj.name, obj.id);
    }
  }, [focusObjectId, onNavigate]);

  const clearFocus = useCallback(() => { setFocusObjectId(null); }, []);
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;
    setInputText('');
    if (inputRef.current) { inputRef.current.style.height = 'auto'; }

    const userMsg: Message = { id: uid(), role: 'user', content: text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 800));

    const replyText = simulateAiResponse(text);
    const replyDocs = simulateAiDocs(text);

    const assistantMsg: Message = {
      id: uid(), role: 'assistant', content: replyText,
      docs: replyDocs, timestamp: Date.now(),
    };
    setMessages(prev => [...prev, assistantMsg]);
    setTokenCount(prev => prev + Math.floor(Math.random() * 200 + 50));
    if (replyDocs && replyDocs.length > 0 && onShowToast) {
      onShowToast('AI 已生成 ' + replyDocs.length + ' 个文档', 'success');
    }
    setIsLoading(false);
  }, [inputText, isLoading, onShowToast]);

  const handleNewChat = useCallback(() => { setShowNewChatConfirm(true); }, []);

  const confirmNewChat = useCallback(() => {
    setMessages([{ id: uid(), role: 'assistant', content: '你好！我是织梦机的 AI 助手。我可以帮你创建世界观、设计角色、展开设定——所有生成的内容都会以文档卡片的形式直接嵌入对话中，你可以随时编辑和收录。', timestamp: Date.now() }]);
    setTokenCount(0);
    setFocusObjectId(null);
    setShowNewChatConfirm(false);
  }, []);
  const handleDocCardSave = useCallback(async (cardId: string, updates: { title?: string; bodyHTML?: string; sections?: Array<{ title: string; content: string }> }) => {
    setMessages(prev => prev.map(msg => {
      if (!msg.docs) return msg;
      return { ...msg, docs: msg.docs.map(doc => doc.id === cardId ? { ...doc, ...updates, edited: true } : doc) };
    }));
    if (onUpdateObject) {
      const existing = allObjects.find(o => o.id === cardId);
      if (existing) {
        onUpdateObject(cardId, { content: '# ' + (updates.title || existing.name) + '\n\n' + (updates.bodyHTML || '') } as any);
      }
    }
  }, [allObjects, onUpdateObject]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  const btnHover = (e: React.MouseEvent) => { if (!(e.currentTarget as HTMLButtonElement).disabled) { Object.assign(e.currentTarget.style, { background: 'rgba(183,255,0,0.12)', borderColor: '#444' }); } };
  const btnLeave = (e: React.MouseEvent) => { Object.assign(e.currentTarget.style, { background: 'transparent', borderColor: 'var(--border-default, #2a2a2a)' }); };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Sidebar */}
        <div style={{
          width: sidebarCollapsed ? 0 : 220, minWidth: sidebarCollapsed ? 0 : 220,
          background: 'var(--sidebar-bg, #0e0e0e)',
          borderRight: sidebarCollapsed ? 'none' : '1px solid var(--border-default, #2a2a2a)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          transition: 'width 0.25s ease, border-color 0.25s ease, min-width 0.25s ease', flexShrink: 0,
        }}>
          <div style={{ height: 40, display: 'flex', alignItems: 'center', padding: '0 8px 0 12px', gap: 8, borderBottom: '1px solid var(--border-default, #2a2a2a)', flexShrink: 0 }}>
            <button style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm, 6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', color: 'var(--text-secondary, #a0a0a0)', cursor: 'pointer', flexShrink: 0, fontSize: '1rem' }}
              onClick={() => setSidebarCollapsed(true)} title="收起大纲"
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-raised, #1e1e1e)'; e.currentTarget.style.color = 'var(--text-primary, #e0e0e0)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary, #a0a0a0)'; }}>◀</button>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary, #e0e0e0)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>大纲</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {outlineGroups.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted, #666)' }}>暂无对象</div>
            ) : outlineGroups.map(group => (
              <div key={group.label} style={{ marginBottom: 4 }}>
                <div style={{ padding: '6px 16px 4px', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted, #666)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  {group.icon} {group.label}
                </div>
                {group.items.map(obj => (
                  <div key={obj.id} onClick={() => handleOutlineClick(obj)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '5px 16px 5px 28px', fontSize: '0.75rem',
                      color: focusObjectId === obj.id ? 'var(--accent, #B7FF00)' : 'var(--text-secondary, #a0a0a0)',
                      background: focusObjectId === obj.id ? 'var(--accent-soft, rgba(183,255,0,0.1))' : 'transparent',
                      cursor: 'pointer', userSelect: 'none', position: 'relative',
                      borderLeft: focusObjectId === obj.id ? '2px solid var(--accent, #B7FF00)' : '2px solid transparent',
                    }}
                    onMouseEnter={e => { if (focusObjectId !== obj.id) { e.currentTarget.style.color = 'var(--text-primary, #e0e0e0)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; } }}
                    onMouseLeave={e => { if (focusObjectId !== obj.id) { e.currentTarget.style.color = 'var(--text-secondary, #a0a0a0)'; e.currentTarget.style.background = 'transparent'; } }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: CANON_DOT_COLORS[obj.canonLevel] || '#666' }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{obj.name}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          {/* Sidebar model selector */}
          <div style={{ borderTop: '1px solid var(--border-default, #2a2a2a)', padding: '8px 12px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 'var(--radius-sm, 6px)', background: 'var(--bg-raised, #1e1e1e)', border: '1px solid var(--border-default, #2a2a2a)', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-secondary, #a0a0a0)', overflow: 'hidden' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--success, #4CAF50)', flexShrink: 0 }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeModel.name}</span>
              <span style={{ flexShrink: 0, fontSize: '0.6875rem', color: 'var(--text-muted, #666)', marginLeft: 'auto' }}>▼</span>
            </div>
          </div>
        </div>

        {/* Sidebar reveal */}
        {sidebarCollapsed && (
          <button onClick={() => setSidebarCollapsed(false)}
            style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 20, width: 24, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: '0 var(--radius-sm, 6px) var(--radius-sm, 6px) 0', background: 'var(--sidebar-bg, #0e0e0e)', border: '1px solid var(--border-default, #2a2a2a)', borderLeft: 'none', color: 'var(--text-secondary, #a0a0a0)', cursor: 'pointer', fontSize: '0.875rem' }}
            title="展开大纲">▶</button>
        )}

        {/* Main chat area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {/* Chat Header */}
          <div style={{ height: 40, background: 'var(--bg-surface, #141414)', borderBottom: '1px solid var(--border-default, #2a2a2a)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, flexShrink: 0 }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary, #e0e0e0)' }}>AI 助手</span>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted, #666)', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--success, #4CAF50)', flexShrink: 0 }} />
              {activeModel.name}
            </span>
            <div style={{
              display: focusObjectId ? 'flex' : 'none', alignItems: 'center', gap: 6,
              padding: '2px 10px', background: 'rgba(183,255,0,0.05)', border: '1px solid rgba(183,255,0,0.12)',
              borderRadius: 'var(--radius-sm, 6px)', fontSize: '0.6875rem', color: 'var(--accent, #B7FF00)', flexShrink: 0,
            }}>
              <span>聚焦: {focusObjectId ? (allObjects.find(o => o.id === focusObjectId)?.name || '') : ''}</span>
              <button onClick={clearFocus} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, border: 'none', background: 'transparent', color: 'var(--accent, #B7FF00)', cursor: 'pointer', borderRadius: '50%', fontSize: '0.6rem', opacity: 0.6, padding: 0 }}>✕</button>
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button onClick={handleNewChat} style={{ fontSize: '0.6875rem', padding: '3px 10px', borderRadius: 'var(--radius-sm, 6px)', border: '1px solid var(--border-default, #2a2a2a)', background: 'var(--bg-raised, #1e1e1e)', color: 'var(--text-secondary, #a0a0a0)', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.12s' }}>+ 新对话</button>
              <button style={{ fontSize: '0.6875rem', padding: '3px 10px', borderRadius: 'var(--radius-sm, 6px)', border: '1px solid var(--border-default, #2a2a2a)', background: 'var(--bg-raised, #1e1e1e)', color: 'var(--text-secondary, #a0a0a0)', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.12s' }}>切换模型</button>
            </div>
          </div>
          {/* Conversation Scroll */}
          <div ref={convScrollRef} style={{ flex: 1, overflowY: 'auto', padding: '24px 0' }}>
            <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {messages.map(msg => (
                <div key={msg.id} className="ai-msg-fade" style={{ display: 'flex', gap: 12, maxWidth: '100%', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem',
                    background: msg.role === 'user' ? 'rgba(66,165,245,0.12)' : 'rgba(183,255,0,0.1)',
                    border: msg.role === 'user' ? '1px solid rgba(66,165,245,0.18)' : '1px solid rgba(183,255,0,0.15)' }}>
                    {msg.role === 'user' ? '👤' : '🤖'}
                  </div>
                  <div style={{ maxWidth: '85%', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-lg, 12px)', fontSize: '0.875rem', lineHeight: 1.6,
                      background: msg.role === 'user' ? 'rgba(66,165,245,0.08)' : 'var(--bg-surface, #141414)',
                      border: msg.role === 'user' ? '1px solid rgba(66,165,245,0.12)' : '1px solid var(--border-default, #2a2a2a)',
                      color: 'var(--text-primary, #e0e0e0)',
                      borderTopRightRadius: msg.role === 'user' ? 4 : 12,
                      borderTopLeftRadius: msg.role === 'assistant' ? 4 : 12,
                    }}>
                      <div style={{ margin: 0 }} dangerouslySetInnerHTML={{ __html: msg.content }} />
                      {msg.docs && msg.docs.map(doc => (
                        <DocCard key={doc.id} card={doc} highlighted={focusObjectId === doc.id}
                          onSave={handleDocCardSave}
                          onCollect={() => { if (onShowToast) onShowToast('已收录为设定', 'success'); }}
                        />
                      ))}
                    </div>
                    <div style={{ fontSize: '0.625rem', color: 'var(--text-muted, #666)', padding: '0 4px', marginTop: 2, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                      {new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              {/* Typing indicator */}
              {isLoading && (
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(183,255,0,0.1)', border: '1px solid rgba(183,255,0,0.15)' }}>🤖</div>
                  <div className="ai-typing"><span className="ai-typing-dot" /><span className="ai-typing-dot" /><span className="ai-typing-dot" /></div>
                </div>
              )}
              <div ref={scrollAnchorRef} style={{ height: 1, flexShrink: 0 }} />
            </div>
          </div>

          {/* Input Bar */}
          <div style={{ flexShrink: 0, borderTop: '1px solid var(--border-default, #2a2a2a)', background: 'var(--bg-canvas, #0a0a0a)', padding: '12px 24px 16px' }}>
            <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <div className="ai-input-wrap" style={{ flex: 1, background: 'var(--bg-surface, #141414)', border: '1px solid var(--border-default, #2a2a2a)', borderRadius: 'var(--radius-lg, 12px)', display: 'flex', alignItems: 'flex-end' }}>
                <textarea ref={inputRef} value={inputText} onChange={e => { setInputText(e.target.value); e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = Math.min(e.currentTarget.scrollHeight, 120) + 'px'; }}
                  onKeyDown={handleKeyDown} placeholder="输入你的想法，让 AI 帮你创作..." rows={1}
                  style={{ width: '100%', padding: '10px 12px', background: 'transparent', border: 'none', color: 'var(--text-primary, #e0e0e0)', fontSize: '0.875rem', lineHeight: 1.5, resize: 'none', maxHeight: 120, minHeight: 44, fontFamily: 'var(--font-sans, sans-serif)', outline: 'none' }} />
              </div>
              <button onClick={handleSend} disabled={!inputText.trim() || isLoading}
                style={{ width: 44, height: 44, borderRadius: 'var(--radius-md, 8px)', border: 'none',
                  background: !inputText.trim() || isLoading ? 'rgba(183,255,0,0.3)' : 'var(--accent, #B7FF00)',
                  color: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: !inputText.trim() || isLoading ? 'not-allowed' : 'pointer', fontSize: '1.125rem', flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Bottom Bar */}
      <div style={{ flexShrink: 0, height: 28, background: 'var(--bg-header, #0e0e0e)', borderTop: '1px solid var(--border-default, #2a2a2a)', display: 'flex', alignItems: 'center', padding: '0 16px', fontSize: '0.6875rem', color: 'var(--text-muted, #666)', userSelect: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success, #4CAF50)', flexShrink: 0, boxShadow: '0 0 4px rgba(76,175,80,0.5)' }} />
            AI 已连接
          </span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>tokens: <span style={{ color: 'var(--text-secondary, #a0a0a0)' }}>{(tokenCount / 1000).toFixed(1)}K</span></span>
          <span style={{ color: 'var(--border-default, #2a2a2a)' }}>|</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>用量</span>
            <span style={{ width: 60, height: 3, background: 'var(--bg-raised, #1e1e1e)', borderRadius: 2, overflow: 'hidden' }}>
              <span className="ai-usage-bar-fill" style={{ width: Math.min((tokenCount / 15000) * 100, 100) + '%', display: 'block', height: '100%', borderRadius: 2 }} />
            </span>
          </span>
        </div>
      </div>

      {/* New Chat Confirmation Modal */}
      {showNewChatConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowNewChatConfirm(false); }}>
          <div style={{ width: 360, background: 'var(--bg-surface, #141414)', border: '1px solid var(--border-default, #2a2a2a)', borderRadius: 'var(--radius-lg, 12px)', padding: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.35)' }}>
            <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary, #e0e0e0)', marginBottom: 8 }}>新对话</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary, #a0a0a0)', marginBottom: 16 }}>开始新对话？当前对话将保留，不会被清除。</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowNewChatConfirm(false)} style={{ padding: '6px 14px', borderRadius: 'var(--radius-sm, 6px)', border: '1px solid var(--border-default, #2a2a2a)', background: 'var(--bg-raised, #1e1e1e)', color: 'var(--text-secondary, #a0a0a0)', cursor: 'pointer', fontSize: '0.8125rem' }}>取消</button>
              <button onClick={confirmNewChat} style={{ padding: '6px 14px', borderRadius: 'var(--radius-sm, 6px)', border: 'none', background: 'var(--accent, #B7FF00)', color: '#0a0a0a', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500 }}>确认新对话</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function simulateAiResponse(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('世界观') || lower.includes('世界')) return '以下是为你创建的世界观设定：';
  if (lower.includes('角色') || lower.includes('人物')) return '我为你设计了以下角色：';
  if (lower.includes('展开') || lower.includes('详细')) return '以下是展开后的完整设定：';
  return '好的，我已经记录下你的想法。根据当前项目库，我建议从这个方向展开：';
}

function simulateAiDocs(text: string): DocCardData[] | undefined {
  const lower = text.toLowerCase();
  if (lower.includes('世界观') || lower.includes('世界') || lower.includes('天眼')) {
    return [{
      id: 'ai-world-' + Date.now(), type: 'world', typeLabel: '世界观',
      title: '世界观 — 天眼纪元', status: '草稿',
      bodyHTML: '<p><strong>时代背景：</strong>2078年，全球联合政府以"安全与效率"之名，发射了覆盖全球的 <strong>"天眼"（Omni-Eye）</strong> 卫星网络。</p><p><strong>核心设定：</strong>天眼系统不仅能监控地表所有移动物体，还通过脑波片分析技术，可以实时检测公民的"危险思维"。</p>',
      sections: [{ title: '核心冲突', content: '个人隐私与集体安全的终极对立。' }, { title: '关键地点', content: '天眼中枢（轨道站）、灰区（地下抵抗基地）' }],
    }];
  }
  if (lower.includes('角色') || lower.includes('人物')) {
    return [{
      id: 'ai-char-' + Date.now(), type: 'character', typeLabel: '人物',
      title: '人物 — 反抗者', status: '草稿',
      bodyHTML: '<p><strong>名称：</strong>陈星辉</p><p><strong>背景：</strong>原天眼系统工程师，发现系统被滥用后转入地下抵抗组织。</p>',
    }];
  }
  return undefined;
}
