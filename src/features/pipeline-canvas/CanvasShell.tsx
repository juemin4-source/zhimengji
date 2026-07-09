/**
 * CanvasShell — 通用画板外壳 (织梦机 v2)
 *
 * Wraps each stage's content with a consistent status-based UI.
 * locked → 🔒 + grey hint
 * ready → blue "就绪" message
 * active → renders children
 * done → ✅ + green confirmation
 */

import React from 'react';

type CanvasStatus = 'locked' | 'ready' | 'active' | 'done';

interface CanvasShellProps {
  stage: string;
  status: CanvasStatus;
  children?: React.ReactNode;
  onStageClick?: (stage: string) => void;
}

const STAGE_NAMES: Record<string, string> = {
  premise: '前提',
  structure: '大纲',
  setting: '设定',
  packet: '细纲',
  text: '正文',
};

const STATUS_MESSAGES: Record<string, { icon: string; title: string; desc: string }> = {
  locked: {
    icon: '🔒',
    title: '尚未开放',
    desc: '请先完成前置画板的内容，本画板将自动解锁。',
  },
  ready: {
    icon: '○',
    title: '就绪',
    desc: '该画板已准备就绪，可以开始创作。',
  },
  active: {
    icon: '▷',
    title: '进行中',
    desc: '',
  },
  done: {
    icon: '✅',
    title: '已完成',
    desc: '该画板的所有内容已完成。',
  },
};

const styles: Record<string, React.CSSProperties> = {
  shell: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    position: 'relative',
  },
  overlay: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: 40,
    textAlign: 'center',
  },
  icon: {
    fontSize: '2.5rem',
    marginBottom: 16,
  },
  title: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: '#e0e0e0',
    marginBottom: 8,
  },
  desc: {
    fontSize: '0.85rem',
    color: '#888',
    maxWidth: 360,
    lineHeight: 1.6,
  },
  enterBtn: {
    marginTop: 20,
    padding: '8px 24px',
    fontSize: '0.85rem',
    fontWeight: 600,
    border: '1.5px solid #4A9EFF',
    borderRadius: 6,
    background: 'rgba(74, 158, 255, 0.1)',
    color: '#4A9EFF',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
    fontFamily: 'inherit',
  },
  doneBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: '6px 16px',
    background: 'rgba(34, 197, 94, 0.1)',
    borderBottom: '1px solid rgba(34, 197, 94, 0.2)',
    color: '#22C55E',
    fontSize: '0.78rem',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
};

export default function CanvasShell({ stage, status, children, onStageClick }: CanvasShellProps) {
  const stageName = STAGE_NAMES[stage] || stage;
  const msg = STATUS_MESSAGES[status] || STATUS_MESSAGES.locked;

  if (status === 'locked') {
    return (
      <div style={styles.shell}>
        <div style={styles.overlay}>
          <div style={styles.icon}>{msg.icon}</div>
          <div style={styles.title}>{stageName} — {msg.title}</div>
          <div style={styles.desc}>{msg.desc}</div>
        </div>
      </div>
    );
  }

  if (status === 'ready') {
    return (
      <div style={styles.shell}>
        <div style={styles.overlay}>
          <div style={{ ...styles.icon, color: '#4A9EFF' }}>{msg.icon}</div>
          <div style={styles.title}>{stageName} — {msg.title}</div>
          <div style={styles.desc}>{msg.desc}</div>
          {onStageClick && (
            <button
              style={styles.enterBtn}
              onClick={() => onStageClick(stage)}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(74, 158, 255, 0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(74, 158, 255, 0.1)'; }}
            >
              进入 {stageName}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div style={styles.shell}>
        <div style={styles.doneBanner}>
          {msg.icon} {stageName} — {msg.title}
        </div>
        <div style={{ flex: 1, overflow: 'auto', paddingTop: 36 }}>
          {children}
        </div>
      </div>
    );
  }

  // active — render children
  return (
    <div style={styles.shell}>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </div>
    </div>
  );
}
