import type { NodeType } from '@/lib/types';

import { validateColumnsExist } from './column-utils';
import type { NodeDefinition, ValidateContext } from './types';

function parseColumnsToUpdate(config: Record<string, unknown>): 'all' | string[] {
  if (config.columnsToUpdate === 'all' || config.columnsToUpdate === undefined) return 'all';
  if (!Array.isArray(config.columnsToUpdate)) return [];
  return config.columnsToUpdate.filter(
    (item): item is string => typeof item === 'string' && item.length > 0,
  );
}

export const mergeUpdate: NodeDefinition = {
  type: 'merge.update' as NodeType,
  label: 'Merge / Update',
  category: 'transform',
  paletteGroup: 'combine',
  inputs: [
    { id: 'left', label: 'Left' },
    { id: 'right', label: 'Right' },
  ],
  outputs: 1,

  defaultConfig() {
    return {
      leftOn: '',
      rightOn: '',
      columnsToUpdate: 'all' as 'all' | string[],
    };
  },

  validate(config, inputSchemas, context?: ValidateContext) {
    const errors = [];
    const leftOn = typeof config.leftOn === 'string' ? config.leftOn.trim() : '';
    const rightOn = typeof config.rightOn === 'string' ? config.rightOn.trim() : '';
    const columnsToUpdate = parseColumnsToUpdate(config);
    const leftSchema = inputSchemas[0] ?? [];
    const rightSchema = inputSchemas[1] ?? [];

    if (context?.inputVarCount !== undefined && context.inputVarCount < 2) {
      errors.push({ field: 'inputs', message: 'Connect both inputs' });
    }

    if (!leftOn) {
      errors.push({ field: 'leftOn', message: 'Left key is required' });
    } else {
      errors.push(...validateColumnsExist([leftOn], leftSchema, 'leftOn'));
    }

    if (!rightOn) {
      errors.push({ field: 'rightOn', message: 'Right key is required' });
    } else {
      errors.push(...validateColumnsExist([rightOn], rightSchema, 'rightOn'));
    }

    if (columnsToUpdate !== 'all' && columnsToUpdate.length === 0) {
      errors.push({
        field: 'columnsToUpdate',
        message: 'Select columns to update or choose "all"',
      });
    } else if (columnsToUpdate !== 'all') {
      errors.push(...validateColumnsExist(columnsToUpdate, rightSchema, 'columnsToUpdate'));
    }

    return errors;
  },

  compile(config, inputVars, outputVar, _params?, _context?) {
    void _params;
    void _context;
    const left = inputVars[0];
    const right = inputVars[1];
    const leftOn = typeof config.leftOn === 'string' ? config.leftOn.trim() : '';
    const rightOn = typeof config.rightOn === 'string' ? config.rightOn.trim() : '';
    const columnsToUpdate = parseColumnsToUpdate(config);
    const tmpRight = `_${outputVar}_right`;
    const tmpLeft = `_${outputVar}_left`;
    const tmpCols = `_${outputVar}_cols`;

    const colsExpr =
      columnsToUpdate === 'all'
        ? `${tmpCols} = [c for c in ${right}.columns if c != ${JSON.stringify(rightOn)}]`
        : `${tmpCols} = ${JSON.stringify(columnsToUpdate)}`;

    return [
      `${outputVar} = ${left}.copy()`,
      `${tmpRight} = ${right}.set_index(${JSON.stringify(rightOn)})`,
      `${tmpLeft} = ${outputVar}.set_index(${JSON.stringify(leftOn)})`,
      `if ${tmpRight}.index.name != ${JSON.stringify(leftOn)}:`,
      `    ${tmpRight}.index.name = ${JSON.stringify(leftOn)}`,
      colsExpr,
      `${tmpLeft}.update(${tmpRight}[${tmpCols}])`,
      `${outputVar} = ${tmpLeft}.reset_index()`,
    ].join('\n');
  },

  inspectorSchema() {
    return [
      { kind: 'column', key: 'leftOn', label: 'Left key', schemaIndex: 0 },
      { kind: 'column', key: 'rightOn', label: 'Right key', schemaIndex: 1 },
      { kind: 'columns', key: 'columnsToUpdate', label: 'Columns to update', schemaIndex: 1 },
    ];
  },

  configSummary(config) {
    const leftOn = typeof config.leftOn === 'string' ? config.leftOn : '';
    const rightOn = typeof config.rightOn === 'string' ? config.rightOn : '';
    const columnsToUpdate = parseColumnsToUpdate(config);
    if (!leftOn && !rightOn) return 'No keys';
    const cols =
      columnsToUpdate === 'all'
        ? 'all'
        : columnsToUpdate.length > 0
          ? columnsToUpdate.join(', ')
          : '…';
    return `${leftOn} ← ${rightOn} (${cols})`;
  },
};
