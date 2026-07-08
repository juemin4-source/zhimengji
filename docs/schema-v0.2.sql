-- v0.2 Tables
CREATE TABLE IF NOT EXISTS narrative_units (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'scene' CHECK(type IN ('chapter','scene','plot_point','transition')),
  parent_id TEXT DEFAULT NULL, "order" INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL DEFAULT '', content TEXT NOT NULL DEFAULT '',
  fate_node TEXT DEFAULT NULL, linked_cards TEXT NOT NULL DEFAULT '[]',
  metadata TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS narrative_relationships (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL,
  source_id TEXT NOT NULL, target_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'sequence' CHECK(type IN ('sequence')),
  metadata TEXT DEFAULT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (source_id) REFERENCES narrative_units(id) ON DELETE CASCADE,
  FOREIGN KEY (target_id) REFERENCES narrative_units(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS card_node_links (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL,
  card_id TEXT NOT NULL, unit_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (card_id) REFERENCES setting_cards(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id) REFERENCES narrative_units(id) ON DELETE CASCADE,
  UNIQUE(card_id, unit_id)
);

ALTER TABLE projects ADD COLUMN v0_2_migration_completed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN v0_2_migration_at TEXT DEFAULT NULL;
ALTER TABLE setting_cards ADD COLUMN linked_nodes TEXT NOT NULL DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_nu_project ON narrative_units(project_id);
CREATE INDEX IF NOT EXISTS idx_nu_parent ON narrative_units(parent_id);
CREATE INDEX IF NOT EXISTS idx_nu_order ON narrative_units("order");
CREATE INDEX IF NOT EXISTS idx_nr_project ON narrative_relationships(project_id);
CREATE INDEX IF NOT EXISTS idx_nr_source ON narrative_relationships(source_id);
CREATE INDEX IF NOT EXISTS idx_nr_target ON narrative_relationships(target_id);
CREATE INDEX IF NOT EXISTS idx_cnl_card ON card_node_links(card_id);
CREATE INDEX IF NOT EXISTS idx_cnl_unit ON card_node_links(unit_id);
