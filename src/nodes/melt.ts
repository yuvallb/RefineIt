import type { NodeType } from '@/lib/types';

import { parseStringArray, validateColumnsExist } from './column-utils';
import type { NodeDefinition } from './types';

function parseVarName(config: Record<string, unknown>): string {
  return typeof config.varName === 'string' && config.varName.trim()
    ? config.varName.trim()
    : 'variable';
}

function parseValueName(config: Record<string, unknown>): string {
  return typeof config.valueName === 'string' && config.valueName.trim()
    ? config.valueName.trim()
    : 'value';
}

export const melt: NodeDefinition = {
  type: 'melt' as NodeType,
  label: 'Melt',
  category: 'transform',
  paletteGroup: 'aggregate',
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return {
      idVars: [] as string[],
      valueVars: [] as string[],
      varName: 'variable',
      valueName: 'value',
    };
  },

  validate(config, inputSchemas) {
    const errors = [];
    const idVars = parseStringArray(config.idVars);
    const valueVars = parseStringArray(config.valueVars);
    const upstream = inputSchemas[0] ?? [];

    if (idVars.length === 0) {
      errors.push({ field: 'idVars', message: 'Select at least one id column' });
    }
    errors.push(...validateColumnsExist(idVars, upstream, 'idVars'));
    errors.push(...validateColumnsExist(valueVars, upstream, 'valueVars'));

    return errors;
  },

  compile(config, inputVars, outputVar, _params?, _context?) {
    void _params;
    void _context;
    const idVars = parseStringArray(config.idVars);
    const valueVars = parseStringArray(config.valueVars);
    const varName = parseVarName(config);
    const valueName = parseValueName(config);
    const input = inputVars[0];
    const idList = idVars.map((c) => JSON.stringify(c)).join(', ');

    const args = [`id_vars=[${idList}]`];
    if (valueVars.length > 0) {
      args.push(`value_vars=[${valueVars.map((c) => JSON.stringify(c)).join(', ')}]`);
    }
    args.push(`var_name=${JSON.stringify(varName)}`, `value_name=${JSON.stringify(valueName)}`);

    return `${outputVar} = ${input}.melt(${args.join(', ')})`;
  },

  inspectorSchema() {
    return [
      { kind: 'columns', key: 'idVars', label: 'Id columns' },
      { kind: 'columns', key: 'valueVars', label: 'Value columns (optional)' },
      { kind: 'text', key: 'varName', label: 'Variable name' },
      { kind: 'text', key: 'valueName', label: 'Value name' },
    ];
  },

  configSummary(config) {
    const idVars = parseStringArray(config.idVars);
    const valueVars = parseStringArray(config.valueVars);
    if (idVars.length === 0) return 'No id columns';
    const valueText = valueVars.length > 0 ? valueVars.join(', ') : 'remaining';
    return `ids: ${idVars.join(', ')} → ${valueText}`;
  },
};
