// [DEPRECATED v2.1.1-AI] v1 BYOK usage tracker — Will be removed in v2.2.
// Usage tracking will be consolidated in v2.2 AI Infra.
use chrono::Datelike;
use rusqlite::{params, Connection};

use crate::byok::{ModelUsage, UsageStats};

pub fn init_tables(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS usage_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            model TEXT NOT NULL,
            prompt_tokens INTEGER NOT NULL DEFAULT 0,
            completion_tokens INTEGER NOT NULL DEFAULT 0,
            total_tokens INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        );
        CREATE TABLE IF NOT EXISTS budget_settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            monthly_limit INTEGER NOT NULL DEFAULT 1000000
        );
        ",
    )
    .map_err(|e| format!("Failed to initialize usage tracking tables: {}", e))?;

    conn.execute(
        "INSERT OR IGNORE INTO budget_settings (id, monthly_limit) VALUES (1, 1000000)",
        [],
    )
    .map_err(|e| format!("Failed to insert default budget: {}", e))?;

    Ok(())
}

pub fn track_usage(
    conn: &Connection,
    model: &str,
    prompt_tokens: i64,
    completion_tokens: i64,
    total_tokens: i64,
) -> Result<(), String> {
    conn.execute(
        "INSERT INTO usage_log (model, prompt_tokens, completion_tokens, total_tokens)
         VALUES (?1, ?2, ?3, ?4)",
        params![model, prompt_tokens, completion_tokens, total_tokens],
    )
    .map_err(|e| format!("Failed to track usage: {}", e))?;

    Ok(())
}

pub fn get_daily_usage(conn: &Connection) -> Result<i64, String> {
    let now = chrono::Utc::now();
    let today_start = now
        .date_naive()
        .and_hms_opt(0, 0, 0)
        .unwrap()
        .and_utc()
        .timestamp();

    conn.query_row(
        "SELECT COALESCE(SUM(total_tokens), 0) FROM usage_log WHERE created_at >= ?1",
        params![today_start],
        |row| row.get(0),
    )
    .map_err(|e| format!("Failed to get daily usage: {}", e))
}

pub fn get_monthly_usage(conn: &Connection) -> Result<i64, String> {
    let now = chrono::Utc::now();
    let month_start = now
        .date_naive()
        .with_day(1)
        .unwrap_or_else(|| now.date_naive())
        .and_hms_opt(0, 0, 0)
        .unwrap()
        .and_utc()
        .timestamp();

    conn.query_row(
        "SELECT COALESCE(SUM(total_tokens), 0) FROM usage_log WHERE created_at >= ?1",
        params![month_start],
        |row| row.get(0),
    )
    .map_err(|e| format!("Failed to get monthly usage: {}", e))
}

pub fn get_usage_by_model(conn: &Connection) -> Result<Vec<ModelUsage>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT model,
                    COALESCE(SUM(total_tokens), 0) as total,
                    COALESCE(SUM(prompt_tokens), 0) as prompt,
                    COALESCE(SUM(completion_tokens), 0) as completion
             FROM usage_log
             GROUP BY model",
        )
        .map_err(|e| format!("Failed to prepare usage by model query: {}", e))?;

    let results = stmt
        .query_map([], |row| {
            Ok(ModelUsage {
                model: row.get(0)?,
                total_tokens: row.get(1)?,
                prompt_tokens: row.get(2)?,
                completion_tokens: row.get(3)?,
            })
        })
        .map_err(|e| format!("Failed to query usage by model: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(results)
}

pub fn check_budget_limit(conn: &Connection) -> Result<bool, String> {
    let monthly_usage = get_monthly_usage(conn)?;
    let limit: i64 = conn
        .query_row(
            "SELECT monthly_limit FROM budget_settings WHERE id = 1",
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to get budget limit: {}", e))?;

    Ok(monthly_usage >= limit)
}

pub fn set_budget_limit(conn: &Connection, limit: i64) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO budget_settings (id, monthly_limit) VALUES (1, ?1)",
        params![limit],
    )
    .map_err(|e| format!("Failed to set budget limit: {}", e))?;

    Ok(())
}

pub fn get_usage_stats(conn: &Connection) -> Result<UsageStats, String> {
    let daily = get_daily_usage(conn)?;
    let monthly = get_monthly_usage(conn)?;
    let by_model = get_usage_by_model(conn)?;
    let budget_exceeded = check_budget_limit(conn)?;
    let limit: i64 = conn
        .query_row(
            "SELECT monthly_limit FROM budget_settings WHERE id = 1",
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to get budget limit: {}", e))?;

    Ok(UsageStats {
        daily_tokens: daily,
        monthly_tokens: monthly,
        monthly_limit: limit,
        budget_exceeded,
        by_model,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn setup_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        init_tables(&conn).unwrap();
        conn
    }

    #[test]
    fn test_track_and_get_daily_usage() {
        let conn = setup_db();
        track_usage(&conn, "gpt-4", 100, 50, 150).unwrap();
        track_usage(&conn, "gpt-4", 200, 100, 300).unwrap();
        let daily = get_daily_usage(&conn).unwrap();
        assert_eq!(daily, 450);
    }

    #[test]
    fn test_get_usage_by_model() {
        let conn = setup_db();
        track_usage(&conn, "gpt-4", 100, 50, 150).unwrap();
        track_usage(&conn, "claude-3", 200, 100, 300).unwrap();
        track_usage(&conn, "gpt-4", 50, 25, 75).unwrap();
        let by_model = get_usage_by_model(&conn).unwrap();
        assert_eq!(by_model.len(), 2);

        let gpt4 = by_model.iter().find(|m| m.model == "gpt-4").unwrap();
        assert_eq!(gpt4.total_tokens, 225);

        let claude = by_model
            .iter()
            .find(|m| m.model == "claude-3")
            .unwrap();
        assert_eq!(claude.total_tokens, 300);
    }

    #[test]
    fn test_budget_limit() {
        let conn = setup_db();
        assert!(!check_budget_limit(&conn).unwrap());
        set_budget_limit(&conn, 100).unwrap();
        track_usage(&conn, "gpt-4", 200, 0, 200).unwrap();
        assert!(check_budget_limit(&conn).unwrap());
    }

    #[test]
    fn test_get_usage_stats() {
        let conn = setup_db();
        track_usage(&conn, "gpt-4", 100, 50, 150).unwrap();
        let stats = get_usage_stats(&conn).unwrap();
        assert_eq!(stats.daily_tokens, 150);
        assert_eq!(stats.by_model.len(), 1);
        assert!(!stats.budget_exceeded);
    }
}
