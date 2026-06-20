import type { NodeType } from '@/lib/types';

import { validateColumnsExist } from './column-utils';
import type { NodeDefinition } from './types';

type DtCalcMode = 'add' | 'subtract' | 'diff' | 'age';
type DtUnit = 'days' | 'hours' | 'minutes' | 'seconds' | 'weeks' | 'months' | 'years';

const VALID_MODES = new Set<DtCalcMode>(['add', 'subtract', 'diff', 'age']);
const VALID_UNITS = new Set<DtUnit>(['days', 'hours', 'minutes', 'seconds', 'weeks', 'months', 'years']);

function parseMode(config: Record<string, unknown>): DtCalcMode {
  const mode = config.mode;
  if (typeof mode === 'string' && VALID_MODES.has(mode as DtCalcMode)) {
    return mode as DtCalcMode;
  }
  return 'add';
}

function parseUnit(config: Record<string, unknown>): DtUnit {
  const unit = config.unit;
  if (typeof unit === 'string' && VALID_UNITS.has(unit as DtUnit)) {
    return unit as DtUnit;
  }
  return 'days';
}

function parseAmount(config: Record<string, unknown>): number {
  return typeof config.amount === 'number' ? config.amount : 0;
}

function parseReference(config: Record<string, unknown>): 'now' | 'column' {
  return config.reference === 'column' ? 'column' : 'now';
}

function parseOutputColumn(config: Record<string, unknown>, column: string, mode: DtCalcMode): string {
  if (typeof config.outputColumn === 'string' && config.outputColumn.trim()) {
    return config.outputColumn.trim();
  }
  return `${column}_${mode}`;
}

function compileOffset(unit: DtUnit, amount: number): string {
  if (unit === 'months' || unit === 'years') {
    const key = unit === 'months' ? 'months' : 'years';
    return `pd.DateOffset(${key}=${amount})`;
  }
  return `pd.Timedelta(${JSON.stringify(`${amount} ${unit}`)})`;
}

export const dtCalc: NodeDefinition = {
  type: 'dt.calc' as NodeType,
  label: 'Date Operations',
  category: 'transform',
  paletteGroup: 'datetime',
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return {
      mode: 'add' as DtCalcMode,
      column: '',
      outputColumn: '',
      amount: 1,
      unit: 'days' as DtUnit,
      reference: 'now' as 'now' | 'column',
      referenceColumn: '',
    };
  },

  validate(config, inputSchemas) {
    const errors = [];
    const mode = parseMode(config);
    const column = typeof config.column === 'string' ? config.column.trim() : '';
    const reference = parseReference(config);
    const referenceColumn =
      typeof config.referenceColumn === 'string' ? config.referenceColumn.trim() : '';
    const upstream = inputSchemas[0] ?? [];

    if (!column) {
      errors.push({ field: 'column', message: 'Column is required' });
    } else {
      errors.push(...validateColumnsExist([column], upstream, 'column'));
    }

    if (mode === 'age' && reference === 'column') {
      if (!referenceColumn) {
        errors.push({ field: 'referenceColumn', message: 'Reference column is required' });
      } else {
        errors.push(...validateColumnsExist([referenceColumn], upstream, 'referenceColumn'));
      }
    }

    if ((mode === 'add' || mode === 'subtract') && column && typeof config.amount !== 'number') {
      errors.push({ field: 'amount', message: 'Amount must be a number' });
    }

    return errors;
  },

  compile(config, inputVars, outputVar, _params?, _context?) {
    void _params;
    void _context;
    const mode = parseMode(config);
    const column = typeof config.column === 'string' ? config.column.trim() : '';
    const outputColumn = parseOutputColumn(config, column, mode);
    const input = inputVars[0];
    const colExpr = `${input}[${JSON.stringify(column)}]`;

    if (mode === 'diff') {
      return `${outputVar} = ${input}.assign(**{${JSON.stringify(outputColumn)}: ${colExpr}.diff()})`;
    }

    if (mode === 'age') {
      const reference = parseReference(config);
      const referenceColumn =
        typeof config.referenceColumn === 'string' ? config.referenceColumn.trim() : '';
      const refExpr =
        reference === 'column'
          ? `${input}[${JSON.stringify(referenceColumn)}]`
          : 'pd.Timestamp.now()';
      return `${outputVar} = ${input}.assign(**{${JSON.stringify(outputColumn)}: ((${refExpr}) - ${colExpr}).dt.days / 365.25})`;
    }

    const amount = parseAmount(config);
    const unit = parseUnit(config);
    const offset = compileOffset(unit, amount);
    const op = mode === 'subtract' ? '-' : '+';
    return `${outputVar} = ${input}.assign(**{${JSON.stringify(outputColumn)}: ${colExpr} ${op} ${offset}})`;
  },

  inspectorSchema() {
    return [
      {
        kind: 'select',
        key: 'mode',
        label: 'Operation',
        options: ['add', 'subtract', 'diff', 'age'],
      },
      { kind: 'column', key: 'column', label: 'Date column' },
      { kind: 'text', key: 'outputColumn', label: 'Output column (optional)' },
      { kind: 'number', key: 'amount', label: 'Amount' },
      {
        kind: 'select',
        key: 'unit',
        label: 'Unit',
        options: ['days', 'hours', 'minutes', 'seconds', 'weeks', 'months', 'years'],
      },
      { kind: 'select', key: 'reference', label: 'Age reference', options: ['now', 'column'] },
      { kind: 'column', key: 'referenceColumn', label: 'Reference column' },
    ];
  },

  configSummary(config) {
    const mode = parseMode(config);
    const column = typeof config.column === 'string' ? config.column : '';
    if (!column) return 'No column';

    if (mode === 'diff') return `${column} diff`;
    if (mode === 'age') {
      const reference = parseReference(config);
      const ref =
        reference === 'column'
          ? typeof config.referenceColumn === 'string'
            ? config.referenceColumn
            : 'column'
          : 'now';
      return `age(${column}, ${ref})`;
    }

    const amount = parseAmount(config);
    const unit = parseUnit(config);
    return `${column} ${mode} ${amount} ${unit}`;
  },
};
