import { parseStringArray, validateColumnsExist } from './column-utils';
import { ANONYMIZE_REGEX_PRESETS, llmMethodError } from './ai-utils';
import { nodeType, type PaletteNodeDefinition } from './node-type';
import type { CompileContext } from './types';

type AnonymizeMethod = 'mask' | 'hash' | 'regex' | 'llm_rewrite';
type RegexPreset = 'email' | 'phone' | 'ssn' | 'credit_card' | 'custom';

const MAX_REGEX_LENGTH = 500;

function parseMethod(config: Record<string, unknown>): AnonymizeMethod {
  const method = config.method;
  if (method === 'hash' || method === 'regex' || method === 'llm_rewrite') return method;
  return 'mask';
}

function parsePreserveFormat(config: Record<string, unknown>): boolean {
  return config.preserveFormat === true || config.preserveFormat === 'true';
}

function parseRegexPreset(config: Record<string, unknown>): RegexPreset {
  const preset = config.regexPreset;
  if (preset === 'phone' || preset === 'ssn' || preset === 'credit_card' || preset === 'custom') {
    return preset;
  }
  return 'email';
}

function resolveRegexPattern(config: Record<string, unknown>): string {
  const preset = parseRegexPreset(config);
  if (preset === 'custom') {
    return typeof config.pattern === 'string' ? config.pattern.trim() : '';
  }
  return ANONYMIZE_REGEX_PRESETS[preset] ?? ANONYMIZE_REGEX_PRESETS.email;
}

function isRegexSafe(regex: string): boolean {
  if (regex.length > MAX_REGEX_LENGTH) return false;
  if (/\([^)]*[+*][^)]*\)[+*]/.test(regex)) return false;
  return true;
}

function resolveSalt(
  params: Record<string, unknown>,
  context?: CompileContext,
): string {
  if (context?.mode === 'export') {
    return 'YOUR_SESSION_SALT';
  }
  const salt = params._anonymizeSalt;
  return typeof salt === 'string' && salt.length > 0 ? salt : 'session-salt';
}

export const aiAnonymize: PaletteNodeDefinition = {
  type: nodeType('ai.anonymize'),
  label: 'Anonymize',
  category: 'transform',
  paletteGroup: 'ai',
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return {
      columns: [] as string[],
      method: 'mask' as AnonymizeMethod,
      preserveFormat: false,
      regexPreset: 'email' as RegexPreset,
      pattern: '',
      replacement: '[REDACTED]',
    };
  },

  validate(config, inputSchemas) {
    const method = parseMethod(config);
    if (method === 'llm_rewrite') {
      return llmMethodError();
    }

    const errors = [];
    const columns = parseStringArray(config.columns);
    const upstream = inputSchemas[0] ?? [];

    if (columns.length === 0) {
      errors.push({ field: 'columns', message: 'Select at least one column' });
    }

    errors.push(...validateColumnsExist(columns, upstream, 'columns'));

    if (method === 'regex') {
      const pattern = resolveRegexPattern(config);
      if (!pattern) {
        errors.push({ field: 'pattern', message: 'Regex pattern is required' });
      } else if (!isRegexSafe(pattern)) {
        errors.push({ field: 'pattern', message: 'Unsafe or overly long regex pattern' });
      }
    }

    return errors;
  },

  compile(config, inputVars, outputVar, params, context) {
    const method = parseMethod(config);
    const columns = parseStringArray(config.columns);
    const input = inputVars[0];
    const preserveFormat = parsePreserveFormat(config);
    const lines = [`${outputVar} = ${input}.copy()`];

    for (const column of columns) {
      const col = JSON.stringify(column);
      const series = `${outputVar}[${col}]`;

      if (method === 'mask') {
        lines.push(
          `${series} = ${series}.map(lambda v: anonymize_mask(v, preserve_length=${preserveFormat ? 'True' : 'False'}))`,
        );
      } else if (method === 'hash') {
        const salt = JSON.stringify(resolveSalt(params, context));
        lines.push(`${series} = ${series}.map(lambda v: anonymize_hash(v, ${salt}))`);
      } else if (method === 'regex') {
        const pattern = resolveRegexPattern(config);
        const replacement =
          typeof config.replacement === 'string' && config.replacement.length > 0
            ? config.replacement
            : '[REDACTED]';
        lines.push(
          `${series} = ${series}.astype(str).str.replace(${JSON.stringify(pattern)}, ${JSON.stringify(replacement)}, regex=True)`,
        );
      }
    }

    return lines.join('\n');
  },

  inspectorSchema() {
    return [
      { kind: 'columns', key: 'columns', label: 'Columns' },
      {
        kind: 'select',
        key: 'method',
        label: 'Method',
        options: ['mask', 'hash', 'regex', 'llm_rewrite'],
      },
      { kind: 'select', key: 'preserveFormat', label: 'Preserve format (mask)', options: ['false', 'true'] },
      {
        kind: 'select',
        key: 'regexPreset',
        label: 'Regex preset',
        options: ['email', 'phone', 'ssn', 'credit_card', 'custom'],
      },
      { kind: 'text', key: 'pattern', label: 'Custom regex (when preset = custom)' },
      { kind: 'text', key: 'replacement', label: 'Regex replacement' },
    ];
  },

  configSummary(config) {
    const columns = parseStringArray(config.columns);
    const method = parseMethod(config);
    if (columns.length === 0) return 'No columns';
    return `${method} · ${columns.join(', ')}`;
  },
};
