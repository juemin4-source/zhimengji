# T2: Prompt/Skill Registry

## Metadata

- **Order:** 2 (second)
- **Dependencies:** T1 (builds on shared infra: lib.rs, models.rs, db.rs, mod.rs, types/ai.ts)
- **Risk:** low
- **Terse:** low

## Goal

Implement the Prompt/Skill Registry with 5 registered skill templates, versioned prompt templates, input/output schemas, and CRUD via the `ai_prompt_registry` table.

## Scope

### In Scope

- ai-registry contract: SkillRecord, RegisterInput, ListSkillsOutput types
- prompt-registry.ts: frontend logic layer for skill queries
- skill_registry.rs: Rust backend for skill CRUD + template retrieval
- DB table: ai_prompt_registry (CREATE TABLE IF NOT EXISTS)
- 5 registered skills returned by the registry
- Models.rs structs for skill registry entities

### Out of Scope

- Writing the actual content of the 5 skill prompts (included, but as data constants)
- Context building (T3)
- Command routing (T4)
- Control Center (T1)
- Evaluation harness (T5)

## Allowed Writes

### New Files

| Path | Reason |
|------|--------|
| `src/contracts/ai-registry.contract.ts` | SkillRecord interface, RegisterInput, ListSkillsOutput; input_schema/output_schema as JSON types |
| `src/lib/ai/prompt-registry.ts` | Frontend registry client: list skills, get skill by skillId, register skill |
| `src-tauri/src/ai/skill_registry.rs` | Rust backend: CRUD for ai_prompt_registry table, template retrieval by skill_id |

### Existing Files (Modifications Allowed)

| Path | Reason |
|------|--------|
| `src-tauri/src/ai/mod.rs` | Add `pub mod skill_registry;` |
| `src-tauri/src/lib.rs` | Register skill_registry commands |
| `src-tauri/src/models.rs` | Add ai_prompt_registry struct (id, skill_id, name, description, prompt_template, input_schema, output_schema, version, created_at, updated_at) |
| `src-tauri/src/db.rs` | Add ai_prompt_registry table (CREATE TABLE IF NOT EXISTS, additive only) |
| `src/types/ai.ts` | Add SkillRecord, RegisterInput, ListSkillsOutput types (if not sufficiently covered by T1) |

## Read Only (for reference, not modification)

- Everything in T1 Read Only list
- T1's contract files (ai-parser.contract.ts)
- T1's structured-parser.ts (not needed, but no harm reading)

## The 5 Registered Skills

The registry must seed and return these 5 skills:

| skill_id | purpose |
|----------|---------|
| `premise.five_step` | Premise canvas AI: five-step story premise refinement |
| `structure.l1_l4` | Structure canvas AI: level 1-4 story structure generation |
| `setting.sparrow_9_3` | Setting canvas AI: sparrow 9+3 worldbuilding framework |
| `packet.three_detail_modes` | Packet canvas AI: three detail-mode chapter packet generation |
| `draft.chapter_writer` | Draft (text) canvas AI: chapter-level prose drafting |

Each skill record includes:
- `skill_id` (unique, matches the key above)
- `name` (human-readable)
- `description` (short summary)
- `prompt_template` (the full prompt text)
- `input_schema` (JSON schema for expected input fields)
- `output_schema` (JSON schema for expected output structure)
- `version` (semver string, e.g. "1.0.0")

## Acceptance Criteria

```bash
cargo check      # PASS
npm run tsc -- --noEmit  # PASS
npm run accept:static    # PASS
```

### Functional Tests (run manually or via ad-hoc script)

- `registry.all_five` fixture: list all 5 skills returns 5 records with correct skill_ids
- Each skill returns non-empty prompt_template
- Each skill returns valid input_schema + output_schema (parseable as JSON)
- Skill lookup by skill_id returns correct record
- Skill lookup for non-existent skill_id returns None (no crash, no panic)
- Register a new skill, then list includes it

### Strict Prohibitions

- No modification to existing DB tables (additive only)
- No modification to canvas contracts
- No silent writes to canvas tables
- Skill not found -> None, not panic or crash
