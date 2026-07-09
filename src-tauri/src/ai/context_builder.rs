// AI Context Builder v2 — W02
//
// Constructs a unified AI context from current canvas data and upstream
// canvas data based on the canvas hierarchy:
//   premise (no upstream) < structure < setting < packet < text
//
// Missing upstream data is handled gracefully: available data only, no panic.

use crate::db::Database;
use crate::models::{AiBuiltContext, BuildContextInput};
use serde_json::json;

/// Main entry: build an AI context from the given input.
///
/// Returns available data only when upstream canvases are empty.
pub fn build_context(input: &BuildContextInput, db: &Database) -> Result<AiBuiltContext, String> {
    let canvas_type = resolve_canvas_type(&input.canvas_id, &input.project_id, db)?;

    let context_data = load_upstream_json(&canvas_type, &input.project_id, db)?;

    let additional = input.additional_prompt.as_deref().unwrap_or("");
    let system_prompt = compose_system_prompt(&canvas_type, &input.output_type, additional);

    let (writable, forbidden) = resolve_targets(&input.output_type, &canvas_type);

    Ok(AiBuiltContext {
        system_prompt,
        context_data,
        writable_targets: writable,
        forbidden_targets: forbidden,
        output_format: input.output_type.clone(),
        skill_id: None,
    })
}

// ---------------------------------------------------------------------------
// Canvas type resolution
// ---------------------------------------------------------------------------

fn resolve_canvas_type(canvas_id: &str, project_id: &str, db: &Database) -> Result<String, String> {
    // Strategy 1: look up canvas_tab_states and match tab_id / id
    if let Ok(states) = db.list_canvas_tab_states(project_id) {
        for state in &states {
            if state.tab_id == canvas_id || state.id == canvas_id {
                return Ok(infer_type_from_tab_id(&state.tab_id));
            }
        }
    }

    // Strategy 2: try canvas_id as a literal type name
    let lower = canvas_id.to_lowercase();
    for t in &["premise", "structure", "setting", "packet", "text"] {
        if lower == *t || lower.contains(t) {
            return Ok(t.to_string());
        }
    }

    // Fallback: premise has no upstream dependencies, safest default
    Ok("premise".to_string())
}

fn infer_type_from_tab_id(tab_id: &str) -> String {
    let lower = tab_id.to_lowercase();
    if lower.contains("premise") {
        return "premise".into();
    }
    if lower.contains("structure") || lower.contains("plot") {
        return "structure".into();
    }
    if lower.contains("setting") || lower.contains("world") || lower.contains("rule") {
        return "setting".into();
    }
    if lower.contains("packet") || lower.contains("chapter") {
        return "packet".into();
    }
    if lower.contains("text") || lower.contains("draft") || lower.contains("edit") {
        return "text".into();
    }
    "premise".into()
}

// ---------------------------------------------------------------------------
// Upstream data loading per canvas type
// ---------------------------------------------------------------------------
//
// Hierarchy: premise < structure < setting < packet < text
// Each level includes its own data plus all upstream data.
// Missing tables return an empty section rather than an error.

fn load_upstream_json(canvas_type: &str, project_id: &str, db: &Database) -> Result<String, String> {
    let mut data = serde_json::Map::new();

    // premise data (base level)
    let premise: Vec<serde_json::Value> = db
        .list_premise_cards(project_id)
        .map_err(|e| format!("DB error loading premise: {}", e))?
        .into_iter()
        .map(|c| serde_json::to_value(c).unwrap_or_default())
        .collect();
    data.insert("premise".into(), json!(premise));

    // Only include upstream data if canvas type requires it
    match canvas_type {
        "premise" => {
            // No upstream data
        }
        "structure" => {
            let nodes: Vec<serde_json::Value> = db
                .list_structure_nodes(project_id)
                .map_err(|e| format!("DB error loading structure: {}", e))?
                .into_iter()
                .map(|n| serde_json::to_value(n).unwrap_or_default())
                .collect();
            data.insert("structureNodes".into(), json!(nodes));
        }
        "setting" => {
            // Structure
            let nodes: Vec<serde_json::Value> = db
                .list_structure_nodes(project_id)
                .map_err(|e| format!("DB error loading structure: {}", e))?
                .into_iter()
                .map(|n| serde_json::to_value(n).unwrap_or_default())
                .collect();
            data.insert("structureNodes".into(), json!(nodes));

            // World rules
            let rules: Vec<serde_json::Value> = db
                .list_world_rules(project_id)
                .map_err(|e| format!("DB error loading world rules: {}", e))?
                .into_iter()
                .map(|r| serde_json::to_value(r).unwrap_or_default())
                .collect();
            data.insert("worldRules".into(), json!(rules));

            // Character cards
            let chars: Vec<serde_json::Value> = db
                .list_character_cards(project_id)
                .map_err(|e| format!("DB error loading characters: {}", e))?
                .into_iter()
                .map(|c| serde_json::to_value(c).unwrap_or_default())
                .collect();
            data.insert("characterCards".into(), json!(chars));
        }
        "packet" => {
            // Structure
            let nodes: Vec<serde_json::Value> = db
                .list_structure_nodes(project_id)
                .map_err(|e| format!("DB error loading structure: {}", e))?
                .into_iter()
                .map(|n| serde_json::to_value(n).unwrap_or_default())
                .collect();
            data.insert("structureNodes".into(), json!(nodes));

            // World rules
            let rules: Vec<serde_json::Value> = db
                .list_world_rules(project_id)
                .map_err(|e| format!("DB error loading world rules: {}", e))?
                .into_iter()
                .map(|r| serde_json::to_value(r).unwrap_or_default())
                .collect();
            data.insert("worldRules".into(), json!(rules));

            // Character cards
            let chars: Vec<serde_json::Value> = db
                .list_character_cards(project_id)
                .map_err(|e| format!("DB error loading characters: {}", e))?
                .into_iter()
                .map(|c| serde_json::to_value(c).unwrap_or_default())
                .collect();
            data.insert("characterCards".into(), json!(chars));

            // Chapter packets
            let packets: Vec<serde_json::Value> = db
                .list_chapter_packets(project_id)
                .map_err(|e| format!("DB error loading packets: {}", e))?
                .into_iter()
                .map(|p| serde_json::to_value(p).unwrap_or_default())
                .collect();
            data.insert("chapterPackets".into(), json!(packets));
        }
        "text" => {
            // World rules
            let rules: Vec<serde_json::Value> = db
                .list_world_rules(project_id)
                .map_err(|e| format!("DB error loading world rules: {}", e))?
                .into_iter()
                .map(|r| serde_json::to_value(r).unwrap_or_default())
                .collect();
            data.insert("worldRules".into(), json!(rules));

            // Character cards
            let chars: Vec<serde_json::Value> = db
                .list_character_cards(project_id)
                .map_err(|e| format!("DB error loading characters: {}", e))?
                .into_iter()
                .map(|c| serde_json::to_value(c).unwrap_or_default())
                .collect();
            data.insert("characterCards".into(), json!(chars));

            // Chapter packets
            let packets: Vec<serde_json::Value> = db
                .list_chapter_packets(project_id)
                .map_err(|e| format!("DB error loading packets: {}", e))?
                .into_iter()
                .map(|p| serde_json::to_value(p).unwrap_or_default())
                .collect();
            data.insert("chapterPackets".into(), json!(packets));
        }
        _ => {
            // Unknown canvas type — include premise only
        }
    }

    data.insert("canvasType".into(), json!(canvas_type));

    serde_json::to_string_pretty(&data)
        .map_err(|e| format!("Failed to serialize context data: {}", e))
}

// ---------------------------------------------------------------------------
// System prompt composition
// ---------------------------------------------------------------------------

fn compose_system_prompt(canvas_type: &str, output_type: &str, additional: &str) -> String {
    let base = match canvas_type {
        "premise" => "You are a creative writing assistant analyzing a story premise. \
                      Help the user develop their story concept, explore themes, \
                      and identify narrative opportunities.",
        "structure" => "You are a narrative structure analyst. \
                        Help the user develop plot structure, pacing, \
                        and narrative architecture based on their premise.",
        "setting" => "You are a world-building consultant. \
                      Help the user create consistent and compelling \
                      fictional worlds, including rules, characters, and factions.",
        "packet" => "You are a chapter packet generator. \
                     Help the user develop chapter-by-chapter content \
                     including plot lines, character arcs, and scene breakdowns.",
        "text" => "You are a writing assistant for prose. \
                   Help the user write and refine their story text, \
                   maintaining voice, tone, and narrative consistency.",
        _ => "You are a creative writing assistant. \
              Help the user develop their story.",
    };

    let mode = match output_type {
        "discuss" => "\n\nMode: Discussion. Respond conversationally. Do not modify any data.",
        "suggest" => "\n\nMode: Suggestion. Provide options and alternatives for the user to consider.",
        "write_preview" => "\n\nMode: Write Preview. Generate content that can be written into the current canvas.",
        "generatePacket" => "\n\nMode: Generate Packet. Create chapter packet content with structural data.",
        "generateDraft" => "\n\nMode: Generate Draft. Write prose text for the specified chapter.",
        "assumption_flow" => "\n\nMode: Temporary Hypothesis. Work with assumed data that won't affect formal records.",
        _ => "",
    };

    let mut prompt = format!("{}{}", base, mode);

    if !additional.is_empty() {
        prompt.push_str("\n\nAdditional instructions:\n");
        prompt.push_str(additional);
    }

    prompt
}

// ---------------------------------------------------------------------------
// Target resolution per output type
// ---------------------------------------------------------------------------

fn resolve_targets(output_type: &str, canvas_type: &str) -> (Vec<String>, Vec<String>) {
    match output_type {
        "discuss" => (vec![], vec!["*".into()]),
        "suggest" => (vec![], vec!["*".into()]),
        "write_preview" => {
            let writable = if canvas_type.is_empty() || canvas_type == "premise" {
                vec!["premise_cards".into()]
            } else {
                vec![format!("{}_tables", canvas_type)]
            };
            (writable, vec!["*".into()])
        }
        "generatePacket" => (
            vec!["chapter_packets".into()],
            vec![
                "premise_cards".into(),
                "structure_nodes".into(),
                "world_rules".into(),
                "character_cards".into(),
            ],
        ),
        "generateDraft" => (
            vec!["quick_drafts".into(), "text_canvas".into()],
            vec![
                "premise_cards".into(),
                "structure_nodes".into(),
                "world_rules".into(),
                "character_cards".into(),
                "chapter_packets".into(),
            ],
        ),
        "assumption_flow" => (
            vec!["assumption_data".into()],
            vec![
                "premise_cards".into(),
                "structure_nodes".into(),
                "world_rules".into(),
                "character_cards".into(),
                "chapter_packets".into(),
                "quick_drafts".into(),
                "text_canvas".into(),
            ],
        ),
        _ => (vec![], vec!["*".into()]),
    }
}
