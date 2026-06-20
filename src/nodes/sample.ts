import type { NodeType } from '@/lib/types';

import type { NodeDefinition } from './types';

type SampleMode = 'n' | 'frac';

type SampleNode = NodeDefinition & {
  paletteGroup: 'row';
  paletteOrder: number;
  exportVarSlug: string;
};

function parseMode(config: Record<string, unknown>): SampleMode {
  return config.mode === 'frac' ? 'frac' : 'n';
}

function parseRandomState(config: Record<string, unknown>): number | undefined {
  if (typeof config.randomState === 'number' && Number.isFinite(config.randomState)) {
    return Math.trunc(config.randomState);
  }
  return undefined;
}

function parseReplace(config: Record<string, unknown>): boolean {
  return config.replace === true;
}

export const sample = {
  type: 'sample' as NodeType,
  label: 'Sample',
  category: 'transform',
  paletteGroup: 'row',
  paletteOrder: 2,
  exportVarSlug: 'sampled',
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return {
      mode: 'n' as SampleMode,
      n: 100,
      frac: 0.1,
      randomState: undefined as number | undefined,
      replace: false,
    };
  },

  validate(config, _inputSchemas) {
    void _inputSchemas;

    const errors = [];
    const mode = parseMode(config);

    if (mode === 'n') {
      const n = config.n;
      if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) {
        errors.push({ field: 'n', message: 'Sample size n must be a positive number' });
      }
    } else {
      const frac = config.frac;
      if (typeof frac !== 'number' || !Number.isFinite(frac) || frac <= 0 || frac > 1) {
        errors.push({ field: 'frac', message: 'Fraction must be between 0 and 1' });
      }
    }

    const randomState = config.randomState;
    if (randomState !== undefined && randomState !== null && randomState !== '') {
      if (typeof randomState !== 'number' || !Number.isFinite(randomState)) {
        errors.push({ field: 'randomState', message: 'Random seed must be a number' });
      }
    }

    return errors;
  },

  compile(config, inputVars, outputVar, _params?, _context?) {
    void _params;
    void _context;
    const input = inputVars[0];
    const mode = parseMode(config);
    const replace = parseReplace(config);
    const randomState = parseRandomState(config);
    const parts = [`replace=${replace ? 'True' : 'False'}`];

    if (mode === 'frac') {
      const frac = typeof config.frac === 'number' ? config.frac : 0.1;
      parts.unshift(`frac=${frac}`);
    } else {
      const n = typeof config.n === 'number' ? Math.trunc(config.n) : 100;
      parts.unshift(`n=${n}`);
    }

    if (randomState !== undefined) {
      parts.push(`random_state=${randomState}`);
    }

    return `${outputVar} = ${input}.sample(${parts.join(', ')})`;
  },

  inspectorSchema() {
    return [
      { kind: 'select', key: 'mode', label: 'Mode', options: ['n', 'frac'] },
      { kind: 'number', key: 'n', label: 'Sample size (n)' },
      { kind: 'number', key: 'frac', label: 'Fraction (0–1)' },
      { kind: 'number', key: 'randomState', label: 'Random seed (optional)' },
      { kind: 'select', key: 'replace', label: 'Replace', options: ['false', 'true'] },
    ];
  },

  configSummary(config) {
    const mode = parseMode(config);
    const replace = parseReplace(config) ? ', replace' : '';
    if (mode === 'frac') {
      const frac = typeof config.frac === 'number' ? config.frac : 0.1;
      return `${frac * 100}%${replace}`;
    }
    const n = typeof config.n === 'number' ? config.n : 100;
    return `${n} rows${replace}`;
  },
} satisfies SampleNode;
