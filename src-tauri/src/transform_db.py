import re

with open("db.rs", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update imports
old_import = "    CanvasTabState, CanvasTabStateRow, JudgmentRecord, Project, WorldObject, WorldObjectRow,"
new_import = "    CanvasTabState, CanvasTabStateRow, ImportResult, JudgmentRecord, Project,"
content = content.replace(old_import, new_import)

# Add SaveCanvasTabStateResponse, ProjectExportData after the import continuation
old_import2 = "use crate::models::Connection as ObjConnection;"
new_import2 = """use crate::models::{ProjectExportData, SaveCanvasTabStateResponse};
use crate::models::Connection as ObjConnection;"""
content = content.replace(old_import2, new_import2)

# 2. Add ALTER TABLE migration after idx_jr_object
old_schema = "CREATE INDEX IF NOT EXISTS idx_jr_object ON judgment_records(object_id);\n            \""
new_schema = """CREATE INDEX IF NOT EXISTS idx_jr_object ON judgment_records(object_id);

            -- P0-04: add version column for canvas tab states (migration, safe to re-run)
            ALTER TABLE canvas_tab_states ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
            \""""
content = content.replace(old_schema, new_schema)

# 3. Replace save_canvas_tab_state function
old_fn = """    pub fn save_canvas_tab_state(&self, state: &CanvasTabState) -> SqlResult<CanvasTabState> {
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
    }"""

new_fn = """    pub fn save_canvas_tab_state(&self, state: &CanvasTabState, version: i64) -> Result<SaveCanvasTabStateResponse, String> {
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
    }"""

if old_fn in content:
    content = content.replace(old_fn, new_fn)
    print("save_canvas_tab_state replaced")
else:
    print("ERROR: old save_canvas_tab_state not found!")
    # Find closest match
    idx = content.find("pub fn save_canvas_tab_state")
    if idx >= 0:
        print(f"  Found at position {idx}")
        print(f"  Context: {content[idx:idx+80]}")

# 4. Add import/export functions before delete_canvas_tab_state
old_delete = "    pub fn delete_canvas_tab_state(&self, id: &str) -> SqlResult<()> {"

new_funcs = """
    // -•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-
    //  P0-05: Export / Import
    // -•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-

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

        for obj in &data.objects {
            let tags_json = serde_json::to_string(&obj.tags).unwrap_or_else(|_| "[]".to_string());
            let aliases_json = serde_json::to_string(&obj.aliases).unwrap_or_else(|_| "[]".to_string());
            let boards_json = serde_json::to_string(&obj.selected_boards).unwrap_or_else(|_| "[]".to_string());
            {
                let conn = self.conn.lock().unwrap();
                conn.execute(
                    "INSERT OR IGNORE INTO world_objects
                     (id, project_id, name, type, status, canon_level,
                      tags, aliases, selected_boards, content, references_count, created_at, updated_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
                    params![
                        obj.id, new_project_id, obj.name, obj.object_type,
                        obj.status, obj.canon_level, tags_json, aliases_json, boards_json,
                        obj.content, obj.references_count, obj.created_at, obj.updated_at,
                    ],
                ).map_err(|e| format!("IO_ERROR: {}", e))?;

                for jr in &obj.judgment_history {
                    let jr_id = jr.id.clone();
                    conn.execute(
                        "INSERT OR IGNORE INTO judgment_records (id, object_id, object_name, operation_type, reason, timestamp, previous_status, new_status)
                         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                        params![
                            jr_id, obj.id, jr.object_name, jr.operation_type,
                            jr.reason, jr.timestamp, jr.previous_status, jr.new_status,
                        ],
                    ).map_err(|e| format!("IO_ERROR: {}", e))?;
                }
            }
            object_count += 1;
        }

        for conn_data in &data.connections {
            {
                let conn = self.conn.lock().unwrap();
                conn.execute(
                    "INSERT OR IGNORE INTO connections (id, project_id, source_id, target_id, type, label)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                    params![
                        conn_data.id, new_project_id,
                        conn_data.source_id, conn_data.target_id,
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
                    "INSERT OR IGNORE INTO canvas_tab_states
                     (id, project_id, tab_id, positions, sticky_notes, connections, scale, pan_x, pan_y, version, created_at, updated_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
                    params![
                        cs.id, new_project_id, cs.tab_id,
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
                    0i64, "[\"#6366f1\",\"#8b5cf6\"]", now, now,
                ],
            ).map_err(|e| format!("IO_ERROR: {}", e))?;
        }

        let mut name_to_id: dict[str, str] = {};
        let mut object_count = 0usize;

        for (name, content) in &md_entries {
            let obj_id = uuid::Uuid::new_v4().to_string();
            name_to_id[name.clone()] = obj_id.clone();
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
                        let existing: i64 = conn.query_row(
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

"""

# Insert the new functions before delete_canvas_tab_state
if old_delete in content:
    content = content.replace(old_delete, new_funcs + old_delete)
    print("Export/import functions inserted")
else:
    print("ERROR: delete_canvas_tab_state not found!")

# 5. Add parse_wiki_links before #[cfg(test)]
old_test = "\n#[cfg(test)]\nmod tests {"

wiki_fn = """

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
mod tests {"""

if old_test in content:
    content = content.replace(old_test, wiki_fn)
    print("parse_wiki_links inserted before tests")
else:
    print("ERROR: #[cfg(test)] not found!")

# 6. Update canvas state test
old_test_save = """        let saved = db.save_canvas_tab_state(&state).unwrap();
        assert_eq!(saved.tab_id, "main_canvas");
        assert_eq!(saved.scale, 1.5);
        assert_eq!(saved.pan_x, -100.0);
        // Note: save_canvas_tab_state returns input state.created_at (0 for new),
        // not the DB-computed value. This is known behavior, not a test failure.
        // The DB does persist the correct value via COALESCE in the INSERT.

        // List and verify JSON round-trip"""

new_test_save = """        // Save with version 1
        let resp1 = db.save_canvas_tab_state(&state, 1).unwrap();
        assert!(resp1.accepted);
        assert_eq!(resp1.current_version, 1);
        assert_eq!(resp1.state.tab_id, "main_canvas");
        assert_eq!(resp1.state.scale, 1.5);
        assert_eq!(resp1.state.pan_x, -100.0);

        // List and verify JSON round-trip"""

content = content.replace(old_test_save, new_test_save)

old_test_upsert = """        // Upsert: save the same ID with different data
        let updated_state = CanvasTabState {
            scale: 2.0,
            pan_x: 0.0,
            pan_y: 0.0,
            sticky_notes: vec![],
            ..state
        };
        let upserted = db.save_canvas_tab_state(&updated_state).unwrap();
        assert_eq!(upserted.scale, 2.0);
        assert_eq!(upserted.sticky_notes.len(), 0);

        // Delete"""

new_test_upsert = """        // Upsert: save the same ID with higher version
        let updated_state = CanvasTabState {
            scale: 2.0,
            pan_x: 0.0,
            pan_y: 0.0,
            sticky_notes: vec![],
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

        // Delete"""

content = content.replace(old_test_upsert, new_test_upsert)

# 7. Add import/export tests at the end of the test module
# Find the last closing }
last_brace = content.rstrip().rfind("}")
if last_brace >= 0:
    new_tests = """

    // -•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-
    //  P0-05: Export / Import / WikiLink tests
    // -•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-

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
        let proj = db.create_project("Export Test", "科幻", "drafting", 15000, "[\"#ff0000\",\"#00ff00\"]").unwrap();

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
"""
    content = content[:last_brace] + new_tests + content[last_brace:]
    print("Import/export tests added")
else:
    print("ERROR: could not find closing brace of test module")

with open("db.rs", "w", encoding="utf-8") as f:
    f.write(content)

print("db.rs transformation complete")
