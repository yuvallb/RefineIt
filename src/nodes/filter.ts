import { extractBracketColumns, isExpressionSafe, normalizeExpression } from './expression';
import type { NodeDefinition } from './types';

export { isExpressionSafe } from './expression';

export const filter: NodeDefinition = {
  type: 'filter',
  label: 'Filter',
  category: 'transform',
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return { expression: '' };
  },

  validate(config, inputSchemas) {
    const errors = [];
    const expression = typeof config.expression === 'string' ? config.expression.trim() : '';

    if (!expression) {
      errors.push({ field: 'expression', message: 'Filter expression is required' });
      return errors;
    }

    if (!isExpressionSafe(expression)) {
      errors.push({ field: 'expression', message: 'Expression contains disallowed patterns' });
    }

    const upstream = inputSchemas[0] ?? [];
    if (upstream.length > 0) {
      const colNames = new Set(upstream.map((c) => c.name));
      for (const col of extractBracketColumns(expression)) {
        if (!colNames.has(col)) {
          errors.push({ field: 'expression', message: `Column "${col}" not found upstream` });
        }
      }
    }

    return errors;
  },

  compile(config, inputVars, outputVar, _params) {
    void _params;
    const raw = typeof config.expression === 'string' ? config.expression.trim() : '';
    const input = inputVars[0];
    const normalized = normalizeExpression(raw, input);

    return `${outputVar} = ${input}[${input}.eval(${JSON.stringify(normalized)})]`;
  },

  inspectorSchema() {
    return [{ kind: 'expression', key: 'expression', label: 'Filter expression' }];
  },

  configSummary(config) {
    const expression = typeof config.expression === 'string' ? config.expression : '';
    if (!expression) return 'No expression';
    return expression.length > 40 ? `${expression.slice(0, 37)}…` : expression;
  },
};
