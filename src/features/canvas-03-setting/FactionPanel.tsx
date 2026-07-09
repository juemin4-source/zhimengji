/**
 * FactionPanel — 画板③ 势力面板 (织梦机 v2)
 *
 * CRUD list + editor for FactionCard entities.
 * Fields: name, trueGoal, publicSlogan, resources (string[]),
 * representativeCharacterIds (string[] ← multi-select from characters),
 * dailyInterface.
 */

import { useState, useEffect, useCallback } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import * as settingApi from '../../api/settingApi';
import type { FactionCard, CharacterCard } from '../../contracts/setting.contract';

const s: Record<string, React.CSSProperties> = {
  wrapper: { display: 'flex', flexDirection: 'column', height: '100%', gap: 12, padding: 16 },
  list: { display: 'flex', flexDirection: 'column', gap: 8, flex: 1, overflowY: 'auto' },
  card: {
    display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 14px', borderRadius: 8,
    background: '#1a1a2e', border: '1px solid #2a2a3a', cursor: 'pointer',
    transition: 'border-color 0.15s ease',
  },
  cardSelected: { border: '1px solid #CE93D8' },
  cardTitle: { fontSize: '0.88rem', fontWeight: 600, color: '#e0e0e0' },
  cardSub: { fontSize: '0.75rem', color: '#888', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' },
  cardMeta: { fontSize: '0.7rem', color: '#555', display: 'flex', gap: 8, flexWrap: 'wrap' as const },
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
  chip: {
    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 4,
    background: 'rgba(206, 147, 216, 0.15)', color: '#CE93D8', fontSize: '0.72rem', fontWeight: 500,
  },
  checkbox: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 4,
    cursor: 'pointer', fontSize: '0.82rem', color: '#ccc',
  },
};

export default function FactionPanel() {
  const projectId = useProjectStore(s => s.currentProjectId);
  const [factions, setFactions] = useState<FactionCard[]>([]);
  const [characters, setCharacters] = useState<CharacterCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<FactionCard | null>(null);
  const [editName, setEditName] = useState('');
  const [editTrueGoal, setEditTrueGoal] = useState('');
  const [editPublicSlogan, setEditPublicSlogan] = useState('');
  const [editResources, setEditResources] = useState('');
  const [editCharIds, setEditCharIds] = useState<string[]>([]);
  const [editDailyInterface, setEditDailyInterface] = useState('');

  const load = useCallback(async () => {
    if (!projectId) return;
    try {
      const [factionList, charList] = await Promise.all([
        settingApi.listFactionCards(projectId),
        settingApi.listCharacterCards(projectId),
      ]);
      setFactions(factionList);
      setCharacters(charList);
    } catch (e) {
      console.error('Failed to load factions', e);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const resetEdit = useCallback(() => {
    setSelected(null);
    setEditName('');
    setEditTrueGoal('');
    setEditPublicSlogan('');
    setEditResources('');
    setEditCharIds([]);
    setEditDailyInterface('');
  }, []);

  const selectFaction = useCallback((f: FactionCard) => {
    setSelected(f);
    setEditName(f.name);
    setEditTrueGoal(f.trueGoal);
    setEditPublicSlogan(f.publicSlogan);
    setEditResources((f.resources || []).join('\n'));
    setEditCharIds(f.representativeCharacterIds || []);
    setEditDailyInterface(f.dailyInterface);
  }, []);

  const toggleCharId = useCallback((id: string) => {
    setEditCharIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  }, []);

  const handleSave = useCallback(async () => {
    if (!projectId) return;
    // Parse resources from newline-separated text to string[]
    const resourcesArr = editResources
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    if (selected) {
      try {
        const updated = await settingApi.updateFactionCard({
          id: selected.id, name: editName, trueGoal: editTrueGoal,
          publicSlogan: editPublicSlogan, resources: resourcesArr,
          representativeCharacterIds: editCharIds, dailyInterface: editDailyInterface,
        });
        setFactions(prev => prev.map(f => (f.id === updated.id ? updated : f)));
        setSelected(updated);
      } catch (e) { console.error('Failed to update faction', e); }
    } else {
      try {
        const created = await settingApi.createFactionCard({
          projectId, name: editName || '新势力', trueGoal: editTrueGoal,
          publicSlogan: editPublicSlogan, resources: resourcesArr,
          representativeCharacterIds: editCharIds, dailyInterface: editDailyInterface,
        });
        setFactions(prev => [...prev, created]);
        setSelected(created);
      } catch (e) { console.error('Failed to create faction', e); }
    }
  }, [projectId, selected, editName, editTrueGoal, editPublicSlogan, editResources, editCharIds, editDailyInterface]);

  const handleDelete = useCallback(async () => {
    if (!selected) return;
    try {
      await settingApi.deleteFactionCard(selected.id);
      setFactions(prev => prev.filter(f => f.id !== selected.id));
      resetEdit();
    } catch (e) { console.error('Failed to delete faction', e); }
  }, [selected, resetEdit]);

  const handleAdd = useCallback(() => resetEdit(), [resetEdit]);

  if (loading) {
    return <div style={s.empty}><div className="spinner" /><p>加载中...</p></div>;
  }

  return (
    <div style={s.wrapper}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={{ ...s.btn, ...s.btnPrimary }} onClick={handleAdd}>
          + 添加势力
        </button>
      </div>

      <div style={s.list}>
        {factions.length === 0 && !selected ? (
          <div style={s.empty}>
            <p>还没有势力</p>
            <p style={{ fontSize: '0.78rem' }}>点击上方按钮添加第一个势力</p>
          </div>
        ) : (
          factions.map(f => (
            <div
              key={f.id}
              style={{ ...s.card, ...(selected?.id === f.id ? s.cardSelected : {}) }}
              onClick={() => selectFaction(f)}
            >
              <div style={s.cardTitle}>{f.name || '未命名势力'}</div>
              {f.publicSlogan && <div style={s.cardSub}>{f.publicSlogan}</div>}
              <div style={s.cardMeta}>
                {f.representativeCharacterIds.length > 0 && (
                  <span>代表角色: {f.representativeCharacterIds.length}人</span>
                )}
                {f.resources.length > 0 && (
                  <span>资源: {f.resources.length}项</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Editor */}
      {(selected || (!selected && editName !== '')) && (
        <div style={s.editor}>
          <div>
            <div style={s.label}>势力名称</div>
            <input style={s.input} value={editName} onChange={e => setEditName(e.target.value)} placeholder="势力名称" />
          </div>
          <div>
            <div style={s.label}>真实目标 (True Goal)</div>
            <input style={s.input} value={editTrueGoal} onChange={e => setEditTrueGoal(e.target.value)} placeholder="势力真正想要达到的目的" />
          </div>
          <div>
            <div style={s.label}>公开口号 (Public Slogan)</div>
            <input style={s.input} value={editPublicSlogan} onChange={e => setEditPublicSlogan(e.target.value)} placeholder="对外的宣传口号" />
          </div>
          <div>
            <div style={s.label}>资源 (每行一项)</div>
            <textarea style={s.textarea} value={editResources} onChange={e => setEditResources(e.target.value)} placeholder="资源列表，每行一项" rows={3} />
          </div>
          <div>
            <div style={s.label}>代表角色</div>
            {characters.length === 0 ? (
              <div style={{ fontSize: '0.78rem', color: '#666', padding: '4px 0' }}>
                暂无角色，请先在「角色」Tab 中添加
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 150, overflowY: 'auto', background: '#1a1a2e', borderRadius: 6, padding: 4 }}>
                {characters.map(ch => (
                  <label key={ch.id} style={s.checkbox}>
                    <input
                      type="checkbox"
                      checked={editCharIds.includes(ch.id)}
                      onChange={() => toggleCharId(ch.id)}
                      style={{ accentColor: '#CE93D8' }}
                    />
                    {ch.name}
                  </label>
                ))}
              </div>
            )}
            {editCharIds.length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                {editCharIds.map(id => {
                  const ch = characters.find(c => c.id === id);
                  return ch ? <span key={id} style={s.chip}>{ch.name}</span> : null;
                })}
              </div>
            )}
          </div>
          <div>
            <div style={s.label}>日常面貌 (Daily Interface)</div>
            <textarea style={s.textarea} value={editDailyInterface} onChange={e => setEditDailyInterface(e.target.value)} placeholder="势力的日常外在表现" rows={2} />
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
