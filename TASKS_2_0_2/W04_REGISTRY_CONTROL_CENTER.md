# TICKET W04 — Prompt/Skill Registry + AI Control Center v2

## Metadata

| Field | Value |
|-------|-------|
| Ticket ID | v2.0.2-W04 |
| Title | Prompt/Skill Registry + AI Control Center v2 |
| Execution Order | 2 / 5 (parallel with W02, W03) |
| Dependencies | W01 must be complete (contracts, types, DB tables, Rust scaffold) |
| Risk | medium (Control Center is a new UI page with full CRUD + connection testing) |

## Objective

Deliver two independent sub-systems:

1. **Prompt/Skill Registry** — 5 registered skills with versioned prompt templates, input/output schemas, stored in `ai_prompt_registry` DB table. Provides `list_skills`, `get_skill`, `register_skill` operations.

2. **AI Control Center v2** — A new settings page for Provider/Model/API Key management, with connection testing, model role assignment (chat/structured/generation/detection), and status display. Replaces the old provider config flow in AiSettings while keeping AiSettings tabs intact.

---

## Detailed Scope

### 1. Prompt/Skill Registry — `src/lib/ai/prompt-registry.ts`

Single default export class/factory:

```typescript
interface SkillRegistry {
  listSkills(): Promise<ListSkillsOutput>;
  getSkill(skillId: string): Promise<SkillRecord | null>;
  registerSkill(input: RegisterSkillInput): Promise<SkillRecord>;
}
```

5 registered skills (must exist at initialization — hardcoded as defaults, stored in DB):

| Skill ID | Name | Purpose |
|----------|------|---------|
| `premise.five_step` | premise five-step method | Five-step premise generation |
| `structure.l1_l4` | structure L1-L4 outline | Level 1–4 structure outline |
| `setting.sparrow_9_3` | setting sparrow 9-grid 3.0 | 9-panel setting system v3 |
| `packet.three_detail_modes` | packet three detail modes | Three detail levels for chapter packets |
| `draft.chapter_writer` | draft chapter writer | Chapter-level prose generation |

Each skill must include:
- `prompt_template` — the actual prompt text (with `{{variable}}` placeholders)
- `input_schema` — JSON schema describing expected input variables
- `output_schema` — JSON schema describing output structure
- `version` — semver string

**On skill not found:** return `null` (not panic/throw).

### 2. Rust Backend — `src-tauri/src/ai/skill_registry.rs`

- CRUD operations on `ai_prompt_registry` table
- Migration/init: insert the 5 default skills on first run (check if table empty)

### 3. AI Control Center v2 — `src/components/ai/AiControlCenter.tsx`

A full settings page (not a modal) with the following sections:

**Provider Management:**
- List configured providers with name, status indicator (connected/disconnected/error), model role assignments
- Add Provider: select from presets (OpenAI/DeepSeek/Gemini/Custom), enter API Key, endpoint, timeout
- Modify Provider: edit endpoint, API Key (masked), timeout
- Delete Provider: confirm dialog before removal

**Model Role Selection:**
- For each provider, assign models to roles:
  - Chat (discuss, general conversation)
  - Structured (structured output generation)
  - Generation (packet/draft generation)
  - Detection (intent recognition, assumption detection)
- Each role defaults to a sensible model from the provider's model list

**Connection Testing:**
- Test button per provider → calls `testProviderConnection`
- Shows latency (ms) and available models on success
- Shows clear error message on failure

**Capability Status:**
- Visual table showing which providers × roles are available
- Color indicator (green=ready, yellow=partial, red=unconfigured)

**Styling:** `src/components/ai/ai-control-center.css` — match existing dark theme (see `AiSettings.tsx` for design language reference).

### 4. API Layer — `src/api/aiControlCenterApi.ts`

```typescript
export async function listProviderConfigs(): Promise<AiProviderConfig[]>
export async function saveProviderConfig(input: SaveProviderConfigInput): Promise<AiProviderConfig>
export async function deleteProviderConfig(id: string): Promise<void>
export async function testProviderConnection(providerId: string): Promise<ConnectionTestResult>
export async function listSkills(): Promise<SkillRecord[]>
export async function getSkill(skillId: string): Promise<SkillRecord | null>
```

### 5. Wire Commands — `src-tauri/src/ai_commands.rs`

Implement the remaining stubs created in W01:

- `list_providers_v2` — query `ai_provider_config` table
- `save_provider_config` — upsert provider config
- `delete_provider_config` — remove provider config
- `test_provider_connection` — call provider endpoint to verify
- `list_skills` — query `ai_prompt_registry` table
- `get_skill` — query single skill by ID

### 6. Module Registration

- `src-tauri/src/ai/mod.rs` — register `skill_registry` submodule
- `src-tauri/src/ai_commands.rs` — add new provider/skill commands to existing file

---

## Allowed Write

```
NEW: src/lib/ai/prompt-registry.ts
NEW: src-tauri/src/ai/skill_registry.rs
MODIFY: src-tauri/src/ai/mod.rs           (register skill_registry module)
MODIFY: src-tauri/src/ai_commands.rs      (add provider CRUD + skill commands)
NEW: src/components/ai/AiControlCenter.tsx
NEW: src/components/ai/ai-control-center.css
NEW: src/api/aiControlCenterApi.ts
```

## Read Only (for context)

```
src/contracts/ai-registry.contract.ts      — SkillRecord/ListSkillsOutput types
src/types/ai.ts                            — ProviderConfig, AiModel for reference
src/components/ai/AiSettings.tsx           — existing settings UI for design reference
src/components/ai/canvas-ai-bar.css        — existing AI component CSS for style consistency
src-tauri/src/ai/mod.rs                    — module registration (from W01)
src-tauri/src/ai_commands.rs              — existing stubs (from W01)
src-tauri/src/models.rs                    — model structs (from W01)
src-tauri/src/db.rs                        — DB methods (from W01)
src/api/premiseApi.ts                      — API layer pattern
```

## Forbidden

```
Context Builder (src/lib/ai/context-builder.ts) — W02
Command Router (src/lib/ai/command-router.ts) — W02
Structured Parser (src/lib/ai/structured-parser.ts) — W03
CanvasAiBar.tsx, ChatDrawer.tsx, AiSuggestionCard.tsx, AiWritePreviewPanel.tsx — W05
AiSettings.tsx — W05 (can read for design reference but do NOT modify in this ticket)
AI Evaluation Harness — W05
Any existing canvas features or contracts (LOCKED)
Any existing API files (premiseApi, structureApi, etc.)
src-tauri/src/byok/ (unless explicit extension needed with explanation in report)
```

## Acceptance Criteria

1. `npm run tsc -- --noEmit` passes
2. `cargo check` passes
3. `npm run accept:static` passes
4. All 5 skills return correct `prompt_template` + `input_schema` + `output_schema` from `listSkills` / `getSkill`
5. AI Control Center renders as a standalone page (not breaking App navigation)
6. Provider add/modify/delete works end-to-end (UI → API → Tauri → DB → refresh)
7. Connection test button calls endpoint and shows result (success/latency or error)
8. Model role assignment stores/retrieves selections
9. Capability status table correctly reflects configured providers
10. No provider config = Control Center shows empty state, not crash
11. `npm run accept:persistence` passes (ai_provider_config, ai_prompt_registry tables tested)

## Notes

- The Control Center is a new standalone UI — it does NOT replace AiSettings.tsx. AiSettings will get a navigation link to it in W05.
- Provider config is stored in the new `ai_provider_config` table (not the existing BYOK `api_keys` table). The BYOK table remains unchanged.
- No provider configured → Control Center shows clear guidance to add a provider. No crash, no undefined behavior.
- Connection testing uses the existing `testConnection` function pattern from `llm-client.ts` (read-only reference, do not modify in this ticket).
