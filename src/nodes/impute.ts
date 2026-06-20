import type { ColumnSchema, NodeType } from '@/lib/types';

import { parseStringArray, validateColumnsExist } from './column-utils';
import type { NodeDefinition } from './types';

type ImputeStrategy = 'mean' | 'median' | 'mode' | 'constant' | 'ffill' | 'bfill';

type ImputeNode = NodeDefinition & {
  paletteGroup: 'missing';
  paletteOrder: number;
  exportVarSlug: string;
};

const NUMERIC_STRATEGIES = new Set<ImputeStrategy>(['mean', 'median']);

function parseStrategy(config: Record<string, unknown>): ImputeStrategy {
  const strategy = config.strategy;
  if (
    strategy === 'median' ||
    strategy === 'mode' ||
    strategy === 'constant' ||
    strategy === 'ffill' ||
    strategy === 'bfill'
  ) {
    return strategy;
  }
  return 'mean';
}

function parseConstantValue(config: Record<string, unknown>): string | number {
  if (typeof config.constantValue === 'number') return config.constantValue;
  if (typeof config.constantValue === 'string') return config.constantValue;
  return 0;
}

function constantLiteral(value: string | number): string {
  return typeof value === 'number' ? String(value) : JSON.stringify(value);
}

function isNumericColumn(schema: ColumnSchema | undefined): boolean {
  if (!schema) return true;
  return schema.dtype === 'int' || schema.dtype === 'float';
}

function compileColumnImpute(
  input: string,
  output: string,
  column: string,
  strategy: ImputeStrategy,
  constantValue: string | number,
  groupBy: string[],
): string[] {
  const col = JSON.stringify(column);
  const lines: string[] = [];

  if (groupBy.length > 0) {
    const groupList = groupBy.map((c) => JSON.stringify(c)).join(', ');
    const grouped = `${input}.groupby([${groupList}])[${col}]`;

    switch (strategy) {
      case 'mean':
        lines.push(`${output}[${col}] = ${input}[${col}].fillna(${grouped}.transform('mean'))`);
        break;
      case 'median':
        lines.push(`${output}[${col}] = ${input}[${col}].fillna(${grouped}.transform('median'))`);
        break;
      case 'mode':
        lines.push(
          `${output}[${col}] = ${input}[${col}].fillna(${grouped}.transform(lambda s: s.mode().iloc[0] if len(s.mode()) > 0 else s))`,
        );
        break;
      case 'constant':
        lines.push(
          `${output}[${col}] = ${input}[${col}].fillna(${constantLiteral(constantValue)})`,
        );
        break;
      case 'ffill':
        lines.push(`${output}[${col}] = ${grouped}.transform(lambda s: s.ffill())`);
        break;
      case 'bfill':
        lines.push(`${output}[${col}] = ${grouped}.transform(lambda s: s.bfill())`);
        break;
    }
    return lines;
  }

  switch (strategy) {
    case 'mean':
      lines.push(`${output}[${col}] = ${input}[${col}].fillna(${input}[${col}].mean())`);
      break;
    case 'median':
      lines.push(`${output}[${col}] = ${input}[${col}].fillna(${input}[${col}].median())`);
      break;
    case 'mode': {
      const modeVar = `${output}_mode_${column.replace(/\W+/g, '_')}`;
      lines.push(`${modeVar} = ${input}[${col}].mode()`);
      lines.push(
        `${output}[${col}] = ${input}[${col}].fillna(${modeVar}.iloc[0] if len(${modeVar}) > 0 else np.nan)`,
      );
      break;
    }
    case 'constant':
      lines.push(
        `${output}[${col}] = ${input}[${col}].fillna(${constantLiteral(constantValue)})`,
      );
      break;
    case 'ffill':
      lines.push(`${output}[${col}] = ${input}[${col}].ffill()`);
      break;
    case 'bfill':
      lines.push(`${output}[${col}] = ${input}[${col}].bfill()`);
      break;
  }

  return lines;
}

export const impute = {
  type: 'impute' as NodeType,
  label: 'Impute',
  category: 'transform',
  paletteGroup: 'missing',
  paletteOrder: 3,
  exportVarSlug: 'imputed',
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return {
      columns: [] as string[],
      strategy: 'mean' as ImputeStrategy,
      constantValue: 0,
      groupBy: [] as string[],
    };
  },

  validate(config, inputSchemas) {
    const errors = [];
    const columns = parseStringArray(config.columns);
    const groupBy = parseStringArray(config.groupBy);
    const upstream = inputSchemas[0] ?? [];
    const strategy = parseStrategy(config);

    if (columns.length === 0) {
      errors.push({ field: 'columns', message: 'Select at least one column to impute' });
    }

    errors.push(...validateColumnsExist(columns, upstream, 'columns'));
    errors.push(...validateColumnsExist(groupBy, upstream, 'groupBy'));

    if (NUMERIC_STRATEGIES.has(strategy)) {
      for (const column of columns) {
        const schema = upstream.find((c) => c.name === column);
        if (schema && !isNumericColumn(schema)) {
          errors.push({
            field: 'columns',
            message: `Strategy "${strategy}" requires numeric column "${column}"`,
          });
        }
      }
    }

    if (strategy === 'constant') {
      const value = config.constantValue;
      if (value === undefined || value === null || value === '') {
        errors.push({ field: 'constantValue', message: 'Constant value is required' });
      }
    }

    return errors;
  },

  compile(config, inputVars, outputVar, _params?, _context?) {
    void _params;
    void _context;
    const input = inputVars[0];
    const columns = parseStringArray(config.columns);
    const groupBy = parseStringArray(config.groupBy);
    const strategy = parseStrategy(config);
    const constantValue = parseConstantValue(config);

    const lines = [`${outputVar} = ${input}.copy()`];
    for (const column of columns) {
      lines.push(
        ...compileColumnImpute(input, outputVar, column, strategy, constantValue, groupBy),
      );
    }
    return lines.join('\n');
  },

  inspectorSchema() {
    return [
      { kind: 'columns', key: 'columns', label: 'Columns' },
      {
        kind: 'select',
        key: 'strategy',
        label: 'Strategy',
        options: ['mean', 'median', 'mode', 'constant', 'ffill', 'bfill'],
      },
      { kind: 'text', key: 'constantValue', label: 'Constant value' },
      { kind: 'columns', key: 'groupBy', label: 'Group by (optional)' },
    ];
  },

  configSummary(config) {
    const columns = parseStringArray(config.columns);
    const strategy = parseStrategy(config);
    const groupBy = parseStringArray(config.groupBy);
    if (columns.length === 0) return 'No columns';
    const label =
      columns.length > 2 ? `${columns.slice(0, 2).join(', ')}…` : columns.join(', ');
    const grouped = groupBy.length > 0 ? ` by ${groupBy.join(', ')}` : '';
    return `${strategy} ${label}${grouped}`;
  },
} satisfies ImputeNode;
