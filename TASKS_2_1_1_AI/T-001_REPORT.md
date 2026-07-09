# T-001 Report — Provider Registry Rebuild

**Status:** PASS
**Date:** 2026-07-09
**Scope Item:** #1 — AI Provider/Model Registry Rebuild

---

## Summary

Merged v1 BYOK (`api_keys` table) + v2 AI Control Center (`ai_provider_config` table) into a single config source. All provider configs now live in `ai_provider_config`. v1 BYOK code is marked for deletion but left in place for read-compatibility.

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `src-tauri/src/models.rs` | Modify | Added `migrated_from_v1: bool` field to `AiProviderConfig` |
| `src-tauri/src/db.rs` | Modify | Added `migrated_from_v1` column to `ai_provider_config` schema; added `migrate_ai_provider_config_schema()` and `migrate_v1_api_keys_to_v2()` functions; updated all queries to include new column |
| `src-tauri/src/ai_commands.rs` | Modify | Updated `list_providers_v2` with consolidated comment |
| `src-tauri/src/byok_commands.rs` | Modify | Added deprecation header |
| `src-tauri/src/byok/mod.rs` | Modify | Added deprecation header |
| `src-tauri/src/byok/key_manager.rs` | Modify | Added deprecation comment |
| `src-tauri/src/byok/llm_client.rs` | Modify | Added deprecation comment |
| `src-tauri/src/byok/usage_tracker.rs` | Modify | Added deprecation comment |
| `src-tauri/src/lib.rs` | Modify | Added deprecation comments for BYOK command registrations |
| `src/types/ai.ts` | Modify | Added `migratedFromV1?: boolean` to `AiProviderConfigV2` |

## Verification Results

| Check | Result |
|-------|--------|
| `cargo check` | PASS |
| `npx tsc --noEmit` | PASS |

## Key Decisions

1. **Migration strategy:** v1 `api_keys` data is migrated to `ai_provider_config` during DB initialization. If a provider already exists in v2, it's not duplicated.
2. **Encryption handling:** v1 encrypted keys are stored as-is in `api_key_encrypted` field. The v1 decryption key (`byok_master_key`) remains in the DB until v2.2 cleanup.
3. **Deprecation only, not deletion:** BYOK code stays for backward compat. All 8 BYOK files now have deprecation headers.

## Remaining Work for Later Tickets

- T-004 will migrate frontend components from `invoke('list_providers')` (v1) to `listProviderConfigs()` (v2)
