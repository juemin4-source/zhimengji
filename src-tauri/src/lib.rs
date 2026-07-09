mod byok;
mod byok_commands;
mod commands;
mod db;
mod models;
mod pipeline_commands;

use db::Database;
use std::fs;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().expect("Failed to get app data dir");
            fs::create_dir_all(&app_data_dir).expect("Failed to create app data dir");
            let db_path = app_data_dir.join("zhimengji.db");
            let database = Database::new(db_path.to_str().expect("Invalid db path"))
                .expect("Failed to initialize database");

            // Initialize BYOK tables
            {
                let conn = database.conn.lock().unwrap();
                byok::key_manager::init_tables(&conn)
                    .expect("Failed to init BYOK key tables");
                byok::usage_tracker::init_tables(&conn)
                    .expect("Failed to init BYOK usage tables");
            }

            app.manage(database);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Project
            commands::list_projects,
            commands::get_project,
            commands::create_project,
            commands::update_project,
            commands::delete_project,
            // WorldObject
            commands::list_world_objects,
            commands::get_world_object,
            commands::create_world_object,
            commands::update_world_object,
            commands::delete_world_object,
            // JudgmentRecord
            commands::list_judgment_records,
            commands::append_judgment_record,
            // Connection
            commands::list_connections,
            commands::create_connection,
            commands::delete_connection,
            // CanvasTabState
            commands::list_canvas_tab_states,
            commands::save_canvas_tab_state,
            commands::delete_canvas_tab_state,
            // v1.2 commands
            commands::ping,
            commands::export_project,
            commands::import_project,
            // v1.3 BYOK commands
            byok_commands::store_api_key,
            byok_commands::get_api_key,
            byok_commands::remove_api_key,
            byok_commands::list_providers,
            byok_commands::test_connection,
            byok_commands::call_llm,
            byok_commands::get_usage_stats,
            byok_commands::set_budget_limit,
            // v2 PipelineState commands
            pipeline_commands::get_pipeline_state,
            pipeline_commands::save_pipeline_state,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
