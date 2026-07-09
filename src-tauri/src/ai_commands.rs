use tauri::State;
use crate::db::Database;
use crate::models::{
    AiBuiltContext, AiEvaluationResult, AiParseOutput, AiProviderConfig, AiRouteOutput,
    AiRouteInput, BuildContextInput, AiParseInput, AiSkillRecord, ListSkillsOutput,
    ListSkillsInput, GetSkillInput, SaveProviderConfigInput, DeleteProviderConfigInput,
    TestProviderConnectionInput, RunEvaluationInput,
};

// ===== AI Context Commands =====

/// Build AI context for a given canvas and output type (W02 will implement)
#[tauri::command]
pub fn build_context(
    _db: State<'_, Database>,
    _input: BuildContextInput,
) -> Result<AiBuiltContext, String> {
    Err("not implemented: build_context will be realized in W02".to_string())
}

/// Route user intent based on message analysis (W02 will implement)
#[tauri::command]
pub fn route_intent(
    _db: State<'_, Database>,
    _input: AiRouteInput,
) -> Result<AiRouteOutput, String> {
    Err("not implemented: route_intent will be realized in W02".to_string())
}

// ===== AI Parser Commands =====

/// Parse and validate structured AI output (W03 will implement)
#[tauri::command]
pub fn parse_output(
    _db: State<'_, Database>,
    _input: AiParseInput,
) -> Result<AiParseOutput, String> {
    Err("not implemented: parse_output will be realized in W03".to_string())
}

// ===== AI Skill Registry Commands =====

/// List all registered AI skills (W04 will implement)
#[tauri::command]
pub fn list_skills(
    _db: State<'_, Database>,
    _input: ListSkillsInput,
) -> Result<ListSkillsOutput, String> {
    Err("not implemented: list_skills will be realized in W04".to_string())
}

/// Get a single AI skill by ID (W04 will implement)
#[tauri::command]
pub fn get_skill(
    _db: State<'_, Database>,
    _input: GetSkillInput,
) -> Result<Option<AiSkillRecord>, String> {
    Err("not implemented: get_skill will be realized in W04".to_string())
}

// ===== AI Provider Commands =====

/// List all configured AI providers (v2)
#[tauri::command]
pub fn list_providers_v2(
    _db: State<'_, Database>,
) -> Result<Vec<AiProviderConfig>, String> {
    Err("not implemented: list_providers_v2 will be realized in W05".to_string())
}

/// Save or update an AI provider configuration
#[tauri::command]
pub fn save_provider_config(
    _db: State<'_, Database>,
    _input: SaveProviderConfigInput,
) -> Result<AiProviderConfig, String> {
    Err("not implemented: save_provider_config will be realized in W05".to_string())
}

/// Delete an AI provider configuration
#[tauri::command]
pub fn delete_provider_config(
    _db: State<'_, Database>,
    _input: DeleteProviderConfigInput,
) -> Result<(), String> {
    Err("not implemented: delete_provider_config will be realized in W05".to_string())
}

/// Test an AI provider connection
#[tauri::command]
pub fn test_provider_connection(
    _db: State<'_, Database>,
    _input: TestProviderConnectionInput,
) -> Result<bool, String> {
    Err("not implemented: test_provider_connection will be realized in W05".to_string())
}

// ===== AI Evaluation Commands =====

/// Run an AI evaluation against a provider
#[tauri::command]
pub fn run_evaluation(
    _db: State<'_, Database>,
    _input: RunEvaluationInput,
) -> Result<AiEvaluationResult, String> {
    Err("not implemented: run_evaluation will be realized in W05".to_string())
}
