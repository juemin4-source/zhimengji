use rusqlite::{params, Connection, Result as SqlResult};
use std::sync::Mutex;

use crate::models::{
    CanvasTabState, CanvasTabStateRow, JudgmentRecord, Project, WorldObject, WorldObjectRow,
};
use crate::models::Connection as ObjConnection;

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn new(db_path: &str) -> SqlResult<Self> {
        let conn = Connection::open(db_path)?;
        conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;")?;
        let db = Database {
            conn: Mutex::new(conn),
        };
        db.init_schema()?;
        Ok(db)
    }

    fn init_schema(&self) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS projects (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              genre TEXT NOT NULL DEFAULT '',
              status TEXT NOT NULL DEFAULT 'conceiving',
              word_count INTEGER NOT NULL DEFAULT 0,
              gradient TEXT NOT NULL DEFAULT '[\"#6366f1\",\"#8b5cf6\"]',
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
              type TEXT NOT NULL DEFAULT '相关',
              label TEXT NOT NULL DEFAULT '',
              FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
              FOREIGN KEY (source_id) REFERENCES world_objects(id) ON DELETE CASCADE,
              FOREIGN KEY (target_id) REFERENCES world_objects(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS canvas_tab_states (
              id TEXT PRIMARY KEY,
              project_id TEXT NOT NULL,
              tab_id TEXT NOT NULL,
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
            ",
        )?;
        Ok(())
    }

    // ──────────────────────────────────────────
    //  Project CRUD
    // ──────────────────────────────────────────

    pub fn list_projects(&self) -> SqlResult<Vec<Project>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, genre, status, word_count, gradient, created_at, updated_at
             FROM projects ORDER BY updated_at DESC",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                genre: row.get(2)?,
                status: row.get(3)?,
                word_count: row.get(4)?,
                gradient: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })?;
        let mut projects = Vec::new();
        for r in rows {
            projects.push(r?);
        }
        Ok(projects)
    }

    pub fn get_project(&self, id: &str) -> SqlResult<Option<Project>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, genre, status, word_count, gradient, created_at, updated_at
             FROM projects WHERE id = ?",
        )?;
        let mut rows = stmt.query_map(params![id], |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                genre: row.get(2)?,
                status: row.get(3)?,
                word_count: row.get(4)?,
                gradient: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })?;
        match rows.next() {
            Some(r) => Ok(Some(r?)),
            None => Ok(None),
        }
    }

    pub fn create_project(
        &self,
        name: &str,
        genre: &str,
        status: &str,
        word_count: i64,
        gradient: &str,
    ) -> SqlResult<Project> {
        let conn = self.conn.lock().unwrap();
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp_millis();
        conn.execute(
            "INSERT INTO projects (id, name, genre, status, word_count, gradient, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![id, name, genre, status, word_count, gradient, now, now],
        )?;
        Ok(Project {
            id,
            name: name.to_string(),
            genre: genre.to_string(),
            status: status.to_string(),
            word_count,
            gradient: gradient.to_string(),
            created_at: now,
            updated_at: now,
        })
    }

    pub fn update_project(&self, project: &Project) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp_millis();
        conn.execute(
            "UPDATE projects SET name=?1, genre=?2, status=?3, word_count=?4, gradient=?5, updated_at=?6 WHERE id=?7",
            params![project.name, project.genre, project.status, project.word_count, project.gradient, now, project.id],
        )?;
        Ok(())
    }

    pub fn delete_project(&self, id: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM projects WHERE id = ?", params![id])?;
        Ok(())
    }

    // ──────────────────────────────────────────
    //  WorldObject CRUD
    // ──────────────────────────────────────────

    pub fn list_world_objects(&self, project_id: &str) -> SqlResult<Vec<WorldObject>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, project_id, name, type, status, canon_level,
                    tags, aliases, selected_boards, content, references_count,
                    created_at, updated_at
             FROM world_objects WHERE project_id = ? ORDER BY created_at",
        )?;
        let rows = stmt.query_map(params![project_id], |row| {
            Ok(WorldObjectRow {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                object_type: row.get(3)?,
                status: row.get(4)?,
                canon_level: row.get(5)?,
                tags: row.get(6)?,
                aliases: row.get(7)?,
                selected_boards: row.get(8)?,
                content: row.get(9)?,
                references_count: row.get(10)?,
                created_at: row.get(11)?,
                updated_at: row.get(12)?,
            })
        })?;
        let mut objects = Vec::new();
        for r in rows {
            let row = r?;
            let judgments = self.get_judgment_records_for_object(&row.id)?;
            objects.push(row.to_api(judgments));
        }
        Ok(objects)
    }

    pub fn get_world_object(&self, id: &str) -> SqlResult<Option<WorldObject>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, project_id, name, type, status, canon_level,
                    tags, aliases, selected_boards, content, references_count,
                    created_at, updated_at
             FROM world_objects WHERE id = ?",
        )?;
        let mut rows = stmt.query_map(params![id], |row| {
            Ok(WorldObjectRow {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                object_type: row.get(3)?,
                status: row.get(4)?,
                canon_level: row.get(5)?,
                tags: row.get(6)?,
                aliases: row.get(7)?,
                selected_boards: row.get(8)?,
                content: row.get(9)?,
                references_count: row.get(10)?,
                created_at: row.get(11)?,
                updated_at: row.get(12)?,
            })
        })?;
        match rows.next() {
            Some(r) => {
                let row = r?;
                let judgments = self.get_judgment_records_for_object(&row.id)?;
                Ok(Some(row.to_api(judgments)))
            }
            None => Ok(None),
        }
    }

    pub fn create_world_object(&self, object: &WorldObject) -> SqlResult<WorldObject> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp_millis();
        let tags_json = serde_json::to_string(&object.tags).unwrap_or_else(|_| "[]".to_string());
        let aliases_json = serde_json::to_string(&object.aliases).unwrap_or_else(|_| "[]".to_string());
        let boards_json = serde_json::to_string(&object.selected_boards).unwrap_or_else(|_| "[]".to_string());

        conn.execute(
            "INSERT INTO world_objects (id, project_id, name, type, status, canon_level,
             tags, aliases, selected_boards, content, references_count, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                object.id, object.project_id, object.name, object.object_type,
                object.status, object.canon_level, tags_json, aliases_json, boards_json,
                object.content, object.references_count, now, now,
            ],
        )?;

        // Insert judgment records
        for jr in &object.judgment_history {
            let jr_id = if jr.id.is_empty() {
                uuid::Uuid::new_v4().to_string()
            } else {
                jr.id.clone()
            };
            conn.execute(
                "INSERT OR IGNORE INTO judgment_records (id, object_id, object_name, operation_type, reason, timestamp, previous_status, new_status)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![jr_id, object.id, jr.object_name, jr.operation_type, jr.reason, jr.timestamp, jr.previous_status, jr.new_status],
            )?;
        }

        Ok(WorldObject {
            id: object.id.clone(),
            project_id: object.project_id.clone(),
            name: object.name.clone(),
            object_type: object.object_type.clone(),
            status: object.status.clone(),
            canon_level: object.canon_level.clone(),
            tags: object.tags.clone(),
            aliases: object.aliases.clone(),
            selected_boards: object.selected_boards.clone(),
            content: object.content.clone(),
            references_count: object.references_count,
            judgment_history: object.judgment_history.clone(),
            created_at: now,
            updated_at: now,
        })
    }

    pub fn update_world_object(&self, object: &WorldObject) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp_millis();
        let tags_json = serde_json::to_string(&object.tags).unwrap_or_else(|_| "[]".to_string());
        let aliases_json = serde_json::to_string(&object.aliases).unwrap_or_else(|_| "[]".to_string());
        let boards_json = serde_json::to_string(&object.selected_boards).unwrap_or_else(|_| "[]".to_string());
        conn.execute(
            "UPDATE world_objects SET name=?1, type=?2, status=?3, canon_level=?4,
             tags=?5, aliases=?6, selected_boards=?7, content=?8, references_count=?9,
             updated_at=?10 WHERE id=?11",
            params![
                object.name, object.object_type, object.status, object.canon_level,
                tags_json, aliases_json, boards_json, object.content, object.references_count,
                now, object.id,
            ],
        )?;
        Ok(())
    }

    pub fn delete_world_object(&self, id: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM world_objects WHERE id = ?", params![id])?;
        Ok(())
    }

    // ──────────────────────────────────────────
    //  JudgmentRecord
    // ──────────────────────────────────────────

    pub fn get_judgment_records_for_object(&self, object_id: &str) -> SqlResult<Vec<JudgmentRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, object_id, object_name, operation_type, reason, timestamp, previous_status, new_status
             FROM judgment_records WHERE object_id = ? ORDER BY timestamp DESC",
        )?;
        let rows = stmt.query_map(params![object_id], |row| {
            Ok(JudgmentRecord {
                id: row.get(0)?,
                object_id: row.get(1)?,
                object_name: row.get(2)?,
                operation_type: row.get(3)?,
                reason: row.get(4)?,
                timestamp: row.get(5)?,
                previous_status: row.get(6)?,
                new_status: row.get(7)?,
            })
        })?;
        let mut records = Vec::new();
        for r in rows {
            records.push(r?);
        }
        Ok(records)
    }

    pub fn list_judgment_records(&self, project_id: &str) -> SqlResult<Vec<JudgmentRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT jr.id, jr.object_id, jr.object_name, jr.operation_type, jr.reason,
                    jr.timestamp, jr.previous_status, jr.new_status
             FROM judgment_records jr
             INNER JOIN world_objects wo ON wo.id = jr.object_id
             WHERE wo.project_id = ?
             ORDER BY jr.timestamp DESC",
        )?;
        let rows = stmt.query_map(params![project_id], |row| {
            Ok(JudgmentRecord {
                id: row.get(0)?,
                object_id: row.get(1)?,
                object_name: row.get(2)?,
                operation_type: row.get(3)?,
                reason: row.get(4)?,
                timestamp: row.get(5)?,
                previous_status: row.get(6)?,
                new_status: row.get(7)?,
            })
        })?;
        let mut records = Vec::new();
        for r in rows {
            records.push(r?);
        }
        Ok(records)
    }

    pub fn append_judgment_record(&self, record: &JudgmentRecord) -> SqlResult<JudgmentRecord> {
        let conn = self.conn.lock().unwrap();
        let id = if record.id.is_empty() {
            uuid::Uuid::new_v4().to_string()
        } else {
            record.id.clone()
        };
        conn.execute(
            "INSERT INTO judgment_records (id, object_id, object_name, operation_type, reason, timestamp, previous_status, new_status)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                id, record.object_id, record.object_name, record.operation_type,
                record.reason, record.timestamp, record.previous_status, record.new_status,
            ],
        )?;
        Ok(JudgmentRecord {
            id,
            object_id: record.object_id.clone(),
            object_name: record.object_name.clone(),
            operation_type: record.operation_type.clone(),
            reason: record.reason.clone(),
            timestamp: record.timestamp,
            previous_status: record.previous_status.clone(),
            new_status: record.new_status.clone(),
        })
    }

    // ──────────────────────────────────────────
    //  Connection CRUD
    // ──────────────────────────────────────────

    pub fn list_connections(&self, project_id: &str) -> SqlResult<Vec<ObjConnection>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, project_id, source_id, target_id, type, label
             FROM connections WHERE project_id = ?",
        )?;
        let rows = stmt.query_map(params![project_id], |row| {
            Ok(ObjConnection {
                id: row.get(0)?,
                project_id: row.get(1)?,
                source_id: row.get(2)?,
                target_id: row.get(3)?,
                connection_type: row.get(4)?,
                label: row.get(5)?,
            })
        })?;
        let mut connections = Vec::new();
        for r in rows {
            connections.push(r?);
        }
        Ok(connections)
    }

    pub fn create_connection(&self, conn_data: &ObjConnection) -> SqlResult<ObjConnection> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO connections (id, project_id, source_id, target_id, type, label)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                conn_data.id,
                conn_data.project_id,
                conn_data.source_id,
                conn_data.target_id,
                conn_data.connection_type,
                conn_data.label,
            ],
        )?;
        Ok(conn_data.clone())
    }

    pub fn delete_connection(&self, id: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM connections WHERE id = ?", params![id])?;
        Ok(())
    }

    // ──────────────────────────────────────────
    //  CanvasTabState CRUD
    // ──────────────────────────────────────────

    pub fn list_canvas_tab_states(&self, project_id: &str) -> SqlResult<Vec<CanvasTabState>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, project_id, tab_id, positions, sticky_notes, connections,
                    scale, pan_x, pan_y, created_at, updated_at
             FROM canvas_tab_states WHERE project_id = ?",
        )?;
        let rows = stmt.query_map(params![project_id], |row| {
            Ok(CanvasTabStateRow {
                id: row.get(0)?,
                project_id: row.get(1)?,
                tab_id: row.get(2)?,
                positions: row.get(3)?,
                sticky_notes: row.get(4)?,
                connections: row.get(5)?,
                scale: row.get(6)?,
                pan_x: row.get(7)?,
                pan_y: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })?;
        let mut states = Vec::new();
        for r in rows {
            states.push(r?.to_api());
        }
        Ok(states)
    }

    pub fn save_canvas_tab_state(&self, state: &CanvasTabState) -> SqlResult<CanvasTabState> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp_millis();
        let positions_json = serde_json::to_string(&state.positions).unwrap_or_else(|_| "[]".to_string());
        let notes_json = serde_json::to_string(&state.sticky_notes).unwrap_or_else(|_| "[]".to_string());
        let conns_json = serde_json::to_string(&state.connections).unwrap_or_else(|_| "[]".to_string());

        // Upsert: INSERT OR REPLACE
        conn.execute(
            "INSERT OR REPLACE INTO canvas_tab_states
             (id, project_id, tab_id, positions, sticky_notes, connections, scale, pan_x, pan_y, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9,
                     COALESCE((SELECT created_at FROM canvas_tab_states WHERE id=?1), ?10),
                     ?11)",
            params![
                state.id, state.project_id, state.tab_id,
                positions_json, notes_json, conns_json,
                state.scale, state.pan_x, state.pan_y,
                now, now,
            ],
        )?;
        Ok(CanvasTabState {
            id: state.id.clone(),
            project_id: state.project_id.clone(),
            tab_id: state.tab_id.clone(),
            positions: state.positions.clone(),
            sticky_notes: state.sticky_notes.clone(),
            connections: state.connections.clone(),
            scale: state.scale,
            pan_x: state.pan_x,
            pan_y: state.pan_y,
            created_at: state.created_at,
            updated_at: now,
        })
    }

    pub fn delete_canvas_tab_state(&self, id: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM canvas_tab_states WHERE id = ?", params![id])?;
        Ok(())
    }
}
