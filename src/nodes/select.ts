import { parseStringArray, validateColumnsExist } from './column-utils';
import type { NodeDefinition } from './types';

type SelectMode = 'keep' | 'drop';

function parseMode(config: Record<string, unknown>): SelectMode {
  return config.mode === 'drop' ? 'drop' : 'keep';
}

export const select: NodeDefinition = {
  type: 'select',
  label: 'Select',
  category: 'transform',
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return { columns: [] as string[], mode: 'keep' as SelectMode };
  },

  validate(config, inputSchemas) {
    const errors = [];
    const columns = parseStringArray(config.columns);
    const upstream = inputSchemas[0] ?? [];

    if (columns.length === 0) {
      errors.push({ field: 'columns', message: 'Select at least one column' });
    }

    errors.push(...validateColumnsExist(columns, upstream, 'columns'));
    return errors;
  },

  compile(config, inputVars, outputVar) {
    const columns = parseStringArray(config.columns);
    const input = inputVars[0];
    const colList = columns.map((c) => JSON.stringify(c)).join(', ');

    if (parseMode(config) === 'drop') {
      return `${outputVar} = ${input}.drop(columns=[${colList}])`;
    }
    return `${outputVar} = ${input}[[${colList}]]`;
  },

  inspectorSchema() {
    return [
      { kind: 'columns', key: 'columns', label: 'Columns' },
      { kind: 'select', key: 'mode', label: 'Mode', options: ['keep', 'drop'] },
    ];
  },

  configSummary(config) {
    const columns = parseStringArray(config.columns);
    const mode = parseMode(config);
    if (columns.length === 0) return 'No columns';
    const label = columns.length > 2 ? `${columns.slice(0, 2).join(', ')}…` : columns.join(', ');
    return `${mode} ${label}`;
  },
};
