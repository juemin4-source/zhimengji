use tauri::State;
use crate::db::Database;
use crate::models::{
    ChapterPacket, CreateChapterPacketInput, UpdateChapterPacketLayersInput,
    ListChapterPacketsInput, GetChapterPacketInput, ConfirmChapterPacketInput,
    DeleteChapterPacketInput,
    // CN-MET-04
    SetDetailModeInput, GetPacketDetailInput, AutoGenerateSketchInput,
    SaveRefinedContentInput, PacketDetailConfig, PacketDetailResponse,
};

#[tauri::command]
pub fn create_chapter_packet(
    db: State<'_, Database>,
    input: CreateChapterPacketInput,
) -> Result<ChapterPacket, String> {
    db.create_chapter_packet(&input).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_chapter_packets(
    db: State<'_, Database>,
    input: ListChapterPacketsInput,
) -> Result<Vec<ChapterPacket>, String> {
    db.list_chapter_packets(&input.project_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_chapter_packet(
    db: State<'_, Database>,
    input: GetChapterPacketInput,
) -> Result<Option<ChapterPacket>, String> {
    db.get_chapter_packet(&input.id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_chapter_packet_layers(
    db: State<'_, Database>,
    input: UpdateChapterPacketLayersInput,
) -> Result<ChapterPacket, String> {
    db.update_chapter_packet_layers(&input).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn confirm_chapter_packet(
    db: State<'_, Database>,
    input: ConfirmChapterPacketInput,
) -> Result<ChapterPacket, String> {
    db.confirm_chapter_packet(&input.packet_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_chapter_packet(
    db: State<'_, Database>,
    input: DeleteChapterPacketInput,
) -> Result<(), String> {
    db.delete_chapter_packet(&input.id).map_err(|e| e.to_string())
}

// ===== CN-MET-04: Detail Mode Commands =====

#[tauri::command]
pub fn set_detail_mode(
    db: State<'_, Database>,
    input: SetDetailModeInput,
) -> Result<PacketDetailConfig, String> {
    db.set_detail_mode(&input).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_packet_detail(
    db: State<'_, Database>,
    input: GetPacketDetailInput,
) -> Result<PacketDetailResponse, String> {
    db.get_packet_detail(&input.project_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn auto_generate_sketch(
    db: State<'_, Database>,
    input: AutoGenerateSketchInput,
) -> Result<PacketDetailResponse, String> {
    db.auto_generate_sketch(&input.project_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_refined_content(
    db: State<'_, Database>,
    input: SaveRefinedContentInput,
) -> Result<PacketDetailResponse, String> {
    db.save_refined_content(&input).map_err(|e| e.to_string())
}
