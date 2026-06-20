import { parseStringArray, validateColumnsExist } from './column-utils';
import { nodeType, type PaletteNodeDefinition } from './node-type';

type RankMode = 'rank' | 'row_number';

const RANK_METHODS = ['average', 'min', 'max', 'first', 'dense'] as const;
type RankMethod = (typeof RANK_METHODS)[number];

function parseMode(config: Record<string, unknown>): RankMode {
  return config.mode === 'row_number' ? 'row_number' : 'rank';
}

function parseMethod(config: Record<string, unknown>): RankMethod {
  return RANK_METHODS.includes(config.method as RankMethod)
    ? (config.method as RankMethod)
    : 'average';
}

function parseAscending(config: Record<string, unknown>): boolean {
  return config.ascending !== false;
}

function parsePartitionBy(config: Record<string, unknown>): string[] {
  return parseStringArray(config.partitionBy);
}

function parseOrderBy(config: Record<string, unknown>): string[] {
  return parseStringArray(config.orderBy);
}

function outputColumn(mode: RankMode, orderBy: string[]): string {
  if (mode === 'row_number') return 'row_number';
  if (orderBy.length > 0) return `${orderBy[0]}_rank`;
  return 'rank';
}

export const windowRank: PaletteNodeDefinition = {
  type: nodeType('window.rank'),
  label: 'Rank / Row Number',
  category: 'transform',
  paletteGroup: 'window',
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return {
      mode: 'rank' as RankMode,
      method: 'average' as RankMethod,
      ascending: true,
      partitionBy: [] as string[],
      orderBy: [] as string[],
    };
  },

  validate(config, inputSchemas) {
    const errors = [];
    const partitionBy = parsePartitionBy(config);
    const orderBy = parseOrderBy(config);
    const upstream = inputSchemas[0] ?? [];

    if (parseMode(config) === 'rank' && orderBy.length === 0) {
      errors.push({ field: 'orderBy', message: 'Select at least one order column for rank mode' });
    }

    errors.push(...validateColumnsExist(partitionBy, upstream, 'partitionBy'));
    errors.push(...validateColumnsExist(orderBy, upstream, 'orderBy'));
    return errors;
  },

  compile(config, inputVars, outputVar, _params?, _context?) {
    void _params;
    void _context;
    const input = inputVars[0];
    const mode = parseMode(config);
    const partitionBy = parsePartitionBy(config);
    const orderBy = parseOrderBy(config);
    const ascending = parseAscending(config);
    const outCol = JSON.stringify(outputColumn(mode, orderBy));
    const lines = [`${outputVar} = ${input}.copy()`];

    const sorted =
      orderBy.length > 0
        ? `_sorted = ${input}.sort_values([${orderBy.map((c) => JSON.stringify(c)).join(', ')}])`
        : `_sorted = ${input}`;

    lines.push(sorted);

    if (mode === 'row_number') {
      if (partitionBy.length > 0) {
        const groupList = partitionBy.map((c) => JSON.stringify(c)).join(', ');
        lines.push(
          `${outputVar}[${outCol}] = _sorted.groupby([${groupList}]).cumcount() + 1`,
        );
      } else {
        lines.push(`${outputVar}[${outCol}] = _sorted.cumcount() + 1`);
      }
      return lines.join('\n');
    }

    const rankCol = JSON.stringify(orderBy[0] ?? '');
    const method = parseMethod(config);
    if (partitionBy.length > 0) {
      const groupList = partitionBy.map((c) => JSON.stringify(c)).join(', ');
      lines.push(
        `${outputVar}[${outCol}] = _sorted.groupby([${groupList}])[${rankCol}].rank(method=${JSON.stringify(method)}, ascending=${ascending ? 'True' : 'False'})`,
      );
    } else {
      lines.push(
        `${outputVar}[${outCol}] = _sorted[${rankCol}].rank(method=${JSON.stringify(method)}, ascending=${ascending ? 'True' : 'False'})`,
      );
    }

    return lines.join('\n');
  },

  inspectorSchema() {
    return [
      { kind: 'select', key: 'mode', label: 'Mode', options: ['rank', 'row_number'] },
      { kind: 'select', key: 'method', label: 'Rank method', options: [...RANK_METHODS] },
      { kind: 'select', key: 'ascending', label: 'Ascending', options: ['true', 'false'] },
      { kind: 'columns', key: 'partitionBy', label: 'Partition by (optional)' },
      { kind: 'columns', key: 'orderBy', label: 'Order by' },
    ];
  },

  configSummary(config) {
    const mode = parseMode(config);
    const orderBy = parseOrderBy(config);
    if (mode === 'row_number') return 'Row number';
    return orderBy.length > 0 ? `Rank by ${orderBy.join(', ')}` : 'Rank';
  },
};
