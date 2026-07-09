/**
 * PremiseEntryGate — 画板① 前提卡入口 (织梦机 v2)
 *
 * Reads projectId from projectStore. Displays a premise card with
 * explanatory text and renders the CreationWizard component.
 */

import { useEffect } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import CreationWizard from '../../components/CreationWizard';

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 32,
    maxWidth: 680,
    margin: '0 auto',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: '1.3rem',
    fontWeight: 700,
    color: '#e8e8e8',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: '0.85rem',
    color: '#888',
    lineHeight: 1.6,
  },
  card: {
    background: '#141414',
    border: '1px solid #2a2a2a',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#e0e0e0',
    marginBottom: 10,
  },
  cardText: {
    fontSize: '0.82rem',
    color: '#a0a0a0',
    lineHeight: 1.7,
    marginBottom: 6,
  },
  highlight: {
    color: '#B7FF00',
    fontWeight: 500,
  },
  checklist: {
    listStyle: 'none',
    padding: 0,
    margin: '12px 0 0',
  },
  checklistItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    fontSize: '0.82rem',
    color: '#a0a0a0',
    lineHeight: 1.6,
    marginBottom: 6,
  },
};

const CHECKLIST = [
  '这个故事是关于谁的？',
  '他/她想要什么？（核心欲望/目标）',
  '有什么阻碍他/她？（冲突/障碍）',
  '如果失败了会怎样？（赌注）',
  '为什么是现在？（紧迫感 / 催化剂事件）',
];

export default function PremiseEntryGate() {
  const projectId = useProjectStore((s) => s.currentProjectId);

  useEffect(() => {
    if (projectId) {
      console.log('[PremiseEntryGate] mounted for project:', projectId);
    }
  }, [projectId]);

  if (!projectId) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.title}>新建作品</div>
          <div style={styles.subtitle}>创建一部新作品，开始织梦之旅。</div>
        </div>
        <CreationWizard
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>前提卡</div>
        <div style={styles.subtitle}>
          在进入大纲之前，先用一段话讲清楚你的故事核心。
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>什么是"前提"？</div>
        <div style={styles.cardText}>
          前提（Premise）是你故事的一句話摘要。它回答五个核心问题：
        </div>
        <ul style={styles.checklist}>
          {CHECKLIST.map((item, i) => (
            <li key={i} style={styles.checklistItem}>
              <span style={styles.highlight}>{i + 1}.</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>好前提的公式</div>
        <div style={styles.cardText}>
          一个 <span style={styles.highlight}>[类型]</span> 故事，关于{' '}
          <span style={styles.highlight}>[人物]</span>，他/她想要{' '}
          <span style={styles.highlight}>[目标]</span>，但是{' '}
          <span style={styles.highlight}>[障碍]</span>，否则{' '}
          <span style={styles.highlight}>[后果]</span>。
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>示例</div>
        <div style={styles.cardText}>
          一个科幻故事，关于一个被遗弃在火星上的宇航员，他想要回到地球，但是他的资源正在耗尽，否则他将永远困在红色荒漠中。
        </div>
      </div>
    </div>
  );
}
