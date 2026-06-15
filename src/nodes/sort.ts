import { parseStringArray, validateColumnsExist } from './column-utils';
import type { NodeDefinition } from './types';

function parseAscending(config: Record<string, unknown>, columnCount: number): boolean[] {
  if (Array.isArray(config.ascending) && config.ascending.length === columnCount) {
    return config.ascending.map((v) => v !== false);
  }
  const direction = config.direction === 'desc' ? false : true;
  return Array.from({ length: columnCount }, () => direction);
}

export const sort: NodeDefinition = {
  type: 'sort',
  label: 'Sort',
  category: 'transform',
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return { columns: [] as string[], direction: 'asc' as 'asc' | 'desc' };
  },

  validate(config, inputSchemas) {
    const errors = [];
    const columns = parseStringArray(config.columns);
    const upstream = inputSchemas[0] ?? [];

    if (columns.length === 0) {
      errors.push({ field: 'columns', message: 'Select at least one sort column' });
    }

    errors.push(...validateColumnsExist(columns, upstream, 'columns'));
    return errors;
  },

  compile(config, inputVars, outputVar) {
    const columns = parseStringArray(config.columns);
    const input = inputVars[0];
    const ascending = parseAscending(config, columns.length);
    const byList = columns.map((c) => JSON.stringify(c)).join(', ');
    const ascList = ascending.map((v) => (v ? 'True' : 'False')).join(', ');
    return `${outputVar} = ${input}.sort_values(by=[${byList}], ascending=[${ascList}])`;
  },

  inspectorSchema() {
    return [
      { kind: 'columns', key: 'columns', label: 'Sort columns' },
      { kind: 'select', key: 'direction', label: 'Direction', options: ['asc', 'desc'] },
    ];
  },

  configSummary(config) {
    const columns = parseStringArray(config.columns);
    if (columns.length === 0) return 'No sort columns';
    const dir = config.direction === 'desc' ? '↓' : '↑';
    return `${columns.join(', ')} ${dir}`;
  },
};
