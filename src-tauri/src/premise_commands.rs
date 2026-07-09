use tauri::State;
use crate::db::Database;
use crate::models::{
    CreatePremiseInput, DeletePremiseInput, GetPremiseInput, ListPremiseInput,
    PremiseCard, UpdatePremiseInput,
};

#[tauri::command]
pub fn create_premise_card(
    db: State<'_, Database>,
    input: CreatePremiseInput,
) -> Result<PremiseCard, String> {
    db.create_premise_card(&input).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_premise_cards(
    db: State<'_, Database>,
    input: ListPremiseInput,
) -> Result<Vec<PremiseCard>, String> {
    db.list_premise_cards(&input.project_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_premise_card(
    db: State<'_, Database>,
    input: GetPremiseInput,
) -> Result<Option<PremiseCard>, String> {
    db.get_premise_card(&input.id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_premise_card(
    db: State<'_, Database>,
    input: UpdatePremiseInput,
) -> Result<PremiseCard, String> {
    db.update_premise_card(&input).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_premise_card(
    db: State<'_, Database>,
    input: DeletePremiseInput,
) -> Result<(), String> {
    db.delete_premise_card(&input.id).map_err(|e| e.to_string())
}
