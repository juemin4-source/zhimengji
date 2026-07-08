/**
 * FirstLaunchGuide — 3-step tutorial overlay for 织梦机 v1.2 (P1-02).
 *
 * Shows on first entry per project (localStorage flag).
 * Covers: object types, WikiLinks, canvas.
 * "?" button in sidebar reopens guide.
 */

import { useState, useEffect } from 'react';

interface FirstLaunchGuideProps {
  projectId: string;
  onDismiss: () => void;
}

const STEPS = [
  {
    title: '这里有 8 种对象类型',
    description: '人物、地点、组织、规则/机制、事件、物品、术语、章节——每种对象都有对应的模板，帮你快速构建世界。',
    icon: '📦',
    highlight: '试着从左侧大纲点击 "+" 创建一个「人物」对象',
  },
  {
    title: '在文档中写入 [[对象名]]',
    description: 'WikiLink 是织梦机的核心——用 [[对象名]] 创建双向链接。双击已存在的链接可以跳转，双击不存在的链接可以快速创建新对象。',
    icon: '🔗',
    highlight: '在编辑器中输入 [[张三]] 试试',
  },
  {
    title: '画板可以可视化你的世界结构',
    description: '角色关系图、时间线、设定推演图——三种画板帮你从不同角度审视你的世界。拖拽节点、创建连线、缩放查看。',
    icon: '🎨',
    highlight: '切换到「画板」标签页查看角色关系图',
  },
];

export default function FirstLaunchGuide({ projectId, onDismiss }: FirstLaunchGuideProps) {
  const [step, setStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleDismiss = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem(`zhimengji-guide-done-${projectId}`, 'true');
      } catch { /* ignore */ }
    }
    onDismiss();
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleDismiss();
    }
  };

  const currentStep = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="dialog-overlay" style={{ background: 'rgba(0,0,0,0.7)', zIndex: 1000 }}>
      <div
        className="dialog-box"
        style={{ minWidth: 480, maxWidth: 540, padding: 32, textAlign: 'center' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div style={{ height: 3, background: '#333', borderRadius: 2, marginBottom: 28, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: '#B7FF00', borderRadius: 2, transition: 'width 0.3s ease' }} />
        </div>

        {/* Icon */}
        <div style={{ fontSize: 48, marginBottom: 16 }}>{currentStep.icon}</div>

        {/* Title */}
        <h3 style={{ fontSize: 20, fontWeight: 700, color: '#f0f0f0', marginBottom: 12 }}>
          {currentStep.title}
        </h3>

        {/* Description */}
        <p style={{ fontSize: 14, color: '#aaa', lineHeight: 1.7, marginBottom: 16, maxWidth: 400, margin: '0 auto 16px' }}>
          {currentStep.description}
        </p>

        {/* Highlight */}
        <div style={{
          background: 'rgba(183,255,0,0.08)',
          border: '1px solid rgba(183,255,0,0.2)',
          borderRadius: 8, padding: '10px 16px',
          fontSize: 13, color: '#B7FF00', marginBottom: 24,
        }}>
          💡 {currentStep.highlight}
        </div>

        {/* Step dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width: 8, height: 8, borderRadius: '50%',
                background: i === step ? '#B7FF00' : '#444',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="dialog-actions" style={{ justifyContent: 'center', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <button
            className="ia-btn"
            style={{
              padding: '10px 32px', background: '#B7FF00', color: '#0a0a0a',
              fontWeight: 600, fontSize: 14, border: 'none', borderRadius: 6, cursor: 'pointer',
            }}
            onClick={handleNext}
          >
            {step < STEPS.length - 1 ? '下一步' : '开始使用'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={e => setDontShowAgain(e.target.checked)}
                style={{ accentColor: '#B7FF00' }}
              />
              不再显示引导
            </label>
            <button
              className="ia-btn"
              style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: 12 }}
              onClick={handleDismiss}
            >
              跳过
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Check if guide should be shown for a project.
 */
export function shouldShowGuide(projectId: string): boolean {
  try {
    return localStorage.getItem(`zhimengji-guide-done-${projectId}`) !== 'true';
  } catch {
    return true;
  }
}

/**
 * Mark guide as done for a project.
 */
export function markGuideDone(projectId: string): void {
  try {
    localStorage.setItem(`zhimengji-guide-done-${projectId}`, 'true');
  } catch { /* ignore */ }
}
