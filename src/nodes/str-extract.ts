import type { NodeType } from '@/lib/types';

import { validateColumnsExist } from './column-utils';
import type { NodeDefinition } from './types';

interface ExtractPattern {
  name: string;
  regex: string;
  group?: number;
}

const MAX_REGEX_LENGTH = 500;

const PRESET_REGEX: Record<string, string> = {
  email: String.raw`[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}`,
  'zip-us': String.raw`\b\d{5}(?:-\d{4})?\b`,
  domain: String.raw`(?:https?://)?(?:www\.)?([A-Za-z0-9-]+\.[A-Za-z]{2,})`,
  phone: String.raw`\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b`,
};

function parsePatterns(config: Record<string, unknown>): ExtractPattern[] {
  if (!Array.isArray(config.patterns)) return [];
  return config.patterns.filter((item): item is ExtractPattern => {
    if (typeof item !== 'object' || item === null) return false;
    const { name, regex } = item as ExtractPattern;
    return typeof name === 'string' && name.length > 0 && typeof regex === 'string' && regex.length > 0;
  });
}

function isRegexSafe(regex: string): boolean {
  if (regex.length > MAX_REGEX_LENGTH) return false;
  if (/\([^)]*[+*][^)]*\)[+*]/.test(regex)) return false;
  return true;
}

function isValidCaptureName(name: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name) && name.length <= 32;
}

function buildNamedRegex(pattern: ExtractPattern): string {
  return `(?P<${pattern.name}>${pattern.regex})`;
}

export const strExtract: NodeDefinition = {
  type: 'str.extract' as NodeType,
  label: 'Extract Patterns',
  category: 'transform',
  paletteGroup: 'text',
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return {
      column: '',
      patterns: [{ name: 'match', regex: PRESET_REGEX.email }] as ExtractPattern[],
    };
  },

  validate(config, inputSchemas) {
    const errors = [];
    const column = typeof config.column === 'string' ? config.column.trim() : '';
    const patterns = parsePatterns(config);
    const upstream = inputSchemas[0] ?? [];
    const names = new Set<string>();

    if (!column) {
      errors.push({ field: 'column', message: 'Column is required' });
    } else {
      errors.push(...validateColumnsExist([column], upstream, 'column'));
    }

    if (patterns.length === 0) {
      errors.push({ field: 'patterns', message: 'Add at least one pattern' });
    }

    for (const pattern of patterns) {
      if (!isValidCaptureName(pattern.name)) {
        errors.push({
          field: 'patterns',
          message: `Invalid output name "${pattern.name}" — use letters, numbers, underscore`,
        });
      }
      if (names.has(pattern.name)) {
        errors.push({
          field: 'patterns',
          message: `Duplicate output name "${pattern.name}"`,
        });
      }
      names.add(pattern.name);

      if (!isRegexSafe(pattern.regex)) {
        errors.push({
          field: 'patterns',
          message: `Pattern "${pattern.name}" has an unsafe or overly long regex`,
        });
      }
    }

    return errors;
  },

  compile(config, inputVars, outputVar, _params?, _context?) {
    void _params;
    void _context;
    const column = typeof config.column === 'string' ? config.column.trim() : '';
    const patterns = parsePatterns(config);
    const input = inputVars[0];
    const colExpr = `${input}[${JSON.stringify(column)}]`;

    if (patterns.length === 1) {
      const pattern = patterns[0];
      const regex = buildNamedRegex(pattern);
      return `${outputVar} = ${input}.assign(${JSON.stringify(pattern.name)}: ${colExpr}.str.extract(${JSON.stringify(regex)}, expand=False))`;
    }

    const assignEntries = patterns
      .map((p) => {
        const regex = buildNamedRegex(p);
        return `${JSON.stringify(p.name)}: ${colExpr}.str.extract(${JSON.stringify(regex)}, expand=False)`;
      })
      .join(', ');

    return `${outputVar} = ${input}.assign(${assignEntries})`;
  },

  inspectorSchema() {
    return [
      { kind: 'column', key: 'column', label: 'Column' },
      { kind: 'patterns', key: 'patterns', label: 'Patterns' },
    ];
  },

  configSummary(config) {
    const column = typeof config.column === 'string' ? config.column : '';
    const patterns = parsePatterns(config);
    if (!column) return 'No column';
    if (patterns.length === 0) return column;
    return `${column} → ${patterns.map((p) => p.name).join(', ')}`;
  },
};

export { PRESET_REGEX };
