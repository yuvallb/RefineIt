import { parseStringArray, validateColumnsExist } from './column-utils';
import { nodeType, type PaletteNodeDefinition } from './node-type';

const AI_ENABLED = import.meta.env.VITE_ENABLE_AI_NODES === 'true';

type AnonymizeMethod = 'mask' | 'hash' | 'llm_rewrite';

function aiDisabledError() {
  return [{ message: 'AI nodes are disabled — enable VITE_ENABLE_AI_NODES to use this node' }];
}

function compileAiPlaceholder(input: string, outputVar: string): string {
  return `${outputVar} = ${input}.copy()  # AI execution on main thread; column injected at runtime`;
}

function parseMethod(config: Record<string, unknown>): AnonymizeMethod {
  if (config.method === 'hash' || config.method === 'llm_rewrite') return config.method;
  return 'mask';
}

export const aiAnonymize: PaletteNodeDefinition = {
  type: nodeType('ai.anonymize'),
  label: 'AI Anonymize',
  category: 'transform',
  paletteGroup: 'ai',
  hiddenInPalette: !AI_ENABLED,
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return {
      columns: [] as string[],
      method: 'mask' as AnonymizeMethod,
      preserveFormat: false,
    };
  },

  validate(config, inputSchemas) {
    if (!AI_ENABLED) return aiDisabledError();

    const errors = [];
    const columns = parseStringArray(config.columns);
    const upstream = inputSchemas[0] ?? [];

    if (columns.length === 0) {
      errors.push({ field: 'columns', message: 'Select at least one column' });
    }

    errors.push(...validateColumnsExist(columns, upstream, 'columns'));
    return errors;
  },

  compile(config, inputVars, outputVar, _params?, _context?) {
    void _params;
    void _context;
    void config;
    return compileAiPlaceholder(inputVars[0], outputVar);
  },

  inspectorSchema() {
    return [
      { kind: 'columns', key: 'columns', label: 'Columns' },
      { kind: 'select', key: 'method', label: 'Method', options: ['mask', 'hash', 'llm_rewrite'] },
      { kind: 'select', key: 'preserveFormat', label: 'Preserve format', options: ['true', 'false'] },
    ];
  },

  configSummary(config) {
    const columns = parseStringArray(config.columns);
    const method = parseMethod(config);
    if (columns.length === 0) return 'No columns';
    return `${method} · ${columns.join(', ')}`;
  },
};
