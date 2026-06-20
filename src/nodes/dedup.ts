import type { NodeType } from '@/lib/types';

import { parseStringArray, validateColumnsExist } from './column-utils';
import type { NodeDefinition } from './types';

type DedupKeep = 'first' | 'last' | false;

type DedupNode = NodeDefinition & {
  paletteGroup: 'row';
  paletteOrder: number;
  exportVarSlug: string;
};

function parseKeep(config: Record<string, unknown>): DedupKeep {
  if (config.keep === 'last') return 'last';
  if (config.keep === false || config.keep === 'false') return false;
  return 'first';
}

function keepLiteral(keep: DedupKeep): string {
  if (keep === false) return 'False';
  return JSON.stringify(keep);
}

export const dedup = {
  type: 'dedup' as NodeType,
  label: 'Deduplicate',
  category: 'transform',
  paletteGroup: 'row',
  paletteOrder: 4,
  exportVarSlug: 'deduped',
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return {
      subset: [] as string[],
      keep: 'first' as 'first' | 'last' | false,
    };
  },

  validate(config, inputSchemas) {
    const subset = parseStringArray(config.subset);
    const upstream = inputSchemas[0] ?? [];
    return validateColumnsExist(subset, upstream, 'subset');
  },

  compile(config, inputVars, outputVar, _params?, _context?) {
    void _params;
    void _context;
    const input = inputVars[0];
    const subset = parseStringArray(config.subset);
    const keep = parseKeep(config);
    const parts = [`keep=${keepLiteral(keep)}`];

    if (subset.length > 0) {
      const colList = subset.map((c) => JSON.stringify(c)).join(', ');
      parts.unshift(`subset=[${colList}]`);
    }

    return `${outputVar} = ${input}.drop_duplicates(${parts.join(', ')})`;
  },

  inspectorSchema() {
    return [
      { kind: 'columns', key: 'subset', label: 'Subset (optional)' },
      { kind: 'select', key: 'keep', label: 'Keep', options: ['first', 'last', 'false'] },
    ];
  },

  configSummary(config) {
    const subset = parseStringArray(config.subset);
    const keep = parseKeep(config);
    const keepLabel = keep === false ? 'none' : keep;
    if (subset.length === 0) return `Drop duplicates (${keepLabel})`;
    const label =
      subset.length > 2 ? `${subset.slice(0, 2).join(', ')}…` : subset.join(', ');
    return `${label} (${keepLabel})`;
  },
} satisfies DedupNode;
