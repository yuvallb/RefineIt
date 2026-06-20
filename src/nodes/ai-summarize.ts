import { validateColumnsExist } from './column-utils';
import { llmMethodError } from './ai-utils';
import { nodeType, type PaletteNodeDefinition } from './node-type';

type SummarizeMethod = 'stats' | 'llm';
type SummarizeScope = 'column' | 'dataset';
type SummarizeOutput = 'dataframe' | 'panel';

function parseMethod(config: Record<string, unknown>): SummarizeMethod {
  return config.method === 'llm' ? 'llm' : 'stats';
}

function parseScope(config: Record<string, unknown>): SummarizeScope {
  return config.scope === 'column' ? 'column' : 'dataset';
}

function parseOutput(config: Record<string, unknown>): SummarizeOutput {
  return config.output === 'panel' ? 'panel' : 'dataframe';
}

export const aiSummarize: PaletteNodeDefinition = {
  type: nodeType('ai.summarize'),
  label: 'Summarize',
  category: 'transform',
  paletteGroup: 'ai',
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return {
      method: 'stats' as SummarizeMethod,
      scope: 'dataset' as SummarizeScope,
      column: '',
      output: 'panel' as SummarizeOutput,
      topK: 10,
    };
  },

  validate(config, inputSchemas) {
    const method = parseMethod(config);
    if (method === 'llm') {
      return llmMethodError();
    }

    const errors = [];
    const scope = parseScope(config);
    const column = typeof config.column === 'string' ? config.column.trim() : '';
    const upstream = inputSchemas[0] ?? [];

    if (scope === 'column') {
      if (!column) {
        errors.push({ field: 'column', message: 'Select a column for column scope' });
      } else {
        errors.push(...validateColumnsExist([column], upstream, 'column'));
      }
    }

    const topK = config.topK;
    if (topK !== undefined && (typeof topK !== 'number' || topK < 1 || topK > 100)) {
      errors.push({ field: 'topK', message: 'Top K must be between 1 and 100' });
    }

    return errors;
  },

  compile(config, inputVars, outputVar, _params?, _context?) {
    void _params;
    void _context;
    const method = parseMethod(config);
    const scope = parseScope(config);
    const output = parseOutput(config);
    const column = typeof config.column === 'string' ? config.column.trim() : '';
    const topK = typeof config.topK === 'number' ? config.topK : 10;
    const input = inputVars[0];
    const nodeId = outputVar.replace(/^node_/, '');

    if (method !== 'stats') {
      return `${outputVar} = ${input}.copy()  # LLM summarize not implemented`;
    }

    const summaryExpr =
      scope === 'column' && column
        ? `build_column_text_summary(${input}, ${JSON.stringify(column)}, top_k=${topK})`
        : `build_dataset_stats_summary(${input}, top_k=${topK})`;

    if (output === 'panel') {
      return [
        `${outputVar} = ${input}.copy()`,
        `store_node_summary(${JSON.stringify(nodeId)}, ${summaryExpr})`,
      ].join('\n');
    }

    return `${outputVar} = pd.DataFrame({'summary': [${summaryExpr}]})`;
  },

  inspectorSchema() {
    return [
      { kind: 'select', key: 'method', label: 'Method', options: ['stats', 'llm'] },
      { kind: 'select', key: 'scope', label: 'Scope', options: ['column', 'dataset'] },
      { kind: 'column', key: 'column', label: 'Column (column scope)' },
      { kind: 'select', key: 'output', label: 'Output', options: ['panel', 'dataframe'] },
      { kind: 'number', key: 'topK', label: 'Top terms / values (K)' },
    ];
  },

  configSummary(config) {
    const method = parseMethod(config);
    const scope = parseScope(config);
    const column = typeof config.column === 'string' ? config.column : '';
    const output = parseOutput(config);
    if (method === 'llm') return 'LLM (not implemented)';
    if (scope === 'column' && column) return `stats · ${column} → ${output}`;
    return `stats · dataset → ${output}`;
  },
};
