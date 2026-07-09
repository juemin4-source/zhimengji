/**
 * PremiseEntryGate — 画板① 前提卡编辑器 (织梦机 v2)
 *
 * Replaces static entry with a full PremiseCard editor.
 * - Reads projectId from projectStore
 * - Loads existing PremiseCard or shows create form
 * - Saves via premiseApi (handles readerQuestions JSON serialization)
 * - Confirms via pipeline-helper.confirmPremise to advance pipeline
 */

import { useState, useEffect } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import * as premiseApi from '../../api/premiseApi';
import { confirmPremise } from '../../stores/pipeline-helper';
import type { PremiseCard } from '../../contracts/premise.contract';

// ── Constants ──

const FONT = "var(--font-body, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif)";

const STORY_TYPES: { value: NonNullable<PremiseCard['storyType']>; label: string }[] = [
  { value: 'high_concept', label: '高概念' },
  { value: 'deep_drill', label: '深挖' },
  { value: 'character_driven', label: '人物驱动' },
  { value: 'world_driven', label: '世界观驱动' },
];

// ── Inline Styles ──

const s: Record<string, React.CSSProperties> = {
  container: {
    padding: 32,
    maxWidth: 680,
    margin: '0 auto',
    fontFamily: FONT,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 'var(--text-xl, 1.25rem)',
    fontWeight: 700,
    color: 'var(--text-primary, #e8e8e8)',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 'var(--text-sm, 0.8125rem)',
    color: 'var(--text-secondary, #a0a0a0)',
    lineHeight: 1.6,
  },
  hintBox: {
    background: 'var(--bg-surface, #141414)',
    border: '1px solid var(--border-default, #2a2a2a)',
    borderRadius: 8,
    padding: '16px 20px',
    marginBottom: 24,
  },
  hintTitle: {
    fontSize: 'var(--text-sm, 0.8125rem)',
    fontWeight: 600,
    color: 'var(--text-primary, #e8e8e8)',
    marginBottom: 8,
  },
  hintText: {
    fontSize: 'var(--text-xs, 0.75rem)',
    color: 'var(--text-secondary, #a0a0a0)',
    lineHeight: 1.7,
    marginBottom: 4,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    display: 'block',
    fontSize: 'var(--text-sm, 0.8125rem)',
    fontWeight: 500,
    color: 'var(--text-secondary, #a0a0a0)',
    marginBottom: 6,
    fontFamily: FONT,
  },
  labelHint: {
    fontSize: 'var(--text-xs, 0.75rem)',
    color: 'var(--text-muted, #6b6b6b)',
    marginLeft: 8,
    fontWeight: 400,
  },
  textarea: {
    width: '100%',
    minHeight: 100,
    padding: '12px 14px',
    fontFamily: FONT,
    fontSize: 'var(--text-base, 0.9375rem)',
    lineHeight: 1.7,
    background: 'var(--bg-input, #0a0a0a)',
    border: '1px solid var(--border-default, #2a2a2a)',
    borderRadius: 6,
    color: 'var(--text-primary, #e8e8e8)',
    outline: 'none',
    resize: 'vertical',
    boxSizing: 'border-box',
    transition: 'border-color var(--transition-fast, 0.15s ease)',
  },
  selectWrapper: {
    position: 'relative',
  },
  select: {
    width: '100%',
    padding: '10px 36px 10px 14px',
    fontFamily: FONT,
    fontSize: 'var(--text-base, 0.9375rem)',
    background: 'var(--bg-input, #0a0a0a)',
    border: '1px solid var(--border-default, #2a2a2a)',
    borderRadius: 6,
    color: 'var(--text-primary, #e8e8e8)',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
    WebkitAppearance: 'none',
    transition: 'border-color var(--transition-fast, 0.15s ease)',
    boxSizing: 'border-box',
  },
  selectArrow: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-muted, #6b6b6b)',
    fontSize: '0.75rem',
    pointerEvents: 'none',
  },
  buttonRow: {
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 8,
    alignItems: 'center',
  },
  btnSecondary: {
    padding: '9px 22px',
    fontFamily: FONT,
    fontSize: 'var(--text-sm, 0.8125rem)',
    fontWeight: 500,
    borderRadius: 6,
    border: '1px solid var(--border-default, #2a2a2a)',
    background: 'transparent',
    color: 'var(--text-secondary, #a0a0a0)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast, 0.15s ease)',
  },
  btnPrimary: {
    padding: '9px 22px',
    fontFamily: FONT,
    fontSize: 'var(--text-sm, 0.8125rem)',
    fontWeight: 600,
    borderRadius: 6,
    border: '1.5px solid var(--accent, #B7FF00)',
    background: 'var(--accent, #B7FF00)',
    color: 'var(--text-inverse, #0a0a0a)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast, 0.15s ease)',
  },
  btnDisabled: {
    opacity: 0.35,
    cursor: 'not-allowed',
  },
  errorText: {
    fontSize: 'var(--text-xs, 0.75rem)',
    color: '#FF6B6B',
    marginTop: 6,
    marginBottom: 8,
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    color: 'var(--text-muted, #6b6b6b)',
    fontSize: 'var(--text-sm, 0.8125rem)',
    fontFamily: FONT,
  },
  successBanner: {
    background: 'rgba(34, 197, 94, 0.08)',
    border: '1px solid rgba(34, 197, 94, 0.25)',
    borderRadius: 10,
    padding: '32px 24px',
    textAlign: 'center',
    marginTop: 16,
  },
  successIcon: {
    fontSize: '2.4rem',
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 'var(--text-lg, 1.0625rem)',
    fontWeight: 700,
    color: '#22C55E',
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 'var(--text-sm, 0.8125rem)',
    color: 'var(--text-secondary, #a0a0a0)',
    lineHeight: 1.7,
  },
  navHint: {
    display: 'inline-block',
    marginTop: 16,
    padding: '6px 16px',
    fontSize: 'var(--text-xs, 0.75rem)',
    color: 'var(--accent, #B7FF00)',
    border: '1px solid var(--accent, #B7FF00)',
    borderRadius: 6,
    background: 'var(--accent-soft, rgba(183, 255, 0, 0.08))',
  },
  divider: {
    height: 1,
    background: 'var(--border-default, #2a2a2a)',
    margin: '6px 0 4px',
  },
};

// ── Component ──

export default function PremiseEntryGate() {
  const projectId = useProjectStore((s) => s.currentProjectId);

  const [card, setCard] = useState<PremiseCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [premiseText, setPremiseText] = useState('');
  const [storyType, setStoryType] = useState<PremiseCard['storyType']>('');
  const [readerQuestionsText, setReaderQuestionsText] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Load existing premise card on mount / projectId change ──

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setSaveError(null);

    premiseApi
      .listPremiseCards(projectId)
      .then((cards) => {
        if (cards.length > 0) {
          const existing = cards[0];
          setCard(existing);
          setPremiseText(existing.premiseText);
          setStoryType(existing.storyType);
          setReaderQuestionsText(
            Array.isArray(existing.readerQuestions)
              ? existing.readerQuestions.join('\n')
              : ''
          );
          if (existing.status === 'confirmed') {
            setConfirmed(true);
          }
        }
      })
      .catch((err) => {
        console.error('[PremiseEntryGate] load error', err);
        setSaveError('加载前提卡失败，请重试');
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  // ── Helpers ──

  const getReaderQuestions = (): string[] =>
    readerQuestionsText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

  const hasContent = premiseText.trim().length > 0;

  // ── Save (draft) ──

  const handleSave = async () => {
    if (!projectId || !hasContent) return;
    setSaving(true);
    setSaveError(null);
    try {
      const readerQuestions = getReaderQuestions();
      if (card) {
        const updated = await premiseApi.updatePremiseCard({
          id: card.id,
          premiseText: premiseText.trim(),
          readerQuestions,
          storyType,
          status: 'draft',
        });
        setCard(updated);
      } else {
        const created = await premiseApi.createPremiseCard({
          projectId,
          premiseText: premiseText.trim(),
          readerQuestions,
          storyType,
          status: 'draft',
        });
        setCard(created);
      }
    } catch (err: any) {
      console.error('[PremiseEntryGate] save error', err);
      setSaveError(err?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // ── Confirm (save + advance pipeline) ──

  const handleConfirm = async () => {
    if (!projectId || !hasContent) {
      setSaveError('请先输入前提文本');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const readerQuestions = getReaderQuestions();
      let currentCard = card;

      // Save with confirmed status
      if (currentCard) {
        const updated = await premiseApi.updatePremiseCard({
          id: currentCard.id,
          premiseText: premiseText.trim(),
          readerQuestions,
          storyType,
          status: 'confirmed',
        });
        setCard(updated);
        currentCard = updated;
      } else {
        const created = await premiseApi.createPremiseCard({
          projectId,
          premiseText: premiseText.trim(),
          readerQuestions,
          storyType,
          status: 'confirmed',
        });
        setCard(created);
        currentCard = created;
      }

      // Advance pipeline: premise → structure
      await confirmPremise(projectId);
      setConfirmed(true);
    } catch (err: any) {
      console.error('[PremiseEntryGate] confirm error', err);
      setSaveError(err?.message || '确认前提失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  // ── Edge cases: no project or loading ──

  if (!projectId) {
    return (
      <div style={s.container}>
        <div style={s.loading}>请先创建一个项目</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={s.container}>
        <div style={s.loading}>加载前提卡...</div>
      </div>
    );
  }

  // ── Confirmed state ──

  if (confirmed) {
    return (
      <div style={s.container}>
        <div style={s.header}>
          <div style={s.title}>前提卡</div>
          <div style={s.subtitle}>前提已确认，故事核心已经锁定。</div>
        </div>
        <div style={s.successBanner}>
          <div style={s.successIcon}>✅</div>
          <div style={s.successTitle}>前提已确认，前往结构图</div>
          <div style={s.successDesc}>
            你的故事前提已经保存并确认，接下来可以进入结构图搭建故事大纲。
          </div>
          <div style={s.navHint}>
            点击上方导航栏「大纲」开始构建结构 →
          </div>
        </div>
        {/* Show read-only summary */}
        {card && (
          <div style={{ ...s.hintBox, marginTop: 20 }}>
            <div style={s.hintTitle}>已确认的前提</div>
            <div style={s.hintText}>{card.premiseText}</div>
            {card.storyType && (
              <>
                <div style={s.divider} />
                <div style={{ ...s.hintText, marginTop: 6 }}>
                  类型：{STORY_TYPES.find((t) => t.value === card.storyType)?.label || card.storyType}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Editor state ──

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div style={s.title}>前提卡</div>
        <div style={s.subtitle}>
          用一段话讲清楚你的故事核心。这是整个作品的根基。
        </div>
      </div>

      {/* Premise guide */}
      <div style={s.hintBox}>
        <div style={s.hintTitle}>好前提的公式</div>
        <div style={s.hintText}>
          一个关于「人物」的故事，他/她想要「目标」，但是「障碍」阻挡了他/她，否则「后果」不可挽回。
        </div>
        <div
          style={{
            ...s.hintText,
            marginTop: 8,
            color: 'var(--text-muted, #6b6b6b)',
            fontStyle: 'italic',
          }}
        >
          示例：一个科幻故事，关于一个被遗弃在火星上的宇航员，他想要回到地球，但是他的资源正在耗尽，否则他将永远困在红色荒漠中。
        </div>
      </div>

      {/* Premise Text */}
      <div style={s.formGroup}>
        <label style={s.label}>
          前提文本
          <span style={s.labelHint}>
            如果一个__遇到了____，会发生什么？
          </span>
        </label>
        <textarea
          style={s.textarea}
          placeholder="如果一个被遗弃在火星上的宇航员遇到了地球不再派遣救援的困境，会发生什么？"
          value={premiseText}
          onChange={(e) => setPremiseText(e.target.value)}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-focus, #B7FF00)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-default, #2a2a2a)';
          }}
        />
      </div>

      {/* Story Type */}
      <div style={s.formGroup}>
        <label style={s.label}>
          故事类型
          <span style={s.labelHint}>选择故事的核心驱动</span>
        </label>
        <div style={s.selectWrapper}>
          <select
            style={s.select}
            value={storyType}
            onChange={(e) =>
              setStoryType(e.target.value as PremiseCard['storyType'])
            }
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-focus, #B7FF00)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-default, #2a2a2a)';
            }}
          >
            <option value="">选择类型</option>
            {STORY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <span style={s.selectArrow}>▾</span>
        </div>
      </div>

      {/* Reader Questions */}
      <div style={s.formGroup}>
        <label style={s.label}>
          读者问题
          <span style={s.labelHint}>
            每行一条，读者在阅读中想解答的问题（换行分隔）
          </span>
        </label>
        <textarea
          style={{ ...s.textarea, minHeight: 80 }}
          placeholder={'这个世界的规则是什么？\n主角为什么要冒险？\n最大的悬念是什么？'}
          value={readerQuestionsText}
          onChange={(e) => setReaderQuestionsText(e.target.value)}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-focus, #B7FF00)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-default, #2a2a2a)';
          }}
        />
        {readerQuestionsText.trim().length > 0 && (
          <div
            style={{
              fontSize: 'var(--text-xs, 0.75rem)',
              color: 'var(--text-muted, #6b6b6b)',
              marginTop: 4,
            }}
          >
            {getReaderQuestions().length} 条问题
          </div>
        )}
      </div>

      {/* Error message */}
      {saveError && <div style={s.errorText}>{saveError}</div>}

      {/* Actions */}
      <div style={s.buttonRow}>
        <button
          style={s.btnSecondary}
          onClick={handleSave}
          disabled={saving || !hasContent}
        >
          {saving ? '保存中...' : '保存草稿'}
        </button>
        <button
          style={{
            ...s.btnPrimary,
            ...(saving || !hasContent ? s.btnDisabled : {}),
          }}
          onClick={handleConfirm}
          disabled={saving || !hasContent}
        >
          {saving ? '确认中...' : '确认前提'}
        </button>
      </div>
      {card && (
        <div
          style={{
            textAlign: 'right',
            fontSize: 'var(--text-xs, 0.75rem)',
            color: 'var(--text-muted, #6b6b6b)',
            marginTop: 6,
          }}
        >
          已有草稿，保存将覆盖
        </div>
      )}
    </div>
  );
}
