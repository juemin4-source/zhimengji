use serde::{Deserialize, Serialize};

// 鈹€鈹€ Project 鈹€鈹€
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub genre: String,
    pub status: String,
    pub word_count: i64,
    /// JSON array string e.g. '["#color1","#color2"]'
    pub gradient: String,
    pub created_at: i64,
    pub updated_at: i64,
}

// 鈹€鈹€ JudgmentRecord 鈹€鈹€
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JudgmentRecord {
    pub id: String,
    pub object_id: String,
    pub object_name: String,
    pub operation_type: String,
    pub reason: String,
    pub timestamp: i64,
    pub previous_status: String,
    pub new_status: String,
}

// 鈹€鈹€ WorldObject 鈹€鈹€
// Replaces: StoryNode + SettingCard + NarrativeUnit + NodeGroup
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorldObject {
    pub id: String,
    pub project_id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub object_type: String,
    pub status: String,
    pub canon_level: String,
    pub tags: Vec<String>,
    pub aliases: Vec<String>,
    pub selected_boards: Vec<String>,
    pub content: String,
    pub references_count: i32,
    pub judgment_history: Vec<JudgmentRecord>,
    pub created_at: i64,
    pub updated_at: i64,
}

// 鈹€鈹€ Connection 鈹€鈹€
// Replaces: Link + NarrativeRelationship
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Connection {
    pub id: String,
    pub project_id: String,
    pub source_id: String,
    pub target_id: String,
    #[serde(rename = "type")]
    pub connection_type: String,
    pub label: String,
}

// 鈹€鈹€ CanvasTabState 鈹€鈹€
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CanvasTabState {
    pub id: String,
    pub project_id: String,
    pub tab_id: String,
    /// Accepts Vec<CanvasNodePosition> OR Record<string, CanvasNodePosition>
    pub positions: serde_json::Value,
    pub sticky_notes: Vec<StickyNote>,
    pub connections: Vec<Connection>,
    pub scale: f64,
    pub pan_x: f64,
    pub pan_y: f64,
    #[serde(default)]
    pub created_at: i64,
    #[serde(default)]
    pub updated_at: i64,
}

// 鈹€鈹€ CanvasNodePosition 鈹€鈹€
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct CanvasNodePosition {
    pub object_id: String,
    pub x: f64,
    pub y: f64,
}

// 鈹€鈹€ StickyNote 鈹€鈹€
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StickyNote {
    pub id: String,
    pub text: String,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub color: String,
}

// 鈹€鈹€ DB Row types (for SQLite storage with JSON columns) 鈹€鈹€

/// Internal row representation of WorldObject for DB storage.
/// JSON arrays are stored as TEXT columns.
#[derive(Debug, Clone)]
pub struct WorldObjectRow {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub object_type: String,
    pub status: String,
    pub canon_level: String,
    pub tags: String,              // JSON array
    pub aliases: String,           // JSON array
    pub selected_boards: String,   // JSON array
    pub content: String,
    pub references_count: i32,
    pub created_at: i64,
    pub updated_at: i64,
}

impl WorldObjectRow {
    pub fn to_api(self, judgment_records: Vec<JudgmentRecord>) -> WorldObject {
        WorldObject {
            id: self.id,
            project_id: self.project_id,
            name: self.name,
            object_type: self.object_type,
            status: self.status,
            canon_level: self.canon_level,
            tags: serde_json::from_str(&self.tags).unwrap_or_default(),
            aliases: serde_json::from_str(&self.aliases).unwrap_or_default(),
            selected_boards: serde_json::from_str(&self.selected_boards).unwrap_or_default(),
            content: self.content,
            references_count: self.references_count,
            judgment_history: judgment_records,
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}

/// Internal row representation of CanvasTabState for DB storage.
/// positions, sticky_notes, connections stored as JSON TEXT columns.
#[derive(Debug, Clone)]
pub struct CanvasTabStateRow {
    pub id: String,
    pub project_id: String,
    pub tab_id: String,
    pub positions: String,     // JSON array of CanvasNodePosition
    pub sticky_notes: String,  // JSON array of StickyNote
    pub connections: String,   // JSON array of Connection
    pub scale: f64,
    pub pan_x: f64,
    pub pan_y: f64,
    pub created_at: i64,
    pub updated_at: i64,
}

impl CanvasTabStateRow {
    pub fn to_api(self) -> CanvasTabState {
        CanvasTabState {
            id: self.id,
            project_id: self.project_id,
            tab_id: self.tab_id,
            positions: serde_json::from_str(&self.positions).unwrap_or_default(),
            sticky_notes: serde_json::from_str(&self.sticky_notes).unwrap_or_default(),
            connections: serde_json::from_str(&self.connections).unwrap_or_default(),
            scale: self.scale,
            pan_x: self.pan_x,
            pan_y: self.pan_y,
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}

// -- P0-04: Versioned canvas tab state and response --

/// CanvasTabState with a version stamp for conflict detection (P0-04)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CanvasTabStateVersioned {
    /// The actual canvas tab state fields
    pub id: String,
    pub project_id: String,
    pub tab_id: String,
    pub positions: serde_json::Value,
    pub sticky_notes: Vec<StickyNote>,
    pub connections: Vec<Connection>,
    pub scale: f64,
    pub pan_x: f64,
    pub pan_y: f64,
    #[serde(default)]
    pub created_at: i64,
    #[serde(default)]
    pub updated_at: i64,
    /// Monotonic version stamp for conflict detection
    pub version: i64,
}

/// Response from save_canvas_tab_state (P0-04)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveCanvasTabStateResponse {
    pub state: CanvasTabState,
    pub accepted: bool,
    pub current_version: i64,
}

// -- P0-05: Export / Import --

/// Result returned from export_project command (P0-05)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportResult {
    pub success: bool,
    pub path: String,
    pub object_count: usize,
    pub connection_count: usize,
}

/// Result returned from import_project command (P0-05)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    pub success: bool,
    pub project_id: String,
    pub project_name: String,
    pub object_count: usize,
    pub connection_count: usize,
}

/// Full project data serialized into the .zhimengji zip manifest (P0-05)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectExportData {
    pub project: Project,
    pub objects: Vec<WorldObject>,
    pub connections: Vec<Connection>,
    pub canvas_states: Vec<CanvasTabState>,
}

// ===== v2 PipelineState =====

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PipelineState {
    pub project_id: String,
    pub current_stage: String,
    pub canvas_stages: Vec<CanvasStageState>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CanvasStageState {
    pub stage: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetPipelineStateInput {
    pub project_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavePipelineStateInput {
    pub state: PipelineState,
}

// ===== v2 PremiseCard =====

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PremiseCard {
    pub id: String,
    pub project_id: String,
    pub premise_text: String,
    /// JSON array of reader questions
    pub reader_questions: String,
    pub story_type: String,
    pub status: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePremiseInput {
    pub project_id: String,
    pub premise_text: String,
    pub reader_questions: String,
    pub story_type: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePremiseInput {
    pub id: String,
    pub premise_text: String,
    pub reader_questions: String,
    pub story_type: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListPremiseInput {
    pub project_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetPremiseInput {
    pub id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeletePremiseInput {
    pub id: String,
}

// ===== v2 StructureNode =====

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StructureNode {
    pub id: String,
    pub project_id: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub node_type: String,
    pub narrative_function: String,
    pub summary: String,
    pub position_x: f64,
    pub position_y: f64,
    pub sort_order: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateStructureNodeInput {
    pub project_id: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub node_type: String,
    pub narrative_function: String,
    pub summary: String,
    pub position_x: f64,
    pub position_y: f64,
    pub sort_order: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateStructureNodeInput {
    pub id: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub node_type: String,
    pub narrative_function: String,
    pub summary: String,
    pub position_x: f64,
    pub position_y: f64,
    pub sort_order: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListStructureNodeInput {
    pub project_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetStructureNodeInput {
    pub id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteStructureNodeInput {
    pub id: String,
}

// ===== v2 WorldRule =====

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorldRule {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub rule_text: String,
    pub cost: String,
    pub enforcer: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateWorldRuleInput {
    pub project_id: String,
    pub title: String,
    pub rule_text: String,
    pub cost: String,
    pub enforcer: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateWorldRuleInput {
    pub id: String,
    pub title: String,
    pub rule_text: String,
    pub cost: String,
    pub enforcer: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListWorldRuleInput {
    pub project_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetWorldRuleInput {
    pub id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteWorldRuleInput {
    pub id: String,
}

// ===== v2 CharacterCard =====

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CharacterCard {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub hook: String,
    pub current_want: String,
    pub real_block: String,
    pub archetype: String,
    pub description: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCharacterCardInput {
    pub project_id: String,
    pub name: String,
    pub hook: String,
    pub current_want: String,
    pub real_block: String,
    pub archetype: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCharacterCardInput {
    pub id: String,
    pub name: String,
    pub hook: String,
    pub current_want: String,
    pub real_block: String,
    pub archetype: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListCharacterCardInput {
    pub project_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetCharacterCardInput {
    pub id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteCharacterCardInput {
    pub id: String,
}

// ===== v2 FactionCard =====

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FactionCard {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub true_goal: String,
    pub public_slogan: String,
    /// JSON array of resource strings
    pub resources: String,
    /// JSON array of character IDs
    pub representative_character_ids: String,
    pub daily_interface: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateFactionCardInput {
    pub project_id: String,
    pub name: String,
    pub true_goal: String,
    pub public_slogan: String,
    pub resources: String,
    pub representative_character_ids: String,
    pub daily_interface: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateFactionCardInput {
    pub id: String,
    pub name: String,
    pub true_goal: String,
    pub public_slogan: String,
    pub resources: String,
    pub representative_character_ids: String,
    pub daily_interface: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListFactionCardInput {
    pub project_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetFactionCardInput {
    pub id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteFactionCardInput {
    pub id: String,
}

// ===== v2 ChapterPacket =====

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChapterPacket {
    pub id: String,
    pub project_id: String,
    pub structure_node_id: Option<String>,
    pub chapter_number: i64,
    pub title: String,
    pub line: String,
    pub position: String,
    pub chapter_function: String,
    // 四层 JSON 字符串（前端反序列化为 TS interface）
    pub layer1: String,
    pub layer2: String,
    pub layer3: String,
    pub layer4: String,
    pub status: String,
    pub mode: String,
    pub assumption_count: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateChapterPacketInput {
    pub project_id: String,
    pub structure_node_id: String,
    pub chapter_number: i64,
    pub title: String,
    pub line: Option<String>,
    pub position: String,
    pub chapter_function: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateChapterPacketLayersInput {
    pub packet_id: String,
    pub layer1: Option<String>,
    pub layer2: Option<String>,
    pub layer3: Option<String>,
    pub layer4: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListChapterPacketsInput {
    pub project_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetChapterPacketInput {
    pub id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfirmChapterPacketInput {
    pub packet_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteChapterPacketInput {
    pub id: String,
}

// DB Row（JSON 列用 String 存储）
#[derive(Debug, Clone)]
pub struct ChapterPacketRow {
    pub id: String,
    pub project_id: String,
    pub structure_node_id: Option<String>,
    pub chapter_number: i64,
    pub title: String,
    pub line: String,
    pub position: String,
    pub chapter_function: String,
    pub layer1: String,
    pub layer2: String,
    pub layer3: String,
    pub layer4: String,
    pub status: String,
    pub mode: String,
    pub assumption_count: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

impl ChapterPacketRow {
    pub fn to_api(self) -> ChapterPacket {
        ChapterPacket {
            id: self.id,
            project_id: self.project_id,
            structure_node_id: self.structure_node_id,
            chapter_number: self.chapter_number,
            title: self.title,
            line: self.line,
            position: self.position,
            chapter_function: self.chapter_function,
            layer1: self.layer1,
            layer2: self.layer2,
            layer3: self.layer3,
            layer4: self.layer4,
            status: self.status,
            mode: self.mode,
            assumption_count: self.assumption_count,
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}

// ===== v2 DecisionLog =====

/// DecisionLogEntry — 追加型审计记录（D 轮新建）。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DecisionLogEntry {
    pub id: String,
    pub project_id: String,
    pub operation: String,
    pub entity_type: String,
    pub entity_id: String,
    pub summary: String,
    pub details: String,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppendDecisionLogInput {
    pub project_id: String,
    pub operation: String,
    pub summary: String,
    pub entity_type: Option<String>,
    pub entity_id: Option<String>,
    pub details: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListDecisionLogsInput {
    pub project_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetDecisionLogInput {
    pub id: String,
}

/// DB Row representation of DecisionLogEntry for SQLite storage.
#[derive(Debug, Clone)]
pub struct DecisionLogRow {
    pub id: String,
    pub project_id: String,
    pub operation: String,
    pub entity_type: String,
    pub entity_id: String,
    pub summary: String,
    pub details: String,
    pub created_at: i64,
}

impl DecisionLogRow {
    pub fn to_api(self) -> DecisionLogEntry {
        DecisionLogEntry {
            id: self.id,
            project_id: self.project_id,
            operation: self.operation,
            entity_type: self.entity_type,
            entity_id: self.entity_id,
            summary: self.summary,
            details: self.details,
            created_at: self.created_at,
        }
    }
}