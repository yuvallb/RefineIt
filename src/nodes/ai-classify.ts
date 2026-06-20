import { parseStringArray, validateColumnsExist } from './column-utils';
import { nodeType, type PaletteNodeDefinition } from './node-type';

const AI_ENABLED = import.meta.env.VITE_ENABLE_AI_NODES === 'true';

function aiDisabledError() {
  return [{ message: 'AI nodes are disabled — enable VITE_ENABLE_AI_NODES to use this node' }];
}

function compileAiPlaceholder(input: string, outputVar: string): string {
  return `${outputVar} = ${input}.copy()  # AI execution on main thread; column injected at runtime`;
}

export const aiClassify: PaletteNodeDefinition = {
  type: nodeType('ai.classify'),
  label: 'AI Classify',
  category: 'transform',
  paletteGroup: 'ai',
  hiddenInPalette: !AI_ENABLED,
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return {
      column: '',
      labels: [] as string[],
      promptTemplate: '',
      maxRows: 100,
    };
  },

  validate(config, inputSchemas) {
    if (!AI_ENABLED) return aiDisabledError();

    const errors = [];
    const column = typeof config.column === 'string' ? config.column.trim() : '';
    const labels = parseStringArray(config.labels);
    const upstream = inputSchemas[0] ?? [];

    if (!column) {
      errors.push({ field: 'column', message: 'Select a text column to classify' });
    } else {
      errors.push(...validateColumnsExist([column], upstream, 'column'));
    }

    if (labels.length === 0) {
      errors.push({ field: 'labels', message: 'Provide at least one label' });
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
      { kind: 'column', key: 'column', label: 'Text column' },
      { kind: 'text', key: 'labels', label: 'Labels (comma-separated)' },
      { kind: 'text', key: 'promptTemplate', label: 'Prompt template (optional)' },
      { kind: 'number', key: 'maxRows', label: 'Max rows' },
    ];
  },

  configSummary(config) {
    const column = typeof config.column === 'string' ? config.column : '';
    const labels = parseStringArray(config.labels);
    if (!column) return 'No column';
    return labels.length > 0 ? `Classify ${column} → ${labels.join('/')}` : `Classify ${column}`;
  },
};
