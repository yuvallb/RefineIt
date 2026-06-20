import { validateColumnsExist } from './column-utils';
import { nodeType, type PaletteNodeDefinition } from './node-type';

const AI_ENABLED = import.meta.env.VITE_ENABLE_AI_NODES === 'true';

type SummarizeScope = 'column' | 'dataset';
type SummarizeOutput = 'dataframe' | 'panel';

function aiDisabledError() {
  return [{ message: 'AI nodes are disabled — enable VITE_ENABLE_AI_NODES to use this node' }];
}

function compileAiPlaceholder(input: string, outputVar: string): string {
  return `${outputVar} = ${input}.copy()  # AI execution on main thread; column injected at runtime`;
}

function parseScope(config: Record<string, unknown>): SummarizeScope {
  return config.scope === 'column' ? 'column' : 'dataset';
}

function parseOutput(config: Record<string, unknown>): SummarizeOutput {
  return config.output === 'panel' ? 'panel' : 'dataframe';
}

export const aiSummarize: PaletteNodeDefinition = {
  type: nodeType('ai.summarize'),
  label: 'AI Summarize',
  category: 'transform',
  paletteGroup: 'ai',
  hiddenInPalette: !AI_ENABLED,
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return {
      scope: 'dataset' as SummarizeScope,
      column: '',
      maxTokens: 512,
      output: 'dataframe' as SummarizeOutput,
    };
  },

  validate(config, inputSchemas) {
    if (!AI_ENABLED) return aiDisabledError();

    const errors = [];
    const scope = parseScope(config);
    const column = typeof config.column === 'string' ? config.column.trim() : '';
    const upstream = inputSchemas[0] ?? [];

    if (scope === 'column') {
      if (!column) {
        errors.push({ field: 'column', message: 'Select a column for column scope' });
      } else {
        errors.push(...validateColumnsExist([column], upstream, 'column'));
      }
    }

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
      { kind: 'select', key: 'scope', label: 'Scope', options: ['column', 'dataset'] },
      { kind: 'column', key: 'column', label: 'Column (column scope)' },
      { kind: 'number', key: 'maxTokens', label: 'Max tokens' },
      { kind: 'select', key: 'output', label: 'Output', options: ['dataframe', 'panel'] },
    ];
  },

  configSummary(config) {
    const scope = parseScope(config);
    const column = typeof config.column === 'string' ? config.column : '';
    const output = parseOutput(config);
    if (scope === 'column' && column) return `Summarize ${column} → ${output}`;
    return `Summarize dataset → ${output}`;
  },
};
