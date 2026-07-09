mod byok;
mod byok_commands;
mod chapter_packet_commands;
mod commands;
mod db;
mod decision_log_commands;
mod models;
mod pipeline_commands;
mod premise_commands;
mod setting_commands;
mod structure_commands;

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
            // v2 PremiseCard commands
            premise_commands::create_premise_card,
            premise_commands::list_premise_cards,
            premise_commands::get_premise_card,
            premise_commands::update_premise_card,
            premise_commands::delete_premise_card,
            // v2 StructureNode commands
            structure_commands::create_structure_node,
            structure_commands::list_structure_nodes,
            structure_commands::get_structure_node,
            structure_commands::update_structure_node,
            structure_commands::delete_structure_node,
            // v2 WorldRule commands
            setting_commands::create_world_rule,
            setting_commands::list_world_rules,
            setting_commands::get_world_rule,
            setting_commands::update_world_rule,
            setting_commands::delete_world_rule,
            // v2 CharacterCard commands
            setting_commands::create_character_card,
            setting_commands::list_character_cards,
            setting_commands::get_character_card,
            setting_commands::update_character_card,
            setting_commands::delete_character_card,
            // v2 FactionCard commands
            setting_commands::create_faction_card,
            setting_commands::list_faction_cards,
            setting_commands::get_faction_card,
            setting_commands::update_faction_card,
            setting_commands::delete_faction_card,
            // v2 ChapterPacket commands
            chapter_packet_commands::create_chapter_packet,
            chapter_packet_commands::list_chapter_packets,
            chapter_packet_commands::get_chapter_packet,
            chapter_packet_commands::update_chapter_packet_layers,
            chapter_packet_commands::confirm_chapter_packet,
            chapter_packet_commands::delete_chapter_packet,
            // v2 DecisionLog commands
            decision_log_commands::append_decision_log,
            decision_log_commands::list_decision_logs,
            decision_log_commands::get_decision_log,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
