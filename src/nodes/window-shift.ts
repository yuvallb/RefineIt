import { parseStringArray, validateColumnsExist } from './column-utils';
import { nodeType, type PaletteNodeDefinition } from './node-type';

function parsePeriods(config: Record<string, unknown>): number {
  return typeof config.periods === 'number' ? Math.trunc(config.periods) : -1;
}

function parsePartitionBy(config: Record<string, unknown>): string[] {
  return parseStringArray(config.partitionBy);
}

function parseOrderBy(config: Record<string, unknown>): string[] {
  return parseStringArray(config.orderBy);
}

function outputColumn(column: string, periods: number): string {
  const suffix = periods < 0 ? `lag_${Math.abs(periods)}` : periods > 0 ? `lead_${periods}` : 'shift_0';
  return `${column}_${suffix}`;
}

export const windowShift: PaletteNodeDefinition = {
  type: nodeType('window.shift'),
  label: 'Lag / Lead',
  category: 'transform',
  paletteGroup: 'window',
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return {
      column: '',
      periods: -1,
      partitionBy: [] as string[],
      orderBy: [] as string[],
    };
  },

  validate(config, inputSchemas) {
    const errors = [];
    const column = typeof config.column === 'string' ? config.column.trim() : '';
    const partitionBy = parsePartitionBy(config);
    const orderBy = parseOrderBy(config);
    const upstream = inputSchemas[0] ?? [];

    if (!column) {
      errors.push({ field: 'column', message: 'Select a column' });
    } else {
      errors.push(...validateColumnsExist([column], upstream, 'column'));
    }

    errors.push(...validateColumnsExist(partitionBy, upstream, 'partitionBy'));
    errors.push(...validateColumnsExist(orderBy, upstream, 'orderBy'));

    if (typeof config.periods !== 'number') {
      errors.push({ field: 'periods', message: 'Periods must be a number (negative = lag, positive = lead)' });
    }

    return errors;
  },

  compile(config, inputVars, outputVar, _params?, _context?) {
    void _params;
    void _context;
    const column = typeof config.column === 'string' ? config.column.trim() : '';
    const input = inputVars[0];
    const periods = parsePeriods(config);
    const partitionBy = parsePartitionBy(config);
    const orderBy = parseOrderBy(config);
    const outCol = JSON.stringify(outputColumn(column, periods));
    const colRef = JSON.stringify(column);

    const lines = [`${outputVar} = ${input}.copy()`];
    const sorted =
      orderBy.length > 0
        ? `_sorted = ${input}.sort_values([${orderBy.map((c) => JSON.stringify(c)).join(', ')}])`
        : `_sorted = ${input}`;
    lines.push(sorted);

    if (partitionBy.length > 0) {
      const groupList = partitionBy.map((c) => JSON.stringify(c)).join(', ');
      lines.push(
        `_shifted = _sorted.groupby([${groupList}])[${colRef}].shift(${periods})`,
        `${outputVar}[${outCol}] = _shifted.reindex(${input}.index)`,
      );
    } else {
      lines.push(
        `_shifted = _sorted[${colRef}].shift(${periods})`,
        `${outputVar}[${outCol}] = _shifted.reindex(${input}.index)`,
      );
    }

    return lines.join('\n');
  },

  inspectorSchema() {
    return [
      { kind: 'column', key: 'column', label: 'Column' },
      { kind: 'number', key: 'periods', label: 'Periods (negative = lag)' },
      { kind: 'columns', key: 'partitionBy', label: 'Partition by (optional)' },
      { kind: 'columns', key: 'orderBy', label: 'Order by (optional)' },
    ];
  },

  configSummary(config) {
    const column = typeof config.column === 'string' ? config.column : '';
    const periods = parsePeriods(config);
    if (!column) return 'No column';
    return periods < 0 ? `${column} lag ${Math.abs(periods)}` : `${column} lead ${periods}`;
  },
};
