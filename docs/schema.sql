-- 织梦机 Schema — matches src-tauri/src/db.rs
-- Tauri v2 + rusqlite, WAL mode + foreign keys enabled.
-- Timestamps are epoch-milliseconds (i64), stored as INTEGER.

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  genre TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'conceiving',
  word_count INTEGER NOT NULL DEFAULT 0,
  gradient TEXT NOT NULL DEFAULT '["#6366f1","#8b5cf6"]',
  created_at INTEGER NOT NULL DEFAULT (cast(strftime('%s','now') as integer) * 1000),
  updated_at INTEGER NOT NULL DEFAULT (cast(strftime('%s','now') as integer) * 1000)
);

CREATE TABLE IF NOT EXISTS world_objects (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'uncategorized',
  status TEXT NOT NULL DEFAULT 'draft',
  canon_level TEXT NOT NULL DEFAULT 'uncollected',
  tags TEXT NOT NULL DEFAULT '[]',
  aliases TEXT NOT NULL DEFAULT '[]',
  selected_boards TEXT NOT NULL DEFAULT '[]',
  content TEXT NOT NULL DEFAULT '',
  references_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (cast(strftime('%s','now') as integer) * 1000),
  updated_at INTEGER NOT NULL DEFAULT (cast(strftime('%s','now') as integer) * 1000),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS connections (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'related',
  label TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (source_id) REFERENCES world_objects(id) ON DELETE CASCADE,
  FOREIGN KEY (target_id) REFERENCES world_objects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS canvas_tab_states (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  tab_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  positions TEXT NOT NULL DEFAULT '[]',
  sticky_notes TEXT NOT NULL DEFAULT '[]',
  connections TEXT NOT NULL DEFAULT '[]',
  scale REAL NOT NULL DEFAULT 1.0,
  pan_x REAL NOT NULL DEFAULT 0.0,
  pan_y REAL NOT NULL DEFAULT 0.0,
  created_at INTEGER NOT NULL DEFAULT (cast(strftime('%s','now') as integer) * 1000),
  updated_at INTEGER NOT NULL DEFAULT (cast(strftime('%s','now') as integer) * 1000),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS judgment_records (
  id TEXT PRIMARY KEY,
  object_id TEXT NOT NULL,
  object_name TEXT NOT NULL DEFAULT '',
  operation_type TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  timestamp INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  previous_status TEXT NOT NULL DEFAULT '',
  new_status TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (object_id) REFERENCES world_objects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wo_project ON world_objects(project_id);
CREATE INDEX IF NOT EXISTS idx_conn_project ON connections(project_id);
CREATE INDEX IF NOT EXISTS idx_conn_source ON connections(source_id);
CREATE INDEX IF NOT EXISTS idx_conn_target ON connections(target_id);
CREATE INDEX IF NOT EXISTS idx_cts_project ON canvas_tab_states(project_id);
CREATE INDEX IF NOT EXISTS idx_cts_tab ON canvas_tab_states(tab_id);
CREATE INDEX IF NOT EXISTS idx_jr_object ON judgment_records(object_id);
