use tauri::{AppHandle, State};

use crate::byok::{key_manager, llm_client, usage_tracker};
use crate::byok::{ChatMessage, ProviderInfo, TestResult, UsageStats};
use crate::db::Database;

#[tauri::command]
pub fn store_api_key(
    db: State<'_, Database>,
    provider: String,
    key: String,
) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    key_manager::store_key(&conn, &provider, &key)?;
    Ok(())
}

#[tauri::command]
pub fn get_api_key(db: State<'_, Database>, provider: String) -> Result<bool, String> {
    let conn = db.conn.lock().unwrap();
    Ok(key_manager::get_key(&conn, &provider).is_some())
}

#[tauri::command]
pub fn remove_api_key(db: State<'_, Database>, provider: String) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    key_manager::remove_key(&conn, &provider)?;
    Ok(())
}

#[tauri::command]
pub fn list_providers(db: State<'_, Database>) -> Result<Vec<ProviderInfo>, String> {
    let conn = db.conn.lock().unwrap();
    key_manager::list_providers(&conn)
}

#[tauri::command]
pub async fn test_connection(
    db: State<'_, Database>,
    provider: String,
    model: String,
    custom_endpoint: Option<String>,
) -> Result<TestResult, String> {
    let result = llm_client::test_connection(&*db, &provider, &model, custom_endpoint).await;
    Ok(result)
}

#[tauri::command]
pub async fn call_llm(
    app: AppHandle,
    db: State<'_, Database>,
    provider: String,
    model: String,
    messages: Vec<ChatMessage>,
    custom_endpoint: Option<String>,
) -> Result<(), String> {
    let api_key = {
        let conn = db.conn.lock().unwrap();
        key_manager::get_key(&conn, &provider)
            .ok_or_else(|| format!("API key not found for provider: {}", provider))?
    };

    let endpoint = custom_endpoint
        .or_else(|| llm_client::get_default_endpoint(&provider))
        .ok_or_else(|| format!("No default endpoint for provider: {}", provider))?;

    let app_handle = app.clone();
    tokio::spawn(async move {
        llm_client::call_chat_completion_stream(
            app_handle,
            api_key,
            endpoint,
            model,
            messages,
        )
        .await;
    });

    Ok(())
}

#[tauri::command]
pub fn get_usage_stats(db: State<'_, Database>) -> Result<UsageStats, String> {
    let conn = db.conn.lock().unwrap();
    usage_tracker::get_usage_stats(&conn)
}

#[tauri::command]
pub fn set_budget_limit(db: State<'_, Database>, limit: i64) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    usage_tracker::set_budget_limit(&conn, limit)?;
    Ok(())
}
