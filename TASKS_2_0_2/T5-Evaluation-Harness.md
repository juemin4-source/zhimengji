# T5: AI Evaluation Harness + Acceptance

## Metadata

- **Order:** 5 (fifth, last)
- **Dependencies:** T1 (parser, Control Center), T2 (registry), T3 (context builder), T4 (router + canvas wiring)
- **Risk:** low
- **Terse:** low

## Goal

Implement the AI Evaluation Harness with >= 17 fixture tests covering all AI infrastructure components, update acceptance scanner scripts to include AI entities, and verify all acceptance paths pass.

## Scope

### In Scope

- evaluation-harness.ts: test runner that processes each fixture: loads input -> invokes AI component -> schema validates output -> verifies outputType behavior -> checks DB non-write rules -> records pass/fail with failure sample
- ai-evaluation.mjs: acceptance script that runs the evaluation harness, aggregates results, reports pass/fail per fixture
- scan-contract-chain.mjs: add AI entity contracts to the scanner (ai-context, ai-router, ai-parser, ai-registry)
- persistence.mjs: add persistence tests for new AI tables (ai_prompt_registry, ai_provider_config, ai_evaluation_results)

### The 17 Fixtures

| # | Fixture ID | Type | Validates |
|---|------------|------|-----------|
| 1 | premise.discuss | discuss | Context Builder loads premise data, routes to discuss, 0 DB writes |
| 2 | premise.suggest | suggest | Router routes premise intent to suggest, parser validates output |
| 3 | structure.discuss | discuss | Context Builder loads structure data, routes to discuss |
| 4 | structure.suggest | suggest | Router routes structure intent to suggest |
| 5 | setting.discuss | discuss | Context Builder loads world rules + characters |
| 6 | setting.suggest | suggest | Router routes setting intent to suggest |
| 7 | packet.write_preview | write_preview | Context: premise+structure+setting, router generates packet, parser validates packet JSON, 0 DB writes before confirm |
| 8 | draft.write_preview | write_preview | Context: packet+setting, router generates draft, parser validates, 0 DB writes before confirm |
| 9 | packet.suggest | suggest | Router routes packet intent to suggest (preview before confirm) |
| 10 | parser.invalid_schema | parser | Malformed JSON -> FALLBACK, not crash |
| 11 | parser.missing_field | parser | Missing required fields -> REPAIRED (auto-completed) |
| 12 | parser.illegal_field | parser | Extra fields -> stripped, VALID |
| 13 | router.unrecognized | router | Gibberish input -> discuss fallback |
| 14 | router.assumption_flow | assumption | "we need a character" -> assumption handler |
| 15 | db.no_write_on_discuss | persistence | After discuss: 0 new rows in any canvas table |
| 16 | db.no_write_before_accept | persistence | After suggest (before accept): 0 new canvas rows |
| 17 | registry.all_five | registry | All 5 skills return correct prompt_template + schemas |

### Out of Scope

- New AI infrastructure features (all implemented in T1-T4)
- Canvas UI changes
- Legacy AIChat modification
- Commercial features

## Allowed Writes

### New Files

| Path | Reason |
|------|--------|
| `src/lib/ai/evaluation-harness.ts` | Fixture runner: input loading -> component invocation -> output validation -> DB check -> pass/fail recording |
| `scripts/acceptance/ai-evaluation.mjs` | Acceptance script: runs harness, outputs structured results, exits 0 on all pass |

### Existing Files (Modifications Allowed)

| Path | Reason |
|------|--------|
| `scripts/acceptance/scan-contract-chain.mjs` | Add AI entity entries: ai-context, ai-router, ai-parser, ai-registry |
| `scripts/acceptance/persistence.mjs` | Add persistence tests for ai_prompt_registry, ai_provider_config, ai_evaluation_results |

## Read Only (for reference, not modification)

- All AI contract files (ai-context.contract.ts, ai-router.contract.ts, ai-parser.contract.ts, ai-registry.contract.ts)
- All AI lib files (context-builder.ts, command-router.ts, structured-parser.ts, prompt-registry.ts)
- All canvas contracts and data-access APIs (needed to understand fixture data shapes)
- Existing acceptance scripts (scan-contract-chain.mjs, persistence.mjs) -- to understand the pattern
- T1-T4 ticket files for context

## Acceptance Criteria

```bash
cargo check                        # PASS
npm run tsc -- --noEmit            # PASS
npm run accept:static              # PASS (42/42)
npm run accept:contracts           # PASS (AI entities added, 42/42 + AI entries)
npm run accept:persistence         # PASS (AI tables tested)
npm run accept:ai                  # PASS (17/17+ fixtures ALL PASS)
```

### Harness Requirements

- Each fixture: input -> schema validate -> outputType behavior test -> DB non-write test -> failure record
- Fixture IDs match the table above
- All fixtures use real AI outputs or schema-validated test vectors (no mocks)
- Fixtures that test DB writes: verify table row count before and after
- Fixtures that test no-write: verify 0 new rows in ALL canvas tables
- Failures recorded with fixture_id, test_name, failure_sample, passed=0
- Harness exits with non-zero if any fixture fails

### Manual Acceptance Paths

Each of these 5 paths must be verified manually after T5:

- **Path A (Control Center)**: Add/modify/delete provider, model selection, connection test, verify persistence on restart
- **Path B (Canvas Routing)**: Discuss -> ChatDrawer, 0 DB writes. Suggest -> card, Accept=1 DB row. Write_preview -> preview, Confirm=written
- **Path C (Structured Fallback)**: Malformed AI output -> parser falls back to plain text, no crash
- **Path D (No Provider)**: Fresh app, no provider -> "unconfigured" error, no crash
- **Path E (v2.0-H Regression)**: Create project, navigate all 5 canvases, save, refresh, data persists, Legacy menu accessible

### Strict Prohibitions

- No mock AI responses in acceptance paths (fixtures use recorded real AI outputs or schema-validated test vectors)
- No DB writes by discuss-type fixtures
- No modification to existing canvas acceptance tests
- No modification to existing canvas contracts
- No modification to canvas UI components
