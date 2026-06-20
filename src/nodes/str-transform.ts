import type { NodeType } from '@/lib/types';

import { validateColumnsExist } from './column-utils';
import type { NodeDefinition } from './types';

type StrOp =
  | 'strip'
  | 'lower'
  | 'upper'
  | 'title'
  | 'replace'
  | 'removeprefix'
  | 'removesuffix'
  | 'zfill';

interface StrOperation {
  op: StrOp;
  args?: Record<string, unknown>;
}

const ALLOWED_OPS = new Set<StrOp>([
  'strip',
  'lower',
  'upper',
  'title',
  'replace',
  'removeprefix',
  'removesuffix',
  'zfill',
]);

function parseOperations(config: Record<string, unknown>): StrOperation[] {
  if (!Array.isArray(config.operations)) return [];
  return config.operations.filter((item): item is StrOperation => {
    if (typeof item !== 'object' || item === null) return false;
    const op = (item as StrOperation).op;
    return typeof op === 'string' && ALLOWED_OPS.has(op as StrOp);
  });
}

function compileStrChain(input: string, column: string, operations: StrOperation[]): string {
  let expr = `${input}[${JSON.stringify(column)}].astype(str)`;
  for (const { op, args } of operations) {
    switch (op) {
      case 'strip':
        expr += '.str.strip()';
        break;
      case 'lower':
        expr += '.str.lower()';
        break;
      case 'upper':
        expr += '.str.upper()';
        break;
      case 'title':
        expr += '.str.title()';
        break;
      case 'replace':
        expr += `.str.replace(${JSON.stringify(String(args?.old ?? ''))}, ${JSON.stringify(String(args?.new ?? ''))}, regex=False)`;
        break;
      case 'removeprefix':
        expr += `.str.removeprefix(${JSON.stringify(String(args?.prefix ?? ''))})`;
        break;
      case 'removesuffix':
        expr += `.str.removesuffix(${JSON.stringify(String(args?.suffix ?? ''))})`;
        break;
      case 'zfill':
        expr += `.str.zfill(${typeof args?.width === 'number' ? args.width : 0})`;
        break;
    }
  }
  return expr;
}

export const strTransform: NodeDefinition = {
  type: 'str.transform' as NodeType,
  label: 'String Operations',
  category: 'transform',
  paletteGroup: 'text',
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return {
      column: '',
      operations: [{ op: 'strip', args: {} }] as StrOperation[],
    };
  },

  validate(config, inputSchemas) {
    const errors = [];
    const column = typeof config.column === 'string' ? config.column.trim() : '';
    const operations = parseOperations(config);
    const upstream = inputSchemas[0] ?? [];

    if (!column) {
      errors.push({ field: 'column', message: 'Column is required' });
    } else {
      errors.push(...validateColumnsExist([column], upstream, 'column'));
    }

    if (operations.length === 0) {
      errors.push({ field: 'operations', message: 'Add at least one operation' });
    }

    for (const { op, args } of operations) {
      if (op === 'replace') {
        if (typeof args?.old !== 'string' || args.old.length === 0) {
          errors.push({ field: 'operations', message: 'Replace operation requires "old" text' });
        }
      }
      if (op === 'removeprefix' && typeof args?.prefix !== 'string') {
        errors.push({ field: 'operations', message: 'Remove prefix requires "prefix" text' });
      }
      if (op === 'removesuffix' && typeof args?.suffix !== 'string') {
        errors.push({ field: 'operations', message: 'Remove suffix requires "suffix" text' });
      }
      if (op === 'zfill' && typeof args?.width !== 'number') {
        errors.push({ field: 'operations', message: 'Zero-fill requires numeric "width"' });
      }
    }

    return errors;
  },

  compile(config, inputVars, outputVar, _params?, _context?) {
    void _params;
    void _context;
    const column = typeof config.column === 'string' ? config.column.trim() : '';
    const operations = parseOperations(config);
    const input = inputVars[0];
    const chain = compileStrChain(input, column, operations);
    return `${outputVar} = ${input}.assign(**{${JSON.stringify(column)}: ${chain}})`;
  },

  inspectorSchema() {
    return [
      { kind: 'column', key: 'column', label: 'Column' },
      { kind: 'operations', key: 'operations', label: 'Operations' },
    ];
  },

  configSummary(config) {
    const column = typeof config.column === 'string' ? config.column : '';
    const operations = parseOperations(config);
    if (!column) return 'No column';
    if (operations.length === 0) return column;
    return `${column}: ${operations.map((o) => o.op).join(' → ')}`;
  },
};
