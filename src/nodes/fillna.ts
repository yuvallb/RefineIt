import { parseStringArray, validateColumnsExist } from './column-utils';
import type { NodeDefinition } from './types';

function parseValue(config: Record<string, unknown>): string | number {
  if (typeof config.value === 'number') return config.value;
  if (typeof config.value === 'string') return config.value;
  return 0;
}

export const fillna: NodeDefinition = {
  type: 'fillna',
  label: 'Fill NA',
  category: 'transform',
  paletteGroup: 'missing',
  paletteOrder: 1,
  exportVarSlug: 'filled',
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return { columns: [] as string[], value: 0 };
  },

  validate(config, inputSchemas) {
    const columns = parseStringArray(config.columns);
    const upstream = inputSchemas[0] ?? [];
    return validateColumnsExist(columns, upstream, 'columns');
  },

  compile(config, inputVars, outputVar, _params?, _context?) {
    void _params;
    void _context;
    const columns = parseStringArray(config.columns);
    const input = inputVars[0];
    const value = parseValue(config);
    const valueLiteral = typeof value === 'number' ? String(value) : JSON.stringify(value);

    if (columns.length === 0) {
      return `${outputVar} = ${input}.fillna(${valueLiteral})`;
    }

    const colList = columns.map((c) => JSON.stringify(c)).join(', ');
    return `${outputVar} = ${input}.fillna({col: ${valueLiteral} for col in [${colList}]})`;
  },

  inspectorSchema() {
    return [
      { kind: 'columns', key: 'columns', label: 'Columns (optional)' },
      { kind: 'text', key: 'value', label: 'Fill value' },
    ];
  },

  configSummary(config) {
    const columns = parseStringArray(config.columns);
    const value = parseValue(config);
    if (columns.length === 0) return `Fill NA with ${value}`;
    return `Fill ${columns.join(', ')} with ${value}`;
  },
};
