# Post-M4: Enrich Phase (Phase 11)

**Goal:** Three palette nodes — Classify, Summarize, Anonymize — with **local worker execution by default** and optional **LLM methods** (no RefineIt backend, user-provided API keys, feature-flagged until privacy review).

**Prerequisites:** M9 complete; [`plan/12-node-expansion.md`](../plan/12-node-expansion.md) Phase 0 (palette groups) recommended.

**Parent plan:** [12-node-expansion.md](../plan/12-node-expansion.md) § Phase 11.

**Palette group:** `ai` — Classify, Summarize, Anonymize (UI label may read **Enrich**; group id stays `ai` for schema stability).

---

## Two tracks

| Track | Methods | Execution | API key | Feature flag | Ship order |
|-------|---------|-----------|---------|--------------|------------|
| **A — Local** | mask, hash, regex, rules, stats, cut, supervised, cluster | Worker only (`compile()` + Pyodide) | None | Not required | **First** |
| **B — LLM** | `llm`, `llm_rewrite`, labels `'auto'`, narrative summarize | Main thread → column injection | User-supplied | `VITE_ENABLE_AI_NODES` (default off) | After A + privacy sign-off |

**Rule:** Track B infrastructure (Tasks B1–B3) is **only** required for LLM methods. Track A nodes run with the same execution path as filter/groupby — no hybrid injection, no row cap unless chosen for perf.

**Overlap with other phases:** email/regex validation → Phase 9 `validate`; column profiling → M3 profile panel; pattern extract → Phase 7 `text.extract`. Do not duplicate those under `ai.*` unless the UX is explicitly PII- or labeling-focused.

---

## Shared constraints

- No RefineIt server, proxy, or default cloud endpoint.
- All Pandas/sklearn execution stays in the **Web Worker** (Track A and worker-side steps of Track B).
- API keys **never** in workflow JSON, share URLs, or codegen export.
- Local methods produce **replayable** export snippets (real Python, not placeholders).

### LLM-only constraints (Track B)

- User selects provider URL (OpenAI-compatible) or local WebLLM; user supplies API key.
- Offline / no key: LLM methods fail `validate()` with clear inspector messaging; local methods on the same node still run.
- Default LLM execution cap: first **100 rows** per run (configurable upper bound in settings).
- LLM calls on **main thread** (keys stay out of worker logs); pass column results to worker as ephemeral injection for that run only.

---

# Track A — Local (worker-only)

Ship without AI settings, client module, or privacy gate. Optional lazy `scikit-learn` (pulls scipy) — same lazy-load pattern as Phase 4 impute; document size tradeoff in [09-risks-and-mitigations.md](../plan/09-risks-and-mitigations.md).

## Task A1: Node `ai.anonymize` (local methods)

### Implementation

- [ ] `src/nodes/ai-anonymize.ts` — `paletteGroup: 'ai'`, category `transform`.
- [ ] Config: `columns[]`, `method: 'mask' | 'hash' | 'regex' | 'llm_rewrite'`, `preserveFormat?`, `pattern?` (for regex).
- [ ] **mask:** replace with fixed char (e.g. `*`), optional preserve length.
- [ ] **hash:** salted SHA-256 prefix; salt in `sessionStorage` only — inspector warning (not reversible, salt lost on tab close).
- [ ] **regex:** preset patterns (email, phone US, SSN, credit card) or custom regex; replace matches with `[REDACTED]` or mask char.
- [ ] `compile()`: vectorized pandas/str ops or helper in `helpers.py`; fully exportable.
- [ ] `llm_rewrite`: config allowed but `validate()` fails until Track B — show disabled reason in inspector.
- [ ] Schema propagation: same columns, string dtype preserved.

### Tests

- [ ] Unit: `validate()`, `compile()` for mask/hash/regex.
- [ ] Integration (browser): mask email column on fixture → preview redacted.

---

## Task A2: Node `ai.summarize` (stats method)

### Implementation

- [ ] `src/nodes/ai-summarize.ts` — `paletteGroup: 'ai'`, category `transform`.
- [ ] Config: `method: 'stats' | 'llm'`, `scope: 'column' | 'dataset'`, `column?`, `output: 'dataframe' | 'panel'`.
- [ ] **stats + dataset scope:** row/col counts, null %, `describe()` for numerics, `nunique()` top-k for categoricals — build markdown or structured dict in worker.
- [ ] **stats + column scope (text):** length stats, null count, top terms (split + `value_counts`, cap k).
- [ ] **Panel mode:** write markdown to `runtime-store` side panel; `out = inp.copy()` (identity transform).
- [ ] **DataFrame mode:** single-row result with `summary` column (string).
- [ ] `llm` method: `validate()` fails until Track B.
- [ ] `compile()`: stats path emits pandas code; exportable.

### Tests

- [ ] Unit: validate scope/column requirements; stats prompt/markdown length bounded.
- [ ] Unit: `compile()` for stats dataset + column scope.

---

## Task A3: Node `ai.classify` (rules + binning)

### Implementation

- [ ] `src/nodes/ai-classify.ts` — `paletteGroup: 'ai'`, category `transform`.
- [ ] Config: `method: 'rules' | 'cut' | 'supervised' | 'cluster' | 'llm'`, `column`, `outputColumn?` (default `{column}_class`).
- [ ] **rules:** `rules: { match: 'contains' | 'regex', pattern, label }[]`, first match wins; default label optional.
- [ ] **cut:** `bins: number[] | 'quantile' | 'equal'`, `labels?` — `pd.cut` / `pd.qcut` on numeric column.
- [ ] `supervised`, `cluster`, `llm`: config UI stubbed; `validate()` fails with “requires sklearn” / “requires LLM” until A4 / B4.
- [ ] `compile()`: rules/cut fully exportable.
- [ ] Schema propagation: adds string (or categorical) output column.

### Tests

- [ ] Unit: `validate()`, `compile()` for rules and cut.
- [ ] Unit: rule order and default label behavior.

---

## Task A4: sklearn classify (optional, still no keys)

### Implementation

- [ ] Lazy-load `scikit-learn` in worker on first use (`loadPackage(['scikit-learn'])`); progress toast.
- [ ] **supervised:** `labelColumn` (train labels), `featureColumns?` (default: text `column` only); `TfidfVectorizer` + `MultinomialNB` or `LogisticRegression`; fit on sample (`maxTrainRows`, default 5000), predict all rows.
- [ ] **cluster:** numeric `columns[]`, `nClusters`, optional `StandardScaler`; `KMeans` → `{column}_cluster` int column.
- [ ] Row-limit warning when fit sample < full frame.
- [ ] `compile()`: export training snippet with sample comment; document sklearn dependency.

### Tests

- [ ] Unit: `compile()` structure for supervised/cluster.
- [ ] Integration (browser): 20-row labeled fixture → predict column matches held-out sanity check.

---

## Track A — Definition of Done

- [ ] All three nodes registered; **local methods** visible in palette without feature flag or API key.
- [ ] Anonymize mask/hash on demo data; stats summarize in panel mode; rules classify on text fixture — manual QA.
- [ ] Export script for Track A pipelines is runnable Python (no API placeholders).
- [ ] LLM methods on same nodes show disabled validation message, not silent failure.
- [ ] `npm run lint && npm run typecheck && npm run test:unit && npm run build` pass.

---

# Track B — LLM (optional, feature-flagged)

Implement **after** Track A DoD. Applies only when node `method` is `llm`, `llm_rewrite`, or classify `labels: 'auto'`.

## Task B1: Feature flag & settings surface

### Implementation

- [ ] `VITE_ENABLE_AI_NODES` or runtime flag in `ui-store` (default `false` until privacy sign-off).
- [ ] When disabled: LLM methods fail `validate()`; local methods unaffected; palette nodes remain visible.
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
- [ ] Unit: flag off → LLM method `validate()` fails; rules/stats/mask still pass.

---

## Task B2: AI client module (main thread)

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

## Task B3: Worker boundary for LLM results

### Implementation

- [ ] **Do not** call LLM from worker.
- [ ] Main thread: run AI batch → build column values array (length = processed rows).
- [ ] Worker RPC: `injectColumn(nodeId, columnName, values[])` or pass via existing execution path as ephemeral config for that run only.
- [ ] Worker: assign column on `node_<id>` DataFrame copy; never store API key in worker global scope.
- [ ] LLM node `compile()` (export mode): comment that classification/summary ran via API; no key in script — document hybrid execution model in `04-execution-engine.md`.

### Files

| Action | Path |
|--------|------|
| Extend | `src/engine/kernel-client.ts` |
| Extend | `src/worker/kernel.ts` |
| Extend | `src/engine/pipeline.ts` |

### Tests

- [ ] Integration (browser): mock AI client → inject column → preview shows new column.

---

## Task B4: LLM methods on existing nodes

### `ai.classify` — method `llm`

- [ ] Config: `labels: string[] | 'auto'`, `promptTemplate?`, `maxRows` (default 100).
- [ ] `validate`: API key present when flag on; labels non-empty if not auto.
- [ ] Runtime: main-thread classify → inject output column.
- [ ] Inspector: labels list, template textarea, row limit (shown only when method = llm).

### `ai.summarize` — method `llm`

- [ ] Config: `maxTokens`, existing scope/output fields.
- [ ] Dataset scope: sample up to N rows into prompt (truncate wide tables).
- [ ] Unit: prompt construction does not exceed character budget.

### `ai.anonymize` — method `llm_rewrite`

- [ ] Main-thread batch like classify; extra confirm in inspector (higher exfiltration risk).

### Tests

- [ ] Unit: LLM `validate()` requires key + flag.
- [ ] E2E (heavy, on-demand): 10-row classify with `E2E_AI_API_KEY` — skip if unset.

---

## Task B5: Codegen & sharing compliance (LLM paths only)

### Implementation

- [ ] Export script header when workflow contains LLM methods: `# LLM steps require your API key — not included below`.
- [ ] Per-node LLM export snippets: prose + placeholder, not replayable prompts with PII.
- [ ] `serializeWorkflow`: strip any accidental `apiKey` fields from node config (defensive).

### Tests

- [ ] Unit: full pipeline serialize after LLM config edit — no secrets.

---

## Task B6: Privacy review gate

### Checklist (human, before enabling flag)

- [ ] About dialog: data sent to third-party provider when LLM methods run.
- [ ] Default row cap documented; user can lower cap.
- [ ] No telemetry of prompt content.
- [ ] Key storage option documented (session vs IndexedDB).
- [ ] GDPR-style note: user is responsible for provider choice and data processing agreement.

---

## Track B — Definition of Done

- [ ] Feature flag off by default in production until checklist signed.
- [ ] Flag on + valid key: LLM classify 50 rows on demo data in manual QA.
- [ ] Flag off or no key: LLM methods blocked with clear validation error; Track A methods still run.
- [ ] `npm run lint && npm run typecheck && npm run test:unit && npm run build` pass.

---

## Verification

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run build
# Track B only — optional with E2E_AI_API_KEY set:
npm run test:e2e -- tests/e2e/ai-classify-llm.spec.ts
```

## Delivery order (summary)

1. **Track A:** A1 anonymize (mask/hash/regex) → A2 summarize (stats) → A3 classify (rules/cut) → A4 sklearn (optional).
2. **Track B:** B1 settings → B2 client → B3 injection → B4 LLM methods → B5 codegen → B6 privacy gate.
