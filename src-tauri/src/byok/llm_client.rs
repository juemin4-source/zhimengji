// [DEPRECATED v2.1.1-AI] v1 BYOK LLM client — Will be removed in v2.2.
// AI calls now go through the Router (command-router.ts) which selects provider
// and model from the consolidated ai_provider_config table.
use futures_util::StreamExt;
use reqwest::Client;
use serde_json::json;
use std::time::Instant;
use tauri::{AppHandle, Emitter};

use crate::byok::{ChatMessage, LlmStreamEvent, TestResult};
use crate::db::Database;

pub fn get_default_endpoint(provider: &str) -> Option<String> {
    match provider {
        "openai" => Some("https://api.openai.com/v1/chat/completions".to_string()),
        "anthropic" => Some("https://api.anthropic.com/v1/messages".to_string()),
        "google" => {
            Some("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions".to_string())
        }
        "deepseek" => Some("https://api.deepseek.com/v1/chat/completions".to_string()),
        "azure" => None,
        _ => None,
    }
}

pub async fn test_connection(
    db: &Database,
    provider: &str,
    model: &str,
    custom_endpoint: Option<String>,
) -> TestResult {
    let start = Instant::now();

    let api_key = {
        let conn = db.conn.lock().unwrap();
        crate::byok::key_manager::get_key(&conn, provider)
    };

    let api_key = match api_key {
        Some(k) => k,
        None => {
            return TestResult {
                success: false,
                message: "API key not found for provider".to_string(),
                model: model.to_string(),
                latency_ms: start.elapsed().as_millis() as u64,
            };
        }
    };

    let endpoint = custom_endpoint
        .or_else(|| get_default_endpoint(provider))
        .unwrap_or_else(|| "https://api.openai.com/v1/chat/completions".to_string());

    let client = match Client::builder().use_rustls_tls().build() {
        Ok(c) => c,
        Err(e) => {
            return TestResult {
                success: false,
                message: format!("Failed to build HTTP client: {}", e),
                model: model.to_string(),
                latency_ms: start.elapsed().as_millis() as u64,
            };
        }
    };

    let body = json!({
        "model": model,
        "messages": [{"role": "user", "content": "Hello, respond with just the word 'ok'."}],
        "max_tokens": 10
    });

    let response = client
        .post(&endpoint)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await;

    match response {
        Ok(resp) => {
            let latency = start.elapsed().as_millis() as u64;
            if resp.status().is_success() {
                TestResult {
                    success: true,
                    message: "Connection successful".to_string(),
                    model: model.to_string(),
                    latency_ms: latency,
                }
            } else {
                let status = resp.status().as_u16();
                let error_body = resp.text().await.unwrap_or_default();
                TestResult {
                    success: false,
                    message: format!("HTTP {}: {}", status, error_body),
                    model: model.to_string(),
                    latency_ms: latency,
                }
            }
        }
        Err(e) => TestResult {
            success: false,
            message: format!("Connection failed: {}", e),
            model: model.to_string(),
            latency_ms: start.elapsed().as_millis() as u64,
        },
    }
}

pub async fn call_chat_completion_stream(
    app: AppHandle,
    api_key: String,
    endpoint: String,
    model: String,
    messages: Vec<ChatMessage>,
) {
    let client = match Client::builder().use_rustls_tls().build() {
        Ok(c) => c,
        Err(e) => {
            let _ = app.emit(
                "llm-chunk",
                LlmStreamEvent {
                    event_type: "error".to_string(),
                    content: None,
                    finish_reason: None,
                    error: Some(format!("Failed to build HTTP client: {}", e)),
                },
            );
            return;
        }
    };

    let msgs: Vec<serde_json::Value> = messages
        .iter()
        .map(|m| json!({"role": m.role, "content": m.content}))
        .collect();

    let body = json!({
        "model": model,
        "messages": msgs,
        "stream": true
    });

    let response = match client
        .post(&endpoint)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
    {
        Ok(resp) => resp,
        Err(e) => {
            let _ = app.emit(
                "llm-chunk",
                LlmStreamEvent {
                    event_type: "error".to_string(),
                    content: None,
                    finish_reason: None,
                    error: Some(format!("Request failed: {}", e)),
                },
            );
            return;
        }
    };

    if !response.status().is_success() {
        let status = response.status().as_u16();
        let error_text = response.text().await.unwrap_or_default();
        let _ = app.emit(
            "llm-chunk",
            LlmStreamEvent {
                event_type: "error".to_string(),
                content: None,
                finish_reason: None,
                error: Some(format!("HTTP {}: {}", status, error_text)),
            },
        );
        return;
    }

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk_result) = stream.next().await {
        match chunk_result {
            Ok(bytes) => {
                let chunk_str = String::from_utf8_lossy(&bytes);
                buffer.push_str(&chunk_str);

                loop {
                    let newline_pos = match buffer.find('\n') {
                        Some(pos) => pos,
                        None => break,
                    };

                    let line = buffer[..newline_pos].trim().to_string();
                    buffer = buffer[newline_pos + 1..].to_string();

                    if line.is_empty() {
                        continue;
                    }

                    if line.starts_with("data: ") {
                        let data = &line[6..];
                        if data == "[DONE]" {
                            let _ = app.emit(
                                "llm-chunk",
                                LlmStreamEvent {
                                    event_type: "done".to_string(),
                                    content: None,
                                    finish_reason: Some("stop".to_string()),
                                    error: None,
                                },
                            );
                            return;
                        }

                        if let Ok(parsed) =
                            serde_json::from_str::<serde_json::Value>(data)
                        {
                            if let Some(choices) = parsed["choices"].as_array() {
                                if let Some(choice) = choices.first() {
                                    let delta = &choice["delta"];
                                    let content =
                                        delta["content"].as_str().map(|s| s.to_string());
                                    let finish_reason = choice["finish_reason"]
                                        .as_str()
                                        .map(|s| s.to_string());
                                    let finish_reason = match finish_reason {
                                        Some(ref s) if s == "null" => None,
                                        other => other,
                                    };

                                    let event_type = if finish_reason.is_some() {
                                        "done"
                                    } else {
                                        "chunk"
                                    };

                                    if let Err(e) = app.emit(
                                        "llm-chunk",
                                        LlmStreamEvent {
                                            event_type: event_type.to_string(),
                                            content,
                                            finish_reason,
                                            error: None,
                                        },
                                    ) {
                                        eprintln!("Failed to emit llm-chunk event: {}", e);
                                    }

                                    if event_type == "done" {
                                        return;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            Err(e) => {
                let _ = app.emit(
                    "llm-chunk",
                    LlmStreamEvent {
                        event_type: "error".to_string(),
                        content: None,
                        finish_reason: None,
                        error: Some(format!("Stream error: {}", e)),
                    },
                );
                return;
            }
        }
    }

    let _ = app.emit(
        "llm-chunk",
        LlmStreamEvent {
            event_type: "done".to_string(),
            content: None,
            finish_reason: Some("stop".to_string()),
            error: None,
        },
    );
}
