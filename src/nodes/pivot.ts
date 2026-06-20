import type { NodeType } from '@/lib/types';

import { parseStringArray, validateColumnsExist } from './column-utils';
import type { NodeDefinition } from './types';

const ALLOWED_AGG_FUNCS = new Set([
  'sum',
  'mean',
  'count',
  'min',
  'max',
  'median',
  'std',
  'var',
  'first',
  'last',
]);

function parseAggFunc(config: Record<string, unknown>): string {
  const aggfunc = config.aggfunc;
  if (typeof aggfunc === 'string' && ALLOWED_AGG_FUNCS.has(aggfunc)) return aggfunc;
  return 'sum';
}

function parseFillValue(config: Record<string, unknown>): unknown | undefined {
  if (config.fillValue === undefined || config.fillValue === null || config.fillValue === '') {
    return undefined;
  }
  return config.fillValue;
}

export const pivot: NodeDefinition = {
  type: 'pivot' as NodeType,
  label: 'Pivot',
  category: 'transform',
  paletteGroup: 'aggregate',
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return {
      index: [] as string[],
      columns: '',
      values: '',
      aggfunc: 'sum',
      fillValue: undefined as unknown,
    };
  },

  validate(config, inputSchemas) {
    const errors = [];
    const index = parseStringArray(config.index);
    const columns = typeof config.columns === 'string' ? config.columns.trim() : '';
    const values = typeof config.values === 'string' ? config.values.trim() : '';
    const upstream = inputSchemas[0] ?? [];

    if (index.length === 0) {
      errors.push({ field: 'index', message: 'Select at least one index column' });
    }
    errors.push(...validateColumnsExist(index, upstream, 'index'));

    if (!columns) {
      errors.push({ field: 'columns', message: 'Pivot columns field is required' });
    } else {
      errors.push(...validateColumnsExist([columns], upstream, 'columns'));
    }

    if (!values) {
      errors.push({ field: 'values', message: 'Values column is required' });
    } else {
      errors.push(...validateColumnsExist([values], upstream, 'values'));
    }

    const aggfunc = config.aggfunc;
    if (typeof aggfunc === 'string' && aggfunc.length > 0 && !ALLOWED_AGG_FUNCS.has(aggfunc)) {
      errors.push({ field: 'aggfunc', message: `Unknown aggregation function "${aggfunc}"` });
    }

    return errors;
  },

  compile(config, inputVars, outputVar, _params?, _context?) {
    void _params;
    void _context;
    const index = parseStringArray(config.index);
    const columns = typeof config.columns === 'string' ? config.columns.trim() : '';
    const values = typeof config.values === 'string' ? config.values.trim() : '';
    const aggfunc = parseAggFunc(config);
    const fillValue = parseFillValue(config);
    const input = inputVars[0];
    const indexList = index.map((c) => JSON.stringify(c)).join(', ');

    const args = [
      `index=[${indexList}]`,
      `columns=${JSON.stringify(columns)}`,
      `values=${JSON.stringify(values)}`,
      `aggfunc=${JSON.stringify(aggfunc)}`,
    ];
    if (fillValue !== undefined) {
      args.push(`fill_value=${JSON.stringify(fillValue)}`);
    }

    return `${outputVar} = ${input}.pivot_table(${args.join(', ')})`;
  },

  inspectorSchema() {
    return [
      { kind: 'columns', key: 'index', label: 'Index columns' },
      { kind: 'column', key: 'columns', label: 'Columns' },
      { kind: 'column', key: 'values', label: 'Values' },
      {
        kind: 'select',
        key: 'aggfunc',
        label: 'Aggregation',
        options: ['sum', 'mean', 'count', 'min', 'max', 'median', 'std', 'var', 'first', 'last'],
      },
      { kind: 'text', key: 'fillValue', label: 'Fill value (optional)' },
    ];
  },

  configSummary(config) {
    const index = parseStringArray(config.index);
    const columns = typeof config.columns === 'string' ? config.columns : '';
    const values = typeof config.values === 'string' ? config.values : '';
    const aggfunc = parseAggFunc(config);
    if (index.length === 0 || !columns || !values) return 'Incomplete pivot';
    return `${aggfunc}(${values}) by ${index.join(', ')} × ${columns}`;
  },
};
