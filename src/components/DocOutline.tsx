import { useState, useMemo } from 'react';
import type { WorldObject } from '../types/world';

interface DocOutlineProps {
  allObjects: WorldObject[];
  currentObjectId: string | null;
  onNavigate: (name: string) => void;
}

interface GroupConfig {
  key: string;
  label: string;
  icon: string;
  predicate: (obj: WorldObject) => boolean;
}

const GROUPS: GroupConfig[] = [
  { key: 'discarded', label: '废弃', icon: '\u{1F5D1}️', predicate: (o) => o.status === '废弃' },
  { key: 'draft', label: '草稿', icon: '\u{1F4DD}', predicate: (o) => o.status === '草稿' },
  { key: 'chapter', label: '正文', icon: '\u{1F4C4}', predicate: (o) => o.type === '章节' && o.status !== '废弃' && o.status !== '草稿' },
  { key: 'character', label: '人物', icon: '\u{1F464}', predicate: (o) => o.type === '人物' && o.status !== '废弃' && o.status !== '草稿' },
  { key: 'setting', label: '设定', icon: '⚙️', predicate: (o) => ['地点', '组织', '规则/机制', '事件', '物品', '术语'].includes(o.type) && o.status !== '废弃' && o.status !== '草稿' },
];

function statusIcon(status: string): string {
  switch (status) {
    case '锁定': return '\u{1F512}';
    case '草稿': return '\u{1F4DD}';
    case '待验证': return '\u{1F50D}';
    case '待定': return '\u{1F50D}';
    case '废弃': return '\u{1F5D1}️';
    case '占位': return '\u{2B1C}';
    default: return '\u{1F4C4}';
  }
}

export default function DocOutline({ allObjects, currentObjectId, onNavigate }: DocOutlineProps) {
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const groups = useMemo(() => {
    return GROUPS
      .map(g => ({
        ...g,
        items: allObjects.filter(g.predicate).sort((a, b) => a.name.localeCompare(b.name, 'zh')),
      }))
      .filter(g => g.items.length > 0);
  }, [allObjects]);

  return (
    <div className={`doc-outline ${panelCollapsed ? 'collapsed' : ''}`}>
      <div className="doc-outline-header">
        {!panelCollapsed && <span className="doc-outline-title">大纲</span>}
        <button className="doc-outline-toggle-btn" onClick={() => setPanelCollapsed(!panelCollapsed)} title={panelCollapsed ? '展开大纲' : '收起大纲'}>
          {panelCollapsed ? '▶' : '◀'}
        </button>
      </div>
      {!panelCollapsed && (
        <div className="doc-outline-tree">
          {groups.map(group => (
            <div key={group.key} className="outline-group">
              <div className="outline-group-header" onClick={() => toggleGroup(group.key)}>
                <span className="outline-toggle">{collapsedGroups[group.key] ? '▶' : '▼'}</span>
                <span className="outline-group-icon">{group.icon}</span>
                <span className="outline-group-label">{group.label}</span>
                <span className="outline-count">{group.items.length}</span>
              </div>
              {!collapsedGroups[group.key] && (
                <div className="outline-items">
                  {group.items.map(item => (
                    <div key={item.id} className={`outline-item ${currentObjectId === item.id ? 'active' : ''}`} onClick={() => onNavigate(item.name)} title={item.name}>
                      <span className="outline-item-status">{statusIcon(item.status)}</span>
                      <span className="outline-item-name">{item.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {groups.length === 0 && <div className="outline-empty">暂无对象</div>}
        </div>
      )}
    </div>
  );
}
