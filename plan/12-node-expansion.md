# Node Expansion Work Plan

Expand RefineIt from the current M4 v1 library (14 node types) to a grouped, searchable palette with ~50+ transformation primitives organized into collapsible categories.

**Related docs:** [03-domain-model.md](./03-domain-model.md) (node contract), [05-node-library.md](./05-node-library.md) (current v1 spec), [07-milestones.md](./07-milestones.md) (delivery order), [UX-guidelines.md](./UX-guidelines.md) (left toolbar layout).

**Current baseline (implemented):** `source.csv`, `source.json`, `filter`, `select`, `rename`, `derive`, `sort`, `groupby`, `join`, `concat`, `dropna`, `fillna`, `cast`, `output`.

---

## Goals

1. Replace the flat Source / Transform / Output palette with **12 collapsible groups** (sections a–l below).
2. Implement missing node types incrementally on a **clean local store** — no backward-compatible workflow migrations (see [Persistence & compatibility policy](#persistence--compatibility-policy)).
3. Preserve the existing node contract (`validate`, `compile`, `inspectorSchema`) — one file per node under `src/nodes/`.
4. Keep all Pandas execution in the Web Worker; previews capped at 100 rows on the main thread.

## Persistence & compatibility policy

RefineIt is pre-launch / fast-evolving. **Do not implement workflow migration chains** for node expansion (e.g. `output` → `output.csv`, bumped `schemaVersion`).

| Surface | On incompatible data | Implementation |
|---------|----------------------|----------------|
| **IndexedDB** (workflows, datasets, versions) | Block load; show blocking dialog explaining the app was updated | Primary action: **Clear all local data** (`db.delete()` + reset Zustand stores); secondary: dismiss (stay on empty shell) |
| **Share URL / `.refineit.json` import** | Reject with explicit error (already: unknown node type, `schemaVersion` too high) | No auto-migration; user message: *"This workflow was created with an older version. Rebuild it in the current app or ask the author to re-export."* |
| **Version snapshots** (Dexie `versions` table) | Same as IndexedDB — cleared with **Clear all local data** | No per-snapshot migration |

**Still keep `schemaVersion` on workflow JSON** — used for **reject-forward** checks (`schemaVersion > CURRENT` → error), not for incremental upgrades.

**Remove / stop extending:** `src/data/migrations/*` migration chain for node-type changes. Existing stub can remain unused or be deleted when implementing the clear-data dialog.

**UX (post-M4 Phase 0):**

- [ ] `IncompatibleDataDialog` on app boot when Dexie open fails **or** `validateAllStoredWorkflows()` finds any incompatible record.
- [ ] `validateAllStoredWorkflows()` in `src/data/workflow-repo.ts`: load **every** workflow from IndexedDB; fail if `schemaVersion < WORKFLOW_SCHEMA_VERSION`, unknown node `type`, or Dexie schema mismatch — **not** only the active workflow.
- [ ] `clearAllLocalData()` in `src/data/db.ts`: delete DB, re-init, reset `workflow-store` + `runtime-store`, toast confirmation.
- [ ] Settings or About: manual **Clear all local data** (same path as incompatible flow).
- [ ] Unit test: IndexedDB with two workflows — one valid, one with unknown node type → dialog; clear → empty app.

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
- [ ] Add optional `hiddenInPalette?: boolean` — register node for execution/codegen but omit from palette (e.g. `select` drop mode vs dedicated `drop` node).
- [ ] Register `paletteGroup` on all 14 existing nodes (map to appropriate groups).
- [ ] Export `getNodesByPaletteGroup(): Record<PaletteGroup, NodeDefinition[]>` from `src/nodes/registry.ts`.
- [ ] Unit test: every registered node has a valid `paletteGroup`; no duplicate `type` IDs.

### 0.2 Collapsible palette UI

- [ ] Refactor `src/canvas/NodePalette.tsx` to render **collapsible sections** (shadcn `Collapsible` or equivalent).
- [ ] Section header: group label + node count badge; chevron toggle; default **all groups expanded** in v1 (session-based “expand used groups” is optional polish).
- [ ] Show **all 12 groups** even when count is 0 (empty groups collapsed by default, or shown as “0” with no nodes — pick one and document in UX-guidelines).
- [ ] Persist collapse state in `ui-store` (keyed by `paletteGroup`) so reload restores user preference.
- [ ] Add **search/filter** input above groups: filters nodes by label and `type` ID across all groups; hide empty groups when filtering.
- [ ] Preserve drag-and-drop and click-to-add behavior; source nodes still trigger file import.
- [ ] Keyboard: section headers focusable; Enter/Space toggles collapse.
- [ ] RTL-safe layout; match UX spacing from [UX-guidelines.md](./UX-guidelines.md) left toolbar spec.
- [ ] Update `tests/e2e/helpers.ts` if palette selectors change (aria-labels must remain stable).

### 0.3 Documentation & types

- [ ] Bump `NodeType` union in `src/lib/types.ts` as new types land (per phase).
- [ ] Update [03-domain-model.md](./03-domain-model.md) `NodeType` list when Phase 1 completes.
- [ ] Implement [Persistence & compatibility policy](#persistence--compatibility-policy) (`IncompatibleDataDialog` + `clearAllLocalData`) before splitting `output` in Phase 1.

**DoD:** Palette shows 12 collapsible groups; existing 14 nodes appear under correct groups; search works; incompatible local data surfaces clear-data dialog; all unit/E2E palette tests pass.

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
| `quality` | Data Quality | Validation, outliers, duplicate detection |
| `window` | Window Operations | Analytic/window functions |
| `ai` | Enrich | Labeling, summaries, PII handling (local worker + optional LLM) |
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

- [ ] **Decision (confirmed):** split monolithic `output` → `output.csv`, `output.json`, `output.parquet` for clearer I/O palette entries and simpler inspectors.
- [ ] Remove `output` from registry after split; bump `WORKFLOW_SCHEMA_VERSION` and treat saved workflows containing `output` as **incompatible** (clear-data dialog — no migration).
- [ ] Write CSV: `inp.to_csv(...)` + browser download (existing behavior).
- [ ] Write JSON: `inp.to_json(orient=...)` + download.
- [ ] Write Parquet: `inp.to_parquet(...)` → bytes in worker → transfer buffer to main thread for download (only export path may transfer full bytes; document size warning >50 MB).
- [ ] Register all three under `paletteGroup: 'io'`.

**DoD:** User can ingest and export CSV, JSON, and Parquet in a pipeline (parquet only if pyarrow gate passes).

**Parquet spike (before full Phase 1):**

- [ ] Lazy-load `pyarrow` in worker; record **added download size** after lazy load.
- [ ] **Hard cap: ≥10 MB added** → defer `source.parquet` and `output.parquet`; ship CSV/JSON I/O only. Document measured size in plan/09-risks if rejected.

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

**Schema propagation:** row count changes only; column list and dtypes unchanged — unit test `validate()` with upstream schemas.

**DoD:** Row group complete; each node has unit tests; combine in heavy E2E: CSV → Filter → Sample → Limit → Write CSV.

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

**Schema propagation:** document added/removed/renamed columns and dtypes for each op; unit tests per node.

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

Profiling stays on **node selection** (M3 profile panel) — **no `profile` palette node**.

| Node | Type ID | Scope |
|------|---------|-------|
| Validate | `validate` | row-level rules: email, range, type, not-null, regex |
| Detect Outliers | `outliers` | IQR, z-score |
| Find Duplicates | `find.duplicates` | flag or extract duplicate rows |

### Tasks

#### Validate (`validate`)

- [ ] Config: `rules: { column, check, args }[]` — checks: `email`, `range`, `dtype`, `not_null`, `regex`, `unique`.
- [ ] `compile`: add boolean `_valid` column or filter invalid (`mode: 'flag' | 'filter' | 'fail'`).
- [ ] Fail mode: raise with row count summary (worker try/except → structured error).
- [ ] Schema propagation: flag mode adds `_valid` bool column; filter mode may drop columns only indirectly.

#### Detect Outliers (`outliers`)

- [ ] Config: `columns: string[]`, `method: 'iqr' | 'zscore'`, `threshold`, `action: 'flag' | 'remove' | 'winsorize'`.
- [ ] `compile`: vectorized bounds; no sklearn required for IQR/zscore.
- [ ] Schema propagation: flag mode adds outlier column(s); remove mode reduces rows only.

#### Find Duplicates (`find.duplicates`)

- [ ] Config: `subset`, `keep: 'first' | 'last' | false`, `output: 'duplicates_only' | 'flag_column'`.
- [ ] Related to `dedup` but **diagnostic** — keep both.
- [ ] Schema propagation: flag mode adds duplicate indicator column.

**DoD:** Validation node rejects bad emails in fixture CSV; heavy E2E `quality.spec.ts` covers validate + outliers.

---

## Phase 10 — Window Operations (`window`)

Split into **three nodes** (clearer inspectors than one mega-node).

| Node | Type ID | Scope |
|------|---------|-------|
| Rolling / Expanding | `window.rolling` | rolling/expanding mean, sum, min, max, count |
| Rank / Row Number | `window.rank` | rank, dense rank, row number within partitions |
| Lag / Lead | `window.shift` | shift, lag, lead with partition + order |

### Tasks

#### Rolling / Expanding (`window.rolling`)

- [ ] Config: `mode: 'rolling' | 'expanding'`, `column`, `window`, `agg: mean|sum|min|max|count`, `groupBy?: string[]`.
- [ ] `compile`: `groupby(...).transform(...)` or `.rolling(...).agg(...)`.
- [ ] Validate: window size ≥ 1; partition columns exist.
- [ ] Schema propagation: adds numeric aggregate column(s) with documented names.

#### Rank / Row Number (`window.rank`)

- [ ] Config: `mode: 'rank' | 'row_number'`, `method?`, `ascending`, `partitionBy?: string[]`, `orderBy?: string[]`.
- [ ] `compile`: `.rank(...)`, `.cumcount()` (+1 for 1-based row numbers).
- [ ] Schema propagation: adds int rank/row_number column(s).

#### Lag / Lead (`window.shift`)

- [ ] Config: `column`, `periods` (negative = lag, positive = lead), `partitionBy?: string[]`, `orderBy?: string[]`.
- [ ] `compile`: `groupby(...)[column].shift(periods)`.
- [ ] Schema propagation: adds shifted column or overwrites with documented naming.

**DoD:** Running total and moving average on demo sales data; rank within group tested; heavy E2E `window.spec.ts`.

---

## Phase 11 — Enrich (`ai`)

| Node | Type ID | Local methods (worker) | LLM methods (Track B) |
|------|---------|------------------------|------------------------|
| Classify | `ai.classify` | rules, cut, supervised†, cluster† | prompt + labels / `auto` |
| Summarize | `ai.summarize` | stats (dataset or column) | narrative summary |
| Anonymize | `ai.anonymize` | mask, hash, regex | `llm_rewrite` |

† supervised/cluster require lazy `scikit-learn` (optional Task A4).

> **Constraint:** No RefineIt backend. **Track A** (local) runs entirely in the Pyodide worker — no API key, no feature flag. **Track B** (LLM) uses user API key + main-thread provider calls; feature-flagged until privacy review.

**Implementation tasks:** [`tasks/post-M4-ai-phase.md`](../tasks/post-M4-ai-phase.md) — Track A first (three nodes, local methods), then Track B (settings, AI client, worker injection, LLM methods, privacy gate).

**DoD:** Track A — mask/hash, stats summarize, rules classify on demo data; exportable Python. Track B — flag off by default; with key, LLM classify 50 rows in manual QA.

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

### Schema propagation (required per new node)

Downstream column pickers use `preview.columns` from executed upstream nodes (`getUpstreamSchemas` / `resolveUpstreamSchemasForValidation`). Every new node must document how output schema differs from input.

**Checklist (copy into each phase DoD):**

- [ ] **Runtime preview:** after execution, worker preview JSON reflects new/removed/renamed columns and dtypes.
- [ ] **Validate with schemas:** `validate(config, upstreamSchemas)` rejects references to columns not in upstream schemas (when schemas are available).
- [ ] **Static peek (sources):** source nodes continue CSV header peek where applicable.
- [ ] **Optional:** `inferOutputSchema(config, upstreamSchemas): ColumnSchema[]` on `NodeDefinition` for pre-run inspector hints (add to contract when first node needs it).
- [ ] **Unit test:** `validate()` with mock `upstreamSchemas` — valid config passes, bad column names fail.
- [ ] **Integration test:** small pipeline through node → preview columns match expectation (browser mode when Pyodide involved).

### Inspector & schema propagation

- [ ] Extend `ColumnSchema` dtype inference for new ops (datetime after parse, string after text ops).
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

### Local data lifecycle

- [ ] [Persistence & compatibility policy](#persistence--compatibility-policy) — no migration chain; clear-data dialog + manual clear in Settings/About.
- [ ] On `WORKFLOW_SCHEMA_VERSION` bump: document in changelog / About that old local saves and share links may require rebuild.

### Testing ([10-testing.md](./10-testing.md))

- [ ] Unit: every node `compile()` + `validate()` in `tests/unit/nodes/`.
- [ ] Browser integration: parquet load (if gate passed), window ops (Pyodide).
- [ ] **Heavy E2E (on-demand):** one happy path per post-M4 phase — **not** CI default; see [10-testing.md](./10-testing.md) § Heavy E2E suite.

### Pyodide packages (cumulative)

| Package | Phases |
|---------|--------|
| pandas, numpy | existing |
| pyarrow | 1 |
| sklearn (optional) | 4, 11 (classify supervised/cluster) |
| — | Phase 11 Track B (LLM) uses HTTP on main thread, not Pyodide |

---

## Suggested delivery order

Align with post-M4 work; do not block M5–M8 on later phases.

```
Phase 0   Palette groups              (post-M4 / M9 UX)
Phase 0b  Readable export codegen     (M7 polish — can ship early)
Phase 1   I/O + parquet               (post-M4)
Phase 2   Row ops                     (post-M4)
Phase 3   Column ops                  (post-M4)
Phase 4   Missing / impute            (post-M4)
Phase 5   Aggregations                (post-M4)
Phase 6   Combine / merge update      (post-M4)
Phase 7   Text                        (post-M4 / M9)
Phase 8   Date/time                   (post-M4 / M9)
Phase 9   Data quality                (post-M4 / M9)
Phase 10  Window (split nodes)        (post-M4 / M9)
Phase 11  Enrich (local + optional LLM)  (post-M9 — [tasks/post-M4-ai-phase.md](../tasks/post-M4-ai-phase.md); Track B feature-flagged)
Phase 12  Custom Python               (post-M9, gated)
```

Phases 1–6 complete the "visual ETL" story. Phases 7–10 deepen analytics. Phases 11–12 are optional power features with explicit security and privacy gates.

---

## Open decisions

| # | Question | Status / recommendation |
|---|----------|-------------------------|
| 1 | Split `output` into three type IDs? | **Confirmed** — split; no migration (incompatible → clear local data) |
| 2 | `drop` vs `select` drop mode | Keep both; hide `select` drop mode via `hiddenInPalette` on registry |
| 3 | sklearn for impute | Start pandas-only; add sklearn only if median/mode grouped impute insufficient |
| 4 | AI provider | User-selectable OpenAI-compatible endpoint; no default cloud |
| 5 | Merge vs Join | Join = relational; `merge.update` = upsert/update (separate type IDs) |
| 6 | Export comment Node ID | **Confirmed** — 1-based topo step; omit raw canvas UUID from export by default |
| 7 | User title in var name | Prefer title slug when set; fall back to type default slug |
| 8 | pyarrow bundle gate | **Confirmed** — hard cap **≥10 MB** lazy-load added size → defer parquet nodes |
| 9 | Empty palette groups | **Confirmed** — show all 12; empty groups visible with 0 count (collapsed default) |
| 10 | Workflow migrations | **Confirmed** — none; scan all IndexedDB workflows; reject + clear local data / reject share import |
| 11 | `split.column` vs `str.split` | Phase 3 = column reshape (`split.column`); Phase 7 = text ops (`str.split` with explode); distinct labels |
| 12 | Profile palette node | **Confirmed dropped** — profiling on node selection only (M3) |
| 13 | Window nodes | **Confirmed split** — `window.rolling`, `window.rank`, `window.shift` |
| 14 | E2E in CI | **Confirmed** — heavy E2E on-demand only; CI runs unit + build |

### Resolved node inventory (target **40** types)

| Group | Planned types | Notes |
|-------|---------------|-------|
| `io` | 6 | 2 sources + 3 writes + parquet read (if gate passes) |
| `row` | 5 | filter, sample, sort, dedup, limit |
| `column` | 8 | includes split.column, merge.columns |
| `missing` | 3 | fillna, dropna, impute |
| `aggregate` | 3 | groupby, pivot, melt |
| `combine` | 3 | join, concat, merge.update |
| `text` | 3 | str.transform, str.extract, str.split |
| `datetime` | 2 | dt.extract, dt.calc |
| `quality` | 3 | validate, outliers, find.duplicates (no profile node) |
| `window` | 3 | window.rolling, window.rank, window.shift |
| `ai` | 3 | local methods ship first; LLM methods feature-flagged |
| `python` | 1 | feature-flagged |
| **Total** | **40** | 14 implemented + 26 new (−1 `output`, +3 write splits, +1 parquet read, −1 profile, +2 window split) |

---

## Success metrics

- All 12 palette groups render (including empty groups) with collapse state + search.
- Exported Python uses semantic variable names (`json_data_1`, `joined_2`) and sequential `# Node ID:` comments — no `node_<uuid>` in download/export views.
- **40** registered node types when phases 1–12 complete (phases 11–12 behind feature flags).
- `npm run lint && npm run typecheck && npm run test:unit && npm run build` pass in CI.
- Heavy E2E suite documented and runnable on-demand (`npm run test:e2e`).
- No full DataFrame transfers to main thread except explicit export download path.
- Boot scans **all** IndexedDB workflows; incompatible data shows explicit error — never silent node drops or partial loads.
- **Clear all local data** restores a working empty app without manual DevTools steps.
- Share links may break after schema bumps — explicit reject message, no migration.
