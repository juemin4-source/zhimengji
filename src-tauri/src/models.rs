use serde::{Deserialize, Serialize};

// ── Project ──
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

// ── JudgmentRecord ──
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

// ── WorldObject ──
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

// ── Connection ──
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

// ── CanvasTabState ──
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

// ── CanvasNodePosition ──
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct CanvasNodePosition {
    pub object_id: String,
    pub x: f64,
    pub y: f64,
}

// ── StickyNote ──
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

// ── DB Row types (for SQLite storage with JSON columns) ──

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
