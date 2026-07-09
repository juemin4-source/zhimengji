/**
 * CanvasAiBar — 画板 AI 输入壳 (织梦机 v2 / D2-UX)
 *
 * 底部固定 AI 输入栏。发送按钮连接 ChatDrawer 浮动聊天面板。
 * ChatDrawer 作为浮动面板从右侧滑出。
 */

import { useState, useEffect, useCallback } from 'react';
import { testConnection } from '../../lib/llm-client';
import { Button } from '../ui';
import ChatDrawer from './ChatDrawer';
import type { ChatMessage } from './ChatDrawer';
import './canvas-ai-bar.css';

interface CanvasAiBarProps {
  stage: string;
}

const STAGE_NAMES: Record<string, string> = {
  premise: '前提',
  structure: '大纲',
  setting: '设定',
  packet: '细纲',
  text: '正文',
};

let msgIdCounter = 0;
function uid(): string {
  return 'cab_msg_' + (++msgIdCounter);
}

export default function CanvasAiBar({ stage }: CanvasAiBarProps) {
  const [input, setInput] = useState('');
  const [aiStatus, setAiStatus] = useState<'checking' | 'ready' | 'unconfigured'>('checking');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const stageName = STAGE_NAMES[stage] || stage;

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const hasTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
      if (hasTauri) {
        if (!cancelled) setAiStatus('ready');
        return;
      }
      try {
        const result = await testConnection('http://localhost:3001/v1', '');
        if (!cancelled) {
          setAiStatus(result.success ? 'ready' : 'unconfigured');
        }
      } catch {
        if (!cancelled) setAiStatus('unconfigured');
      }
    };
    check();
    return () => { cancelled = true; };
  }, []);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || aiStatus !== 'ready') return;

    const userMsg: ChatMessage = {
      id: uid(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setDrawerOpen(true);

    // Simulate AI echo response (in production, this would call aiCommandRouter)
    setChatLoading(true);
    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: uid(),
        role: 'assistant',
        content: `收到您的 ${stageName} 画板指令：\n\n「${text}」\n\n> 当前为 discuss 模式，AI 回复仅显示在此面板。\n> 如需 AI 生成内容写入画板，请使用画板内的 AI 生成按钮。`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, aiMsg]);
      setChatLoading(false);
    }, 800);
  }, [input, aiStatus, stageName]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleClearChat = useCallback(() => {
    setMessages([]);
  }, []);

  const toggleDrawer = useCallback(() => {
    setDrawerOpen(prev => !prev);
  }, []);

  return (
    <>
      <div className="canvas-ai-bar">
        <div className="canvas-ai-bar-stage">
          <span
            className="canvas-ai-bar-dot"
            style={{
              background:
                aiStatus === 'ready' ? '#4CAF50' :
                aiStatus === 'unconfigured' ? '#f44336' :
                '#888',
            }}
          />
          {stageName} 画板
        </div>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            aiStatus === 'checking' ? '检测 AI 连接...' :
            aiStatus === 'ready' ? '输入指令，AI 将辅助当前画板操作' :
            'AI 未配置，请前往设置 API Key'
          }
          disabled={aiStatus !== 'ready'}
          className="canvas-ai-bar-input"
        />
        {messages.length > 0 && (
          <Button
            variant="ghost"
            onClick={toggleDrawer}
            size="sm"
            style={{ fontSize: '0.6875rem', whiteSpace: 'nowrap' }}
          >
            {drawerOpen ? '关闭聊天' : `聊天 (${messages.length})`}
          </Button>
        )}
        <Button
          variant="primary"
          onClick={handleSend}
          disabled={aiStatus !== 'ready' || !input.trim()}
          size="sm"
        >
          发送
        </Button>
      </div>

      <ChatDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        messages={messages}
        loading={chatLoading}
        onClear={handleClearChat}
      />
    </>
  );
}
