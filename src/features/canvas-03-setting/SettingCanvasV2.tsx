/**
 * SettingCanvasV2 — 画板③ 设定画板 (织梦机 v2)
 *
 * Three-tab container for World Rules / Characters / Factions.
 * Each tab manages its own CRUD via the corresponding Panel component.
 * Bottom "确认设定" button advances the pipeline state.
 */

import { useState, useCallback } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { confirmSetting } from '../../stores/pipeline-helper';
import WorldRulePanel from './WorldRulePanel';
import CharacterPanel from './CharacterPanel';
import FactionPanel from './FactionPanel';

type SettingTab = 'world-rules' | 'characters' | 'factions';

const TABS: { id: SettingTab; label: string }[] = [
  { id: 'world-rules', label: '世界观' },
  { id: 'characters', label: '角色' },
  { id: 'factions', label: '势力' },
];

const s: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#12122a',
  },
  tabBar: {
    display: 'flex',
    gap: 0,
    borderBottom: '1px solid #2a2a2a',
    background: '#16162a',
    padding: '0 8px',
  },
  tab: {
    padding: '10px 20px',
    fontSize: '0.82rem',
    fontWeight: 500,
    color: '#888',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    transition: 'color 0.15s ease, border-color 0.15s ease',
    background: 'transparent',
    borderTop: 'none',
    borderLeft: 'none',
    borderRight: 'none',
    fontFamily: 'inherit',
  },
  tabActive: {
    color: '#CE93D8',
    borderBottom: '2px solid #CE93D8',
  },
  content: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '12px 16px',
    borderTop: '1px solid #2a2a2a',
    background: '#16162a',
  },
  btn: {
    padding: '10px 28px',
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.85rem',
    fontFamily: 'inherit',
    background: '#22C55E',
    color: '#fff',
    transition: 'opacity 0.15s ease',
  },
};

export default function SettingCanvasV2() {
  const projectId = useProjectStore(s => s.currentProjectId);
  const [activeTab, setActiveTab] = useState<SettingTab>('world-rules');

  const handleConfirm = useCallback(async () => {
    if (!projectId) return;
    try {
      await confirmSetting(projectId);
    } catch (e) {
      console.error('Failed to confirm setting', e);
    }
  }, [projectId]);

  return (
    <div style={s.wrapper}>
      {/* Tab Bar */}
      <div style={s.tabBar}>
        {TABS.map(t => (
          <button
            key={t.id}
            style={{ ...s.tab, ...(activeTab === t.id ? s.tabActive : {}) }}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={s.content}>
        {activeTab === 'world-rules' && <WorldRulePanel />}
        {activeTab === 'characters' && <CharacterPanel />}
        {activeTab === 'factions' && <FactionPanel />}
      </div>

      {/* Footer with Confirm Button */}
      <div style={s.footer}>
        <button style={s.btn} onClick={handleConfirm}>
          确认设定 ✓
        </button>
      </div>
    </div>
  );
}
