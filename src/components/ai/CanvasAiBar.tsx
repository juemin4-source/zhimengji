/**
 * CanvasAiBar — 画板 AI 助手输入壳 (织梦机 v2)
 *
 * Minimal AI input shell with position: fixed bottom-0.
 * Shows placeholder text initially; on send, displays "AI 助手正在接入中..."
 * placeholder. Does NOT mock AI replies or call llm-client.
 */

import { useState, useCallback } from 'react';

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

export default function CanvasAiBar({ stage }: CanvasAiBarProps) {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'connecting'>('idle');
  const stageName = STAGE_NAMES[stage] || stage;

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    setStatus('connecting');
    // No mock AI reply — just show placeholder
  }, [input]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div
      className="canvas-ai-bar"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: 'var(--bg-surface, #141414)',
        borderTop: '1px solid var(--border-default, #2a2a2a)',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {status === 'connecting' ? (
        <div
          style={{
            flex: 1,
            fontSize: '0.82rem',
            color: 'var(--text-secondary, #a0a0a0)',
            padding: '8px 12px',
            textAlign: 'center',
          }}
        >
          AI 助手正在接入中...
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--text-muted, #6b6b6b)',
              fontSize: '0.72rem',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#666',
              }}
            />
            {stageName} 画板
          </div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="画板 AI 助手即将就绪"
            disabled
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '0.82rem',
              background: 'var(--bg-input, #0a0a0a)',
              border: '1px solid var(--border-default, #2a2a2a)',
              borderRadius: 6,
              color: 'var(--text-primary, #e8e8e8)',
              outline: 'none',
              opacity: 0.5,
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={handleSend}
            disabled
            style={{
              padding: '8px 16px',
              fontSize: '0.8rem',
              fontWeight: 600,
              border: '1px solid var(--border-default, #2a2a2a)',
              borderRadius: 6,
              background: 'var(--bg-hover, #1a1a1a)',
              color: 'var(--text-muted, #6b6b6b)',
              cursor: 'not-allowed',
              opacity: 0.5,
              fontFamily: 'inherit',
            }}
          >
            发送
          </button>
        </>
      )}
    </div>
  );
}
