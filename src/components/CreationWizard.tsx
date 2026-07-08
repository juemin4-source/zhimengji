/**
 * CreationWizard — Two-step new project creation modal for 织梦机 v1.2 (P1-01).
 *
 * Step 1: Title + Genre
 * Step 2: Template picker (optional)
 * Ctrl+click bookshelf button skips wizard.
 */

import { useState, useMemo } from 'react';
import { GENRE_GRADIENTS, PROJECT_TEMPLATES } from '../types/world';

interface CreationWizardProps {
  onConfirm: (title: string, genre: string, templateId: string | null) => void;
  onCancel: () => void;
  lastGenre?: string;
}

export default function CreationWizard({ onConfirm, onCancel, lastGenre }: CreationWizardProps) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState(lastGenre || '科幻');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const currentGradient = useMemo(() => {
    return GENRE_GRADIENTS.find(g => g.genre === genre)?.gradient || ['#6366f1', '#8b5cf6'];
  }, [genre]);

  const handleNext = () => {
    if (!title.trim()) return;
    if (step === 1) {
      setStep(2);
    } else {
      onConfirm(title.trim(), genre, selectedTemplate);
    }
  };

  const handleSkipTemplate = () => {
    onConfirm(title.trim(), genre, null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onCancel();
    if (e.key === 'Enter' && title.trim()) handleNext();
  };

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog-box" style={{ minWidth: 440, maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 3, borderRadius: 2, background: step >= 1 ? '#B7FF00' : '#333' }} />
          <div style={{ flex: 1, height: 3, borderRadius: 2, background: step >= 2 ? '#B7FF00' : '#333' }} />
        </div>

        {step === 1 && (
          <>
            <h4 style={{ fontSize: 18, marginBottom: 4 }}>新建作品</h4>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>给你的故事起个名字，选择一个体裁</p>

            <label style={{ fontSize: 12, color: '#aaa', display: 'block', marginBottom: 6 }}>作品名</label>
            <input
              type="text"
              className="dialog-input"
              placeholder="输入作品名称..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              style={{ marginBottom: 16 }}
            />

            <label style={{ fontSize: 12, color: '#aaa', display: 'block', marginBottom: 6 }}>体裁</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 16 }}>
              {GENRE_GRADIENTS.map(g => (
                <button
                  key={g.genre}
                  className={`bubble-type-btn ${genre === g.genre ? 'selected' : ''}`}
                  onClick={() => setGenre(g.genre)}
                  style={{
                    background: genre === g.genre
                      ? `linear-gradient(135deg, ${g.gradient[0]}44, ${g.gradient[1]}44)`
                      : '#141414',
                    borderColor: genre === g.genre ? g.gradient[0] : '#333',
                  }}
                >
                  {g.genre}
                </button>
              ))}
            </div>

            {/* Preview */}
            <div style={{
              height: 60, borderRadius: 8, marginBottom: 16,
              background: `linear-gradient(135deg, ${currentGradient[0]}, ${currentGradient[1]})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 600, color: '#fff', opacity: 0.8,
            }}>
              {title || '作品预览'}
            </div>

            <div className="dialog-actions">
              <button className="ia-btn" onClick={onCancel}>取消</button>
              <button
                className="ia-btn"
                style={{ background: title.trim() ? '#B7FF00' : '#333', color: title.trim() ? '#0a0a0a' : '#666', fontWeight: 600 }}
                disabled={!title.trim()}
                onClick={handleNext}
              >
                下一步 →
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h4 style={{ fontSize: 18, marginBottom: 4 }}>选择初始设定模板</h4>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>
              可选 — 模板会创建一组预置对象，帮你快速开始
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {PROJECT_TEMPLATES.map(t => (
                <div
                  key={t.id}
                  className="template-card"
                  style={{
                    border: selectedTemplate === t.id ? '2px solid #B7FF00' : '2px solid #333',
                    background: selectedTemplate === t.id ? '#1a2e1a' : '#141414',
                  }}
                  onClick={() => setSelectedTemplate(t.id === selectedTemplate ? null : t.id)}
                >
                  <div className="template-icon" style={{ fontSize: 24 }}>
                    {t.id === 'blank' ? '📄' : t.id === 'three-act' ? '🎭' : t.id === 'character-driven' ? '👥' : '🌍'}
                  </div>
                  <div className="template-name">{t.name}</div>
                  <div className="template-desc">{t.description}</div>
                  {t.presetObjectTypes.length > 0 && (
                    <div style={{ fontSize: 10, color: '#666', marginTop: 6 }}>
                      将创建: {t.presetObjectTypes.map(p => p.name).join('、')}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="dialog-actions">
              <button className="ia-btn" onClick={handleSkipTemplate}>跳过</button>
              <button
                className="ia-btn"
                style={{ background: '#B7FF00', color: '#0a0a0a', fontWeight: 600 }}
                onClick={handleNext}
              >
                开始创作
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
