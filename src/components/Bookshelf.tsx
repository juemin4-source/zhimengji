import { useState } from 'react';
import type { Project } from '../types/world';

interface BookshelfProps {
  projects: Project[];
  onEnterProject: (project: Project) => void;
  onCreateProject?: () => void;
}

const STATUS_LABEL: Record<Project['status'], string> = {
  drafting: '草稿中',
  conceiving: '构思中',
  editing: '修改中',
  done: '已完成',
};

const STATUS_COLOR: Record<Project['status'], string> = {
  drafting: '#f59e0b',
  conceiving: '#8b5cf6',
  editing: '#3b82f6',
  done: '#10b981',
};

function formatWordCount(n: number): string {
  if (n >= 10_000) return `${(n / 10_000).toFixed(1)} 万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)} k`;
  return String(n);
}

function BookCard({ project, onEnter }: { project: Project; onEnter: (p: Project) => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={() => onEnter(project)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={`进入《${project.title}》`}
      style={{
        position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        padding: '24px', minHeight: 260, borderRadius: 16, border: 'none', cursor: 'pointer',
        textAlign: 'left', color: '#fff',
        background: `linear-gradient(135deg, ${project.gradient[0]}, ${project.gradient[1]})`,
        boxShadow: hovered ? '0 12px 32px rgba(0,0,0,0.5)' : '0 4px 16px rgba(0,0,0,0.3)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease', overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <h3 style={{ margin: 0, fontSize: 22, fontWeight: 700, lineHeight: 1.3, textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>{project.title}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' }}>{project.genre}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: `${STATUS_COLOR[project.status]}22`, color: STATUS_COLOR[project.status], border: `1px solid ${STATUS_COLOR[project.status]}44` }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLOR[project.status], display: 'inline-block' }} />
            {STATUS_LABEL[project.status]}
          </span>
          <span style={{ fontSize: 12, opacity: 0.75, whiteSpace: 'nowrap' }}>{formatWordCount(project.wordCount)} 字</span>
        </div>
      </div>
    </button>
  );
}

function EmptyState({ onCreate }: { onCreate?: () => void }) {
  return (
    <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', color: '#888', textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 16, color: '#555' }}>📖</div>
      <p style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>还没有作品</p>
      <p style={{ margin: '6px 0 20px', fontSize: 14, opacity: 0.6 }}>点击右上角开始创作你的第一个故事</p>
      {onCreate && (
        <button onClick={onCreate} style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid #444', background: 'transparent', color: '#ccc', fontSize: 14, cursor: 'pointer' }}>+ 新建作品</button>
      )}
    </div>
  );
}

export default function Bookshelf({ projects, onEnterProject, onCreateProject }: BookshelfProps) {
  const isEmpty = !projects || projects.length === 0;
  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px 64px', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Noto Sans SC", sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#f0f0f0', letterSpacing: '0.01em' }}>作品书架</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#888' }}>{isEmpty ? '' : `共 ${projects.length} 部作品`}</p>
        </div>
        {onCreateProject && (
          <button onClick={onCreateProject} aria-label="新建作品" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(99,102,241,0.35)', transition: 'box-shadow 0.2s, transform 0.15s' }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>+</span>
            新建作品
          </button>
        )}
      </div>
      {isEmpty ? (
        <EmptyState onCreate={onCreateProject} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {projects.map((project) => (
            <BookCard key={project.id} project={project} onEnter={onEnterProject} />
          ))}
        </div>
      )}
    </div>
  );
}
