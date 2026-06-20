import type { NodeDefinition } from './types';

function readJsonArgs(config: Record<string, unknown>, mode: 'execution' | 'export'): string {
  const orient = typeof config.orient === 'string' ? config.orient : 'records';

  if (mode === 'export') {
    const filename = typeof config.filename === 'string' ? config.filename : 'data.json';
    return `${JSON.stringify(filename)}, orient=${JSON.stringify(orient)}`;
  }

  return `orient=${JSON.stringify(orient)}`;
}

export const sourceJson: NodeDefinition = {
  type: 'source.json',
  label: 'JSON Source',
  category: 'source',
  paletteGroup: 'io',
  paletteOrder: 1,
  exportVarSlug: 'json_data',
  inputs: [],
  outputs: 1,

  defaultConfig() {
    return {
      filename: '',
      orient: 'records',
    };
  },

  validate(config, _inputSchemas) {
    void _inputSchemas;

    if (!config.filename || typeof config.filename !== 'string') {
      return [{ field: 'filename', message: 'Import a JSON file first' }];
    }
    return [];
  },

  compile(config, _inputVars, outputVar, _params, context) {
    const mode = context?.mode ?? 'execution';
    if (mode === 'export') {
      return `${outputVar} = pd.read_json(${readJsonArgs(config, 'export')})`;
    }
    return `${outputVar} = pd.read_json('/tmp/${outputVar}.json', ${readJsonArgs(config, 'execution')})`;
  },

  inspectorSchema() {
    return [
      { kind: 'text', key: 'filename', label: 'Filename' },
      {
        kind: 'select',
        key: 'orient',
        label: 'Orientation',
        options: ['records', 'columns', 'index', 'values'],
      },
    ];
  },

  configSummary(config) {
    const filename = typeof config.filename === 'string' ? config.filename : 'No file';
    return filename || 'No file';
  },
};
