# Post-M4: AI Phase (Phase 11)

**Goal:** LLM-assisted transform nodes with **no RefineIt backend** — user-provided API keys, client-side provider calls, feature-flagged until privacy review.

**Prerequisites:** M9 complete; [`plan/12-node-expansion.md`](../plan/12-node-expansion.md) Phase 0 (palette groups) recommended.

**Parent plan:** [12-node-expansion.md](../plan/12-node-expansion.md) § Phase 11.

**Palette group:** `ai` — Classify, Summarize, Anonymize.

---

## Constraints (non-negotiable)

- No RefineIt server, proxy, or default cloud endpoint.
- User selects provider URL (OpenAI-compatible) or local WebLLM; user supplies API key.
- Offline / no key: AI nodes disabled with clear inspector messaging; validate() fails before run.
- API keys **never** in workflow JSON, share URLs, or codegen export.
- Default execution cap: first **100 rows** per run (configurable upper bound in settings).
- LLM calls on **main thread** (keys stay out of worker logs); pass column results to worker as bounded preview/data injection.

---

## Task 1: Feature flag & settings surface

### Implementation

- [ ] `VITE_ENABLE_AI_NODES` or runtime flag in `ui-store` (default `false` until privacy sign-off).
- [ ] When disabled: `ai` palette group hidden or nodes show "Coming soon" — pick one behavior and document.
- [ ] Settings panel section: **AI provider** (base URL, model name, optional org header).
- [ ] API key field: `sessionStorage` default (cleared on tab close); optional "Remember on this device" → IndexedDB with documented tradeoff in About.
- [ ] "Test connection" button (minimal ping request, no workflow data).
- [ ] Rate limit guard: max requests per minute in client (simple token bucket).

### Files

| Action | Path |
|--------|------|
| Create / extend | `src/ui/SettingsDialog.tsx` or `src/ui/AiSettingsPanel.tsx` |
| Extend | `src/state/ui-store.ts` |
| Extend | `src/lib/constants.ts` |

### Tests

- [ ] Unit: key not persisted in `serializeWorkflow()` output.
- [ ] Unit: flag off → AI node types not in palette or not draggable.

---

## Task 2: AI client module (main thread)

### Implementation

- [ ] `src/ai/client.ts` — typed wrapper around `fetch` to OpenAI-compatible `/chat/completions` or `/responses`.
- [ ] Timeouts (e.g. 30s), retry once on network error, structured `AiClientError`.
- [ ] Request/response logging: redact key and row content in dev-only debug.
- [ ] Batch helper: `runBatched<T>(items, batchSize, fn)` for row-wise classify.

### Files

| Action | Path |
|--------|------|
| Create | `src/ai/client.ts` |
| Create | `src/ai/types.ts` |

### Tests

- [ ] Unit: mock `fetch` — success, 401, timeout, rate limit response.

---

## Task 3: Worker boundary for AI results

### Implementation

- [ ] **Do not** call LLM from worker.
- [ ] Main thread: run AI batch → build column values array (length = processed rows).
- [ ] Worker RPC: `injectColumn(nodeId, columnName, values[])` or pass via existing execution path as ephemeral config for that run only.
- [ ] Worker: assign column on `node_<id>` DataFrame copy; never store API key in worker global scope.
- [ ] Full pipeline: AI node `compile()` emits placeholder or `assign` from pre-injected column — document hybrid execution model in `04-execution-engine.md`.

### Files

| Action | Path |
|--------|------|
| Extend | `src/engine/kernel-client.ts` |
| Extend | `src/worker/kernel.ts` |
| Extend | `src/engine/pipeline.ts` |

### Tests

- [ ] Integration (browser): mock AI client → inject column → preview shows new column.

---

## Task 4: Node `ai.classify`

### Implementation

- [ ] `src/nodes/ai-classify.ts` — `paletteGroup: 'ai'`, category `transform`.
- [ ] Config: `column`, `labels: string[] | 'auto'`, `promptTemplate?`, `maxRows` (default 100).
- [ ] `validate`: column exists; labels non-empty if not auto; API key present when flag on.
- [ ] `compile`: export mode only — comment that classification ran via API; no key in script.
- [ ] Runtime: main-thread classify → inject `{column}_class`.
- [ ] Inspector: column picker, labels list, template textarea, row limit.
- [ ] `configSummary()` one-liner.
- [ ] Schema propagation: output adds string column `{column}_class`.

### Tests

- [ ] Unit: `validate()`, export `compile()` redaction.
- [ ] E2E (heavy, on-demand): 10-row fixture with key from env `E2E_AI_API_KEY` — skip if unset.

---

## Task 5: Node `ai.summarize`

### Implementation

- [ ] `src/nodes/ai-summarize.ts`
- [ ] Config: `scope: 'column' | 'dataset'`, `column?`, `maxTokens`, `output: 'dataframe' | 'panel'`.
- [ ] Dataset scope: sample up to N rows into prompt (truncate wide tables).
- [ ] Panel mode: store markdown in `runtime-store` side panel (no DataFrame change — identity `out = inp.copy()`).
- [ ] DataFrame mode: single-row result with `summary` column.

### Tests

- [ ] Unit: validate scope/column requirements.
- [ ] Unit: prompt construction does not exceed character budget.

---

## Task 6: Node `ai.anonymize`

### Implementation

- [ ] `src/nodes/ai-anonymize.ts`
- [ ] Config: `columns[]`, `method: 'mask' | 'hash' | 'llm_rewrite'`, `preserveFormat`.
- [ ] Default path: **mask** and **hash** without LLM (deterministic, worker-only).
- [ ] `llm_rewrite`: main-thread batch like classify; higher risk — extra confirm in inspector.
- [ ] Hash: salted hash with user-visible warning that salt is session-only (not reversible).

### Tests

- [ ] Unit: mask/hash compile and runtime without API.
- [ ] Unit: `llm_rewrite` requires key and flag.

---

## Task 7: Codegen & sharing compliance

### Implementation

- [ ] Export script: `# AI operations require your API key — not included below`.
- [ ] Per-node export snippets for AI types: prose + placeholder, not replayable prompts with PII.
- [ ] `serializeWorkflow`: strip any accidental `apiKey` fields from node config (defensive).

### Tests

- [ ] Unit: full pipeline serialize after AI node config edit — no secrets.

---

## Task 8: Privacy review gate

### Checklist (human, before enabling flag)

- [ ] About dialog: data sent to third-party provider when AI nodes run.
- [ ] Default row cap documented; user can lower cap.
- [ ] No telemetry of prompt content.
- [ ] Key storage option documented (session vs IndexedDB).
- [ ] GDPR-style note: user is responsible for provider choice and data processing agreement.

### DoD

- [ ] Feature flag off by default in production build until checklist signed.
- [ ] Flag on + valid key: classify 50 rows on demo data in manual QA.
- [ ] Flag off or no key: run blocked with clear validation error.
- [ ] `npm run lint && npm run typecheck && npm run test:unit && npm run build` pass.

---

## Verification

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run build
# Optional with E2E_AI_API_KEY set:
npm run test:e2e -- tests/e2e/ai-classify.spec.ts
```
