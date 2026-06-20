import { PARQUET_ENABLED } from '@/lib/constants';
import type { NodeType } from '@/lib/types';

import { parseStringArray } from './column-utils';
import type { NodeDefinition } from './types';

type SourceParquetNode = NodeDefinition & {
  paletteGroup: 'io';
  paletteOrder: number;
  exportVarSlug: string;
};

function readParquetArgs(config: Record<string, unknown>, mode: 'execution' | 'export'): string {
  const columns = parseStringArray(config.columns);
  const parts: string[] = [];

  if (mode === 'export') {
    const filename = typeof config.filename === 'string' ? config.filename : 'data.parquet';
    parts.push(JSON.stringify(filename));
  }

  if (columns.length > 0) {
    const colList = columns.map((c) => JSON.stringify(c)).join(', ');
    parts.push(`columns=[${colList}]`);
  }

  return parts.join(', ');
}

export const sourceParquet = {
  type: 'source.parquet' as NodeType,
  label: 'Read Parquet',
  category: 'source',
  paletteGroup: 'io',
  paletteOrder: 3,
  exportVarSlug: 'parquet_data',
  hiddenInPalette: !PARQUET_ENABLED,
  inputs: [],
  outputs: 1,

  defaultConfig() {
    return {
      filename: '',
      columns: [] as string[],
    };
  },

  validate(config, _inputSchemas) {
    void _inputSchemas;

    if (!config.filename || typeof config.filename !== 'string') {
      return [{ field: 'filename', message: 'Import a Parquet file first' }];
    }
    return [];
  },

  compile(config, _inputVars, outputVar, _params, context) {
    void _params;
    const mode = context?.mode ?? 'execution';
    if (mode === 'export') {
      return `${outputVar} = pd.read_parquet(${readParquetArgs(config, 'export')})`;
    }
    const args = readParquetArgs(config, 'execution');
    if (args) {
      return `${outputVar} = pd.read_parquet('/tmp/${outputVar}.parquet', ${args})`;
    }
    return `${outputVar} = pd.read_parquet('/tmp/${outputVar}.parquet')`;
  },

  inspectorSchema() {
    return [
      { kind: 'text', key: 'filename', label: 'Filename' },
      { kind: 'columns', key: 'columns', label: 'Columns (optional)' },
    ];
  },

  configSummary(config) {
    const filename = typeof config.filename === 'string' ? config.filename : 'No file';
    const columns = parseStringArray(config.columns);
    if (!filename) return 'No file';
    if (columns.length === 0) return filename;
    return `${filename} (${columns.length} cols)`;
  },
} satisfies SourceParquetNode;
