# Domain Model

## Core principle: workflow ≠ data

The **workflow** (nodes, edges, parameters) is serializable and shareable.
**Datasets** (imported files) are stored locally in IndexedDB and never embedded in shared URLs.

## Workflow schema

```typescript
type Workflow = {
  id: string;
  name: string;
  schemaVersion: number;       // reject-forward guard (see Schema versioning)
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  params: WorkflowParam[];
  createdAt: string;           // ISO 8601
  updatedAt: string;
};

type WorkflowNode = {
  id: string;
  type: NodeType;              // e.g. 'source.csv', 'filter', 'groupby'
  position: { x: number; y: number };
  config: Record<string, unknown>;
  title?: string;              // user-visible label override
};

type WorkflowEdge = {
  id: string;
  source: string;              // source node id
  target: string;              // target node id
  sourceHandle?: string;       // for multi-output nodes
  targetHandle?: string;       // for multi-input nodes (e.g. join right input)
};

type WorkflowParam = {
  name: string;                // Must be a valid Python identifier (regex: ^[a-zA-Z_][a-zA-Z0-9_]*$) and cannot be a Python keyword (e.g., import, def, class, etc.)
  type: 'string' | 'number' | 'date' | 'enum' | 'boolean';
  default: unknown;
  label?: string;
  options?: string[];          // for enum type
};
```

## Node type registry

Each node type is registered with a unique string identifier:

```typescript
type NodeType =
  | 'source.csv'
  | 'source.json'
  | 'filter'
  | 'select'
  | 'rename'
  | 'derive'
  | 'sort'
  | 'groupby'
  | 'join'
  | 'concat'
  | 'fillna'
  | 'dropna'
  | 'cast'
  | 'output';
```

## Node contract

Every node type implements this interface:

```typescript
interface NodeInputPort {
  id: string;                  // e.g. 'left', 'right', or 'input'
  label: string;               // e.g. 'Left Dataset', 'Right Dataset', or 'Input'
}

interface NodeDefinition {
  type: NodeType;
  label: string;
  category: 'source' | 'transform' | 'output';
  inputs: NodeInputPort[];     // Empty for sources, e.g. [{ id: 'input', label: 'Input' }] for transforms, [{ id: 'left', label: 'Left' }, { id: 'right', label: 'Right' }] for join
  outputs: number;             // always 1 in v1

  defaultConfig(): Record<string, unknown>;

  validate(
    config: Record<string, unknown>,
    inputSchemas: ColumnSchema[][]
  ): ValidationError[];

  compile(
    config: Record<string, unknown>,
    inputVars: string[],       // e.g. ['node_abc123']
    outputVar: string,         // e.g. 'node_def456'
    params: Record<string, unknown>
  ): string;                  // Python snippet

  inspectorSchema(): InspectorField[];
}
```

### Inspector field types

```typescript
type InspectorField =
  | { kind: 'text'; key: string; label: string }
  | { kind: 'number'; key: string; label: string }
  | { kind: 'select'; key: string; label: string; options: string[] }
  | { kind: 'column'; key: string; label: string }          // column picker from upstream schema
  | { kind: 'columns'; key: string; label: string }         // multi-column picker
  | { kind: 'expression'; key: string; label: string }    // filter/derive expression
  | { kind: 'param-ref'; key: string; label: string };     // reference to workflow param
```

## Column schema (for validation and UI)

```typescript
type ColumnSchema = {
  name: string;
  dtype: 'int' | 'float' | 'string' | 'bool' | 'datetime' | 'unknown';
  pandasDtype: string;         // Raw pandas dtype (e.g. 'int64', 'float64', 'category', 'object') for precise casting and advanced operations
  nullable: boolean;
};
```

Propagated upstream → used by column pickers and `validate()`.

## Version snapshot

```typescript
type VersionSnapshot = {
  id: string;
  workflowId: string;
  parentId: string | null;     // null for initial version
  message: string;           // user-provided or auto-generated
  workflow: Workflow;        // full snapshot at this point
  createdAt: string;
};
```

Immutable. Revert = load a snapshot's workflow into the current editor. Fork = create a new workflow from a snapshot.

## Dataset record (IndexedDB)

```typescript
type DatasetRecord = {
  id: string;
  workflowId: string;
  nodeId: string;              // the source node this file belongs to
  filename: string;
  mimeType: string;
  data: ArrayBuffer;           // raw file bytes
  importedAt: string;
};
```

## Runtime state (not persisted)

```typescript
type NodeRuntimeState = {
  nodeId: string;
  status: 'idle' | 'running' | 'success' | 'error';
  fingerprint: string | null;
  preview: PreviewPayload | null;
  error: string | null;
};

type PreviewPayload = {
  columns: ColumnSchema[];
  rows: Record<string, unknown>[];  // capped at N rows (e.g. 100)
  totalRows: number;
  totalColumns: number;
};
```

## Schema versioning

RefineIt is pre-launch; **no incremental workflow migrations**. See [12-node-expansion.md](./12-node-expansion.md) § Persistence & compatibility policy.

- `schemaVersion` on `Workflow` starts at `1`; bump when breaking node types or workflow shape changes.
- **Reject forward:** if `schemaVersion > WORKFLOW_SCHEMA_VERSION` (share import / file load), show error — user must update the app.
- **Reject backward:** if `schemaVersion < WORKFLOW_SCHEMA_VERSION`, or any stored workflow contains unknown node types, treat IndexedDB as **incompatible** — blocking dialog with **Clear all local data** (no auto-upgrade).
- **Boot validation:** scan **every** workflow record in IndexedDB (not only the active workflow) before allowing normal app use.
- **Share URLs:** fragile by design — old links may fail after schema bumps; no migration path (user rebuilds or re-exports).
- Do **not** add migration chains in `src/data/migrations/` for node expansion; `migrateWorkflow()` may remain as a no-op or be removed.
