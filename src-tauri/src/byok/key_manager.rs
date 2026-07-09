// [DEPRECATED v2.1.1-AI] v1 BYOK key manager — Will be removed in v2.2.
// All provider config operations now use ai_provider_config table via ai_commands.rs.
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Key, Nonce,
};
use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use rand::Rng;
use rusqlite::Connection;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use crate::byok::ProviderInfo;

struct KeyEntry {
    key: String,
    cached_at: Instant,
}

static KEY_CACHE: Mutex<Option<HashMap<String, KeyEntry>>> = Mutex::new(None);
const CACHE_DURATION: Duration = Duration::from_secs(30 * 60);

fn get_or_create_master_key(conn: &Connection) -> Result<String, String> {
    let existing: Option<String> = conn
        .query_row(
            "SELECT key_value FROM byok_master_key WHERE id = 1",
            [],
            |row| row.get(0),
        )
        .ok();

    if let Some(key) = existing {
        return Ok(key);
    }

    let key_bytes: [u8; 32] = rand::thread_rng().gen();
    let key_b64 = BASE64.encode(key_bytes);

    conn.execute(
        "INSERT INTO byok_master_key (id, key_value) VALUES (1, ?1)",
        rusqlite::params![key_b64],
    )
    .map_err(|e| format!("Failed to store master key: {}", e))?;

    Ok(key_b64)
}

fn decrypt_key(encrypted_b64: &str, master_key_b64: &str) -> Result<String, String> {
    let master_key_bytes = BASE64
        .decode(master_key_b64)
        .map_err(|e| format!("Failed to decode master key: {}", e))?;
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(&master_key_bytes));

    let encrypted = BASE64
        .decode(encrypted_b64)
        .map_err(|e| format!("Failed to decode encrypted data: {}", e))?;

    if encrypted.len() < 12 {
        return Err("Invalid encrypted data: too short".to_string());
    }

    let (nonce_bytes, ciphertext) = encrypted.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("Decryption failed: {}", e))?;

    String::from_utf8(plaintext).map_err(|e| format!("Invalid UTF-8 in decrypted key: {}", e))
}

fn encrypt_key(plaintext: &str, master_key_b64: &str) -> Result<String, String> {
    let master_key_bytes = BASE64
        .decode(master_key_b64)
        .map_err(|e| format!("Failed to decode master key: {}", e))?;
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(&master_key_bytes));

    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| format!("Encryption failed: {}", e))?;

    let mut combined = Vec::with_capacity(12 + ciphertext.len());
    combined.extend_from_slice(&nonce_bytes);
    combined.extend_from_slice(&ciphertext);

    Ok(BASE64.encode(combined))
}

pub fn init_tables(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS byok_master_key (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            key_value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS api_keys (
            provider TEXT PRIMARY KEY,
            encrypted_key TEXT NOT NULL,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        );
        ",
    )
    .map_err(|e| format!("Failed to initialize BYOK tables: {}", e))?;

    get_or_create_master_key(conn)?;

    Ok(())
}

pub fn store_key(conn: &Connection, provider: &str, key: &str) -> Result<(), String> {
    let master_key = get_or_create_master_key(conn)?;
    let encrypted = encrypt_key(key, &master_key)?;
    let now = chrono::Utc::now().timestamp();

    conn.execute(
        "INSERT INTO api_keys (provider, encrypted_key, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?3)
         ON CONFLICT(provider) DO UPDATE SET
           encrypted_key = excluded.encrypted_key,
           updated_at = excluded.updated_at",
        rusqlite::params![provider, encrypted, now],
    )
    .map_err(|e| format!("Failed to store API key: {}", e))?;

    if let Ok(mut cache) = KEY_CACHE.lock() {
        if let Some(ref mut map) = *cache {
            map.remove(provider);
        }
    }

    Ok(())
}

pub fn get_key(conn: &Connection, provider: &str) -> Option<String> {
    if let Ok(cache) = KEY_CACHE.lock() {
        if let Some(ref map) = *cache {
            if let Some(entry) = map.get(provider) {
                if entry.cached_at.elapsed() < CACHE_DURATION {
                    return Some(entry.key.clone());
                }
            }
        }
    }

    let master_key = get_or_create_master_key(conn).ok()?;
    let encrypted: String = conn
        .query_row(
            "SELECT encrypted_key FROM api_keys WHERE provider = ?1",
            rusqlite::params![provider],
            |row| row.get(0),
        )
        .ok()?;

    let decrypted = decrypt_key(&encrypted, &master_key).ok()?;

    if let Ok(mut cache) = KEY_CACHE.lock() {
        if cache.is_none() {
            *cache = Some(HashMap::new());
        }
        if let Some(ref mut map) = *cache {
            map.insert(
                provider.to_string(),
                KeyEntry {
                    key: decrypted.clone(),
                    cached_at: Instant::now(),
                },
            );
        }
    }

    Some(decrypted)
}

pub fn remove_key(conn: &Connection, provider: &str) -> Result<(), String> {
    conn.execute(
        "DELETE FROM api_keys WHERE provider = ?1",
        rusqlite::params![provider],
    )
    .map_err(|e| format!("Failed to remove API key: {}", e))?;

    if let Ok(mut cache) = KEY_CACHE.lock() {
        if let Some(ref mut map) = *cache {
            map.remove(provider);
        }
    }

    Ok(())
}

pub fn list_providers(conn: &Connection) -> Result<Vec<ProviderInfo>, String> {
    let mut stmt = conn
        .prepare("SELECT provider, created_at, updated_at FROM api_keys")
        .map_err(|e| format!("Failed to list providers: {}", e))?;

    let providers = stmt
        .query_map([], |row| {
            Ok(ProviderInfo {
                provider: row.get(0)?,
                has_key: true,
                created_at: row.get(1)?,
                updated_at: row.get(2)?,
            })
        })
        .map_err(|e| format!("Failed to query providers: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(providers)
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
    fn test_store_and_get_key() {
        let conn = setup_db();
        store_key(&conn, "openai", "sk-test-key-12345").unwrap();
        let result = get_key(&conn, "openai");
        assert_eq!(result, Some("sk-test-key-12345".to_string()));
    }

    #[test]
    fn test_remove_key() {
        let conn = setup_db();
        store_key(&conn, "openai", "sk-test-key").unwrap();
        remove_key(&conn, "openai").unwrap();
        let result = get_key(&conn, "openai");
        assert_eq!(result, None);
    }

    #[test]
    fn test_list_providers() {
        let conn = setup_db();
        store_key(&conn, "openai", "sk-1").unwrap();
        store_key(&conn, "anthropic", "sk-2").unwrap();
        let providers = list_providers(&conn).unwrap();
        assert_eq!(providers.len(), 2);
        assert!(providers.iter().any(|p| p.provider == "openai"));
        assert!(providers.iter().any(|p| p.provider == "anthropic"));
    }

    #[test]
    fn test_get_nonexistent_key() {
        let conn = setup_db();
        let result = get_key(&conn, "nonexistent");
        assert_eq!(result, None);
    }
}
