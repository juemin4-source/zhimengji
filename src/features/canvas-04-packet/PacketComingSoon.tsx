/**
 * PacketComingSoon — 画板④ 细纲占位壳 (织梦机 v2)
 *
 * Displays an empty state indicating the packet/scheduling view is coming soon.
 */

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: 40,
    textAlign: 'center',
  },
  icon: {
    fontSize: '3rem',
    marginBottom: 20,
    opacity: 0.5,
  },
  title: {
    fontSize: '1.2rem',
    fontWeight: 700,
    color: '#e0e0e0',
    marginBottom: 12,
  },
  desc: {
    fontSize: '0.85rem',
    color: '#888',
    maxWidth: 400,
    lineHeight: 1.7,
    marginBottom: 20,
  },
  hint: {
    fontSize: '0.78rem',
    color: '#555',
    padding: '10px 16px',
    border: '1px dashed #333',
    borderRadius: 8,
    maxWidth: 360,
    lineHeight: 1.6,
  },
};

export default function PacketComingSoon() {
  return (
    <div style={styles.container}>
      <div style={styles.icon}>📋</div>
      <div style={styles.title}>排期细纲即将到来</div>
      <div style={styles.desc}>
        你可以在这里按章节/场景排期你的故事细纲。
        包含字数目标、进度追踪、章节状态管理。
      </div>
      <div style={styles.hint}>
        当前版本请在"文档"标签页中使用自由编辑功能完成细纲写作。
        排期功能预计在下一版本上线。
      </div>
    </div>
  );
}
