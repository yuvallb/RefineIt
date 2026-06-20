import { CUSTOM_PYTHON_ENABLED } from '@/lib/constants';
import { nodeType, type PaletteNodeDefinition } from './node-type';

const BLOCKED_PATTERNS = [
  /\bimport\b/i,
  /\bfrom\s+\w+\s+import\b/i,
  /\bexec\b/i,
  /\beval\s*\(/i,
  /\bopen\s*\(/i,
  /\b__\w+__\b/,
  /\bgetattr\b/i,
  /\bsetattr\b/i,
  /\bglobals\b/i,
  /\blocals\b/i,
  /\bos\./i,
  /\bsys\./i,
  /\bsubprocess\b/i,
  /\bcompile\s*\(/i,
];

export function isCustomPythonSafe(code: string): boolean {
  return !BLOCKED_PATTERNS.some((pattern) => pattern.test(code));
}

export const customPython: PaletteNodeDefinition = {
  type: nodeType('custom.python'),
  label: 'Custom Python',
  category: 'transform',
  paletteGroup: 'python',
  hiddenInPalette: !CUSTOM_PYTHON_ENABLED,
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return { code: '' };
  },

  validate(config, _inputSchemas) {
    void _inputSchemas;

    const errors = [];
    if (!CUSTOM_PYTHON_ENABLED) {
      errors.push({
        message: 'Custom Python nodes are disabled — set VITE_ENABLE_CUSTOM_PYTHON=true',
      });
      return errors;
    }

    const code = typeof config.code === 'string' ? config.code.trim() : '';

    if (!code) {
      errors.push({ field: 'code', message: 'Python code is required' });
      return errors;
    }

    if (!isCustomPythonSafe(code)) {
      errors.push({
        field: 'code',
        message: 'Code contains disallowed patterns (import, exec, open, dunder access)',
      });
    }

    return errors;
  },

  compile(config, inputVars, outputVar, _params?, _context?) {
    void _params;
    void _context;
    const code = typeof config.code === 'string' ? config.code.trim() : '';
    const input = inputVars[0];

    return [
      `# Custom Python — assign result to out`,
      `out = ${input}.copy()`,
      code,
      `${outputVar} = out`,
    ].join('\n');
  },

  inspectorSchema() {
    return [{ kind: 'expression', key: 'code', label: 'Python code' }];
  },

  configSummary(config) {
    const code = typeof config.code === 'string' ? config.code.trim() : '';
    if (!code) return 'No code';
    const firstLine = code.split('\n')[0] ?? '';
    return firstLine.length > 40 ? `${firstLine.slice(0, 37)}…` : firstLine;
  },
};
