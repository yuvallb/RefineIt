import type { NodeType } from '@/lib/types';

import { parseStringArray, validateColumnsExist } from './column-utils';
import type { NodeDefinition } from './types';

type ReorderNode = NodeDefinition & {
  paletteGroup: 'column';
  paletteOrder: number;
  exportVarSlug: string;
};

export const reorder = {
  type: 'reorder' as NodeType,
  label: 'Reorder',
  category: 'transform',
  paletteGroup: 'column',
  paletteOrder: 3,
  exportVarSlug: 'reordered',
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return {
      columns: [] as string[],
      appendRemainder: true,
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
    return errors;
  },

  compile(config, inputVars, outputVar, _params?, _context?) {
    void _params;
    void _context;
    const input = inputVars[0];
    const columns = parseStringArray(config.columns);
    const orderedList = columns.map((c) => JSON.stringify(c)).join(', ');
    const appendRemainder = config.appendRemainder !== false;

    if (appendRemainder) {
      const orderedVar = `${outputVar}_ordered`;
      return [
        `${orderedVar} = [${orderedList}]`,
        `${outputVar} = ${input}[${orderedVar} + [c for c in ${input}.columns if c not in ${orderedVar}]]`,
      ].join('\n');
    }

    return `${outputVar} = ${input}[[${orderedList}]]`;
  },

  inspectorSchema() {
    return [
      { kind: 'columns', key: 'columns', label: 'Column order' },
      { kind: 'select', key: 'appendRemainder', label: 'Append remainder', options: ['true', 'false'] },
    ];
  },

  configSummary(config) {
    const columns = parseStringArray(config.columns);
    if (columns.length === 0) return 'No columns';
    const label =
      columns.length > 3 ? `${columns.slice(0, 3).join(', ')}…` : columns.join(', ');
    const suffix = config.appendRemainder === false ? '' : ' + rest';
    return `${label}${suffix}`;
  },
} satisfies ReorderNode;
