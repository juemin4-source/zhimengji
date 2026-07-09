// structured_parser.rs — AI Structured Output Parser (织梦机 v2 / W03)
//
// Rust-side JSON schema validation and repair logic.
// Mirrors the TypeScript implementation (src/lib/ai/structured-parser.ts)
// for Tauri native command paths.
//
// NEVER panics for recoverable issues — always returns status-tagged output.

use serde_json::{Map, Value};

/// Result status of the parsing operation.
#[derive(Debug, Clone, PartialEq)]
pub enum ParserStatus {
    Valid,
    Repaired,
    Fallback,
    Failed,
}

/// Result of a parse operation.
#[derive(Debug, Clone)]
pub struct ParseResult {
    pub status: ParserStatus,
    pub data: Value,
    pub validation_errors: Vec<String>,
    pub repair_log: Vec<String>,
    pub fallback_text: Option<String>,
}

/// Get the default value for a schema property based on its type.
fn get_default_for_type(field_def: &Map<String, Value>) -> Value {
    if let Some(default_val) = field_def.get("default") {
        return default_val.clone();
    }

    match field_def.get("type").and_then(|t| t.as_str()) {
        Some("string") => Value::String(String::new()),
        Some("number") => Value::Number(serde_json::Number::from_f64(0.0).unwrap_or(0.into())),
        Some("integer") => Value::Number(serde_json::Number::from(0_i64)),
        Some("boolean") => Value::Bool(false),
        Some("array") => Value::Array(vec![]),
        Some("object") => Value::Object(Map::new()),
        _ => Value::Null,
    }
}

/// Parse and validate structured AI output against a JSON schema.
///
/// * `raw_content` — Raw string output from an AI model
/// * `schema` — JSON schema string describing the expected structure
/// * `strict` — If true, require exact schema match (return fallback on mismatch)
pub fn parse_structured_output(raw_content: &str, schema: &str, strict: bool) -> ParseResult {
    // --- Phase 1: Parse the schema ---
    let schema_value: Value = match serde_json::from_str(schema) {
        Ok(v) => v,
        Err(e) => {
            return ParseResult {
                status: ParserStatus::Failed,
                data: Value::Object(Map::new()),
                validation_errors: vec![format!("Schema is not valid JSON: {}", e)],
                repair_log: vec![],
                fallback_text: Some(raw_content.to_string()),
            };
        }
    };

    let schema_obj = match schema_value.as_object() {
        Some(o) => o,
        None => {
            return ParseResult {
                status: ParserStatus::Failed,
                data: Value::Object(Map::new()),
                validation_errors: vec!["Schema is not a JSON object".to_string()],
                repair_log: vec![],
                fallback_text: Some(raw_content.to_string()),
            };
        }
    };

    let schema_properties = match schema_obj.get("properties") {
        Some(Value::Object(props)) => props,
        Some(_) => {
            return ParseResult {
                status: ParserStatus::Failed,
                data: Value::Object(Map::new()),
                validation_errors: vec!["Schema properties is not an object".to_string()],
                repair_log: vec![],
                fallback_text: Some(raw_content.to_string()),
            };
        }
        None => {
            // Empty properties — no validation needed
            &Map::new()
        }
    };

    // --- Phase 2: Parse the raw content ---
    let parsed_value: Value = match serde_json::from_str(raw_content) {
        Ok(v) => v,
        Err(_) => {
            return ParseResult {
                status: ParserStatus::Fallback,
                data: Value::Object(Map::new()),
                validation_errors: vec!["Raw content is not valid JSON".to_string()],
                repair_log: vec![],
                fallback_text: Some(raw_content.to_string()),
            };
        }
    };

    let parsed_obj = match parsed_value.as_object() {
        Some(o) => o,
        None => {
            return ParseResult {
                status: ParserStatus::Fallback,
                data: Value::Object(Map::new()),
                validation_errors: vec!["Raw content is not a JSON object".to_string()],
                repair_log: vec![],
                fallback_text: Some(raw_content.to_string()),
            };
        }
    };

    // --- Phase 3: Validate and repair ---
    let required_fields: Vec<&String> = schema_obj
        .get("required")
        .and_then(|r| r.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str()).collect::<Vec<&str>>())
        .unwrap_or_default()
        .into_iter()
        .map(|s| s.to_string())
        .collect::<Vec<_>>()
        .iter()
        .map(|s| Box::new(s.clone()) as Box<dyn std::borrow::Borrow<String>>)
        .collect::<Vec<_>>()
        .iter()
        .map(|b| b.borrow())
        .collect();

    // Actually let me simplify — just collect String values
    let required_strs: Vec<String> = schema_obj
        .get("required")
        .and_then(|r| r.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    let mut result = Map::new();
    let mut validation_errors: Vec<String> = vec![];
    let mut repair_log: Vec<String> = vec![];
    let mut needs_repair = false;

    // Process each field defined in the schema
    for (key, field_value) in schema_properties.iter() {
        let field_def = match field_value.as_object() {
            Some(o) => o,
            None => continue,
        };

        let is_required = required_strs.contains(key);
        let existing_value = parsed_obj.get(key);

        match existing_value {
            None => {
                if is_required {
                    if strict {
                        return ParseResult {
                            status: ParserStatus::Fallback,
                            data: Value::Object(Map::new()),
                            validation_errors: vec![format!("Missing required field '{}'", key)],
                            repair_log: vec![],
                            fallback_text: Some(raw_content.to_string()),
                        };
                    }
                    result.insert(key.clone(), get_default_for_type(field_def));
                    repair_log.push(format!("Missing required field '{}' filled with default", key));
                    needs_repair = true;
                } else if field_def.contains_key("default") {
                    result.insert(key.clone(), get_default_for_type(field_def));
                    repair_log.push(format!("Missing optional field '{}' filled with default", key));
                    needs_repair = true;
                }
                // Optional without default: leave out
            }
            Some(val) => {
                result.insert(key.clone(), val.clone());
            }
        }
    }

    // Strip illegal fields
    for key in parsed_obj.keys() {
        if !schema_properties.contains_key(key) {
            validation_errors.push(format!("Illegal field '{}' stripped", key));
            needs_repair = true;
        }
    }

    // Strict mode with validation errors => fallback
    if strict && !validation_errors.is_empty() {
        return ParseResult {
            status: ParserStatus::Fallback,
            data: Value::Object(Map::new()),
            validation_errors,
            repair_log: vec![],
            fallback_text: Some(raw_content.to_string()),
        };
    }

    // --- Phase 4: Determine final status ---
    let status = if needs_repair {
        ParserStatus::Repaired
    } else {
        ParserStatus::Valid
    };

    ParseResult {
        status,
        data: Value::Object(result),
        validation_errors,
        repair_log,
        fallback_text: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_valid_json() {
        let schema = r#"{"type":"object","properties":{"name":{"type":"string"},"age":{"type":"number"}},"required":["name","age"]}"#;
        let content = r#"{"name":"Alice","age":30}"#;
        let result = parse_structured_output(content, schema, false);
        assert_eq!(result.status, ParserStatus::Valid);
        assert!(result.validation_errors.is_empty());
        assert!(result.repair_log.is_empty());
        assert_eq!(result.data["name"], "Alice");
        assert_eq!(result.data["age"], 30);
    }

    #[test]
    fn test_missing_optional_field_with_default() {
        let schema = r#"{"type":"object","properties":{"name":{"type":"string"},"role":{"type":"string","default":"user"}},"required":["name"]}"#;
        let content = r#"{"name":"Alice"}"#;
        let result = parse_structured_output(content, schema, false);
        assert_eq!(result.status, ParserStatus::Repaired);
        assert_eq!(result.data["name"], "Alice");
        assert_eq!(result.data["role"], "user");
        assert_eq!(result.repair_log.len(), 1);
    }

    #[test]
    fn test_extra_fields_stripped() {
        let schema = r#"{"type":"object","properties":{"name":{"type":"string"}},"required":["name"]}"#;
        let content = r#"{"name":"Alice","extra_field":"should be stripped"}"#;
        let result = parse_structured_output(content, schema, false);
        assert_eq!(result.status, ParserStatus::Repaired);
        assert!(result.data.get("extra_field").is_none());
        assert_eq!(result.validation_errors.len(), 1);
    }

    #[test]
    fn test_malformed_json() {
        let schema = r#"{"type":"object","properties":{"name":{"type":"string"}}}"#;
        let content = r#"not json at all"#;
        let result = parse_structured_output(content, schema, false);
        assert_eq!(result.status, ParserStatus::Fallback);
        assert!(result.fallback_text.is_some());
    }

    #[test]
    fn test_invalid_schema() {
        let schema = r#"not a json schema"#;
        let content = r#"{"name":"Alice"}"#;
        let result = parse_structured_output(content, schema, false);
        assert_eq!(result.status, ParserStatus::Failed);
    }

    #[test]
    fn test_strict_mode_missing_required() {
        let schema = r#"{"type":"object","properties":{"name":{"type":"string"},"age":{"type":"number"}},"required":["name","age"]}"#;
        let content = r#"{"name":"Alice"}"#;
        let result = parse_structured_output(content, schema, true);
        assert_eq!(result.status, ParserStatus::Fallback);
        assert!(result.fallback_text.is_some());
    }

    #[test]
    fn test_strict_mode_extra_fields() {
        let schema = r#"{"type":"object","properties":{"name":{"type":"string"}},"required":["name"]}"#;
        let content = r#"{"name":"Alice","extra":"field"}"#;
        let result = parse_structured_output(content, schema, true);
        assert_eq!(result.status, ParserStatus::Fallback);
    }
}
