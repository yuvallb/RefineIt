import { parseStringArray, validateColumnsExist } from './column-utils';
import { nodeType, type PaletteNodeDefinition } from './node-type';

type DuplicateKeep = 'first' | 'last' | false;
type DuplicateOutput = 'duplicates_only' | 'flag_column';

function parseKeep(config: Record<string, unknown>): DuplicateKeep {
  if (config.keep === 'last') return 'last';
  if (config.keep === false || config.keep === 'none') return false;
  return 'first';
}

function parseOutput(config: Record<string, unknown>): DuplicateOutput {
  return config.output === 'duplicates_only' ? 'duplicates_only' : 'flag_column';
}

function keepLiteral(keep: DuplicateKeep): string {
  if (keep === false) return 'False';
  return JSON.stringify(keep);
}

export const findDuplicates: PaletteNodeDefinition = {
  type: nodeType('find.duplicates'),
  label: 'Find Duplicates',
  category: 'transform',
  paletteGroup: 'quality',
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return {
      subset: [] as string[],
      keep: 'first' as DuplicateKeep,
      output: 'flag_column' as DuplicateOutput,
    };
  },

  validate(config, inputSchemas) {
    const subset = parseStringArray(config.subset);
    const upstream = inputSchemas[0] ?? [];
    return validateColumnsExist(subset, upstream, 'subset');
  },

  compile(config, inputVars, outputVar, _params?, _context?) {
    void _params;
    void _context;
    const subset = parseStringArray(config.subset);
    const input = inputVars[0];
    const keep = parseKeep(config);
    const output = parseOutput(config);
    const keepArg = keepLiteral(keep);
    const subsetArg =
      subset.length > 0 ? `subset=[${subset.map((c) => JSON.stringify(c)).join(', ')}]` : '';

    if (output === 'duplicates_only') {
      const args = [subsetArg, `keep=${keepArg}`].filter(Boolean).join(', ');
      return `${outputVar} = ${input}[${input}.duplicated(${args})].copy()`;
    }

    const args = [subsetArg, `keep=${keepArg}`].filter(Boolean).join(', ');
    return [
      `${outputVar} = ${input}.copy()`,
      `${outputVar}['_duplicate'] = ${input}.duplicated(${args})`,
    ].join('\n');
  },

  inspectorSchema() {
    return [
      { kind: 'columns', key: 'subset', label: 'Subset columns (optional)' },
      { kind: 'select', key: 'keep', label: 'Keep', options: ['first', 'last', 'none'] },
      {
        kind: 'select',
        key: 'output',
        label: 'Output',
        options: ['flag_column', 'duplicates_only'],
      },
    ];
  },

  configSummary(config) {
    const subset = parseStringArray(config.subset);
    const output = parseOutput(config);
    const keep = parseKeep(config);
    const cols = subset.length > 0 ? subset.join(', ') : 'all columns';
    return `${output === 'flag_column' ? 'Flag' : 'Extract'} duplicates in ${cols} (keep=${String(keep)})`;
  },
};
