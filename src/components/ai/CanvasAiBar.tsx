/**
 * CanvasAiBar — 画板 AI 输入壳 (织梦机 v2)
 *
 * 底部固定 AI 输入栏。根据连接状态显示不同提示。
 * 实际 AI 生成功能在各画板组件内（ChapterPacketCanvas / TextCanvas）。
 */

import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { testConnection } from '../../lib/llm-client';
import { Button } from '../ui';
import AiSettings from './AiSettings';
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
  const [aiStatus, setAiStatus] = useState<'checking' | 'ready' | 'unconfigured'>('checking');
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

  return (
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
        placeholder={
          aiStatus === 'checking' ? '检测 AI 连接...' :
          aiStatus === 'ready' ? '输入指令，AI 将辅助当前画板操作' :
          'AI 未配置，请前往设置 API Key'
        }
        disabled={aiStatus !== 'ready'}
        className="canvas-ai-bar-input"
      />
      <Button
        variant="primary"
        onClick={() => {}}
        disabled={aiStatus !== 'ready'}
        size="sm"
      >
        发送
      </Button>
    </div>
  );
}
