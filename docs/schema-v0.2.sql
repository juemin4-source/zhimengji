-- v0.2 Migration: actual schema from src-tauri/src/db.rs
-- Run after v0.1 schema to add v0.2 migration flags to the current schema.

ALTER TABLE projects ADD COLUMN genre TEXT NOT NULL DEFAULT '';
ALTER TABLE projects ADD COLUMN status TEXT NOT NULL DEFAULT 'conceiving';
ALTER TABLE projects ADD COLUMN word_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN gradient TEXT NOT NULL DEFAULT '["#6366f1","#8b5cf6"]';
ALTER TABLE projects ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;
