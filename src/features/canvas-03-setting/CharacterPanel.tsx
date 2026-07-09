/**
 * CharacterPanel — 画板③ 角色面板 (织梦机 v2)
 *
 * CRUD list + editor for CharacterCard entities.
 * Fields: name, hook, currentWant, realBlock, archetype, description.
 */

import { useState, useEffect, useCallback } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import * as settingApi from '../../api/settingApi';
import type { CharacterCard } from '../../contracts/setting.contract';

const s: Record<string, React.CSSProperties> = {
  wrapper: { display: 'flex', flexDirection: 'column', height: '100%', gap: 12, padding: 16 },
  list: { display: 'flex', flexDirection: 'column', gap: 8, flex: 1, overflowY: 'auto' },
  card: {
    display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 14px', borderRadius: 8,
    background: '#1a1a2e', border: '1px solid #2a2a3a', cursor: 'pointer',
    transition: 'border-color 0.15s ease',
  },
  cardSelected: { border: '1px solid #FFB74D' },
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
};

export default function CharacterPanel() {
  const projectId = useProjectStore(s => s.currentProjectId);
  const [characters, setCharacters] = useState<CharacterCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CharacterCard | null>(null);
  const [editName, setEditName] = useState('');
  const [editHook, setEditHook] = useState('');
  const [editCurrentWant, setEditCurrentWant] = useState('');
  const [editRealBlock, setEditRealBlock] = useState('');
  const [editArchetype, setEditArchetype] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const load = useCallback(async () => {
    if (!projectId) return;
    try {
      const list = await settingApi.listCharacterCards(projectId);
      setCharacters(list);
    } catch (e) {
      console.error('Failed to load characters', e);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const resetEdit = useCallback(() => {
    setSelected(null);
    setEditName('');
    setEditHook('');
    setEditCurrentWant('');
    setEditRealBlock('');
    setEditArchetype('');
    setEditDescription('');
  }, []);

  const selectChar = useCallback((c: CharacterCard) => {
    setSelected(c);
    setEditName(c.name);
    setEditHook(c.hook);
    setEditCurrentWant(c.currentWant);
    setEditRealBlock(c.realBlock);
    setEditArchetype(c.archetype);
    setEditDescription(c.description);
  }, []);

  const handleSave = useCallback(async () => {
    if (!projectId) return;
    if (selected) {
      try {
        const updated = await settingApi.updateCharacterCard({
          id: selected.id, name: editName, hook: editHook,
          currentWant: editCurrentWant, realBlock: editRealBlock,
          archetype: editArchetype, description: editDescription,
        });
        setCharacters(prev => prev.map(c => (c.id === updated.id ? updated : c)));
        setSelected(updated);
      } catch (e) { console.error('Failed to update character', e); }
    } else {
      try {
        const created = await settingApi.createCharacterCard({
          projectId, name: editName || '新角色', hook: editHook,
          currentWant: editCurrentWant, realBlock: editRealBlock,
          archetype: editArchetype, description: editDescription,
        });
        setCharacters(prev => [...prev, created]);
        setSelected(created);
      } catch (e) { console.error('Failed to create character', e); }
    }
  }, [projectId, selected, editName, editHook, editCurrentWant, editRealBlock, editArchetype, editDescription]);

  const handleDelete = useCallback(async () => {
    if (!selected) return;
    try {
      await settingApi.deleteCharacterCard(selected.id);
      setCharacters(prev => prev.filter(c => c.id !== selected.id));
      resetEdit();
    } catch (e) { console.error('Failed to delete character', e); }
  }, [selected, resetEdit]);

  const handleAdd = useCallback(() => resetEdit(), [resetEdit]);

  if (loading) {
    return <div style={s.empty}><div className="spinner" /><p>加载中...</p></div>;
  }

  return (
    <div style={s.wrapper}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={{ ...s.btn, ...s.btnPrimary }} onClick={handleAdd}>
          + 添加角色
        </button>
      </div>

      <div style={s.list}>
        {characters.length === 0 && !selected ? (
          <div style={s.empty}>
            <p>还没有角色</p>
            <p style={{ fontSize: '0.78rem' }}>点击上方按钮添加第一个角色</p>
          </div>
        ) : (
          characters.map(c => (
            <div
              key={c.id}
              style={{ ...s.card, ...(selected?.id === c.id ? s.cardSelected : {}) }}
              onClick={() => selectChar(c)}
            >
              <div style={s.cardTitle}>{c.name || '未命名角色'}</div>
              {c.hook && <div style={s.cardSub}>{c.hook}</div>}
              <div style={s.cardMeta}>
                {c.archetype && <span>原型: {c.archetype}</span>}
                {c.currentWant && <span>欲望: {c.currentWant}</span>}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Editor */}
      {(selected || (!selected && editName !== '')) && (
        <div style={s.editor}>
          <div>
            <div style={s.label}>角色名</div>
            <input style={s.input} value={editName} onChange={e => setEditName(e.target.value)} placeholder="角色名称" />
          </div>
          <div>
            <div style={s.label}>钩子 (Hook)</div>
            <input style={s.input} value={editHook} onChange={e => setEditHook(e.target.value)} placeholder="一句话让读者记住角色" />
          </div>
          <div>
            <div style={s.label}>表面欲望 (Current Want)</div>
            <input style={s.input} value={editCurrentWant} onChange={e => setEditCurrentWant(e.target.value)} placeholder="角色当前追求什么" />
          </div>
          <div>
            <div style={s.label}>真实阻碍 (Real Block)</div>
            <input style={s.input} value={editRealBlock} onChange={e => setEditRealBlock(e.target.value)} placeholder="真正的内心阻碍" />
          </div>
          <div>
            <div style={s.label}>原型 (Archetype)</div>
            <input style={s.input} value={editArchetype} onChange={e => setEditArchetype(e.target.value)} placeholder="如：英雄、导师、守护者" />
          </div>
          <div>
            <div style={s.label}>描述</div>
            <textarea style={s.textarea} value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="角色详细描述" rows={3} />
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
