import { getNodeDefinition } from '@/nodes/registry';
import type { NodeType, WorkflowNode } from '@/lib/types';

import { topoSort } from './topo-sort';

export interface ExportVarInfo {
  step: number;
  varName: string;
  commentId: string;
}

export type ExportNameMap = Map<string, ExportVarInfo>;

const PYTHON_KEYWORDS = new Set([
  'False',
  'None',
  'True',
  'and',
  'as',
  'assert',
  'async',
  'await',
  'break',
  'class',
  'continue',
  'def',
  'del',
  'elif',
  'else',
  'except',
  'finally',
  'for',
  'from',
  'global',
  'if',
  'import',
  'in',
  'is',
  'lambda',
  'nonlocal',
  'not',
  'or',
  'pass',
  'raise',
  'return',
  'try',
  'while',
  'with',
  'yield',
]);

const DEFAULT_EXPORT_SLUGS: Record<NodeType, string> = {
  'source.csv': 'csv_data',
  'source.json': 'json_data',
  'source.parquet': 'parquet_data',
  filter: 'filtered',
  select: 'selected',
  rename: 'renamed',
  derive: 'derived',
  sort: 'sorted',
  groupby: 'grouped',
  join: 'joined',
  concat: 'concatenated',
  dropna: 'dropna',
  fillna: 'filled',
  cast: 'casted',
  'output.csv': 'csv_output',
  'output.json': 'json_output',
  'output.parquet': 'parquet_output',
  sample: 'sampled',
  dedup: 'deduped',
  limit: 'limited',
  reorder: 'reordered',
  drop: 'dropped',
  'split.column': 'split_cols',
  'merge.columns': 'merged_cols',
  impute: 'imputed',
  pivot: 'pivoted',
  melt: 'melted',
  'merge.update': 'updated',
  'str.transform': 'str_transformed',
  'str.extract': 'extracted',
  'str.split': 'str_split',
  'dt.extract': 'dt_extracted',
  'dt.calc': 'dt_calculated',
  validate: 'validated',
  outliers: 'outliers_flagged',
  'find.duplicates': 'duplicates_found',
  'window.rolling': 'rolling',
  'window.rank': 'ranked',
  'window.shift': 'shifted',
  'ai.classify': 'classified',
  'ai.summarize': 'summarized',
  'ai.anonymize': 'anonymized',
  'custom.python': 'custom',
};

export function sanitizeSlug(raw: string): string {
  let slug = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!slug) {
    slug = 'data';
  }

  if (/^[0-9]/.test(slug)) {
    slug = `_${slug}`;
  }

  if (slug.length > 32) {
    slug = slug.slice(0, 32).replace(/_+$/, '');
  }

  if (PYTHON_KEYWORDS.has(slug)) {
    slug = `${slug}_df`;
  }

  return slug;
}

function resolveSlug(
  nodeType: NodeType,
  title: string | undefined,
  exportVarSlug: string | undefined,
): string {
  if (exportVarSlug) {
    return sanitizeSlug(exportVarSlug);
  }

  if (title?.trim()) {
    return sanitizeSlug(title);
  }

  return DEFAULT_EXPORT_SLUGS[nodeType];
}

export function buildExportNameMap(workflow: {
  nodes: WorkflowNode[];
  edges: { id: string; source: string; target: string }[];
}): ExportNameMap {
  const map: ExportNameMap = new Map();
  const sortedNodes = topoSort(workflow.nodes, workflow.edges);

  sortedNodes.forEach((node, index) => {
    const step = index + 1;
    const def = getNodeDefinition(node.type);
    const slug = resolveSlug(node.type, node.title, def.exportVarSlug);
    const varName = `${slug}_${step}`;

    map.set(node.id, {
      step,
      varName,
      commentId: String(step),
    });
  });

  return map;
}

export function getDefaultExportSlug(nodeType: NodeType): string {
  return DEFAULT_EXPORT_SLUGS[nodeType];
}
