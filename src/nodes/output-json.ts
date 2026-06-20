import type { NodeType } from '@/lib/types';

import { replaceFilenameExtension } from './output-utils';
import type { NodeDefinition } from './types';

type OutputJsonNode = NodeDefinition & {
  paletteGroup: 'io';
  paletteOrder: number;
  exportVarSlug: string;
};

function parseOrient(config: Record<string, unknown>): string {
  const orient = config.orient;
  if (orient === 'columns' || orient === 'index' || orient === 'values' || orient === 'table') {
    return orient;
  }
  return 'records';
}

export const outputJson = {
  type: 'output.json' as NodeType,
  label: 'Write JSON',
  category: 'output',
  paletteGroup: 'io',
  paletteOrder: 5,
  exportVarSlug: 'json_output',
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return {
      filename: 'pipeline_output.json',
      orient: 'records',
    };
  },

  validate(config, _inputSchemas) {
    void _inputSchemas;

    const errors = [];
    const filename = typeof config.filename === 'string' ? config.filename.trim() : '';
    if (!filename) {
      errors.push({ field: 'filename', message: 'Filename is required' });
    }
    const orient = config.orient;
    if (
      orient !== undefined &&
      orient !== 'records' &&
      orient !== 'columns' &&
      orient !== 'index' &&
      orient !== 'values' &&
      orient !== 'table'
    ) {
      errors.push({ field: 'orient', message: 'Invalid JSON orientation' });
    }
    return errors;
  },

  compile(config, inputVars, outputVar, _params, context) {
    void _params;
    const input = inputVars[0];
    const mode = context?.mode ?? 'execution';
    const rawFilename =
      typeof config.filename === 'string' ? config.filename : 'pipeline_output.json';
    const filename = replaceFilenameExtension(rawFilename, 'json');
    const orient = parseOrient(config);

    if (mode === 'execution') {
      return `${outputVar} = ${input}`;
    }

    return `${outputVar} = ${input}\n${outputVar}.to_json(${JSON.stringify(filename)}, orient=${JSON.stringify(orient)}, indent=2)`;
  },

  inspectorSchema() {
    return [
      { kind: 'text', key: 'filename', label: 'Filename' },
      {
        kind: 'select',
        key: 'orient',
        label: 'Orientation',
        options: ['records', 'columns', 'index', 'values', 'table'],
      },
    ];
  },

  configSummary(config) {
    const filename =
      typeof config.filename === 'string' ? config.filename : 'pipeline_output.json';
    const orient = parseOrient(config);
    return `JSON (${orient}) → ${filename}`;
  },
} satisfies OutputJsonNode;
