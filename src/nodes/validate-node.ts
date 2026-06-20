import { validateColumnsExist } from './column-utils';
import { nodeType, type PaletteNodeDefinition } from './node-type';

type ValidateCheck = 'email' | 'range' | 'dtype' | 'not_null' | 'regex' | 'unique';
type ValidateMode = 'flag' | 'filter' | 'fail';

interface ValidationRule {
  column: string;
  check: ValidateCheck;
  args?: Record<string, unknown>;
}

const CHECKS: ValidateCheck[] = ['email', 'range', 'dtype', 'not_null', 'regex', 'unique'];
const MODES: ValidateMode[] = ['flag', 'filter', 'fail'];

function parseRules(config: Record<string, unknown>): ValidationRule[] {
  if (!Array.isArray(config.rules)) return [];
  return config.rules.filter(
    (item): item is ValidationRule =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as ValidationRule).column === 'string' &&
      typeof (item as ValidationRule).check === 'string',
  );
}

function parseMode(config: Record<string, unknown>): ValidateMode {
  return MODES.includes(config.mode as ValidateMode) ? (config.mode as ValidateMode) : 'flag';
}

function parseNumericBound(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

function compileRuleMask(input: string, rule: ValidationRule): string {
  const col = JSON.stringify(rule.column);
  switch (rule.check) {
    case 'email':
      return `${input}[${col}].astype(str).str.match(r'^[\\w.+-]+@[\\w.-]+\\.[a-zA-Z]{2,}$', na=False)`;
    case 'not_null':
      return `${input}[${col}].notna()`;
    case 'range': {
      const min = parseNumericBound(rule.args?.min) ?? 0;
      const max = parseNumericBound(rule.args?.max) ?? 0;
      return `(${input}[${col}] >= ${min}) & (${input}[${col}] <= ${max})`;
    }
    case 'dtype': {
      const dtype = typeof rule.args?.dtype === 'string' ? rule.args.dtype : 'numeric';
      if (dtype === 'numeric') {
        return `(~pd.to_numeric(${input}[${col}], errors='coerce').isna()) | ${input}[${col}].isna()`;
      }
      if (dtype === 'string') {
        return `${input}[${col}].map(lambda v: v is None or isinstance(v, str))`;
      }
      if (dtype === 'bool') {
        return `${input}[${col}].map(lambda v: v is None or isinstance(v, bool))`;
      }
      return `${input}[${col}].notna()`;
    }
    case 'regex': {
      const pattern =
        typeof rule.args?.pattern === 'string' ? rule.args.pattern : '.*';
      return `${input}[${col}].astype(str).str.match(${JSON.stringify(pattern)}, na=False)`;
    }
    case 'unique':
      return `~${input}.duplicated(subset=[${col}], keep=False) | ${input}[${col}].isna()`;
    default:
      return `pd.Series(True, index=${input}.index)`;
  }
}

export const validateNode: PaletteNodeDefinition = {
  type: nodeType('validate'),
  label: 'Validate',
  category: 'transform',
  paletteGroup: 'quality',
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return {
      rules: [] as ValidationRule[],
      mode: 'flag' as ValidateMode,
    };
  },

  validate(config, inputSchemas) {
    const errors = [];
    const rules = parseRules(config);
    const upstream = inputSchemas[0] ?? [];

    if (rules.length === 0) {
      errors.push({ field: 'rules', message: 'Add at least one validation rule' });
    }

    for (const rule of rules) {
      if (!rule.column.trim()) {
        errors.push({ field: 'rules', message: 'Rule column is required' });
      } else if (!CHECKS.includes(rule.check)) {
        errors.push({ field: 'rules', message: `Unknown check "${rule.check}"` });
      } else if (rule.check === 'regex') {
        const pattern = rule.args?.pattern;
        if (typeof pattern !== 'string' || !pattern.trim()) {
          errors.push({ field: 'rules', message: 'Regex check requires a pattern' });
        }
      } else if (rule.check === 'range') {
        const min = parseNumericBound(rule.args?.min);
        const max = parseNumericBound(rule.args?.max);
        if (min === null || max === null) {
          errors.push({ field: 'rules', message: 'Range check requires numeric min and max' });
        } else if (min > max) {
          errors.push({ field: 'rules', message: 'Range min must be less than or equal to max' });
        }
      }
    }

    const columns = rules.map((r) => r.column).filter(Boolean);
    errors.push(...validateColumnsExist(columns, upstream, 'rules'));
    return errors;
  },

  compile(config, inputVars, outputVar, _params?, _context?) {
    void _params;
    void _context;
    const rules = parseRules(config);
    const input = inputVars[0];
    const mode = parseMode(config);

    const maskParts = rules.map((rule) => compileRuleMask(input, rule));
    const maskExpr =
      maskParts.length === 0
        ? `pd.Series(True, index=${input}.index)`
        : maskParts.length === 1
          ? maskParts[0]
          : `(${maskParts.join(') & (')})`;

    if (mode === 'filter') {
      return `${outputVar} = ${input}[${maskExpr}].copy()`;
    }

    const lines = [
      `${outputVar} = ${input}.copy()`,
      `_valid_mask = ${maskExpr}`,
    ];

    if (mode === 'flag') {
      lines.push(`${outputVar}['_valid'] = _valid_mask`);
    } else {
      lines.push(
        '_invalid_count = int((~_valid_mask).sum())',
        'if _invalid_count > 0:',
        "    raise ValueError(f'Validation failed: {_invalid_count} invalid row(s)')",
      );
    }

    return lines.join('\n');
  },

  inspectorSchema() {
    return [
      { kind: 'select', key: 'mode', label: 'Mode', options: ['flag', 'filter', 'fail'] },
    ];
  },

  configSummary(config) {
    const rules = parseRules(config);
    const mode = parseMode(config);
    if (rules.length === 0) return 'No rules';
    return `${rules.length} rule(s) · ${mode}`;
  },
};
