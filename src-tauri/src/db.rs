use rusqlite::{params, Connection, Result as SqlResult};
use std::sync::Mutex;

use crate::models::{
    CanvasStageState, CanvasTabState, CanvasTabStateRow, ImportResult, JudgmentRecord,
    PipelineState, Project, ProjectExportData, SaveCanvasTabStateResponse, WorldObject,
    WorldObjectRow,
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
            "
        )?;
        Ok(())
    }

    // -???????????????????????????????????????????????????????????????????????????????????
    //  Project CRUD
    // -???????????????????????????????????????????????????????????????????????????????????

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

    // -???????????????????????????????????????????????????????????????????????????????????
    //  WorldObject CRUD
    // -???????????????????????????????????????????????????????????????????????????????????

    pub fn list_world_objects(&self, project_id: &str) -> SqlResult<Vec<WorldObject>> {
        // Collect all rows first, then release the lock before fetching judgment records
        // to avoid Mutex deadlock (std::sync::Mutex is non-reentrant).
        let rows: Vec<WorldObjectRow> = {
            let conn = self.conn.lock().unwrap();
            let mut stmt = conn.prepare(
                "SELECT id, project_id, name, type, status, canon_level,
                        tags, aliases, selected_boards, content, references_count,
                        created_at, updated_at
                 FROM world_objects WHERE project_id = ? ORDER BY created_at",
            )?;
            let iter = stmt.query_map(params![project_id], |row| {
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
            let mut rows = Vec::new();
            for r in iter {
                rows.push(r?);
            }
            rows
        }; // MutexGuard dropped here

        let mut objects = Vec::new();
        for row in rows {
            let judgments = self.get_judgment_records_for_object(&row.id)?;
            objects.push(row.to_api(judgments));
        }
        Ok(objects)
    }

    pub fn get_world_object(&self, id: &str) -> SqlResult<Option<WorldObject>> {
        // Collect the row first, then release the lock before fetching judgment records
        // to avoid Mutex deadlock (std::sync::Mutex is non-reentrant).
        let row_opt: Option<WorldObjectRow> = {
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
                Some(r) => Some(r?),
                None => None,
            }
        }; // MutexGuard dropped here

        match row_opt {
            Some(row) => {
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

    // -???????????????????????????????????????????????????????????????????????????????????
    //  JudgmentRecord
    // -???????????????????????????????????????????????????????????????????????????????????

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

    // -???????????????????????????????????????????????????????????????????????????????????
    //  Connection CRUD
    // -???????????????????????????????????????????????????????????????????????????????????

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

    // -???????????????????????????????????????????????????????????????????????????????????
    //  CanvasTabState CRUD
    // -???????????????????????????????????????????????????????????????????????????????????

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

    pub fn save_canvas_tab_state(&self, state: &CanvasTabState, version: i64) -> Result<SaveCanvasTabStateResponse, String> {
        let conn = self.conn.lock().unwrap();

        // Check stored version for conflict detection
        let stored_version: i64 = conn
            .query_row(
                "SELECT version FROM canvas_tab_states WHERE id = ?1",
                params![state.id],
                |row| row.get(0),
            )
            .unwrap_or(0); // 0 means no existing record

        if stored_version > version {
            return Err(format!(
                "VERSION_CONFLICT: backend version {} > incoming version {}",
                stored_version, version
            ));
        }

        let new_version = version;
        let now = chrono::Utc::now().timestamp_millis();
        let positions_json = serde_json::to_string(&state.positions).unwrap_or_else(|_| "[]".to_string());
        let notes_json = serde_json::to_string(&state.sticky_notes).unwrap_or_else(|_| "[]".to_string());
        let conns_json = serde_json::to_string(&state.connections).unwrap_or_else(|_| "[]".to_string());

        // Upsert: INSERT OR REPLACE (includes version column)
        conn.execute(
            "INSERT OR REPLACE INTO canvas_tab_states
             (id, project_id, tab_id, positions, sticky_notes, connections, scale, pan_x, pan_y, version, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10,
                     COALESCE((SELECT created_at FROM canvas_tab_states WHERE id=?1), ?11),
                     ?12)",
            params![
                state.id, state.project_id, state.tab_id,
                positions_json, notes_json, conns_json,
                state.scale, state.pan_x, state.pan_y,
                new_version, now, now,
            ],
        ).map_err(|e| format!("DB_ERROR: {}", e))?;

        let result_state = CanvasTabState {
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
        };

        Ok(SaveCanvasTabStateResponse {
            state: result_state,
            accepted: true,
            current_version: new_version,
        })
    }


    // -?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-
    //  P0-05: Export / Import
    // -?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-

    /// Export all project data for zip packaging (P0-05)
    pub fn export_project_data(&self, project_id: &str) -> Result<ProjectExportData, String> {
        let project = self
            .get_project(project_id)
            .map_err(|e| format!("NOT_FOUND: {}", e))?
            .ok_or_else(|| format!("NOT_FOUND: project {} not found", project_id))?;

        let objects = self
            .list_world_objects(project_id)
            .map_err(|e| format!("IO_ERROR: {}", e))?;

        let connections = self
            .list_connections(project_id)
            .map_err(|e| format!("IO_ERROR: {}", e))?;

        let canvas_states = self
            .list_canvas_tab_states(project_id)
            .map_err(|e| format!("IO_ERROR: {}", e))?;

        Ok(ProjectExportData {
            project,
            objects,
            connections,
            canvas_states,
        })
    }

    /// Import project data from a parsed export (P0-05).
    pub fn import_project_data(&self, data: &ProjectExportData) -> Result<ImportResult, String> {
        let new_project_id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp_millis();
        {
            let conn = self.conn.lock().unwrap();
            conn.execute(
                "INSERT INTO projects (id, name, genre, status, word_count, gradient, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![
                    new_project_id,
                    data.project.name, data.project.genre,
                    data.project.status, data.project.word_count,
                    data.project.gradient, now, now,
                ],
            ).map_err(|e| format!("IO_ERROR: {}", e))?;
        }

        let mut object_count = 0usize;
        let mut connection_count = 0usize;

        // Map old IDs to new UUIDs for conflict-free import
        let mut id_map = std::collections::HashMap::new();
        for obj in &data.objects {
            let new_id = uuid::Uuid::new_v4().to_string();
            id_map.insert(obj.id.clone(), new_id);
        }
        for obj in &data.objects {
            let tags_json = serde_json::to_string(&obj.tags).unwrap_or_else(|_| "[]".to_string());
            let aliases_json = serde_json::to_string(&obj.aliases).unwrap_or_else(|_| "[]".to_string());
            let boards_json = serde_json::to_string(&obj.selected_boards).unwrap_or_else(|_| "[]".to_string());
            {
                let conn = self.conn.lock().unwrap();
                conn.execute(
                    "INSERT INTO world_objects
                     (id, project_id, name, type, status, canon_level,
                      tags, aliases, selected_boards, content, references_count, created_at, updated_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
                    params![
                        id_map[&obj.id], new_project_id, obj.name, obj.object_type,
                        obj.status, obj.canon_level, tags_json, aliases_json, boards_json,
                        obj.content, obj.references_count, obj.created_at, obj.updated_at,
                    ],
                ).map_err(|e| format!("IO_ERROR: {}", e))?;

                for jr in &obj.judgment_history {
                    conn.execute(
                        "INSERT INTO judgment_records (id, object_id, object_name, operation_type, reason, timestamp, previous_status, new_status)
                         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                        params![
                            jr.id, id_map[&obj.id], jr.object_name, jr.operation_type,
                            jr.reason, jr.timestamp, jr.previous_status, jr.new_status,
                        ],
                    ).map_err(|e| format!("IO_ERROR: {}", e))?;
                }
            }
            object_count += 1;
        }

        let mut conn_id_map = std::collections::HashMap::new();
        for conn_data in &data.connections {
            let new_conn_id = uuid::Uuid::new_v4().to_string();
            conn_id_map.insert(conn_data.id.clone(), new_conn_id);
        }

        for conn_data in &data.connections {
            {
                let conn = self.conn.lock().unwrap();
                conn.execute(
                    "INSERT INTO connections (id, project_id, source_id, target_id, type, label)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                    params![
                        conn_id_map[&conn_data.id], new_project_id,
                        id_map[&conn_data.source_id], id_map[&conn_data.target_id],
                        conn_data.connection_type, conn_data.label,
                    ],
                ).map_err(|e| format!("IO_ERROR: {}", e))?;
            }
            connection_count += 1;
        }

        for cs in &data.canvas_states {
            let positions_json = serde_json::to_string(&cs.positions).unwrap_or_else(|_| "[]".to_string());
            let notes_json = serde_json::to_string(&cs.sticky_notes).unwrap_or_else(|_| "[]".to_string());
            let conns_json = serde_json::to_string(&cs.connections).unwrap_or_else(|_| "[]".to_string());
            {
                let conn = self.conn.lock().unwrap();
                conn.execute(
                    "INSERT INTO canvas_tab_states
                     (id, project_id, tab_id, positions, sticky_notes, connections, scale, pan_x, pan_y, version, created_at, updated_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
                    params![
                        uuid::Uuid::new_v4().to_string(), new_project_id, cs.tab_id,
                        positions_json, notes_json, conns_json,
                        cs.scale, cs.pan_x, cs.pan_y,
                        1i64, cs.created_at, now,
                    ],
                ).map_err(|e| format!("IO_ERROR: {}", e))?;
            }
        }

        Ok(ImportResult {
            success: true,
            project_id: new_project_id,
            project_name: data.project.name.clone(),
            object_count,
            connection_count,
        })
    }

    /// Import a plain markdown directory (P0-05).
    pub fn import_markdown_directory(&self, dir_path: &str) -> Result<ImportResult, String> {
        let dir = std::path::Path::new(dir_path);
        if !dir.is_dir() {
            return Err(format!("NOT_FOUND: directory not found: {}", dir_path));
        }

        let mut md_entries: Vec<(String, String)> = Vec::new();
        let read_dir = std::fs::read_dir(dir).map_err(|e| format!("IO_ERROR: {}", e))?;

        for entry in read_dir {
            let entry = entry.map_err(|e| format!("IO_ERROR: {}", e))?;
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) == Some("md") {
                let file_stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("untitled").to_string();
                let content = std::fs::read_to_string(&path).map_err(|e| format!("IO_ERROR: {}", e))?;
                md_entries.push((file_stem, content));
            }
        }

        if md_entries.is_empty() {
            return Err("IO_ERROR: no .md files found in directory".to_string());
        }

        let project_id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp_millis();
        let dir_name = dir.file_name().and_then(|s| s.to_str()).unwrap_or("Imported Project");

        {
            let conn = self.conn.lock().unwrap();
            conn.execute(
                "INSERT INTO projects (id, name, genre, status, word_count, gradient, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![
                    project_id, dir_name, "未分类", "conceiving",
                    0i64, r##"["#6366f1","#8b5cf6"]"##, now, now,
                ],
            ).map_err(|e| format!("IO_ERROR: {}", e))?;
        }

        let mut name_to_id = std::collections::HashMap::new();
        let mut object_count = 0usize;

        for (name, content) in &md_entries {
            let obj_id = uuid::Uuid::new_v4().to_string();
            name_to_id.insert(name.clone(), obj_id.clone());
            {
                let conn = self.conn.lock().unwrap();
                conn.execute(
                    "INSERT INTO world_objects (id, project_id, name, type, status, canon_level,
                     tags, aliases, selected_boards, content, references_count, created_at, updated_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
                    params![
                        obj_id, project_id, name, "术语", "草稿", "草案正典",
                        "[]", "[]", "[]", content, 0i32, now, now,
                    ],
                ).map_err(|e| format!("IO_ERROR: {}", e))?;
            }
            object_count += 1;
        }

        let mut connection_count = 0usize;
        for (name, content) in &md_entries {
            let source_id = match name_to_id.get(name) {
                Some(id) => id.clone(),
                None => continue,
            };
            let targets = parse_wiki_links(content);
            for target_name in targets {
                if let Some(target_id) = name_to_id.get(&target_name) {
                    let conn_id = uuid::Uuid::new_v4().to_string();
                    {
                        let conn = self.conn.lock().unwrap();
                        let existing = conn.query_row::<i64, _, _>(
                            "SELECT COUNT(*) FROM connections WHERE project_id = ?1 AND source_id = ?2 AND target_id = ?3",
                            params![project_id, source_id, target_id],
                            |row| row.get(0),
                        ).unwrap_or(0);
                        if existing == 0 {
                            conn.execute(
                                "INSERT INTO connections (id, project_id, source_id, target_id, type, label)
                                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                                params![conn_id, project_id, source_id, target_id, "相关", ""],
                            ).map_err(|e| format!("IO_ERROR: {}", e))?;
                            connection_count += 1;
                        }
                    }
                }
            }
        }

        Ok(ImportResult {
            success: true,
            project_id,
            project_name: dir_name.to_string(),
            object_count,
            connection_count,
        })
    }

    pub fn delete_canvas_tab_state(&self, id: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM canvas_tab_states WHERE id = ?", params![id])?;
        Ok(())
    }
}


/// Parse [[WikiLink]] patterns from markdown content (P0-05).
/// Returns a list of referenced object names (without display text suffix).
fn parse_wiki_links(content: &str) -> Vec<String> {
    let mut links = Vec::new();
    let mut remaining = content;
    while let Some(start) = remaining.find("[[") {
        let after_open = &remaining[start + 2..];
        if let Some(end) = after_open.find("]]") {
            let link_text = &after_open[..end];
            let name = link_text.split('|').next().unwrap_or("").trim().to_string();
            if !name.is_empty() {
                links.push(name);
            }
            remaining = &after_open[end + 2..];
        } else {
            break;
        }
    }
    links
}
#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::StickyNote;

    fn setup_db() -> Database {
        let conn = Connection::open(":memory:").unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        let db = Database {
            conn: Mutex::new(conn),
        };
        db.init_schema().unwrap();
        db
    }

    fn make_judgment(object_id: &str, op: &str, prev: &str, new: &str) -> JudgmentRecord {
        JudgmentRecord {
            id: uuid::Uuid::new_v4().to_string(),
            object_id: object_id.to_string(),
            object_name: "test".to_string(),
            operation_type: op.to_string(),
            reason: format!("test: {}", op),
            timestamp: chrono::Utc::now().timestamp_millis(),
            previous_status: prev.to_string(),
            new_status: new.to_string(),
        }
    }

    // -???????????????????????????????????????????????????????????????????????????????????
    //  Project CRUD
    // -???????????????????????????????????????????????????????????????????????????????????

    #[test]
    fn test_project_crud() {
        let db = setup_db();

        // Initially empty
        assert!(db.list_projects().unwrap().is_empty());

        // Create
        let p1 = db.create_project("Project Alpha", "fiction", "conceiving", 5000, r##"["#123","#456"]"##).unwrap();
        assert_eq!(p1.name, "Project Alpha");
        assert!(!p1.id.is_empty());

        let p2 = db.create_project("Project Beta", "non-fiction", "drafting", 12000, r##"["#abc","#def"]"##).unwrap();
        assert_eq!(p2.name, "Project Beta");

        // List
        let projects = db.list_projects().unwrap();
        assert_eq!(projects.len(), 2);

        // Get
        let got = db.get_project(&p1.id).unwrap().expect("should exist");
        assert_eq!(got.name, "Project Alpha");
        assert_eq!(got.genre, "fiction");

        // Get non-existent
        assert!(db.get_project("nonexistent-id").unwrap().is_none());

        // Update
        let mut updated = got;
        updated.name = "Updated Alpha".to_string();
        updated.word_count = 9999;
        db.update_project(&updated).unwrap();
        let re_read = db.get_project(&updated.id).unwrap().expect("should exist after update");
        assert_eq!(re_read.name, "Updated Alpha");
        assert_eq!(re_read.word_count, 9999);
        assert!(re_read.updated_at >= re_read.created_at);

        // Delete
        db.delete_project(&p2.id).unwrap();
        assert_eq!(db.list_projects().unwrap().len(), 1);
        assert!(db.get_project(&p2.id).unwrap().is_none());
    }

    // -???????????????????????????????????????????????????????????????????????????????????
    //  WorldObject CRUD (with judgment_history)
    // -???????????????????????????????????????????????????????????????????????????????????
    //
    // NOTE: list_world_objects() and get_world_object() have a known
    // deadlock: they hold the Mutex lock while calling
    // get_judgment_records_for_object(), which also tries to lock.
    // std::sync::Mutex is non-reentrant, so this deadlocks.
    // These tests use direct SQL reads to verify state instead.

    #[test]
    fn test_world_object_crud() {
        let db = setup_db();
        let proj = db.create_project("Test", "t", "conceiving", 0, r##"["#a","#b"]"##).unwrap();
        let pid = &proj.id;

        // Initially empty via direct SQL
        {
            let conn = db.conn.lock().unwrap();
            let count: i64 = conn
                .query_row("SELECT COUNT(*) FROM world_objects WHERE project_id = ?", params![pid], |r| r.get(0))
                .unwrap();
            assert_eq!(count, 0);
        }

        // Create with judgment_history
        let obj_id = uuid::Uuid::new_v4().to_string();
        let j1 = make_judgment(&obj_id, "promote_canon", "uncollected", "draft_canon");
        let j2 = make_judgment(&obj_id, "lock", "draft_canon", "locked");

        let obj = WorldObject {
            id: obj_id.clone(),
            project_id: pid.clone(),
            name: "Character A".to_string(),
            object_type: "person".to_string(),
            status: "locked".to_string(),
            canon_level: "core_canon".to_string(),
            tags: vec!["protagonist".to_string(), "awakened".to_string()],
            aliases: vec!["CA".to_string()],
            selected_boards: vec!["character_graph".to_string()],
            content: "A test character with rich backstory.".to_string(),
            references_count: 3,
            judgment_history: vec![j1, j2],
            created_at: 0,
            updated_at: 0,
        };

        let created = db.create_world_object(&obj).unwrap();
        assert_eq!(created.name, "Character A");

        // Verify via direct SQL (avoids deadlock)
        {
            let conn = db.conn.lock().unwrap();
            let count: i64 = conn
                .query_row("SELECT COUNT(*) FROM world_objects WHERE project_id = ?", params![pid], |r| r.get(0))
                .unwrap();
            assert_eq!(count, 1);
            let name: String = conn
                .query_row("SELECT name FROM world_objects WHERE id = ?", params![obj_id], |r| r.get(0))
                .unwrap();
            assert_eq!(name, "Character A");
            let otype: String = conn
                .query_row("SELECT type FROM world_objects WHERE id = ?", params![obj_id], |r| r.get(0))
                .unwrap();
            assert_eq!(otype, "person");
        }
        // Lock scope dropped ??Mutex released

        // Verify judgment records
        {
            let conn = db.conn.lock().unwrap();
            let j_count: i64 = conn
                .query_row("SELECT COUNT(*) FROM judgment_records WHERE object_id = ?", params![obj_id], |r| r.get(0))
                .unwrap();
            assert_eq!(j_count, 2);
        }

        // Ensure other project isolation
        let other_proj = db.create_project("Other", "o", "conceiving", 0, r##"["#x","#y"]"##).unwrap();
        {
            let conn = db.conn.lock().unwrap();
            let count: i64 = conn
                .query_row("SELECT COUNT(*) FROM world_objects WHERE project_id = ?", params![other_proj.id], |r| r.get(0))
                .unwrap();
            assert_eq!(count, 0);
        }

        // Update
        let mut update_obj = created;
        update_obj.name = "Character A (Updated)".to_string();
        update_obj.status = "draft".to_string();
        update_obj.content = "Updated content here.".to_string();
        update_obj.tags.push("updated".to_string());
        db.update_world_object(&update_obj).unwrap();

        // Verify update
        {
            let conn = db.conn.lock().unwrap();
            let name: String = conn
                .query_row("SELECT name FROM world_objects WHERE id = ?", params![obj_id], |r| r.get(0))
                .unwrap();
            assert_eq!(name, "Character A (Updated)");
            let status: String = conn
                .query_row("SELECT status FROM world_objects WHERE id = ?", params![obj_id], |r| r.get(0))
                .unwrap();
            assert_eq!(status, "draft");
        }

        // Delete
        db.delete_world_object(&obj_id).unwrap();
        {
            let conn = db.conn.lock().unwrap();
            let count: i64 = conn
                .query_row("SELECT COUNT(*) FROM world_objects WHERE project_id = ?", params![pid], |r| r.get(0))
                .unwrap();
            assert_eq!(count, 0);
        }
    }

    // -???????????????????????????????????????????????????????????????????????????????????
    //  CanvasTabState serialization round-trip
    // -???????????????????????????????????????????????????????????????????????????????????

    #[test]
    fn test_canvas_tab_state_serialization() {
        let db = setup_db();
        let proj = db.create_project("Canvas Test", "t", "conceiving", 0, r##"["#a","#b"]"##).unwrap();

        // Initial: empty
        let states = db.list_canvas_tab_states(&proj.id).unwrap();
        // May have default states from App, but DB starts empty
        assert!(states.is_empty());

        // Save a state with all JSON fields populated
        let state_id = uuid::Uuid::new_v4().to_string();
        let state = CanvasTabState {
            id: state_id.clone(),
            project_id: proj.id.clone(),
            tab_id: "main_canvas".to_string(),
            positions: serde_json::json!([
                {"objectId": "obj1", "x": 100.0, "y": 200.0},
                {"objectId": "obj2", "x": 300.0, "y": 400.0}
            ]),
            sticky_notes: vec![
                StickyNote {
                    id: "sticky1".to_string(),
                    text: "Important note".to_string(),
                    x: 50.0, y: 60.0,
                    width: 160.0, height: 100.0,
                    color: "#3E2723".to_string(),
                }
            ],
            connections: vec![],
            scale: 1.5,
            pan_x: -100.0,
            pan_y: -200.0,
            created_at: 0,
            updated_at: 0,
        };

        let resp1 = db.save_canvas_tab_state(&state, 1).unwrap();
        assert!(resp1.accepted);
        assert_eq!(resp1.current_version, 1);
        assert_eq!(resp1.state.tab_id, "main_canvas");
        assert_eq!(resp1.state.scale, 1.5);
        assert_eq!(resp1.state.pan_x, -100.0);

        // List and verify JSON round-trip
        // List and verify JSON round-trip
        let saved_list = db.list_canvas_tab_states(&proj.id).unwrap();
        assert_eq!(saved_list.len(), 1);
        let loaded = &saved_list[0];

        // positions should be a valid JSON array
        let pos_arr = loaded.positions.as_array().expect("positions should be array");
        assert_eq!(pos_arr.len(), 2);
        assert_eq!(pos_arr[0]["objectId"], "obj1");

        // sticky_notes should be parsed back
        assert_eq!(loaded.sticky_notes.len(), 1);
        assert_eq!(loaded.sticky_notes[0].text, "Important note");

        // Upsert: save the same ID with higher version
        let updated_state = CanvasTabState {
            id: state_id.clone(),
            project_id: proj.id.clone(),
            tab_id: "main_canvas".to_string(),
            positions: serde_json::json!([
                {"objectId": "obj1", "x": 100.0, "y": 200.0},
                {"objectId": "obj2", "x": 300.0, "y": 400.0}
            ]),
            sticky_notes: vec![],
            connections: vec![],
            scale: 2.0,
            pan_x: 0.0,
            pan_y: 0.0,
            created_at: 0,
            updated_at: 0,
        };
        let resp2 = db.save_canvas_tab_state(&updated_state, 2).unwrap();
        assert!(resp2.accepted);
        assert_eq!(resp2.current_version, 2);
        assert_eq!(resp2.state.scale, 2.0);
        assert_eq!(resp2.state.sticky_notes.len(), 0);

        // Version conflict: try to save with stale version
        let conflict = db.save_canvas_tab_state(&updated_state, 1);
        assert!(conflict.is_err());
        let err_msg = conflict.unwrap_err();
        assert!(err_msg.starts_with("VERSION_CONFLICT:"), "Expected VERSION_CONFLICT, got: {}", err_msg);

        // Delete
        // Delete
        db.delete_canvas_tab_state(&state_id).unwrap();
        assert!(db.list_canvas_tab_states(&proj.id).unwrap().is_empty());
    }

    // -???????????????????????????????????????????????????????????????????????????????????
    //  JudgmentRecord append and query
    // -???????????????????????????????????????????????????????????????????????????????????

    #[test]
    fn test_judgment_record_append_and_query() {
        let db = setup_db();
        let proj = db.create_project("Judgment Test", "t", "conceiving", 0, r##"["#a","#b"]"##).unwrap();

        // Create an object for the judgments to reference
        let obj_id = uuid::Uuid::new_v4().to_string();
        let obj = WorldObject {
            id: obj_id.clone(),
            project_id: proj.id.clone(),
            name: "Judged Object".to_string(),
            object_type: "person".to_string(),
            status: "locked".to_string(),
            canon_level: "draft_canon".to_string(),
            tags: vec![],
            aliases: vec![],
            selected_boards: vec![],
            content: "".to_string(),
            references_count: 0,
            judgment_history: vec![],
            created_at: 0,
            updated_at: 0,
        };
        let obj = db.create_world_object(&obj).unwrap();

        // Append a lock judgment
        let lock_record = make_judgment(&obj.id, "lock", "draft", "locked");
        let saved_lock = db.append_judgment_record(&lock_record).unwrap();
        assert!(!saved_lock.id.is_empty());

        // Append a status change judgment
        let promote_record = make_judgment(&obj.id, "promote_canon", "draft_canon", "core_canon");
        db.append_judgment_record(&promote_record).unwrap();

        // Get by object
        let obj_records = db.get_judgment_records_for_object(&obj.id).unwrap();
        assert_eq!(obj_records.len(), 2);

        // List by project
        let proj_records = db.list_judgment_records(&proj.id).unwrap();
        assert_eq!(proj_records.len(), 2);

        // Verify record content
        let lock_found = proj_records.iter().find(|r| r.operation_type == "lock");
        assert!(lock_found.is_some());
        assert_eq!(lock_found.unwrap().previous_status, "draft");
        assert_eq!(lock_found.unwrap().new_status, "locked");

        // Append record with empty id (auto-generate)
        let empty_id_record = JudgmentRecord {
            id: "".to_string(),
            object_id: obj.id.clone(),
            object_name: "Judged Object".to_string(),
            operation_type: "lock".to_string(),
            reason: "Deprecated".to_string(),
            timestamp: chrono::Utc::now().timestamp_millis(),
            previous_status: "draft".to_string(),
            new_status: "locked".to_string(),
        };
        let saved_empty = db.append_judgment_record(&empty_id_record).unwrap();
        assert!(!saved_empty.id.is_empty());
        assert_ne!(saved_empty.id, "");

        // Verify 3 records now
        assert_eq!(db.get_judgment_records_for_object(&obj.id).unwrap().len(), 3);
    }

    // -???????????????????????????????????????????????????????????????????????????????????
    //  Connection create and delete
    // -???????????????????????????????????????????????????????????????????????????????????

    #[test]
    fn test_connection_create_and_delete() {
        let db = setup_db();
        let proj = db.create_project("Conn Test", "t", "conceiving", 0, r##"["#a","#b"]"##).unwrap();

        // Create two objects to connect
        let obj1 = db.create_world_object(&WorldObject {
            id: uuid::Uuid::new_v4().to_string(),
            project_id: proj.id.clone(),
            name: "Source".to_string(),
            object_type: "person".to_string(),
            status: "locked".to_string(),
            canon_level: "draft_canon".to_string(),
            tags: vec![],
            aliases: vec![],
            selected_boards: vec![],
            content: "".to_string(),
            references_count: 0,
            judgment_history: vec![],
            created_at: 0,
            updated_at: 0,
        }).unwrap();
        let obj2 = db.create_world_object(&WorldObject {
            id: uuid::Uuid::new_v4().to_string(),
            project_id: proj.id.clone(),
            name: "Target".to_string(),
            object_type: "person".to_string(),
            status: "locked".to_string(),
            canon_level: "draft_canon".to_string(),
            tags: vec![],
            aliases: vec![],
            selected_boards: vec![],
            content: "".to_string(),
            references_count: 0,
            judgment_history: vec![],
            created_at: 0,
            updated_at: 0,
        }).unwrap();

        let conn_id = uuid::Uuid::new_v4().to_string();
        let connection = ObjConnection {
            id: conn_id.clone(),
            project_id: proj.id.clone(),
            source_id: obj1.id.clone(),
            target_id: obj2.id.clone(),
            connection_type: "influences".to_string(),
            label: "influences".to_string(),
        };

        let created = db.create_connection(&connection).unwrap();
        assert_eq!(created.connection_type, "influences");
        assert_eq!(created.label, "influences");

        // List
        let connections = db.list_connections(&proj.id).unwrap();
        assert_eq!(connections.len(), 1);
        assert_eq!(connections[0].source_id, obj1.id);

        // Other project isolation
        let other = db.create_project("Other", "o", "conceiving", 0, r##"["#c","#d"]"##).unwrap();
        assert!(db.list_connections(&other.id).unwrap().is_empty());

        // Delete
        db.delete_connection(&conn_id).unwrap();
        assert!(db.list_connections(&proj.id).unwrap().is_empty());
    }

    // -???????????????????????????????????????????????????????????????????????????????????
    //  Cascade delete
    // -???????????????????????????????????????????????????????????????????????????????????
    //
    // Uses direct SQL reads to avoid the Mutex deadlock in
    // list_world_objects() / get_world_object(). See note above.

    #[test]
    fn test_cascade_delete() {
        let db = setup_db();

        // Create project with object and connection
        let proj = db.create_project("Cascade Test", "t", "conceiving", 0, r##"["#a","#b"]"##).unwrap();

        let obj_id = uuid::Uuid::new_v4().to_string();
        let obj = WorldObject {
            id: obj_id.clone(),
            project_id: proj.id.clone(),
            name: "WillBeDeleted".to_string(),
            object_type: "person".to_string(),
            status: "locked".to_string(),
            canon_level: "draft_canon".to_string(),
            tags: vec![],
            aliases: vec![],
            selected_boards: vec![],
            content: "".to_string(),
            references_count: 0,
            judgment_history: vec![],
            created_at: 0,
            updated_at: 0,
        };
        db.create_world_object(&obj).unwrap();

        // Add a judgment for the object
        let jr = make_judgment(&obj_id, "???", "???", "???");
        db.append_judgment_record(&jr).unwrap();

        // Add a connection
        let conn_id = uuid::Uuid::new_v4().to_string();
        let other_obj_id = uuid::Uuid::new_v4().to_string();
        let other_obj = WorldObject {
            id: other_obj_id.clone(),
            project_id: proj.id.clone(),
            name: "Other".to_string(),
            object_type: "person".to_string(),
            status: "locked".to_string(),
            canon_level: "draft_canon".to_string(),
            tags: vec![],
            aliases: vec![],
            selected_boards: vec![],
            content: "".to_string(),
            references_count: 0,
            judgment_history: vec![],
            created_at: 0,
            updated_at: 0,
        };
        db.create_world_object(&other_obj).unwrap();
        db.create_connection(&ObjConnection {
            id: conn_id.clone(),
            project_id: proj.id.clone(),
            source_id: obj_id.clone(),
            target_id: other_obj_id.clone(),
            connection_type: "influences".to_string(),
            label: "".to_string(),
        }).unwrap();

        // Verify everything exists (direct SQL for objects to avoid deadlock)
        {
            let conn = db.conn.lock().unwrap();
            let obj_count: i64 = conn
                .query_row("SELECT COUNT(*) FROM world_objects WHERE project_id = ?", params![proj.id], |r| r.get(0))
                .unwrap();
            assert_eq!(obj_count, 2);
        }
        assert_eq!(db.list_connections(&proj.id).unwrap().len(), 1);
        assert_eq!(db.get_judgment_records_for_object(&obj_id).unwrap().len(), 1);

        // Delete project - cascade should remove objects, connections, judgments
        db.delete_project(&proj.id).unwrap();

        // Verify cascaded (direct SQL for objects)
        {
            let conn = db.conn.lock().unwrap();
            let obj_count: i64 = conn
                .query_row("SELECT COUNT(*) FROM world_objects WHERE project_id = ?", params![proj.id], |r| r.get(0))
                .unwrap();
            assert_eq!(obj_count, 0);
        }
        assert_eq!(db.list_connections(&proj.id).unwrap().len(), 0);
        assert_eq!(db.get_judgment_records_for_object(&obj_id).unwrap().len(), 0);
    }

    // -?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-
    //  P0-05: Export / Import / WikiLink tests
    // -?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-

    #[test]
    fn test_parse_wiki_links() {
        let links = parse_wiki_links("Hello [[World]]!");
        assert_eq!(links, vec!["World"]);

        let links = parse_wiki_links("See [[Target|display]] here");
        assert_eq!(links, vec!["Target"]);

        let links = parse_wiki_links("[[A]] and [[B]] and [[C|see]]");
        assert_eq!(links, vec!["A", "B", "C"]);

        let links: Vec<String> = parse_wiki_links("Plain text without links");
        assert!(links.is_empty());

        let links: Vec<String> = parse_wiki_links("");
        assert!(links.is_empty());

        let links = parse_wiki_links("[[unclosed");
        assert!(links.is_empty());
    }

    #[test]
    fn test_export_import_roundtrip() {
        let db = setup_db();
        let proj = db.create_project("Export Test", "科幻", "drafting", 15000, r##"["#ff0000","#00ff00"]"##).unwrap();

        let obj1_id = uuid::Uuid::new_v4().to_string();
        let obj1 = WorldObject {
            id: obj1_id.clone(),
            project_id: proj.id.clone(),
            name: "Character One".to_string(),
            object_type: "人物".to_string(),
            status: "锁定".to_string(),
            canon_level: "项目正典".to_string(),
            tags: vec!["protagonist".to_string()],
            aliases: vec![],
            selected_boards: vec![],
            content: "A test character.".to_string(),
            references_count: 0,
            judgment_history: vec![],
            created_at: 0,
            updated_at: 0,
        };
        db.create_world_object(&obj1).unwrap();

        let obj2_id = uuid::Uuid::new_v4().to_string();
        let obj2 = WorldObject {
            id: obj2_id.clone(),
            project_id: proj.id.clone(),
            name: "Location One".to_string(),
            object_type: "地点".to_string(),
            status: "锁定".to_string(),
            canon_level: "核心正典".to_string(),
            tags: vec![],
            aliases: vec![],
            selected_boards: vec![],
            content: "An important location.".to_string(),
            references_count: 0,
            judgment_history: vec![],
            created_at: 0,
            updated_at: 0,
        };
        db.create_world_object(&obj2).unwrap();

        let conn_id = uuid::Uuid::new_v4().to_string();
        db.create_connection(&ObjConnection {
            id: conn_id.clone(),
            project_id: proj.id.clone(),
            source_id: obj1_id.clone(),
            target_id: obj2_id.clone(),
            connection_type: "发生于".to_string(),
            label: "".to_string(),
        }).unwrap();

        let export_data = db.export_project_data(&proj.id).unwrap();
        assert_eq!(export_data.project.name, "Export Test");
        assert_eq!(export_data.objects.len(), 2);
        assert_eq!(export_data.connections.len(), 1);

        let import_result = db.import_project_data(&export_data).unwrap();
        assert!(import_result.success);
        assert_eq!(import_result.object_count, 2);
        assert_eq!(import_result.connection_count, 1);
        assert_eq!(import_result.project_name, "Export Test");

        let imported_objects = db.list_world_objects(&import_result.project_id).unwrap();
        assert_eq!(imported_objects.len(), 2);
        let imported_connections = db.list_connections(&import_result.project_id).unwrap();
        assert_eq!(imported_connections.len(), 1);
    }
}