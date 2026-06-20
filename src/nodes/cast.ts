import { parseStringRecord } from './column-utils';
import type { NodeDefinition } from './types';

const VALID_DTYPES = new Set([
  'int',
  'int64',
  'float',
  'float64',
  'str',
  'string',
  'bool',
  'datetime64[ns]',
  'category',
]);

export const cast: NodeDefinition = {
  type: 'cast',
  label: 'Cast',
  category: 'transform',
  paletteGroup: 'column',
  paletteOrder: 3,
  exportVarSlug: 'casted',
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return { mapping: {} as Record<string, string> };
  },

  validate(config, inputSchemas) {
    const errors = [];
    const mapping = parseStringRecord(config.mapping);
    const upstream = inputSchemas[0] ?? [];
    const colNames = new Set(upstream.map((c) => c.name));
    const entries = Object.entries(mapping);

    if (entries.length === 0) {
      errors.push({ field: 'mapping', message: 'Add at least one column cast' });
    }

    for (const [col, dtype] of entries) {
      if (!col) {
        errors.push({ field: 'mapping', message: 'Column is required' });
        continue;
      }
      if (upstream.length > 0 && !colNames.has(col)) {
        errors.push({ field: 'mapping', message: `Column "${col}" not found upstream` });
      }
      if (!VALID_DTYPES.has(dtype)) {
        errors.push({ field: 'mapping', message: `Unknown dtype "${dtype}"` });
      }
    }

    return errors;
  },

  compile(config, inputVars, outputVar, _params?, _context?) {
    void _params;
    void _context;
    const mapping = parseStringRecord(config.mapping);
    const input = inputVars[0];
    const entries = Object.entries(mapping)
      .map(([col, dtype]) => `${JSON.stringify(col)}: ${JSON.stringify(dtype)}`)
      .join(', ');
    return `${outputVar} = ${input}.astype({${entries}})`;
  },

  inspectorSchema() {
    return [{ kind: 'dtype-mapping', key: 'mapping', label: 'Type mapping' }];
  },

  configSummary(config) {
    const mapping = parseStringRecord(config.mapping);
    const entries = Object.entries(mapping);
    if (entries.length === 0) return 'No casts';
    const first = entries[0];
    const suffix = entries.length > 1 ? ` (+${entries.length - 1})` : '';
    return `${first[0]} → ${first[1]}${suffix}`;
  },
};
