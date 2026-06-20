import { parseStringArray, validateColumnsExist } from './column-utils';
import { nodeType, type PaletteNodeDefinition } from './node-type';

type WindowMode = 'rolling' | 'expanding';
type WindowAgg = 'mean' | 'sum' | 'min' | 'max' | 'count';

const AGGS: WindowAgg[] = ['mean', 'sum', 'min', 'max', 'count'];

function parseMode(config: Record<string, unknown>): WindowMode {
  return config.mode === 'expanding' ? 'expanding' : 'rolling';
}

function parseAgg(config: Record<string, unknown>): WindowAgg {
  return AGGS.includes(config.agg as WindowAgg) ? (config.agg as WindowAgg) : 'mean';
}

function parseWindow(config: Record<string, unknown>): number {
  return typeof config.window === 'number' && config.window >= 1 ? Math.floor(config.window) : 3;
}

function parseGroupBy(config: Record<string, unknown>): string[] {
  return parseStringArray(config.groupBy);
}

function outputColumn(column: string, agg: WindowAgg, mode: WindowMode): string {
  return `${column}_${agg}_${mode}`;
}

function compileTransform(_column: string, agg: WindowAgg, mode: WindowMode, window: number): string {
  if (mode === 'expanding') {
    if (agg === 'count') {
      return `lambda s: s.expanding(min_periods=1).count()`;
    }
    return `lambda s: s.expanding(min_periods=1).${agg}()`;
  }
  if (agg === 'count') {
    return `lambda s: s.rolling(${window}, min_periods=1).count()`;
  }
  return `lambda s: s.rolling(${window}, min_periods=1).${agg}()`;
}

export const windowRolling: PaletteNodeDefinition = {
  type: nodeType('window.rolling'),
  label: 'Rolling / Expanding',
  category: 'transform',
  paletteGroup: 'window',
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return {
      mode: 'rolling' as WindowMode,
      column: '',
      window: 3,
      agg: 'mean' as WindowAgg,
      groupBy: [] as string[],
    };
  },

  validate(config, inputSchemas) {
    const errors = [];
    const column = typeof config.column === 'string' ? config.column.trim() : '';
    const groupBy = parseGroupBy(config);
    const upstream = inputSchemas[0] ?? [];

    if (!column) {
      errors.push({ field: 'column', message: 'Select a column' });
    } else {
      errors.push(...validateColumnsExist([column], upstream, 'column'));
    }

    errors.push(...validateColumnsExist(groupBy, upstream, 'groupBy'));

    const window = config.window;
    if (window !== undefined && (typeof window !== 'number' || window < 1)) {
      errors.push({ field: 'window', message: 'Window size must be at least 1' });
    }

    return errors;
  },

  compile(config, inputVars, outputVar, _params?, _context?) {
    void _params;
    void _context;
    const column = typeof config.column === 'string' ? config.column.trim() : '';
    const input = inputVars[0];
    const mode = parseMode(config);
    const agg = parseAgg(config);
    const window = parseWindow(config);
    const groupBy = parseGroupBy(config);
    const outCol = JSON.stringify(outputColumn(column, agg, mode));
    const transform = compileTransform(column, agg, mode, window);
    const colRef = JSON.stringify(column);

    if (groupBy.length > 0) {
      const groupList = groupBy.map((c) => JSON.stringify(c)).join(', ');
      return [
        `${outputVar} = ${input}.copy()`,
        `${outputVar}[${outCol}] = ${input}.groupby([${groupList}])[${colRef}].transform(${transform})`,
      ].join('\n');
    }

    return [
      `${outputVar} = ${input}.copy()`,
      `${outputVar}[${outCol}] = ${input}[${colRef}].transform(${transform})`,
    ].join('\n');
  },

  inspectorSchema() {
    return [
      { kind: 'select', key: 'mode', label: 'Mode', options: ['rolling', 'expanding'] },
      { kind: 'column', key: 'column', label: 'Column' },
      { kind: 'number', key: 'window', label: 'Window size' },
      { kind: 'select', key: 'agg', label: 'Aggregation', options: ['mean', 'sum', 'min', 'max', 'count'] },
      { kind: 'columns', key: 'groupBy', label: 'Partition by (optional)' },
    ];
  },

  configSummary(config) {
    const column = typeof config.column === 'string' ? config.column : '';
    const mode = parseMode(config);
    const agg = parseAgg(config);
    if (!column) return 'No column';
    return `${agg}(${column}) · ${mode}`;
  },
};
