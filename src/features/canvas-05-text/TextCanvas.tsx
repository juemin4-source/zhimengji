/**
 * TextCanvas — 画板⑤ 正文编辑主组件。
 *
 * 布局：
 * ┌───────────────────────────────────────────────────────┐
 * │  左侧主区（DocumentView + chapterPacket label）  │ 右侧参考面板 │
 * │                                                   │              │
 * │  ┌─ 编辑器上方 ─────────────────┐                │ PacketReference │
 * │  │ 📄 基于 ChapterPacket: xxx  │                │ Panel           │
 * │  ├───────────────────────────┤                │                │
 * │  │  DocumentView (TipTap)    │                │  - 章节摘要      │
 * │  │                            │                │  - 角色简档      │
 * │  │                            │                │  - 场景列表      │
 * │  │                            │                │  - 知识边界      │
 * │  └───────────────────────────┘                │                │
 * │                                                   │              │
 * └───────────────────────────────────────────────────┴──────────────┘
 *
 * 设计约束：
 * - 不改 App.tsx（由 C5 Integration 替换 text stage 渲染）
 * - 不直接调用 invoke
 * - 不含 mock AI
 * - 继承 1.3 DESIGN-TOKENS
 */
import DocumentView from '../../components/DocumentView';
import PacketReferencePanel from './PacketReferencePanel';
import type { WorldObject, ObjectType, SaveStatus } from '../../types/world';
import type { ChapterPacket } from '../../contracts/chapter-packet.contract';
import './text-canvas.css';

interface TextCanvasProps {
  // ── DocumentView 透传 props ──
  currentObject: WorldObject | null;
  allObjects: WorldObject[];
  allBoardTabs: string[];
  onUpdateObject: (id: string, updates: Partial<WorldObject>) => void;
  onNavigate: (name: string) => void;
  onAddToBoard: (objectId: string, board: string) => void;
  onLockObject: (objectId: string, reason: string) => void;
  onDiscardObject: (objectId: string, reason: string) => void;
  onCreateObject: (templateType: ObjectType) => void;
  onCreateNamedObject?: (name: string, objectType: ObjectType) => void;
  saveStatus?: SaveStatus;
  onTriggerSave?: () => void;

  // ── C3 新增 ──
  /** 当前确认的 ChapterPacket，驱动右侧参考面板 */
  chapterPacket?: ChapterPacket | null;
  /** 所有可用的 packets（用于导航），C5 集成时可用 */
  chapterPackets?: ChapterPacket[];
}

export default function TextCanvas(props: TextCanvasProps) {
  const {
    currentObject,
    allObjects,
    allBoardTabs,
    onUpdateObject,
    onNavigate,
    onAddToBoard,
    onLockObject,
    onDiscardObject,
    onCreateObject,
    onCreateNamedObject,
    saveStatus,
    onTriggerSave,
    chapterPacket,
  } = props;

  // 无 packet 时显示空状态引导
  if (!chapterPacket) {
    return (
      <div className="text-canvas">
        <div className="text-canvas-empty">
          <div className="text-canvas-empty-icon">📄</div>
          <div className="text-canvas-empty-title">暂无细纲包</div>
          <div className="text-canvas-empty-desc">
            当前画板⑤需要先有一个已确认的 ChapterPacket 才能开始正文写作。
            请前往画板④（排期细纲）完成一个章节包的生成和确认。
          </div>
          <div className="text-canvas-empty-action">
            <span className="text-canvas-packet-badge">→ 前往画板④</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-canvas">
      {/* ── 左侧主区：DocumentView ── */}
      <div className="text-canvas-main">
        <DocumentView
          currentObject={currentObject}
          allObjects={allObjects}
          allBoardTabs={allBoardTabs}
          onUpdateObject={onUpdateObject}
          onNavigate={onNavigate}
          onAddToBoard={onAddToBoard}
          onLockObject={onLockObject}
          onDiscardObject={onDiscardObject}
          onCreateObject={onCreateObject}
          onCreateNamedObject={onCreateNamedObject}
          saveStatus={saveStatus}
          onTriggerSave={onTriggerSave}
          chapterPacket={chapterPacket}
        />
      </div>

      {/* ── 右侧参考面板 ── */}
      <div className="text-canvas-panel">
        <PacketReferencePanel packet={chapterPacket} />
      </div>
    </div>
  );
}
