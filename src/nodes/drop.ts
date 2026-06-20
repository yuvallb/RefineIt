import type { NodeType } from '@/lib/types';

import { parseStringArray, validateColumnsExist } from './column-utils';
import type { NodeDefinition } from './types';

type DropNode = NodeDefinition & {
  paletteGroup: 'column';
  paletteOrder: number;
  exportVarSlug: string;
};

export const drop = {
  type: 'drop' as NodeType,
  label: 'Drop Columns',
  category: 'transform',
  paletteGroup: 'column',
  paletteOrder: 4,
  exportVarSlug: 'dropped',
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return { columns: [] as string[] };
  },

  validate(config, inputSchemas) {
    const errors = [];
    const columns = parseStringArray(config.columns);
    const upstream = inputSchemas[0] ?? [];

    if (columns.length === 0) {
      errors.push({ field: 'columns', message: 'Select at least one column to drop' });
    }

    errors.push(...validateColumnsExist(columns, upstream, 'columns'));
    return errors;
  },

  compile(config, inputVars, outputVar, _params?, _context?) {
    void _params;
    void _context;
    const input = inputVars[0];
    const columns = parseStringArray(config.columns);
    const colList = columns.map((c) => JSON.stringify(c)).join(', ');
    return `${outputVar} = ${input}.drop(columns=[${colList}], errors='raise')`;
  },

  inspectorSchema() {
    return [{ kind: 'columns', key: 'columns', label: 'Columns to drop' }];
  },

  configSummary(config) {
    const columns = parseStringArray(config.columns);
    if (columns.length === 0) return 'No columns';
    const label =
      columns.length > 2 ? `${columns.slice(0, 2).join(', ')}…` : columns.join(', ');
    return `Drop ${label}`;
  },
} satisfies DropNode;
