/**
 * WorldRulePanel — 画板③ 世界观规则面板 (织梦机 v2)
 *
 * CRUD list + editor for WorldRule entities.
 */

import { useState, useEffect, useCallback } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import * as settingApi from '../../api/settingApi';
import type { WorldRule } from '../../contracts/setting.contract';

const s: Record<string, React.CSSProperties> = {
  wrapper: { display: 'flex', flexDirection: 'column', height: '100%', gap: 12, padding: 16 },
  list: { display: 'flex', flexDirection: 'column', gap: 8, flex: 1, overflowY: 'auto' },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '10px 14px',
    borderRadius: 8,
    background: '#1a1a2e',
    border: '1px solid #2a2a3a',
    cursor: 'pointer',
    transition: 'border-color 0.15s ease',
  },
  cardSelected: { border: '1px solid #4A9EFF' },
  cardTitle: { fontSize: '0.88rem', fontWeight: 600, color: '#e0e0e0' },
  cardSub: { fontSize: '0.75rem', color: '#888', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' },
  cardMeta: { fontSize: '0.7rem', color: '#555', display: 'flex', gap: 8 },
  label: { fontSize: '0.75rem', color: '#888', marginBottom: 4 },
  input: {
    width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #333',
    background: '#1a1a2e', color: '#e0e0e0', fontSize: '0.82rem', outline: 'none',
    boxSizing: 'border-box' as const, fontFamily: 'inherit',
  },
  textarea: {
    width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #333',
    background: '#1a1a2e', color: '#e0e0e0', fontSize: '0.82rem', outline: 'none',
    resize: 'vertical' as const, minHeight: 60, boxSizing: 'border-box' as const, fontFamily: 'inherit',
  },
  editor: {
    display: 'flex', flexDirection: 'column', gap: 10, padding: 16, borderRadius: 8,
    background: '#16162a', border: '1px solid #2a2a2a',
  },
  btn: {
    padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
    fontWeight: 600, fontSize: '0.8rem', fontFamily: 'inherit',
  },
  btnPrimary: { background: '#4A9EFF', color: '#fff' },
  btnDanger: { background: '#E74C3C', color: '#fff' },
  btnSecondary: { background: '#2a2a3e', color: '#aaa', border: '1px solid #3a3a4e' },
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    height: '100%', gap: 12, color: '#666', fontSize: '0.85rem',
  },
};

export default function WorldRulePanel() {
  const projectId = useProjectStore(s => s.currentProjectId);
  const [rules, setRules] = useState<WorldRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<WorldRule | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editRuleText, setEditRuleText] = useState('');
  const [editCost, setEditCost] = useState('');
  const [editEnforcer, setEditEnforcer] = useState('');

  const load = useCallback(async () => {
    if (!projectId) return;
    try {
      const list = await settingApi.listWorldRules(projectId);
      setRules(list);
    } catch (e) {
      console.error('Failed to load world rules', e);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const resetEdit = useCallback(() => {
    setSelected(null);
    setEditTitle('');
    setEditRuleText('');
    setEditCost('');
    setEditEnforcer('');
  }, []);

  const selectRule = useCallback((r: WorldRule) => {
    setSelected(r);
    setEditTitle(r.title);
    setEditRuleText(r.ruleText);
    setEditCost(r.cost);
    setEditEnforcer(r.enforcer);
  }, []);

  const handleSave = useCallback(async () => {
    if (!projectId) return;
    if (selected) {
      try {
        const updated = await settingApi.updateWorldRule({
          id: selected.id,
          title: editTitle,
          ruleText: editRuleText,
          cost: editCost,
          enforcer: editEnforcer,
        });
        setRules(prev => prev.map(r => (r.id === updated.id ? updated : r)));
        setSelected(updated);
      } catch (e) { console.error('Failed to update world rule', e); }
    } else {
      try {
        const created = await settingApi.createWorldRule({
          projectId,
          title: editTitle || '新规则',
          ruleText: editRuleText,
          cost: editCost,
          enforcer: editEnforcer,
        });
        setRules(prev => [...prev, created]);
        setSelected(created);
      } catch (e) { console.error('Failed to create world rule', e); }
    }
  }, [projectId, selected, editTitle, editRuleText, editCost, editEnforcer]);

  const handleDelete = useCallback(async () => {
    if (!selected) return;
    try {
      await settingApi.deleteWorldRule(selected.id);
      setRules(prev => prev.filter(r => r.id !== selected.id));
      resetEdit();
    } catch (e) { console.error('Failed to delete world rule', e); }
  }, [selected, resetEdit]);

  const handleAdd = useCallback(() => resetEdit(), [resetEdit]);

  if (loading) {
    return <div style={s.empty}><div className="spinner" /><p>加载中...</p></div>;
  }

  return (
    <div style={s.wrapper}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={{ ...s.btn, ...s.btnPrimary }} onClick={handleAdd}>
          + 添加规则
        </button>
      </div>

      <div style={s.list}>
        {rules.length === 0 && !selected ? (
          <div style={s.empty}>
            <p>还没有世界观规则</p>
            <p style={{ fontSize: '0.78rem' }}>点击上方按钮添加第一条规则</p>
          </div>
        ) : (
          rules.map(r => (
            <div
              key={r.id}
              style={{ ...s.card, ...(selected?.id === r.id ? s.cardSelected : {}) }}
              onClick={() => selectRule(r)}
            >
              <div style={s.cardTitle}>{r.title || '未命名规则'}</div>
              {r.ruleText && <div style={s.cardSub}>{r.ruleText}</div>}
              <div style={s.cardMeta}>
                <span>代价: {r.cost || '-'}</span>
                <span>执行者: {r.enforcer || '-'}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Editor */}
      {(selected || (!selected && editTitle !== '')) && (
        <div style={s.editor}>
          <div>
            <div style={s.label}>规则名称</div>
            <input style={s.input} value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="如：魔法守恒定律" />
          </div>
          <div>
            <div style={s.label}>规则描述</div>
            <textarea style={s.textarea} value={editRuleText} onChange={e => setEditRuleText(e.target.value)} placeholder="规则的具体内容" rows={3} />
          </div>
          <div>
            <div style={s.label}>代价</div>
            <input style={s.input} value={editCost} onChange={e => setEditCost(e.target.value)} placeholder="使用规则需要付出的代价" />
          </div>
          <div>
            <div style={s.label}>执行者</div>
            <input style={s.input} value={editEnforcer} onChange={e => setEditEnforcer(e.target.value)} placeholder="谁/什么力量执行此规则" />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button style={{ ...s.btn, ...s.btnPrimary, flex: 1 }} onClick={handleSave}>
              {selected ? '保存' : '创建'}
            </button>
            {selected && (
              <button style={{ ...s.btn, ...s.btnDanger }} onClick={handleDelete}>
                删除
              </button>
            )}
            <button style={{ ...s.btn, ...s.btnSecondary }} onClick={resetEdit}>
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
