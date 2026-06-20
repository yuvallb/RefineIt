import { parseStringArray, validateColumnsExist } from './column-utils';
import { nodeType, type PaletteNodeDefinition } from './node-type';

type OutlierMethod = 'iqr' | 'zscore';
type OutlierAction = 'flag' | 'remove' | 'winsorize';

function parseMethod(config: Record<string, unknown>): OutlierMethod {
  return config.method === 'zscore' ? 'zscore' : 'iqr';
}

function parseAction(config: Record<string, unknown>): OutlierAction {
  const action = config.action;
  if (action === 'remove' || action === 'winsorize') return action;
  return 'flag';
}

function parseThreshold(config: Record<string, unknown>): number {
  return typeof config.threshold === 'number' && config.threshold > 0 ? config.threshold : 1.5;
}

function compileBounds(input: string, column: string, method: OutlierMethod, threshold: number): {
  lower: string;
  upper: string;
  mask: string;
} {
  const col = JSON.stringify(column);
  if (method === 'zscore') {
    const mean = `${input}[${col}].mean()`;
    const std = `${input}[${col}].std()`;
    const zscore = `(${input}[${col}] - ${mean}) / ${std}`;
    return {
      lower: `${mean} - ${threshold} * ${std}`,
      upper: `${mean} + ${threshold} * ${std}`,
      mask: `(${zscore}).abs() > ${threshold}`,
    };
  }

  const q1 = `${input}[${col}].quantile(0.25)`;
  const q3 = `${input}[${col}].quantile(0.75)`;
  const iqr = `(${q3} - ${q1})`;
  const lower = `${q1} - ${threshold} * ${iqr}`;
  const upper = `${q3} + ${threshold} * ${iqr}`;
  return {
    lower,
    upper,
    mask: `(${input}[${col}] < ${lower}) | (${input}[${col}] > ${upper})`,
  };
}

export const outliers: PaletteNodeDefinition = {
  type: nodeType('outliers'),
  label: 'Detect Outliers',
  category: 'transform',
  paletteGroup: 'quality',
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return {
      columns: [] as string[],
      method: 'iqr' as OutlierMethod,
      threshold: 1.5,
      action: 'flag' as OutlierAction,
    };
  },

  validate(config, inputSchemas) {
    const errors = [];
    const columns = parseStringArray(config.columns);
    const upstream = inputSchemas[0] ?? [];

    if (columns.length === 0) {
      errors.push({ field: 'columns', message: 'Select at least one column' });
    }

    errors.push(...validateColumnsExist(columns, upstream, 'columns'));

    const threshold = config.threshold;
    if (threshold !== undefined && (typeof threshold !== 'number' || threshold <= 0)) {
      errors.push({ field: 'threshold', message: 'Threshold must be a positive number' });
    }

    return errors;
  },

  compile(config, inputVars, outputVar, _params?, _context?) {
    void _params;
    void _context;
    const columns = parseStringArray(config.columns);
    const input = inputVars[0];
    const method = parseMethod(config);
    const threshold = parseThreshold(config);
    const action = parseAction(config);

    const lines = [`${outputVar} = ${input}.copy()`];
    const maskExprs: string[] = [];

    for (const column of columns) {
      const colKey = JSON.stringify(column);
      const outCol = JSON.stringify(`${column}_outlier`);
      const { lower, upper, mask } = compileBounds(input, column, method, threshold);
      lines.push(`_outlier_mask_${column.replace(/\W/g, '_')} = ${mask}`);
      maskExprs.push(`_outlier_mask_${column.replace(/\W/g, '_')}`);

      if (action === 'flag') {
        lines.push(`${outputVar}[${outCol}] = _outlier_mask_${column.replace(/\W/g, '_')}`);
      } else if (action === 'winsorize') {
        lines.push(`${outputVar}[${colKey}] = ${outputVar}[${colKey}].clip(lower=${lower}, upper=${upper})`);
      }
    }

    if (action === 'remove' && maskExprs.length > 0) {
      const combined =
        maskExprs.length === 1 ? maskExprs[0] : `(${maskExprs.join(') | (')})`;
      lines.push(`${outputVar} = ${outputVar}[~(${combined})].copy()`);
    }

    return lines.join('\n');
  },

  inspectorSchema() {
    return [
      { kind: 'columns', key: 'columns', label: 'Columns' },
      { kind: 'select', key: 'method', label: 'Method', options: ['iqr', 'zscore'] },
      { kind: 'number', key: 'threshold', label: 'Threshold' },
      { kind: 'select', key: 'action', label: 'Action', options: ['flag', 'remove', 'winsorize'] },
    ];
  },

  configSummary(config) {
    const columns = parseStringArray(config.columns);
    const method = parseMethod(config);
    const action = parseAction(config);
    if (columns.length === 0) return 'No columns';
    return `${columns.join(', ')} · ${method} · ${action}`;
  },
};
