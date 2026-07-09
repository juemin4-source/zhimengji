# T-001: Provider Registry Rebuild — Merge v1 BYOK + v2 AI Control Center

**Priority:** P0
**Scope Item:** #1 — AI Provider/Model Registry Rebuild
**Dependencies:** None
**Estimated Files:** 12

---

## Objective

Merge the split-brain provider configuration: v1 BYOK (`api_keys` table via `byok_commands.rs` and `byok/key_manager.rs`) and v2 AI Control Center (`ai_provider_config` table via `ai_commands.rs`). After this ticket, all provider configs live in `ai_provider_config`. v1 BYOK code is marked for deletion but left in place for read-compat.

---

## What Must Change

### 1. Rust: Consolidate Provider Listing

**`src-tauri/src/ai_commands.rs`:**
- Modify `list_providers_v2` to also read v1 BYOK `api_keys` data and merge it into the result
- No duplicate entries: if a provider exists in both tables, prefer v2's version
- Add a `migrated_from_v1: bool` flag to `AiProviderConfig` model

**`src-tauri/src/db.rs`:**
- Add a migration function: `migrate_v1_api_keys_to_v2()` that reads all rows from `api_keys` table and writes them to `ai_provider_config` table if not already present
- Call this migration in `init_ai_tables()` or in `list_providers_v2` on first read
- Add `migrated_from_v1` column to `ai_provider_config` table if not existing

**`src-tauri/src/models.rs`:**
- Add `migrated_from_v1: bool` field to `AiProviderConfig`
- Keep existing fields; add field is backward-compatible

### 2. Rust: Mark BYOK for Deletion

**`src-tauri/src/byok_commands.rs`:**
- Add a deprecation comment block at the top of the file
- Keep all functions working (read-compat)
- No new functions added

**`src-tauri/src/byok/key_manager.rs`:**
- Add deprecation comments
- Keep existing functions

**`src-tauri/src/byok/llm_client.rs`:**
- Add deprecation comments
- Keep existing functions

**`src-tauri/src/byok/usage_tracker.rs`:**
- Add deprecation comments
- Keep existing functions

**`src-tauri/src/lib.rs`:**
- Add deprecation comments above each BYOK command registration
- Keep registrations for backward compatibility
- Add comment: `// [DEPRECATED v2.1.1-AI] Will be removed in v2.2 — use list_providers_v2 / save_provider_config instead`

### 3. Frontend: Update API Layer

**`src/api/aiControlCenterApi.ts`:**
- Ensure `listProviderConfigs` handles the merged data (both v1 and v2 providers)
- Add backward-compatible type for merged provider configs

**`src/contracts/ai-registry.contract.ts`:**
- Add `merged_providers` output type or ensure existing `ConnectionTestResult` handles it
- Expand `SkillRecord` if needed

**`src/types/ai.ts`:**
- `AiProviderConfigV2`: Add `migratedFromV1?: boolean` field
- Ensure backward compatibility

### 4. Scope Freeze Enforcement

- **DO NOT** delete v1 BYOK code (only mark for deletion)
- **DO NOT** create new tables
- **DO NOT** modify stable data contracts
- **DO NOT** enter v2.1.2 scope

---

## Files to Write/Modify

| File | Action | Description |
|------|--------|-------------|
| `src-tauri/src/ai_commands.rs` | Modify | Merge v1 BYOK data in `list_providers_v2` |
| `src-tauri/src/db.rs` | Modify | Add `migrate_v1_api_keys_to_v2()` function |
| `src-tauri/src/models.rs` | Modify | Add `migrated_from_v1` field to `AiProviderConfig` |
| `src-tauri/src/byok_commands.rs` | Modify | Add deprecation comments |
| `src-tauri/src/byok/key_manager.rs` | Modify | Add deprecation comments |
| `src-tauri/src/byok/llm_client.rs` | Modify | Add deprecation comments |
| `src-tauri/src/byok/usage_tracker.rs` | Modify | Add deprecation comments |
| `src-tauri/src/lib.rs` | Modify | Add deprecation comments for BYOK registrations |
| `src/api/aiControlCenterApi.ts` | Modify | Handle merged provider data |
| `src/types/ai.ts` | Modify | Add `migratedFromV1` to `AiProviderConfigV2` |
| `src/contracts/ai-registry.contract.ts` | Modify (if needed) | Ensure backward compat |

---

## Verification

```bash
# TypeScript check
npx tsc --noEmit

# Rust compilation
cd src-tauri && cargo check && cd ..

# Contract chain
node scripts/acceptance/scan-contract-chain.mjs
```

## Acceptance Criteria

- [ ] `list_providers_v2` returns providers from both v1 `api_keys` and v2 `ai_provider_config`
- [ ] No duplicate providers returned
- [ ] v1 BYOK data is readable from the merged registry
- [ ] v1 `api_keys` table is unchanged (read-only)
- [ ] BYOK files have deprecation comments
- [ ] All existing tests pass
- [ ] `npx tsc --noEmit` passes
- [ ] `cargo check` passes
