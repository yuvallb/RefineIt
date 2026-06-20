import type { NodeType } from '@/lib/types';

import { replaceFilenameExtension } from './output-utils';
import type { NodeDefinition } from './types';

type OutputCsvNode = NodeDefinition & {
  paletteGroup: 'io';
  paletteOrder: number;
  exportVarSlug: string;
};

export const outputCsv = {
  type: 'output.csv' as NodeType,
  label: 'Write CSV',
  category: 'output',
  paletteGroup: 'io',
  paletteOrder: 4,
  exportVarSlug: 'csv_output',
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return { filename: 'pipeline_output.csv' };
  },

  validate(config, _inputSchemas) {
    void _inputSchemas;

    const filename = typeof config.filename === 'string' ? config.filename.trim() : '';
    if (!filename) {
      return [{ field: 'filename', message: 'Filename is required' }];
    }
    return [];
  },

  compile(config, inputVars, outputVar, _params, context) {
    void _params;
    const input = inputVars[0];
    const mode = context?.mode ?? 'execution';
    const rawFilename =
      typeof config.filename === 'string' ? config.filename : 'pipeline_output.csv';
    const filename = replaceFilenameExtension(rawFilename, 'csv');

    if (mode === 'execution') {
      return `${outputVar} = ${input}`;
    }

    return `${outputVar} = ${input}\n${outputVar}.to_csv(${JSON.stringify(filename)}, index=False)`;
  },

  inspectorSchema() {
    return [{ kind: 'text', key: 'filename', label: 'Filename' }];
  },

  configSummary(config) {
    const filename =
      typeof config.filename === 'string' ? config.filename : 'pipeline_output.csv';
    return `CSV → ${filename}`;
  },
} satisfies OutputCsvNode;
