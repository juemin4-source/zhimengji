/**
 * CanvasAiBar — 画板 AI 助手输入壳 (织梦机 v2)
 *
 * Minimal AI input shell with position: fixed bottom-0.
 * Shows placeholder text initially; on send, displays "AI 助手正在接入中..."
 * placeholder. Does NOT mock AI replies or call llm-client.
 */

import { useState, useCallback } from 'react';
import { Button } from '../ui';
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
    <div className="canvas-ai-bar">
      {status === 'connecting' ? (
        <div className="canvas-ai-bar-connecting">
          AI 助手正在接入中...
        </div>
      ) : (
        <>
          <div className="canvas-ai-bar-stage">
            <span className="canvas-ai-bar-dot" />
            {stageName} 画板
          </div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="画板 AI 助手即将就绪"
            disabled
            className="canvas-ai-bar-input"
          />
          <Button
            variant="primary"
            onClick={handleSend}
            disabled
            size="sm"
          >
            发送
          </Button>
        </>
      )}
    </div>
  );
}
