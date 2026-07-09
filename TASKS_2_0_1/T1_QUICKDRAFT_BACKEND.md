# T1: QuickDraft Backend Layer — Contracts + DB Schema + Rust Commands + API Clients

## Metadata

| Field | Value |
|-------|-------|
| **Order** | 1 |
| **Dependencies** | None |
| **Execution** | worker-be |
| **Risk** | medium (shared foundation — affects db.rs, lib.rs, models.rs) |
| **Terse** | off |

## Objective

Create the backend foundation for v2.0.1: QuickDraft TypeScript contract, Rust DB table + models, all three Rust command modules (quick_draft, export, feedback), and frontend API client wrappers.

This ticket covers the **data layer** for all 5 scope items. Without it, T2 and T3 have no backend to call.

## In Scope

| # | Scope Item | Coverage |
|---|-----------|----------|
| 1 | QuickDraft 入口 | Contract + DB + Rust command + API client |
| 2 | 5 分钟路径 | Indirect (backend is prerequisite) |
| 3 | Demo 项目 | Contract `import type` only (seed data in T2) |
| 4 | Markdown 导出 | Rust export command + API client |
| 5 | 反馈入口 | Rust feedback command + API client |

## Allowed Write

| File | Action |
|------|--------|
| `src/contracts/quick-draft.contract.ts` | **NEW** — QuickDraft type definitions |
| `src-tauri/src/models.rs` | **EDIT** — append QuickDraftInput, QuickDraft, QuickDraftRow, QuickDraftGenerateResult, ExportInput, FeedbackInput structs |
| `src-tauri/src/db.rs` | **EDIT** — append `quick_drafts` table init + CRUD; append `insert_feedback_to_decision_log` helper |
| `src-tauri/src/quick_draft_commands.rs` | **NEW** — `quickdraft_generate`, `quickdraft_transfer`, `quickdraft_list_by_project`, `quickdraft_get`, `quickdraft_delete` |
| `src-tauri/src/export_commands.rs` | **NEW** — `export_text_as_markdown` |
| `src-tauri/src/feedback_commands.rs` | **NEW** — `submit_feedback` |
| `src-tauri/src/lib.rs` | **EDIT** — register all new command modules and commands |
| `src/api/quickDraftApi.ts` | **NEW** — API client for QuickDraft commands |
| `src/api/feedbackApi.ts` | **NEW** — API client for feedback command |
| `scripts/acceptance/accept-quickdraft.ts` | **NEW** — QuickDraft persistence acceptance script |
| `scripts/acceptance/accept-export.ts` | **NEW** — Export command acceptance script |
| `scripts/acceptance/accept-feedback.ts` | **NEW** — Feedback submission acceptance script |
| `package.json` | **EDIT** — append `accept:quickdraft`, `accept:export`, `accept:feedback` npm script entries |

## Forbidden

- Any change to existing DB table definitions or migrations
- Any change to existing contract file signatures
- Any change to existing API client method signatures
- Any change to stores, UI components, or feature code
- Any change to Canvas AI infrastructure (CanvasAiBar, llm-client, ai/ directory)
- Any use of `localStorage`
- Any AI silent write to formal canvas data tables

## Implementation Details

### 1. Contract: `src/contracts/quick-draft.contract.ts` (NEW)

```typescript
// Minimum fields for QuickDraft — references existing types via `import type` only

export interface QuickDraftGenerateInput {
  projectId: string;
  userInput: string;
}

export interface QuickDraftTransferInput {
  draftId: string;
}

export interface QuickDraft {
  id: string;
  projectId: string;
  userInput: string;
  premiseText: string;
  premiseType: string;
  chapters: string;         // JSON string of Array<{title, content}>
  status: 'draft' | 'transferred';
  createdAt: number;
}

export interface QuickDraftGenerateResult {
  draft: QuickDraft;
  previewTitle: string;
  previewContent: string;    // concatenated chapter content for preview
}
```

Rules:
- Operate with `import type` from existing contracts (premise.contract.ts etc.) if needed — never import runtime values.
- `chapters` stored as JSON string to match SQLite TEXT pattern (same as existing `reader_questions`, `tags` etc.).
- Snake_case in Rust ↔ camelCase in TS, matching existing convention (`#[serde(rename_all = "camelCase")]`).

### 2. Rust Models: `src-tauri/src/models.rs` (EDIT)

Append after the DecisionLog section (line ~760):

```rust
// ===== v2.0.1 QuickDraft =====

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickDraftInput {
    pub project_id: String,
    pub user_input: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickDraftGenerateResult {
    pub draft: QuickDraftApi,
    pub preview_title: String,
    pub preview_content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickDraftApi {
    pub id: String,
    pub project_id: String,
    pub user_input: String,
    pub premise_text: String,
    pub premise_type: String,
    pub chapters: String,    // JSON: [{title, content}]
    pub status: String,      // "draft" | "transferred"
    pub created_at: i64,
}

// DB Row
#[derive(Debug, Clone)]
pub struct QuickDraftRow {
    pub id: String,
    pub project_id: String,
    pub user_input: String,
    pub premise_text: String,
    pub premise_type: String,
    pub chapters: String,
    pub status: String,
    pub created_at: i64,
}

impl QuickDraftRow {
    pub fn to_api(self) -> QuickDraftApi {
        QuickDraftApi {
            id: self.id,
            project_id: self.project_id,
            user_input: self.user_input,
            premise_text: self.premise_text,
            premise_type: self.premise_type,
            chapters: self.chapters,
            status: self.status,
            created_at: self.created_at,
        }
    }
}

// ===== v2.0.1 Export =====

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportInput {
    pub chapter_content: String,   // Markdown text to export
    pub default_name: String,      // suggested filename for dialog
}

// ===== v2.0.1 Feedback =====

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FeedbackInput {
    pub project_id: String,
    pub rating: i64,             // 1-5
    pub feedback_text: String,   // optional, can be ""
}
```

### 3. DB: `src-tauri/src/db.rs` (EDIT)

**3a.** In `init_schema()`, add `init_quick_drafts_table(&conn)?;` after the decision_logs init (line ~121).

**3b.** Add table init function (in the "===== v2 DecisionLog =====" area, or create a new `// ===== v2.0.1 QuickDraft =====` section before the DecisionLog section):

```rust
// ===== v2.0.1 QuickDraft =====

pub fn init_quick_drafts_table(conn: &Connection) -> SqlResult<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS quick_drafts (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          user_input TEXT NOT NULL,
          premise_text TEXT NOT NULL DEFAULT '',
          premise_type TEXT NOT NULL DEFAULT '',
          chapters TEXT NOT NULL DEFAULT '[]',
          status TEXT NOT NULL DEFAULT 'draft',
          created_at INTEGER NOT NULL,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_qd_project ON quick_drafts(project_id);
        CREATE INDEX IF NOT EXISTS idx_qd_status ON quick_drafts(status);"
    )?;
    Ok(())
}
```

**3c.** Add CRUD methods inside `impl Database { ... }` block:

```rust
pub fn create_quick_draft(&self, input: &QuickDraftInput, premise_text: &str, premise_type: &str, chapters: &str) -> SqlResult<QuickDraftApi> {
    let conn = self.conn.lock().unwrap();
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp_millis();
    conn.execute(
        "INSERT INTO quick_drafts (id, project_id, user_input, premise_text, premise_type, chapters, status, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'draft', ?7)",
        params![id, input.project_id, input.user_input, premise_text, premise_type, chapters, now],
    )?;
    Ok(QuickDraftApi {
        id,
        project_id: input.project_id.clone(),
        user_input: input.user_input.clone(),
        premise_text: premise_text.to_string(),
        premise_type: premise_type.to_string(),
        chapters: chapters.to_string(),
        status: "draft".to_string(),
        created_at: now,
    })
}

pub fn get_quick_draft(&self, id: &str) -> SqlResult<Option<QuickDraftApi>> {
    let conn = self.conn.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id, project_id, user_input, premise_text, premise_type, chapters, status, created_at
         FROM quick_drafts WHERE id = ?"
    )?;
    let mut rows = stmt.query_map(params![id], |row| {
        Ok(QuickDraftRow {
            id: row.get(0)?,
            project_id: row.get(1)?,
            user_input: row.get(2)?,
            premise_text: row.get(3)?,
            premise_type: row.get(4)?,
            chapters: row.get(5)?,
            status: row.get(6)?,
            created_at: row.get(7)?,
        })
    })?;
    match rows.next() {
        Some(r) => Ok(Some(r?.to_api())),
        None => Ok(None),
    }
}

pub fn list_quick_drafts_by_project(&self, project_id: &str) -> SqlResult<Vec<QuickDraftApi>> {
    let conn = self.conn.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id, project_id, user_input, premise_text, premise_type, chapters, status, created_at
         FROM quick_drafts WHERE project_id = ? ORDER BY created_at DESC"
    )?;
    let rows = stmt.query_map(params![project_id], |row| {
        Ok(QuickDraftRow {
            id: row.get(0)?,
            project_id: row.get(1)?,
            user_input: row.get(2)?,
            premise_text: row.get(3)?,
            premise_type: row.get(4)?,
            chapters: row.get(5)?,
            status: row.get(6)?,
            created_at: row.get(7)?,
        })
    })?;
    let mut drafts = Vec::new();
    for r in rows {
        drafts.push(r?.to_api());
    }
    Ok(drafts)
}

pub fn transfer_quick_draft(&self, id: &str) -> SqlResult<QuickDraftApi> {
    let conn = self.conn.lock().unwrap();
    let now = chrono::Utc::now().timestamp_millis();
    conn.execute(
        "UPDATE quick_drafts SET status = 'transferred', premise_text = premise_text WHERE id = ?",
        params![id],
    )?;
    drop(conn);
    self.get_quick_draft(id).map(|opt| opt.expect("quick_draft not found after transfer"))
}

pub fn delete_quick_draft(&self, id: &str) -> SqlResult<()> {
    let conn = self.conn.lock().unwrap();
    conn.execute("DELETE FROM quick_drafts WHERE id = ?", params![id])?;
    Ok(())
}
```

**3d.** Add feedback helper that reuses `decision_logs` table (no new table needed — feedback entries are decision_logs with operation='feedback'):

```rust
// Inside impl Database { ... }
pub fn submit_feedback(&self, input: &FeedbackInput) -> SqlResult<DecisionLogEntry> {
    self.append_decision_log(&AppendDecisionLogInput {
        project_id: input.project_id.clone(),
        operation: "feedback".to_string(),
        summary: format!("rating={}", input.rating),
        entity_type: Some("feedback".to_string()),
        entity_id: Some("".to_string()),
        details: Some(if input.feedback_text.is_empty() { "{}".to_string() } else {
            serde_json::json!({"text": input.feedback_text}).to_string()
        }),
    })
}
```

Note: You may also add a minimal `list_feedback` helper that queries `decision_logs WHERE operation = 'feedback'` for admin use. Keep it simple.

**3e.** Update import line at top of db.rs to include `QuickDraftApi, QuickDraftInput, QuickDraftRow, FeedbackInput` in the models import.

### 4. Rust Command: `src-tauri/src/quick_draft_commands.rs` (NEW)

```rust
use crate::{db::Database, models::*};
use tauri::State;

#[tauri::command]
fn quickdraft_generate(database: State<Database>, input: QuickDraftInput)
    -> Result<QuickDraftGenerateResult, String>
{
    // Step 1: Generate PremiseCard + chapter drafts using CanvasAiBar / llm-client
    // For this ticket: stub AI call that produces minimal premise + chapter
    //   (real AI integration is part of T2, but the DB write happens here)
    //
    // In v2.0.1 the implementation should:
    //   - Call an LLM (reusing existing llm-client infra in src-tauri) to generate
    //     a premise + 1-2 chapter drafts based on user_input
    //   - The exact LLM call mechanism will be determined during implementation;
    //     at minimum, produce a premise_text and a chapters JSON string

    // PSEUDO:
    // let ai_result = call_llm_for_quickdraft(&input.user_input)?;
    // let draft = database.create_quick_draft(&input, &ai_result.premise, &ai_result.premise_type, &ai_result.chapters_json)
    //     .map_err(|e| format!("DB_ERROR: {}", e))?;

    // For now, implementation should produce a real AI-generated QuickDraft.
    // The key is: save to quick_drafts table, return the result.
}

#[tauri::command]
fn quickdraft_transfer(database: State<Database>, input: QuickDraftTransferInput)
    -> Result<QuickDraftApi, String>
{
    // 1. Load the draft
    let draft = database.get_quick_draft(&input.draft_id)
        .map_err(|e| format!("DB_ERROR: {}", e))?
        .ok_or_else(|| "NOT_FOUND: draft not found".to_string())?;

    // 2. Create premise_card from draft data
    //    Call database.create_premise_card(...) using existing API
    //    Parse draft.chapters to create structure_nodes + chapter_packets

    // 3. Mark draft as transferred
    database.transfer_quick_draft(&input.draft_id)
        .map_err(|e| format!("DB_ERROR: {}", e))
}

#[tauri::command]
fn quickdraft_list_by_project(database: State<Database>, input: ListQuickDraftsInput)
    -> Result<Vec<QuickDraftApi>, String>
{
    database.list_quick_drafts_by_project(&input.project_id)
        .map_err(|e| format!("DB_ERROR: {}", e))
}

// Input structs for list/get/delete - add to models.rs
```

Note: Add `ListQuickDraftsInput`, `GetQuickDraftInput`, `DeleteQuickDraftInput` to `models.rs`.

### 5. Rust Command: `src-tauri/src/export_commands.rs` (NEW)

```rust
use tauri::State;
use tauri::Manager;

#[tauri::command]
fn export_text_as_markdown(app: tauri::AppHandle, input: ExportInput)
    -> Result<String, String>
{
    // 1. Open Tauri save dialog for .md file
    // 2. Write chapter_content to selected path
    // 3. Return the saved file path

    use tauri_plugin_dialog::FileDialogBuilder;

    let file_path = app.dialog()
        .file()
        .add_filter("Markdown", &["md"])
        .set_file_name(&input.default_name)
        .save_file()
        .await  // Note: this requires async. Check if tauri_plugin_dialog is already available.
        .ok_or_else(|| "CANCELLED: user cancelled file dialog".to_string())?;

    std::fs::write(&file_path, &input.chapter_content)
        .map_err(|e| format!("IO_ERROR: {}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}
```

**Important**: Verify `tauri_plugin_dialog` is in `Cargo.toml` dependencies and configured in `tauri.conf.json`. If not, add it. This plugin provides the native file save dialog.

### 6. Rust Command: `src-tauri/src/feedback_commands.rs` (NEW)

```rust
use crate::{db::Database, models::*};
use tauri::State;

#[tauri::command]
fn submit_feedback(database: State<Database>, input: FeedbackInput)
    -> Result<DecisionLogEntry, String>
{
    database.submit_feedback(&input)
        .map_err(|e| format!("DB_ERROR: {}", e))
}

#[tauri::command]
fn list_feedback(database: State<Database>, input: ListFeedbackInput)
    -> Result<Vec<DecisionLogEntry>, String>
{
    // Query decision_logs WHERE operation = 'feedback' for given project_id
    // (Admin-level; used for reading feedback entries)
    use crate::models::ListDecisionLogsInput;
    database.list_decision_logs(&ListDecisionLogsInput { project_id: input.project_id })?
        .into_iter()
        .filter(|log| log.operation == "feedback")
        .collect()
}
```

Note: Add `ListFeedbackInput` to models.rs (just `{ project_id: String }`).

### 7. Register commands in `src-tauri/src/lib.rs` (EDIT)

```rust
// Add modules
mod quick_draft_commands;
mod export_commands;
mod feedback_commands;

// In invoke_handler, add:
quick_draft_commands::quickdraft_generate,
quick_draft_commands::quickdraft_transfer,
quick_draft_commands::quickdraft_list_by_project,
quick_draft_commands::quickdraft_get,
quick_draft_commands::quickdraft_delete,
export_commands::export_text_as_markdown,
feedback_commands::submit_feedback,
feedback_commands::list_feedback,
```

### 8. API Client: `src/api/quickDraftApi.ts` (NEW)

Follow the pattern of `premiseApi.ts`:
- Import `invoke` from `@tauri-apps/api/core`
- Import types from `../contracts/quick-draft.contract`
- Methods: `generateQuickDraft`, `transferQuickDraft`, `listQuickDrafts`, `getQuickDraft`, `deleteQuickDraft`
- Each wraps `invoke('quickdraft_*', { input })` with proper types
- Handle JSON string ↔ array conversion for `chapters` field

### 9. API Client: `src/api/feedbackApi.ts` (NEW)

Methods: `submitFeedback`, `listFeedback`
- Wrap `invoke('submit_feedback', { input })` and `invoke('list_feedback', { input })`
- Return proper typed results

### 10. Acceptance Scripts (NEW)

Create under `scripts/acceptance/`:

- `accept-quickdraft.ts` — Test: create QuickDraft → verify in DB → transfer → verify status changed
- `accept-export.ts` — Test: export command returns a path (requires headless mode or mock dialog)
- `accept-feedback.ts` — Test: submit feedback → verify in decision_logs

### 11. Package.json (EDIT)

Append:
```json
"accept:quickdraft": "node scripts/acceptance/accept-quickdraft.ts",
"accept:export": "node scripts/acceptance/accept-export.ts",
"accept:feedback": "node scripts/acceptance/accept-feedback.ts",
```

## Tauri Convention Compliance

- All Rust command names: `snake_case` (e.g. `quickdraft_generate`)
- All API client method names: `camelCase` (e.g. `generateQuickDraft`)
- All command params wrapped in `{ input }` on the invoke call
- Rust return type: `Result<T, String>`
- Never `any` or `unknown` in API client types

## Acceptance Criteria

| Check | How |
|-------|-----|
| `cargo check` passes | No compilation errors in Rust |
| `tsc --noEmit` passes | No TypeScript errors |
| `accept:quickdraft` passes | QuickDraft CRUD works end-to-end |
| `accept:export` passes | Export command returns valid path |
| `accept:feedback` passes | Feedback written to decision_logs |
| Existing DB tables unchanged | Verify with schema check |
| Existing `accept:e2e` passes | v2.0-H regression — no breaking changes |

## Blockers

| Condition | Action |
|-----------|--------|
| `tauri_plugin_dialog` not in Cargo.toml | Add it before implementing export command |
| `tauri_plugin_dialog` not in tauri.conf.json | Add it in the plugins section |
| Existing contract files need changes | BLOCK — this ticket must not modify existing contracts |
| `lib.rs` registration conflicts with parallel T3 | Does not conflict — both add commands; lib.rs is single-writer serial |