/**
 * AiSuggestionCard — AI 建议卡组件 (织梦机 v2 / D2-UX)
 *
 * 用于 suggest 类型的 AI 输出展示。
 * 用户采纳后才写入画板数据。
 * 可展示在画板字段旁的内联建议。
 */

import { useState } from 'react';
import { Lightbulb, Check, X } from 'lucide-react';
import type { AiOutputType } from '../../lib/ai-output';

export interface AiSuggestionCardProps {
  /** 唯一标识 */
  id: string;
  /** 建议标题 */
  title: string;
  /** 建议内容 */
  content: string;
  /** 建议来源的 outputType */
  outputType?: AiOutputType;
  /** 建议的字段/目标描述 */
  target?: string;
  /** 采纳回调 */
  onAccept: (id: string) => void;
  /** 忽略回调 */
  onDismiss: (id: string) => void;
  /** 修改建议回调 */
  onModify?: (id: string) => void;
}

export default function AiSuggestionCard({
  id,
  title,
  content,
  target,
  onAccept,
  onDismiss,
  onModify,
}: AiSuggestionCardProps) {
  const [accepted, setAccepted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  if (accepted) {
    return (
      <div style={{
        padding: '8px 12px', borderRadius: 6,
        background: 'rgba(76,175,80,0.08)', border: '1px solid rgba(76,175,80,0.2)',
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: '0.75rem', color: 'var(--safe, #4CAF50)',
      }}>
        <Check size={14} />
        <span>已采纳: {title}</span>
      </div>
    );
  }

  return (
    <div style={{
      border: '1px solid rgba(183,255,0,0.15)',
      borderRadius: 8,
      background: 'rgba(183,255,0,0.03)',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px',
        background: 'rgba(183,255,0,0.05)',
        borderBottom: '1px solid rgba(183,255,0,0.08)',
        fontSize: '0.75rem', fontWeight: 600,
        color: 'var(--accent, #B7FF00)',
      }}>
        <Lightbulb size={14} />
        <span>AI 建议{target ? ` — ${target}` : ''}</span>
      </div>
      <div style={{ padding: '10px 12px' }}>
        <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-primary, #e0e0e0)', marginBottom: 4 }}>
          {title}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #a0a0a0)', lineHeight: 1.6 }}>
          {content}
        </div>
      </div>
      <div style={{
        display: 'flex', gap: 6, padding: '8px 12px',
        borderTop: '1px solid var(--border-default, #2a2a2a)',
      }}>
        <button
          onClick={() => { setAccepted(true); onAccept(id); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 4, border: 'none',
            background: 'var(--accent, #B7FF00)', color: '#0a0a0a',
            cursor: 'pointer', fontSize: '0.6875rem', fontWeight: 500,
          }}
        >
          <Check size={12} /> 采纳
        </button>
        <button
          onClick={() => { setDismissed(true); onDismiss(id); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 4,
            border: '1px solid var(--border-default, #2a2a2a)',
            background: 'transparent', color: 'var(--text-secondary, #a0a0a0)',
            cursor: 'pointer', fontSize: '0.6875rem',
          }}
        >
          <X size={12} /> 忽略
        </button>
        {onModify && (
          <button
            onClick={() => onModify(id)}
            style={{
              padding: '4px 10px', borderRadius: 4,
              border: '1px solid var(--border-default, #2a2a2a)',
              background: 'transparent', color: 'var(--text-secondary, #a0a0a0)',
              cursor: 'pointer', fontSize: '0.6875rem',
              marginLeft: 'auto',
            }}
          >
            修改建议
          </button>
        )}
      </div>
    </div>
  );
}
