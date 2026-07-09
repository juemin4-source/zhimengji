# TICKET T-001 — Tech Spike: Canvas 2 @xyflow Custom Hierarchy

## Metadata

| Field | Value |
|-------|-------|
| Ticket ID | v2.1.0-T-001 |
| Title | Tech Spike — Canvas 2 @xyflow L1-L4 Custom Hierarchy Feasibility Validation |
| Execution Order | 1 / 8 (after prework, before batch 4 / T-005) |
| Dependencies | T-000 (pre-dispatch gate passed) |
| Risk | medium (research spike, no production code) |
| Terse | off (research spike needs reasoning and evidence) |

## Objective

Validate that @xyflow (reactflow) can render a custom 4-layer hierarchical structure (book -> shiwei -> hou -> zhang) with zoom/pan, breadcrumb navigation, and layer state retention — BEFORE any Canvas 2 implementation begins.

Output a **Spike Report** with concrete findings, code experiments, and feasibility judgment. If infeasible, recommend alternatives before T-005 (Batch 4).

---

## Detailed Scope

### 1. What to Spike

Build 3 isolated prototypes in a scratch directory (not in production code):

#### Prototype A: L1-L4 Zoom/Pan Performance

- Render 4 layers as nested node clusters using @xyflow custom nodes
- L1 (Book): 1 root node
- L2 (Shiwei): up to 6 children
- L3 (Hou): up to 30 per shiwei (~180 max)
- L4 (Zhang): up to 10 per hou (~1800 max)
- Verify:
  - Zoom-to-fit per layer
  - Pan across large graphs
  - Performance at max node counts (1800 L4 nodes) — frame rate, render latency
  - Collapse/expand intermediate layers

#### Prototype B: Breadcrumb Path Construction

- Render breadcrumb trail: `Book > Shiwei > Hou > Zhang`
- Clicking a breadcrumb segment navigates to that level
- Breadcrumb updates dynamically as user zooms in/out
- Current level highlighted

#### Prototype C: Layer State Retention

- When user navigates L4 -> zooms out to L2 -> back to L4, all expanded/collapsed states are retained
- Node positions persist during zoom/pan
- Selection state (selected node) follows navigation
- No data loss during layer switches

### 2. Spike Report Output

Produce `docs/execution/spike-canvas2-xyflow-report.md` containing:

```markdown
# Canvas 2 @xyflow Spike Report

## Verdict
FEASIBLE / FEASIBLE_WITH_CAVEATS / INFEASIBLE

## Prototype Results
### A: L1-L4 Zoom/Pan
- Max node count tested: X
- Frame rate at 1800 nodes: Y fps
- Observations: ...

### B: Breadcrumb
- Implementation approach: ...
- Integration effort: ...

### C: Layer State Retention
- State management approach: ...
- Persistence strategy: ...

## Recommended Approach
- Which @xyflow APIs to use (custom nodes, layout, zoom behavior)
- Data structure for 4-layer hierarchy
- State management pattern (zustand store vs reactflow internal)
- Performance optimization needed (virtualization, level-of-detail)
- Estimated implementation effort (story points or days)

## Risks and Mitigations
- Identified risk 1 -> mitigation
- Identified risk 2 -> mitigation

## Blockers (if any)
- None / [list]

## Recommended Next Action
- Proceed with T-005 as planned
- Proceed with T-005 but with caveats (specified)
- Need alternative approach: [description]
```

### 3. What NOT to Spike

- No AI integration (methods, skills, commands) — T-005 handles that
- No persistence (DB tables, API layer) — T-005 handles that
- No CN-MET-02 contract types — T-005 handles that
- No production CSS / pixel-perfect styling — spike is for feasibility only
- No animations or transitions (those are v2.1.1 Out of Scope)

---

## Allowed Write

Scratch directory only (NOT production code):

```
NEW: .claude/spikes/canvas2-xyflow/prototype-a-zoom-pan.tsx        (spike prototype)
NEW: .claude/spikes/canvas2-xyflow/prototype-b-breadcrumb.tsx      (spike prototype)
NEW: .claude/spikes/canvas2-xyflow/prototype-c-state-retention.tsx (spike prototype)
NEW: docs/execution/spike-canvas2-xyflow-report.md                 (spike report)
```

If prototypes need to be tested in the actual app context (due to @xyflow version/compatibility), create a spike branch and report findings.

## Read Only (for context)

```
src/features/canvas-02-structure/**        — existing canvas 2 code
package.json                               — @xyflow/react version
src-tauri/Cargo.toml                        — Rust dependencies (not relevant but spike may reference)
```

## Forbidden

```
Any production source file modification
Any contract, API, store, or backend changes
src/features/canvas-02-structure/**        — do not modify
src/contracts/structure.contract.ts        — CN-MET-02 types defined in T-005
```

## Acceptance Criteria

1. Spike report exists at `docs/execution/spike-canvas2-xyflow-report.md`
2. Report contains clear verdict: FEASIBLE / FEASIBLE_WITH_CAVEATS / INFEASIBLE
3. All 3 prototypes were attempted (findings may report infeasibility for any)
4. Performance data at realistic node counts provided
5. Clear recommendation for implementation approach in T-005
6. If INFEASIBLE, alternative approach is recommended

## Notes

- This spike is **blocking** for T-005. Do not start T-005 until spike report is available and verdict is FEASIBLE (or FEASIBLE_WITH_CAVEATS with actionable mitigations).
- The scratch directory `.claude/spikes/canvas2-xyflow/` is ephemeral — it will be removed before final gate unless it contains the prototype code.
- @xyflow has native support for custom nodes, nested graphs, and controlled viewport. Focus on integration difficulty with the existing React/TypeScript/zhimengji codebase, not on whether @xyflow can do it in isolation.
- L4 at 1800 nodes is the worst case. If performance is acceptable at 500-1000, note the divergence and recommend a level-of-detail strategy.
