use tauri::State;
use crate::db::Database;
use crate::models::*;

// ═══════════════════════════════════════════
//  Project Commands
// ═══════════════════════════════════════════

#[tauri::command]
pub fn list_projects(db: State<'_, Database>) -> Result<Vec<Project>, String> {
    db.list_projects().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_project(db: State<'_, Database>, id: String) -> Result<Option<Project>, String> {
    db.get_project(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_project(
    db: State<'_, Database>,
    name: String,
    genre: String,
    status: String,
    word_count: i64,
    gradient: String,
) -> Result<Project, String> {
    db.create_project(&name, &genre, &status, word_count, &gradient)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_project(db: State<'_, Database>, project: Project) -> Result<(), String> {
    db.update_project(&project).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_project(db: State<'_, Database>, id: String) -> Result<(), String> {
    db.delete_project(&id).map_err(|e| e.to_string())
}

// ═══════════════════════════════════════════
//  WorldObject Commands
// ═══════════════════════════════════════════

#[tauri::command]
pub fn list_world_objects(
    db: State<'_, Database>,
    project_id: String,
) -> Result<Vec<WorldObject>, String> {
    db.list_world_objects(&project_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_world_object(
    db: State<'_, Database>,
    id: String,
) -> Result<Option<WorldObject>, String> {
    db.get_world_object(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_world_object(
    db: State<'_, Database>,
    object: WorldObject,
) -> Result<WorldObject, String> {
    db.create_world_object(&object).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_world_object(
    db: State<'_, Database>,
    object: WorldObject,
) -> Result<(), String> {
    db.update_world_object(&object).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_world_object(
    db: State<'_, Database>,
    id: String,
) -> Result<(), String> {
    db.delete_world_object(&id).map_err(|e| e.to_string())
}

// ═══════════════════════════════════════════
//  JudgmentRecord Commands
// ═══════════════════════════════════════════

#[tauri::command]
pub fn list_judgment_records(
    db: State<'_, Database>,
    project_id: String,
) -> Result<Vec<JudgmentRecord>, String> {
    db.list_judgment_records(&project_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn append_judgment_record(
    db: State<'_, Database>,
    record: JudgmentRecord,
) -> Result<JudgmentRecord, String> {
    db.append_judgment_record(&record).map_err(|e| e.to_string())
}

// ═══════════════════════════════════════════
//  Connection Commands
// ═══════════════════════════════════════════

#[tauri::command]
pub fn list_connections(
    db: State<'_, Database>,
    project_id: String,
) -> Result<Vec<Connection>, String> {
    db.list_connections(&project_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_connection(
    db: State<'_, Database>,
    connection: Connection,
) -> Result<Connection, String> {
    db.create_connection(&connection).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_connection(
    db: State<'_, Database>,
    id: String,
) -> Result<(), String> {
    db.delete_connection(&id).map_err(|e| e.to_string())
}

// ═══════════════════════════════════════════
//  CanvasTabState Commands
// ═══════════════════════════════════════════

#[tauri::command]
pub fn list_canvas_tab_states(
    db: State<'_, Database>,
    project_id: String,
) -> Result<Vec<CanvasTabState>, String> {
    db.list_canvas_tab_states(&project_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_canvas_tab_state(
    db: State<'_, Database>,
    state: CanvasTabState,
) -> Result<CanvasTabState, String> {
    db.save_canvas_tab_state(&state).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_canvas_tab_state(
    db: State<'_, Database>,
    id: String,
) -> Result<(), String> {
    db.delete_canvas_tab_state(&id).map_err(|e| e.to_string())
}
