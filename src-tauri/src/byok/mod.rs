// [DEPRECATED v2.1.1-AI] v1 BYOK module — Will be removed in v2.2.
// All provider config now lives in ai_provider_config table via ai_commands.rs.
// Keep existing code for read-compat with existing user data.

pub mod key_manager;
pub mod llm_client;
pub mod usage_tracker;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderInfo {
    pub provider: String,
    pub has_key: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TestResult {
    pub success: bool,
    pub message: String,
    pub model: String,
    pub latency_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageStats {
    pub daily_tokens: i64,
    pub monthly_tokens: i64,
    pub monthly_limit: i64,
    pub budget_exceeded: bool,
    pub by_model: Vec<ModelUsage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelUsage {
    pub model: String,
    pub total_tokens: i64,
    pub prompt_tokens: i64,
    pub completion_tokens: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LlmStreamEvent {
    pub event_type: String,
    pub content: Option<String>,
    pub finish_reason: Option<String>,
    pub error: Option<String>,
}
