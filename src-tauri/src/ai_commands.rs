use std::time::Instant;
use tauri::State;
use reqwest::Client;
use serde_json::json;
use crate::ai::context_builder;
use crate::db::Database;
use crate::models::{
    AiBuiltContext, AiEvaluationResult, AiParseOutput, AiProviderConfig, AiRouteOutput,
    AiRouteInput, BuildContextInput, AiParseInput, AiSkillRecord, ListSkillsOutput,
    ListSkillsInput, GetSkillInput, SaveProviderConfigInput, DeleteProviderConfigInput,
    TestProviderConnectionInput, RunEvaluationInput, ProviderConnectionTestResult,
};

// ===== AI Context Commands =====

/// Build AI context for a given canvas and output type
#[tauri::command]
pub fn build_context(
    db: State<'_, Database>,
    input: BuildContextInput,
) -> Result<AiBuiltContext, String> {
    context_builder::build_context(&input, &db)
}

/// Route user intent based on message analysis using keyword/heuristic matching.
/// Returns one of 7 intents: discuss, suggest, write_preview, generatePacket,
/// generateDraft, assumption_flow, unrecognized.
#[tauri::command]
pub fn route_intent(
    _db: State<'_, Database>,
    input: AiRouteInput,
) -> Result<AiRouteOutput, String> {
    let (intent, confidence, fallback_reason) = detect_intent(&input.message);
    let parameters = extract_parameters(&input.message, intent);

    Ok(AiRouteOutput {
        intent: intent.to_string(),
        confidence,
        parameters,
        fallback_reason,
    })
}

// ===== Intent Detection (heuristic keyword matching) =====

/// Returns (intent, confidence, fallback_reason)
fn detect_intent(message: &str) -> (&'static str, f64, Option<String>) {
    let msg_lower = message.to_lowercase();

    // generateDraft — highest priority: explicit prose writing requests
    if contains_any(&msg_lower, &[
        "写正文", "写稿", "写章节", "写内容", "写一段", "写草稿",
        "generate draft", "draft chapter", "write chapter", "write prose",
        "write content", "write text", "生成正文", "生成草稿",
        "帮我写", "帮我撰写",
    ]) {
        return ("generateDraft", 0.85, None);
    }

    // generatePacket
    if contains_any(&msg_lower, &[
        "生成章节包", "生成大纲", "生成结构", "生成章节",
        "generate packet", "create packet", "write outline",
        "generate outline", "create outline", "plan chapter",
        "章节规划", "大纲",
    ]) {
        return ("generatePacket", 0.85, None);
    }

    // write_preview
    if contains_any(&msg_lower, &[
        "写入", "填写", "填入", "自动填写", "自动填充",
        "write to", "fill in", "fill out", "write into",
        "帮我填充", "填入字段", "写入画板",
    ]) {
        return ("write_preview", 0.75, None);
    }

    // suggest
    if contains_any(&msg_lower, &[
        "建议", "推荐", "有什么", "怎么", "如何", "有哪些",
        "suggest", "recommend", "option", "alternative",
        "有什么建议", "推荐一下", "给点建议",
    ]) {
        return ("suggest", 0.70, None);
    }

    // assumption_flow
    if contains_any(&msg_lower, &[
        "创建", "新建", "增加", "添加", "新角色", "新地点", "新组织",
        "create", "add new", "new character", "new location", "new faction",
        "we need", "缺少", "缺一个", "需要", "需要一个",
    ]) {
        return ("assumption_flow", 0.65, None);
    }

    // discuss (questions and general conversation)
    if contains_any(&msg_lower, &[
        "?", "？", "你好", "hello", "hi", "嗨",
        "讨论", "想", "觉得", "认为", "think", "opinion",
        "what about", "how about", "what do you", "tell me about",
        "explain", "介绍", "说明",
    ]) {
        return ("discuss", 0.60, None);
    }

    // unrecognized — fallback to discussion with low confidence
    ("unrecognized", 0.30, Some(
        "No clear intent detected. Falling back to discussion mode.".to_string()
    ))
}

fn contains_any(text: &str, keywords: &[&str]) -> bool {
    keywords.iter().any(|kw| text.contains(kw))
}

/// Extract basic parameters from the message based on intent.
fn extract_parameters(message: &str, intent: &str) -> serde_json::Value {
    let msg_lower = message.to_lowercase();

    match intent {
        "generateDraft" | "generatePacket" => {
            let chapter = extract_chapter_ref(&msg_lower);
            serde_json::json!({
                "extractedChapter": chapter,
                "sourceMessage": message.chars().take(100).collect::<String>(),
            })
        }
        "assumption_flow" => {
            let entity_type = extract_entity_type(&msg_lower);
            serde_json::json!({
                "suggestedEntityType": entity_type,
                "sourceMessage": message.chars().take(100).collect::<String>(),
            })
        }
        _ => {
            serde_json::json!({
                "sourceMessage": message.chars().take(100).collect::<String>(),
            })
        }
    }
}

fn extract_chapter_ref(msg: &str) -> String {
    if let Some(idx) = msg.find("chapter ") {
        let rest = &msg[idx + 8..];
        let num: String = rest.chars().take_while(|c| c.is_numeric() || *c == '.').collect();
        if !num.is_empty() {
            return format!("Chapter {}", num);
        }
    }
    if msg.contains("第") {
        // Try to find "第X章" pattern
        let chars: Vec<char> = msg.chars().collect();
        for i in 0..chars.len().saturating_sub(2) {
            if chars[i] == '第' {
                let mut num = String::new();
                for j in (i + 1)..chars.len() {
                    if chars[j].is_numeric() {
                        num.push(chars[j]);
                    } else if chars[j] == '章' && !num.is_empty() {
                        return format!("第{}章", num);
                    } else {
                        break;
                    }
                }
            }
        }
    }
    "unknown".to_string()
}

fn extract_entity_type(msg: &str) -> String {
    let m = msg.to_lowercase();
    if contains_any(&m, &["角色", "人物", "character", "person"]) {
        return "character".into();
    }
    if contains_any(&m, &["地点", "地方", "location", "place", "world"]) {
        return "location".into();
    }
    if contains_any(&m, &["组织", "organization", "faction", "group"]) {
        return "faction".into();
    }
    if contains_any(&m, &["规则", "机制", "rule", "mechanic"]) {
        return "rule".into();
    }
    if contains_any(&m, &["物品", "item", "object", "thing"]) {
        return "item".into();
    }
    if contains_any(&m, &["事件", "event"]) {
        return "event".into();
    }
    if contains_any(&m, &["术语", "term", "definition"]) {
        return "term".into();
    }
    "unknown".to_string()
}

// ===== AI Parser Commands =====

/// Parse and validate structured AI output against a JSON schema.
#[tauri::command]
pub fn parse_output(
    _db: State<'_, Database>,
    input: AiParseInput,
) -> Result<AiParseOutput, String> {
    use crate::ai::structured_parser;

    let result = structured_parser::parse_structured_output(
        &input.raw_content,
        &input.schema,
        input.strict,
    );

    let status_str = match result.status {
        structured_parser::ParserStatus::Valid => "valid",
        structured_parser::ParserStatus::Repaired => "repaired",
        structured_parser::ParserStatus::Fallback => "fallback",
        structured_parser::ParserStatus::Failed => "failed",
    };

    let mut data_obj = serde_json::Map::new();
    data_obj.insert("status".to_string(), serde_json::Value::String(status_str.to_string()));

    if let Some(obj) = result.data.as_object() {
        for (k, v) in obj.iter() {
            data_obj.insert(k.clone(), v.clone());
        }
    }

    Ok(AiParseOutput {
        data: serde_json::Value::Object(data_obj),
        validation_errors: result.validation_errors,
        repair_log: result.repair_log,
        fallback_text: result.fallback_text,
    })
}

// ===== AI Skill Registry Commands =====

/// List all registered AI skills
#[tauri::command]
pub fn list_skills(
    db: State<'_, Database>,
    _input: ListSkillsInput,
) -> Result<ListSkillsOutput, String> {
    let skills = crate::ai::skill_registry::list_skills(&db)?;
    Ok(ListSkillsOutput { skills })
}

/// Get a single AI skill by ID
#[tauri::command]
pub fn get_skill(
    db: State<'_, Database>,
    input: GetSkillInput,
) -> Result<Option<AiSkillRecord>, String> {
    crate::ai::skill_registry::get_skill(&db, &input.id)
}

/// Register a new AI skill (used for custom skill creation)
#[tauri::command]
pub fn register_skill(
    db: State<'_, Database>,
    input: crate::models::RegisterSkillInput,
) -> Result<AiSkillRecord, String> {
    crate::ai::skill_registry::register_skill(&db, &input)
}

// ===== AI Provider Commands =====

/// List all configured AI providers (v2)
#[tauri::command]
pub fn list_providers_v2(
    db: State<'_, Database>,
) -> Result<Vec<AiProviderConfig>, String> {
    db.list_ai_provider_configs()
        .map_err(|e| format!("DB_ERROR: {}", e))
}

/// Save or update an AI provider configuration
#[tauri::command]
pub fn save_provider_config(
    db: State<'_, Database>,
    input: SaveProviderConfigInput,
) -> Result<AiProviderConfig, String> {
    db.save_ai_provider_config(&input)
        .map_err(|e| format!("DB_ERROR: {}", e))
}

/// Delete an AI provider configuration
#[tauri::command]
pub fn delete_provider_config(
    db: State<'_, Database>,
    input: DeleteProviderConfigInput,
) -> Result<(), String> {
    db.delete_ai_provider_config(&input.id)
        .map_err(|e| format!("DB_ERROR: {}", e))
}

/// Test an AI provider connection by sending a lightweight request
#[tauri::command]
pub async fn test_provider_connection(
    db: State<'_, Database>,
    input: TestProviderConnectionInput,
) -> Result<ProviderConnectionTestResult, String> {
    let start = Instant::now();

    // Build endpoint URL for model listing
    let base_url = input.endpoint.trim_end_matches('/').to_string();
    let models_url = format!("{}/models", base_url);

    let client = Client::builder()
        .use_rustls_tls()
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    let response = client
        .get(&models_url)
        .header("Authorization", format!("Bearer {}", input.api_key))
        .send()
        .await;

    let latency_ms = start.elapsed().as_millis() as i64;

    match response {
        Ok(resp) => {
            if resp.status().is_success() {
                let body: serde_json::Value = resp.json().await.unwrap_or(json!({}));
                let models = extract_model_ids(&body);
                Ok(ProviderConnectionTestResult {
                    success: true,
                    message: format!("Connected — {}ms, {} models available", latency_ms, models.len()),
                    latency_ms,
                    models,
                })
            } else {
                let status = resp.status().as_u16();
                let error_text = resp.text().await.unwrap_or_default();
                // Truncate long error messages
                let msg = if error_text.len() > 200 {
                    format!("{}...", &error_text[..200])
                } else {
                    error_text
                };
                Ok(ProviderConnectionTestResult {
                    success: false,
                    message: format!("HTTP {}: {}", status, msg),
                    latency_ms,
                    models: vec![],
                })
            }
        }
        Err(e) => {
            Ok(ProviderConnectionTestResult {
                success: false,
                message: format!("Connection failed: {}", e),
                latency_ms,
                models: vec![],
            })
        }
    }
}

/// Extract model IDs from various API response shapes
fn extract_model_ids(body: &serde_json::Value) -> Vec<String> {
    // OpenAI: { data: [{ id: "gpt-4", ... }] }
    if let Some(data) = body.get("data").and_then(|d| d.as_array()) {
        let ids: Vec<String> = data.iter()
            .filter_map(|item| item.get("id").and_then(|id| id.as_str()))
            .map(|s| s.to_string())
            .collect();
        if !ids.is_empty() {
            return ids;
        }
    }

    // DeepSeek / simple: { data: ["deepseek-chat", ...] }
    if let Some(data) = body.get("data").and_then(|d| d.as_array()) {
        let ids: Vec<String> = data.iter()
            .filter_map(|item| item.as_str())
            .map(|s| s.to_string())
            .collect();
        if !ids.is_empty() {
            return ids;
        }
    }

    // Fallback: { models: [{ id: "..." }] }
    if let Some(models) = body.get("models").and_then(|m| m.as_array()) {
        let ids: Vec<String> = models.iter()
            .filter_map(|item| item.get("id").and_then(|id| id.as_str()))
            .map(|s| s.to_string())
            .collect();
        if !ids.is_empty() {
            return ids;
        }
    }

    // Fallback: return the requested model as the sole entry
    vec![]
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
