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
import { Tabs, Button } from '../../components/ui';
import type { Tab } from '../../components/ui';
import WorldRulePanel from './WorldRulePanel';
import CharacterPanel from './CharacterPanel';
import FactionPanel from './FactionPanel';
import './setting-canvas.css';

type SettingTab = 'world-rules' | 'characters' | 'factions';

const TABS: Tab[] = [
  { id: 'world-rules', label: '世界观' },
  { id: 'characters', label: '角色' },
  { id: 'factions', label: '势力' },
];

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
    <div className="setting-canvas-wrapper">
      {/* Tab Bar */}
      <div className="setting-canvas-tab-bar">
        <Tabs tabs={TABS} activeTab={activeTab} onChange={(id) => setActiveTab(id as SettingTab)} />
      </div>

      {/* Content */}
      <div className="setting-canvas-content">
        {activeTab === 'world-rules' && <WorldRulePanel />}
        {activeTab === 'characters' && <CharacterPanel />}
        {activeTab === 'factions' && <FactionPanel />}
      </div>

      {/* Footer with Confirm Button */}
      <div className="setting-canvas-footer">
        <Button variant="primary" onClick={handleConfirm}>
          确认设定 ✓
        </Button>
      </div>
    </div>
  );
}
