import { PARQUET_ENABLED } from '@/lib/constants';
import type { NodeType } from '@/lib/types';

import type { NodeDefinition } from './types';

type OutputParquetNode = NodeDefinition & {
  paletteGroup: 'io';
  paletteOrder: number;
  exportVarSlug: string;
};

function parseFilename(config: Record<string, unknown>): string {
  const raw = typeof config.filename === 'string' ? config.filename.trim() : '';
  if (!raw) return 'pipeline_output.parquet';
  const lastDot = raw.lastIndexOf('.');
  if (lastDot <= 0) return `${raw}.parquet`;
  return `${raw.slice(0, lastDot)}.parquet`;
}

export const outputParquet = {
  type: 'output.parquet' as NodeType,
  label: 'Write Parquet',
  category: 'output',
  paletteGroup: 'io',
  paletteOrder: 6,
  exportVarSlug: 'parquet_output',
  hiddenInPalette: !PARQUET_ENABLED,
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return { filename: 'pipeline_output.parquet' };
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
    const filename = parseFilename(config);

    if (mode === 'execution') {
      return `${outputVar} = ${input}`;
    }

    return [
      '# Parquet export transfers full file bytes to the browser — avoid outputs >50 MB',
      `${outputVar} = ${input}`,
      `${outputVar}.to_parquet(${JSON.stringify(filename)}, index=False)`,
    ].join('\n');
  },

  inspectorSchema() {
    return [{ kind: 'text', key: 'filename', label: 'Filename' }];
  },

  configSummary(config) {
    const filename = parseFilename(config);
    return `Parquet → ${filename}`;
  },
} satisfies OutputParquetNode;
