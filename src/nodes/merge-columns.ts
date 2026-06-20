import type { NodeType } from '@/lib/types';

import { parseStringArray, validateColumnsExist } from './column-utils';
import type { NodeDefinition } from './types';

type MergeColumnsNode = NodeDefinition & {
  paletteGroup: 'column';
  paletteOrder: number;
  exportVarSlug: string;
};

function parseInto(config: Record<string, unknown>): string {
  const into = typeof config.into === 'string' ? config.into.trim() : '';
  return into || 'merged';
}

function parseSeparator(config: Record<string, unknown>): string {
  return typeof config.separator === 'string' ? config.separator : ' ';
}

export const mergeColumns = {
  type: 'merge.columns' as NodeType,
  label: 'Merge Columns',
  category: 'transform',
  paletteGroup: 'column',
  paletteOrder: 8,
  exportVarSlug: 'merged_cols',
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return {
      columns: [] as string[],
      separator: ' ',
      into: 'merged',
      dropSource: false,
    };
  },

  validate(config, inputSchemas) {
    const errors = [];
    const columns = parseStringArray(config.columns);
    const upstream = inputSchemas[0] ?? [];

    if (columns.length < 2) {
      errors.push({ field: 'columns', message: 'Select at least two columns to merge' });
    }

    errors.push(...validateColumnsExist(columns, upstream, 'columns'));

    const into = parseInto(config);
    if (!into) {
      errors.push({ field: 'into', message: 'Output column name is required' });
    }

    return errors;
  },

  compile(config, inputVars, outputVar, _params?, _context?) {
    void _params;
    void _context;
    const input = inputVars[0];
    const columns = parseStringArray(config.columns);
    const separator = parseSeparator(config);
    const into = parseInto(config);
    const dropSource = config.dropSource === true;
    const colList = columns.map((c) => JSON.stringify(c)).join(', ');

    const lines = [
      `${outputVar} = ${input}.copy()`,
      `${outputVar}[${JSON.stringify(into)}] = ${input}[[${colList}]].astype(str).agg(${JSON.stringify(separator)}.join, axis=1)`,
    ];

    if (dropSource) {
      lines.push(`${outputVar} = ${outputVar}.drop(columns=[${colList}])`);
    }

    return lines.join('\n');
  },

  inspectorSchema() {
    return [
      { kind: 'columns', key: 'columns', label: 'Columns' },
      { kind: 'text', key: 'separator', label: 'Separator' },
      { kind: 'text', key: 'into', label: 'Output column' },
      { kind: 'select', key: 'dropSource', label: 'Drop source columns', options: ['false', 'true'] },
    ];
  },

  configSummary(config) {
    const columns = parseStringArray(config.columns);
    const into = parseInto(config);
    const separator = parseSeparator(config);
    if (columns.length === 0) return 'No columns';
    const label =
      columns.length > 2 ? `${columns.slice(0, 2).join(', ')}…` : columns.join(', ');
    const drop = config.dropSource === true ? ', drop source' : '';
    return `${label} → ${into} (${JSON.stringify(separator)}${drop})`;
  },
} satisfies MergeColumnsNode;
