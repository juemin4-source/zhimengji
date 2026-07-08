/**
 * StatusBar — Bottom status bar with save indicator and word count (P1-05, P2-04).
 *
 * Left: colored dot + label (green=saved, yellow=saving/unsaved, red=error, gray=offline)
 * Right: word count
 * Click red dot triggers retry.
 */

import type { SaveStatus } from '../types/world';

interface StatusBarProps {
  saveStatus: SaveStatus;
  wordCount: number;
  onRetrySave?: () => void;
  onSaveClick?: () => void;
}

const STATUS_CONFIG: Record<SaveStatus, { dot: string; label: string; color: string }> = {
  saved: { dot: '🟢', label: '已保存', color: '#4CAF50' },
  saving: { dot: '🟡', label: '保存中…', color: '#FF9800' },
  unsaved: { dot: '🟡', label: '未保存', color: '#FF9800' },
  error: { dot: '🔴', label: '保存失败', color: '#f44336' },
  offline: { dot: '⚫', label: '离线模式', color: '#888' },
};

export default function StatusBar({ saveStatus, wordCount, onRetrySave, onSaveClick }: StatusBarProps) {
  const config = STATUS_CONFIG[saveStatus] || STATUS_CONFIG.saved;
  const isError = saveStatus === 'error';
  const isOffline = saveStatus === 'offline';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: 28, padding: '0 12px',
      background: '#0e0e0e', borderTop: '1px solid #1a1a1a',
      fontSize: 12, color: '#888', flexShrink: 0,
      userSelect: 'none',
    }}>
      {/* Left: save status */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: isError ? 'pointer' : 'default' }}
        onClick={() => { if (isError && onRetrySave) onRetrySave(); if (onSaveClick) onSaveClick(); }}
        title={isError ? '点击重试保存' : isOffline ? '离线模式，数据暂存本地' : ''}
      >
        <span style={{ fontSize: 10, lineHeight: 1 }}>{config.dot}</span>
        <span style={{ color: config.color, fontWeight: isError || isOffline ? 600 : 400 }}>
          {config.label}
        </span>
        {isError && (
          <span style={{ fontSize: 11, color: '#f44336', marginLeft: 4 }}>
            (点击重试)
          </span>
        )}
      </div>

      {/* Right: word count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ color: '#666' }}>
          字数: <span style={{ color: '#aaa', fontWeight: 500 }}>{wordCount.toLocaleString()}</span>
        </span>
      </div>
    </div>
  );
}
