/**
 * AiWritePreviewPanel — AI 写入预览面板 (织梦机 v2 / D2-UX)
 *
 * 用于 write_preview 类型的 AI 输出展示。
 * AI 生成内容显示为预览，用户确认后才写入正式数据。
 * 从 TextCanvas 的预览弹窗提取为独立组件。
 */

import { useState } from 'react';
import type { AiOutputType } from '../../lib/ai-output';

export interface AiWritePreviewPanelProps {
  /** 预览内容 */
  content: string;
  /** 标题（如章节标题、字段名） */
  title: string;
  /** 副标题/说明 */
  subtitle?: string;
  /** AI 输出三态类型 */
  outputType?: AiOutputType;
  /** 字数统计标签 */
  statsLabel?: string;
  /** 确认回调 */
  onConfirm: () => void;
  /** 放弃回调 */
  onAbandon: () => void;
  /** 是否打开 */
  open: boolean;
}

export default function AiWritePreviewPanel({
  content,
  title,
  subtitle,
  statsLabel,
  onConfirm,
  onAbandon,
  open,
}: AiWritePreviewPanelProps) {
  const [confirming, setConfirming] = useState(false);

  if (!open) return null;

  const charCount = content.length;
  const statText = statsLabel || `共 ${charCount} 字`;

  const handleConfirm = () => {
    setConfirming(true);
    try {
      onConfirm();
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={() => { if (!confirming) onAbandon(); }}
    >
      <div
        style={{
          background: 'var(--bg-surface, #141414)',
          border: '1px solid var(--border-default, #2a2a2a)',
          borderRadius: 'var(--radius-lg, 14px)',
          maxWidth: 720, width: '90%',
          maxHeight: '80vh',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-default, #2a2a2a)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: 'var(--text-primary, #e0e0e0)' }}>
              AI 生成结果预览
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #666)', margin: '4px 0 0' }}>
              {subtitle || `基于 ${title} 生成`} · {statText}
            </p>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent, #B7FF00)', background: 'rgba(183,255,0,0.08)', padding: '4px 10px', borderRadius: 4 }}>
            待确认写入
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          <textarea
            readOnly
            value={content}
            style={{
              width: '100%', minHeight: 300,
              background: 'var(--bg-input, #0a0a0a)',
              border: '1px solid var(--border-default, #2a2a2a)',
              borderRadius: 'var(--radius-sm, 6px)',
              color: 'var(--text-primary, #e0e0e0)',
              fontSize: '0.875rem', lineHeight: 1.8,
              padding: 16,
              fontFamily: 'var(--font-mono, monospace)',
              resize: 'none',
            }}
          />
        </div>

        {/* Footer actions */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border-default, #2a2a2a)',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <button
            onClick={onAbandon}
            disabled={confirming}
            style={{
              padding: '8px 16px', borderRadius: 'var(--radius-sm, 6px)',
              border: '1px solid var(--border-default, #2a2a2a)',
              background: 'transparent',
              color: confirming ? 'var(--text-muted, #666)' : 'var(--text-secondary, #a0a0a0)',
              cursor: confirming ? 'not-allowed' : 'pointer',
              fontSize: '0.8125rem',
            }}
          >
            放弃
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirming}
            style={{
              padding: '8px 16px', borderRadius: 'var(--radius-sm, 6px)',
              border: 'none',
              background: confirming ? '#444' : 'var(--accent, #B7FF00)',
              color: confirming ? '#888' : '#0a0a0a',
              cursor: confirming ? 'not-allowed' : 'pointer',
              fontSize: '0.8125rem', fontWeight: 500,
            }}
          >
            {confirming ? '确认中...' : '确认写入'}
          </button>
        </div>
      </div>
    </div>
  );
}
