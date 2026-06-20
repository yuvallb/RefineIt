import { parseStringArray, validateColumnsExist } from './column-utils';
import type { NodeDefinition } from './types';

type DropHow = 'any' | 'all';

function parseHow(config: Record<string, unknown>): DropHow {
  return config.how === 'all' ? 'all' : 'any';
}

export const dropna: NodeDefinition = {
  type: 'dropna',
  label: 'Drop NA',
  category: 'transform',
  paletteGroup: 'missing',
  paletteOrder: 0,
  exportVarSlug: 'dropna',
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return { columns: [] as string[], how: 'any' as DropHow };
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
    const how = parseHow(config);

    if (columns.length === 0) {
      return `${outputVar} = ${input}.dropna(how=${JSON.stringify(how)})`;
    }

    const colList = columns.map((c) => JSON.stringify(c)).join(', ');
    return `${outputVar} = ${input}.dropna(subset=[${colList}], how=${JSON.stringify(how)})`;
  },

  inspectorSchema() {
    return [
      { kind: 'columns', key: 'columns', label: 'Columns (optional)' },
      { kind: 'select', key: 'how', label: 'How', options: ['any', 'all'] },
    ];
  },

  configSummary(config) {
    const columns = parseStringArray(config.columns);
    const how = parseHow(config);
    if (columns.length === 0) return `Drop NA (${how})`;
    return `Drop NA in ${columns.join(', ')} (${how})`;
  },
};
