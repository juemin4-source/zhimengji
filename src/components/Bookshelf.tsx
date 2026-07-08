import { useState, useMemo, useRef, useEffect } from 'react';
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

const STATUS_DOT_COLOR: Record<Project['status'], string> = {
  drafting: '#FF9800',
  conceiving: '#666',
  editing: '#CE93D8',
  done: '#4CAF50',
};

const GENRE_GRADIENT_BG: Record<string, string> = {
  '科幻':
    'linear-gradient(145deg, #1a1a3e, #0d0d2b, #16213e, #0f3460, #1a1a3e)',
  '奇幻':
    'linear-gradient(145deg, #1a2e1a, #0f1f0f, #1e3a1e, #2a4a1a, #1a2e1a)',
  '武侠':
    'linear-gradient(145deg, #2e1a1a, #1f0f0f, #3e1e1a, #4a2a1a, #2e1a1a)',
};

const DEFAULT_GRADIENT_BG =
  'linear-gradient(145deg, #1a1a2e, #0d0d1a, #1e1e2e, #16213e, #1a1a2e)';

const GENRE_GLOW_BG: Record<string, string> = {
  '科幻': [
    'radial-gradient(ellipse 80% 50% at 20% 30%, rgba(144,202,249,0.12) 0%, transparent 70%)',
    'radial-gradient(ellipse 50% 60% at 80% 70%, rgba(206,147,216,0.10) 0%, transparent 60%)',
    'radial-gradient(ellipse 60% 40% at 50% 10%, rgba(183,255,0,0.04) 0%, transparent 60%)',
  ].join(', '),
  '奇幻': [
    'radial-gradient(ellipse 70% 50% at 70% 20%, rgba(183,255,0,0.10) 0%, transparent 60%)',
    'radial-gradient(ellipse 50% 60% at 30% 70%, rgba(255,183,77,0.08) 0%, transparent 50%)',
    'radial-gradient(ellipse 40% 50% at 50% 50%, rgba(144,202,249,0.06) 0%, transparent 50%)',
  ].join(', '),
  '武侠': [
    'radial-gradient(ellipse 70% 50% at 30% 25%, rgba(255,183,77,0.12) 0%, transparent 60%)',
    'radial-gradient(ellipse 50% 60% at 70% 70%, rgba(244,67,54,0.06) 0%, transparent 50%)',
    'radial-gradient(ellipse 40% 50% at 50% 50%, rgba(255,152,0,0.05) 0%, transparent 50%)',
  ].join(', '),
};

const DEFAULT_GLOW_BG = [
  'radial-gradient(ellipse 80% 50% at 20% 30%, rgba(144,202,249,0.08) 0%, transparent 70%)',
  'radial-gradient(ellipse 50% 60% at 80% 70%, rgba(206,147,216,0.06) 0%, transparent 60%)',
].join(', ');

const FILTER_GENRES = ['科幻', '奇幻', '武侠', '都市', '历史', '悬疑'];

const CANON_DOT_COLORS = ['#FFB74D', '#90CAF9', '#CE93D8', '#666'];

function formatWordCount(n: number): string {
  return n.toLocaleString('zh-CN');
}

function formatTotalWords(n: number): string {
  if (n >= 10000) {
    const wan = n / 10000;
    return Number.isInteger(wan) ? `${wan}万` : `${wan.toFixed(1)}万`;
  }
  return String(n);
}

function getCanonDotCount(wordCount: number): number {
  if (wordCount > 15000) return 5;
  if (wordCount > 8000) return 4;
  if (wordCount > 3000) return 3;
  return 2;
}

// ─── BookCard ───────────────────────────────────────────────────────────────

function BookCard({
  project,
  onEnter,
  menuOpenId,
  onToggleMenu,
}: {
  project: Project;
  onEnter: (p: Project) => void;
  menuOpenId: string | null;
  onToggleMenu: (id: string | null) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const isMenuOpen = menuOpenId === project.id;
  const dotCount = getCanonDotCount(project.wordCount);

  const genreGradient = GENRE_GRADIENT_BG[project.genre] || DEFAULT_GRADIENT_BG;
  const genreGlow = GENRE_GLOW_BG[project.genre] || DEFAULT_GLOW_BG;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`进入《${project.title}》`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onEnter(project)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEnter(project);
        }
      }}
      style={{
        position: 'relative',
        borderRadius: 14,
        overflow: 'hidden',
        cursor: 'pointer',
        background: '#141414',
        border: '1px solid #2a2a2a',
        aspectRatio: '3 / 4',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: isHovered
          ? '0 8px 32px rgba(0,0,0,0.5)'
          : '0 2px 12px rgba(0,0,0,0.3)',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        outline: 'none',
      }}
    >
      {/* Gradient background layer */}
      <div
        className="bs-card-gradient"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          background: genreGradient,
          backgroundSize: '200% 200%',
          backgroundPosition: '0% 50%',
        }}
      />

      {/* Glow / particle overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          background: genreGlow,
        }}
      />

      {/* Cover edit button (pencil, shown on hover) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        aria-label="换封面色"
        title="换封面色"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: isHovered
            ? 'translate(-50%, -50%) scale(1)'
            : 'translate(-50%, -50%) scale(0.85)',
          zIndex: 5,
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: '2px solid #B7FF00',
          background: 'rgba(0,0,0,0.45)',
          color: '#B7FF00',
          fontSize: '1.2rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isHovered ? 1 : 0,
          pointerEvents: isHovered ? 'auto' : 'none',
          backdropFilter: 'blur(4px)',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
          padding: 0,
          lineHeight: 1,
        }}
      >
        &#x270F;
      </button>

      {/* Menu toggle button (triple-dot, shown on hover) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onToggleMenu(isMenuOpen ? null : project.id);
        }}
        aria-label="更多操作"
        style={{
          position: 'absolute',
          top: '0.75rem',
          right: '0.75rem',
          zIndex: 4,
          width: 28,
          height: 28,
          borderRadius: 6,
          border: 'none',
          background: isMenuOpen
            ? 'rgba(0,0,0,0.55)'
            : 'rgba(0,0,0,0.35)',
          color: isMenuOpen ? '#B7FF00' : 'rgba(255,255,255,0.6)',
          fontSize: '1.15rem',
          lineHeight: 1,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isHovered || isMenuOpen ? 1 : 0,
          backdropFilter: 'blur(4px)',
          transition: 'opacity 0.15s ease, background 0.15s ease, color 0.15s ease',
          padding: 0,
        }}
      >
        &#x22EE;
      </button>

      {/* Dropdown menu */}
      <div
        style={{
          position: 'absolute',
          top: '2.75rem',
          right: '0.75rem',
          zIndex: 20,
          background: '#1e1e1e',
          border: '1px solid #2a2a2a',
          borderRadius: 10,
          padding: '0.35rem 0',
          minWidth: 140,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          opacity: isMenuOpen ? 1 : 0,
          pointerEvents: isMenuOpen ? 'auto' : 'none',
          transform: isMenuOpen
            ? 'translateY(0) scale(1)'
            : 'translateY(-6px) scale(0.95)',
          transition: 'opacity 0.15s ease, transform 0.15s ease',
          transformOrigin: 'top right',
        }}
      >
        <MenuButton onClick={() => onToggleMenu(null)}>
          &#x270E; 编辑作品名
        </MenuButton>
        <MenuButton onClick={() => onToggleMenu(null)}>
          &#x2702; 更改体裁
        </MenuButton>
        <MenuButton onClick={() => onToggleMenu(null)} danger>
          &#x2716; 删除作品
        </MenuButton>
        <MenuButton onClick={() => onToggleMenu(null)}>
          &#x2913; 导出
        </MenuButton>
      </div>

      {/* Canon dots (top-right horizontal strip) */}
      <div
        style={{
          position: 'absolute',
          top: '1rem',
          right: '3rem',
          display: 'flex',
          gap: 5,
          zIndex: 3,
        }}
      >
        {Array.from({ length: dotCount }, (_, i) => {
          const titles = [
            '正典核心',
            '正典项目',
            '正典草稿',
            '未分类',
          ];
          return (
            <span
              key={i}
              title={titles[i % titles.length]}
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: CANON_DOT_COLORS[i % CANON_DOT_COLORS.length],
                border: '2px solid rgba(255,255,255,0.25)',
                display: 'inline-block',
              }}
            />
          );
        })}
      </div>

      {/* Card content overlay (gradient fade + info) */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          padding: '1.5rem 1.25rem 1.25rem',
          background:
            'linear-gradient(transparent 20%, rgba(0,0,0,0.7) 60%, rgba(0,0,0,0.88) 100%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
          minHeight: '55%',
          justifyContent: 'flex-end',
        }}
      >
        <div
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#fff',
            letterSpacing: '0.04em',
            textShadow: '0 1px 6px rgba(0,0,0,0.4)',
            lineHeight: 1.3,
          }}
        >
          {project.title}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap',
            marginTop: '0.15rem',
          }}
        >
          <span
            style={{
              fontSize: '0.7rem',
              padding: '0.15rem 0.55rem',
              borderRadius: 20,
              background: 'rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(4px)',
              fontWeight: 500,
              letterSpacing: '0.03em',
              border: '1px solid rgba(255,255,255,0.08)',
              lineHeight: '1.4',
            }}
          >
            {project.genre}
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.75rem',
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                display: 'inline-block',
                background: STATUS_DOT_COLOR[project.status],
                boxShadow: `0 0 4px ${STATUS_DOT_COLOR[project.status]}`,
              }}
            />
            {STATUS_LABEL[project.status]}
          </span>
        </div>
        <div
          style={{
            fontSize: '0.8125rem',
            color: 'rgba(255,255,255,0.55)',
            fontWeight: 400,
          }}
        >
          <strong style={{ color: '#fff', fontWeight: 600 }}>
            {formatWordCount(project.wordCount)}
          </strong>{' '}
          字
        </div>
      </div>
    </div>
  );
}

// ─── MenuButton (reusable menu item) ─────────────────────────────────────────

function MenuButton({
  children,
  onClick,
  danger = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  const [itemHovered, setItemHovered] = useState(false);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onMouseEnter={() => setItemHovered(true)}
      onMouseLeave={() => setItemHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.45rem 1rem',
        fontSize: '0.8125rem',
        color: danger ? '#f44336' : itemHovered ? '#e0e0e0' : '#a0a0a0',
        cursor: 'pointer',
        border: 'none',
        background: danger && itemHovered
          ? 'rgba(244,67,54,0.1)'
          : itemHovered
            ? 'rgba(255,255,255,0.05)'
            : 'none',
        width: '100%',
        textAlign: 'left',
        fontFamily: 'inherit',
        transition: 'background 0.15s ease, color 0.15s ease',
      }}
    >
      {children}
    </button>
  );
}

// ─── EmptyState ──────────────────────────────────────────────────────────────

function EmptyState({
  onCreate,
  isNoResults = false,
}: {
  onCreate?: () => void;
  isNoResults?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '4rem 2rem',
        gap: '1.25rem',
      }}
    >
      <div
        style={{
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: '#1e1e1e',
          border: '2px dashed #2a2a2a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2.5rem',
          color: '#666',
          marginBottom: '0.5rem',
        }}
      >
        &#x1F4D6;
      </div>
      <div
        style={{
          fontSize: '1.2rem',
          fontWeight: 600,
          color: '#a0a0a0',
        }}
      >
        {isNoResults ? '没有匹配结果' : '还没有作品'}
      </div>
      <div
        style={{
          fontSize: '0.875rem',
          color: '#666',
          maxWidth: 320,
        }}
      >
        {isNoResults
          ? '试试其他关键词或筛选条件。'
          : '创建你的第一个作品，开始编织属于你的世界。'}
      </div>
      {!isNoResults && (
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginTop: '0.5rem',
          }}
        >
          {onCreate && (
            <button
              onClick={onCreate}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 1.25rem',
                borderRadius: 6,
                fontSize: '0.8125rem',
                fontWeight: 500,
                cursor: 'pointer',
                border: 'none',
                background: '#B7FF00',
                color: '#0a0a0a',
                fontFamily: 'inherit',
              }}
            >
              + 创建第一个作品
            </button>
          )}
          <button
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1.25rem',
              borderRadius: 6,
              fontSize: '0.8125rem',
              fontWeight: 500,
              cursor: 'pointer',
              background: 'transparent',
              color: '#a0a0a0',
              border: '1px solid #2a2a2a',
              fontFamily: 'inherit',
            }}
          >
            从模板开始
          </button>
          <button
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              fontSize: '0.8125rem',
              fontFamily: 'inherit',
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            查看教程 &rarr;
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Bookshelf (main component) ──────────────────────────────────────────────

export default function Bookshelf({
  projects,
  onEnterProject,
  onCreateProject,
}: BookshelfProps) {
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState('updated');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [createBtnHovered, setCreateBtnHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!openMenuId) return;
      const target = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [openMenuId]);

  // Collect unique genres from projects plus the standard filter list
  const genreOptions = useMemo(() => {
    const projectGenres = new Set(projects.map((p) => p.genre));
    const combined = [...FILTER_GENRES];
    for (const g of projectGenres) {
      if (!combined.includes(g)) combined.push(g);
    }
    return combined;
  }, [projects]);

  // Filter and sort
  const visibleProjects = useMemo(() => {
    let result = [...projects];

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((p) => p.title.toLowerCase().includes(q));
    }

    if (genreFilter !== 'all') {
      result = result.filter((p) => p.genre === genreFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter(
        (p) => p.status === statusFilter,
      );
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.title.localeCompare(b.title, 'zh-CN');
        case 'words':
          return b.wordCount - a.wordCount;
        default:
          return a.id < b.id ? 1 : -1;
      }
    });

    return result;
  }, [projects, search, genreFilter, statusFilter, sortBy]);

  // Stats
  const totalWords = useMemo(
    () => projects.reduce((sum, p) => sum + p.wordCount, 0),
    [projects],
  );

  const maxCanonObjects = useMemo(() => {
    if (projects.length === 0) return 0;
    return Math.max(...projects.map((p) => getCanonDotCount(p.wordCount)));
  }, [projects]);

  const isEmpty = projects.length === 0;
  const noResults = !isEmpty && visibleProjects.length === 0;

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        maxWidth: 1100,
        margin: '0 auto',
        minHeight: '80vh',
        fontFamily:
          '-apple-system, "PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif',
        fontSize: '0.9375rem',
        lineHeight: 1.6,
        color: '#e0e0e0',
      }}
    >
      {/* Inject keyframe animation and responsive rules */}
      <style>{`
        @keyframes gradientShift {
          0%   { background-position: 0% 50%; }
          25%  { background-position: 100% 50%; }
          50%  { background-position: 100% 100%; }
          75%  { background-position: 0% 100%; }
          100% { background-position: 0% 50%; }
        }
        [class*="bs-card-gradient"] {
          animation: none;
        }
        [class*="bs-card"]:hover [class*="bs-card-gradient"] {
          animation: gradientShift 5s ease-in-out infinite;
        }
        @media (max-width: 600px) {
          .bs-card-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (min-width: 601px) and (max-width: 900px) {
          .bs-card-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>

      {/* ═══════ Top Bar ═══════ */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 0 0.75rem',
          borderBottom: '1px solid #2a2a2a',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: '1.35rem',
              fontWeight: 700,
              letterSpacing: '0.02em',
              background: 'linear-gradient(135deg, #B7FF00, #d4ff5e)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            作品书架
          </h1>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          {onCreateProject && (
            <button
              onClick={(e) => {
                if (e.ctrlKey || e.metaKey) {
                  e.preventDefault();
                }
                onCreateProject();
              }}
              aria-label="新建作品"
              onMouseEnter={() => setCreateBtnHovered(true)}
              onMouseLeave={() => setCreateBtnHovered(false)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 1rem',
                borderRadius: 6,
                fontSize: '0.8125rem',
                fontWeight: 500,
                cursor: 'pointer',
                border: 'none',
                background: '#B7FF00',
                color: '#0a0a0a',
                fontFamily: 'inherit',
                position: 'relative',
                whiteSpace: 'nowrap',
                transition: 'background 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              <span>+</span> 新建作品
              <span
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: '50%',
                  transform: createBtnHovered
                    ? 'translateX(-50%) translateY(0)'
                    : 'translateX(-50%) translateY(-4px)',
                  background: '#1e1e1e',
                  color: '#a0a0a0',
                  padding: '0.35rem 0.7rem',
                  borderRadius: 6,
                  fontSize: '0.75rem',
                  whiteSpace: 'nowrap',
                  border: '1px solid #2a2a2a',
                  opacity: createBtnHovered ? 1 : 0,
                  pointerEvents: 'none',
                  transition: 'opacity 0.15s ease, transform 0.15s ease',
                  zIndex: 10,
                }}
              >
                Ctrl+click 快速创建
              </span>
            </button>
          )}
          <div
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                appearance: 'none',
                WebkitAppearance: 'none',
                background: '#0e0e0e',
                color: '#a0a0a0',
                padding: '0.45rem 1.75rem 0.45rem 0.75rem',
                border: '1px solid #2a2a2a',
                borderRadius: 6,
                fontSize: '0.8125rem',
                fontFamily: 'inherit',
                cursor: 'pointer',
                minWidth: '7rem',
                outline: 'none',
              }}
            >
              <option value="updated">最近更新</option>
              <option value="created">创建时间</option>
              <option value="name">作品名 A-Z</option>
              <option value="words">字数多→少</option>
            </select>
            <span
              style={{
                position: 'absolute',
                right: '0.6rem',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '0.55rem',
                color: '#666',
                pointerEvents: 'none',
              }}
            >
              &#x25BC;
            </span>
          </div>
        </div>
      </header>

      {/* ═══════ Filter Bar ═══════ */}
      {!isEmpty && <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          padding: '0.75rem 0',
          flexWrap: 'wrap',
          borderBottom: '1px solid #222',
        }}
      >
        <div
          style={{
            position: 'relative',
            flex: 1,
            minWidth: 180,
            maxWidth: 320,
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#666',
              fontSize: '0.85rem',
              pointerEvents: 'none',
            }}
          >
            &#x1F50D;
          </span>
          <input
            type="text"
            placeholder="搜索作品..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
            style={{
              width: '100%',
              background: '#0e0e0e',
              color: '#e0e0e0',
              border: '1px solid #2a2a2a',
              borderRadius: 6,
              padding: '0.5rem 0.75rem 0.5rem 2.1rem',
              fontSize: '0.8125rem',
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
        </div>

        {/* Genre filter */}
        <div
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          <select
            value={genreFilter}
            onChange={(e) => setGenreFilter(e.target.value)}
            style={{
              appearance: 'none',
              WebkitAppearance: 'none',
              background: '#0e0e0e',
              color: '#a0a0a0',
              padding: '0.45rem 1.75rem 0.45rem 0.75rem',
              border: '1px solid #2a2a2a',
              borderRadius: 6,
              fontSize: '0.8125rem',
              fontFamily: 'inherit',
              cursor: 'pointer',
              minWidth: '8.5rem',
              outline: 'none',
            }}
          >
            <option value="all">全部体裁</option>
            {genreOptions.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <span
            style={{
              position: 'absolute',
              right: '0.6rem',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '0.55rem',
              color: '#666',
              pointerEvents: 'none',
            }}
          >
            &#x25BC;
          </span>
        </div>

        {/* Status filter */}
        <div
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              appearance: 'none',
              WebkitAppearance: 'none',
              background: '#0e0e0e',
              color: '#a0a0a0',
              padding: '0.45rem 1.75rem 0.45rem 0.75rem',
              border: '1px solid #2a2a2a',
              borderRadius: 6,
              fontSize: '0.8125rem',
              fontFamily: 'inherit',
              cursor: 'pointer',
              minWidth: '8.5rem',
              outline: 'none',
            }}
          >
            <option value="all">全部状态</option>
            {(Object.entries(STATUS_LABEL) as [Project['status'], string][]).map(
              ([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ),
            )}
          </select>
          <span
            style={{
              position: 'absolute',
              right: '0.6rem',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '0.55rem',
              color: '#666',
              pointerEvents: 'none',
            }}
          >
            &#x25BC;
          </span>
        </div>
      </div>

      </div>}{/* end filter bar */}

      {/* ═══════ Stats Bar ═══════ */}
      {!isEmpty && <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          padding: '0.6rem 0',
          fontSize: '0.8125rem',
          color: '#666',
          borderBottom: '1px solid #222',
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
          }}
        >
          {'共 '}{visibleProjects.length}{' 部作品'}
        </span>
        <span>|</span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
          }}
        >
          总字数{' '}
          <span
            style={{
              color: '#a0a0a0',
              fontWeight: 500,
            }}
          >
            {formatTotalWords(totalWords)}
          </span>
        </span>
        <span>|</span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
          }}
        >
          最高正典对象{' '}
          <span
            style={{
              color: '#B7FF00',
              fontWeight: 500,
            }}
          >
            {maxCanonObjects}
          </span>
          {' 个'}
        </span>
      </div>

      {/* ═══════ Card Grid / Empty State ═══════ */}
      {isEmpty ? (
        <EmptyState onCreate={onCreateProject} />
      ) : noResults ? (
        <div
          className="bs-card-grid"
          style={{ padding: '1.5rem 0' }}
        >
          <EmptyState isNoResults={true} />
        </div>
      ) : (
        <div
          className="bs-card-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.25rem',
            padding: '1.5rem 0',
          }}
        >
          {visibleProjects.map((project) => (
            <BookCard
              key={project.id}
              project={project}
              onEnter={onEnterProject}
              menuOpenId={openMenuId}
              onToggleMenu={setOpenMenuId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
