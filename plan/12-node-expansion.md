# Node Expansion Work Plan

Expand RefineIt from the current M4 v1 library (14 node types) to a grouped, searchable palette with ~50+ transformation primitives organized into collapsible categories.

**Related docs:** [03-domain-model.md](./03-domain-model.md) (node contract), [05-node-library.md](./05-node-library.md) (current v1 spec), [07-milestones.md](./07-milestones.md) (delivery order), [UX-guidelines.md](./UX-guidelines.md) (left toolbar layout).

**Current baseline (implemented):** `source.csv`, `source.json`, `filter`, `select`, `rename`, `derive`, `sort`, `groupby`, `join`, `concat`, `dropna`, `fillna`, `cast`, `output`.

---

## Goals

1. Replace the flat Source / Transform / Output palette with **12 collapsible groups** (sections a–l below).
2. Implement missing node types incrementally without breaking shared workflows (`schemaVersion` migrations as needed).
3. Preserve the existing node contract (`validate`, `compile`, `inspectorSchema`) — one file per node under `src/nodes/`.
4. Keep all Pandas execution in the Web Worker; previews capped at 100 rows on the main thread.

## Non-goals (this plan)

- Excel import (`openpyxl`) — remains deferred per [AGENTS.md](../AGENTS.md).
- dbt/SQL export.
- Arrow IPC chunking for >100 MB datasets.
- Any backend or cloud execution layer (except optional **client-side** calls for AI nodes — see group k).

---

## Phase 0 — Palette grouping infrastructure

**Goal:** Collapsible groups in the left toolbar before adding new node types.

### 0.1 Extend node contract

- [ ] Add `paletteGroup: PaletteGroup` to `NodeDefinition` in `src/nodes/types.ts`.
- [ ] Define `PaletteGroup` union matching sections a–l (see group table below).
- [ ] Keep `category: 'source' | 'transform' | 'output'` for execution semantics (topo sort, source import flow); `paletteGroup` is **UI-only**.
- [ ] Add `paletteOrder?: number` for stable sort within a group.
- [ ] Register `paletteGroup` on all 14 existing nodes (map to appropriate groups).
- [ ] Export `getNodesByPaletteGroup(): Record<PaletteGroup, NodeDefinition[]>` from `src/nodes/registry.ts`.
- [ ] Unit test: every registered node has a valid `paletteGroup`; no duplicate `type` IDs.

### 0.2 Collapsible palette UI

- [ ] Refactor `src/canvas/NodePalette.tsx` to render **collapsible sections** (shadcn `Collapsible` or equivalent).
- [ ] Section header: group label + node count badge; chevron toggle; default **expanded** for groups that contain nodes the user has used in the current session (optional polish — can default all expanded in v1).
- [ ] Persist collapse state in `ui-store` (keyed by `paletteGroup`) so reload restores user preference.
- [ ] Add **search/filter** input above groups: filters nodes by label and `type` ID across all groups; hide empty groups when filtering.
- [ ] Preserve drag-and-drop and click-to-add behavior; source nodes still trigger file import.
- [ ] Keyboard: section headers focusable; Enter/Space toggles collapse.
- [ ] RTL-safe layout; match UX spacing from [UX-guidelines.md](./UX-guidelines.md) left toolbar spec.
- [ ] Update `tests/e2e/helpers.ts` if palette selectors change (aria-labels must remain stable).

### 0.3 Documentation & schema

- [ ] Bump `NodeType` union in `src/lib/types.ts` as new types land (per phase).
- [ ] Update [03-domain-model.md](./03-domain-model.md) `NodeType` list when Phase 1 completes.
- [ ] Add migration stub if renaming `output` → split write nodes (Phase 1 decision).

**DoD:** Palette shows 12 collapsible groups; existing 14 nodes appear under correct groups; search works; all unit/E2E palette tests pass.

---

## Phase 0b — Readable export codegen

**Goal:** Exported Python scripts and Jupyter notebooks use **human-readable variable names** and **sequential step numbers** in comments — without changing internal canvas/worker identifiers.

### Problem (current behavior)

Export uses the canvas UUID for every reference (`node_47cee19e`, `node_03c01c8e`, …). Comments expose the same opaque ID. The result is hard to read, diff, or hand-edit outside RefineIt.

```python
# JSON Source
# Node ID: 47cee19e
# Type: source.json
# Source file: No file — adjust the file path below as needed
node_47cee19e = pd.read_json("", orient="records")

# Join
# Node ID: 03c01c8e
# Type: join
node_03c01c8e = node_ced6482b.merge(node_17ccdb7e, left_on="country", right_on="country", how="inner", suffixes=["_sales","_cust"])
```

### Target behavior

Topo-ordered **1-based step numbers** in comments; **semantic variable slugs** derived from node type (and optional user title). Cross-references use the same readable names.

```python
# CSV Source
# Node ID: 1
# Type: source.csv
# Source file: sales.csv — adjust the file path below as needed
csv_data_1 = pd.read_csv("sales.csv")

# JSON Source
# Node ID: 2
# Type: source.json
# Source file: customers.json — adjust the file path below as needed
json_data_2 = pd.read_json("customers.json", orient="records")

# Join
# Node ID: 3
# Type: join
joined_3 = csv_data_1.merge(json_data_2, left_on="country", right_on="country", how="inner", suffixes=["_sales","_cust"])
```

> **Scope boundary:** Canvas node IDs (`WorkflowNode.id`) remain UUIDs for graph stability, IndexedDB keys, and worker namespace (`node_<uuid>` at execution time). Readable naming applies **only** when `CompileContext.mode === 'export'` (script download, full-pipeline code view, per-node export snippet, notebook cells).

### 0b.1 Export variable naming module

- [ ] Add `src/engine/export-names.ts` with:
  - [ ] `buildExportNameMap(workflow): Map<nodeId, ExportVarInfo>` where `ExportVarInfo = { step: number; varName: string; commentId: string }`.
  - [ ] Assign `step` = 1-based index in topo sort (matches `# Node ID: N` in comments).
  - [ ] Assign `varName` = `{slug}_{step}` (e.g. `json_data_1`, `joined_2`).
  - [ ] `commentId` = stringified step (same as `step` for v1; reserve for future branch labels).
- [ ] Slug resolution order:
  1. `NodeDefinition.exportVarSlug` if registered (see 0b.2).
  2. Else sanitized `node.title` when user set a custom title (snake_case, max 32 chars).
  3. Else default slug from node `type` (table below).
- [ ] Sanitize to valid Python identifiers: `[a-zA-Z_][a-zA-Z0-9_]*`, lowercase, collapse `_`, reject Python keywords (append `_df` if collision).
- [ ] Unit tests: slug sanitization, keyword escape, duplicate titles, multi-input join/concat input resolution.

**Default export slugs (v1 node types)**

| Type ID | Default slug | Example |
|---------|--------------|---------|
| `source.csv` | `csv_data` | `csv_data_1` |
| `source.json` | `json_data` | `json_data_2` |
| `filter` | `filtered` | `filtered_3` |
| `select` | `selected` | `selected_4` |
| `rename` | `renamed` | `renamed_5` |
| `derive` | `derived` | `derived_6` |
| `sort` | `sorted` | `sorted_7` |
| `groupby` | `grouped` | `grouped_8` |
| `join` | `joined` | `joined_9` |
| `concat` | `concatenated` | `concatenated_10` |
| `dropna` | `dropna` | `dropna_11` |
| `fillna` | `filled` | `filled_12` |
| `cast` | `casted` | `casted_13` |
| `output` | `output` | `output_14` |

- [ ] Extend table as new node types land (Phases 1–12); add test that every registered node has a slug (explicit or default).

### 0b.2 Node contract extension (optional slug)

- [ ] Add optional `exportVarSlug?: string` to `NodeDefinition` in `src/nodes/types.ts` for types where the default slug is ambiguous (e.g. future `output.csv` → `csv_output`).
- [ ] Do **not** add slug to workflow JSON — derived at export time only.

### 0b.3 Wire export names into codegen

- [ ] Extend `CompileContext` with `exportNames?: ExportNameMap` (or pass pre-resolved `inputVar` / `outputVar` strings).
- [ ] Update `compileNodeExportCode()` in `src/engine/codegen.ts`:
  - [ ] Build name map once per pipeline via `buildExportNameMap`.
  - [ ] Map upstream canvas IDs → readable `inputVars` before calling `def.compile(...)`.
  - [ ] Pass readable `outputVar` (e.g. `joined_2`) instead of `node_${node.id}`.
- [ ] Update `getNodeCommentLines()`: emit `# Node ID: ${step}` (sequential), keep `# Type: ${node.type}`; optionally add `# Canvas ID: ${node.id}` behind a debug flag or omit entirely for cleaner export.
- [ ] Update `getNodeMarkdown()` for notebooks: use step number in prose (`Step 2: Join`) instead of raw UUID.
- [ ] Update `src/export/notebook.ts` to use the same path (inherits from `compileNodeExportCode` + updated markdown).
- [ ] Per-node code panel: when showing export-oriented snippet, use readable names for the **full pipeline context** (not isolated `node_<id>` for upstream refs).
- [ ] **Do not change** execution path in `src/engine/pipeline.ts` — worker continues `node_<uuid>` namespace and `getInputVars` UUID-based vars for `mode: 'execution'`.

### 0b.4 Source nodes in export

- [ ] Readable export already uses placeholder paths for sources; ensure virtual path references in execution-only compile paths are not leaked into export mode (existing `CompileContext.mode` split in `source-csv.ts` / `source-json.ts`).
- [ ] Export filenames in comments remain human (`# Source file: sales.csv — adjust…`); variable name independent of filename.

### 0b.5 Testing & docs

- [ ] Unit tests in `tests/unit/engine/export-names.test.ts`:
  - [ ] Two-source + join pipeline produces `csv_data_1` / `json_data_2` / `joined_3` pattern.
  - [ ] Generated code is valid Python syntax (regex or parser smoke check).
  - [ ] Same pipeline exported twice → identical names (deterministic).
- [ ] Update `tests/unit/engine/codegen.test.ts` (or add) for end-to-end `generatePipelineCode` snapshot of comment + variable lines.
- [ ] Document export naming in [04-execution-engine.md](./04-execution-engine.md) § Code generation (execution vs export naming).
- [ ] M7 DoD note: notebook export inherits readable names automatically.

**DoD:** Downloaded `.py` and `.ipynb` for a multi-node workflow use `{slug}_{step}` variables and `# Node ID: 1..N` comments; running the app still executes with internal `node_<uuid>` vars; all tests pass.

---

## Palette groups (sections a–l)

| ID | Group label | Purpose |
|----|-------------|---------|
| `io` | Input / Output | Read and write datasets |
| `row` | Row Operations | Filter, sample, sort rows |
| `column` | Column Operations | Select, rename, reshape columns |
| `missing` | Missing Data | NA handling and imputation |
| `aggregate` | Aggregations | Group, pivot, melt |
| `combine` | Combine Operations | Join, union, merge |
| `text` | Text Transformations | String ops and pattern extraction |
| `datetime` | Date / Time | Part extraction and date arithmetic |
| `quality` | Data Quality | Validation, profiling, outliers |
| `window` | Window Operations | Analytic/window functions |
| `ai` | AI | LLM-assisted transforms (client API) |
| `python` | Python Code | User-controlled code escape hatch |

---

## Phase 1 — Input / Output (`io`)

| Node | Type ID | Status | Pyodide dep |
|------|---------|--------|-------------|
| Read CSV | `source.csv` | **Done** | pandas |
| Read JSON | `source.json` | **Done** | pandas |
| Read Parquet | `source.parquet` | New | `pyarrow` |
| Write CSV | `output.csv` | Partial (`output` supports CSV) | pandas |
| Write JSON | `output.json` | Partial (`output` supports JSON) | pandas |
| Write Parquet | `output.parquet` | New | `pyarrow` |

### Tasks

#### Read Parquet (`source.parquet`)

- [ ] Add Pyodide package load for `pyarrow` in worker init (lazy, on first parquet node).
- [ ] Worker RPC: `loadParquet(bytes, options) → preview` mirroring CSV path (virtual file in worker FS).
- [ ] `defaultConfig`: `filename`, optional `columns` (column pruning for large files).
- [ ] `compile`: `node_id = pd.read_parquet(VPATH, columns=...)` .
- [ ] File import: accept `.parquet` in dropzone and source-node flow.
- [ ] Inspector: filename display, column subset multi-picker from schema after load.
- [ ] Unit tests: `compile()`, `validate()`; integration test with small fixture in `tests/fixtures/`.

#### Split / expand output nodes

- [ ] **Decision:** migrate monolithic `output` → three types `output.csv`, `output.json`, `output.parquet` **or** keep `output` with format enum. Recommended: **split** for clearer palette entries and simpler inspectors.
- [ ] If split: write `schemaVersion` migration `output` → `output.csv` preserving config.
- [ ] Write CSV: `inp.to_csv(...)` + browser download (existing behavior).
- [ ] Write JSON: `inp.to_json(orient=...)` + download.
- [ ] Write Parquet: `inp.to_parquet(...)` → bytes in worker → transfer buffer to main thread for download (only export path may transfer full bytes; document size warning >50 MB).
- [ ] Register all three under `paletteGroup: 'io'`.

**DoD:** User can ingest and export CSV, JSON, and Parquet in a pipeline; parquet load adds ≤ acceptable bundle weight (measure in Phase 1 spike).

---

## Phase 2 — Row Operations (`row`)

| Node | Type ID | Status | Pandas API |
|------|---------|--------|------------|
| Filter | `filter` | **Done** | `df.query` / boolean indexing |
| Sample | `sample` | New | `df.sample` |
| Sort | `sort` | **Done** | `sort_values` |
| Deduplicate | `dedup` | New | `drop_duplicates` |
| Limit | `limit` | New | `head` / `tail` / `iloc` slice |

### Tasks

#### Sample (`sample`)

- [ ] Config: `mode: 'n' | 'frac'`, `n?: number`, `frac?: number`, `randomState?: number`, `replace: boolean`.
- [ ] Validate: exactly one of `n` or `frac`; bounds checks.
- [ ] `compile`: `out = inp.sample(n=..., frac=..., random_state=..., replace=...)`.
- [ ] Inspector: mode toggle, number inputs, optional seed.

#### Deduplicate (`dedup`)

- [ ] Config: `subset?: string[]`, `keep: 'first' | 'last' | false`.
- [ ] `compile`: `out = inp.drop_duplicates(subset=..., keep=...)`.
- [ ] Column multi-picker for subset.

#### Limit (`limit`)

- [ ] Config: `mode: 'head' | 'tail' | 'slice'`, `n: number`, optional `start`/`stop` for slice.
- [ ] `compile`: `head(n)`, `tail(n)`, or `iloc[start:stop]`.
- [ ] Validate: positive `n`; slice bounds sensible.

**DoD:** Row group complete; each node has unit tests; combine in E2E: CSV → Filter → Sample → Limit → Output.

---

## Phase 3 — Column Operations (`column`)

| Node | Type ID | Status | Notes |
|------|---------|--------|-------|
| Select | `select` | **Done** | keep/drop columns |
| Rename | `rename` | **Done** | column mapping |
| Reorder | `reorder` | New | explicit column order |
| Drop | `drop` | New | alias of select drop mode **or** separate node — prefer separate for palette clarity |
| Cast | `cast` | **Done** | dtype mapping |
| Derive | `derive` | **Done** | new column from expression |
| Split | `split.column` | New | `str.split` / `extract` → new columns |
| Merge columns | `merge.columns` | New | concatenate columns (e.g. first + last name) |

### Tasks

#### Reorder (`reorder`)

- [ ] Config: `columns: string[]` (full order; unlisted columns appended or dropped — document behavior: **append remainder** default).
- [ ] `compile`: `out = inp[columns + remaining]`.

#### Drop (`drop`)

- [ ] Config: `columns: string[]`.
- [ ] `compile`: `out = inp.drop(columns=..., errors='raise')`.
- [ ] Consider deduplicating with `select` drop mode in registry (hide one from palette if redundant).

#### Split column (`split.column`)

- [ ] Config: `column`, `delimiter` or `regex`, `into: string[]`, `expand: boolean`, `n: number`.
- [ ] `compile`: `inp[column].str.split(pat=..., expand=True)` + rename columns.
- [ ] Validate: target column is string-like.

#### Merge columns (`merge.columns`)

- [ ] Config: `columns: string[]`, `separator: string`, `into: string`, `dropSource: boolean`.
- [ ] `compile`: `assign` + `str.cat` or `apply` with validated separator.

**DoD:** Column group nodes implemented; expression nodes still use AST whitelist from [01-architecture.md](./01-architecture.md).

---

## Phase 4 — Missing Data (`missing`)

| Node | Type ID | Status | Pandas API |
|------|---------|--------|------------|
| Fill NA | `fillna` | **Done** | `fillna` |
| Drop NA | `dropna` | **Done** | `dropna` |
| Impute | `impute` | New | mean/median/mode/constant/ffill/bfill |

### Tasks

#### Impute (`impute`)

- [ ] Config: `columns: string[]`, `strategy: 'mean' | 'median' | 'mode' | 'constant' | 'ffill' | 'bfill'`, `constantValue?`, `groupBy?: string[]` (optional grouped imputation).
- [ ] `compile`: generate strategy-specific code; for mode/mean/median use `SimpleImputer` from sklearn **only if** sklearn package size acceptable — otherwise pure pandas (`fillna(inp[col].mean())`, etc.).
- [ ] Validate: numeric strategies only on numeric columns; warn on datetime.
- [ ] Document sklearn lazy-load tradeoff in [09-risks-and-mitigations.md](./09-risks-and-mitigations.md) if added.

**DoD:** Three missing-data nodes in palette; impute covered by unit tests including grouped path.

---

## Phase 5 — Aggregations (`aggregate`)

| Node | Type ID | Status | Pandas API |
|------|---------|--------|------------|
| Group By | `groupby` | **Done** | `groupby().agg()` |
| Pivot | `pivot` | New | `pivot_table` |
| Melt | `melt` | New | `melt` |

### Tasks

#### Pivot (`pivot`)

- [ ] Config: `index: string[]`, `columns: string`, `values: string`, `aggfunc: string | string[]`, `fillValue?`.
- [ ] Inspector: reuse aggregations field pattern from groupby where possible.
- [ ] `compile`: `pd.pivot_table(...)`.
- [ ] Validate: columns exist; aggfunc allowed list.

#### Melt (`melt`)

- [ ] Config: `idVars: string[]`, `valueVars: string[]`, `varName`, `valueName`.
- [ ] `compile`: `inp.melt(id_vars=..., value_vars=..., var_name=..., value_name=...)`.

**DoD:** Pivot + melt work with profiled demo data; schema propagation updates column lists downstream.

---

## Phase 6 — Combine Operations (`combine`)

| Node | Type ID | Status | Notes |
|------|---------|--------|-------|
| Join | `join` | **Done** | 2 inputs, SQL-like joins |
| Concat (Union) | `concat` | **Done** | axis 0/1 |
| Merge | `merge.update` | New | **Update/upsert** semantics — not duplicate of join |

### Tasks

#### Clarify naming

- [ ] Palette label **Concat** as "Union (Concat)" to match user vocabulary; keep `concat` type ID.
- [ ] **Merge** in combine group = `merge.update`: combine two datasets where keys match, update left values from right (pandas `combine_first`, `update`, or `merge` + conditional overwrite). Document semantics in inspector help text.

#### Merge / Update (`merge.update`)

- [ ] Config: `leftOn`, `rightOn`, `how: 'left'`, `columnsToUpdate: string[] | 'all'`.
- [ ] Two input handles (reuse join port layout).
- [ ] `compile`: explicit merge + `update` pattern with CoW-friendly assignments.
- [ ] Validate: both inputs connected; key columns exist on both sides.

**DoD:** Join, Concat, and Merge/update documented and tested with two-branch pipeline.

---

## Phase 7 — Text Transformations (`text`)

| Node | Type ID | Scope |
|------|---------|-------|
| String Operations | `str.transform` | trim, lower, upper, title, replace, strip chars, pad |
| Extract Patterns | `str.extract` | email, phone, zip, domain, custom regex |
| Split Text | `str.split` | delimiter or regex split into rows or columns |

### Tasks

#### String Operations (`str.transform`)

- [ ] Config: `column`, `operations: { op, args }[]` — ops: `strip`, `lower`, `upper`, `title`, `replace` (old/new), `removeprefix`, `removesuffix`, `zfill`.
- [ ] `compile`: chain `.str.*` calls in one assign.
- [ ] Inspector: operation builder (add/remove steps).

#### Extract Patterns (`str.extract`)

- [ ] Config: `column`, `patterns: { name, regex, group? }[]` with presets dropdown (email, zip US, domain from URL, phone basic).
- [ ] Presets populate regex; user can edit.
- [ ] `compile`: `str.extract` / `str.extractall` with named groups.
- [ ] Validate: regex safety (length limit, no catastrophic backtracking patterns — basic lint).

#### Split Text (`str.split`)

- [ ] Distinct from `split.column` (Phase 3): focus on **text** group ops — explode rows vs expand columns.
- [ ] Config: `column`, `pat`, `expand: boolean`, `n`, `into[]`.
- [ ] `compile`: split + optional `explode`.

**DoD:** Text group covers README-style cleaning workflow (trim → lower → extract domain).

---

## Phase 8 — Date / Time Transformations (`datetime`)

| Node | Type ID | Scope |
|------|---------|-------|
| Extract Part | `dt.extract` | year, month, day, weekday, quarter, hour, weekofyear |
| Date Operations | `dt.calc` | add/subtract timedelta, diff, age from today |

### Tasks

#### Extract Part (`dt.extract`)

- [ ] Config: `column`, `parts: string[]` (year, month, day, dayofweek, quarter, is_weekend, etc.).
- [ ] Auto-parse: if column not datetime, optional `parse: boolean` with format string.
- [ ] `compile`: `assign` with `.dt.*` accessors; new column names `{col}_{part}`.

#### Date Operations (`dt.calc`)

- [ ] Config: `mode: 'add' | 'subtract' | 'diff' | 'age'`, `column(s)`, `amount`, `unit` (days/months — months via `pd.DateOffset`), `reference: 'now' | column`.
- [ ] `compile`: `+ Timedelta`, `dt.diff`, `(ref - col).dt.days / 365.25` for age.
- [ ] Validate: datetime columns; param refs for `{anchor_date}` when M5 params available.

**DoD:** Datetime nodes handle parsed and unparsed string dates; timezone documented as out-of-scope for v1 (naive datetimes only).

---

## Phase 9 — Data Quality (`quality`)

| Node | Type ID | Scope |
|------|---------|-------|
| Validate | `validate` | row-level rules: email, range, type, not-null, regex |
| Profile | `profile` | pass-through + attach profile metadata to runtime store |
| Detect Outliers | `outliers` | IQR, z-score, isolation optional |
| Find Duplicates | `find.duplicates` | flag or extract duplicate rows |

### Tasks

#### Validate (`validate`)

- [ ] Config: `rules: { column, check, args }[]` — checks: `email`, `range`, `dtype`, `not_null`, `regex`, `unique`.
- [ ] `compile`: add boolean `_valid` column or filter invalid (`mode: 'flag' | 'filter' | 'fail'`).
- [ ] Fail mode: raise with row count summary (worker try/except → structured error).

#### Profile (`profile`)

- [ ] Mostly **runtime**: reuse M3 `profile_df()` on pass-through; no transform or identity `out = inp.copy()`.
- [ ] Surface profile in side panel when this node selected (extend runtime-store).
- [ ] Optional: write profile JSON as second output in future — v1 single output only.

#### Detect Outliers (`outliers`)

- [ ] Config: `columns: string[]`, `method: 'iqr' | 'zscore'`, `threshold`, `action: 'flag' | 'remove' | 'winsorize'`.
- [ ] `compile`: vectorized bounds; no sklearn required for IQR/zscore.

#### Find Duplicates (`find.duplicates`)

- [ ] Config: `subset`, `keep: 'first' | 'last' | false`, `output: 'duplicates_only' | 'flag_column'`.
- [ ] Related to `dedup` but **diagnostic** — keep both.

**DoD:** Validation node rejects bad emails in fixture CSV; profile node drives existing profile panel.

---

## Phase 10 — Window Operations (`window`)

| Node | Type ID | Scope |
|------|---------|-------|
| Window | `window` | rolling/expanding + rank, row number, lag/lead |

### Tasks

#### Unified Window node (`window`)

- [ ] Config: `mode: 'rolling' | 'expanding' | 'rank' | 'row_number' | 'lag_lead'`.
- [ ] Rolling/expanding: `column`, `window`, `agg: mean|sum|min|max|count`, `groupBy?: string[]`.
- [ ] Rank: `method`, `ascending`, `partitionBy?: string[]`.
- [ ] Row number: `partitionBy`, `orderBy`.
- [ ] Lag/lead: `column`, `periods`, `partitionBy`, `orderBy`.
- [ ] `compile`: `groupby(...).transform(...)`, `.rank()`, `.cumcount()`, `.shift()`.
- [ ] Validate: partition/order columns exist; window size ≥ 1.

**DoD:** Running total and moving average E2E on demo sales data; rank within group tested.

---

## Phase 11 — AI (`ai`)

| Node | Type ID | Scope |
|------|---------|-------|
| Classify | `ai.classify` | Label rows/text via LLM |
| Summarize | `ai.summarize` | Aggregate text or dataset summary |
| Anonymize | `ai.anonymize` | PII redaction / pseudonymization |

> **Constraint:** RefineIt is client-side-first. AI nodes require an **explicit user-provided API key** and direct browser calls to a provider (OpenAI-compatible or local WebLLM). No RefineIt backend. Offline mode: nodes disabled with clear messaging.

### Tasks

#### Shared AI infrastructure

- [ ] Settings UI: API key storage (session or IndexedDB encrypted — document security tradeoff).
- [ ] Rate limiting and batch size caps (preview-only subsets by default, e.g. first 100 rows).
- [ ] Worker boundary: **option A** — LLM calls on main thread, pass results to worker as column data; **option B** — fetch in worker via `fetch` in Pyodide. Prefer **main thread** to keep keys out of worker logs.
- [ ] Redact API keys from codegen export and shared URLs.

#### Classify (`ai.classify`)

- [ ] Config: `column`, `labels: string[] | 'auto'`, `promptTemplate?`.
- [ ] Output: new column `{col}_class`.
- [ ] Batch prompt construction with row limit.

#### Summarize (`ai.summarize`)

- [ ] Config: `scope: 'column' | 'dataset'`, `column?`, `maxTokens`.
- [ ] Output: single-row summary DataFrame or side-panel markdown (configurable).

#### Anonymize (`ai.anonymize`)

- [ ] Config: `columns`, `method: 'mask' | 'hash' | 'llm_rewrite'`, `preserveFormat: boolean`.
- [ ] Prefer deterministic mask/hash without LLM by default; LLM rewrite optional.

**DoD:** With user API key, classify 50 rows on sample data; without key, validation error before run. Feature flagged until privacy review complete.

---

## Phase 12 — Python Code (`python`)

| Node | Type ID | Scope |
|------|---------|-------|
| Custom Python | `custom.python` | User-supplied Python snippet |

### Tasks

- [ ] Config: `code: string` — multiline editor (CodeMirror) in inspector.
- [ ] Inputs: single `input` handle; `inputVar` injected as `df` or `inp`.
- [ ] `compile`: wrap user code in guarded template:
  ```python
  # user code must assign to `out`
  out = inp.copy()
  # ... user snippet ...
  ```
- [ ] **Security:** AST parse whitelist (allow assignments, pandas ops; deny `import`, `exec`, `open`, dunder access). Run validation in worker pre-flight via `ast.parse` helper in `helpers.py`.
- [ ] Codegen export: include user code verbatim with warning comment.
- [ ] Mark as **advanced** in palette; confirm dialog on first use.
- [ ] Update [09-risks-and-mitigations.md](./09-risks-and-mitigations.md) R7 for custom python path.

**DoD:** Custom node can perform allowed transform; `import os` rejected at validate time; documented in About dialog as power-user feature.

---

## Cross-cutting tasks (all phases)

### Inspector & schema propagation

- [ ] Extend `ColumnSchema` dtype inference for new ops (datetime after parse, categorical after cut).
- [ ] New inspector field kinds as needed: `regex`, `rule-list`, `operation-list`, `code`.
- [ ] `configSummary()` one-liner for each new node for canvas card body.

### Execution engine

- [ ] Fingerprints include new config keys.
- [ ] Multi-input nodes: register input port IDs in `graph-validation.ts`.
- [ ] On node delete: continue `del namespace["node_<id>"]` + `gc.collect()`.

### Codegen & export

- [ ] **Readable export names** — see [Phase 0b](#phase-0b--readable-export-codegen) (semantic `{slug}_{step}` vars, sequential `# Node ID:` comments).
- [ ] Notebook + script export handles new types (M7).
- [ ] AI and custom python sections include compliance comments.

### Testing ([10-testing.md](./10-testing.md))

- [ ] Unit: every node `compile()` + `validate()` in `tests/unit/nodes/`.
- [ ] Browser integration: parquet load, window ops (Pyodide).
- [ ] E2E: one happy path per palette group (stretch goal in M9).

### Pyodide packages (cumulative)

| Package | Phases |
|---------|--------|
| pandas, numpy | existing |
| pyarrow | 1 |
| sklearn (optional) | 4 |
| — | AI uses HTTP, not Pyodide |

---

## Suggested delivery order

Align with post-M4 milestones; do not block M5–M8 on later phases.

```
Phase 0   Palette groups          (M4 polish / M9 UX)
Phase 0b  Readable export codegen   (M7 polish — can ship early)
Phase 1   I/O + parquet             (M4 extension)
Phase 2  Row ops                  (M4 extension)
Phase 3  Column ops               (M4 extension)
Phase 4  Missing / impute         (M4 extension)
Phase 5  Aggregations             (was "phase 2" in 05-node-library.md)
Phase 6  Combine / merge update   (M4 extension)
Phase 7  Text                       (M9)
Phase 8  Date/time                  (M9)
Phase 9  Data quality               (M9 + M3 profile reuse)
Phase 10 Window                     (M9)
Phase 11 AI                         (post-M9, feature-flagged)
Phase 12 Custom Python              (post-M9, gated)
```

Phases 1–6 complete the "visual ETL" story. Phases 7–10 deepen analytics. Phases 11–12 are optional power features with explicit security and privacy gates.

---

## Open decisions

| # | Question | Recommendation |
|---|----------|----------------|
| 1 | Split `output` into three type IDs? | Yes — clearer I/O group |
| 2 | `drop` vs `select` drop mode | Keep both; hide duplicate in palette via `hiddenInPalette` flag if needed |
| 3 | sklearn for impute | Start pandas-only; add sklearn only if median/mode grouped impute insufficient |
| 4 | AI provider | User-selectable OpenAI-compatible endpoint; no default cloud |
| 5 | Merge vs Join | Join = relational; Merge = upsert/update (separate type IDs) |
| 6 | Export comment Node ID | 1-based topo step (human-readable); omit raw canvas UUID from export by default |
| 7 | User title in var name | Prefer title slug when set; fall back to type default slug |

---

## Success metrics

- All palette groups render collapsed/expanded with search.
- Exported Python uses semantic variable names (`json_data_1`, `joined_2`) and sequential `# Node ID:` comments — no `node_<uuid>` in download/export views.
- ≥ 45 registered node types across groups a–j (k–l feature-flagged).
- `npm run lint && npm run typecheck && npm run test:unit && npm run build` pass.
- No full DataFrame transfers to main thread except explicit export download path.
- Shared workflows migrate forward without silent node drops.
