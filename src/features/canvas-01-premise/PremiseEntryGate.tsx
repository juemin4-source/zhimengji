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
import { Button, TextArea, Select, EmptyState } from '../../components/ui';
import './premise-entry.css';

// ── Constants ──

const STORY_TYPES: { value: NonNullable<PremiseCard['storyType']>; label: string }[] = [
  { value: 'high_concept', label: '高概念' },
  { value: 'deep_drill', label: '深挖' },
  { value: 'character_driven', label: '人物驱动' },
  { value: 'world_driven', label: '世界观驱动' },
];

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
      <EmptyState title="请先创建一个项目" />
    );
  }

  if (loading) {
    return (
      <EmptyState title="加载前提卡..." />
    );
  }

  // ── Confirmed state ──

  if (confirmed) {
    return (
      <div className="premise-container">
        <div className="premise-header">
          <div className="premise-title">前提卡</div>
          <div className="premise-subtitle">前提已确认，故事核心已经锁定。</div>
        </div>
        <EmptyState
          title="前提已确认，前往结构图"
          description="你的故事前提已经保存并确认，接下来可以进入结构图搭建故事大纲。"
          action={<div className="premise-nav-hint">点击上方导航栏「大纲」开始构建结构 →</div>}
        />
        {/* Show read-only summary */}
        {card && (
          <div className="premise-hint-box" style={{ marginTop: 20 }}>
            <div className="premise-hint-title">已确认的前提</div>
            <div className="premise-hint-text">{card.premiseText}</div>
            {card.storyType && (
              <>
                <div className="premise-divider" />
                <div className="premise-hint-text" style={{ marginTop: 6 }}>
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
    <div className="premise-container">
      <div className="premise-header">
        <div className="premise-title">前提卡</div>
        <div className="premise-subtitle">
          用一段话讲清楚你的故事核心。这是整个作品的根基。
        </div>
      </div>

      {/* Premise guide */}
      <div className="premise-hint-box">
        <div className="premise-hint-title">好前提的公式</div>
        <div className="premise-hint-text">
          一个关于「人物」的故事，他/她想要「目标」，但是「障碍」阻挡了他/她，否则「后果」不可挽回。
        </div>
        <div className="premise-hint-text-italic">
          示例：一个科幻故事，关于一个被遗弃在火星上的宇航员，他想要回到地球，但是他的资源正在耗尽，否则他将永远困在红色荒漠中。
        </div>
      </div>

      {/* Premise Text */}
      <div className="premise-form-group">
        <label className="premise-label">
          前提文本
          <span className="premise-label-hint">
            如果一个__遇到了____，会发生什么？
          </span>
        </label>
        <TextArea
          placeholder="如果一个被遗弃在火星上的宇航员遇到了地球不再派遣救援的困境，会发生什么？"
          value={premiseText}
          onChange={(e) => setPremiseText(e.target.value)}
          className="premise-textarea"
          style={{ minHeight: 100 }}
        />
      </div>

      {/* Story Type */}
      <div className="premise-form-group">
        <label className="premise-label">
          故事类型
          <span className="premise-label-hint">选择故事的核心驱动</span>
        </label>
        <Select
          value={storyType}
          onChange={(e) =>
            setStoryType(e.target.value as PremiseCard['storyType'])
          }
          options={[
            { value: '', label: '选择类型' },
            ...STORY_TYPES.map(t => ({ value: t.value, label: t.label })),
          ]}
        />
      </div>

      {/* Reader Questions */}
      <div className="premise-form-group">
        <label className="premise-label">
          读者问题
          <span className="premise-label-hint">
            每行一条，读者在阅读中想解答的问题（换行分隔）
          </span>
        </label>
        <TextArea
          placeholder={'这个世界的规则是什么？\n主角为什么要冒险？\n最大的悬念是什么？'}
          value={readerQuestionsText}
          onChange={(e) => setReaderQuestionsText(e.target.value)}
          className="premise-textarea-short"
          style={{ minHeight: 80 }}
        />
        {readerQuestionsText.trim().length > 0 && (
          <div className="premise-question-count">
            {getReaderQuestions().length} 条问题
          </div>
        )}
      </div>

      {/* Error message */}
      {saveError && <div className="premise-error-text">{saveError}</div>}

      {/* Actions */}
      <div className="premise-button-row">
        <Button variant="secondary" onClick={handleSave} disabled={saving || !hasContent}>
          {saving ? '保存中...' : '保存草稿'}
        </Button>
        <Button variant="primary" onClick={handleConfirm} disabled={saving || !hasContent}>
          {saving ? '确认中...' : '确认前提'}
        </Button>
      </div>
      {card && (
        <div className="premise-draft-notice">
          已有草稿，保存将覆盖
        </div>
      )}
    </div>
  );
}
