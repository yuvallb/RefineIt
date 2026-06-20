import type { NodeType } from '@/lib/types';

import type { NodeDefinition } from './types';

type LimitMode = 'head' | 'tail' | 'slice';

type LimitNode = NodeDefinition & {
  paletteGroup: 'row';
  paletteOrder: number;
  exportVarSlug: string;
};

function parseMode(config: Record<string, unknown>): LimitMode {
  if (config.mode === 'tail' || config.mode === 'slice') return config.mode;
  return 'head';
}

function parseN(config: Record<string, unknown>): number {
  if (typeof config.n === 'number' && Number.isFinite(config.n)) {
    return Math.trunc(config.n);
  }
  return 10;
}

function parseSliceBound(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  return fallback;
}

export const limit = {
  type: 'limit' as NodeType,
  label: 'Limit',
  category: 'transform',
  paletteGroup: 'row',
  paletteOrder: 5,
  exportVarSlug: 'limited',
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return {
      mode: 'head' as LimitMode,
      n: 10,
      start: 0,
      stop: 10,
    };
  },

  validate(config, _inputSchemas) {
    void _inputSchemas;

    const errors = [];
    const mode = parseMode(config);

    if (mode === 'head' || mode === 'tail') {
      const n = config.n;
      if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) {
        errors.push({ field: 'n', message: 'Row count must be zero or positive' });
      }
    } else {
      const start = config.start;
      const stop = config.stop;
      if (start !== undefined && (typeof start !== 'number' || !Number.isFinite(start))) {
        errors.push({ field: 'start', message: 'Slice start must be a number' });
      }
      if (stop !== undefined && (typeof stop !== 'number' || !Number.isFinite(stop))) {
        errors.push({ field: 'stop', message: 'Slice stop must be a number' });
      }
      const startVal = parseSliceBound(config.start, 0);
      const stopVal = parseSliceBound(config.stop, 10);
      if (startVal < 0) {
        errors.push({ field: 'start', message: 'Slice start must be zero or positive' });
      }
      if (stopVal < startVal) {
        errors.push({ field: 'stop', message: 'Slice stop must be greater than or equal to start' });
      }
    }

    return errors;
  },

  compile(config, inputVars, outputVar, _params?, _context?) {
    void _params;
    void _context;
    const input = inputVars[0];
    const mode = parseMode(config);

    if (mode === 'tail') {
      const n = parseN(config);
      return `${outputVar} = ${input}.tail(${n})`;
    }

    if (mode === 'slice') {
      const start = parseSliceBound(config.start, 0);
      const stop = parseSliceBound(config.stop, 10);
      return `${outputVar} = ${input}.iloc[${start}:${stop}]`;
    }

    const n = parseN(config);
    return `${outputVar} = ${input}.head(${n})`;
  },

  inspectorSchema() {
    return [
      { kind: 'select', key: 'mode', label: 'Mode', options: ['head', 'tail', 'slice'] },
      { kind: 'number', key: 'n', label: 'Row count' },
      { kind: 'number', key: 'start', label: 'Slice start' },
      { kind: 'number', key: 'stop', label: 'Slice stop' },
    ];
  },

  configSummary(config) {
    const mode = parseMode(config);
    if (mode === 'tail') return `Tail ${parseN(config)}`;
    if (mode === 'slice') {
      const start = parseSliceBound(config.start, 0);
      const stop = parseSliceBound(config.stop, 10);
      return `Slice ${start}:${stop}`;
    }
    return `Head ${parseN(config)}`;
  },
} satisfies LimitNode;
