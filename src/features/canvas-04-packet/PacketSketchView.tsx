/**
 * PacketSketchView — 画板④ 快速草图模式视图
 *
 * Shows L1-L3 as compact summary cards with L4 collapsed.
 * Summary-only display per node.
 */

import React from 'react';
import type { WritingContract, ActiveContext, NarrativeCompression } from '../../contracts/chapter-packet.contract';
import { Badge } from '../../components/ui';

interface PacketSketchViewProps {
  title: string;
  chapterFunction: string;
  position: string;
  layer1: WritingContract;
  layer2: ActiveContext;
  layer3: NarrativeCompression;
}

export default function PacketSketchView({
  title,
  chapterFunction,
  position,
  layer1,
  layer2,
  layer3,
}: PacketSketchViewProps) {
  return (
    <div className="packet-sketch-view">
      {/* L1: Writing Contract summary */}
      <div className="packet-sketch-card">
        <div className="packet-sketch-card-header">
          <span className="packet-sketch-card-title">写作契约</span>
          <Badge variant="default">L1</Badge>
        </div>
        <div className="packet-sketch-card-body">
          <div className="packet-sketch-stat-row">
            <span className="packet-sketch-stat">
              叙事距离: <strong>{layer1.narrativeDistance === 'close' ? '近距' : layer1.narrativeDistance === 'medium' ? '中距' : '远距'}</strong>
            </span>
            <span className="packet-sketch-stat">
              策略: <strong>{layer1.expositionStrategy === 'show_dont_tell' ? '展示勿述' : layer1.expositionStrategy === 'balanced' ? '平衡' : '解释一切'}</strong>
            </span>
            <span className="packet-sketch-stat">
              声音: <strong>{layer1.characterVoice === 'distinct' ? '鲜明' : layer1.characterVoice === 'moderate' ? '适中' : '统一'}</strong>
            </span>
          </div>
          <div className="packet-sketch-stat-row">
            <span className="packet-sketch-stat">禁忌: {layer1.taboos.length} 条</span>
            <span className="packet-sketch-stat">声音样本: {layer1.voiceSamples.length} 个</span>
          </div>
        </div>
      </div>

      {/* L2: Active Setting summary */}
      <div className="packet-sketch-card">
        <div className="packet-sketch-card-header">
          <span className="packet-sketch-card-title">活跃设定</span>
          <Badge variant="default">L2</Badge>
        </div>
        <div className="packet-sketch-card-body">
          <div className="packet-sketch-stat-row">
            <Badge variant="status">角色 {layer2.characters.length}</Badge>
            <Badge variant="status">场景 {layer2.scenes.length}</Badge>
            <Badge variant="status">规则 {layer2.rules.length}</Badge>
          </div>
          {layer2.recap && (
            <div className="packet-sketch-recap">
              <span className="packet-sketch-recap-label">前情提要:</span>
              <span className="packet-sketch-recap-text">{layer2.recap}</span>
            </div>
          )}
          {layer2.characters.length > 0 && (
            <div className="packet-sketch-char-list">
              {layer2.characters.slice(0, 5).map((c, i) => (
                <span key={c.characterId || i} className="packet-sketch-char-tag">
                  {c.name}
                </span>
              ))}
              {layer2.characters.length > 5 && (
                <span className="packet-sketch-more">+{layer2.characters.length - 5}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* L3: Narrative Compression - core display */}
      <div className="packet-sketch-card packet-sketch-card-main">
        <div className="packet-sketch-card-header">
          <span className="packet-sketch-card-title">剧情压缩</span>
          <Badge variant="status">L3 · 核心</Badge>
        </div>
        <div className="packet-sketch-card-body">
          {/* Chapter metadata */}
          <div className="packet-sketch-meta-row">
            {chapterFunction && (
              <span className="packet-sketch-meta">
                功能: <strong>{chapterFunction}</strong>
              </span>
            )}
            {position && (
              <span className="packet-sketch-meta">
                时位: <strong>{position}</strong>
              </span>
            )}
            {layer3.lines.length > 0 && (
              <span className="packet-sketch-meta">
                线路: <strong>{layer3.lines.join(', ')}</strong>
              </span>
            )}
          </div>

          {/* Narrative */}
          {layer3.narrative && (
            <div className="packet-sketch-narrative">
              {layer3.narrative}
            </div>
          )}

          {/* Releases */}
          {layer3.releases.length > 0 && (
            <div className="packet-sketch-section">
              <span className="packet-sketch-section-label">释放信息:</span>
              <ul className="packet-sketch-list">
                {layer3.releases.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Establishes summary */}
          {layer3.establishes.length > 0 && (
            <div className="packet-sketch-section">
              <span className="packet-sketch-section-label">
                建立/伏笔/压力: {layer3.establishes.length}
              </span>
              <div className="packet-sketch-establishes">
                {layer3.establishes.slice(0, 6).map((e, i) => (
                  <Badge key={i} variant={e.type === 'foreshadow' ? 'genre' : e.type === 'pressure' ? 'canon' : 'default'}>
                    {e.type === 'establish' ? '建立' : e.type === 'foreshadow' ? '伏笔' : '压力'}: {e.subject}
                  </Badge>
                ))}
                {layer3.establishes.length > 6 && (
                  <span className="packet-sketch-more">+{layer3.establishes.length - 6}</span>
                )}
              </div>
            </div>
          )}

          {/* Assumptions summary */}
          {layer3.assumptions.length > 0 && (
            <div className="packet-sketch-section">
              <span className="packet-sketch-section-label">
                临时假设: {layer3.assumptions.length}
              </span>
              <div className="packet-sketch-assumptions">
                {layer3.assumptions.map((a, i) => (
                  <span key={a.id || i} className="packet-sketch-assumption">
                    {a.content}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* L4: Collapsed summary */}
      <div className="packet-sketch-card packet-sketch-collapsed">
        <div className="packet-sketch-card-header">
          <span className="packet-sketch-card-title">执行层</span>
          <Badge variant="default">L4 · 已折叠</Badge>
        </div>
        <div className="packet-sketch-card-body">
          <span className="packet-sketch-collapsed-text">
            快速草图模式下 L4 已折叠。切换至「标准大纲」或「精细润色」模式查看和执行层编辑。
          </span>
        </div>
      </div>
    </div>
  );
}
