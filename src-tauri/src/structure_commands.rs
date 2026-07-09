use tauri::State;
use crate::db::Database;
use crate::models::{
    CreateStructureNodeInput, DeleteStructureNodeInput, GetStructureNodeInput,
    ListStructureNodeInput, StructureNode, UpdateStructureNodeInput,
};

#[tauri::command]
pub fn create_structure_node(
    db: State<'_, Database>,
    input: CreateStructureNodeInput,
) -> Result<StructureNode, String> {
    db.create_structure_node(&input).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_structure_nodes(
    db: State<'_, Database>,
    input: ListStructureNodeInput,
) -> Result<Vec<StructureNode>, String> {
    db.list_structure_nodes(&input.project_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_structure_node(
    db: State<'_, Database>,
    input: GetStructureNodeInput,
) -> Result<Option<StructureNode>, String> {
    db.get_structure_node(&input.id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_structure_node(
    db: State<'_, Database>,
    input: UpdateStructureNodeInput,
) -> Result<StructureNode, String> {
    db.update_structure_node(&input).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_structure_node(
    db: State<'_, Database>,
    input: DeleteStructureNodeInput,
) -> Result<(), String> {
    db.delete_structure_node(&input.id).map_err(|e| e.to_string())
}
