import type { ColumnSchema } from '@/lib/types';

import { parseStringArray, validateColumnsExist } from './column-utils';
import { llmMethodError } from './ai-utils';
import { nodeType, type PaletteNodeDefinition } from './node-type';

type ClassifyMethod = 'rules' | 'cut' | 'supervised' | 'cluster' | 'llm';
type RuleMatch = 'contains' | 'regex';

export interface ClassifyRule {
  match: RuleMatch;
  pattern: string;
  label: string;
}

type CutMode = 'manual' | 'quantile' | 'equal';

const MAX_REGEX_LENGTH = 500;

function parseMethod(config: Record<string, unknown>): ClassifyMethod {
  const method = config.method;
  if (
    method === 'cut' ||
    method === 'supervised' ||
    method === 'cluster' ||
    method === 'llm'
  ) {
    return method;
  }
  return 'rules';
}

function parseRules(config: Record<string, unknown>): ClassifyRule[] {
  if (!Array.isArray(config.rules)) return [];
  return config.rules.filter((item): item is ClassifyRule => {
    if (typeof item !== 'object' || item === null) return false;
    const rule = item as ClassifyRule;
    return (
      typeof rule.pattern === 'string' &&
      typeof rule.label === 'string' &&
      (rule.match === 'contains' || rule.match === 'regex')
    );
  });
}

function parseCutMode(config: Record<string, unknown>): CutMode {
  const mode = config.cutMode;
  if (mode === 'quantile' || mode === 'equal') return mode;
  return 'manual';
}

function parseBinCount(config: Record<string, unknown>): number {
  return typeof config.binCount === 'number' && config.binCount >= 2 ? config.binCount : 4;
}

function parseManualBins(config: Record<string, unknown>): number[] {
  if (!Array.isArray(config.bins)) return [];
  return config.bins
    .map((v) => (typeof v === 'number' ? v : Number(v)))
    .filter((v): v is number => Number.isFinite(v));
}

function parseLabels(config: Record<string, unknown>): string[] {
  if (Array.isArray(config.labels)) {
    return parseStringArray(config.labels);
  }
  if (typeof config.labels === 'string') {
    return config.labels
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  return [];
}

function parseMaxTrainRows(config: Record<string, unknown>): number {
  return typeof config.maxTrainRows === 'number' && config.maxTrainRows > 0
    ? Math.min(config.maxTrainRows, 50_000)
    : 5000;
}

function parseNClusters(config: Record<string, unknown>): number {
  return typeof config.nClusters === 'number' && config.nClusters >= 2 ? config.nClusters : 3;
}

function isNumericColumn(schema: ColumnSchema | undefined): boolean {
  if (!schema) return true;
  return schema.dtype === 'int' || schema.dtype === 'float';
}

function isRegexSafe(regex: string): boolean {
  if (regex.length > MAX_REGEX_LENGTH) return false;
  if (/\([^)]*[+*][^)]*\)[+*]/.test(regex)) return false;
  return true;
}

function outputColumnName(config: Record<string, unknown>, column: string): string {
  const custom =
    typeof config.outputColumn === 'string' ? config.outputColumn.trim() : '';
  return custom || `${column}_class`;
}

export const aiClassify: PaletteNodeDefinition = {
  type: nodeType('ai.classify'),
  label: 'Classify',
  category: 'transform',
  paletteGroup: 'ai',
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return {
      method: 'rules' as ClassifyMethod,
      column: '',
      outputColumn: '',
      defaultLabel: '',
      rules: [{ match: 'contains', pattern: '', label: '' }] as ClassifyRule[],
      cutMode: 'equal' as CutMode,
      bins: [] as number[],
      binCount: 4,
      labels: [] as string[],
      labelColumn: '',
      featureColumns: [] as string[],
      maxTrainRows: 5000,
      clusterColumns: [] as string[],
      nClusters: 3,
    };
  },

  validate(config, inputSchemas) {
    const method = parseMethod(config);
    if (method === 'llm') {
      return llmMethodError();
    }

    const errors = [];
    const column = typeof config.column === 'string' ? config.column.trim() : '';
    const upstream = inputSchemas[0] ?? [];

    if (!column) {
      errors.push({ field: 'column', message: 'Select a column' });
    } else {
      errors.push(...validateColumnsExist([column], upstream, 'column'));
    }

    if (method === 'rules') {
      const rules = parseRules(config);
      if (rules.length === 0) {
        errors.push({ field: 'rules', message: 'Add at least one rule with pattern and label' });
      }
      for (const rule of rules) {
        if (!rule.pattern.trim()) {
          errors.push({ field: 'rules', message: 'Each rule needs a pattern' });
        }
        if (!rule.label.trim()) {
          errors.push({ field: 'rules', message: 'Each rule needs a label' });
        }
        if (rule.match === 'regex' && !isRegexSafe(rule.pattern)) {
          errors.push({ field: 'rules', message: 'Unsafe or overly long regex in rules' });
        }
      }
    }

    if (method === 'cut') {
      const colSchema = upstream.find((c) => c.name === column);
      if (colSchema && !isNumericColumn(colSchema)) {
        errors.push({ field: 'column', message: 'Cut requires a numeric column' });
      }

      const cutMode = parseCutMode(config);
      if (cutMode === 'manual') {
        const bins = parseManualBins(config);
        if (bins.length < 2) {
          errors.push({ field: 'bins', message: 'Manual cut needs at least two bin edges' });
        }
      }
    }

    if (method === 'supervised') {
      const labelColumn =
        typeof config.labelColumn === 'string' ? config.labelColumn.trim() : '';
      if (!labelColumn) {
        errors.push({ field: 'labelColumn', message: 'Label column is required for supervised' });
      } else {
        errors.push(...validateColumnsExist([labelColumn], upstream, 'labelColumn'));
      }

      const featureColumns = parseStringArray(config.featureColumns);
      if (featureColumns.length > 0) {
        errors.push(...validateColumnsExist(featureColumns, upstream, 'featureColumns'));
      }
    }

    if (method === 'cluster') {
      const clusterColumns = parseStringArray(config.clusterColumns);
      if (clusterColumns.length === 0) {
        errors.push({ field: 'clusterColumns', message: 'Select at least one feature column' });
      }
      errors.push(...validateColumnsExist(clusterColumns, upstream, 'clusterColumns'));
      for (const col of clusterColumns) {
        const colSchema = upstream.find((c) => c.name === col);
        if (colSchema && !isNumericColumn(colSchema)) {
          errors.push({ field: 'clusterColumns', message: `Column "${col}" must be numeric` });
        }
      }
    }

    return errors;
  },

  compile(config, inputVars, outputVar, _params?, _context?) {
    void _params;
    void _context;
    const method = parseMethod(config);
    const column = typeof config.column === 'string' ? config.column.trim() : '';
    const input = inputVars[0];
    const outCol = outputColumnName(config, column);
    const outKey = JSON.stringify(outCol);
    const colKey = JSON.stringify(column);

    if (method === 'rules') {
      const rules = parseRules(config);
      const defaultLabel =
        typeof config.defaultLabel === 'string' && config.defaultLabel.length > 0
          ? config.defaultLabel
          : null;
      const rulesJson = JSON.stringify(rules);
      const defaultArg = defaultLabel === null ? 'None' : JSON.stringify(defaultLabel);

      return [
        `${outputVar} = ${input}.copy()`,
        `${outputVar}[${outKey}] = apply_classify_rules(${input}[${colKey}], ${rulesJson}, default_label=${defaultArg})`,
      ].join('\n');
    }

    if (method === 'cut') {
      const cutMode = parseCutMode(config);
      const labels = parseLabels(config);
      const labelsArg =
        labels.length > 0 ? `labels=${JSON.stringify(labels)}` : '';

      if (cutMode === 'quantile') {
        const q = parseBinCount(config);
        return [
          `${outputVar} = ${input}.copy()`,
          `${outputVar}[${outKey}] = pd.qcut(${input}[${colKey}], q=${q}, duplicates='drop'${labelsArg ? `, ${labelsArg}` : ''})`,
        ].join('\n');
      }

      if (cutMode === 'equal') {
        const q = parseBinCount(config);
        return [
          `${outputVar} = ${input}.copy()`,
          `${outputVar}[${outKey}] = pd.cut(${input}[${colKey}], bins=${q}${labelsArg ? `, ${labelsArg}` : ''})`,
        ].join('\n');
      }

      const bins = parseManualBins(config);
      return [
        `${outputVar} = ${input}.copy()`,
        `${outputVar}[${outKey}] = pd.cut(${input}[${colKey}], bins=${JSON.stringify(bins)}${labelsArg ? `, ${labelsArg}` : ''})`,
      ].join('\n');
    }

    if (method === 'supervised') {
      const labelColumn =
        typeof config.labelColumn === 'string' ? config.labelColumn.trim() : '';
      const featureColumns = parseStringArray(config.featureColumns);
      const textCol = featureColumns.length > 0 ? featureColumns[0] : column;
      const maxTrainRows = parseMaxTrainRows(config);

      return [
        '# Requires scikit-learn (lazy-loaded in browser)',
        'from sklearn.feature_extraction.text import TfidfVectorizer',
        'from sklearn.naive_bayes import MultinomialNB',
        `${outputVar} = ${input}.copy()`,
        `_train = ${input}[${input}[${JSON.stringify(labelColumn)}].notna()].head(${maxTrainRows})`,
        '_vectorizer = TfidfVectorizer()',
        `_X_train = _vectorizer.fit_transform(_train[${JSON.stringify(textCol)}].astype(str))`,
        '_model = MultinomialNB()',
        `_model.fit(_X_train, _train[${JSON.stringify(labelColumn)}])`,
        `_X_all = _vectorizer.transform(${input}[${JSON.stringify(textCol)}].astype(str))`,
        `${outputVar}[${outKey}] = _model.predict(_X_all)`,
      ].join('\n');
    }

    if (method === 'cluster') {
      const clusterColumns = parseStringArray(config.clusterColumns);
      const nClusters = parseNClusters(config);
      const colsJson = JSON.stringify(clusterColumns);

      return [
        '# Requires scikit-learn (lazy-loaded in browser)',
        'from sklearn.preprocessing import StandardScaler',
        'from sklearn.cluster import KMeans',
        `${outputVar} = ${input}.copy()`,
        `_feat = ${input}[${colsJson}].fillna(${input}[${colsJson}].mean())`,
        '_scaled = StandardScaler().fit_transform(_feat)',
        `_labels = KMeans(n_clusters=${nClusters}, random_state=42, n_init=10).fit_predict(_scaled)`,
        `${outputVar}[${outKey}] = _labels`,
      ].join('\n');
    }

    return `${outputVar} = ${input}.copy()  # LLM classify not implemented`;
  },

  inspectorSchema() {
    return [
      {
        kind: 'select',
        key: 'method',
        label: 'Method',
        options: ['rules', 'cut', 'supervised', 'cluster', 'llm'],
      },
      { kind: 'column', key: 'column', label: 'Column' },
      { kind: 'text', key: 'outputColumn', label: 'Output column (optional)' },
      { kind: 'text', key: 'defaultLabel', label: 'Default label (rules)' },
      { kind: 'classify-rules', key: 'rules', label: 'Rules (first match wins)' },
      {
        kind: 'select',
        key: 'cutMode',
        label: 'Cut mode',
        options: ['equal', 'quantile', 'manual'],
      },
      { kind: 'number', key: 'binCount', label: 'Bin count (equal / quantile)' },
      { kind: 'string-list', key: 'bins', label: 'Manual bin edges' },
      { kind: 'string-list', key: 'labels', label: 'Bin labels' },
      { kind: 'column', key: 'labelColumn', label: 'Label column (supervised)' },
      { kind: 'columns', key: 'featureColumns', label: 'Feature columns (supervised)' },
      { kind: 'number', key: 'maxTrainRows', label: 'Max training rows' },
      { kind: 'columns', key: 'clusterColumns', label: 'Feature columns (cluster)' },
      { kind: 'number', key: 'nClusters', label: 'Clusters (K)' },
    ];
  },

  configSummary(config) {
    const method = parseMethod(config);
    const column = typeof config.column === 'string' ? config.column : '';
    if (!column) return 'No column';
    if (method === 'llm') return `LLM · ${column} (not implemented)`;
    const outCol = outputColumnName(config, column);
    return `${method} · ${column} → ${outCol}`;
  },
};
