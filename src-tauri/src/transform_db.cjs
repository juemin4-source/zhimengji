const fs = require('fs');

const lines = fs.readFileSync('db.rs', 'utf-8').split('\n');

// 1. Update imports
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('CanvasTabState, CanvasTabStateRow, JudgmentRecord, Project, WorldObject, WorldObjectRow,')) {
    lines[i] = '    CanvasTabState, CanvasTabStateRow, ImportResult, JudgmentRecord, Project,';
    lines.splice(i+1, 0, '    ProjectExportData, SaveCanvasTabStateResponse, WorldObject, WorldObjectRow,');
    console.log('Imports updated at line ' + (i+1));
    break;
  }
}

// 2. Add ALTER TABLE migration
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('CREATE INDEX IF NOT EXISTS idx_jr_object')) {
    lines.splice(i+1, 0,
      '',
      '            -- P0-04: add version column for canvas tab states (migration, safe to re-run)',
      '            ALTER TABLE canvas_tab_states ADD COLUMN version INTEGER NOT NULL DEFAULT 1;'
    );
    console.log('Migration added at line ' + (i+1));
    break;
  }
}

// 3. Replace save_canvas_tab_state function body
// Find the function start and the exact closing brace (4-space indent followed by empty line or next fn)
let saveFnStart = -1, saveFnEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim().startsWith('pub fn save_canvas_tab_state(')) {
    saveFnStart = i;
    // Now find the closing brace: look for `    }` that is followed by blank or next function
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j] === '    }') {
        // Check if next non-comment line is also a function or blank
        // The function close is the first `    }` that isn't followed by continued content
        saveFnEnd = j;
        break;
      }
    }
    break;
  }
}

if (saveFnStart < 0 || saveFnEnd < 0) {
  console.error('save_canvas_tab_state function boundaries not found');
  console.error('Start: ' + saveFnStart + ', End: ' + saveFnEnd);
  process.exit(1);
}

console.log('save_canvas_tab_state at lines ' + (saveFnStart+1) + '-' + (saveFnEnd+1));

// Replace the function body
const newSaveFn = [
  '    pub fn save_canvas_tab_state(&self, state: &CanvasTabState, version: i64) -> Result<SaveCanvasTabStateResponse, String> {',
  '        let conn = self.conn.lock().unwrap();',
  '',
  '        // Check stored version for conflict detection',
  '        let stored_version: i64 = conn',
  '            .query_row(',
  '                "SELECT version FROM canvas_tab_states WHERE id = ?1",',
  '                params![state.id],',
  '                |row| row.get(0),',
  '            )',
  '            .unwrap_or(0); // 0 means no existing record',
  '',
  '        if stored_version > version {',
  '            return Err(format!(',
  '                "VERSION_CONFLICT: backend version {} > incoming version {}",',
  '                stored_version, version',
  '            ));',
  '        }',
  '',
  '        let new_version = version;',
  '        let now = chrono::Utc::now().timestamp_millis();',
  '        let positions_json = serde_json::to_string(&state.positions).unwrap_or_else(|_| "[]".to_string());',
  '        let notes_json = serde_json::to_string(&state.sticky_notes).unwrap_or_else(|_| "[]".to_string());',
  '        let conns_json = serde_json::to_string(&state.connections).unwrap_or_else(|_| "[]".to_string());',
  '',
  '        // Upsert: INSERT OR REPLACE (includes version column)',
  '        conn.execute(',
  '            "INSERT OR REPLACE INTO canvas_tab_states',
  '             (id, project_id, tab_id, positions, sticky_notes, connections, scale, pan_x, pan_y, version, created_at, updated_at)',
  '             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10,',
  '                     COALESCE((SELECT created_at FROM canvas_tab_states WHERE id=?1), ?11),',
  '                     ?12)",',
  '            params![',
  '                state.id, state.project_id, state.tab_id,',
  '                positions_json, notes_json, conns_json,',
  '                state.scale, state.pan_x, state.pan_y,',
  '                new_version, now, now,',
  '            ],',
  '        ).map_err(|e| format!("DB_ERROR: {}", e))?;',
  '',
  '        let result_state = CanvasTabState {',
  '            id: state.id.clone(),',
  '            project_id: state.project_id.clone(),',
  '            tab_id: state.tab_id.clone(),',
  '            positions: state.positions.clone(),',
  '            sticky_notes: state.sticky_notes.clone(),',
  '            connections: state.connections.clone(),',
  '            scale: state.scale,',
  '            pan_x: state.pan_x,',
  '            pan_y: state.pan_y,',
  '            created_at: state.created_at,',
  '            updated_at: now,',
  '        };',
  '',
  '        Ok(SaveCanvasTabStateResponse {',
  '            state: result_state,',
  '            accepted: true,',
  '            current_version: new_version,',
  '        })',
  '    }',
];

const removeCount = saveFnEnd - saveFnStart + 1;
lines.splice(saveFnStart, removeCount, ...newSaveFn);
console.log('save_canvas_tab_state replaced');

// Recalculate line offsets: newSaveFn is longer, so add the offset
const fnOffset = newSaveFn.length - removeCount;

// 4. Add import/export functions before delete_canvas_tab_state
let delStart = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === 'pub fn delete_canvas_tab_state(' && lines[i+1] && lines[i+1].includes('&self')) {
    delStart = i;
    break;
  }
}

if (delStart < 0) {
  console.error('delete_canvas_tab_state not found');
  process.exit(1);
}

const importExport = [
  '',
  '    // -•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-',
  '    //  P0-05: Export / Import',
  '    // -•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-',
  '',
  '    /// Export all project data for zip packaging (P0-05)',
  '    pub fn export_project_data(&self, project_id: &str) -> Result<ProjectExportData, String> {',
  '        let project = self',
  '            .get_project(project_id)',
  '            .map_err(|e| format!("NOT_FOUND: {}", e))?',
  '            .ok_or_else(|| format!("NOT_FOUND: project {} not found", project_id))?;',
  '',
  '        let objects = self',
  '            .list_world_objects(project_id)',
  '            .map_err(|e| format!("IO_ERROR: {}", e))?;',
  '',
  '        let connections = self',
  '            .list_connections(project_id)',
  '            .map_err(|e| format!("IO_ERROR: {}", e))?;',
  '',
  '        let canvas_states = self',
  '            .list_canvas_tab_states(project_id)',
  '            .map_err(|e| format!("IO_ERROR: {}", e))?;',
  '',
  '        Ok(ProjectExportData {',
  '            project,',
  '            objects,',
  '            connections,',
  '            canvas_states,',
  '        })',
  '    }',
  '',
  '    /// Import project data from a parsed export (P0-05).',
  '    pub fn import_project_data(&self, data: &ProjectExportData) -> Result<ImportResult, String> {',
  '        let new_project_id = uuid::Uuid::new_v4().to_string();',
  '        let now = chrono::Utc::now().timestamp_millis();',
  '        {',
  '            let conn = self.conn.lock().unwrap();',
  '            conn.execute(',
  '                "INSERT INTO projects (id, name, genre, status, word_count, gradient, created_at, updated_at)',
  '                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",',
  '                params![',
  '                    new_project_id,',
  '                    data.project.name, data.project.genre,',
  '                    data.project.status, data.project.word_count,',
  '                    data.project.gradient, now, now,',
  '                ],',
  '            ).map_err(|e| format!("IO_ERROR: {}", e))?;',
  '        }',
  '',
  '        let mut object_count = 0usize;',
  '        let mut connection_count = 0usize;',
  '',
  '        for obj in &data.objects {',
  '            let tags_json = serde_json::to_string(&obj.tags).unwrap_or_else(|_| "[]".to_string());',
  '            let aliases_json = serde_json::to_string(&obj.aliases).unwrap_or_else(|_| "[]".to_string());',
  '            let boards_json = serde_json::to_string(&obj.selected_boards).unwrap_or_else(|_| "[]".to_string());',
  '            {',
  '                let conn = self.conn.lock().unwrap();',
  '                conn.execute(',
  '                    "INSERT OR IGNORE INTO world_objects',
  '                     (id, project_id, name, type, status, canon_level,',
  '                      tags, aliases, selected_boards, content, references_count, created_at, updated_at)',
  '                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",',
  '                    params![',
  '                        obj.id, new_project_id, obj.name, obj.object_type,',
  '                        obj.status, obj.canon_level, tags_json, aliases_json, boards_json,',
  '                        obj.content, obj.references_count, obj.created_at, obj.updated_at,',
  '                    ],',
  '                ).map_err(|e| format!("IO_ERROR: {}", e))?;',
  '',
  '                for jr in &obj.judgment_history {',
  '                    conn.execute(',
  '                        "INSERT OR IGNORE INTO judgment_records (id, object_id, object_name, operation_type, reason, timestamp, previous_status, new_status)',
  '                         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",',
  '                        params![',
  '                            jr.id, obj.id, jr.object_name, jr.operation_type,',
  '                            jr.reason, jr.timestamp, jr.previous_status, jr.new_status,',
  '                        ],',
  '                    ).map_err(|e| format!("IO_ERROR: {}", e))?;',
  '                }',
  '            }',
  '            object_count += 1;',
  '        }',
  '',
  '        for conn_data in &data.connections {',
  '            {',
  '                let conn = self.conn.lock().unwrap();',
  '                conn.execute(',
  '                    "INSERT OR IGNORE INTO connections (id, project_id, source_id, target_id, type, label)',
  '                     VALUES (?1, ?2, ?3, ?4, ?5, ?6)",',
  '                    params![',
  '                        conn_data.id, new_project_id,',
  '                        conn_data.source_id, conn_data.target_id,',
  '                        conn_data.connection_type, conn_data.label,',
  '                    ],',
  '                ).map_err(|e| format!("IO_ERROR: {}", e))?;',
  '            }',
  '            connection_count += 1;',
  '        }',
  '',
  '        for cs in &data.canvas_states {',
  '            let positions_json = serde_json::to_string(&cs.positions).unwrap_or_else(|_| "[]".to_string());',
  '            let notes_json = serde_json::to_string(&cs.sticky_notes).unwrap_or_else(|_| "[]".to_string());',
  '            let conns_json = serde_json::to_string(&cs.connections).unwrap_or_else(|_| "[]".to_string());',
  '            {',
  '                let conn = self.conn.lock().unwrap();',
  '                conn.execute(',
  '                    "INSERT OR IGNORE INTO canvas_tab_states',
  '                     (id, project_id, tab_id, positions, sticky_notes, connections, scale, pan_x, pan_y, version, created_at, updated_at)',
  '                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",',
  '                    params![',
  '                        cs.id, new_project_id, cs.tab_id,',
  '                        positions_json, notes_json, conns_json,',
  '                        cs.scale, cs.pan_x, cs.pan_y,',
  '                        1i64, cs.created_at, now,',
  '                    ],',
  '                ).map_err(|e| format!("IO_ERROR: {}", e))?;',
  '            }',
  '        }',
  '',
  '        Ok(ImportResult {',
  '            success: true,',
  '            project_id: new_project_id,',
  '            project_name: data.project.name.clone(),',
  '            object_count,',
  '            connection_count,',
  '        })',
  '    }',
  '',
  '    /// Import a plain markdown directory (P0-05).',
  '    pub fn import_markdown_directory(&self, dir_path: &str) -> Result<ImportResult, String> {',
  '        let dir = std::path::Path::new(dir_path);',
  '        if !dir.is_dir() {',
  '            return Err(format!("NOT_FOUND: directory not found: {}", dir_path));',
  '        }',
  '',
  '        let mut md_entries: Vec<(String, String)> = Vec::new();',
  '        let read_dir = std::fs::read_dir(dir).map_err(|e| format!("IO_ERROR: {}", e))?;',
  '',
  '        for entry in read_dir {',
  '            let entry = entry.map_err(|e| format!("IO_ERROR: {}", e))?;',
  '            let path = entry.path();',
  '            if path.extension().and_then(|e| e.to_str()) == Some("md") {',
  '                let file_stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("untitled").to_string();',
  '                let content = std::fs::read_to_string(&path).map_err(|e| format!("IO_ERROR: {}", e))?;',
  '                md_entries.push((file_stem, content));',
  '            }',
  '        }',
  '',
  '        if md_entries.is_empty() {',
  '            return Err("IO_ERROR: no .md files found in directory".to_string());',
  '        }',
  '',
  '        let project_id = uuid::Uuid::new_v4().to_string();',
  '        let now = chrono::Utc::now().timestamp_millis();',
  '        let dir_name = dir.file_name().and_then(|s| s.to_str()).unwrap_or("Imported Project");',
  '',
  '        {',
  '            let conn = self.conn.lock().unwrap();',
  '            conn.execute(',
  '                "INSERT INTO projects (id, name, genre, status, word_count, gradient, created_at, updated_at)',
  '                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",',
  '                params![',
  '                    project_id, dir_name, "未分类", "conceiving",',
  '                    0i64, "[\"#6366f1\",\"#8b5cf6\"]", now, now,',
  '                ],',
  '            ).map_err(|e| format!("IO_ERROR: {}", e))?;',
  '        }',
  '',
  '        let mut name_to_id = new Map();',
  '        let mut object_count = 0usize;',
  '',
  '        for (name, content) in &md_entries {',
  '            let obj_id = uuid::Uuid::new_v4().to_string();',
  '            name_to_id.insert(name.clone(), obj_id.clone());',
  '            {',
  '                let conn = self.conn.lock().unwrap();',
  '                conn.execute(',
  '                    "INSERT INTO world_objects (id, project_id, name, type, status, canon_level,',
  '                     tags, aliases, selected_boards, content, references_count, created_at, updated_at)',
  '                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",',
  '                    params![',
  '                        obj_id, project_id, name, "术语", "草稿", "草案正典",',
  '                        "[]", "[]", "[]", content, 0i32, now, now,',
  '                    ],',
  '                ).map_err(|e| format!("IO_ERROR: {}", e))?;',
  '            }',
  '            object_count += 1;',
  '        }',
  '',
  '        let mut connection_count = 0usize;',
  '        for (name, content) in &md_entries {',
  '            let source_id = match name_to_id.get(name) {',
  '                Some(id) => id.clone(),',
  '                None => continue,',
  '            };',
  '            let targets = parse_wiki_links(content);',
  '            for target_name in targets {',
  '                if let Some(target_id) = name_to_id.get(&target_name) {',
  '                    let conn_id = uuid::Uuid::new_v4().to_string();',
  '                    {',
  '                        let conn = self.conn.lock().unwrap();',
  '                        let existing = conn.query_row::<i64, _, _>(',
  '                            "SELECT COUNT(*) FROM connections WHERE project_id = ?1 AND source_id = ?2 AND target_id = ?3",',
  '                            params![project_id, source_id, target_id],',
  '                            |row| row.get(0),',
  '                        ).unwrap_or(0);',
  '                        if existing == 0 {',
  '                            conn.execute(',
  '                                "INSERT INTO connections (id, project_id, source_id, target_id, type, label)',
  '                                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",',
  '                                params![conn_id, project_id, source_id, target_id, "相关", ""],',
  '                            ).map_err(|e| format!("IO_ERROR: {}", e))?;',
  '                            connection_count += 1;',
  '                        }',
  '                    }',
  '                }',
  '            }',
  '        }',
  '',
  '        Ok(ImportResult {',
  '            success: true,',
  '            project_id,',
  '            project_name: dir_name.to_string(),',
  '            object_count,',
  '            connection_count,',
  '        })',
  '    }',
  '',
];

lines.splice(delStart, 0, ...importExport);
console.log('Export/import functions added');

// 5. Add parse_wiki_links before #[cfg(test)]
let testStart = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === '#[cfg(test)]') {
    testStart = i;
    break;
  }
}

if (testStart < 0) {
  console.error('#[cfg(test)] not found');
  process.exit(1);
}

const wikiFn = [
  '',
  '/// Parse [[WikiLink]] patterns from markdown content (P0-05).',
  '/// Returns a list of referenced object names (without display text suffix).',
  'fn parse_wiki_links(content: &str) -> Vec<String> {',
  '    let mut links = Vec::new();',
  '    let mut remaining = content;',
  '    while let Some(start) = remaining.find("[[") {',
  '        let after_open = &remaining[start + 2..];',
  '        if let Some(end) = after_open.find("]]") {',
  '            let link_text = &after_open[..end];',
  "            let name = link_text.split('|').next().unwrap_or(\"\").trim().to_string();",
  '            if !name.is_empty() {',
  '                links.push(name);',
  '            }',
  '            remaining = &after_open[end + 2..];',
  '        } else {',
  '            break;',
  '        }',
  '    }',
  '    links',
  '}',
];

lines.splice(testStart, 0, ...wikiFn);
console.log('parse_wiki_links added');

// 6. Update canvas state test
for (let i = 0; i < lines.length; i++) {
  // Find the test function
  if (lines[i].includes('fn test_canvas_tab_state_serialization')) {
    // Replace the first save call and its assertions
    for (let j = i; j < Math.min(i + 20, lines.length); j++) {
      if (lines[j].includes('let saved = db.save_canvas_tab_state(&state).unwrap();')) {
        lines[j] = '        let resp1 = db.save_canvas_tab_state(&state, 1).unwrap();';
        // Replace the assertion lines that follow (tab_id, scale, pan_x checks)
        let k = j + 1;
        while (k < lines.length && !lines[k].includes('//')) {
          k++;
        }
        // Remove old assertions and insert new ones
        const removeLines = k - j - 1;
        const newAssertions = [
          '        assert!(resp1.accepted);',
          '        assert_eq!(resp1.current_version, 1);',
          '        assert_eq!(resp1.state.tab_id, "main_canvas");',
          '        assert_eq!(resp1.state.scale, 1.5);',
          '        assert_eq!(resp1.state.pan_x, -100.0);',
          '',
          '        // List and verify JSON round-trip',
        ];
        lines.splice(j + 1, removeLines, ...newAssertions);
        break;
      }
    }
    
    // Find and replace the upsert section
    for (let j = i; j < lines.length; j++) {
      if (lines[j].includes('// Upsert: save the same ID with different data')) {
        const upsertStart = j;
        let upsertEnd = j;
        // Find the matching delete line
        for (let k = j; k < lines.length; k++) {
          if (lines[k].includes('db.delete_canvas_tab_state')) {
            upsertEnd = k;
            break;
          }
        }
        
        const newUpsert = [
          '        // Upsert: save the same ID with higher version',
          '        let updated_state = CanvasTabState {',
          '            scale: 2.0,',
          '            pan_x: 0.0,',
          '            pan_y: 0.0,',
          '            sticky_notes: vec![],',
          '        };',
          '        let resp2 = db.save_canvas_tab_state(&updated_state, 2).unwrap();',
          '        assert!(resp2.accepted);',
          '        assert_eq!(resp2.current_version, 2);',
          '        assert_eq!(resp2.state.scale, 2.0);',
          '        assert_eq!(resp2.state.sticky_notes.len(), 0);',
          '',
          '        // Version conflict: try to save with stale version',
          '        let conflict = db.save_canvas_tab_state(&updated_state, 1);',
          '        assert!(conflict.is_err());',
          '        let err_msg = conflict.unwrap_err();',
          '        assert!(err_msg.starts_with("VERSION_CONFLICT:"), "Expected VERSION_CONFLICT, got: {}", err_msg);',
          '',
          '        // Delete',
        ];
        
        lines.splice(upsertStart, upsertEnd - upsertStart, ...newUpsert);
        break;
      }
    }
    
    console.log('Canvas state test updated');
    break;
  }
}

// 7. Add import/export tests at the end
// Find the last closing brace of the test module
let lastClose = lines.length - 1;
while (lastClose >= 0 && lines[lastClose].trim() !== '}') {
  lastClose--;
}

if (lastClose < 0) {
  console.error('Could not find test module close');
  process.exit(1);
}

const newTests = [
  '',
  '    // -•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-',
  '    //  P0-05: Export / Import / WikiLink tests',
  '    // -•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-•-',
  '',
  '    #[test]',
  '    fn test_parse_wiki_links() {',
  '        let links = parse_wiki_links("Hello [[World]]!");',
  '        assert_eq!(links, vec!["World"]);',
  '',
  '        let links = parse_wiki_links("See [[Target|display]] here");',
  '        assert_eq!(links, vec!["Target"]);',
  '',
  '        let links = parse_wiki_links("[[A]] and [[B]] and [[C|see]]");',
  '        assert_eq!(links, vec!["A", "B", "C"]);',
  '',
  '        let links: Vec<String> = parse_wiki_links("Plain text without links");',
  '        assert!(links.is_empty());',
  '',
  '        let links: Vec<String> = parse_wiki_links("");',
  '        assert!(links.is_empty());',
  '',
  '        let links = parse_wiki_links("[[unclosed");',
  '        assert!(links.is_empty());',
  '    }',
  '',
  '    #[test]',
  '    fn test_export_import_roundtrip() {',
  '        let db = setup_db();',
  '        let proj = db.create_project("Export Test", "科幻", "drafting", 15000, "[\"#ff0000\",\"#00ff00\"]").unwrap();',
  '',
  '        let obj1_id = uuid::Uuid::new_v4().to_string();',
  '        let obj1 = WorldObject {',
  '            id: obj1_id.clone(),',
  '            project_id: proj.id.clone(),',
  '            name: "Character One".to_string(),',
  '            object_type: "人物".to_string(),',
  '            status: "锁定".to_string(),',
  '            canon_level: "项目正典".to_string(),',
  '            tags: vec!["protagonist".to_string()],',
  '            aliases: vec![],',
  '            selected_boards: vec![],',
  '            content: "A test character.".to_string(),',
  '            references_count: 0,',
  '            judgment_history: vec![],',
  '            created_at: 0,',
  '            updated_at: 0,',
  '        };',
  '        db.create_world_object(&obj1).unwrap();',
  '',
  '        let obj2_id = uuid::Uuid::new_v4().to_string();',
  '        let obj2 = WorldObject {',
  '            id: obj2_id.clone(),',
  '            project_id: proj.id.clone(),',
  '            name: "Location One".to_string(),',
  '            object_type: "地点".to_string(),',
  '            status: "锁定".to_string(),',
  '            canon_level: "核心正典".to_string(),',
  '            tags: vec![],',
  '            aliases: vec![],',
  '            selected_boards: vec![],',
  '            content: "An important location.".to_string(),',
  '            references_count: 0,',
  '            judgment_history: vec![],',
  '            created_at: 0,',
  '            updated_at: 0,',
  '        };',
  '        db.create_world_object(&obj2).unwrap();',
  '',
  '        let conn_id = uuid::Uuid::new_v4().to_string();',
  '        db.create_connection(&ObjConnection {',
  '            id: conn_id.clone(),',
  '            project_id: proj.id.clone(),',
  '            source_id: obj1_id.clone(),',
  '            target_id: obj2_id.clone(),',
  '            connection_type: "发生于".to_string(),',
  '            label: "".to_string(),',
  '        }).unwrap();',
  '',
  '        let export_data = db.export_project_data(&proj.id).unwrap();',
  '        assert_eq!(export_data.project.name, "Export Test");',
  '        assert_eq!(export_data.objects.len(), 2);',
  '        assert_eq!(export_data.connections.len(), 1);',
  '',
  '        let import_result = db.import_project_data(&export_data).unwrap();',
  '        assert!(import_result.success);',
  '        assert_eq!(import_result.object_count, 2);',
  '        assert_eq!(import_result.connection_count, 1);',
  '        assert_eq!(import_result.project_name, "Export Test");',
  '',
  '        let imported_objects = db.list_world_objects(&import_result.project_id).unwrap();',
  '        assert_eq!(imported_objects.len(), 2);',
  '        let imported_connections = db.list_connections(&import_result.project_id).unwrap();',
  '        assert_eq!(imported_connections.len(), 1);',
  '    }',
];

lines.splice(lastClose, 0, ...newTests);
console.log('Import/export tests added');

// Write
fs.writeFileSync('db.rs', lines.join('\n'), 'utf-8');
console.log('db.rs transformation complete');
